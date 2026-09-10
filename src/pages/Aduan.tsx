import {
  CheckCircle, MessageSquare, Edit, Clock, Camera, ChevronLeft, ChevronRight,
  AlertTriangle, Inbox, Mail, Search, RotateCcw, Calendar, MapPin, Reply, Image,
  Globe, Bot, Tag, User, Phone, PhoneCall, Plus, Trash2, ExternalLink,
  ShieldCheck, Shield, Save, Eye, LayoutList, LayoutGrid, Video
} from 'lucide-react';
import React, { useState, useEffect } from 'react';

const getAduanMetaIcon = (ico: string, className = "w-3 h-3 inline-block mr-1 align-text-bottom", color?: string) => {
  const style = color ? { color } : undefined;
  switch (ico) {
    case 'fa-calendar':
      return <Calendar className={className} style={style} />;
    case 'fa-globe':
      return <Globe className={className} style={style} />;
    case 'fa-robot':
      return <Bot className={className} style={style} />;
    case 'fa-user':
      return <User className={className} style={style} />;
    case 'fa-tag':
      return <Tag className={className} style={style} />;
    default:
      return null;
  }
};
import { useApp, useAuth } from '../App';
import { useNotifications } from '../hooks/useRealtimeNotifications';
import { apiPost } from '../services/api';
import { esc } from '../utils/helpers';
import { Modal } from '../components/common/Modal';
import { AduanSkeleton } from '../components/SkeletonPages';
import { db } from '../lib/fcm';
import { collection, onSnapshot, doc, updateDoc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';

export interface KontakPiket {
  aktif: boolean;
  judul: string;
  namaPetugas: string;
  noHp: string;
  noWa: string;
  jamOperasional: string;
  keterangan: string;
  pesanWaTemplate: string;
}

export interface KontakItem {
  id: string;
  nama: string;
  jabatan?: string;
  kategori: string;
  noHp: string;
  noWa?: string;
  keterangan?: string;
  prioritas: number;
  aktif: boolean;
}

const WhatsAppIcon = ({ size = 16 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" width={size} height={size} style={{ display: 'inline-block', flexShrink: 0 }}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

const DEFAULT_PIKET: KontakPiket = {
  aktif: true,
  judul: 'Piket Siaga Linmas Desa Tugurejo',
  namaPetugas: 'Regu Piket Linmas Tugurejo',
  noHp: '081234567890',
  noWa: '081234567890',
  jamOperasional: 'Siaga 24 Jam',
  keterangan: 'Posko Siaga Linmas Desa Tugurejo, siap merespons laporan darurat warga',
  pesanWaTemplate: 'Halo Petugas Piket Linmas Desa Tugurejo, saya ingin melaporkan situasi darurat:',
};

const DEFAULT_KONTAK_LIST: KontakItem[] = [
  {
    id: 'kontak_kantor_desa',
    nama: 'Kantor Desa Tugurejo',
    jabatan: '',
    kategori: 'Aparat Desa',
    noHp: '082298110101',
    noWa: '082298110101',
    prioritas: 1,
    aktif: true,
  },
  {
    id: 'kontak_bhabinkamtibmas',
    nama: 'Babinkamtibmas',
    jabatan: '',
    kategori: 'Aparat Desa',
    noHp: '082332805352',
    noWa: '082332805352',
    prioritas: 2,
    aktif: true,
  },
  {
    id: 'kontak_babinsa',
    nama: 'Babinsa',
    jabatan: '',
    kategori: 'Aparat Desa',
    noHp: '081330501888',
    noWa: '081330501888',
    prioritas: 3,
    aktif: true,
  },
  {
    id: 'kontak_damkar',
    nama: 'Pemadam Kebakaran',
    jabatan: '',
    kategori: 'Kontak Darurat',
    noHp: '082160063113',
    noWa: '082160063113',
    prioritas: 4,
    aktif: true,
  },
  {
    id: 'kontak_psc',
    nama: 'Call Center PSC',
    jabatan: '',
    kategori: 'Kontak Darurat',
    noHp: '119',
    noWa: '',
    prioritas: 5,
    aktif: true,
  },
  {
    id: 'kontak_bpbd',
    nama: 'Pusdalops BPBD',
    jabatan: '',
    kategori: 'Kontak Darurat',
    noHp: '081259752500',
    noWa: '081259752500',
    prioritas: 6,
    aktif: true,
  },
  {
    id: 'kontak_ketua_rt',
    nama: 'Ketua RT 01 RW 01',
    jabatan: '',
    kategori: 'Aparat Desa',
    noHp: '082228362232',
    noWa: '082228362232',
    prioritas: 7,
    aktif: true,
  },
];

interface Complaint {
  id: string;
  ticket: string;
  timestamp: string;
  tanggalKejadian?: string;
  tanggalSort?: string; // ISO string untuk sorting akurat
  nama: string;
  kontak?: string;
  kategori: string;
  lokasi: string;
  koordinat?: { lat: number; lng: number } | null;
  mapUrl?: string;
  deskripsi: string;
  fotos?: string[];
  videos?: string[];
  tingkatKeparahan?: string;
  status: string;
  catatan: string;
  updatedAt?: string;
  source?: string;
  fotoTindakLanjut?: string;
}

const isFirebaseConfigured = !!db;

export const Aduan: React.FC = () => {
  const { showLoad, hideLoad, triggerToast, openGallery } = useApp();
  const { isAdmin } = useAuth();
  const { markAllAduanAsRead } = useNotifications();

  useEffect(() => {
    markAllAduanAsRead();
  }, [markAllAduanAsRead]);

  const [allAduan, setAllAduan] = useState<Complaint[]>([]);
  const [filteredAduan, setFilteredAduan] = useState<Complaint[]>([]);
  const [isFetching, setIsFetching] = useState(true);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 15;

  // Modal Tindak Lanjut state
  const [showTtdModal, setShowTtdModal] = useState(false);
  const [targetAduan, setTargetAduan] = useState<Complaint | null>(null);
  const [statusVal, setStatusVal] = useState('Baru');
  const [catatanVal, setCatatanVal] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Detail Aduan modal state
  const [detailAduan, setDetailAduan] = useState<Complaint | null>(null);

  // ── Main Tab Navigation ('laporan' vs 'kontak') ───────────────────────────
  const [activeMainTabAduan, setActiveMainTabAduan] = useState<'laporan' | 'kontak'>('laporan');

  // ── Hubungi Piket & Kontak Darurat state ──────────────────────────────────
  const [piketConfig, setPiketConfig] = useState<KontakPiket>(DEFAULT_PIKET);
  const [isSavingPiket, setIsSavingPiket] = useState(false);
  const [kontakList, setKontakList] = useState<KontakItem[]>(DEFAULT_KONTAK_LIST);
  const [kontakSearch, setKontakSearch] = useState('');
  const [showKontakModal, setShowKontakModal] = useState(false);
  const [kontakModalMode, setKontakModalMode] = useState<'add' | 'edit'>('add');
  const [kontakForm, setKontakForm] = useState<KontakItem>({
    id: '',
    nama: '',
    jabatan: '',
    kategori: 'Kontak Darurat',
    noHp: '',
    noWa: '',
    keterangan: '',
    prioritas: 1,
    aktif: true,
  });
  const [isSavingKontak, setIsSavingKontak] = useState(false);
  const [kontakViewMode, setKontakViewMode] = useState<'table' | 'cards'>('table');

  // Listen to Firestore real-time updates
  useEffect(() => {
    if (!db) {
      setIsFetching(false);
      return;
    }

    setIsFetching(true);
    const colRef = collection(db, 'aduan');
    
    const unsubscribe = onSnapshot(
      colRef,
      (snapshot) => {
        const list: Complaint[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          list.push({
            id: docSnap.id,
            ticket: data.ticket || docSnap.id,
            timestamp: data.timestamp || '',
            tanggalKejadian: data.tanggalKejadian || '',
            tanggalSort: data.tanggalSort || data.timestamp || '',
            nama: data.nama || '',
            kontak: data.kontak || '',
            kategori: data.kategori || '',
            lokasi: data.lokasi || '',
            koordinat: data.koordinat || null,
            mapUrl: data.mapUrl || (data.koordinat ? `https://maps.google.com/?q=${data.koordinat.lat},${data.koordinat.lng}` : ''),
            deskripsi: data.deskripsi || '',
            fotos: data.fotos || [],
            videos: data.videos || [],
            status: data.status || 'Baru',
            catatan: data.catatan || '',
            updatedAt: data.updatedAt || '',
            source: data.source || 'Chatbot',
            fotoTindakLanjut: data.fotoTindakLanjut || '',
            tingkatKeparahan: data.tingkatKeparahan || '',
          });
        });

        // Sort by tanggalSort (ISO) desc — terbaru di atas
        list.sort((a, b) => {
          const ta = a.tanggalSort || '';
          const tb = b.tanggalSort || '';
          if (ta && tb) return tb.localeCompare(ta);
          return tb.localeCompare(ta);
        });

        setAllAduan(list);
        setIsFetching(false);
      },
      (error) => {
        console.error('Error onSnapshot aduan:', error);
        triggerToast('Gagal memuat aduan real-time.', 'er');
        setIsFetching(false);
      }
    );

    // Subscribe to Kontak Darurat & Piket settings
    const unsubKontak = onSnapshot(doc(db, 'settings', 'kontak_darurat'), async (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        if (d.piket) setPiketConfig(prev => ({ ...prev, ...d.piket }));
        if (Array.isArray(d.kontakList)) setKontakList(d.kontakList);
      } else {
        // Auto-migrate from smart_poskamling if available or seed defaults
        try {
          const spSnap = await getDoc(doc(db, 'settings', 'smart_poskamling'));
          let migrated: KontakItem[] = [];
          if (spSnap.exists() && Array.isArray(spSnap.data()?.kontakDarurat)) {
            const legacy = spSnap.data()?.kontakDarurat;
            migrated = legacy.map((k: any, idx: number) => ({
              id: k.id || `migrated_${idx}`,
              nama: k.nama || '',
              jabatan: k.jabatan || '',
              kategori: 'Aparat Desa',
              noHp: k.noHp || '',
              noWa: k.noWa || k.noHp || '',
              keterangan: k.keterangan || '',
              prioritas: k.prioritas || (idx + 1),
              aktif: true,
            }));
          }
          const initialList = migrated.length > 0 ? [...migrated, ...DEFAULT_KONTAK_LIST.slice(2)] : DEFAULT_KONTAK_LIST;
          setKontakList(initialList);
          setPiketConfig(DEFAULT_PIKET);
          await setDoc(doc(db, 'settings', 'kontak_darurat'), {
            piket: DEFAULT_PIKET,
            kontakList: initialList,
            updatedAt: new Date().toISOString(),
          }, { merge: true });
        } catch {
          setKontakList(DEFAULT_KONTAK_LIST);
          setPiketConfig(DEFAULT_PIKET);
        }
      }
    });

    return () => {
      unsubscribe();
      unsubKontak();
    };
  }, [triggerToast]);

  // ── Hubungi Piket & Kontak Darurat Handlers ──────────────────────────────
  const handleSavePiket = async () => {
    if (!piketConfig.namaPetugas.trim() || !piketConfig.noHp.trim()) {
      triggerToast('Nama petugas piket dan nomor telepon wajib diisi.', 'er');
      return;
    }
    if (!db) return;
    setIsSavingPiket(true);
    showLoad('Menyimpan pengaturan piket...');
    try {
      await setDoc(doc(db, 'settings', 'kontak_darurat'), {
        piket: piketConfig,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
      triggerToast('Pengaturan Hubungi Piket berhasil disimpan.', 'ok');
    } catch (err: any) {
      triggerToast('Gagal menyimpan piket: ' + err.message, 'er');
    } finally {
      hideLoad();
      setIsSavingPiket(false);
    }
  };

  const handleOpenAddKontak = () => {
    setKontakModalMode('add');
    setKontakForm({
      id: '',
      nama: '',
      jabatan: '',
      kategori: 'Kontak Darurat',
      noHp: '',
      noWa: '',
      keterangan: '',
      prioritas: kontakList.length + 1,
      aktif: true,
    });
    setShowKontakModal(true);
  };

  const handleOpenEditKontak = (k: KontakItem) => {
    setKontakModalMode('edit');
    setKontakForm({ ...k });
    setShowKontakModal(true);
  };

  const handleResetKontakDefault = async () => {
    if (!confirm('Reset semua kontak darurat ke data default? Data yang ada akan diganti.')) return;
    setKontakList(DEFAULT_KONTAK_LIST);
    if (!db) return;
    try {
      await setDoc(doc(db, 'settings', 'kontak_darurat'), {
        kontakList: DEFAULT_KONTAK_LIST,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
      triggerToast('Kontak darurat berhasil direset ke default.', 'ok');
    } catch (err: any) {
      triggerToast('Gagal reset: ' + err.message, 'er');
    }
  };

  const handleSaveKontak = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!kontakForm.nama.trim() || !kontakForm.noHp.trim()) {
      triggerToast('Nama instansi/kontak dan nomor telepon wajib diisi.', 'er');
      return;
    }
    setIsSavingKontak(true);
    showLoad('Menyimpan kontak darurat...');
    try {
      let updated: KontakItem[];
      if (kontakModalMode === 'edit') {
        updated = kontakList.map(k => k.id === kontakForm.id ? { ...kontakForm } : k);
      } else {
        const newId = `kontak_${Date.now()}`;
        updated = [...kontakList, { ...kontakForm, id: newId }];
      }
      updated.sort((a, b) => (a.prioritas || 99) - (b.prioritas || 99));
      setKontakList(updated);
      if (db) {
        await setDoc(doc(db, 'settings', 'kontak_darurat'), {
          kontakList: updated,
          updatedAt: new Date().toISOString(),
        }, { merge: true });
      }
      triggerToast(kontakModalMode === 'edit' ? 'Kontak darurat berhasil diperbarui.' : 'Kontak darurat baru ditambahkan.', 'ok');
      setShowKontakModal(false);
    } catch (err: any) {
      triggerToast('Gagal menyimpan kontak: ' + err.message, 'er');
    } finally {
      hideLoad();
      setIsSavingKontak(false);
    }
  };

  const handleDeleteKontak = async (id: string) => {
    if (!confirm('Yakin ingin menghapus kontak darurat ini?')) return;
    const updated = kontakList.filter(k => k.id !== id);
    setKontakList(updated);
    if (!db) return;
    try {
      await setDoc(doc(db, 'settings', 'kontak_darurat'), {
        kontakList: updated,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
      triggerToast('Kontak darurat berhasil dihapus.', 'ok');
    } catch (err: any) {
      triggerToast('Gagal menghapus: ' + err.message, 'er');
    }
  };

  const handleToggleAktifKontak = async (id: string) => {
    const updated = kontakList.map(k => k.id === id ? { ...k, aktif: !k.aktif } : k);
    setKontakList(updated);
    if (!db) return;
    try {
      await setDoc(doc(db, 'settings', 'kontak_darurat'), {
        kontakList: updated,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
      triggerToast('Status kontak diubah.', 'ok');
    } catch (err: any) {
      triggerToast('Gagal mengubah status: ' + err.message, 'er');
    }
  };

  // Apply filters
  useEffect(() => {
    let filtered = [...allAduan];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.ticket.toLowerCase().includes(q) ||
          r.nama.toLowerCase().includes(q) ||
          r.kategori.toLowerCase().includes(q) ||
          r.lokasi.toLowerCase().includes(q) ||
          r.deskripsi.toLowerCase().includes(q) ||
          r.catatan.toLowerCase().includes(q)
      );
    }

    if (statusFilter) {
      filtered = filtered.filter((r) => r.status === statusFilter);
    }

    setFilteredAduan(filtered);
    setCurrentPage(1);
  }, [allAduan, searchQuery, statusFilter]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setStatusFilter('');
  };

  // Hapus aduan dari Firestore
  const handleDeleteAduan = async (aduan: Complaint) => {
    if (!db) return;
    if (!confirm(`Yakin ingin menghapus aduan ${aduan.ticket}?\nTindakan ini tidak bisa dibatalkan.`)) return;
    showLoad('Menghapus aduan...');
    try {
      await deleteDoc(doc(db, 'aduan', aduan.id));
      triggerToast(`Aduan ${aduan.ticket} berhasil dihapus.`, 'ok');
    } catch (err: any) {
      triggerToast('Gagal menghapus aduan: ' + err.message, 'er');
    } finally {
      hideLoad();
    }
  };

  // Pagination Calculations
  const totalItems = filteredAduan.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, totalItems);
  const currentItems = filteredAduan.slice(startIndex, endIndex);

  // Status Badge Class mapping
  const getStatusBadgeClass = (status: string) => {
    const s = String(status || '').toLowerCase();
    if (s === 'selesai') return 'chip cg';
    if (s === 'diproses') return 'chip ca';
    return 'chip cb'; // Baru / Default
  };

  // Kontak Darurat - Diurutkan berdasarkan prioritas (Urutan 1, 2, 3...)
  const filteredKontak = kontakList
    .filter(k => {
      const q = kontakSearch.toLowerCase().trim();
      if (!q) return true;
      return (
        (k.nama && k.nama.toLowerCase().includes(q)) ||
        (k.noHp && k.noHp.toLowerCase().includes(q)) ||
        (k.noWa && k.noWa.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => (Number(a.prioritas) || 999) - (Number(b.prioritas) || 999));

  // Open Gallery for complaint photos
  const handleOpenGallery = (photos: string[]) => {
    if (!photos || photos.length === 0) return;
    openGallery(photos, photos, 0);
  };

  // Open Follow-up Modal
  const handleOpenTindakLanjut = (c: Complaint) => {
    setTargetAduan(c);
    setStatusVal(c.status || 'Baru');
    setCatatanVal(c.catatan || '');
    setSelectedFile(null);
    setPreviewUrl(c.fotoTindakLanjut || null);
    setShowTtdModal(true);
  };

  // File selection handling
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Submit follow-up update to Firestore
  const handleSubmitTindakLanjut = async () => {
    if (!db || !targetAduan) return;

    showLoad('Menyimpan tindak lanjut...');
    try {
      let cloudinaryUrl = targetAduan.fotoTindakLanjut || '';

      // Upload file to Cloudinary via backend proxy if new file is selected
      if (selectedFile && previewUrl) {
        // extract base64 data URL
        const base64Data = previewUrl;
        const uploadRes = await apiPost('proxy', {
          action: 'uploadCloudinary',
          fileData: base64Data,
          mimeType: selectedFile.type,
        });

        if (uploadRes.success && uploadRes.url) {
          cloudinaryUrl = uploadRes.url;
        } else {
          throw new Error(uploadRes.message || 'Gagal mengupload gambar ke Cloudinary.');
        }
      }

      // Generate WIB timestamp
      const getTimestampWIB = () => {
        const d = new Date();
        const wibDate = new Date(d.getTime() + (7 * 60 * 60 * 1000) + (d.getTimezoneOffset() * 60 * 1000));
        const pad = (n: number) => String(n).padStart(2, '0');
        const dd = pad(wibDate.getDate());
        const mm = pad(wibDate.getMonth() + 1);
        const yyyy = wibDate.getFullYear();
        const hh = pad(wibDate.getHours());
        const min = pad(wibDate.getMinutes());
        const ss = pad(wibDate.getSeconds());
        return `${dd}-${mm}-${yyyy} ${hh}.${min}.${ss} WIB`;
      };

      const ts = getTimestampWIB();

      // Update Firestore document
      const docRef = doc(db, 'aduan', targetAduan.id);
      await updateDoc(docRef, {
        status: statusVal,
        catatan: catatanVal,
        fotoTindakLanjut: cloudinaryUrl,
        updatedAt: ts,
      });

      triggerToast('Tindak lanjut aduan berhasil diperbarui.', 'ok');
      setShowTtdModal(false);
    } catch (e: any) {
      console.error(e);
      triggerToast('Gagal menyimpan: ' + e.message, 'er');
    } finally {
      hideLoad();
    }
  };

  // Render Pagination Buttons
  const renderPaginationButtons = () => {
    if (totalPages <= 1) return null;
    const btns = [];
    const prevDisabled = currentPage <= 1;
    const nextDisabled = currentPage >= totalPages;

    btns.push(
      <button
        key="prev"
        className="pbn"
        disabled={prevDisabled}
        onClick={() => setCurrentPage(currentPage - 1)}
      >
        <ChevronLeft className="w-4 h-4 inline-block align-middle fa-xs" />
      </button>
    );

    const start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, currentPage + 2);

    for (let p = start; p <= end; p++) {
      btns.push(
        <button
          key={p}
          className={`pbn ${p === currentPage ? 'on' : ''}`}
          onClick={() => setCurrentPage(p)}
        >
          {p}
        </button>
      );
    }

    btns.push(
      <button
        key="next"
        className="pbn"
        disabled={nextDisabled}
        onClick={() => setCurrentPage(currentPage + 1)}
      >
        <ChevronRight className="w-4 h-4 inline-block align-middle fa-xs" />
      </button>
    );

    return btns;
  };

  // Summary Metrics Breakdown
  const totalBaru = allAduan.filter((x) => x.status === 'Baru').length;
  const totalDiproses = allAduan.filter((x) => x.status === 'Diproses').length;
  const totalSelesai = allAduan.filter((x) => x.status === 'Selesai').length;

  if (isFetching && allAduan.length === 0) {
    return <AduanSkeleton />;
  }

  if (!isFirebaseConfigured) {
    return (
      <div className="fu">
        <div className="panel" style={{ padding: '24px', textAlign: 'center' }}>
          <AlertTriangle className="w-12 h-12 mx-auto text-[var(--amber)] mb-4" />
          <h2>Firebase Belum Dikonfigurasi</h2>
          <p style={{ color: 'var(--muted)', marginTop: '8px', maxWidth: '480px', margin: '8px auto 0' }}>
            Silakan lengkapi konfigurasi Firebase pada file <code>.env</code> Anda untuk melihat aduan masyarakat.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fu">
      {/* ── Main Tab Navigation ── */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '10px', flexWrap: 'wrap' }}>
        <button
          type="button"
          className={`bp ${activeMainTabAduan === 'laporan' ? '' : 'bg2'}`}
          onClick={() => setActiveMainTabAduan('laporan')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '7px 14px',
            fontSize: '.74rem',
            fontWeight: 800,
            borderRadius: '9px',
            cursor: 'pointer',
            flex: '1 1 auto',
            justifyContent: 'center',
            minWidth: 0,
          }}
        >
          <MessageSquare className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">Laporan Aduan</span>
          <span style={{ fontSize: '.62rem', padding: '1px 6px', borderRadius: '999px', background: activeMainTabAduan === 'laporan' ? 'rgba(255,255,255,0.25)' : 'var(--border)', color: activeMainTabAduan === 'laporan' ? '#fff' : 'var(--text)', flexShrink: 0 }}>
            {allAduan.length}
          </span>
        </button>
        <button
          type="button"
          className={`bp ${activeMainTabAduan === 'kontak' ? '' : 'bg2'}`}
          onClick={() => setActiveMainTabAduan('kontak')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '7px 14px',
            fontSize: '.74rem',
            fontWeight: 800,
            borderRadius: '9px',
            cursor: 'pointer',
            flex: '1 1 auto',
            justifyContent: 'center',
            minWidth: 0,
          }}
        >
          <Phone className="w-3.5 h-3.5 shrink-0 text-red-500" />
          <span className="truncate">Kontak &amp; Piket</span>
          <span style={{ fontSize: '.62rem', padding: '1px 6px', borderRadius: '999px', background: activeMainTabAduan === 'kontak' ? 'rgba(255,255,255,0.25)' : 'var(--border)', color: activeMainTabAduan === 'kontak' ? '#fff' : 'var(--text)', flexShrink: 0 }}>
            {kontakList.length}
          </span>
        </button>
      </div>

      {activeMainTabAduan === 'laporan' ? (
        <>
          {/* Summary Metrics Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3" style={{ marginBottom: '1rem' }}>
        {/* Total Laporan Masuk */}
        <div className="scard cb">
          <div className="sico"><Inbox className="w-5 h-5" /></div>
          <div className="scard-text"><div className="snum">{allAduan.length}</div><div className="slbl">Total Laporan Masuk</div></div>
        </div>
        {/* Laporan Baru */}
        <div className="scard ca">
          <div className="sico"><Mail className="w-5 h-5" /></div>
          <div className="scard-text"><div className="snum">{totalBaru}</div><div className="slbl">Laporan Baru</div></div>
        </div>
        {/* Sedang Diproses */}
        <div className="scard cp">
          <div className="sico"><Clock className="w-4 h-4 inline-block align-middle" /></div>
          <div className="scard-text"><div className="snum">{totalDiproses}</div><div className="slbl">Sedang Diproses</div></div>
        </div>
        {/* Selesai Ditindaklanjuti */}
        <div className="scard cg">
          <div className="sico"><CheckCircle className="w-4 h-4 inline-block align-middle" /></div>
          <div className="scard-text"><div className="snum">{totalSelesai}</div><div className="slbl">Selesai Ditindaklanjuti</div></div>
        </div>
      </div>

      <div className="panel">
        <div className="phd">
          <span className="ptl">
            <MessageSquare className="w-4 h-4 inline-block align-middle" /> Aduan Masyarakat
          </span>
          <span style={{ fontSize: '.64rem', color: 'var(--muted)' }}>
            Real-time update dari website publik
          </span>
        </div>

        {/* Filter bar */}
        <div className="fbar">
          <div className="fsrch" style={{ flex: '2 1 180px' }}>
            <Search className="w-4 h-4 fsi" />
            <input
              className="fctl"
              type="text"
              placeholder="Cari nomor tiket, nama pelapor, lokasi, deskripsi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flex: '0 0 auto' }}>
            <select
              className="fctl"
              style={{ minWidth: '130px', flex: '1 1 130px' }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">Semua Status</option>
              <option value="Baru">Baru</option>
              <option value="Diproses">Diproses</option>
              <option value="Selesai">Selesai</option>
            </select>
            <button className="bg2" onClick={handleResetFilters} title="Reset Filter" style={{ flexShrink: 0, padding: '8px 10px' }}>
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Table View (Desktop) */}
        <div className="rtbl-wrap hidden md:block">
          <table className="dtbl dtbl-sp">
            <thead>
              <tr>
                <th style={{ width: '40px' }}>No</th>
                <th style={{ width: '120px' }}>No Tiket</th>
                <th style={{ width: '130px' }}>Tanggal</th>
                <th style={{ width: '120px' }}>Pelapor</th>
                <th style={{ width: '100px' }}>Kategori</th>
                <th style={{ width: '130px' }}>Lokasi</th>
                <th style={{ width: '90px', textAlign: 'center' }}>Status</th>
                <th style={{ width: '70px', textAlign: 'center' }}>Detail</th>
                <th style={{ width: '90px', textAlign: 'center' }}>Media</th>
                <th style={{ width: '120px', textAlign: 'center' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {currentItems.length === 0 ? (
                <tr>
                  <td colSpan={10}>
                    <div className="empty">
                      <Inbox className="w-8 h-8 opacity-[0.14] mx-auto mb-2 block" />
                      <p>Tidak ada data aduan.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                currentItems.map((r, i) => {
                  const itemIndex = startIndex + i + 1;
                  const hasPhotos = r.fotos && r.fotos.length > 0;
                  return (
                    <tr key={r.id}>
                      <td className="txt-mono" style={{ textAlign: 'center' }}>{itemIndex}</td>
                      <td className="txt-mono font-bold" style={{ color: 'var(--blue)' }}>{r.ticket}</td>
                      <td style={{ fontSize: '.72rem', whiteSpace: 'nowrap' }}>{r.timestamp}</td>
                      <td><strong>{esc(r.nama)}</strong></td>
                      <td><span className="chip cb2">{esc(r.kategori)}</span>{r.tingkatKeparahan && r.tingkatKeparahan !== 'ringan' && (
                        <span className={`chip ml-1 ${r.tingkatKeparahan === 'kritis' ? 'cr' : r.tingkatKeparahan === 'tinggi' ? 'co' : 'ca'}`} style={{ fontSize: '.58rem' }}>
                          {r.tingkatKeparahan}
                        </span>
                      )}</td>
                      <td style={{ fontSize: '.74rem' }}>{esc(r.lokasi)}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={getStatusBadgeClass(r.status)}>{r.status}</span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button className="bp" style={{ padding: '4px 8px', fontSize: '.68rem' }} onClick={() => setDetailAduan(r)} title="Lihat Detail">
                          Detail
                        </button>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', gap: '4px', alignItems: 'center', justifyContent: 'center' }}>
                          {hasPhotos ? (
                            <button
                              type="button"
                              className="iact iact-blue"
                              onClick={() => handleOpenGallery(r.fotos!)}
                              title={`Lihat ${r.fotos!.length} Foto`}
                            >
                              <Image className="w-4 h-4 inline-block align-middle" />
                              {r.fotos!.length > 1 && <span style={{ fontSize: '.6rem', marginLeft: '2px' }}>{r.fotos!.length}</span>}
                            </button>
                          ) : null}
                          {r.videos && r.videos.length > 0 ? (
                            <button
                              type="button"
                              className="iact"
                              style={{ background: 'rgba(139,92,246,.12)', color: '#7c3aed', border: '1px solid rgba(139,92,246,.3)' }}
                              onClick={() => setDetailAduan(r)}
                              title="Lihat Video"
                            >
                              <Video className="w-4 h-4 inline-block align-middle" />
                            </button>
                          ) : null}
                          {!hasPhotos && !(r.videos && r.videos.length > 0) && (
                            <span style={{ color: 'var(--muted)', fontSize: '.7rem' }}>—</span>
                          )}
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', gap: '4px', alignItems: 'center', justifyContent: 'center' }}>
                          {isAdmin && (
                            <button
                              className="peta-btn peta-btn-primary"
                              style={{ padding: '5px 8px', fontSize: '.68rem' }}
                              onClick={() => handleOpenTindakLanjut(r)}
                              title="Respon / Tindak Lanjut"
                            >
                              <Edit className="w-3.5 h-3.5 inline-block align-middle" /> Respon
                            </button>
                          )}
                          {isAdmin && (
                            <button
                              className="iact iact-red"
                              style={{ padding: '5px 6px' }}
                              onClick={() => handleDeleteAduan(r)}
                              title="Hapus Aduan"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile List View */}
        <div className="mcard-list md:hidden">
          {currentItems.length === 0 ? (
            <div className="empty">
              <Inbox className="w-8 h-8 opacity-[0.14] mx-auto mb-2 block" />
              <p>Tidak ada data aduan.</p>
            </div>
          ) : (
            currentItems.map((r) => {
              const hasPhotos = r.fotos && r.fotos.length > 0;
              return (
                <div key={r.id} className="mcard-item" style={{ padding: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span className="txt-mono font-bold" style={{ color: 'var(--blue)', fontSize: '.76rem' }}>{r.ticket}</span>
                    <span className={getStatusBadgeClass(r.status)}>{r.status}</span>
                  </div>
                  <div style={{ fontSize: '.7rem', color: 'var(--muted)', marginBottom: '8px' }}>
                    <Calendar className="w-3.5 h-3.5 inline-block mr-1 align-text-bottom" /> {r.timestamp}
                  </div>
                  <div style={{ marginBottom: '10px' }}>
                    <div style={{ fontSize: '.78rem', color: 'var(--text)' }}>
                      <strong>{esc(r.nama)}</strong> <span className="chip cb2" style={{ fontSize: '.6rem', padding: '2px 6px' }}>{esc(r.kategori)}</span>
                    </div>
                    <div style={{ fontSize: '.72rem', color: 'var(--mid)', marginTop: '4px' }}>
                      <MapPin className="w-3.5 h-3.5 inline-block mr-1 align-text-bottom" /> {esc(r.lokasi)}
                    </div>
                    <div className="txt-clamp" style={{ fontSize: '.72rem', color: 'var(--text)', marginTop: '6px' }}>
                      {esc(r.deskripsi)}
                    </div>

                    {r.catatan && (
                      <div style={{ marginTop: '8px', padding: '6px 10px', background: 'var(--bg)', borderRadius: '6px', fontSize: '.74rem', borderLeft: '3px solid var(--blue)' }}>
                        <strong>TL:</strong> {esc(r.catatan)}
                        {r.fotoTindakLanjut && (
                          <div style={{ marginTop: '6px' }}>
                            <img
                              src={r.fotoTindakLanjut}
                              alt="Foto Tindak Lanjut"
                              onClick={() => handleOpenGallery([r.fotoTindakLanjut!])}
                              style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '4px', cursor: 'zoom-in', border: '1px solid var(--border)' }}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      {hasPhotos ? (
                        <img
                          src={r.fotos![0]}
                          alt="Bukti"
                          onClick={() => handleOpenGallery(r.fotos!)}
                          style={{ width: '36px', height: '36px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--border)', cursor: 'zoom-in' }}
                        />
                      ) : (
                        <span style={{ color: 'var(--muted)', fontSize: '.7rem' }}>—</span>
                      )}
                      {r.videos && r.videos.length > 0 && (
                        <button
                          type="button"
                          className="iact"
                          style={{ background: 'rgba(139,92,246,.12)', color: '#7c3aed', border: '1px solid rgba(139,92,246,.3)', padding: '6px 7px', borderRadius: '6px' }}
                          onClick={() => setDetailAduan(r)}
                          title="Lihat Video"
                        >
                          <Video className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button className="bp" style={{ padding: '4px 8px', fontSize: '.68rem' }} onClick={() => setDetailAduan(r)}>
                        Detail
                      </button>
                    </div>
                    {isAdmin && (
                      <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                        <button
                          className="peta-btn peta-btn-primary"
                          style={{ padding: '6px 10px', fontSize: '.7rem' }}
                          onClick={() => handleOpenTindakLanjut(r)}
                        >
                          <Edit className="w-3.5 h-3.5 inline-block align-middle" /> Respon
                        </button>
                        <button
                          className="iact iact-red"
                          style={{ padding: '6px 7px' }}
                          onClick={() => handleDeleteAduan(r)}
                          title="Hapus Aduan"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination Info */}
        <div className="pgw" style={{ padding: '14px' }}>
          <span>
            {totalItems === 0
              ? 'Tidak ada data'
              : `Menampilkan ${startIndex + 1}–${endIndex} dari ${totalItems} aduan`}
          </span>
          <div className="pbs">{renderPaginationButtons()}</div>
        </div>
      </div>
        </>
      ) : (
        <div className="space-y-6">
          {/* ── BAGIAN 1: KONFIGURASI HUBUNGI PIKET ── */}
          <div className="panel" style={{ padding: 'clamp(14px, 3vw, 24px)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px', marginBottom: '16px', paddingBottom: '14px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', flexShrink: 0 }}>
                  <PhoneCall className="w-4 h-4" />
                </div>
                <div>
                  <h3 style={{ fontSize: 'clamp(.84rem, 2.5vw, 1.05rem)', fontWeight: 800, margin: 0, color: 'var(--text)' }}>
                    Hotline &amp; Tombol &quot;Hubungi Piket&quot;
                  </h3>
                  <p style={{ fontSize: '.7rem', color: 'var(--mid)', margin: '2px 0 0' }}>
                    Konfigurasi tombol darurat di halaman Aduan website publik
                  </p>
                </div>
              </div>

              {/* Status Aktif Toggle */}
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '.78rem', fontWeight: 600, color: 'var(--text)', background: 'var(--bg)', padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <input
                  type="checkbox"
                  checked={piketConfig.aktif}
                  onChange={(e) => setPiketConfig({ ...piketConfig, aktif: e.target.checked })}
                  style={{ width: '16px', height: '16px', accentColor: 'var(--purple)', cursor: 'pointer' }}
                />
                <span>Tampil di Website</span>
                <span className={`chip ${piketConfig.aktif ? 'cg' : 'bg2'}`} style={{ fontSize: '.65rem', padding: '2px 7px' }}>
                  {piketConfig.aktif ? '● Aktif' : '○ Off'}
                </span>
              </label>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
              {/* Form Input - Kolom-kolom Bergaris Jelas, Rapi, & Luas */}
              <div className="lg:col-span-8 space-y-4">
                {/* Grup 1: Identitas & Petugas Jaga */}
                <div style={{
                  background: 'var(--card)',
                  border: '1.5px solid rgba(148, 163, 184, 0.35)',
                  borderRadius: '12px',
                  padding: 'clamp(12px, 3vw, 18px) clamp(14px, 3.5vw, 20px)',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                }}>
                  <div style={{ fontSize: '.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--blue)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Shield className="w-4 h-4" /> Informasi Banner &amp; Petugas Jaga
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="fgrp" style={{ margin: 0 }}>
                      <label className="flbl" style={{ fontWeight: 700, fontSize: '.72rem' }}>
                        Judul Banner / Tombol Siaga <span style={{ color: 'var(--red)' }}>*</span>
                      </label>
                      <input
                        type="text"
                        className="fin"
                        placeholder="Contoh: Posko Siaga Linmas 24 Jam"
                        value={piketConfig.judul}
                        onChange={(e) => setPiketConfig({ ...piketConfig, judul: e.target.value })}
                      />
                    </div>
                    <div className="fgrp" style={{ margin: 0 }}>
                      <label className="flbl" style={{ fontWeight: 700, fontSize: '.72rem' }}>
                        Nama Petugas / Regu Jaga <span style={{ color: 'var(--red)' }}>*</span>
                      </label>
                      <input
                        type="text"
                        className="fin"
                        placeholder="Contoh: Regu Piket Pos Linmas"
                        value={piketConfig.namaPetugas}
                        onChange={(e) => setPiketConfig({ ...piketConfig, namaPetugas: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Grup 2: Nomor Kontak Darurat & WhatsApp */}
                <div style={{
                  background: 'var(--card)',
                  border: '1.5px solid rgba(148, 163, 184, 0.35)',
                  borderRadius: '12px',
                  padding: 'clamp(12px, 3vw, 18px) clamp(14px, 3.5vw, 20px)',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                }}>
                  <div style={{ fontSize: '.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.06em', color: '#ef4444', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <PhoneCall className="w-4 h-4" /> Kontak Telepon &amp; WhatsApp Resmi
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="fgrp" style={{ margin: 0 }}>
                      <label className="flbl" style={{ fontWeight: 700, fontSize: '.72rem' }}>
                        Nomor Telepon Panggilan Darurat <span style={{ color: 'var(--red)' }}>*</span>
                      </label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type="tel"
                          className="fin"
                          placeholder="Contoh: 081234567890"
                          value={piketConfig.noHp}
                          onChange={(e) => setPiketConfig({ ...piketConfig, noHp: e.target.value })}
                          style={{ paddingRight: '36px' }}
                        />
                        <Phone className="w-4 h-4" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--mid)', pointerEvents: 'none' }} />
                      </div>
                      <span style={{ fontSize: '.7rem', color: 'var(--mid)', marginTop: '4px', display: 'block' }}>Tautan panggilan darurat telepon langsung (tel:...)</span>
                    </div>

                    <div className="fgrp" style={{ margin: 0 }}>
                      <label className="flbl" style={{ fontWeight: 700, fontSize: '.72rem' }}>
                        Nomor WhatsApp Siaga
                      </label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type="tel"
                          className="fin"
                          placeholder="Contoh: 6281234567890"
                          value={piketConfig.noWa}
                          onChange={(e) => setPiketConfig({ ...piketConfig, noWa: e.target.value })}
                          style={{ paddingRight: '36px' }}
                        />
                        <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#22c55e', pointerEvents: 'none' }}>
                          <WhatsAppIcon size={16} />
                        </div>
                      </div>
                      <span style={{ fontSize: '.7rem', color: 'var(--mid)', marginTop: '4px', display: 'block' }}>Gunakan awalan 628... untuk chat WhatsApp</span>
                    </div>
                  </div>
                </div>

                {/* Grup 3: Jam Layanan & Keterangan */}
                <div style={{
                  background: 'var(--card)',
                  border: '1.5px solid rgba(148, 163, 184, 0.35)',
                  borderRadius: '12px',
                  padding: 'clamp(12px, 3vw, 18px) clamp(14px, 3.5vw, 20px)',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                }}>
                  <div style={{ fontSize: '.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.06em', color: '#8b5cf6', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Clock className="w-4 h-4" /> Waktu Layanan &amp; Keterangan Singkat
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="fgrp" style={{ margin: 0 }}>
                      <label className="flbl" style={{ fontWeight: 700, fontSize: '.72rem' }}>Jam Operasional / Kesiapsiagaan</label>
                      <input
                        type="text"
                        className="fin"
                        placeholder="Contoh: 24 Jam Nonstop / 19.00 - 06.00 WIB"
                        value={piketConfig.jamOperasional}
                        onChange={(e) => setPiketConfig({ ...piketConfig, jamOperasional: e.target.value })}
                      />
                    </div>
                    <div className="fgrp" style={{ margin: 0 }}>
                      <label className="flbl" style={{ fontWeight: 700, fontSize: '.72rem' }}>Keterangan Singkat Layanan</label>
                      <input
                        type="text"
                        className="fin"
                        placeholder="Contoh: Siaga kamtibmas, tanggap darurat warga"
                        value={piketConfig.keterangan}
                        onChange={(e) => setPiketConfig({ ...piketConfig, keterangan: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Grup 4: Template Pesan WhatsApp Otomatis */}
                <div style={{
                  background: 'var(--card)',
                  border: '1.5px solid rgba(148, 163, 184, 0.35)',
                  borderRadius: '12px',
                  padding: 'clamp(12px, 3vw, 18px) clamp(14px, 3.5vw, 20px)',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ fontSize: '.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.06em', color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <WhatsAppIcon size={16} /> Template Pesan WhatsApp Otomatis
                    </div>
                    <span style={{ fontSize: '.72rem', color: 'var(--mid)', fontWeight: 700, background: 'var(--bg2)', padding: '2px 8px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                      {piketConfig.pesanWaTemplate?.length || 0} karakter
                    </span>
                  </div>
                  <textarea
                    rows={5}
                    className="fin"
                    placeholder="Tulis format pesan WhatsApp yang otomatis muncul saat warga menekan tombol WhatsApp Piket..."
                    value={piketConfig.pesanWaTemplate}
                    onChange={(e) => setPiketConfig({ ...piketConfig, pesanWaTemplate: e.target.value })}
                    style={{
                      minHeight: '120px',
                      lineHeight: '1.6',
                      resize: 'vertical',
                      fontFamily: 'inherit'
                    }}
                  />
                  <span style={{ fontSize: '.72rem', color: 'var(--mid)', marginTop: '6px', display: 'block', lineHeight: 1.4 }}>
                    💡 Pesan ini akan otomatis terisi di aplikasi WhatsApp warga ketika menekan tombol &quot;Hubungi WhatsApp&quot; pada website publik.
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-start', paddingTop: '6px' }}>
                  <button
                    type="button"
                    className="bp"
                    onClick={handleSavePiket}
                    disabled={isSavingPiket}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '11px 26px', borderRadius: '10px', fontWeight: 800, fontSize: '.86rem', boxShadow: '0 2px 6px rgba(37,99,235,0.2)' }}
                  >
                    <Save className="w-4 h-4" />
                    <span>{isSavingPiket ? 'Menyimpan...' : 'Simpan Pengaturan Piket'}</span>
                  </button>
                </div>
              </div>

              {/* Live Preview Box */}
              <div className="lg:col-span-4 col-span-1">
                <div style={{ background: 'var(--bg2, #f8fafc)', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <span style={{ fontSize: '.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--mid)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Eye className="w-3.5 h-3.5 text-blue-500" /> Pratinjau Tampilan Website
                    </span>
                    <span className={`chip ${piketConfig.aktif ? 'cg' : 'bg2'}`} style={{ fontSize: '.65rem' }}>
                      {piketConfig.aktif ? 'Tampil' : 'Tersembunyi'}
                    </span>
                  </div>

                  {/* Mock Card Preview */}
                  <div style={{
                    background: 'linear-gradient(135deg, #b91c1c 0%, #991b1b 50%, #7f1d1d 100%)',
                    borderRadius: '12px',
                    padding: '18px',
                    color: '#fff',
                    boxShadow: '0 8px 20px -4px rgba(185, 28, 28, 0.4)',
                    position: 'relative',
                    overflow: 'hidden'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.2)', padding: '3px 10px', borderRadius: '999px', fontSize: '.68rem', fontWeight: 800 }}>
                        <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#4ade80', display: 'inline-block' }} />
                        HOTLINE SIAGA DARURAT
                      </span>
                      <span style={{ fontSize: '.68rem', opacity: 0.85, background: 'rgba(0,0,0,0.2)', padding: '2px 8px', borderRadius: '6px' }}>
                        {piketConfig.jamOperasional || '24 Jam'}
                      </span>
                    </div>

                    <h4 style={{ margin: '0 0 4px', fontSize: 'clamp(.88rem, 2.5vw, 1.05rem)', fontWeight: 900, color: '#fff' }}>
                      {piketConfig.judul || 'Posko Siaga Linmas'}
                    </h4>
                    <p style={{ margin: '0 0 14px', fontSize: 'clamp(.68rem, 2vw, .74rem)', color: 'rgba(255,255,255,0.85)', lineHeight: 1.4 }}>
                      {piketConfig.keterangan || 'Petugas piket siaga menerima panggilan warga untuk situasi darurat.'}
                    </p>

                    <div style={{ background: 'rgba(0,0,0,0.18)', borderRadius: '8px', padding: '8px 12px', marginBottom: '14px', fontSize: 'clamp(.65rem, 1.8vw, .72rem)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'rgba(255,255,255,0.8)' }}>Petugas Jaga:</span>
                      <span style={{ fontWeight: 700, color: '#fff' }}>{piketConfig.namaPetugas || 'Petugas Linmas'}</span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <a
                        href={piketConfig.noHp ? `tel:${piketConfig.noHp}` : '#'}
                        onClick={(e) => { if (!piketConfig.noHp) e.preventDefault(); }}
                        style={{
                          background: '#fff',
                          color: '#b91c1c',
                          padding: '8px 10px',
                          borderRadius: '8px',
                          textAlign: 'center',
                          fontSize: 'clamp(.68rem, 2vw, .75rem)',
                          fontWeight: 800,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          textDecoration: 'none'
                        }}
                      >
                        <PhoneCall className="w-3.5 h-3.5" /> Panggil
                      </a>
                      <a
                        href={piketConfig.noWa ? `https://wa.me/${piketConfig.noWa.replace(/\D/g, '')}?text=${encodeURIComponent(piketConfig.pesanWaTemplate || 'Halo Petugas')}` : '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => { if (!piketConfig.noWa) e.preventDefault(); }}
                        style={{
                          background: '#22c55e',
                          color: '#fff',
                          padding: '8px 10px',
                          borderRadius: '8px',
                          textAlign: 'center',
                          fontSize: 'clamp(.68rem, 2vw, .75rem)',
                          fontWeight: 800,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          textDecoration: 'none'
                        }}
                      >
                        <WhatsAppIcon size={14} /> WhatsApp
                      </a>
                    </div>
                  </div>

                  <p style={{ fontSize: '.68rem', color: 'var(--mid)', margin: '12px 0 0', textAlign: 'center' }}>
                    Preview langsung dari komponen yang akan dilihat warga di website Aduan.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ── BAGIAN 2: DIREKTORI KONTAK DARURAT ── */}
          <div className="panel" style={{ padding: 'clamp(14px, 3vw, 24px)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px', marginBottom: '16px' }}>
              <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                <h3 style={{ fontSize: 'clamp(.84rem, 2.5vw, 1.05rem)', fontWeight: 800, margin: 0, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '7px' }}>
                  <ShieldCheck className="w-4 h-4 text-blue-500 shrink-0" /> Direktori Kontak Darurat Instansi
                </h3>
                <p style={{ fontSize: '.7rem', color: 'var(--mid)', margin: '3px 0 0' }}>
                  Daftar nomor kontak darurat berurutan sesuai prioritas di website warga
                </p>
              </div>

              <button
                type="button"
                className="bp"
                onClick={handleOpenAddKontak}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '7px 14px', borderRadius: '8px', fontWeight: 700, fontSize: '.76rem', flexShrink: 0 }}
              >
                <Plus className="w-3.5 h-3.5" /> Tambah Kontak
              </button>
              <button
                type="button"
                onClick={handleResetKontakDefault}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '7px 14px', borderRadius: '8px', fontWeight: 700, fontSize: '.76rem', flexShrink: 0, background: 'rgba(239,68,68,.1)', color: '#dc2626', border: '1px solid rgba(239,68,68,.25)' }}
                title="Reset ke data default"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset Default
              </button>
            </div>

            {/* Search + View Switcher — mobile responsive */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', marginBottom: '16px' }}>
              {/* Search */}
              <div style={{ position: 'relative', flex: '1 1 180px', minWidth: 0 }}>
                <input
                  type="text"
                  className="fin"
                  placeholder="Cari nama instansi, nomor..."
                  value={kontakSearch}
                  onChange={(e) => setKontakSearch(e.target.value)}
                  style={{ paddingLeft: '32px', height: '38px', fontSize: '.78rem', width: '100%' }}
                />
                <Search className="w-3.5 h-3.5" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--mid)', pointerEvents: 'none' }} />
              </div>

              {/* View Switcher */}
              <div style={{ display: 'inline-flex', alignItems: 'center', background: 'var(--card)', padding: '3px', borderRadius: '8px', border: '1.5px solid rgba(148,163,184,.35)', flexShrink: 0 }}>
                <button
                  type="button"
                  onClick={() => setKontakViewMode('table')}
                  style={{ padding: '4px 10px', fontSize: '.7rem', fontWeight: 700, borderRadius: '5px', border: 'none', background: kontakViewMode === 'table' ? 'var(--blue)' : 'transparent', color: kontakViewMode === 'table' ? '#fff' : 'var(--text)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', transition: 'all .15s' }}
                >
                  <LayoutList className="w-3 h-3" /> Tabel
                </button>
                <button
                  type="button"
                  onClick={() => setKontakViewMode('cards')}
                  style={{ padding: '4px 10px', fontSize: '.7rem', fontWeight: 700, borderRadius: '5px', border: 'none', background: kontakViewMode === 'cards' ? 'var(--blue)' : 'transparent', color: kontakViewMode === 'cards' ? '#fff' : 'var(--text)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', transition: 'all .15s' }}
                >
                  <LayoutGrid className="w-3 h-3" /> Kartu
                </button>
              </div>
            </div>

            {/* Content: Tabel Kolom atau Kartu Grid */}
            {filteredKontak.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 'clamp(24px, 5vw, 48px) 16px', background: 'var(--card)', borderRadius: '12px', border: '1.5px dashed rgba(148, 163, 184, 0.4)' }}>
                <Phone className="w-8 h-8 text-gray-400" style={{ margin: '0 auto 10px', opacity: 0.5 }} />
                <h4 style={{ margin: '0 0 4px', fontSize: '.9rem', fontWeight: 700, color: 'var(--text)' }}>
                  Tidak ada kontak ditemukan
                </h4>
                <p style={{ margin: '0 0 14px', fontSize: '.75rem', color: 'var(--mid)' }}>
                  {kontakSearch ? 'Coba ubah kata kunci pencarian.' : 'Belum ada kontak darurat yang terdaftar.'}
                </p>
                <button
                  type="button"
                  className="bp"
                  onClick={handleOpenAddKontak}
                  style={{ fontSize: '.78rem', padding: '7px 16px', borderRadius: '8px' }}
                >
                  <Plus className="w-3.5 h-3.5 mr-1 inline" /> Tambah Kontak Pertama
                </button>
              </div>
            ) : kontakViewMode === 'table' ? (
              /* ── TABEL KONTAK DENGAN SCROLL HORIZONTAL DI MOBILE ── */
              <div style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch', border: '1.5px solid rgba(148, 163, 184, 0.4)', borderRadius: '10px' }}>
                <table className="dtbl-bordered w-full">
                  <thead>
                    <tr>
                      <th style={{ width: '55px', textAlign: 'center' }}>Urutan</th>
                      <th style={{ textAlign: 'left' }}>Nama Instansi / Kontak</th>
                      <th style={{ width: '145px', textAlign: 'left' }}>Nomor Telepon</th>
                      <th style={{ width: '145px', textAlign: 'left' }}>Nomor WhatsApp</th>
                      <th style={{ width: '105px', textAlign: 'center' }}>Status</th>
                      <th style={{ width: '75px', textAlign: 'center' }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredKontak.map((k) => (
                      <tr key={k.id} style={{ opacity: k.aktif ? 1 : 0.65 }}>
                        <td style={{ textAlign: 'center' }}>
                          <span className="chip cb" style={{ fontSize: '.68rem', padding: '2px 7px', fontWeight: 800 }}>
                            #{k.prioritas || 1}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 700, fontSize: '.8rem', color: 'var(--text)', lineHeight: 1.35 }}>
                            {k.nama}
                          </div>
                        </td>
                        <td>
                          {k.noHp ? (
                            <a
                              href={`tel:${k.noHp}`}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '3px 8px',
                                background: 'rgba(239, 68, 68, 0.08)',
                                color: '#ef4444',
                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                borderRadius: '6px',
                                fontSize: '.72rem',
                                fontWeight: 600,
                                textDecoration: 'none',
                                whiteSpace: 'nowrap'
                              }}
                              title={`Panggil ${k.noHp}`}
                            >
                              <Phone className="w-3 h-3 shrink-0" />
                              <span>{k.noHp}</span>
                            </a>
                          ) : (
                            <span style={{ color: 'var(--mid)', fontSize: '.72rem' }}>—</span>
                          )}
                        </td>
                        <td>
                          {k.noWa ? (
                            <a
                              href={`https://wa.me/${k.noWa.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '3px 8px',
                                background: 'rgba(34, 197, 94, 0.08)',
                                color: '#16a34a',
                                border: '1px solid rgba(34, 197, 94, 0.2)',
                                borderRadius: '6px',
                                fontSize: '.72rem',
                                fontWeight: 600,
                                textDecoration: 'none',
                                whiteSpace: 'nowrap'
                              }}
                              title={`WhatsApp ${k.noWa}`}
                            >
                              <WhatsAppIcon size={12} />
                              <span>{k.noWa}</span>
                            </a>
                          ) : (
                            <span style={{ color: 'var(--mid)', fontSize: '.72rem' }}>—</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleToggleAktifKontak(k.id)}
                            title={k.aktif ? 'Klik untuk sembunyikan' : 'Klik untuk tampilkan'}
                            className={`chip ${k.aktif ? 'cg' : 'bg2'}`}
                            style={{ fontSize: '.65rem', cursor: 'pointer', border: 'none', padding: '3px 8px', fontWeight: 700, whiteSpace: 'nowrap' }}
                          >
                            {k.aktif ? '● Tampil' : '○ Sembunyi'}
                          </button>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', gap: '5px', alignItems: 'center', justifyContent: 'center' }}>
                            <button
                              type="button"
                              className="iact iact-info"
                              onClick={() => handleOpenEditKontak(k)}
                              title="Edit Kontak"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              className="iact iact-red"
                              onClick={() => handleDeleteKontak(k.id)}
                              title="Hapus Kontak"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              /* ── KARTU GRID: 1 kolom mobile, 2 kolom tablet+ ── */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredKontak.map((k) => {
                  return (
                    <div
                      key={k.id}
                      style={{
                        background: 'var(--card)',
                        border: '1.5px solid rgba(148, 163, 184, 0.4)',
                        borderRadius: '10px',
                        padding: '14px 16px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                        opacity: k.aktif ? 1 : 0.65,
                        transition: 'opacity 0.2s'
                      }}
                    >
                      <div>
                        {/* Header: Urutan Prioritas & Status Toggle */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                          <span className="chip cb" style={{ fontSize: '.68rem', padding: '2px 8px', fontWeight: 800 }}>
                            <Shield className="w-3 h-3 text-blue-500 mr-1 inline" /> #{k.prioritas || 1}
                          </span>

                          <button
                            type="button"
                            onClick={() => handleToggleAktifKontak(k.id)}
                            title={k.aktif ? 'Klik untuk nonaktifkan' : 'Klik untuk aktifkan'}
                            className={`chip ${k.aktif ? 'cg' : 'bg2'}`}
                            style={{ fontSize: '.65rem', cursor: 'pointer', border: 'none', padding: '3px 8px' }}
                          >
                            {k.aktif ? '● Tampil' : '○ Sembunyi'}
                          </button>
                        </div>

                        {/* Nama Instansi / Kontak */}
                        <h4 style={{ margin: '0 0 10px', fontSize: '.88rem', fontWeight: 800, color: 'var(--text)', lineHeight: 1.35 }}>
                          {k.nama}
                        </h4>

                        {/* Phone & WA buttons */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', margin: '4px 0' }}>
                          {k.noHp && (
                            <a
                              href={`tel:${k.noHp}`}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '3px 9px',
                                background: 'rgba(239, 68, 68, 0.08)',
                                color: '#ef4444',
                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                borderRadius: '6px',
                                fontSize: '.72rem',
                                fontWeight: 600,
                                textDecoration: 'none'
                              }}
                            >
                              <Phone className="w-3 h-3" /> {k.noHp}
                            </a>
                          )}
                          {k.noWa && (
                            <a
                              href={`https://wa.me/${k.noWa.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '3px 9px',
                                background: 'rgba(34, 197, 94, 0.08)',
                                color: '#16a34a',
                                border: '1px solid rgba(34, 197, 94, 0.2)',
                                borderRadius: '6px',
                                fontSize: '.72rem',
                                fontWeight: 600,
                                textDecoration: 'none'
                              }}
                            >
                              <WhatsAppIcon size={12} /> {k.noWa}
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Footer Actions */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--border)' }}>
                        <span style={{ fontSize: '.68rem', color: 'var(--mid)', fontWeight: 600 }}>
                          Prioritas #{k.prioritas || 1}
                        </span>

                        <div style={{ display: 'flex', gap: '5px' }}>
                          <button
                            type="button"
                            className="iact iact-info"
                            onClick={() => handleOpenEditKontak(k)}
                            title="Edit Kontak"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            className="iact iact-red"
                            onClick={() => handleDeleteKontak(k.id)}
                            title="Hapus Kontak"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Tambah/Edit Kontak Darurat */}
      {showKontakModal && (
        <Modal
          show={showKontakModal}
          onClose={() => setShowKontakModal(false)}
          title={
            <span style={{ display: 'flex', alignItems: 'center', gap: '7px', color: 'var(--purple)' }}>
              <PhoneCall className="w-4 h-4 inline-block align-middle" />
              {kontakModalMode === 'add' ? 'Tambah Kontak Darurat Baru' : 'Edit Kontak Darurat'}
            </span>
          }
          style={{ maxWidth: '540px', width: '94vw' }}
          footer={
            <>
              <button
                type="button"
                className="bp"
                onClick={handleSaveKontak}
                disabled={isSavingKontak}
                style={{ padding: '7px 16px', fontSize: '.78rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Save className="w-4 h-4" /> {isSavingKontak ? 'Menyimpan...' : 'Simpan Kontak'}
              </button>
              <button type="button" className="bg2" onClick={() => setShowKontakModal(false)}>Batal</button>
            </>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="fgrp sm:col-span-2">
                <label className="flbl">Nama Instansi / Kontak <span style={{ color: 'var(--red)' }}>*</span></label>
                <input
                  type="text"
                  className="fin"
                  placeholder="Contoh: Polsek Slahung / Damkar Ponorogo / Puskesmas"
                  value={kontakForm.nama}
                  onChange={(e) => setKontakForm({ ...kontakForm, nama: e.target.value })}
                />
              </div>
              <div className="fgrp">
                <label className="flbl">Urutan Prioritas <span style={{ color: 'var(--red)' }}>*</span></label>
                <input
                  type="number"
                  min={1}
                  className="fin"
                  placeholder="1, 2, 3..."
                  value={kontakForm.prioritas || 1}
                  onChange={(e) => setKontakForm({ ...kontakForm, prioritas: parseInt(e.target.value) || 1 })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="fgrp">
                <label className="flbl">Nomor Telepon Panggilan <span style={{ color: 'var(--red)' }}>*</span></label>
                <input
                  type="tel"
                  className="fin"
                  placeholder="Contoh: 0352-791110 / 110"
                  value={kontakForm.noHp}
                  onChange={(e) => setKontakForm({ ...kontakForm, noHp: e.target.value })}
                />
              </div>
              <div className="fgrp">
                <label className="flbl">Nomor WhatsApp (Opsional)</label>
                <input
                  type="tel"
                  className="fin"
                  placeholder="Contoh: 6281234567890"
                  value={kontakForm.noWa || ''}
                  onChange={(e) => setKontakForm({ ...kontakForm, noWa: e.target.value })}
                />
              </div>
            </div>

            <div style={{ paddingTop: '6px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '.8rem', color: 'var(--text)' }}>
                <input
                  type="checkbox"
                  checked={kontakForm.aktif}
                  onChange={(e) => setKontakForm({ ...kontakForm, aktif: e.target.checked })}
                  style={{ width: '16px', height: '16px', accentColor: 'var(--purple)', cursor: 'pointer' }}
                />
                <span>Aktifkan kontak ini (tampilkan di website warga)</span>
              </label>
            </div>
          </div>
        </Modal>
      )}

      {/* Detail Aduan Modal */}
      {detailAduan && (
        <Modal
          show={!!detailAduan}
          onClose={() => setDetailAduan(null)}
          title={
            <span style={{ display: 'flex', alignItems: 'center', gap: '7px', color: 'var(--purple)' }}>
              <MessageSquare className="w-4 h-4 inline-block align-middle" /> Detail Aduan
            </span>
          }
          style={{ maxWidth: '580px', width: '94vw' }}
          footer={
            <>
              {isAdmin && (
                <button
                  className="peta-btn peta-btn-primary"
                  style={{ padding: '6px 12px', fontSize: '.72rem' }}
                  onClick={() => {
                    const temp = detailAduan;
                    setDetailAduan(null);
                    handleOpenTindakLanjut(temp);
                  }}
                >
                  <Edit className="w-4 h-4 inline-block align-middle" /> Respon
                </button>
              )}
              <button className="bg2" onClick={() => setDetailAduan(null)}>Tutup</button>
            </>
          }
        >
          <div style={{ maxHeight: '60vh', overflowY: 'auto', margin: '-16px -18px', padding: '16px 18px' }}>
            {/* Header info */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', paddingBottom: '12px', borderBottom: '1px solid var(--border)' }}>
              <span className="txt-mono font-bold" style={{ color: 'var(--blue)', fontSize: '.82rem' }}>{detailAduan.ticket}</span>
              <span className={getStatusBadgeClass(detailAduan.status)}>{detailAduan.status}</span>
            </div>
            {/* Info Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0', border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden', marginBottom: '14px' }}>
              {[
                { label: 'Waktu Lapor', value: detailAduan.timestamp, icon: 'fa-clock', color: 'var(--blue)' },
                { label: 'Tgl Kejadian', value: detailAduan.tanggalKejadian || detailAduan.timestamp?.split(' ')[0] || '-', icon: 'fa-calendar', color: 'var(--amber)' },
                { label: 'Pelapor', value: detailAduan.nama + (detailAduan.kontak ? ` (${detailAduan.kontak})` : ''), icon: 'fa-user', color: 'var(--teal)' },
                { label: 'Kategori', value: detailAduan.kategori, icon: 'fa-tag', color: 'var(--purple)' },
              ].map((item, idx) => (
                <div key={idx} style={{ padding: '10px 12px', background: 'var(--card)', borderBottom: idx < 2 ? '1px solid var(--border)' : 'none', borderRight: idx % 2 === 0 ? '1px solid var(--border)' : 'none' }}>
                  <div style={{ fontSize: '.6rem', color: 'var(--muted)', marginBottom: '2px', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '.04em' }}>
                    {getAduanMetaIcon(item.icon, "w-3 h-3 inline-block mr-1 align-text-bottom", item.color)}{item.label}
                  </div>
                  <div style={{ fontSize: '.76rem', fontWeight: 600, color: 'var(--text)' }}>{esc(item.value)}</div>
                </div>
              ))}
            </div>
            {/* Tingkat Keparahan */}
            {detailAduan.tingkatKeparahan && (
              <div style={{ marginBottom: '14px' }}>
                {(() => {
                  const kep = detailAduan.tingkatKeparahan || '';
                  const cfg: Record<string, { label: string; bg: string; color: string }> = {
                    ringan: { label: 'Ringan — Tidak mengancam jiwa, kerusakan minimal', bg: 'rgba(16,185,129,.12)', color: 'var(--teal)' },
                    sedang: { label: 'Sedang — Mengancam jiwa, kerusakan sedang',       bg: 'rgba(245,158,11,.12)',  color: 'var(--amber)' },
                    tinggi: { label: 'Tinggi — Situasi darurat, perlu tindakan segera', bg: 'rgba(249,115,22,.12)',  color: 'var(--orange)' },
                    kritis: { label: 'Kritis — Bahaya langsung, korban jiwa',           bg: 'rgba(239,68,68,.14)',   color: 'var(--red)' },
                  };
                  const c = cfg[kep] || { label: kep, bg: 'var(--bg)', color: 'var(--text)' };
                  return (
                    <div style={{ padding: '8px 12px', borderRadius: '8px', background: c.bg, border: `1px solid ${c.color}40`, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" style={{ color: c.color }} />
                      <div>
                        <div style={{ fontSize: '.58rem', textTransform: 'uppercase', fontWeight: 700, color: 'var(--muted)', letterSpacing: '.05em', marginBottom: '1px' }}>Tingkat Keparahan</div>
                        <div style={{ fontSize: '.76rem', fontWeight: 700, color: c.color }}>{c.label}</div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
            {/* Full-width fields */}
            <div style={{ padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <div style={{ fontSize: '.6rem', color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '.04em' }}>
                  <MapPin className="w-3.5 h-3.5 inline-block mr-1 align-text-bottom text-[var(--red)]" />Lokasi
                </div>
                {detailAduan.mapUrl && (
                  <a
                    href={detailAduan.mapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="be"
                    style={{ fontSize: '.62rem', padding: '2px 8px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    <MapPin className="w-3 h-3 text-blue-500" /> Buka Google Maps
                  </a>
                )}
              </div>
              <div style={{ fontSize: '.78rem', color: 'var(--text)' }}>{esc(detailAduan.lokasi)}</div>
              {detailAduan.koordinat && (
                <div style={{ fontSize: '.68rem', color: 'var(--blue)', fontFamily: 'var(--mono)', marginTop: '4px', fontWeight: 600 }}>
                  GPS: {detailAduan.koordinat.lat.toFixed(6)}, {detailAduan.koordinat.lng.toFixed(6)}
                </div>
              )}
            </div>
            <div style={{ padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: '.6rem', color: 'var(--muted)', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '.04em' }}>
                <MessageSquare className="w-3.5 h-3.5 inline-block mr-1 align-text-bottom text-[var(--blue)]" />Isi Aduan
              </div>
              <div style={{ fontSize: '.78rem', color: 'var(--text)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{esc(detailAduan.deskripsi)}</div>
            </div>
            {/* Foto Aduan */}
            {detailAduan.fotos && detailAduan.fotos.length > 0 && (
              <div style={{ padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontSize: '.6rem', color: 'var(--muted)', marginBottom: '8px', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '.04em' }}>
                  <Image className="w-3.5 h-3.5 inline-block mr-1 align-text-bottom text-[var(--green)]" />Foto Bukti ({detailAduan.fotos.length})
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {detailAduan.fotos.map((foto, fi) => (
                    <img
                      key={fi}
                      src={foto}
                      alt={`Foto ${fi + 1}`}
                      onClick={() => handleOpenGallery(detailAduan.fotos!)}
                      style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--border)', cursor: 'zoom-in' }}
                    />
                  ))}
                </div>
              </div>
            )}
            {/* Video Aduan */}
            {detailAduan.videos && detailAduan.videos.length > 0 && (
              <div style={{ padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontSize: '.6rem', color: 'var(--muted)', marginBottom: '8px', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '.04em' }}>
                  <Video className="w-3.5 h-3.5 inline-block mr-1 align-text-bottom" style={{ color: '#7c3aed' }} />Video Bukti ({detailAduan.videos.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {detailAduan.videos.map((vidUrl, vi) => (
                    <div key={vi} style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border)', background: '#000' }}>
                      <video
                        src={vidUrl}
                        controls
                        style={{ width: '100%', maxHeight: '240px', display: 'block' }}
                        preload="metadata"
                      />
                      <div style={{ padding: '6px 10px', background: 'var(--card)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '.68rem', color: 'var(--muted)' }}>Video {vi + 1}</span>
                        <a
                          href={vidUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="be"
                          style={{ fontSize: '.62rem', padding: '2px 8px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          <ExternalLink className="w-3 h-3" /> Buka
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Tindak Lanjut Section */}
            {detailAduan.catatan && (
              <div style={{ padding: '12px 12px', marginTop: '12px', borderRadius: '8px', background: 'var(--bg)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '.6rem', color: 'var(--muted)', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '.04em' }}>
                  <Reply className="w-3.5 h-3.5 inline-block mr-1 align-text-bottom text-[var(--green)]" />Tindak Lanjut
                </div>
                <div style={{ fontSize: '.78rem', color: 'var(--text)', whiteSpace: 'pre-wrap' }}>{esc(detailAduan.catatan)}</div>
                {detailAduan.fotoTindakLanjut && (
                  <div style={{ marginTop: '8px' }}>
                    <img
                      src={detailAduan.fotoTindakLanjut}
                      alt="Foto TL"
                      onClick={() => handleOpenGallery([detailAduan.fotoTindakLanjut!])}
                      style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--border)', cursor: 'zoom-in' }}
                    />
                  </div>
                )}
                {detailAduan.updatedAt && (
                  <div style={{ fontSize: '.6rem', color: 'var(--muted)', marginTop: '6px', fontFamily: 'var(--mono)' }}>
                    <Clock className="w-4 h-4 inline-block align-middle" /> {detailAduan.updatedAt}
                  </div>
                )}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Modal Tindak Lanjut / Respon */}
      {showTtdModal && targetAduan && (
        <Modal
          show={showTtdModal}
          onClose={() => setShowTtdModal(false)}
          title={
            <span style={{ display: 'flex', alignItems: 'center', gap: '7px', color: 'var(--blue)' }}>
              <Reply className="w-4 h-4 inline-block align-middle mr-1.5" /> Respon Tindak Lanjut
            </span>
          }
          style={{ maxWidth: '480px', width: '90%' }}
          footer={
            <>
              <button className="bg2" onClick={() => setShowTtdModal(false)}>Batal</button>
              <button className="bp" onClick={handleSubmitTindakLanjut} disabled={!catatanVal.trim()}>Simpan</button>
            </>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ padding: '8px 12px', background: 'var(--bg)', borderRadius: '6px', fontSize: '.76rem', border: '1px solid var(--border)' }}>
              <span className="txt-mono font-bold" style={{ color: 'var(--blue)' }}>{targetAduan.ticket}</span>
              <div style={{ marginTop: '4px' }}>
                <strong>Aduan {esc(targetAduan.nama)}:</strong>
                <div style={{ fontStyle: 'italic', marginTop: '3px', color: 'var(--mid)' }}>"{esc(targetAduan.deskripsi)}"</div>
              </div>
            </div>

            <div className="fgrp">
              <label className="flbl">Status Aduan</label>
              <select
                className="fctl"
                value={statusVal}
                onChange={(e) => setStatusVal(e.target.value)}
              >
                <option value="Baru">Baru</option>
                <option value="Diproses">Diproses</option>
                <option value="Selesai">Selesai</option>
              </select>
            </div>

            <div className="fgrp">
              <label className="flbl">Catatan Tindak Lanjut</label>
              <textarea
                className="fctl"
                rows={4}
                placeholder="Ketik detail penanganan/tindak lanjut..."
                value={catatanVal}
                onChange={(e) => setCatatanVal(e.target.value)}
                style={{ resize: 'none' }}
              />
            </div>

            <div className="fgrp">
              <label className="flbl">Foto Tindak Lanjut (Opsional)</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                style={{ display: 'none' }}
                id="followup-photo-file"
              />
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <label
                  htmlFor="followup-photo-file"
                  className="bg2"
                  style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', fontSize: '.72rem' }}
                >
                  <Camera className="w-4 h-4 inline-block align-middle" /> Pilih Foto
                </label>
                {selectedFile && <span style={{ fontSize: '.72rem', color: 'var(--mid)' }}>{selectedFile.name}</span>}
              </div>

              {previewUrl && (
                <div style={{ marginTop: '10px', position: 'relative', width: '100px', height: '100px', border: '1px solid var(--border)', borderRadius: '6px', overflow: 'hidden' }}>
                  <img src={previewUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button
                    type="button"
                    onClick={() => { setSelectedFile(null); setPreviewUrl(null); }}
                    style={{ position: 'absolute', top: '2px', right: '2px', background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', cursor: 'pointer' }}
                  >
                    &times;
                  </button>
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
export default Aduan;
