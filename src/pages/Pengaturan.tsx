import { Key, Save, UserPlus, Plus, Edit, Shield, ChevronDown, Eye, EyeOff, UserCheck, FileText, Loader2, Trash2, CheckCircle, Users, Tag, Lock, ToggleLeft, ToggleRight, Copy } from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';
import { useApp, useAuth, useTheme } from '../App';
import { apiGet, apiPost } from '../services/api';
import { esc } from '../utils/helpers';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { AlertModal } from '../components/common/AlertModal';
import { Modal } from '../components/common/Modal';

// Firebase imports for settings sync
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, onSnapshot, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.FIREBASE_DATABASE_URL || '',
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
  measurementId: process.env.FIREBASE_MEASUREMENT_ID };

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);


export const Pengaturan: React.FC = () => {
  const { showLoad, hideLoad, triggerToast } = useApp();
  const { session } = useAuth();
  const { isDarkMode, toggleDarkMode } = useTheme();

  // Panels Accordion States (which ones are open)
  const [openPanels, setOpenPanels] = useState<Record<string, boolean>>({
    akun: false,
    peta: false,
    kategoriAduan: false });

  // Custom Alert and Confirm Modal States
  const [confirmShow, setConfirmShow] = useState(false);
  const [confirmMsg, setConfirmMsg] = useState('');
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);

  const [alertShow, setAlertShow] = useState(false);
  const [alertMsg, setAlertMsg] = useState('');

  const askConfirm = (msg: string, action: () => void) => {
    setConfirmMsg(msg);
    setConfirmAction(() => action);
    setConfirmShow(true);
  };

  // Account form states
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);

  const [newUsername, setNewUsername] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Peta form states
  const [petaJudul, setPetaJudul] = useState('');
  const [petaJabatan, setPetaJabatan] = useState('');
  const [petaNama, setPetaNama] = useState('');

  // Kategori Pengaduan states (Firestore Sync)
  const [kategoriAduanList, setKategoriAduanList] = useState<string[]>([
    'Ketertiban Umum',
    'Kebersihan & Sampah',
    'Kerusakan Fasilitas Umum',
    'Parkir Liar',
    'PKL & Gangguan Usaha',
    'Keamanan Lingkungan',
    'Lainnya / Aspirasi'
  ]);
  const [newKategoriInput, setNewKategoriInput] = useState('');

  // Timers for live previews debouncing

  // Accordion Toggle
  const togglePanel = (panelKey: string) => {
    setOpenPanels((prev) => ({
      ...prev,
      [panelKey]: !prev[panelKey] }));
  };

  // Real-time Firestore sync for Aduan Categories
  useEffect(() => {
    if (!db) return;
    const unsub = onSnapshot(doc(db, 'settings', 'aduan_categories'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (Array.isArray(data.list) && data.list.length > 0) {
          setKategoriAduanList(data.list);
        }
      }
    }, () => {});
    return () => unsub();
  }, []);

  // Fetch Settings on Mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await apiGet('getSettings');
        if (res.success) {
          const d = res.data?.settings || res.data || {};

          setPetaJudul(d.petaJudul || d.peta_judul || 'PETA TUGUREJO KABUPATEN PONOROGO');
          setPetaJabatan(d.petaJabatan || d.peta_jabatan || 'Kepala Bidang SDA dan Linmas');
          setPetaNama(d.petaNama || d.peta_nama || 'Erry Setiyoso Birowo, SP');
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchSettings();
  }, []);

  // Update Collective PDF Preview in background

  // Form Submissions
  const handleChangePassword = async () => {
    if (!oldPass || !newPass) {
      triggerToast('Password lama & baru wajib diisi.', 'er');
      return;
    }
    showLoad('Memperbarui...');
    try {
      const res = await apiPost('changePassword', {
        oldPass,
        newPass,
        username: session?.username || '' });
      hideLoad();
      if (res.success) {
        triggerToast('Password berhasil diganti.', 'ok');
        setOldPass('');
        setNewPass('');
      } else {
        triggerToast(res.message || 'Gagal mengubah password.', 'er');
      }
    } catch (e: any) {
      hideLoad();
      triggerToast(e.message || 'Error', 'er');
    }
  };

  const handleCreateAccount = async () => {
    if (!newUsername || !newFullName || !newPassword) {
      triggerToast('Semua field akun baru wajib diisi.', 'er');
      return;
    }
    showLoad('Mendaftarkan...');
    try {
      const res = await apiPost('createAccount', {
        username: newUsername.trim(),
        role: 'admin',
        namaLengkap: newFullName.trim(),
        password: newPassword });
      hideLoad();
      if (res.success) {
        triggerToast(`Akun ${newUsername} berhasil dibuat.`, 'ok');
        setNewUsername('');
        setNewFullName('');
        setNewPassword('');
      } else {
        triggerToast(res.message || 'Gagal membuat akun.', 'er');
      }
    } catch (e: any) {
      hideLoad();
      triggerToast(e.message || 'Error', 'er');
    }
  };

  const handleSavePetaSettings = async () => {
    showLoad('Menyimpan...');
    try {
      const res = await apiPost('saveSettings', {
        peta_judul: petaJudul,
        peta_jabatan: petaJabatan,
        peta_nama: petaNama });
      hideLoad();
      if (res.success) {
        triggerToast('Pengaturan Peta disimpan.', 'ok');
      } else {
        triggerToast(res.message || 'Gagal menyimpan.', 'er');
      }
    } catch (e: any) {
      hideLoad();
      triggerToast(e.message || 'Error', 'er');
    }
  };

  // Google Sheet Initialization (Maintenance)
  const handleInitSheets = (onlySheet: string | null) => {
    const msg = onlySheet
      ? `Perbaiki sheet "${onlySheet}" saja?\n\nHeader baris 1 akan disamakan dengan template bila tidak sama (kolom tidak ditambah). Freeze baris 1 & format header biru. Data baris 2+ tidak dihapus.`
      : 'Perbaiki SEMUA sheet sekaligus?\n\nSama seperti per sheet, untuk setiap tab sheet.';
    
    askConfirm(msg, async () => {
      showLoad(onlySheet ? 'Memproses satu sheet...' : 'Memproses semua sheet...');
      try {
        const res = await apiPost('initAllSheets', onlySheet ? { onlySheet } : {});
        hideLoad();
        if (res.success) {
          triggerToast('Struktur sheet selesai.', 'ok');
          const lines = res.data;
          const detail = Array.isArray(lines) ? lines.join('\n') : String(res.message || '');
          setAlertMsg('Selesai.\n\n' + detail);
          setAlertShow(true);
        } else {
          triggerToast('Gagal inisiasi.', 'er');
          setAlertMsg('Gagal: ' + (res.message || ''));
          setAlertShow(true);
        }
      } catch (e: any) {
        hideLoad();
        triggerToast(e.message || 'Error', 'er');
      }
    });
  };

  const handleAddKategori = async () => {
    const val = newKategoriInput.trim();
    if (!val) return;
    if (kategoriAduanList.includes(val)) {
      triggerToast('Kategori sudah ada dalam daftar.', 'wr');
      return;
    }
    const newList = [...kategoriAduanList, val];
    setKategoriAduanList(newList);
    setNewKategoriInput('');
    if (db) {
      try {
        await setDoc(doc(db, 'settings', 'aduan_categories'), { list: newList }, { merge: true });
        triggerToast('Kategori pengaduan berhasil ditambahkan & tersinkron ke website.', 'ok');
      } catch (e: any) {
        triggerToast('Gagal menyimpan kategori: ' + e.message, 'er');
      }
    }
  };

  const handleDeleteKategori = (target: string) => {
    askConfirm(`Hapus kategori pengaduan "${target}"?`, async () => {
      const newList = kategoriAduanList.filter(k => k !== target);
      setKategoriAduanList(newList);
      if (db) {
        try {
          await setDoc(doc(db, 'settings', 'aduan_categories'), { list: newList }, { merge: true });
          triggerToast('Kategori berhasil dihapus.', 'ok');
        } catch (e: any) {
          triggerToast('Gagal menghapus: ' + e.message, 'er');
        }
      }
    });
  };

  const sheetList = [
    { id: 'INPUT', lbl: 'INPUT' },
    { id: 'Detail Foto', lbl: 'Detail Foto' },
    { id: 'Teks Laporan', lbl: 'Teks Laporan' },
    { id: 'Settings', lbl: 'Settings' },
  ];

  return (
    <div className="fu">
      {/* MANAJEMEN AKUN */}
      <div className="panel" style={{ marginBottom: '16px' }}>
        <div className="phd" onClick={() => togglePanel('akun')} style={{ cursor: 'pointer' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <span className="flex items-center gap-2">
              <Shield className="w-4 h-4" /> Manajemen Akun
            </span>
            <ChevronDown
              className="tg-ico w-4 h-4"
              style={{
                color: 'var(--muted)',
                transition: 'transform .3s',
                transform: openPanels.akun ? 'rotate(180deg)' : 'rotate(0deg)' }}
            />
          </div>
        </div>
        <div className="mbd" style={{ padding: '16px', display: openPanels.akun ? 'grid' : 'none', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          
          {/* Change Password */}
          <div className="set-card" style={{ marginBottom: '0px' }}>
            <p className="set-card-ttl" style={{ color: 'var(--blue)' }}>
              <Key className="w-4 h-4 inline-block align-middle" /> Ganti Password
            </p>
            <div className="fgrp">
              <label className="flbl">Password Lama</label>
              <div className="pw-field-wrap">
                <input
                  type={showOldPass ? 'text' : 'password'}
                  className="fctl"
                  value={oldPass}
                  onChange={(e) => setOldPass(e.target.value)}
                />
                <button
                  type="button"
                  className="pw-eye"
                  onClick={() => setShowOldPass(!showOldPass)}
                >
                  {showOldPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="fgrp">
              <label className="flbl">Password Baru</label>
              <div className="pw-field-wrap">
                <input
                  type={showNewPass ? 'text' : 'password'}
                  className="fctl"
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                />
                <button
                  type="button"
                  className="pw-eye"
                  onClick={() => setShowNewPass(!showNewPass)}
                >
                  {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button className="bp" style={{ width: '100%' }} onClick={handleChangePassword}>
              <Save className="w-4 h-4 inline-block align-middle" /> Perbarui Password
            </button>
          </div>

          {/* Create Account */}
          <div className="set-card" style={{ marginBottom: '0px' }}>
            <p className="set-card-ttl" style={{ color: 'var(--green)' }}>
              <UserPlus className="w-4 h-4 inline-block align-middle" /> Buat Akun Baru
            </p>
            <div className="fgrp">
              <label className="flbl">Username</label>
              <input
                className="fctl"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
              />
            </div>
            <div className="fgrp">
              <label className="flbl">Nama Lengkap</label>
              <input
                className="fctl"
                value={newFullName}
                onChange={(e) => setNewFullName(e.target.value)}
              />
            </div>
            <div className="fgrp">
              <label className="flbl">Password</label>
              <div className="pw-field-wrap">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  className="fctl"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="pw-eye"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button
              className="bp"
              style={{ width: '100%', background: 'var(--green)' }}
              onClick={handleCreateAccount}
            >
              <UserCheck className="w-4 h-4 inline-block align-middle mr-1.5" /> Daftarkan Akun
            </button>
          </div>

        </div>
      </div>


      {/* MANAJEMEN KATEGORI ADUAN */}
      <div className="panel" style={{ marginBottom: '16px' }}>
        <div className="phd" onClick={() => togglePanel('kategoriAduan')} style={{ cursor: 'pointer' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <span className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-[var(--blue)]" /> Manajemen Kategori Pengaduan Masyarakat
            </span>
            <ChevronDown className="tg-ico w-4 h-4" style={{ color: 'var(--muted)', transition: 'transform .3s', transform: openPanels.kategoriAduan ? 'rotate(180deg)' : 'rotate(0deg)' }} />
          </div>
        </div>
        <div className="mbd" style={{ padding: '16px', display: openPanels.kategoriAduan ? 'block' : 'none' }}>
          <div className="set-card" style={{ marginBottom: '0px' }}>
            <p style={{ fontSize: '.72rem', color: 'var(--muted)', marginBottom: '14px', lineHeight: '1.55' }}>
              Kelola daftar kategori pengaduan warga yang tersinkronisasi dengan website.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
              {kategoriAduanList.map((kat) => (
                <div key={kat} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '20px', padding: '4px 10px 4px 12px', fontSize: '.72rem', fontWeight: 600, color: 'var(--text)' }}>
                  {kat}
                  <button onClick={() => handleDeleteKategori(kat)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '0', display: 'flex', alignItems: 'center', color: 'var(--red)', lineHeight: 1 }}>
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {kategoriAduanList.length === 0 && <span style={{ fontSize: '.72rem', color: 'var(--muted)' }}>Belum ada kategori pengaduan.</span>}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                className="fctl"
                placeholder="Nama kategori pengaduan baru..."
                value={newKategoriInput}
                onChange={(e) => setNewKategoriInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddKategori()}
                style={{ flex: 1 }}
              />
              <button className="bp" onClick={handleAddKategori} style={{ padding: '0 16px', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
                <Plus className="w-4 h-4" /> Tambah Kategori
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmModal
        show={confirmShow}
        title="Konfirmasi Tindakan"
        msg={confirmMsg}
        onConfirm={() => {
          setConfirmShow(false);
          if (confirmAction) confirmAction();
        }}
        onCancel={() => setConfirmShow(false)}
        confirmText="Lanjutkan"
        confirmClass="bp"
        confirmIcon={<CheckCircle className="w-4 h-4" />}
      />

      {/* Alert Modal */}
      <AlertModal
        show={alertShow}
        title="Hasil Tindakan"
        msg={alertMsg}
        onClose={() => setAlertShow(false)}
      />

 
    </div>
  );
};
export default Pengaturan;
