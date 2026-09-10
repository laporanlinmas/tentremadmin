import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db, requestForToken, onForegroundMessage, playNotificationSound, playAduanSound, processedNotificationIds } from '../lib/fcm';
import { useApp, useAuth } from '../App';
import { AduanBannerData } from '../components/AduanAlertBanner';

export interface NotificationContextType {
  unreadAduanCount: number;
  permissionStatus: NotificationPermission | 'unsupported';
  isFcmReady: boolean;
  requestPermission: () => Promise<boolean>;
  markAllAduanAsRead: () => void;
  // Banner aduan
  aduanBanner: AduanBannerData | null;
  closeAduanBanner: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const READ_ADUAN_STORAGE_KEY  = 'tentrem_read_aduan_ids';

const getStoredIds = (key: string): Set<string> => {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return new Set(parsed);
    }
  } catch (e) {
    console.warn('[Notifications] Error parsing stored IDs:', e);
  }
  return new Set();
};

const saveStoredIds = (key: string, ids: Set<string>) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(Array.from(ids).slice(-500)));
  } catch (e) {
    console.warn('[Notifications] Error saving stored IDs:', e);
  }
};

function showNativeNotification(
  title: string,
  body: string,
  tag: string,
  url: string,
  requireInteraction: boolean,
  onClick?: () => void
) {
  if (typeof window === 'undefined') return;
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  try {
    const notif = new Notification(title, {
      body,
      icon: '/assets/icon-192.png',
      badge: '/assets/icon-192.png',
      tag,
      requireInteraction,
      silent: false,
      data: { url },
    } as any);
    notif.onclick = () => {
      window.focus();
      if (onClick) onClick();
      notif.close();
    };
  } catch (err) {
    console.warn('[Notifications] Gagal memicu native notification:', err);
  }
}

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session } = useAuth();
  const { activeTab, setActiveTab, triggerToast } = useApp();

  const [unreadAduanCount, setUnreadAduanCount] = useState<number>(0);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission | 'unsupported'>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) return Notification.permission;
    return 'unsupported';
  });
  const [isFcmReady, setIsFcmReady] = useState<boolean>(false);

  // ── Aduan banner state ────────────────────────────────────────────────────
  const [aduanBanner, setAduanBanner] = useState<AduanBannerData | null>(null);
  const closeAduanBanner = useCallback(() => setAduanBanner(null), []);

  const isInitialAduan  = useRef(true);
  const knownAduanIds   = useRef<Set<string>>(new Set());
  const readAduanIds    = useRef<Set<string>>(getStoredIds(READ_ADUAN_STORAGE_KEY));
  const currentBaruIds  = useRef<Set<string>>(new Set());


  const isInitialSurvey = useRef(true);
  const knownSurveyIds  = useRef<Set<string>>(new Set());

  const markAllAduanAsRead = useCallback(() => {
    let changed = false;
    currentBaruIds.current.forEach((id) => {
      if (!readAduanIds.current.has(id)) {
        readAduanIds.current.add(id);
        changed = true;
      }
    });
    if (changed) saveStoredIds(READ_ADUAN_STORAGE_KEY, readAduanIds.current);
    setUnreadAduanCount(0);
  }, []);

  useEffect(() => {
    if (activeTab === 'ad') markAllAduanAsRead();
  }, [activeTab, markAllAduanAsRead]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      triggerToast('Peramban tidak mendukung notifikasi desktop.', 'inf');
      return false;
    }
    try {
      const perm = await Notification.requestPermission();
      setPermissionStatus(perm);
      if (perm === 'granted') {
        triggerToast('Notifikasi real-time diaktifkan 🔔', 'ok');
        const token = await requestForToken('admin', session?.namaLengkap || session?.username || 'Admin Linmas');
        if (token) setIsFcmReady(true);
        return true;
      } else if (perm === 'denied') {
        triggerToast('Izin notifikasi ditolak di peramban.', 'er');
        return false;
      }
      return false;
    } catch (err) {
      console.error('[Notifications] Error requesting permission:', err);
      return false;
    }
  }, [session, triggerToast]);

  // ── EFFECT 1: Auto-register FCM + foreground push handler ────────────────
  useEffect(() => {
    if (!session) return;
    let isCancelled = false;

    const setupFcm = async () => {
      if (typeof window === 'undefined' || !('Notification' in window)) return;
      setPermissionStatus(Notification.permission);
      if (Notification.permission === 'granted') {
        try {
          const token = await requestForToken('admin', session.namaLengkap || session.username || 'Admin Linmas');
          if (!isCancelled && token) setIsFcmReady(true);
        } catch (e) {
          console.warn('[FCM] Auto registration warning:', e);
        }
      }
    };

    setupFcm();

    let unsubForeground: (() => void) | null = null;
    onForegroundMessage((payload) => {
      const title  = payload.notification?.title || payload.data?.title || 'Notifikasi Baru 🔔';
      const body   = payload.notification?.body  || payload.data?.body  || '';
      const ticket = payload.data?.ticket || '';
      const url    = payload.data?.url    || '/';

      triggerToast(`🔔 ${title}${ticket ? ` #${ticket}` : ''}${body ? `: ${body}` : ''}`, 'ok');

      if (typeof document !== 'undefined' && document.hidden) {
        showNativeNotification(title, body, `fcm-${ticket || Date.now()}`, url, true, () => {
          if (url.includes('ronda'))        setActiveTab('rd');
          else if (url.includes('survei'))  setActiveTab('sv');
          else { markAllAduanAsRead(); setActiveTab('ad'); }
        });
      }
    }).then((unsub) => { unsubForeground = unsub; });

    return () => {
      isCancelled = true;
      if (unsubForeground) unsubForeground();
    };
  }, [session, setActiveTab, triggerToast, markAllAduanAsRead]);

  // ── EFFECT 2: Realtime 'aduan' ────────────────────────────────────────────
  useEffect(() => {
    if (!session || !db) return;
    let mounted = true;
    let unsubscribe = () => {};

    isInitialAduan.current = true;
    knownAduanIds.current  = new Set();

    const setup = () => {
      try {
        unsubscribe = onSnapshot(
          collection(db, 'aduan'),
          (snapshot) => {
            if (!mounted) return;

            const baruIds = new Set<string>();
            snapshot.forEach((d) => {
              const data = d.data();
              if (data.status === 'Baru' || !data.status) baruIds.add(d.id);
            });
            currentBaruIds.current = baruIds;

            if (activeTab === 'ad') {
              baruIds.forEach((id) => readAduanIds.current.add(id));
              saveStoredIds(READ_ADUAN_STORAGE_KEY, readAduanIds.current);
              setUnreadAduanCount(0);
            } else {
              let unread = 0;
              baruIds.forEach((id) => { if (!readAduanIds.current.has(id)) unread++; });
              setUnreadAduanCount(unread);
            }

            const newDocs: any[] = [];
            snapshot.docChanges().forEach((change) => {
              if (change.type === 'added') {
                const id = change.doc.id;
                if (!knownAduanIds.current.has(id)) {
                  knownAduanIds.current.add(id);
                  if (!isInitialAduan.current) {
                    const data = change.doc.data();
                    if (data.status === 'Baru' || !data.status) newDocs.push({ id, ...data });
                  }
                }
              }
            });

            if (isInitialAduan.current) { isInitialAduan.current = false; return; }

            for (const item of newDocs) {
              const ticket = item.ticket || item.id;
              if (processedNotificationIds.has(String(ticket))) continue;
              processedNotificationIds.add(String(ticket));

              // Suara berbeda per tingkat keparahan
              const kep = (item.tingkatKeparahan || 'ringan') as 'ringan' | 'sedang' | 'tinggi' | 'kritis';
              playAduanSound(kep);

              const namaStr     = item.nama     ? `dari ${item.nama}`   : 'dari warga';
              const kategoriStr = item.kategori ? `[${item.kategori}] ` : '';
              triggerToast(`🚨 Aduan Baru #${ticket} ${kategoriStr}${namaStr}`, 'ok');

              // ── Banner aduan khusus dari atas ─────────────────────────────
              setAduanBanner({
                id: String(ticket) + '-' + Date.now(),
                ticket: String(ticket),
                nama: item.nama || '',
                kategori: item.kategori || '',
                lokasi: item.lokasi || '',
                deskripsi: item.deskripsi ? String(item.deskripsi).slice(0, 120) : '',
                tingkatKeparahan: item.tingkatKeparahan || 'ringan',
                timestamp: Date.now(),
              });

              showNativeNotification(
                '🚨 Aduan Warga Baru Masuk!',
                `#${ticket}${item.nama ? ` · ${item.nama}` : ''}${item.kategori ? ` · ${item.kategori}` : ''}\n${(item.deskripsi || 'Laporan baru diterima, segera tindaklanjuti.').slice(0, 100)}`,
                `aduan-live-${ticket}`,
                '/aduan',
                true,
                () => { markAllAduanAsRead(); setActiveTab('ad'); }
              );
            }
          },
          (error) => {
            console.warn('[Realtime Aduan] error:', error);
            unsubscribe();
            setTimeout(() => { if (mounted) setup(); }, 5000);
          }
        );
      } catch (err) {
        console.error('[Realtime Aduan] Setup error:', err);
      }
    };

    setup();
    return () => { mounted = false; unsubscribe(); };
  }, [session, activeTab, setActiveTab, triggerToast, markAllAduanAsRead]);

  // ── EFFECT 4: Realtime 'survey_kepuasan' ─────────────────────────────────
  useEffect(() => {
    if (!session || !db) return;
    let mounted = true;
    let unsubscribe = () => {};

    isInitialSurvey.current = true;
    knownSurveyIds.current  = new Set();

    const setup = () => {
      try {
        unsubscribe = onSnapshot(
          collection(db, 'survey_kepuasan'),
          (snapshot) => {
            if (!mounted) return;

            const newDocs: any[] = [];
            snapshot.docChanges().forEach((change) => {
              if (change.type === 'added') {
                const id = change.doc.id;
                if (!knownSurveyIds.current.has(id)) {
                  knownSurveyIds.current.add(id);
                  if (!isInitialSurvey.current) newDocs.push({ id, ...change.doc.data() });
                }
              }
            });

            if (isInitialSurvey.current) { isInitialSurvey.current = false; return; }

            for (const item of newDocs) {
              const id       = item.id;
              const notifKey = `survey-${id}`;
              if (processedNotificationIds.has(notifKey)) continue;
              processedNotificationIds.add(notifKey);

              playNotificationSound();

              const namaStr = item.nama      ? `dari ${item.nama}` : 'responden baru';
              const rataVal = item.rataRata != null ? Number(item.rataRata) : null;
              const rataStr = rataVal != null ? ` (⭐ ${rataVal.toFixed(1)}/5)` : '';
              triggerToast(`⭐ Survei Kepuasan Baru ${namaStr}${rataStr}`, 'ok');

              showNativeNotification(
                '⭐ Survei Kepuasan Baru Masuk!',
                [
                  item.nama  ? `Nama: ${item.nama}` : '',
                  rataVal != null ? `Rating: ${rataVal.toFixed(1)}/5` : '',
                  item.saran ? `Saran: ${String(item.saran).slice(0, 80)}` : '',
                  !item.nama && !item.saran ? 'Hasil survei baru telah tersimpan.' : '',
                ].filter(Boolean).join('\n'),
                `survey-live-${id}`,
                '/survei',
                false,
                () => setActiveTab('sv')
              );
            }
          },
          (error) => {
            console.warn('[Realtime Survey] error:', error);
            unsubscribe();
            setTimeout(() => { if (mounted) setup(); }, 5000);
          }
        );
      } catch (err) {
        console.error('[Realtime Survey] Setup error:', err);
      }
    };

    setup();
    return () => { mounted = false; unsubscribe(); };
  }, [session, setActiveTab, triggerToast]);

  return (
    <NotificationContext.Provider
      value={{
        unreadAduanCount,
        permissionStatus,
        isFcmReady,
        requestPermission,
        markAllAduanAsRead,
        aduanBanner,
        closeAduanBanner,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
