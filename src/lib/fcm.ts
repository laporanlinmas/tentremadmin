/**
 * src/lib/fcm.ts — Firebase Cloud Messaging Integration (Web Admin)
 * Persis implementasi Mesen.Ae-Capacitor:
 *   1. requestForToken()   → Daftarkan device ke Firebase, simpan FCM token ke Firestore
 *   2. sendPushToRole()    → Ambil token dari Firestore, kirim via /api/fcm-send
 *   3. onForegroundMessage() → Tangkap notifikasi saat tab admin sedang terbuka
 *   4. playNotificationSound() → Mainkan suara notif.mp3
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDocs, collection } from 'firebase/firestore';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';

const firebaseConfig = {
  apiKey:            (import.meta as any).env?.VITE_FIREBASE_API_KEY || (window as any).__ENV__?.VITE_FIREBASE_API_KEY || 'AIzaSyC4dtS_MPlvlNjiCxNJ37R0X95uIznqsnc',
  authDomain:        (import.meta as any).env?.VITE_FIREBASE_AUTH_DOMAIN || (window as any).__ENV__?.VITE_FIREBASE_AUTH_DOMAIN || 'tentrem.firebaseapp.com',
  projectId:         (import.meta as any).env?.VITE_FIREBASE_PROJECT_ID || (window as any).__ENV__?.VITE_FIREBASE_PROJECT_ID || 'tentrem',
  storageBucket:     (import.meta as any).env?.VITE_FIREBASE_STORAGE_BUCKET || (window as any).__ENV__?.VITE_FIREBASE_STORAGE_BUCKET || 'tentrem.firebasestorage.app',
  messagingSenderId: (import.meta as any).env?.VITE_FIREBASE_MESSAGING_SENDER_ID || (window as any).__ENV__?.VITE_FIREBASE_MESSAGING_SENDER_ID || '536621352207',
  appId:             (import.meta as any).env?.VITE_FIREBASE_APP_ID || (window as any).__ENV__?.VITE_FIREBASE_APP_ID || '1:536621352207:web:e8d15de81269e536b4aa7a',
  measurementId:     (import.meta as any).env?.VITE_FIREBASE_MEASUREMENT_ID || (window as any).__ENV__?.VITE_FIREBASE_MEASUREMENT_ID || 'G-SZTE1PZ91P',
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);
export const isFirebaseConfigured = !!db;

const VAPID_KEY =
  (import.meta as any).env?.VITE_VAPID_PUBLIC_KEY ||
  'BOS-76i4DY8yREaNKWdh3xkqKkPTVLibbvSroA2rAkOxJlfY7HhF2YDzuIryY4D_5Ky-nQhehNBLBcL7IBt-TNQ';

// ─── AUDIO PLAYER (DENGAN THROTTLE 3 DETIK & UNLOCK GESTURE) ─────────────────
let lastPlayedTime = 0;
export const processedNotificationIds = new Set<string>();

export const playNotificationSound = () => {
  const now = Date.now();
  if (now - lastPlayedTime < 3000) return;
  lastPlayedTime = now;

  try {
    const audio = new Audio('/notif.mp3');
    audio.volume = 1;
    audio.currentTime = 0;
    audio.play().catch((err) => {
      console.warn('[FCM Audio] Autoplay ditolak browser sebelum ada klik:', err);
    });
  } catch (err) {
    console.warn('[FCM Audio] Gagal memutar notif.mp3:', err);
  }

  // Haptic feedback jika didukung perangkat
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate([300, 100, 300, 100, 300]);
    } catch {}
  }
};

// ─── SUARA ADUAN KHUSUS PER TINGKAT KEPARAHAN (Web Audio API) ────────────────
// Dibedakan berdasarkan ringan / sedang / tinggi / kritis
// Semakin kritis → makin panjang, makin urgent, makin keras

let lastAduanSoundTime = 0;

/**
 * Mainkan nada alert menggunakan Web Audio API.
 * Tidak butuh file .mp3 tambahan — semuanya di-generate real-time.
 *
 * Pola suara:
 *  ringan : 1 nada pendek ramah     (ding!)
 *  sedang : 2 nada naik             (ding-ding!)
 *  tinggi : 3 nada tegas menurun    (dong-dong-dong!)
 *  kritis : 5 nada sirine panjang   (wee-woo berulang + panjang)
 */
export const playAduanSound = (keparahan: 'ringan' | 'sedang' | 'tinggi' | 'kritis' = 'ringan') => {
  const now = Date.now();
  // Throttle antar bunyi aduan: 2 detik
  if (now - lastAduanSoundTime < 2000) return;
  lastAduanSoundTime = now;

  // Haptic vibration berbeda per level
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      switch (keparahan) {
        case 'kritis':
          navigator.vibrate([500, 100, 500, 100, 500, 100, 500, 100, 800]);
          break;
        case 'tinggi':
          navigator.vibrate([400, 100, 400, 100, 400]);
          break;
        case 'sedang':
          navigator.vibrate([300, 100, 300]);
          break;
        default:
          navigator.vibrate([200]);
      }
    } catch {}
  }

  // Web Audio API
  if (typeof window === 'undefined' || !window.AudioContext) {
    // Fallback ke notif.mp3 jika AudioContext tidak tersedia
    try {
      const audio = new Audio('/notif.mp3');
      audio.volume = 1;
      audio.play().catch(() => {});
    } catch {}
    return;
  }

  try {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AC();

    // Helper: mainkan satu nada (oscillator + envelope)
    const playTone = (
      startTime: number,
      freq: number,
      duration: number,
      volume: number,
      type: OscillatorType = 'sine',
      freqEnd?: number
    ) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, startTime);
      if (freqEnd !== undefined) {
        osc.frequency.linearRampToValueAtTime(freqEnd, startTime + duration);
      }

      // Attack - sustain - release envelope
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(volume, startTime + 0.02);
      gain.gain.setValueAtTime(volume, startTime + duration * 0.6);
      gain.gain.linearRampToValueAtTime(0, startTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration + 0.01);
    };

    const t = ctx.currentTime;

    switch (keparahan) {
      // ── RINGAN: 1 ding pendek ramah (880 Hz, 0.25s) ──────────────────────
      case 'ringan':
        playTone(t,        880, 0.25, 0.5, 'sine');
        playTone(t + 0.05, 1100, 0.18, 0.3, 'sine');
        break;

      // ── SEDANG: 2 nada naik tegas (660→880 Hz, 2x) ───────────────────────
      case 'sedang':
        playTone(t,       660,  0.22, 0.6, 'triangle');
        playTone(t + 0.28, 880, 0.22, 0.6, 'triangle');
        playTone(t + 0.56, 1100, 0.18, 0.4, 'sine');
        break;

      // ── TINGGI: 3 nada tegas + panjang, frekuensi mendesak ───────────────
      case 'tinggi': {
        // Nada 1: burst tinggi
        playTone(t,        960,  0.18, 0.75, 'square');
        playTone(t + 0.22, 720,  0.18, 0.75, 'square');
        playTone(t + 0.44, 960,  0.18, 0.75, 'square');
        playTone(t + 0.66, 720,  0.18, 0.75, 'square');
        // Nada akhir panjang
        playTone(t + 0.9,  1200, 0.5,  0.7, 'triangle');
        break;
      }

      // ── KRITIS: sirine urgent 5 sweep + finish panjang ───────────────────
      case 'kritis': {
        // Sweep up-down berulang (seperti sirine)
        const sweepDur = 0.35;
        for (let i = 0; i < 4; i++) {
          // Sweep up: 600 → 1400 Hz
          playTone(t + i * sweepDur * 2,               600,  sweepDur, 0.85, 'sawtooth', 1400);
          // Sweep down: 1400 → 600 Hz
          playTone(t + i * sweepDur * 2 + sweepDur,   1400, sweepDur, 0.85, 'sawtooth', 600);
        }
        // Final burst panjang dan keras
        playTone(t + 4 * sweepDur * 2,      880,  0.15, 0.9, 'square');
        playTone(t + 4 * sweepDur * 2 + 0.18, 1100, 0.15, 0.9, 'square');
        playTone(t + 4 * sweepDur * 2 + 0.36, 1320, 0.5,  0.8, 'triangle');
        break;
      }
    }

    // Tutup AudioContext setelah selesai agar tidak ada memory leak
    const totalDuration = keparahan === 'kritis' ? 4.5 : keparahan === 'tinggi' ? 2.0 : keparahan === 'sedang' ? 1.2 : 0.6;
    setTimeout(() => {
      ctx.close().catch(() => {});
    }, (totalDuration + 0.5) * 1000);

  } catch (err) {
    console.warn('[AduanSound] Web Audio API error:', err);
    // Fallback
    try {
      const audio = new Audio('/notif.mp3');
      audio.volume = 1;
      audio.play().catch(() => {});
    } catch {}
  }
};

// Setup unlock audio saat ada klik pertama pengguna di halaman
if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    try {
      const a = new Audio('/notif.mp3');
      a.volume = 0.01;
      a.play().then(() => {
        a.pause();
        a.currentTime = 0;
      }).catch(() => {});
    } catch {}
    window.removeEventListener('click', unlockAudio);
    window.removeEventListener('keydown', unlockAudio);
  };
  window.addEventListener('click', unlockAudio, { once: true });
  window.addEventListener('keydown', unlockAudio, { once: true });
}

// ─── GET MESSAGING INSTANCE ──────────────────────────────────────────────────
export const getMessagingInstance = async () => {
  try {
    const supported = await isSupported();
    if (!supported) return null;
    return getMessaging(app);
  } catch {
    return null;
  }
};

// ─── REQUEST & REGISTER FCM TOKEN ────────────────────────────────────────────
export const requestForToken = async (
  role: string = 'admin',
  name: string = 'Admin Linmas'
): Promise<string | null> => {
  try {
    if (typeof window === 'undefined') return null;

    // 1. Cek dukungan browser
    const messaging = await getMessagingInstance();
    if (!messaging) {
      console.warn('[FCM] Firebase Messaging tidak didukung di browser ini.');
      return null;
    }

    // 2. Minta izin notifikasi dari pengguna
    let permission = Notification.permission;
    if (permission !== 'granted') {
      permission = await Notification.requestPermission();
    }

    if (permission !== 'granted') {
      console.warn('[FCM] Izin notifikasi belum diberikan atau ditolak.');
      return null;
    }

    // 3. Daftarkan Service Worker resmi Firebase
    const configParams = new URLSearchParams({
      apiKey: firebaseConfig.apiKey,
      authDomain: firebaseConfig.authDomain,
      projectId: firebaseConfig.projectId,
      storageBucket: firebaseConfig.storageBucket,
      messagingSenderId: firebaseConfig.messagingSenderId,
      appId: firebaseConfig.appId,
    }).toString();

    const registration = await navigator.serviceWorker.register(
      `/firebase-messaging-sw.js?${configParams}`,
      { scope: '/' }
    );

    try {
      await registration.update();
    } catch (e) {
      console.warn('[FCM] Service worker update check:', e);
    }
    await navigator.serviceWorker.ready;

    // 4. Dapatkan FCM Device Token dari Google
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    });

    if (!token) {
      console.warn('[FCM] Gagal mendapatkan FCM token.');
      return null;
    }

    // 5. Simpan token ke Firestore (koleksi fcmTokens)
    await setDoc(doc(db, 'fcmTokens', token), {
      token,
      role,
      name,
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    console.info(`[FCM] Token berhasil didaftarkan untuk role=${role}`);
    return token;
  } catch (err) {
    console.error('[FCM] Error saat mendaftar token:', err);
    return null;
  }
};

// ─── SEND PUSH NOTIFICATION TO ALL DEVICES OF A ROLE ─────────────────────────
export const sendPushToRole = async (
  role: string | string[],
  payload: { title: string; body: string; url?: string; ticket?: string }
): Promise<void> => {
  try {
    const roles = Array.isArray(role) ? role : [role];

    // Ambil semua FCM token untuk role tersebut dari Firestore
    const snap = await getDocs(collection(db, 'fcmTokens'));
    const tokens: string[] = snap.docs
      .map((d) => d.data())
      .filter((t: any) => roles.includes(t.role) && t.token)
      .map((t: any) => t.token as string);

    if (tokens.length === 0) {
      console.info(`[FCM] Tidak ada token untuk role=${roles.join(',')}, skip push.`);
      return;
    }

    // Kirim ke backend serverless /api/fcm-send
    const res = await fetch('/api/fcm-send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tokens, payload }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      console.error('[FCM] Gagal mengirim push:', errData);
    } else {
      console.info(`[FCM] Push berhasil dikirim ke ${tokens.length} device.`);
    }
  } catch (err) {
    console.error('[FCM] Error sendPushToRole:', err);
  }
};

// ─── LISTEN TO MESSAGES IN FOREGROUND ─────────────────────────────────────────
export const onForegroundMessage = async (callback: (payload: any) => void): Promise<() => void> => {
  const messaging = await getMessagingInstance();
  if (!messaging) return () => {};

  return onMessage(messaging, (payload) => {
    const id = payload?.data?.ticket || payload?.data?.id || payload?.messageId;
    if (id && processedNotificationIds.has(String(id))) {
      console.info(`[FCM] Notification ${id} already processed, skipping duplicate sound.`);
      return;
    }
    if (id) processedNotificationIds.add(String(id));
    playNotificationSound();
    callback(payload);
  });
};
