import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Inventaris } from '../types';
import { useApp } from '../App';
import { apiGet, apiPost } from '../services/api';
import { esc } from '../utils/helpers';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { CustomSelect } from '../components/common/CustomSelect';
import { prepareImage500KB } from '../utils/imageUpload';

import {
  Package, Plus, Search, RotateCcw, Edit2, Trash2,
  FolderOpen, Save, X, ExternalLink, CheckCircle,
  AlertTriangle, AlertCircle, XCircle, Image, Upload,
  Link as LinkIcon, Calendar,
} from 'lucide-react';

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot } from 'firebase/firestore';

const firebaseConfig = {
  apiKey:            process.env.FIREBASE_API_KEY            || (import.meta as any).env?.VITE_FIREBASE_API_KEY,
  authDomain:        process.env.FIREBASE_AUTH_DOMAIN        || (import.meta as any).env?.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.FIREBASE_PROJECT_ID         || (import.meta as any).env?.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.FIREBASE_STORAGE_BUCKET     || (import.meta as any).env?.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID|| (import.meta as any).env?.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.FIREBASE_APP_ID             || (import.meta as any).env?.VITE_FIREBASE_APP_ID,
};
const fbApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(fbApp);

// ── Helpers Tanggal ───────────────────────────────────────────────────────────
const getTodayStr = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

function formatTanggalIndo(dStr?: string): string {
  if (!dStr) return '—';
  try {
    const clean = dStr.includes('T') ? dStr.split('T')[0] : dStr;
    const parts = clean.split('-');
    if (parts.length === 3) {
      const year = parts[0];
      const monthIdx = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      if (monthIdx >= 0 && monthIdx < 12 && !isNaN(day)) {
        return `${day} ${months[monthIdx]} ${year}`;
      }
    }
    const d = new Date(dStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    }
  } catch {}
  return dStr || '—';
}

// ── Konstanta pilihan ──────────────────────────────────────────────────────────
const JENIS_OPTIONS   = ['Elektronik', 'Peralatan', 'Perlengkapan', 'Kendaraan', 'Senjata Keamanan', 'Lainnya'];
const SATUAN_OPTIONS  = ['Unit', 'Buah', 'Set', 'Pasang', 'Lembar', 'Meter', 'Kg', 'Liter', 'Rol'];
const KONDISI_OPTIONS = ['Baik', 'Rusak Ringan', 'Rusak Berat', 'Tidak Layak'];

const KONDISI_CONFIG: Record<string, { color: string; bg: string; icon: React.ReactNode }> = {
  'Baik':          { color: 'var(--green,#16a34a)', bg: 'rgba(22,163,74,.12)',  icon: <CheckCircle  className="w-3 h-3" /> },
  'Rusak Ringan':  { color: 'var(--amber,#d97706)', bg: 'rgba(217,119,6,.12)', icon: <AlertTriangle className="w-3 h-3" /> },
  'Rusak Berat':   { color: 'var(--red,#dc2626)',   bg: 'rgba(220,38,38,.12)', icon: <AlertCircle  className="w-3 h-3" /> },
  'Tidak Layak':   { color: '#6b7280',               bg: 'rgba(107,114,128,.1)',icon: <XCircle      className="w-3 h-3" /> },
};

const EMPTY_FORM = (): Omit<Inventaris, 'id'> => ({
  namaAset:     '',
  jenis:        'Peralatan',
  jumlah:       1,
  satuan:       'Unit',
  kondisi:      'Baik',
  keterangan:   '',
  foto:         '',
  tanggalMasuk: getTodayStr(),
  ts:           '',
});

// ── Komponen form modal ────────────────────────────────────────────────────────
interface FormModalProps {
  editing: Inventaris | null;
  onClose: () => void;
  onSaved: () => void;
  showLoad: (msg: string) => void;
  hideLoad: () => void;
  triggerToast: (msg: string, t: 'ok' | 'er' | 'inf') => void;
}

const FormModal: React.FC<FormModalProps> = ({ editing, onClose, onSaved, showLoad, hideLoad, triggerToast }) => {
  const [form, setForm] = useState<Omit<Inventaris, 'id'>>(() => {
    if (editing) {
      return {
        ...editing,
        tanggalMasuk: editing.tanggalMasuk || (editing.ts ? editing.ts.split('T')[0] : getTodayStr()),
      };
    }
    return EMPTY_FORM();
  });
  const [isUploading,    setIsUploading]    = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [urlMode,        setUrlMode]        = useState<'upload' | 'link'>(
    editing?.foto ? 'link' : 'upload'
  );
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const set = (k: keyof typeof form, v: any) => setForm(p => ({ ...p, [k]: v }));

  // ── Upload foto ke Cloudinary ──────────────────────────────────────────────
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    if (file.size > 25 * 1024 * 1024) {
      triggerToast('Ukuran foto maksimal 25 MB.', 'er');
      return;
    }
    setIsUploading(true);
    setUploadProgress(10);
    try {
      const prepared = await prepareImage500KB(file);
      setUploadProgress(30);

      const cloudName    = (import.meta as any).env?.VITE_CLOUDINARY_CLOUD_NAME;
      const uploadPreset = (import.meta as any).env?.VITE_CLOUDINARY_UPLOAD_PRESET;
      let imageUrl = '';

      // Primary: direct XHR
      if (cloudName && uploadPreset) {
        try {
          imageUrl = await new Promise<string>((resolve, reject) => {
            const fd = new FormData();
            fd.append('file', prepared.file);
            fd.append('upload_preset', uploadPreset);
            fd.append('folder', 'tentrem_tugurejo/inventaris');
            const xhr = new XMLHttpRequest();
            xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`);
            xhr.timeout = 90_000;
            xhr.upload.onprogress = (ev) => {
              if (ev.lengthComputable) setUploadProgress(30 + Math.min(65, Math.round((ev.loaded / ev.total) * 65)));
            };
            xhr.onerror   = () => reject(new Error('Koneksi ke Cloudinary gagal.'));
            xhr.ontimeout = () => reject(new Error('Upload timeout.'));
            xhr.onload    = () => {
              try {
                const d = JSON.parse(xhr.responseText || '{}');
                if (xhr.status >= 200 && xhr.status < 300 && d.secure_url) resolve(d.secure_url);
                else reject(new Error(d.error?.message || 'Cloudinary menolak foto.'));
              } catch { reject(new Error('Respons Cloudinary tidak valid.')); }
            };
            xhr.send(fd);
          });
        } catch (err) {
          console.warn('Direct upload failed, trying proxy:', err);
        }
      }

      // Fallback: via proxy
      if (!imageUrl) {
        setUploadProgress(50);
        const base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload  = () => resolve(String(reader.result || ''));
          reader.onerror = () => reject(new Error('Gagal membaca foto.'));
          reader.readAsDataURL(prepared.file);
        });
        const result = await apiPost('uploadCloudinary', { fileData: base64Data, mimeType: prepared.file.type });
        if (!result?.success || !result.url) throw new Error(result?.message || 'Upload gagal.');
        imageUrl = result.url;
      }

      set('foto', imageUrl);
      setUploadProgress(100);
      triggerToast('Foto berhasil diunggah ke Cloudinary.', 'ok');
    } catch (err: any) {
      setUploadProgress(0);
      triggerToast(err?.message || 'Gagal mengunggah foto.', 'er');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.namaAset.trim()) { triggerToast('Nama aset wajib diisi.', 'er'); return; }
    if (!form.jumlah || form.jumlah < 1) { triggerToast('Jumlah harus minimal 1.', 'er'); return; }
    if (isUploading) { triggerToast('Tunggu hingga upload foto selesai.', 'inf'); return; }

    showLoad(editing ? 'Memperbarui inventaris...' : 'Menyimpan inventaris...');
    try {
      const action  = editing ? 'updateInventaris' : 'addInventaris';
      const payload = editing ? { id: editing.id, ...form } : { ...form };
      const res = await apiPost(action, payload);
      hideLoad();
      if (res.success) {
        triggerToast(editing ? 'Inventaris diperbarui.' : 'Inventaris ditambahkan.', 'ok');
        onSaved();
      } else {
        triggerToast('Gagal: ' + (res.message || ''), 'er');
      }
    } catch (e: any) {
      hideLoad();
      triggerToast('Error: ' + e.message, 'er');
    }
  };

  const fctlCls = 'fctl w-full';
  const labelCls = 'block text-xs font-bold mb-1' as const;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1200,
      background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div style={{
        background: 'var(--card)', borderRadius: 16, padding: '22px 24px',
        maxWidth: 480, width: '100%', boxShadow: 'var(--shl)',
        border: '1px solid var(--border)', maxHeight: '90vh', overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--bluelo)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Package className="w-4 h-4 text-[var(--blue)]" />
            </div>
            <div>
              <div style={{ fontSize: '.82rem', fontWeight: 800, color: 'var(--text)' }}>
                {editing ? 'Edit Aset Inventaris' : 'Tambah Aset Inventaris'}
              </div>
              <div style={{ fontSize: '.64rem', color: 'var(--muted)' }}>Inventaris Poskamling Desa Tugurejo</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 4 }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Nama Aset */}
          <div>
            <label className={labelCls} style={{ color: 'var(--text)' }}>
              Nama Aset <span style={{ color: 'var(--red)' }}>*</span>
            </label>
            <input className={fctlCls} value={form.namaAset} onChange={e => set('namaAset', e.target.value)}
              placeholder="Contoh: Kentongan Bambu, Senter LED, HT Motorola..." autoFocus />
          </div>

          {/* Jenis + Kondisi */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className={labelCls} style={{ color: 'var(--text)' }}>Jenis Aset</label>
              <CustomSelect
                value={form.jenis}
                onChange={(value) => set('jenis', value)}
                ariaLabel="Pilih jenis aset"
                options={JENIS_OPTIONS.map((value) => ({ label: value, value }))}
              />
            </div>
            <div>
              <label className={labelCls} style={{ color: 'var(--text)' }}>Kondisi</label>
              <CustomSelect
                value={form.kondisi}
                onChange={(value) => set('kondisi', value)}
                ariaLabel="Pilih kondisi aset"
                options={KONDISI_OPTIONS.map((value) => ({ label: value, value }))}
              />
            </div>
          </div>

          {/* Jumlah + Satuan */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className={labelCls} style={{ color: 'var(--text)' }}>
                Jumlah <span style={{ color: 'var(--red)' }}>*</span>
              </label>
              <input className={fctlCls} type="number" min={1} value={form.jumlah}
                onChange={e => set('jumlah', parseInt(e.target.value) || 1)} />
            </div>
            <div>
              <label className={labelCls} style={{ color: 'var(--text)' }}>Satuan</label>
              <CustomSelect
                value={form.satuan}
                onChange={(value) => set('satuan', value)}
                ariaLabel="Pilih satuan aset"
                options={SATUAN_OPTIONS.map((value) => ({ label: value, value }))}
              />
            </div>
          </div>

          {/* Tanggal Ditambahkan */}
          <div>
            <label className={labelCls} style={{ color: 'var(--text)' }}>
              Tanggal Ditambahkan <span style={{ color: 'var(--red)' }}>*</span>
            </label>
            <input
              type="date"
              className={fctlCls}
              value={form.tanggalMasuk || getTodayStr()}
              onChange={e => set('tanggalMasuk', e.target.value)}
            />
          </div>

          {/* Foto — dual mode: upload atau link */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
              <label className={labelCls} style={{ color: 'var(--text)', margin: 0 }}>
                Foto <span style={{ fontSize: '.6rem', color: 'var(--muted)', fontWeight: 600 }}>(opsional)</span>
              </label>
              {/* Toggle upload / link */}
              <div style={{ display: 'flex', gap: 4 }}>
                {(['upload', 'link'] as const).map(m => (
                  <button key={m} type="button" onClick={() => setUrlMode(m)}
                    style={{
                      fontSize: '.6rem', fontWeight: 800, padding: '2px 8px', borderRadius: 6, cursor: 'pointer',
                      background: urlMode === m ? 'var(--blue)' : 'var(--bg)',
                      color: urlMode === m ? '#fff' : 'var(--muted)',
                      border: `1px solid ${urlMode === m ? 'var(--blue)' : 'var(--border)'}`,
                    }}>
                    {m === 'upload' ? <><Upload className="w-2.5 h-2.5 inline mr-1" />Upload</> : <><LinkIcon className="w-2.5 h-2.5 inline mr-1" />URL Link</>}
                  </button>
                ))}
              </div>
            </div>

            {/* Hidden file input */}
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp"
              onChange={handleFileSelect} style={{ display: 'none' }} />

            {urlMode === 'upload' ? (
              <>
                {form.foto ? (
                  /* Preview foto */
                  <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)', maxHeight: 160 }}>
                    <img src={form.foto} alt="Preview" style={{ width: '100%', height: 160, objectFit: 'cover', display: 'block' }}
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.5)', opacity: 0, transition: 'opacity .15s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                      onMouseOver={e => (e.currentTarget.style.opacity = '1')}
                      onMouseOut={e => (e.currentTarget.style.opacity = '0')}>
                      <button type="button" className="bp bxs" onClick={() => fileInputRef.current?.click()}
                        style={{ fontSize: '.65rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Upload className="w-3 h-3" /> Ganti
                      </button>
                      <button type="button" className="bd bxs" onClick={() => set('foto', '')}
                        style={{ fontSize: '.65rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <X className="w-3 h-3" /> Hapus
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Upload drop zone */
                  <div onClick={() => !isUploading && fileInputRef.current?.click()}
                    style={{
                      border: '2px dashed var(--border)', borderRadius: 10, padding: '18px 12px',
                      textAlign: 'center', cursor: isUploading ? 'not-allowed' : 'pointer',
                      transition: 'all .14s', background: 'var(--bg)',
                    }}
                    onMouseOver={e => !isUploading && ((e.currentTarget as HTMLDivElement).style.borderColor = 'var(--blue)', (e.currentTarget as HTMLDivElement).style.background = 'var(--bluelo)')}
                    onMouseOut={e => ((e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)', (e.currentTarget as HTMLDivElement).style.background = 'var(--bg)')}>
                    <div style={{ width: 36, height: 36, borderRadius: 9, background: 'var(--bluelo)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px' }}>
                      <Upload className="w-4 h-4 text-[var(--blue)]" />
                    </div>
                    <p style={{ fontSize: '.72rem', fontWeight: 700, color: 'var(--text)', margin: 0 }}>
                      {isUploading ? 'Mengunggah...' : 'Klik untuk memilih foto'}
                    </p>
                    <p style={{ fontSize: '.62rem', color: 'var(--muted)', marginTop: 3 }}>
                      JPG, PNG, WebP • otomatis dikompresi ≤ 500 KB
                    </p>
                  </div>
                )}

                {/* Progress bar */}
                {isUploading && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.62rem', fontWeight: 700, color: 'var(--blue)', marginBottom: 4 }}>
                      <span>Mengunggah ke Cloudinary…</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div style={{ height: 4, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: 'var(--blue)', width: `${uploadProgress}%`, transition: 'width .3s' }} />
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* Mode URL Link */
              <div>
                <input className={fctlCls} value={form.foto || ''} onChange={e => set('foto', e.target.value)}
                  placeholder="https://res.cloudinary.com/... atau https://drive.google.com/..." />
                {form.foto && (
                  <a href={form.foto} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 5, fontSize: '.65rem', color: 'var(--blue)', fontWeight: 700, textDecoration: 'none' }}>
                    <ExternalLink className="w-3 h-3" /> Buka foto
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Keterangan */}
          <div>
            <label className={labelCls} style={{ color: 'var(--text)' }}>Keterangan</label>
            <textarea className={fctlCls} rows={3} value={form.keterangan || ''}
              onChange={e => set('keterangan', e.target.value)}
              placeholder="Catatan tambahan, lokasi penyimpanan, tanggal pengadaan, dll..." />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button onClick={handleSubmit} disabled={isUploading} className="bp"
              style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '9px 0', opacity: isUploading ? .6 : 1 }}>
              <Save className="w-4 h-4" /> {editing ? 'Simpan Perubahan' : 'Tambah ke Inventaris'}
            </button>
            <button onClick={onClose} className="bg2" style={{ flex: 1, padding: '9px 0' }}>Batal</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Halaman utama ──────────────────────────────────────────────────────────────
export const InventarisPage: React.FC = () => {
  const { showLoad, hideLoad, triggerToast, openGallery } = useApp();

  const [items,        setItems]        = useState<Inventaris[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState('');
  const [filterJenis,  setFilterJenis]  = useState('');
  const [filterKondisi,setFilterKondisi]= useState('');
  const [showForm,     setShowForm]     = useState(false);
  const [editing,      setEditing]      = useState<Inventaris | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // ── Realtime Firestore sync ────────────────────────────────────────────────
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'inventaris'),
      snap => {
        const list: Inventaris[] = snap.docs.map(d => ({ id: d.id, ...d.data() } as Inventaris));
        list.sort((a, b) => (a.namaAset || '').localeCompare(b.namaAset || ''));
        setItems(list);
        setLoading(false);
      },
      err => {
        console.warn('Firestore inventaris error, fallback:', err);
        fetchFallback();
      }
    );
    return () => unsub();
  }, []);

  const fetchFallback = useCallback(async () => {
    try {
      const res = await apiGet('getInventaris');
      if (res.success && Array.isArray(res.items)) {
        setItems(res.items);
      }
    } catch {}
    setLoading(false);
  }, []);

  // ── Filter ─────────────────────────────────────────────────────────────────
  const filtered = useMemo(() => items.filter(it => {
    const q = search.toLowerCase();
    const matchQ = !q || it.namaAset?.toLowerCase().includes(q) || it.keterangan?.toLowerCase().includes(q);
    const matchJ = !filterJenis   || it.jenis   === filterJenis;
    const matchK = !filterKondisi || it.kondisi  === filterKondisi;
    return matchQ && matchJ && matchK;
  }), [items, search, filterJenis, filterKondisi]);

  // ── Ringkasan statistik ────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total  = items.length;
    const baik   = items.filter(i => i.kondisi === 'Baik').length;
    const rusak  = items.filter(i => i.kondisi === 'Rusak Ringan' || i.kondisi === 'Rusak Berat').length;
    const tLayak = items.filter(i => i.kondisi === 'Tidak Layak').length;
    return { total, baik, rusak, tLayak };
  }, [items]);

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return;
    const id = deleteTarget;
    setDeleteTarget(null);
    showLoad('Menghapus aset...');
    try {
      const res = await apiPost('deleteInventaris', { id });
      hideLoad();
      if (res.success) {
        triggerToast('Aset dihapus.', 'ok');
      } else {
        triggerToast('Gagal: ' + (res.message || ''), 'er');
      }
    } catch (e: any) {
      hideLoad();
      triggerToast('Error: ' + e.message, 'er');
    }
  };

  // ── Util: foto URL ke src img ──────────────────────────────────────────────
  const fotoSrc = (url?: string) => {
    if (!url) return '';
    const driveId = /\/file\/d\/([^/?\s]+)/.exec(url)?.[1] || /[?&]id=([^&\s]+)/.exec(url)?.[1];
    return driveId ? `https://lh3.googleusercontent.com/d/${driveId}` : url;
  };

  if (loading) {
    return (
      <div className="fu" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
        <div style={{ textAlign: 'center', color: 'var(--muted)' }}>
          <Package className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p style={{ fontSize: '.8rem', fontWeight: 700 }}>Memuat inventaris...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fu">

      {/* ── Statistik ringkas ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 10, marginBottom: 14 }}>
        {[
          { label: 'Total Aset',    val: stats.total,  color: 'var(--blue)',  bg: 'var(--bluelo)' },
          { label: 'Kondisi Baik',  val: stats.baik,   color: '#16a34a',      bg: 'rgba(22,163,74,.1)' },
          { label: 'Rusak',         val: stats.rusak,  color: '#d97706',      bg: 'rgba(217,119,6,.1)' },
          { label: 'Tidak Layak',   val: stats.tLayak, color: '#dc2626',      bg: 'rgba(220,38,38,.1)' },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, borderRadius: 10, padding: '10px 14px', border: `1px solid ${s.color}30` }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.val}</div>
            <div style={{ fontSize: '.62rem', color: 'var(--muted)', fontWeight: 700, marginTop: 3 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Filter bar ── */}
      <div className="fbar">
        <div className="fsrch" style={{ flex: '2 1 180px' }}>
          <Search className="w-4 h-4 fsi" />
          <input className="fctl" type="text" placeholder="Cari nama aset..." value={search}
            onChange={e => setSearch(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flex: '1 1 auto', flexWrap: 'nowrap', minWidth: 0 }}>
          <CustomSelect
            value={filterJenis}
            onChange={setFilterJenis}
            ariaLabel="Filter jenis aset"
            className="filter-select"
            options={[
              { value: '', label: 'Semua Jenis' },
              ...JENIS_OPTIONS.map((value) => ({ label: value, value })),
            ]}
          />
          <CustomSelect
            value={filterKondisi}
            onChange={setFilterKondisi}
            ariaLabel="Filter kondisi aset"
            className="filter-select"
            options={[
              { value: '', label: 'Semua Kondisi' },
              ...KONDISI_OPTIONS.map((value) => ({ label: value, value })),
            ]}
          />
          <button className="bg2" onClick={() => { setSearch(''); setFilterJenis(''); setFilterKondisi(''); }}
            title="Reset" style={{ padding: '9px 10px', flexShrink: 0 }}>
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
        <button className="bp" onClick={() => { setEditing(null); setShowForm(true); }}
          style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap', flexShrink: 0 }}>
          <Plus className="w-4 h-4" /> Tambah Aset
        </button>
      </div>

      {/* ── Tabel / Grid aset ── */}
      {filtered.length === 0 ? (
        <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <FolderOpen className="w-12 h-12 opacity-40" />
          <p style={{ fontWeight: 700, color: 'var(--text)' }}>
            {items.length === 0 ? 'Belum ada data inventaris.' : 'Tidak ada aset yang cocok dengan filter.'}
          </p>
          {items.length === 0 && (
            <button className="bp" onClick={() => { setEditing(null); setShowForm(true); }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
              <Plus className="w-4 h-4" /> Tambah Aset Pertama
            </button>
          )}
        </div>
      ) : (
        <div style={{ overflowX: 'auto', marginTop: 4 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.78rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg)', borderBottom: '2px solid var(--border)' }}>
                {['Foto', 'Nama Aset', 'Jenis', 'Jumlah', 'Kondisi', 'Tgl Ditambahkan', 'Keterangan', ''].map(h => (
                  <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontWeight: 800,
                    color: 'var(--muted)', fontSize: '.65rem', textTransform: 'uppercase', letterSpacing: '.04em',
                    whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((item, idx) => {
                const cfg = KONDISI_CONFIG[item.kondisi] || KONDISI_CONFIG['Baik'];
                const src = fotoSrc(item.foto);
                return (
                  <tr key={item.id} style={{
                    borderBottom: '1px solid var(--border)',
                    background: idx % 2 === 0 ? 'transparent' : 'var(--bg)',
                    transition: 'background .1s',
                  }}
                    onMouseOver={e => (e.currentTarget.style.background = 'var(--bluelo)')}
                    onMouseOut={e  => (e.currentTarget.style.background = idx % 2 === 0 ? 'transparent' : 'var(--bg)')}
                  >
                    {/* Foto */}
                    <td style={{ padding: '8px 12px' }}>
                      {src ? (
                        <button
                          type="button"
                          onClick={() => openGallery([item.foto!], [src], 0)}
                          style={{
                            background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                            borderRadius: 8, overflow: 'hidden', display: 'block', position: 'relative',
                          }}
                          title="Lihat Foto Penuh"
                        >
                          <img src={src} alt={item.namaAset}
                            style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)' }}
                            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        </button>
                      ) : (
                        <div style={{ width: 44, height: 44, borderRadius: 8, background: 'var(--border)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Image className="w-4 h-4 text-[var(--muted)] opacity-50" />
                        </div>
                      )}
                    </td>
                    {/* Nama */}
                    <td style={{ padding: '8px 12px', fontWeight: 700, color: 'var(--text)', maxWidth: 200 }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {esc(item.namaAset)}
                      </div>
                    </td>
                    {/* Jenis */}
                    <td style={{ padding: '8px 12px' }}>
                      <span style={{ fontSize: '.68rem', padding: '2px 8px', borderRadius: 6,
                        background: 'var(--border)', color: 'var(--text)', fontWeight: 700 }}>
                        {item.jenis}
                      </span>
                    </td>
                    {/* Jumlah */}
                    <td style={{ padding: '8px 12px', fontWeight: 800, color: 'var(--text)', whiteSpace: 'nowrap' }}>
                      {item.jumlah} <span style={{ fontWeight: 600, color: 'var(--muted)', fontSize: '.7rem' }}>{item.satuan}</span>
                    </td>
                    {/* Kondisi */}
                    <td style={{ padding: '8px 12px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '.68rem',
                        padding: '3px 9px', borderRadius: 20, fontWeight: 800,
                        color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.color}33` }}>
                        {cfg.icon} {item.kondisi}
                      </span>
                    </td>
                    {/* Tanggal Ditambahkan */}
                    <td style={{ padding: '8px 12px', whiteSpace: 'nowrap', color: 'var(--muted)', fontSize: '.72rem' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                        <Calendar className="w-3 h-3 text-[var(--blue)]" />
                        {formatTanggalIndo(item.tanggalMasuk || (item.ts ? item.ts.split('T')[0] : ''))}
                      </span>
                    </td>
                    {/* Keterangan */}
                    <td style={{ padding: '8px 12px', color: 'var(--muted)', fontSize: '.72rem', maxWidth: 220 }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.keterangan || '—'}
                      </div>
                    </td>
                    {/* Actions */}
                    <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', gap: 5 }}>
                        <button onClick={() => { setEditing(item); setShowForm(true); }}
                          className="bg2" style={{ padding: '6px', borderRadius: 7, display: 'flex', alignItems: 'center' }}
                          title="Edit">
                          <Edit2 className="w-3.5 h-3.5 text-[var(--blue)]" />
                        </button>
                        <button onClick={() => setDeleteTarget(item.id)}
                          className="bg2" style={{ padding: '6px', borderRadius: 7, display: 'flex', alignItems: 'center' }}
                          title="Hapus">
                          <Trash2 className="w-3.5 h-3.5 text-[var(--red)]" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Form Modal ── */}
      {showForm && (
        <FormModal
          editing={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={() => { setShowForm(false); setEditing(null); }}
          showLoad={showLoad}
          hideLoad={hideLoad}
          triggerToast={triggerToast}
        />
      )}

      {/* ── Konfirmasi Hapus ── */}
      <ConfirmModal
        show={deleteTarget !== null}
        msg="Hapus aset ini dari inventaris? Data tidak dapat dikembalikan."
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default InventarisPage;
