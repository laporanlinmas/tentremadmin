import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Camera,
  Plus,
  Search,
  Trash2,
  Edit,
  Eye,
  Upload,
  RefreshCw,
  Calendar,
  MapPin,
  Tag,
  CheckCircle2,
  AlertCircle,
  X,
  Layers,
  LayoutGrid,
  Table as TableIcon,
  RotateCcw,
  ExternalLink,
  Copy,
  Check,
  Image as ImageIcon,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  FolderOpen
} from 'lucide-react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';
import { useApp } from '../App';
import { apiPost } from '../services/api';
import { Modal } from '../components/common/Modal';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { prepareImage500KB } from '../utils/imageUpload';

// Firebase client init
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const firestoreDb = getFirestore(app);

export interface GaleriItem {
  id: string;
  judul: string;
  kategori: string;
  tanggal: string;
  lokasi: string;
  keterangan: string;
  urlFoto: string;
  createdAt?: any;
  updatedAt?: any;
}

export const KATEGORI_GALERI = [
  'Patroli & Ronda',
  'Pelatihan & Apel',
  'Kerja Bakti',
  'Sosialisasi Warga',
  'Posko Siskamling',
  'Kegiatan Desa',
  'Lainnya'
];

export const GaleriKegiatan: React.FC = () => {
  const { triggerToast, openGallery } = useApp();
  const [items, setItems] = useState<GaleriItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 12;

  // Modal / Form state
  const [showFormModal, setShowFormModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // Form fields
  const [judul, setJudul] = useState('');
  const [kategori, setKategori] = useState('Patroli & Ronda');
  const [tanggal, setTanggal] = useState(() => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  });
  const [lokasi, setLokasi] = useState('Desa Tugurejo');
  const [keterangan, setKeterangan] = useState('');
  const [urlFoto, setUrlFoto] = useState('');

  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Delete modal state
  const [deleteModalShow, setDeleteModalShow] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<GaleriItem | null>(null);

  // Copy indicator state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Real-time Firestore sync
  useEffect(() => {
    try {
      const colRef = collection(firestoreDb, 'galeri_kegiatan');
      const unsub = onSnapshot(
        colRef,
        (snap) => {
          const list: GaleriItem[] = [];
          snap.forEach((docSnap) => {
            const data = docSnap.data();
            list.push({
              id: docSnap.id,
              judul: data.judul || 'Dokumentasi Kegiatan',
              kategori: data.kategori || 'Patroli & Ronda',
              tanggal: data.tanggal || '',
              lokasi: data.lokasi || 'Desa Tugurejo',
              keterangan: data.keterangan || '',
              urlFoto: data.urlFoto || data.foto || '',
              createdAt: data.createdAt,
              updatedAt: data.updatedAt,
            });
          });

          // Sort descending by date
          list.sort((a, b) => {
            const tA = new Date(a.tanggal || 0).getTime();
            const tB = new Date(b.tanggal || 0).getTime();
            return tB - tA;
          });

          setItems(list);
          setLoading(false);
        },
        (err) => {
          console.warn('Firestore galeri_kegiatan sync error:', err);
          triggerToast('Gagal memuat galeri secara real-time.', 'er');
          setLoading(false);
        }
      );

      return () => unsub();
    } catch (e) {
      console.error('Failed to init Firestore for galeri:', e);
      setLoading(false);
    }
  }, [triggerToast]);

  // Open modal for new entry
  const handleOpenAdd = () => {
    setIsEditing(false);
    setEditId(null);
    setJudul('');
    setKategori('Patroli & Ronda');
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    setTanggal(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
    setLokasi('Pos Kamling RT 01/RW 01 Dusun Krajan');
    setKeterangan('');
    setUrlFoto('');
    setPreviewImage(null);
    setShowFormModal(true);
  };

  // Open modal for editing
  const handleOpenEdit = (item: GaleriItem) => {
    setIsEditing(true);
    setEditId(item.id);
    setJudul(item.judul);
    setKategori(item.kategori || 'Patroli & Ronda');
    setTanggal(item.tanggal || '');
    setLokasi(item.lokasi || '');
    setKeterangan(item.keterangan || '');
    setUrlFoto(item.urlFoto);
    setPreviewImage(item.urlFoto);
    setShowFormModal(true);
  };

  // Upload only an optimized image; Firestore stores a Cloudinary URL, never image data.
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    if (file.size > 25 * 1024 * 1024) {
      triggerToast('Ukuran foto awal maksimal 25 MB.', 'er');
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);
    try {
      const prepared = await prepareImage500KB(file);
      setUploadProgress(30);

      // Primary: direct XHR ke Cloudinary
      const cloudName    = (import.meta as any).env?.VITE_CLOUDINARY_CLOUD_NAME;
      const uploadPreset = (import.meta as any).env?.VITE_CLOUDINARY_UPLOAD_PRESET;
      let imageUrl = '';

      if (cloudName && uploadPreset) {
        try {
          imageUrl = await new Promise<string>((resolve, reject) => {
            const fd = new FormData();
            fd.append('file', prepared.file);
            fd.append('upload_preset', uploadPreset);
            fd.append('folder', 'tentrem_tugurejo/galeri');
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
        } catch (directErr) {
          console.warn('Direct Cloudinary upload failed, trying proxy fallback:', directErr);
        }
      }

      // Fallback: via proxy server jika direct gagal
      if (!imageUrl) {
        setUploadProgress(50);
        const base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload  = () => resolve(String(reader.result || ''));
          reader.onerror = () => reject(new Error('Gagal membaca foto.'));
          reader.readAsDataURL(prepared.file);
        });
        const result = await apiPost('uploadCloudinary', { fileData: base64Data, mimeType: prepared.file.type });
        if (!result?.success || !result.url) throw new Error(result?.message || 'Cloudinary menolak unggahan foto.');
        imageUrl = result.url;
      }

      setUrlFoto(imageUrl);
      setPreviewImage(imageUrl);
      setUploadProgress(100);
      triggerToast('Foto berhasil diunggah ke Cloudinary.', 'ok');
    } catch (err: any) {
      setUploadProgress(0);
      triggerToast(err?.message || 'Gagal mengunggah foto ke Cloudinary.', 'er');
    } finally {
      setIsUploading(false);
    }
  };

  // Save (Create or Update)
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!judul.trim()) {
      triggerToast('Judul dokumentasi wajib diisi.', 'er');
      return;
    }
    if (isUploading) {
      triggerToast('Tunggu hingga unggahan foto selesai.', 'inf');
      return;
    }
    if (!urlFoto.trim()) {
      triggerToast('Foto dokumentasi wajib berhasil diunggah ke Cloudinary.', 'er');
      return;
    }

    const finalPhoto = urlFoto;

    try {
      if (isEditing && editId) {
        const docRef = doc(firestoreDb, 'galeri_kegiatan', editId);
        await updateDoc(docRef, {
          judul: judul.trim(),
          kategori,
          tanggal,
          lokasi: lokasi.trim(),
          keterangan: keterangan.trim(),
          urlFoto: finalPhoto,
          updatedAt: serverTimestamp(),
        });
        triggerToast('Dokumentasi foto berhasil diperbarui!', 'ok');
      } else {
        const newId = `galeri_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const docRef = doc(firestoreDb, 'galeri_kegiatan', newId);
        await setDoc(docRef, {
          judul: judul.trim(),
          kategori,
          tanggal,
          lokasi: lokasi.trim(),
          keterangan: keterangan.trim(),
          urlFoto: finalPhoto,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        triggerToast('Foto dokumentasi baru berhasil ditambahkan!', 'ok');
      }
      setShowFormModal(false);
    } catch (err: any) {
      console.error('Save error:', err);
      triggerToast(err.message || 'Gagal menyimpan foto dokumentasi.', 'er');
    }
  };

  // Delete flow
  const handleDeleteClick = (item: GaleriItem) => {
    setItemToDelete(item);
    setDeleteModalShow(true);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      await deleteDoc(doc(firestoreDb, 'galeri_kegiatan', itemToDelete.id));
      triggerToast(`Foto "${itemToDelete.judul}" berhasil dihapus.`, 'ok');
      setDeleteModalShow(false);
      setItemToDelete(null);
    } catch (err: any) {
      triggerToast(err.message || 'Gagal menghapus foto.', 'er');
    }
  };

  // Copy link
  const handleCopyLink = (item: GaleriItem) => {
    if (!item.urlFoto) return;
    navigator.clipboard.writeText(item.urlFoto).then(() => {
      setCopiedId(item.id);
      triggerToast('Tautan foto berhasil disalin ke clipboard!', 'ok');
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  // Filtered items
  const filteredItems = useMemo(() => {
    return items.filter((it) => {
      const matchCategory = !categoryFilter || it.kategori === categoryFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        it.judul.toLowerCase().includes(q) ||
        it.keterangan.toLowerCase().includes(q) ||
        it.lokasi.toLowerCase().includes(q) ||
        it.kategori.toLowerCase().includes(q) ||
        it.tanggal.includes(q);
      return matchCategory && matchSearch;
    });
  }, [items, categoryFilter, searchQuery]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentItems = filteredItems.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Category badge class
  const getBadgeChip = (kat: string) => {
    switch (kat) {
      case 'Patroli & Ronda':
        return 'chip cg';
      case 'Pelatihan & Apel':
        return 'chip cb';
      case 'Kerja Bakti':
        return 'chip ca';
      case 'Sosialisasi Warga':
        return 'chip cp';
      case 'Posko Siskamling':
        return 'chip cb2';
      case 'Kegiatan Desa':
        return 'chip co';
      default:
        return 'chip';
    }
  };

  // Metrics
  const totalPatroli = items.filter((i) => i.kategori === 'Patroli & Ronda').length;
  const totalPelatihan = items.filter((i) => i.kategori === 'Pelatihan & Apel').length;
  const totalKerjaBakti = items.filter((i) => i.kategori === 'Kerja Bakti').length;

  return (
    <div className="fu">
      
      {/* ── TOP METRIC CARDS (ADMIN DASHBOARD STYLE) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {/* Total Foto */}
        <div className="scard cb">
          <div className="sico">
            <Camera className="w-5 h-5" />
          </div>
          <div className="scard-text">
            <div className="snum">{items.length}</div>
            <div className="slbl">Total Foto Terarsip</div>
          </div>
        </div>

        {/* Patroli & Ronda */}
        <div className="scard cg">
          <div className="sico">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="scard-text">
            <div className="snum">{totalPatroli}</div>
            <div className="slbl">Patroli &amp; Ronda</div>
          </div>
        </div>

        {/* Pelatihan & Apel */}
        <div className="scard cp">
          <div className="sico">
            <Layers className="w-5 h-5" />
          </div>
          <div className="scard-text">
            <div className="snum">{totalPelatihan}</div>
            <div className="slbl">Pelatihan &amp; Apel</div>
          </div>
        </div>

        {/* Kerja Bakti & Lainnya */}
        <div className="scard ca">
          <div className="sico">
            <FolderOpen className="w-5 h-5" />
          </div>
          <div className="scard-text">
            <div className="snum">{totalKerjaBakti}</div>
            <div className="slbl">Kerja Bakti &amp; Posko</div>
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT PANEL ── */}
      <div className="panel">
        {/* Header */}
        <div className="phd">
          <div className="flex items-center gap-2">
            <span className="ptl">
              <Camera className="w-4 h-4 text-[var(--blue)] inline-block align-middle" />
              Galeri Dokumentasi Kegiatan Siskamling
            </span>
            <span className="chip cb font-mono">{filteredItems.length} Data</span>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex p-0.5 rounded-lg bg-[var(--bg)] border border-[var(--border)]">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-[var(--card)] text-[var(--blue)] shadow-sm'
                    : 'text-[var(--muted)] hover:text-[var(--text)]'
                }`}
                title="Tampilan Grid Galeri"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-[var(--card)] text-[var(--blue)] shadow-sm'
                    : 'text-[var(--muted)] hover:text-[var(--text)]'
                }`}
                title="Tampilan Tabel Data"
              >
                <TableIcon className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Add Button */}
            <button
              type="button"
              onClick={handleOpenAdd}
              className="bp bxs flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Foto</span>
            </button>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="fbar">
          {/* Search Box */}
          <div className="fsrch" style={{ flex: '2 1 200px' }}>
            <Search className="w-4 h-4 fsi" />
            <input
              className="fctl"
              type="text"
              placeholder="Cari judul kegiatan, lokasi, kategori, tanggal..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          {/* Category Filter + Reset (kept on one row on mobile) */}
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flex: '0 0 auto', flexWrap: 'nowrap' }}>
            <select
              className="fctl"
              style={{ flex: '1 1 140px', minWidth: '140px' }}
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">Semua Kategori</option>
              {KATEGORI_GALERI.map((kat) => (
                <option key={kat} value={kat}>
                  {kat}
                </option>
              ))}
            </select>

            {/* Reset Filter Button */}
            <button
              type="button"
              className="bg2"
              onClick={() => {
                setSearchQuery('');
                setCategoryFilter('');
                setCurrentPage(1);
              }}
              title="Reset Filter"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── BODY CONTENT ── */}
        <div className="pbd" style={{ minHeight: '360px' }}>
          {loading ? (
            <div className="flex items-center justify-center p-12 text-center">
              <RefreshCw className="w-6 h-6 animate-spin text-[var(--blue)] mx-auto mb-2" />
              <p className="text-xs text-[var(--muted)]">Memuat dokumentasi galeri…</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="empty p-12 text-center">
              <Camera className="w-12 h-12 opacity-[0.15] mx-auto mb-3" />
              <h4 className="text-sm font-bold text-[var(--text)]">Belum ada data foto dokumentasi</h4>
              <p className="text-xs text-[var(--muted)] max-w-sm mx-auto mt-1">
                {searchQuery || categoryFilter
                  ? 'Tidak ditemukan foto yang sesuai dengan filter pencarian Anda.'
                  : 'Klik tombol "+ Tambah Foto" di atas untuk menambahkan dokumentasi baru.'}
              </p>
            </div>
          ) : viewMode === 'grid' ? (
            /* ═══════════════════════════════════════════
               GRID MODE: CLEAN PHOTO CARDS
               ═══════════════════════════════════════════ */
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
              {currentItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => openGallery([item.urlFoto], [item.urlFoto], 0)}
                  className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:border-[var(--blue)] transition-all duration-200 flex flex-col justify-between group cursor-pointer"
                  title="Klik untuk melihat foto dokumentasi"
                >
                  {/* Image Frame */}
                  <div className="relative aspect-[16/10] bg-slate-950 overflow-hidden">
                    <img
                      src={item.urlFoto || '/assets/linmas.svg'}
                      alt={item.judul}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/assets/linmas.svg';
                      }}
                    />
                    <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors" />
                  </div>

                  {/* Body Content */}
                  <div className="p-3.5 flex-1 flex flex-col justify-between gap-2.5">
                    <div className="space-y-1.5">
                      {/* Clean Category Label without heavy card wrapper */}
                      <span style={{ fontSize: '.68rem', fontWeight: 800, color: 'var(--blue)', textTransform: 'uppercase', letterSpacing: '.04em' }}>
                        {item.kategori}
                      </span>

                      <h4 className="text-xs font-bold text-[var(--text)] line-clamp-2 leading-snug group-hover:text-[var(--blue)] transition-colors">
                        {item.judul}
                      </h4>

                      {item.keterangan && (
                        <p className="text-[11px] text-[var(--mid)] line-clamp-2 leading-relaxed">
                          {item.keterangan}
                        </p>
                      )}
                    </div>

                    {/* Meta info: Lokasi jika ada */}
                    {item.lokasi && (
                      <div className="pt-1.5 border-t border-[var(--border)] text-[10px] text-[var(--muted)] flex items-center gap-1.5">
                        <MapPin className="w-3 h-3 text-emerald-500 shrink-0" />
                        <span className="truncate font-medium">{item.lokasi}</span>
                      </div>
                    )}
                  </div>

                  {/* Footer Actions — Bersih & Rapi: Tanggal di Kiri, Aksi di Kanan */}
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="px-3.5 py-2.5 bg-[var(--bg)] border-t border-[var(--border)] flex items-center justify-between gap-2 cursor-default"
                  >
                    <div className="flex items-center gap-1.5 text-[10.5px] text-[var(--muted)] font-semibold">
                      <Calendar className="w-3.5 h-3.5 text-[var(--blue)] shrink-0" />
                      <span>{item.tanggal || 'Tanpa Tanggal'}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyLink(item);
                        }}
                        className="p-1.5 rounded-lg text-[var(--mid)] hover:text-[var(--blue)] hover:bg-[var(--card)] transition-colors cursor-pointer"
                        title="Salin Tautan Foto"
                      >
                        {copiedId === item.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEdit(item);
                        }}
                        className="p-1.5 rounded-lg text-[var(--mid)] hover:text-[var(--blue)] hover:bg-[var(--card)] transition-colors cursor-pointer"
                        title="Edit Data Kegiatan"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClick(item);
                        }}
                        className="p-1.5 rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                        title="Hapus Foto Kegiatan"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* ═══════════════════════════════════════════
               TABLE MODE: STRUCTURED DATA TABLE
               ═══════════════════════════════════════════ */
            <div className="twrap">
              <table className="dtbl dtbl-sp">
                <thead>
                  <tr>
                    <th style={{ width: '40px', textAlign: 'center' }}>No</th>
                    <th style={{ width: '70px', textAlign: 'center' }}>Foto</th>
                    <th style={{ minWidth: '180px' }}>Judul Kegiatan</th>
                    <th style={{ width: '130px' }}>Kategori</th>
                    <th style={{ width: '110px' }}>Tanggal</th>
                    <th style={{ width: '160px' }}>Lokasi</th>
                    <th style={{ minWidth: '180px' }}>Keterangan</th>
                    <th style={{ width: '90px', textAlign: 'center' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {currentItems.map((item, idx) => {
                    const itemNumber = startIndex + idx + 1;
                    return (
                      <tr key={item.id}>
                        <td style={{ textAlign: 'center', fontFamily: 'monospace', fontSize: '.7rem' }}>
                          {itemNumber}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div
                            onClick={() => openGallery([item.urlFoto], [item.urlFoto], 0)}
                            className="w-10 h-8 rounded-lg overflow-hidden border border-[var(--border)] bg-slate-900 mx-auto cursor-pointer group"
                            title="Klik untuk melihat foto"
                          >
                            <img
                              src={item.urlFoto || '/assets/linmas.svg'}
                              alt=""
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                            />
                          </div>
                        </td>
                        <td>
                          <strong className="text-[var(--text)] text-xs block">{item.judul}</strong>
                        </td>
                        <td>
                          <span className={getBadgeChip(item.kategori)}>{item.kategori}</span>
                        </td>
                        <td style={{ fontSize: '.72rem', whiteSpace: 'nowrap' }}>
                          {item.tanggal}
                        </td>
                        <td style={{ fontSize: '.72rem' }}>
                          {item.lokasi || '-'}
                        </td>
                        <td style={{ fontSize: '.72rem', color: 'var(--mid)' }}>
                          <span className="line-clamp-2">{item.keterangan || '-'}</span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(item)}
                              className="p-1 rounded text-[var(--mid)] hover:text-[var(--blue)] hover:bg-[var(--card)] transition-colors cursor-pointer"
                              title="Edit Data"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteClick(item)}
                              className="p-1 rounded text-[var(--red)] hover:bg-[var(--redl)] transition-colors cursor-pointer"
                              title="Hapus Foto"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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

          {/* ── PAGINATION CONTROLS ── */}
          {totalPages > 1 && (
            <div className="pagn flex items-center justify-between mt-4 pt-3 border-t border-[var(--border)]">
              <span className="text-[11px] text-[var(--muted)]">
                Menampilkan {startIndex + 1} - {Math.min(startIndex + ITEMS_PER_PAGE, filteredItems.length)} dari {filteredItems.length} foto
              </span>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="pbn"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>

                {Array.from({ length: totalPages }).map((_, pIdx) => {
                  const pNum = pIdx + 1;
                  return (
                    <button
                      key={pNum}
                      type="button"
                      className={`pbn ${pNum === currentPage ? 'on' : ''}`}
                      onClick={() => setCurrentPage(pNum)}
                    >
                      {pNum}
                    </button>
                  );
                })}

                <button
                  type="button"
                  className="pbn"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── MODAL FORM (TAMBAH / EDIT DOKUMENTASI) ── */}
      <Modal
        show={showFormModal}
        onClose={() => setShowFormModal(false)}
        title={
          <span className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-[var(--blue)]" />
            {isEditing ? 'Edit Dokumentasi Foto' : 'Tambah Foto Dokumentasi Kegiatan'}
          </span>
        }
        size="lg"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <button
              type="button"
              className="bg2"
              onClick={() => setShowFormModal(false)}
            >
              Batal
            </button>
            <button
              type="submit"
              form="galeri-form"
              className="bp flex items-center gap-1.5"
              disabled={isUploading}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{isEditing ? 'Simpan Perubahan' : 'Terbitkan Foto'}</span>
            </button>
          </div>
        }
      >
        <form id="galeri-form" onSubmit={handleSave} className="space-y-3.5 text-xs">
          {/* Judul */}
          <div className="fg">
            <label className="flbl">
              Judul Kegiatan / Foto Dokumentasi <span className="freq">*</span>
            </label>
            <input
              type="text"
              className="fctl"
              placeholder="Contoh: Patroli Ronda Malam Regu Krajan RT 01"
              value={judul}
              onChange={(e) => setJudul(e.target.value)}
              required
            />
          </div>

          {/* Kategori & Tanggal */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="fg">
              <label className="flbl">
                Kategori Kegiatan <span className="freq">*</span>
              </label>
              <select
                className="fctl"
                value={kategori}
                onChange={(e) => setKategori(e.target.value)}
              >
                {KATEGORI_GALERI.map((kat) => (
                  <option key={kat} value={kat}>
                    {kat}
                  </option>
                ))}
              </select>
            </div>

            <div className="fg">
              <label className="flbl">
                Tanggal Kegiatan <span className="freq">*</span>
              </label>
              <input
                type="date"
                className="fctl"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Lokasi */}
          <div className="fg">
            <label className="flbl">
              Lokasi / Poskamling Pelaksanaan
            </label>
            <input
              type="text"
              className="fctl"
              placeholder="Contoh: Pos Kamling RT 01/RW 01 Dusun Krajan"
              value={lokasi}
              onChange={(e) => setLokasi(e.target.value)}
            />
          </div>

          {/* Keterangan */}
          <div className="fg">
            <label className="flbl">
              Keterangan / Catatan Kegiatan
            </label>
            <textarea
              className="fctl"
              rows={2}
              placeholder="Tuliskan ringkasan kegiatan atau anggota yang bertugas..."
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
            />
          </div>

          {/* File Upload Box */}
          <div className="fg">
            <label className="flbl">
              Unggah Foto Dokumentasi <span className="freq">*</span>
            </label>

            <input
              type="file"
              ref={fileInputRef}
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />

            {previewImage ? (
              <div
                className="relative rounded-xl overflow-hidden border border-[var(--border)] aspect-[16/9] bg-slate-950 group"
                style={{ maxHeight: '200px' }}
              >
                <img
                  src={previewImage}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="bp bxs flex items-center gap-1 cursor-pointer"
                  >
                    <Upload className="w-3 h-3" /> Ganti Foto
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewImage(null);
                      setUrlFoto('');
                    }}
                    className="bd bxs flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" /> Hapus
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[var(--border)] hover:border-[var(--blue)] rounded-xl p-5 text-center cursor-pointer hover:bg-[var(--bluelo)] transition-all space-y-1.5"
              >
                <div className="w-10 h-10 rounded-xl bg-[var(--bluelo)] text-[var(--blue)] flex items-center justify-center mx-auto">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-[var(--text)] text-xs">Klik untuk memilih file foto</p>
                  <p className="text-[10px] text-[var(--muted)]">JPG, PNG, atau WebP • otomatis dioptimalkan maksimal 500 KB</p>
                </div>
              </div>
            )}

            {isUploading && (
              <div className="mt-2 space-y-1">
                <div className="flex justify-between text-[10px] font-bold text-[var(--blue)]">
                  <span>Mengunggah ke Cloudinary server…</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="h-1.5 bg-[var(--border)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[var(--blue)] transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Direct URL input fallback */}
          <div className="fg">
            <label className="flbl" style={{ fontSize: '.68rem', color: 'var(--muted)' }}>
              Atau tempel URL gambar eksternal:
            </label>
            <input
              type="url"
              className="fctl"
              style={{ fontSize: '.72rem', padding: '6px 10px' }}
              placeholder="https://..."
              value={urlFoto}
              onChange={(e) => {
                setUrlFoto(e.target.value);
                if (e.target.value) setPreviewImage(e.target.value);
              }}
            />
          </div>
        </form>
      </Modal>

      {/* ── CONFIRM DELETE MODAL ── */}
      <ConfirmModal
        show={deleteModalShow}
        title="Hapus Dokumentasi Foto"
        msg={`Yakin ingin menghapus foto "${itemToDelete?.judul}"? Tindakan ini akan menghapus foto dari database dan website secara permanen.`}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setDeleteModalShow(false);
          setItemToDelete(null);
        }}
        confirmText="Hapus Foto"
        confirmClass="bd"
        confirmIcon={<Trash2 className="w-4 h-4" />}
      />

    </div>
  );
};

export default GaleriKegiatan;
