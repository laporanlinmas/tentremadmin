import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Anggota } from '../types';
import { useApp } from '../App';
import { esc } from '../utils/helpers';
// Subcomponents
import { MemberModal } from '../components/common/MemberModal';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { SatlinmasSkeleton } from '../components/SkeletonPages';
import {
  UserPlus, Search, RotateCcw, Edit2, Trash2, FolderOpen, Users,
  GitBranch, Shield, Star, UserCheck, Sparkles, X, Save
} from 'lucide-react';

// Firebase imports
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore, collection, onSnapshot, doc, deleteDoc, setDoc, getDocs, updateDoc
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.FIREBASE_DATABASE_URL || '',
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
  measurementId: process.env.FIREBASE_MEASUREMENT_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

const ITEMS_PER_PAGE = 24;

// Kategori hardcode
export const KATEGORI_ANGGOTA = [
  'Ketua Poskamling',
  'Sekretaris',
  'Bendahara',
  'Seksi Konsumsi',
  'Seksi Perlengkapan',
  'Seksi Humas',
  'Anggota',
] as const;

const normalizeAnggotaList = (raw: any): Anggota[] => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw.anggotaPoskamling)) return raw.anggotaPoskamling;
  if (Array.isArray(raw.data?.anggotaPoskamling)) return raw.data.anggotaPoskamling;
  if (Array.isArray(raw.data)) return raw.data;
  return [];
};

// ─── Struktur Types & Defaults ───────────────────────────────────────────────
type Level = 'pembina' | 'penanggungjawab' | 'pelaksana' | 'seksi' | 'anggota';

interface StrukturPejabat {
  kades: string;
  bhabinkamtibmas: string;
  babinsa: string;
  trantib: string;
  ketua: string;
  sekretaris: string;
  bendahara: string;
  konsumsi: string;
  perlengkapan: string;
  humas: string;
}

const DEFAULT_PEJABAT: StrukturPejabat = {
  kades: 'Heru Setiawan, S.Sos',
  bhabinkamtibmas: 'Polsek Slahung',
  babinsa: 'Koramil Slahung',
  trantib: 'Kasi Trantibum',
  ketua: 'Agus Widodo',
  sekretaris: 'Paryanto',
  bendahara: 'Joko Susilo',
  konsumsi: 'Puji Rahayu',
  perlengkapan: 'Haryono',
  humas: 'Parsono',
};

const CFG: Record<Level, { dot: string; badgeCls: string; textCls: string; borderCls: string; icon: React.ReactNode }> = {
  pembina: {
    dot: 'bg-blue-500',
    badgeCls: 'bg-blue-500/10 border-blue-400/30',
    textCls: 'text-blue-600 dark:text-blue-300',
    borderCls: 'border-blue-200 dark:border-blue-800/50',
    icon: <Star className="w-3 h-3" />,
  },
  penanggungjawab: {
    dot: 'bg-emerald-500',
    badgeCls: 'bg-emerald-500/10 border-emerald-400/30',
    textCls: 'text-emerald-600 dark:text-emerald-300',
    borderCls: 'border-emerald-300 dark:border-emerald-700/60',
    icon: <Shield className="w-3 h-3" />,
  },
  pelaksana: {
    dot: 'bg-teal-500',
    badgeCls: 'bg-teal-500/10 border-teal-400/30',
    textCls: 'text-teal-600 dark:text-teal-300',
    borderCls: 'border-teal-200 dark:border-teal-800/50',
    icon: <UserCheck className="w-3 h-3" />,
  },
  seksi: {
    dot: 'bg-indigo-500',
    badgeCls: 'bg-indigo-500/10 border-indigo-400/30',
    textCls: 'text-indigo-600 dark:text-indigo-300',
    borderCls: 'border-indigo-200 dark:border-indigo-800/50',
    icon: <Sparkles className="w-3 h-3" />,
  },
  anggota: {
    dot: 'bg-amber-500',
    badgeCls: 'bg-amber-500/10 border-amber-400/30',
    textCls: 'text-amber-600 dark:text-amber-300',
    borderCls: 'border-amber-200 dark:border-amber-800/50',
    icon: <Users className="w-3 h-3" />,
  },
};

// ─── Card Bagan Interaktif di Admin ──────────────────────────────────────────
const AdminBaganCard: React.FC<{
  badge: string;
  jabatan: string;
  nama?: string;
  level: Level;
  isCenter?: boolean;
  onEdit?: () => void;
}> = ({ badge, jabatan, nama, level, isCenter, onEdit }) => {
  const c = CFG[level] || CFG.pelaksana;
  return (
    <div
      onClick={onEdit}
      className={`group relative h-[96px] bg-white dark:bg-slate-900 border ${
        isCenter
          ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-md'
          : `${c.borderCls} shadow-xs`
      } rounded-2xl hover:shadow-lg hover:border-emerald-500/80 transition-all duration-150 w-full flex flex-col justify-center px-4 py-2.5 ${
        onEdit ? 'cursor-pointer' : ''
      }`}
    >
      <div className={`absolute top-0 left-0 right-0 h-1.5 rounded-t-2xl ${c.dot}`} />
      <div className="flex items-center justify-between gap-1 mb-1.5">
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[10.5px] sm:text-[11px] font-extrabold uppercase tracking-wide ${c.badgeCls} ${c.textCls}`}
        >
          {c.icon}
          {badge}
        </span>
        {onEdit && (
          <span
            title="Klik untuk ubah nama"
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 hover:scale-110 shadow-xs"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </span>
        )}
      </div>
      <p className="text-xs sm:text-[14px] font-black text-slate-900 dark:text-white leading-tight truncate">
        {jabatan}
      </p>
      {nama && (
        <p
          className={`text-xs sm:text-[12.5px] font-bold ${
            isCenter
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-slate-600 dark:text-slate-300'
          } truncate mt-1`}
        >
          {nama}
        </p>
      )}
    </div>
  );
};

// ─── Mobile Card untuk Org Tree ───────────────────────────────────────────────
const ADM_COLOR: Record<string, { border: string; strip: string; badge: string; text: string; ring?: string }> = {
  blue:    { border: '1px solid rgba(59,130,246,.3)',   strip: '#3b82f6', badge: 'rgba(59,130,246,.1)',   text: '#3b82f6' },
  emerald: { border: '1.5px solid rgba(16,185,129,.5)', strip: '#10b981', badge: 'rgba(16,185,129,.1)',  text: '#10b981', ring: '0 0 0 2px rgba(16,185,129,.2)' },
  teal:    { border: '1px solid rgba(20,184,166,.3)',   strip: '#14b8a6', badge: 'rgba(20,184,166,.1)',  text: '#0d9488' },
  indigo:  { border: '1px solid rgba(99,102,241,.3)',   strip: '#6366f1', badge: 'rgba(99,102,241,.1)',  text: '#6366f1' },
  amber:   { border: '1px solid rgba(245,158,11,.3)',   strip: '#f59e0b', badge: 'rgba(245,158,11,.1)',  text: '#d97706' },
};

const AdminMobileCard: React.FC<{
  color: keyof typeof ADM_COLOR;
  badge: string;
  jabatan: string;
  nama?: string;
  small?: boolean;
  isRoot?: boolean;
  isCenter?: boolean;
  onEdit?: () => void;
}> = ({ color, badge, jabatan, nama, small, isCenter, onEdit }) => {
  const c = ADM_COLOR[color] || ADM_COLOR.blue;
  return (
    <div
      style={{ border: c.border, borderRadius: '9px', background: 'var(--card)', overflow: 'hidden', boxShadow: c.ring ? c.ring : 'var(--sh0)', cursor: onEdit ? 'pointer' : 'default' }}
      onClick={onEdit}
    >
      <div style={{ height: small ? '3px' : '4px', background: c.strip }} />
      <div style={{ padding: small ? '6px 7px' : '8px 10px' }}>
        <span style={{ display: 'inline-block', padding: '1px 5px', borderRadius: '99px', background: c.badge, color: c.text, fontSize: small ? '7.5px' : '8.5px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: '3px' }}>
          {badge}
        </span>
        <p style={{ fontSize: small ? '9.5px' : '10.5px', fontWeight: 900, color: 'var(--text)', lineHeight: 1.25, margin: 0 }}>{jabatan}</p>
        {nama && <p style={{ fontSize: small ? '8.5px' : '9.5px', fontWeight: 700, color: isCenter ? c.text : 'var(--mid)', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nama}</p>}
      </div>
    </div>
  );
};

// ─── Admin Mobile Org Tree Node dengan Garis Struktur Presisi ────────────────
const AdminMobileTreeNode: React.FC<{
  isFirst?: boolean;
  isLast?: boolean;
  dotColor?: string;
  badgeLabel?: string;
  badgeStyle?: React.CSSProperties;
  children: React.ReactNode;
}> = ({
  isFirst,
  isLast,
  dotColor = '#10b981',
  badgeLabel,
  badgeStyle,
  children,
}) => {
  return (
    <div style={{ position: 'relative', paddingLeft: '24px', paddingBottom: '14px' }}>
      {!isLast && (
        <div
          style={{
            position: 'absolute',
            left: '7px',
            width: '2px',
            background: 'rgba(16,185,129,0.7)',
            top: isFirst ? '18px' : '0',
            bottom: '-14px',
            zIndex: 1,
          }}
        />
      )}
      {isLast && (
        <div
          style={{
            position: 'absolute',
            left: '7px',
            top: '0',
            height: '18px',
            width: '2px',
            background: 'rgba(16,185,129,0.7)',
            zIndex: 1,
          }}
        />
      )}
      <div
        style={{
          position: 'absolute',
          left: '3px',
          top: '14px',
          width: '10px',
          height: '10px',
          borderRadius: '50%',
          background: dotColor,
          boxShadow: '0 0 0 2px var(--card)',
          zIndex: 2,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: '8px',
          top: '18px',
          width: '16px',
          height: '2px',
          background: 'rgba(16,185,129,0.7)',
          zIndex: 1,
        }}
      />
      <div style={{ width: '100%' }}>
        {badgeLabel && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
            <span
              style={{
                fontSize: '9.5px',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '.04em',
                padding: '2px 8px',
                borderRadius: '6px',
                ...badgeStyle,
              }}
            >
              {badgeLabel}
            </span>
          </div>
        )}
        {children}
      </div>
    </div>
  );
};

export const DataAnggota: React.FC = () => {
  const { cacheGet, cacheSet, showLoad, hideLoad, triggerToast } = useApp();

  const [activeMainTab, setActiveMainTab] = useState<'struktur' | 'anggota'>('struktur');

  // Struktur State
  const [pejabat, setPejabat] = useState<StrukturPejabat>(DEFAULT_PEJABAT);
  const [editingRole, setEditingRole] = useState<{
    key: keyof StrukturPejabat;
    label: string;
    currentName: string;
  } | null>(null);
  const [editInputName, setEditInputName] = useState('');
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [bulkEditForm, setBulkEditForm] = useState<StrukturPejabat>(DEFAULT_PEJABAT);

  // Data Anggota State
  const [allAnggota, setAllAnggota] = useState<Anggota[]>([]);
  const [isFetching, setIsFetching] = useState(true);

  const [searchName, setSearchName] = useState('');
  const [searchKategori, setSearchKategori] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const [showMemberModal, setShowMemberModal] = useState(false);
  const [memberTarget, setMemberTarget] = useState<Anggota | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);

  // 1. Subscribe ke settings/struktur_poskamling
  useEffect(() => {
    if (!db) return;
    try {
      const unsub = onSnapshot(
        doc(db, 'settings', 'struktur_poskamling'),
        (snap) => {
          if (snap.exists()) {
            const d = snap.data();
            setPejabat((prev) => ({
              ...prev,
              kades: d.kades || prev.kades,
              bhabinkamtibmas: d.bhabinkamtibmas || prev.bhabinkamtibmas,
              babinsa: d.babinsa || prev.babinsa,
              trantib: d.trantib || prev.trantib,
              ketua: d.ketua || prev.ketua,
              sekretaris: d.sekretaris || prev.sekretaris,
              bendahara: d.bendahara || prev.bendahara,
              konsumsi: d.konsumsi || prev.konsumsi,
              perlengkapan: d.perlengkapan || prev.perlengkapan,
              humas: d.humas || prev.humas,
            }));
          }
        },
        (err) => console.warn('Error onSnapshot struktur_poskamling:', err)
      );
      return () => unsub();
    } catch (e) {
      console.warn('Catch error struktur snapshot:', e);
    }
  }, []);

  // 2. Real-time Firestore sync untuk Data Anggota dari collection anggotaPoskamling
  useEffect(() => {
    if (!db) {
      loadAnggotaFallback();
      return;
    }

    const colRef = collection(db, 'anggotaPoskamling');
    const unsubscribe = onSnapshot(
      colRef,
      (snapshot) => {
        if (!snapshot.empty) {
          const list: Anggota[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            list.push({
              _ri: docSnap.id as any,
              nama: data.nama || '',
              tglLahir: data.tglLahir || '',
              usia: data.usia !== undefined ? Number(data.usia) : undefined,
              kategori: data.kategori || '',
              wa: data.wa || '',
            });
          });
          setAllAnggota(list);
          cacheSet('anggotaPoskamling', list);
        } else {
          loadAnggotaFallback();
        }
        setIsFetching(false);
      },
      (err) => {
        console.warn('Firestore anggotaPoskamling snapshot error, falling back:', err);
        loadAnggotaFallback();
      }
    );

    return () => unsubscribe();
  }, []);

  const loadAnggotaFallback = useCallback(async () => {
    const cached = cacheGet('anggotaPoskamling');
    if (cached) {
      setAllAnggota(normalizeAnggotaList(cached));
    }
    setIsFetching(false);
  }, [cacheGet]);

  const safeAnggota = useMemo(() => {
    return Array.isArray(allAnggota) ? allAnggota : [];
  }, [allAnggota]);

  const filteredAnggota = useMemo(() => {
    return safeAnggota.filter((member) => {
      if (!member) return false;
      const matchName = (member.nama || '').toLowerCase().includes(searchName.toLowerCase());
      const matchKategori = !searchKategori || (member.kategori || '').toLowerCase().includes(searchKategori.toLowerCase());
      return matchName && matchKategori;
    });
  }, [safeAnggota, searchName, searchKategori]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchName, searchKategori]);

  const { totalPages, currentAnggota } = useMemo(() => {
    const total = filteredAnggota.length;
    const pages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const current = filteredAnggota.slice(start, start + ITEMS_PER_PAGE);
    return { totalPages: pages, currentAnggota: current };
  }, [filteredAnggota, currentPage]);

  const handleResetFilters = () => {
    setSearchName('');
    setSearchKategori('');
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    showLoad('Menghapus anggota...');
    const targetRi = deleteTarget;
    setDeleteTarget(null);

    try {
      if (db && typeof targetRi === 'string') {
        await deleteDoc(doc(db, 'anggotaPoskamling', targetRi));
      }
      hideLoad();
      triggerToast('Data anggota berhasil dihapus.', 'ok');
      cacheSet('anggotaPoskamling', null);
    } catch (e: any) {
      hideLoad();
      triggerToast('Error: ' + e.message, 'er');
    }
  };

  const openAddModal = () => {
    setMemberTarget(null);
    setShowMemberModal(true);
  };

  const openEditModal = (member: Anggota) => {
    setMemberTarget(member);
    setShowMemberModal(true);
  };

  // ─── Handler Edit Single Pejabat ───────────────────────────────────────────
  const handleOpenEditRole = (key: keyof StrukturPejabat, label: string) => {
    setEditingRole({ key, label, currentName: pejabat[key] });
    setEditInputName(pejabat[key]);
  };

  const handleSaveRole = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editingRole) return;

    const newName = editInputName.trim();
    if (!newName) {
      triggerToast('Nama tidak boleh kosong.', 'er');
      return;
    }

    showLoad(`Menyimpan nama ${editingRole.label}...`);
    try {
      const updated = {
        ...pejabat,
        [editingRole.key]: newName,
        updatedAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'settings', 'struktur_poskamling'), updated, { merge: true });

      const roleToKategori: Record<string, string> = {
        ketua: 'Ketua Poskamling',
        sekretaris: 'Sekretaris',
        bendahara: 'Bendahara',
        konsumsi: 'Seksi Konsumsi',
        perlengkapan: 'Seksi Perlengkapan',
        humas: 'Seksi Humas',
      };

      const targetKategori = roleToKategori[editingRole.key];
      if (targetKategori) {
        const snap = await getDocs(collection(db, 'anggotaPoskamling'));
        snap.forEach(async (docSnap) => {
          const d = docSnap.data();
          const k = (d.kategori || '').toLowerCase();
          if (k.includes(targetKategori.toLowerCase())) {
            await updateDoc(doc(db, 'anggotaPoskamling', docSnap.id), { nama: newName });
          }
        });
      }

      setPejabat(updated);
      hideLoad();
      triggerToast(`Nama ${editingRole.label} berhasil diperbarui.`, 'ok');
      setEditingRole(null);
    } catch (err: any) {
      hideLoad();
      triggerToast(`Gagal menyimpan: ${err.message}`, 'er');
    }
  };

  // ─── Handler Bulk Edit ──────────────────────────────────────────────────────
  const handleOpenBulkEdit = () => {
    setBulkEditForm({ ...pejabat });
    setShowBulkEditModal(true);
  };

  const handleSaveBulkEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    showLoad('Menyimpan seluruh struktur...');
    try {
      const updated = {
        ...bulkEditForm,
        updatedAt: new Date().toISOString(),
      };
      await setDoc(doc(db, 'settings', 'struktur_poskamling'), updated, { merge: true });
      setPejabat(updated);
      hideLoad();
      triggerToast('Seluruh nama struktur berhasil diperbarui.', 'ok');
      setShowBulkEditModal(false);
    } catch (err: any) {
      hideLoad();
      triggerToast(`Gagal menyimpan: ${err.message}`, 'er');
    }
  };

  if (isFetching && safeAnggota.length === 0) {
    return <SatlinmasSkeleton />;
  }

  return (
    <div className="fu space-y-4">
      {/* ─── TAB NAVIGATION HEADER ────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          padding: '4px',
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: '14px',
          width: 'fit-content'
        }}
      >
        <button
          type="button"
          className={`bp ${activeMainTab === 'struktur' ? '' : 'bg2'}`}
          onClick={() => setActiveMainTab('struktur')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 18px',
            fontSize: '.82rem',
            fontWeight: 800,
            borderRadius: '10px',
            cursor: 'pointer'
          }}
        >
          <GitBranch className="w-4 h-4 text-emerald-500" />
          <span>Bagan Struktur</span>
          <span
            style={{
              fontSize: '.65rem',
              padding: '1px 7px',
              borderRadius: '999px',
              background: activeMainTab === 'struktur' ? 'rgba(255,255,255,0.25)' : 'var(--border)',
              color: activeMainTab === 'struktur' ? '#fff' : 'var(--text)'
            }}
          >
            10 Posisi
          </span>
        </button>

        <button
          type="button"
          className={`bp ${activeMainTab === 'anggota' ? '' : 'bg2'}`}
          onClick={() => setActiveMainTab('anggota')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 18px',
            fontSize: '.82rem',
            fontWeight: 800,
            borderRadius: '10px',
            cursor: 'pointer'
          }}
        >
          <Users className="w-4 h-4 text-amber-500" />
          <span>Data Anggota</span>
          <span
            style={{
              fontSize: '.65rem',
              padding: '1px 7px',
              borderRadius: '999px',
              background: activeMainTab === 'anggota' ? 'rgba(255,255,255,0.25)' : 'var(--border)',
              color: activeMainTab === 'anggota' ? '#fff' : 'var(--text)'
            }}
          >
            {safeAnggota.length}
          </span>
        </button>
      </div>

      {/* ════════ TAB 1: BAGAN STRUKTUR POSKAMLING ════════ */}
      {activeMainTab === 'struktur' && (
        <div className="space-y-4">
          {/* Action Header Card */}
          <div
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: '14px',
              padding: '16px 20px',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: '#10b981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <GitBranch className="w-5 h-5" />
              </div>
              <div>
                <h2 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text)', margin: 0 }}>
                  Bagan Struktur Komando Poskamling
                </h2>
                <p style={{ fontSize: '.75rem', color: 'var(--muted)', margin: '2px 0 0' }}>
                  Klik salah satu kartu untuk mengubah nama pejabat. Perubahan langsung tersinkronisasi ke website warga secara real-time.
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={handleOpenBulkEdit}
                className="bp"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '.78rem', padding: '8px 14px' }}
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Ubah Semua Nama Sekaligus</span>
              </button>
            </div>
          </div>

          {/* Org Chart Container */}
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 20px',
                borderBottom: '1px solid var(--border)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text)' }}>
                  Visualisasi Bagan Struktur Poskamling
                </span>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Sinkron Otomatis Realtime ke Website
              </span>
            </div>

            {/* ══════ MOBILE: Org Tree ══════ */}
            <div className="block md:hidden p-4 pb-2">
              <AdminMobileTreeNode isFirst dotColor="#3b82f6">
                <AdminMobileCard color="blue" badge="Pembina Utama" jabatan="Kepala Desa Tugurejo" nama={pejabat.kades} isRoot onEdit={() => handleOpenEditRole('kades', 'Kepala Desa Tugurejo')} />
              </AdminMobileTreeNode>
              <AdminMobileTreeNode dotColor="#3b82f6" badgeLabel="3 Unsur Pembina Desa" badgeStyle={{ color: '#2563eb', background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.3)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '6px' }}>
                  {[
                    { key: 'bhabinkamtibmas', badge: 'P-1', jabatan: 'Bhabinkamtibmas' },
                    { key: 'babinsa',          badge: 'P-2', jabatan: 'Babinsa'          },
                    { key: 'trantib',          badge: 'P-3', jabatan: 'Sie. Trantib'     },
                  ].map(({ key, badge, jabatan }) => (
                    <AdminMobileCard key={key} color="blue" badge={badge} jabatan={jabatan} nama={(pejabat as any)[key]} small onEdit={() => handleOpenEditRole(key as any, jabatan)} />
                  ))}
                </div>
              </AdminMobileTreeNode>
              <AdminMobileTreeNode dotColor="#10b981">
                <AdminMobileCard color="emerald" badge="Penanggung Jawab" jabatan="Ketua Poskamling" nama={pejabat.ketua} isCenter onEdit={() => handleOpenEditRole('ketua', 'Ketua Poskamling')} />
              </AdminMobileTreeNode>
              <AdminMobileTreeNode dotColor="#14b8a6" badgeLabel="Sekretariat & Keuangan" badgeStyle={{ color: '#0d9488', background: 'rgba(20,184,166,0.12)', border: '1px solid rgba(20,184,166,0.3)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                  <AdminMobileCard color="teal" badge="Sekretariat" jabatan="Sekretaris" nama={pejabat.sekretaris} small onEdit={() => handleOpenEditRole('sekretaris', 'Sekretaris')} />
                  <AdminMobileCard color="teal" badge="Keuangan" jabatan="Bendahara" nama={pejabat.bendahara} small onEdit={() => handleOpenEditRole('bendahara', 'Bendahara')} />
                </div>
              </AdminMobileTreeNode>
              <AdminMobileTreeNode dotColor="#6366f1" badgeLabel="Seksi Operasional" badgeStyle={{ color: '#4f46e5', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '6px' }}>
                  {[
                    { key: 'konsumsi',     jabatan: 'Konsumsi'   },
                    { key: 'perlengkapan', jabatan: 'Perlengkpn' },
                    { key: 'humas',        jabatan: 'Humas'       },
                  ].map(({ key, jabatan }) => (
                    <AdminMobileCard key={key} color="indigo" badge="Seksi" jabatan={jabatan} nama={(pejabat as any)[key]} small onEdit={() => handleOpenEditRole(key as any, jabatan)} />
                  ))}
                </div>
              </AdminMobileTreeNode>
              <AdminMobileTreeNode isLast dotColor="#f59e0b">
                <AdminMobileCard color="amber" badge="Pelaksana" jabatan="Anggota Poskamling" nama={`${safeAnggota.length} Personel Terdaftar`} />
              </AdminMobileTreeNode>
            </div>

            {/* Desktop: Bagan Kanvas */}
            <div className="hidden md:flex p-4 sm:p-8 overflow-x-auto justify-center">
              <div className="relative w-[880px] shrink-0 h-[780px]">
                <svg aria-hidden="true" viewBox="0 0 880 780" preserveAspectRatio="none" className="absolute inset-0 h-full w-full pointer-events-none">
                  <g fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500/80 dark:text-emerald-400/80">
                    <path d="M440 114 V136" />
                    <path d="M108 136 H740" />
                    <path d="M108 136 V158" />
                    <path d="M302 136 V158" />
                    <path d="M740 136 V158" />
                    <path d="M440 136 V275" />
                    <path d="M440 369 V394" />
                    <path d="M140 394 H740" />
                    <path d="M140 394 V416" />
                    <path d="M140 510 V532" />
                    <path d="M740 394 V416" />
                    <path d="M740 510 V532" />
                    <path d="M740 626 V648" />
                    <path d="M440 394 V648" />
                    <path d="M440 742 V775" />
                  </g>
                  <g className="fill-emerald-500 dark:fill-emerald-400">
                    <circle cx="440" cy="136" r="3.5" />
                    <circle cx="108" cy="136" r="3" />
                    <circle cx="302" cy="136" r="3" />
                    <circle cx="740" cy="136" r="3" />
                    <circle cx="440" cy="275" r="3.5" />
                    <circle cx="440" cy="394" r="3.5" />
                    <circle cx="140" cy="394" r="3" />
                    <circle cx="740" cy="394" r="3" />
                    <circle cx="440" cy="648" r="3.5" />
                    <circle cx="440" cy="775" r="3.5" />
                  </g>
                </svg>

                <div className="absolute top-[20px] left-[300px] w-[280px]">
                  <AdminBaganCard badge="Pembina Utama" jabatan="Kepala Desa Tugurejo" nama={pejabat.kades} level="pembina" isCenter onEdit={() => handleOpenEditRole('kades', 'Kepala Desa Tugurejo')} />
                </div>
                <div className="absolute top-[158px] left-[20px] w-[175px]">
                  <AdminBaganCard badge="Pembina 1" jabatan="Bhabinkamtibmas" nama={pejabat.bhabinkamtibmas} level="pembina" onEdit={() => handleOpenEditRole('bhabinkamtibmas', 'Bhabinkamtibmas')} />
                </div>
                <div className="absolute top-[158px] left-[215px] w-[175px]">
                  <AdminBaganCard badge="Pembina 2" jabatan="Babinsa" nama={pejabat.babinsa} level="pembina" onEdit={() => handleOpenEditRole('babinsa', 'Babinsa')} />
                </div>
                <div className="absolute top-[158px] left-[630px] w-[220px]">
                  <AdminBaganCard badge="Pembina 3" jabatan="Sie. Trantib Desa" nama={pejabat.trantib} level="pembina" onEdit={() => handleOpenEditRole('trantib', 'Sie. Trantib Desa')} />
                </div>
                <div className="absolute top-[275px] left-[300px] w-[280px]">
                  <AdminBaganCard badge="Penanggung Jawab" jabatan="Ketua Poskamling" nama={pejabat.ketua} level="penanggungjawab" isCenter onEdit={() => handleOpenEditRole('ketua', 'Ketua Poskamling')} />
                </div>
                <div className="absolute top-[416px] left-[30px] w-[220px]">
                  <AdminBaganCard badge="Sekretariat" jabatan="Sekretaris" nama={pejabat.sekretaris} level="pelaksana" onEdit={() => handleOpenEditRole('sekretaris', 'Sekretaris')} />
                </div>
                <div className="absolute top-[532px] left-[30px] w-[220px]">
                  <AdminBaganCard badge="Keuangan" jabatan="Bendahara" nama={pejabat.bendahara} level="pelaksana" onEdit={() => handleOpenEditRole('bendahara', 'Bendahara')} />
                </div>
                <div className="absolute top-[416px] left-[630px] w-[220px]">
                  <AdminBaganCard badge="Seksi" jabatan="Seksi Konsumsi" nama={pejabat.konsumsi} level="seksi" onEdit={() => handleOpenEditRole('konsumsi', 'Seksi Konsumsi')} />
                </div>
                <div className="absolute top-[532px] left-[630px] w-[220px]">
                  <AdminBaganCard badge="Seksi" jabatan="Seksi Perlengkapan" nama={pejabat.perlengkapan} level="seksi" onEdit={() => handleOpenEditRole('perlengkapan', 'Seksi Perlengkapan')} />
                </div>
                <div className="absolute top-[648px] left-[630px] w-[220px]">
                  <AdminBaganCard badge="Seksi" jabatan="Seksi Humas" nama={pejabat.humas} level="seksi" onEdit={() => handleOpenEditRole('humas', 'Seksi Humas')} />
                </div>
                <div className="absolute top-[648px] left-[290px] w-[300px]">
                  <AdminBaganCard badge="Pelaksana Lapangan" jabatan="Anggota Poskamling" nama={`${safeAnggota.length} Personel Terdaftar (Aktif)`} level="anggota" isCenter />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════ TAB 2: DATA ANGGOTA ════════ */}
      {activeMainTab === 'anggota' && (
        <div className="space-y-4">
          {/* Filter bar */}
          <div className="fbar">
            <div className="fsrch" style={{ flex: '2 1 180px' }}>
              <Search className="w-4 h-4 fsi" />
              <input
                className="fctl"
                type="text"
                placeholder="Cari nama anggota..."
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', gap: '6px', flex: '1 1 160px', alignItems: 'center' }}>
              <select
                className="fctl"
                style={{ flex: 1, minWidth: 0 }}
                value={searchKategori}
                onChange={(e) => setSearchKategori(e.target.value)}
              >
                <option value="">Semua Kategori</option>
                {KATEGORI_ANGGOTA.map((k) => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </select>
              <button className="bg2" onClick={handleResetFilters} title="Reset Filter" style={{ flexShrink: 0, padding: '9px 10px' }}>
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
            <button onClick={openAddModal} className="bp" style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap', flexShrink: 0 }}>
              <UserPlus className="w-4 h-4" /> Tambah Anggota
            </button>
          </div>

          <div className="ag-grid" style={{ padding: '12px' }}>
            {currentAnggota.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)', gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                <FolderOpen size={48} style={{ opacity: 0.5 }} />
                <p style={{ fontWeight: 700, color: 'var(--text)' }}>Tidak ada data anggota ditemukan.</p>
                <p style={{ fontSize: '.72rem', color: 'var(--muted)', margin: 0 }}>Silakan tambahkan data anggota poskamling baru.</p>
              </div>
            ) : (
              currentAnggota.map((member, idx) => {
                const initial = (member.nama || '?').charAt(0).toUpperCase();
                return (
                  <div key={member._ri || idx} className="ag-card">
                    <div className="ag-av satpol">
                      {initial}
                    </div>
                    <div className="ag-info">
                      <div className="ag-name">
                        {esc(member.nama)}
                      </div>
                      <div className="ag-unit">
                        {esc(member.kategori) || 'Anggota'}
                      </div>
                      <div className="ag-meta">
                        {member.usia && member.usia > 0
                          ? <span className="ag-pill ag-age">{member.usia} Thn</span>
                          : <span className="ag-pill" style={{ color: 'var(--muted)', background: 'transparent', border: '1px dashed var(--border)', fontSize: '0.68rem' }}>Umur belum diisi</span>
                        }
                        {member.wa && (
                          <a
                            href={`https://wa.me/${member.wa.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ag-pill"
                            style={{ background: 'rgba(37,211,102,0.12)', color: '#15a34a', border: '1px solid rgba(37,211,102,0.25)', display: 'inline-flex', alignItems: 'center', gap: '5px', textDecoration: 'none', cursor: 'pointer' }}
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                            {member.wa}
                          </a>
                        )}
                      </div>
                    </div>
                    <div style={{ position: 'absolute', top: '12px', right: '12px', display: 'flex', gap: '5px' }}>
                      <button onClick={() => openEditModal(member)} className="bg2" style={{ padding: '6px', borderRadius: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Edit2 size={16} className="text-blue-500" />
                      </button>
                      <button onClick={() => setDeleteTarget(member._ri || idx)} className="bg2" style={{ padding: '6px', borderRadius: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Trash2 size={16} className="text-red-500" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', gap: '5px', marginTop: '15px', justifyContent: 'center' }}>
              <button disabled={currentPage <= 1} onClick={() => setCurrentPage((prev) => prev - 1)} className="bp" style={{ padding: '6px 12px' }}>&laquo;</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                .map((p, i, arr) => (
                  <React.Fragment key={p}>
                    {i > 0 && arr[i - 1] !== p - 1 && <span style={{ padding: '6px' }}>...</span>}
                    <button onClick={() => setCurrentPage(p)} className={p === currentPage ? 'bp' : 'bg2'} style={{ padding: '6px 12px' }}>{p}</button>
                  </React.Fragment>
                ))}
              <button disabled={currentPage >= totalPages} onClick={() => setCurrentPage((prev) => prev + 1)} className="bp" style={{ padding: '6px 12px' }}>&raquo;</button>
            </div>
          )}
        </div>
      )}

      {/* ─── MODAL: Edit Single Pejabat ───────────────────────────────────── */}
      {editingRole && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
          onClick={() => setEditingRole(null)}
        >
          <div
            style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '16px', width: '100%', maxWidth: '440px', padding: '24px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)', animation: 'mIn .2s ease-out' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(16,185,129,0.15)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--text)' }}>Ubah Nama Pejabat</h3>
                  <p style={{ fontSize: '.75rem', color: 'var(--muted)', margin: 0 }}>Posisi: <strong style={{ color: 'var(--text)' }}>{editingRole.label}</strong></p>
                </div>
              </div>
              <button type="button" onClick={() => setEditingRole(null)} style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: '4px' }}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveRole} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '.78rem', fontWeight: 700, marginBottom: '6px', color: 'var(--text)' }}>Nama Lengkap / Instansi</label>
                <input type="text" className="fctl" autoFocus style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', fontSize: '.88rem' }} value={editInputName} onChange={(e) => setEditInputName(e.target.value)} placeholder={`Masukkan nama ${editingRole.label}...`} />
                <p style={{ fontSize: '.7rem', color: 'var(--muted)', marginTop: '6px' }}>💡 Nama yang Anda simpan akan langsung diperbarui di bagan struktur website warga.</p>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '8px', borderTop: '1px solid var(--border)' }}>
                <button type="button" className="bg2" onClick={() => setEditingRole(null)} style={{ padding: '8px 16px', borderRadius: '10px', fontSize: '.82rem', fontWeight: 700 }}>Batal</button>
                <button type="submit" className="bp" style={{ padding: '8px 18px', borderRadius: '10px', fontSize: '.82rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Save className="w-3.5 h-3.5" /><span>Simpan Perubahan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: Bulk Edit Semua Nama Struktur ─────────────────────────── */}
      {showBulkEditModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
          onClick={() => setShowBulkEditModal(false)}
        >
          <div
            style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '16px', width: '100%', maxWidth: '620px', maxHeight: '90vh', overflowY: 'auto', padding: '24px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(16,185,129,0.15)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <GitBranch className="w-4 h-4" />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--text)' }}>Ubah Semua Nama Struktur Poskamling</h3>
                  <p style={{ fontSize: '.75rem', color: 'var(--muted)', margin: 0 }}>Sesuaikan seluruh nama personel dan pejabat struktur sekaligus.</p>
                </div>
              </div>
              <button type="button" onClick={() => setShowBulkEditModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: '4px' }}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBulkEdit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Grup Pembina */}
              <div style={{ padding: '12px', background: 'var(--bg2)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <p style={{ fontSize: '.78rem', fontWeight: 800, color: '#3b82f6', marginBottom: '10px' }}>★ Unsur Pembina</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px' }}>
                  {[
                    { field: 'kades', label: 'Kepala Desa (Pembina Utama)' },
                    { field: 'bhabinkamtibmas', label: 'Bhabinkamtibmas' },
                    { field: 'babinsa', label: 'Babinsa' },
                    { field: 'trantib', label: 'Sie. Trantib Desa' },
                  ].map(({ field, label }) => (
                    <div key={field}>
                      <label style={{ display: 'block', fontSize: '.72rem', fontWeight: 700, marginBottom: '4px' }}>{label}</label>
                      <input type="text" className="fctl" style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', fontSize: '.82rem' }} value={(bulkEditForm as any)[field]} onChange={(e) => setBulkEditForm({ ...bulkEditForm, [field]: e.target.value })} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Grup Pimpinan & Staf */}
              <div style={{ padding: '12px', background: 'var(--bg2)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <p style={{ fontSize: '.78rem', fontWeight: 800, color: '#10b981', marginBottom: '10px' }}>🛡️ Pimpinan &amp; Staf Sekretariat</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px' }}>
                  {[
                    { field: 'ketua', label: 'Ketua Poskamling (Penanggung Jawab)' },
                    { field: 'sekretaris', label: 'Sekretaris' },
                    { field: 'bendahara', label: 'Bendahara' },
                  ].map(({ field, label }) => (
                    <div key={field} style={field === 'ketua' ? { gridColumn: '1 / -1' } : {}}>
                      <label style={{ display: 'block', fontSize: '.72rem', fontWeight: 700, marginBottom: '4px' }}>{label}</label>
                      <input type="text" className="fctl" style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', fontSize: '.82rem' }} value={(bulkEditForm as any)[field]} onChange={(e) => setBulkEditForm({ ...bulkEditForm, [field]: e.target.value })} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Grup Seksi */}
              <div style={{ padding: '12px', background: 'var(--bg2)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <p style={{ fontSize: '.78rem', fontWeight: 800, color: '#6366f1', marginBottom: '10px' }}>✨ Seksi Operasional</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px' }}>
                  {[
                    { field: 'konsumsi', label: 'Seksi Konsumsi' },
                    { field: 'perlengkapan', label: 'Seksi Perlengkapan' },
                    { field: 'humas', label: 'Seksi Humas' },
                  ].map(({ field, label }) => (
                    <div key={field} style={field === 'humas' ? { gridColumn: '1 / -1' } : {}}>
                      <label style={{ display: 'block', fontSize: '.72rem', fontWeight: 700, marginBottom: '4px' }}>{label}</label>
                      <input type="text" className="fctl" style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', fontSize: '.82rem' }} value={(bulkEditForm as any)[field]} onChange={(e) => setBulkEditForm({ ...bulkEditForm, [field]: e.target.value })} />
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '10px', borderTop: '1px solid var(--border)' }}>
                <button type="button" className="bg2" onClick={() => setShowBulkEditModal(false)} style={{ padding: '8px 16px', borderRadius: '10px', fontSize: '.82rem', fontWeight: 700 }}>Batal</button>
                <button type="submit" className="bp" style={{ padding: '8px 18px', borderRadius: '10px', fontSize: '.82rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Save className="w-3.5 h-3.5" /><span>Simpan Semua Nama</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MemberModal untuk Tambah/Edit Data Anggota */}
      <MemberModal
        member={memberTarget}
        show={showMemberModal}
        onClose={() => setShowMemberModal(false)}
        onSuccess={() => {
          cacheSet('anggotaPoskamling', null);
        }}
      />

      {/* ConfirmModal untuk Hapus Anggota */}
      <ConfirmModal
        show={deleteTarget !== null}
        msg="Hapus data anggota ini secara permanen?"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default DataAnggota;
