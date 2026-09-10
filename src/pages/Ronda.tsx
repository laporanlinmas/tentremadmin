import {
  Edit,
  Trash2,
  Calendar,
  Shield,
  Layers,
  Plus,
  Check,
  ToggleLeft,
  ToggleRight,
  Clock,
  MapPin,
  Users,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import React, { useState, useEffect } from 'react';

// Firebase imports
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';

import { KelompokRonda } from '../types';
import { useApp, useAuth } from '../App';

// Common Modals
import { ConfirmModal } from '../components/common/ConfirmModal';
import { Modal } from '../components/common/Modal';
import { CalendarModal } from '../components/common/CalendarModal';

// ── Firebase config ───────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.FIREBASE_DATABASE_URL,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
  measurementId: process.env.FIREBASE_MEASUREMENT_ID,
};
const isFirebaseConfigured = !!process.env.FIREBASE_PROJECT_ID;
const app = isFirebaseConfigured
  ? (getApps().length === 0 ? initializeApp(firebaseConfig) : getApp())
  : null;
const db = app ? getFirestore(app) : null;

// ── Main Component ────────────────────────────────────────────────────────────
export const Ronda: React.FC = () => {
  const { showLoad, hideLoad, triggerToast } = useApp();
  const { isAdmin } = useAuth();

  // ── Jadwal Ronda state ────────────────────────────────────────────────
  const [tanggalMulaiSiklus, setTanggalMulaiSiklus] = useState<string>('');
  const [showCalendarSiklus, setShowCalendarSiklus] = useState(false);
  const [isSavingTanggalSiklus, setIsSavingTanggalSiklus] = useState(false);

  // Kelompok Ronda state
  const [kelompokList, setKelompokList] = useState<KelompokRonda[]>([]);
  const [selectedDayTab, setSelectedDayTab] = useState<string>('Semua');

  // Kelompok Ronda Modal & CRUD state
  const [showKelompokModal, setShowKelompokModal] = useState<boolean>(false);
  const [kelompokModalMode, setKelompokModalMode] = useState<'add' | 'edit'>('add');
  const [kelompokForm, setKelompokForm] = useState<{
    id: string;
    nama: string;
    danpok: string;
    poskamling: string;
    jadwal: string;
    anggota: string;
    urutan: number;
    aktif: boolean;
  }>({
    id: '',
    nama: '',
    danpok: '',
    poskamling: '',
    jadwal: '',
    anggota: '',
    urutan: 1,
    aktif: true,
  });
  const [deleteKelompokTarget, setDeleteKelompokTarget] = useState<string | null>(null);

  const formatYmd = (date: Date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  // ── Firestore realtime listener for kelompok_ronda ────────────────────────
  useEffect(() => {
    if (!db) return;
    const colRef = collection(db, 'kelompok_ronda');
    const unsub = onSnapshot(
      colRef,
      (snapshot) => {
        const list: KelompokRonda[] = [];
        snapshot.forEach((docSnap) => {
          const d = docSnap.data();
          const pDanpok = d.danpok || d.danru || '';
          let angList: string[] = Array.isArray(d.anggota)
            ? d.anggota
            : d.anggota
            ? String(d.anggota).split('\n').filter(Boolean)
            : [];
          angList = angList.map((s: string) => s.trim()).filter(Boolean);

          // Auto-include Danpok at top of personil list with (Danpok) badge
          if (pDanpok) {
            const hasDanpok = angList.some(
              (a) =>
                a.toLowerCase().startsWith(pDanpok.toLowerCase()) ||
                a.toLowerCase().includes('(danpok)') ||
                a.toLowerCase().includes('(danru)')
            );
            if (!hasDanpok) {
              angList = [`${pDanpok} (Danpok)`, ...angList];
            } else {
              angList = angList.map((a) =>
                a.toLowerCase().startsWith(pDanpok.toLowerCase())
                  ? `${pDanpok} (Danpok)`
                  : a.replace(/\(Danru\)/gi, '(Danpok)')
              );
            }
          }

          list.push({
            id: docSnap.id,
            _ri: docSnap.id,
            nama: d.nama || 'Kelompok Ronda',
            hari: d.hari || 'Senin',
            danpok: pDanpok,
            danru: pDanpok,
            poskamling: d.poskamling || '',
            anggota: angList,
            jadwal: d.jadwal || '',
            keterangan: d.keterangan || '',
            urutan: typeof d.urutan === 'number' ? d.urutan : 99,
            aktif: d.aktif !== false,
          });
        });
        list.sort((a, b) => (a.urutan || 99) - (b.urutan || 99));
        setKelompokList(list);
      },
      (error) => {
        console.warn('onSnapshot kelompok_ronda error:', error);
      }
    );
    return () => unsub();
  }, []);

  // ── Jadwal Ronda Settings ─────────────────────────────────────────────
  React.useEffect(() => {
    if (!db) return;
    const unsub = onSnapshot(doc(db, 'settings', 'smart_poskamling'), (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        if (d.tanggalMulaiSiklus) setTanggalMulaiSiklus(d.tanggalMulaiSiklus);
      }
    });
    return () => unsub();
  }, []);

  // ── Helpers tanggal siklus ───────────────────────────────────────────────
  const formatTanggalSiklus = (ymd: string): string => {
    if (!ymd) return '';
    try {
      const d = new Date(ymd + 'T00:00:00');
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
    } catch {
      return ymd;
    }
  };

  const handleSaveTanggalSiklus = async (ymd: string) => {
    if (!db || !ymd) {
      triggerToast('Pilih tanggal terlebih dahulu.', 'er');
      return;
    }
    setIsSavingTanggalSiklus(true);
    showLoad('Menyimpan tanggal mulai siklus...');
    try {
      await setDoc(
        doc(db, 'settings', 'smart_poskamling'),
        { tanggalMulaiSiklus: ymd, updatedAt: new Date().toISOString() },
        { merge: true }
      );
      setTanggalMulaiSiklus(ymd);
      triggerToast('Tanggal mulai siklus berhasil disimpan.', 'ok');
    } catch (err: any) {
      triggerToast('Gagal: ' + err.message, 'er');
    } finally {
      hideLoad();
      setIsSavingTanggalSiklus(false);
    }
  };

  // ── Kelompok Ronda CRUD Handlers ──────────────────────────────────────────
  const handleOpenAddKelompok = () => {
    setKelompokModalMode('add');
    setKelompokForm({
      id: '',
      nama: `Kelompok ${kelompokList.length + 1}`,
      danpok: '',
      poskamling: '',
      jadwal: '',
      anggota: '',
      urutan: (kelompokList.length + 1) * 10,
      aktif: true,
    });
    setShowKelompokModal(true);
  };

  const handleOpenEditKelompok = (k: KelompokRonda) => {
    const pDanpok = k.danpok || k.danru || '';
    const rawMembers = (k.anggota || [])
      .filter(
        (ang) =>
          !pDanpok ||
          (!ang.toLowerCase().startsWith(pDanpok.toLowerCase()) &&
            !ang.toLowerCase().includes('(danpok)'))
      )
      .join('\n');

    setKelompokModalMode('edit');
    setKelompokForm({
      id: k.id || String(k._ri || ''),
      nama: k.nama || '',
      danpok: pDanpok,
      poskamling: k.poskamling || '',
      jadwal: k.jadwal || '',
      anggota: rawMembers,
      urutan: typeof k.urutan === 'number' ? k.urutan : 10,
      aktif: k.aktif !== false,
    });
    setShowKelompokModal(true);
  };

  const handleSaveKelompok = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kelompokForm.nama.trim()) {
      triggerToast('Nama Kelompok Ronda wajib diisi.', 'er');
      return;
    }

    const danpokName = kelompokForm.danpok.trim();
    const rawMembers = kelompokForm.anggota
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
      .filter(
        (s) =>
          !danpokName ||
          (!s.toLowerCase().startsWith(danpokName.toLowerCase()) &&
            !s.toLowerCase().includes('(danpok)') &&
            !s.toLowerCase().includes('(danru)'))
      );

    const finalMembers = danpokName ? [`${danpokName} (Danpok)`, ...rawMembers] : rawMembers;

    const payload = {
      nama: kelompokForm.nama.trim(),
      hari: '',
      nomorUrut: Number(kelompokForm.urutan) || 1,
      danpok: danpokName,
      danru: danpokName,
      poskamling: kelompokForm.poskamling.trim(),
      jadwal: kelompokForm.jadwal.trim() || `Hari ke-${kelompokForm.urutan} (21:30 - 02:00 WIB)`,
      anggota: finalMembers,
      keterangan: '',
      urutan: Number(kelompokForm.urutan) || 10,
      aktif: kelompokForm.aktif !== false,
    };

    showLoad('Menyimpan kelompok ronda...');
    try {
      if (kelompokModalMode === 'add') {
        if (db) {
          const docRef = doc(collection(db, 'kelompok_ronda'));
          await setDoc(docRef, { ...payload, createdAt: new Date().toISOString() });
        }
        triggerToast('Kelompok ronda berhasil ditambahkan.', 'ok');
      } else {
        if (db && kelompokForm.id) {
          await setDoc(
            doc(db, 'kelompok_ronda', kelompokForm.id),
            { ...payload, updatedAt: new Date().toISOString() },
            { merge: true }
          );
        }
        triggerToast('Kelompok ronda berhasil diperbarui.', 'ok');
      }
      hideLoad();
      setShowKelompokModal(false);
    } catch (err: any) {
      hideLoad();
      triggerToast('Gagal menyimpan: ' + err.message, 'er');
    }
  };

  const handleToggleKelompokAktif = async (k: KelompokRonda) => {
    const id = k.id || String(k._ri || '');
    if (!db || !id) return;
    try {
      await setDoc(doc(db, 'kelompok_ronda', id), { aktif: !k.aktif }, { merge: true });
      triggerToast(`Kelompok ${!k.aktif ? 'diaktifkan' : 'dinonaktifkan'}.`, 'ok');
    } catch (err: any) {
      triggerToast('Gagal update status: ' + err.message, 'er');
    }
  };

  const handleDeleteKelompok = async () => {
    if (!deleteKelompokTarget) return;
    showLoad('Menghapus kelompok ronda...');
    try {
      if (db) {
        await deleteDoc(doc(db, 'kelompok_ronda', deleteKelompokTarget));
      }
      hideLoad();
      setDeleteKelompokTarget(null);
      triggerToast('Kelompok ronda berhasil dihapus.', 'ok');
    } catch (err: any) {
      hideLoad();
      triggerToast('Gagal menghapus: ' + err.message, 'er');
    }
  };

  return (
    <div className="fu">
      <div className="panel">
        <div className="phd">
          <span className="ptl">
            <Shield className="w-4 h-4 inline-block align-middle text-emerald-500" /> Kelola Jadwal Ronda
          </span>
          <div className="fbar-right">
            <button
              type="button"
              className="bp"
              onClick={handleOpenAddKelompok}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                fontSize: '.74rem',
                fontWeight: 700,
                cursor: 'pointer',
                borderRadius: '8px',
              }}
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Kelompok</span>
            </button>
          </div>
        </div>

        {/* ── SUB SECTION: Kelompok Ronda ── */}
        <div
          style={{
            padding: '12px 16px 6px',
            borderBottom: '2px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Layers className="w-4 h-4 text-emerald-500" />
          <span
            style={{
              fontSize: '.74rem',
              fontWeight: 800,
              color: 'var(--fg)',
              textTransform: 'uppercase',
              letterSpacing: '.07em',
            }}
          >
            Kelompok Ronda
          </span>
          <span
            style={{
              fontSize: '.62rem',
              fontFamily: 'var(--mono)',
              padding: '1px 7px',
              borderRadius: '999px',
              background: 'var(--border)',
              color: 'var(--mid)',
            }}
          >
            {kelompokList.length} kelompok
          </span>
        </div>

        {/* ── Tanggal Mulai Siklus ── */}
        <div
          style={{
            padding: '12px 16px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            flexWrap: 'wrap',
            background: 'var(--surface)',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span
              style={{
                fontSize: '.62rem',
                fontWeight: 800,
                color: 'var(--mid)',
                textTransform: 'uppercase',
                letterSpacing: '.07em',
              }}
            >
              Mulai Siklus (Hari ke-1 = Kelompok 1)
            </span>
            <button
              type="button"
              onClick={() => setShowCalendarSiklus(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--bg)',
                cursor: 'pointer',
                fontSize: '.75rem',
                fontWeight: 700,
                color: tanggalMulaiSiklus ? 'var(--text)' : 'var(--muted)',
                minWidth: '160px',
              }}
            >
              <Calendar className="w-3.5 h-3.5 text-emerald-500" />
              {tanggalMulaiSiklus ? formatTanggalSiklus(tanggalMulaiSiklus) : 'Pilih tanggal…'}
            </button>
          </div>
        </div>

        {/* Day Filter Pills */}
        <div
          style={{
            padding: '12px 16px 4px 16px',
            display: 'flex',
            gap: '6px',
            alignItems: 'center',
            overflowX: 'auto',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <span
            style={{
              fontSize: '.68rem',
              fontWeight: 800,
              color: 'var(--mid)',
              textTransform: 'uppercase',
              marginRight: '4px',
              flexShrink: 0,
            }}
          >
            Siklus:
          </span>
          {['Semua', ...Array.from({ length: Math.max(kelompokList.length, 1) }, (_, i) => String(i + 1))].map((h) => {
            const count =
              h === 'Semua'
                ? kelompokList.length
                : kelompokList.filter((k) => String(k.urutan) === h).length;
            const isAct = selectedDayTab === h;
            return (
              <button
                key={h}
                type="button"
                onClick={() => setSelectedDayTab(h)}
                className={`bp ${isAct ? '' : 'bg2'}`}
                style={{
                  padding: '5px 12px',
                  fontSize: '.72rem',
                  fontWeight: 700,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                <span>{h === 'Semua' ? 'Semua' : `Hari ${h}`}</span>
                <span
                  style={{
                    fontSize: '.6rem',
                    padding: '1px 5px',
                    borderRadius: '999px',
                    background: isAct ? 'rgba(255,255,255,0.25)' : 'var(--border)',
                    fontWeight: 800,
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Groups Grid */}
        <div style={{ padding: '16px' }}>
          {kelompokList.filter((k) => selectedDayTab === 'Semua' || String(k.urutan) === selectedDayTab).length === 0 ? (
            <div className="empty" style={{ padding: '40px 20px' }}>
              <Layers className="w-10 h-10 opacity-20 mx-auto mb-2 block" />
              <p style={{ fontWeight: 700 }}>
                {selectedDayTab === 'Semua'
                  ? 'Belum ada kelompok terdaftar'
                  : `Belum ada kelompok untuk siklus hari ke-${selectedDayTab}`}
              </p>
              <p style={{ fontSize: '.7rem', color: 'var(--muted)', marginTop: '4px' }}>
                Klik tombol <strong>+ Tambah Kelompok</strong> di atas untuk membuat jadwal tugas kelompok baru.
              </p>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
                gap: '14px',
              }}
            >
              {kelompokList
                .filter((k) => selectedDayTab === 'Semua' || String(k.urutan) === selectedDayTab)
                .map((k, idx) => (
                  <div
                    key={k.id || idx}
                    style={{
                      background: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: '12px',
                      padding: '14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                      opacity: k.aktif !== false ? 1 : 0.65,
                    }}
                  >
                    {/* Header Card */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        gap: '8px',
                      }}
                    >
                      <h4 style={{ fontSize: '.86rem', fontWeight: 800, color: 'var(--text)', margin: 0 }}>
                        {k.nama}
                      </h4>

                      {/* Toggle button */}
                      <button
                        type="button"
                        onClick={() => handleToggleKelompokAktif(k)}
                        className="bg2"
                        title={k.aktif !== false ? 'Klik untuk nonaktifkan' : 'Klik untuk aktifkan'}
                        style={{
                          padding: '4px 8px',
                          fontSize: '.65rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          cursor: 'pointer',
                        }}
                      >
                        {k.aktif !== false ? (
                          <>
                            <ToggleRight className="w-4 h-4 text-emerald-500" />
                            <span>Aktif</span>
                          </>
                        ) : (
                          <>
                            <ToggleLeft className="w-4 h-4 text-slate-400" />
                            <span>Off</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Details Info */}
                    <div style={{ fontSize: '.72rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Shield className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span>
                          Danpok: <strong style={{ color: 'var(--text)' }}>{k.danpok || k.danru || '—'}</strong>
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <MapPin className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                        <span>
                          Pos: <strong style={{ color: 'var(--text)' }}>{k.poskamling || '—'}</strong>
                        </span>
                      </div>

                      {k.jadwal && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span>
                            Jadwal: <span style={{ color: 'var(--text)' }}>{k.jadwal}</span>
                          </span>
                        </div>
                      )}

                      {/* Anggota / Personil */}
                      {k.anggota && k.anggota.length > 0 && (
                        <div style={{ marginTop: '4px' }}>
                          <div
                            style={{
                              fontSize: '.62rem',
                              color: 'var(--muted)',
                              fontWeight: 800,
                              textTransform: 'uppercase',
                              marginBottom: '4px',
                            }}
                          >
                            Daftar Nama Personil ({k.anggota.length}):
                          </div>
                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                              gap: '4px',
                            }}
                          >
                            {k.anggota.map((ang, ai) => {
                              const isDanpokChip = ang.toLowerCase().includes('(danpok)');
                              return (
                                <div
                                  key={ai}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    padding: '3px 7px',
                                    borderRadius: '6px',
                                    background: isDanpokChip ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg)',
                                    border: isDanpokChip
                                      ? '1px solid rgba(16, 185, 129, 0.35)'
                                      : '1px solid var(--border)',
                                    fontSize: '.68rem',
                                    fontWeight: isDanpokChip ? 700 : 600,
                                    color: isDanpokChip ? 'var(--teal)' : 'inherit',
                                  }}
                                >
                                  <span
                                    style={{
                                      width: '16px',
                                      height: '16px',
                                      borderRadius: '50%',
                                      background: isDanpokChip ? 'var(--teal)' : 'rgba(16, 185, 129, 0.15)',
                                      color: isDanpokChip ? '#fff' : 'var(--teal)',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontSize: '.58rem',
                                      fontWeight: 800,
                                      flexShrink: 0,
                                    }}
                                  >
                                    {ai + 1}
                                  </span>
                                  <span
                                    style={{
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap',
                                    }}
                                    title={ang}
                                  >
                                    {ang}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        gap: '6px',
                        paddingTop: '8px',
                        borderTop: '1px solid var(--border)',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => handleOpenEditKelompok(k)}
                        className="be"
                        style={{
                          padding: '4px 10px',
                          fontSize: '.68rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteKelompokTarget(k.id || String(k._ri || ''))}
                        className="bd"
                        style={{
                          padding: '4px 10px',
                          fontSize: '.68rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Hapus</span>
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── MODAL TAMBAH / EDIT KELOMPOK RONDA ──────────────────────────────── */}
      {showKelompokModal && (
        <Modal
          show={showKelompokModal}
          onClose={() => setShowKelompokModal(false)}
          title={
            <span style={{ display: 'flex', alignItems: 'center', gap: '7px', color: 'var(--teal)' }}>
              <Layers className="w-4 h-4 inline-block align-middle" />
              {kelompokModalMode === 'add' ? 'Tambah Kelompok Jadwal Ronda' : 'Edit Kelompok Jadwal Ronda'}
            </span>
          }
          footer={
            <>
              <button className="bg2" onClick={() => setShowKelompokModal(false)}>
                Batal
              </button>
              <button className="bp" onClick={handleSaveKelompok}>
                <Check className="w-4 h-4 inline-block align-middle" /> Simpan Kelompok
              </button>
            </>
          }
        >
          <form onSubmit={handleSaveKelompok} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="frow">
              <div className="fcol" style={{ maxWidth: '120px' }}>
                <label className="flbl">
                  Nomor Urut <span className="req">*</span>
                </label>
                <select
                  className="fctl"
                  value={kelompokForm.urutan}
                  onChange={(e) => {
                    const urut = Number(e.target.value);
                    setKelompokForm({
                      ...kelompokForm,
                      urutan: urut,
                      nama: kelompokModalMode === 'add' ? `Kelompok ${urut}` : kelompokForm.nama,
                    });
                  }}
                  required
                >
                  {Array.from({ length: 50 }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>
                      Hari ke-{n}
                    </option>
                  ))}
                </select>
              </div>

              <div className="fcol">
                <label className="flbl">
                  Nama Kelompok <span className="req">*</span>
                </label>
                <input
                  className="fctl"
                  value={kelompokForm.nama}
                  onChange={(e) => setKelompokForm({ ...kelompokForm, nama: e.target.value })}
                  placeholder="Contoh: Kelompok Merah / Kelompok 1"
                  required
                />
              </div>
            </div>

            <div className="frow">
              <div className="fcol">
                <label className="flbl">Danpok / Komandan Kelompok</label>
                <input
                  className="fctl"
                  value={kelompokForm.danpok}
                  onChange={(e) => setKelompokForm({ ...kelompokForm, danpok: e.target.value })}
                  placeholder="Nama Danpok (misal: Slamet Riyadi)"
                />
              </div>
            </div>

            <div className="frow">
              <div className="fcol">
                <label className="flbl">Pos / Lokasi Jaga</label>
                <input
                  className="fctl"
                  value={kelompokForm.poskamling}
                  onChange={(e) => setKelompokForm({ ...kelompokForm, poskamling: e.target.value })}
                  placeholder="Poskamling RT 01/RW 01"
                />
              </div>
              <div className="fcol">
                <label className="flbl">Jadwal / Jam Jaga</label>
                <input
                  className="fctl"
                  value={kelompokForm.jadwal}
                  onChange={(e) => setKelompokForm({ ...kelompokForm, jadwal: e.target.value })}
                  placeholder="21:30 - 02:00 WIB"
                />
              </div>
            </div>

            <div className="fgrp">
              <label className="flbl">
                Daftar Nama Personil / Anggota Jaga{' '}
                <span style={{ fontWeight: 400, color: 'var(--muted)', fontSize: '.65rem' }}>
                  (1 nama per baris, nama Danpok otomatis menjadi personil #1)
                </span>
              </label>
              <textarea
                className="fctl"
                rows={4}
                value={kelompokForm.anggota}
                onChange={(e) => setKelompokForm({ ...kelompokForm, anggota: e.target.value })}
                placeholder={'Budi Santoso\nAgus Setiawan\nSugeng Widodo\nPrasetyo'}
                style={{ resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '4px' }}>
              <input
                type="checkbox"
                id="kelompok-aktif"
                checked={kelompokForm.aktif}
                onChange={(e) => setKelompokForm({ ...kelompokForm, aktif: e.target.checked })}
                style={{ cursor: 'pointer' }}
              />
              <label htmlFor="kelompok-aktif" style={{ fontSize: '.74rem', fontWeight: 600, cursor: 'pointer' }}>
                Status Aktif (Tampilkan di jadwal kelompok ronda)
              </label>
            </div>
          </form>
        </Modal>
      )}

      {/* ─── MODAL KONFIRMASI HAPUS KELOMPOK RONDA ──────────────────────────── */}
      <ConfirmModal
        show={deleteKelompokTarget !== null}
        msg="Hapus kelompok ronda ini? Data kelompok akan dihapus permanen."
        onConfirm={handleDeleteKelompok}
        onCancel={() => setDeleteKelompokTarget(null)}
      />

      {/* Calendar Modal - Tanggal Mulai Siklus */}
      <CalendarModal
        show={showCalendarSiklus}
        onClose={() => setShowCalendarSiklus(false)}
        onSelect={(_: any, __: any, date: Date) => {
          const ymd = formatYmd(date);
          setShowCalendarSiklus(false);
          handleSaveTanggalSiklus(ymd);
        }}
      />
    </div>
  );
};

export default Ronda;
