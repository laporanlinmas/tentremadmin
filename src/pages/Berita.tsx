import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Newspaper, Plus, Search, Edit3, Trash2, Eye, EyeOff, CheckCircle2,
  Calendar, User, Tag, Image as ImageIcon, Upload, X,
  RotateCcw, FileText, Star, Share2, LayoutGrid, List,
  Hash, ListOrdered, Quote, Minus, Save, AlertTriangle
} from 'lucide-react';
import { useApp } from '../App';
import { apiPost } from '../services/api';
import { esc } from '../utils/helpers';
import { formatImageSize, MAX_NEWS_IMAGE_BYTES, prepareNewsImage } from '../utils/imageUpload';
import { Modal } from '../components/common/Modal';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { BeritaSkeleton } from '../components/SkeletonPages';

// Firebase imports
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore, collection, onSnapshot, doc,
  setDoc, deleteDoc, updateDoc
} from 'firebase/firestore';

export interface BeritaItem {
  id: string;
  slug: string;
  judul: string;
  ringkasan: string;
  konten: string;
  kategori: string;
  gambarUtama: string;
  captionGambar?: string;
  galeri?: string[];
  penulis: string;
  status: 'published' | 'draft';
  isFeatured?: boolean;
  tags?: string[];
  views?: number;
  publishedAt: string;
  createdAt?: any;
  updatedAt?: any;
}

// Inisialisasi Firebase
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

// Kategori Berita
export const KATEGORI_BERITA = [
  'Kegiatan Desa',
  'Ketertiban & Keamanan',
  'Pembangunan',
  'Pengumuman',
  'Sosial & Budaya',
  'Kesehatan & Lingkungan',
];

export const getKategoriChipClass = (kategori: string) => {
  switch (kategori) {
    case 'Ketertiban & Keamanan':
      return 'chip cr';
    case 'Pembangunan':
      return 'chip cg';
    case 'Pengumuman':
      return 'chip ca';
    case 'Sosial & Budaya':
      return 'chip cp';
    case 'Kesehatan & Lingkungan':
      return 'chip cb';
    case 'Kegiatan Desa':
    default:
      return 'chip cb';
  }
};

// Sample Initial News
const SAMPLE_BERITA: Omit<BeritaItem, 'id'>[] = [
  {
    slug: 'pelatihan-peningkatan-kapasitas-satlinmas-tugurejo-2026',
    judul: 'Pelatihan Peningkatan Kapasitas & Kesiapsiagaan Satlinmas Desa Tugurejo',
    ringkasan: 'Pemerintah Desa Tugurejo menyelenggarakan pelatihan intensif peningkatan disiplin, kesiapsiagaan tanggap darurat, dan pengamanan lingkungan bagi seluruh anggota Satlinmas.',
    konten: `Dalam rangka memperkuat ketentraman dan ketertiban umum di wilayah Desa Tugurejo, Pemerintah Desa bersama unsur Babinsa dan Bhabinkamtibmas menyelenggarakan Pelatihan Peningkatan Kapasitas Anggota Satuan Perlindungan Masyarakat (Satlinmas).

Kegiatan yang berlangsung di Balai Desa Tugurejo ini dihadiri oleh puluhan anggota Satlinmas dari seluruh dusun, termasuk Dusun Krajan dan Dusun Tugu.

### Fokus Utama Pelatihan:
1. Peningkatan kemampuan deteksi dini dan lapor cepat terhadap potensi gangguan keamanan.
2. Penanganan awal bencana alam, seperti pohon tumbang dan luapan air saat cuaca ekstrem.
3. Keterampilan komunikasi humanis dan pelayanan prima kepada masyarakat.
4. Pemanfaatan teknologi digital sistem pelaporan terintegrasi TENTREM.

> "Kami berharap melalui pelatihan rutin ini, segenap jajaran Satlinmas Desa Tugurejo semakin sigap, disiplin, dan tanggap dalam memberikan rasa aman bagi seluruh warga desa," tegas Kepala Desa Tugurejo.

Pemerintah Desa Tugurejo dalam sambutannya menyampaikan apresiasi setinggi-tingginya kepada seluruh personil Linmas yang senantiasa berdedikasi menjaga keamanan warga selama 24 jam.`,
    kategori: 'Ketertiban & Keamanan',
    gambarUtama: 'https://images.unsplash.com/photo-1577495508048-b635879837f1?auto=format&fit=crop&w=1200&q=80',
    captionGambar: 'Suasana pembukaan pelatihan Satlinmas di Balai Desa Tugurejo',
    penulis: 'Redaksi Desa Tugurejo',
    status: 'published',
    isFeatured: true,
    tags: ['Satlinmas', 'Keamanan', 'Pelatihan', 'Tugurejo Nyaman'],
    views: 156,
    publishedAt: '20 Agustus 2026',
  },
  {
    slug: 'kerja-bakti-serentak-normalisasi-saluran-air-dusunkrajan',
    judul: 'Warga Bersama Linmas Gotong Royong Normalisasi Saluran Air Antisipasi Banjir',
    ringkasan: 'Menyambut musim penghujan, warga RT 02 Dusun Krajan bersama petugas Linmas bahu-membahu membersihkan sedimentasi drainase utama desa.',
    konten: `Semangat gotong royong tampak menyala di lingkungan Dusun Krajan, Desa Tugurejo. Puluhan warga bersama regu Satlinmas bahu membahu melakukan aksi bersih-bersih dan normalisasi saluran pembuangan air.

Kegiatan kerja bakti ini diinisiasi untuk mencegah penyumbatan sampah dan endapan lumpur yang kerap menghambat aliran air saat intensitas curah hujan tinggi.

### Hasil Kegiatan Gotong Royong:
- Pembersihan endapan lumpur sepanjang 500 meter drainase utama.
- Pengangkatan sampah plastik dan ranting pohon yang menyumbat gorong-gorong.
- Penataan tanggul penahan tanah di titik-titik rawan gerusan air.

> "Alhamdulillah kekompakan warga sangat luar biasa. Berkat kerja sama ini, sepanjang 500 meter saluran drainase berhasil dibersihkan dan debit air kini mengalir lancar," ujar salah seorang tokoh masyarakat setempat.`,
    kategori: 'Kegiatan Desa',
    gambarUtama: 'https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&w=1000&q=80',
    captionGambar: 'Warga dan personil Linmas saat membersihkan sedimentasi drainase',
    penulis: 'Satlinmas Tugurejo',
    status: 'published',
    isFeatured: false,
    tags: ['Gotong Royong', 'Lingkungan', 'Dusun Krajan', 'Kerja Bakti'],
    views: 98,
    publishedAt: '18 Agustus 2026',
  },
  {
    slug: 'sosialisasi-penggunaan-aplikasi-pengaduan-tentrem',
    judul: 'Layanan Pengaduan Digital TENTREM Permudah Warga Lapor Gangguan Fasilitas',
    ringkasan: 'Kini warga Desa Tugurejo dapat mengirimkan laporan aduan fasilitas rusak, gangguan ketertiban, dan kebersihan secara online melalui tiket digital yang transparan.',
    konten: `Pemerintah Desa Tugurejo resmi meluncurkan pembaruan kanal pengaduan digital terpadu pada portal TENTREM. Kanal ini memungkinkan setiap warga desa menyampaikan aspirasi, keluhan fasilitas umum, maupun laporan gangguan keamanan secara mudah langsung dari ponsel.

Setiap laporan yang masuk akan secara otomatis mendapatkan nomor tiket unik (contoh: ADU-202608-001) yang dapat dilacak progres verifikasi dan penanganannya secara real-time.

### Keunggulan Layanan Aduan Digital:
1. Kemudahan pelaporan 24 jam dari ponsel pintar tanpa harus datang ke kantor desa.
2. Lampiran foto bukti dan koordinat lokasi presisi.
3. Transparansi penanganan oleh petugas piket yang dapat dipantau statusnya.
4. Notifikasi pesan WhatsApp langsung kepada warga pelapor.

Langkah ini merupakan wujud komitmen Pemerintah Desa Tugurejo dalam mewujudkan tata kelola desa yang responsif, transparan, dan modern.`,
    kategori: 'Pengumuman',
    gambarUtama: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=1000&q=80',
    captionGambar: 'Antarmuka layanan pengaduan terintegrasi TENTREM Desa Tugurejo',
    penulis: 'Tim IT Desa Tugurejo',
    status: 'published',
    isFeatured: false,
    tags: ['Layanan Publik', 'Pengaduan', 'Inovasi Digital', 'Transparan'],
    views: 234,
    publishedAt: '15 Agustus 2026',
  }
];

// Helper aman rendering teks (Safe Markdown without XSS vulnerabilities)
const SafeArticleRenderer: React.FC<{ text: string }> = ({ text }) => {
  if (!text) return null;

  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];

  let inList = false;
  let listItems: string[] = [];
  let isOrdered = false;

  const flushList = () => {
    if (inList && listItems.length > 0) {
      if (isOrdered) {
        elements.push(
          <ol key={`ol-${elements.length}`} style={{ listStyleType: 'decimal', paddingLeft: '20px', margin: '10px 0', fontSize: '.82rem', lineHeight: '1.6' }}>
            {listItems.map((item, i) => (
              <li key={i} style={{ marginBottom: '4px' }}>{renderInlineFormatted(item)}</li>
            ))}
          </ol>
        );
      } else {
        elements.push(
          <ul key={`ul-${elements.length}`} style={{ listStyleType: 'disc', paddingLeft: '20px', margin: '10px 0', fontSize: '.82rem', lineHeight: '1.6' }}>
            {listItems.map((item, i) => (
              <li key={i} style={{ marginBottom: '4px' }}>{renderInlineFormatted(item)}</li>
            ))}
          </ul>
        );
      }
      inList = false;
      listItems = [];
    }
  };

  const renderInlineFormatted = (str: string) => {
    // Escape HTML tags to prevent XSS
    const cleanStr = str.replace(/<[^>]*>?/gm, '');

    // Bold formatting **text**
    const parts = cleanStr.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index} style={{ fontWeight: 800, color: 'var(--text)' }}>{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return <em key={index} style={{ fontStyle: 'italic', color: 'var(--mid)' }}>{part.slice(1, -1)}</em>;
      }
      return part;
    });
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i].trim();

    if (!rawLine) {
      flushList();
      continue;
    }

    // Heading 3: ### Title
    if (rawLine.startsWith('### ')) {
      flushList();
      elements.push(
        <h4 key={i} style={{ fontSize: '.9rem', fontWeight: 800, color: 'var(--text)', marginTop: '16px', marginBottom: '6px' }}>
          {renderInlineFormatted(rawLine.replace('### ', ''))}
        </h4>
      );
      continue;
    }

    // Heading 2: ## Title
    if (rawLine.startsWith('## ')) {
      flushList();
      elements.push(
        <h3 key={i} style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text)', marginTop: '20px', marginBottom: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '4px' }}>
          {renderInlineFormatted(rawLine.replace('## ', ''))}
        </h3>
      );
      continue;
    }

    // Blockquote: > Quote
    if (rawLine.startsWith('> ')) {
      flushList();
      elements.push(
        <blockquote key={i} style={{ padding: '10px 14px', margin: '12px 0', background: 'var(--bluelo)', borderLeft: '3px solid var(--blue)', borderRadius: '6px', fontSize: '.8rem', fontStyle: 'italic', color: 'var(--text)', lineHeight: '1.6' }}>
          {renderInlineFormatted(rawLine.replace('> ', ''))}
        </blockquote>
      );
      continue;
    }

    // Divider: ---
    if (rawLine === '---' || rawLine === '***') {
      flushList();
      elements.push(<hr key={i} style={{ margin: '14px 0', border: 'none', borderTop: '1px solid var(--border)' }} />);
      continue;
    }

    // Ordered list: 1. Item
    const numMatch = rawLine.match(/^(\d+)\.\s+(.+)/);
    if (numMatch) {
      if (!inList || !isOrdered) {
        flushList();
        inList = true;
        isOrdered = true;
      }
      listItems.push(numMatch[2]);
      continue;
    }

    // Unordered list: - Item or * Item
    if (rawLine.startsWith('- ') || rawLine.startsWith('* ')) {
      if (!inList || isOrdered) {
        flushList();
        inList = true;
        isOrdered = false;
      }
      listItems.push(rawLine.slice(2));
      continue;
    }

    // Normal paragraph
    flushList();
    elements.push(
      <p key={i} style={{ fontSize: '.82rem', color: 'var(--text)', lineHeight: '1.65', marginBottom: '10px' }}>
        {renderInlineFormatted(rawLine)}
      </p>
    );
  }

  flushList();
  return <div>{elements}</div>;
};

export const Berita: React.FC = () => {
  const { triggerToast, showLoad, hideLoad } = useApp();

  const [beritaList, setBeritaList] = useState<BeritaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedKategori, setSelectedKategori] = useState('Semua');
  const [selectedStatus, setSelectedStatus] = useState('Semua');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Modal Form State (Studio Editor)
  const [showFormModal, setShowFormModal] = useState(false);
  const [editorTab, setEditorTab] = useState<'edit' | 'preview'>('edit');
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);

  // Form Fields
  const [judul, setJudul] = useState('');
  const [slug, setSlug] = useState('');
  const [kategori, setKategori] = useState(KATEGORI_BERITA[0]);
  const [penulis, setPenulis] = useState('Pemerintah Desa Tugurejo');
  const [publishedAt, setPublishedAt] = useState('');
  const [status, setStatus] = useState<'published' | 'draft'>('published');
  const [isFeatured, setIsFeatured] = useState(false);
  const [ringkasan, setRingkasan] = useState('');
  const [konten, setKonten] = useState('');
  const [gambarUtama, setGambarUtama] = useState('');
  const [captionGambar, setCaptionGambar] = useState('');
  const [tagsInput, setTagsInput] = useState('');

  // Uploading state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState('');
  const [imageInfo, setImageInfo] = useState<{ originalSize: number; uploadedSize: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reader Preview Modal
  const [previewBerita, setPreviewBerita] = useState<BeritaItem | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Real-time Firestore sync
  useEffect(() => {
    if (!db) {
      const stored = localStorage.getItem('tentrem_berita_local');
      if (stored) {
        try {
          setBeritaList(JSON.parse(stored));
        } catch {
          setBeritaList(SAMPLE_BERITA.map((b, idx) => ({ ...b, id: `sample-${idx}` })));
        }
      } else {
        const initial = SAMPLE_BERITA.map((b, idx) => ({ ...b, id: `sample-${idx}` }));
        setBeritaList(initial);
        localStorage.setItem('tentrem_berita_local', JSON.stringify(initial));
      }
      setLoading(false);
      return;
    }

    const colRef = collection(db, 'berita');

    const unsubscribe = onSnapshot(
      colRef,
      (snapshot) => {
        if (!snapshot.empty) {
          const list: BeritaItem[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data() as Omit<BeritaItem, 'id'>;
            list.push({
              id: docSnap.id,
              ...data,
            });
          });

          list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
          setBeritaList(list);
          localStorage.setItem('tentrem_berita_local', JSON.stringify(list));
        } else {
          seedInitialNews();
        }
        setLoading(false);
      },
      (error) => {
        console.warn('Firestore snapshot error, fallback to local:', error);
        const stored = localStorage.getItem('tentrem_berita_local');
        if (stored) {
          try {
            setBeritaList(JSON.parse(stored));
          } catch {}
        }
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const seedInitialNews = async () => {
    if (!db) return;
    try {
      for (const sample of SAMPLE_BERITA) {
        const docRef = doc(collection(db, 'berita'));
        await setDoc(docRef, {
          ...sample,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    } catch (e) {
      console.warn('Error seeding initial news:', e);
    }
  };

  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleOpenCreate = () => {
    const now = new Date();
    const bulanNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const tglStr = `${now.getDate()} ${bulanNames[now.getMonth()]} ${now.getFullYear()}`;

    setIsEditing(false);
    setCurrentId(null);
    setEditorTab('edit');
    setJudul('');
    setSlug('');
    setKategori(KATEGORI_BERITA[0]);
    setPenulis('Pemerintah Desa Tugurejo');
    setPublishedAt(tglStr);
    setStatus('published');
    setIsFeatured(false);
    setRingkasan('');
    setKonten('');
    setGambarUtama('');
    setImageInfo(null);
    setCaptionGambar('');
    setTagsInput('Berita Desa, Tugurejo');
    setShowFormModal(true);
  };

  const handleOpenEdit = (item: BeritaItem) => {
    setIsEditing(true);
    setCurrentId(item.id);
    setEditorTab('edit');
    setJudul(item.judul || '');
    setSlug(item.slug || '');
    setKategori(item.kategori || KATEGORI_BERITA[0]);
    setPenulis(item.penulis || 'Pemerintah Desa Tugurejo');
    setPublishedAt(item.publishedAt || '');
    setStatus(item.status || 'published');
    setIsFeatured(!!item.isFeatured);
    setRingkasan(item.ringkasan || '');
    setKonten(item.konten || '');
    setGambarUtama(item.gambarUtama || '');
    setImageInfo(null);
    setCaptionGambar(item.captionGambar || '');
    setTagsInput((item.tags || []).join(', '));
    setShowFormModal(true);
  };

  const uploadToCloudinary = (file: File, cloudName: string, uploadPreset: string): Promise<string> => new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);
    formData.append('folder', 'tentrem_tugurejo/berita');
    const request = new XMLHttpRequest();
    request.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`);
    request.timeout = 90_000;
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) setUploadProgress(Math.min(99, Math.round((event.loaded / event.total) * 100)));
    };
    request.onerror = () => reject(new Error('Koneksi ke layanan penyimpanan foto gagal.'));
    request.ontimeout = () => reject(new Error('Unggah foto melebihi batas waktu. Silakan coba lagi.'));
    request.onload = () => {
      try {
        const data = JSON.parse(request.responseText || '{}');
        if (request.status >= 200 && request.status < 300 && data.secure_url) resolve(data.secure_url);
        else reject(new Error(data.error?.message || 'Layanan penyimpanan menolak foto ini.'));
      } catch {
        reject(new Error('Respons layanan penyimpanan foto tidak valid.'));
      }
    };
    request.send(formData);
  });

  // Foto diperkecil di browser terlebih dahulu, lalu diunggah ke CDN dengan progres nyata.
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    if (file.size > 25 * 1024 * 1024) {
      triggerToast('Ukuran foto awal maksimal 25 MB agar dapat diproses dengan lancar.', 'er');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadStage('Menyiapkan dan mengecilkan foto…');

    try {
      try {
        const prepared = await prepareNewsImage(file);
        setImageInfo({ originalSize: prepared.originalSize, uploadedSize: prepared.file.size });
        setUploadProgress(0);
        setUploadStage(`Mengunggah foto ${formatImageSize(prepared.file.size)} ke CDN…`);
        const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
        const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
        let imageUrl = '';
        try {
          imageUrl = await uploadToCloudinary(prepared.file, cloudName, uploadPreset);
        } catch (directError) {
          console.warn('Direct Cloudinary upload failed; trying secure server fallback.', directError);
          setUploadStage('Mencoba jalur unggah cadangan…');
          setUploadProgress(35);
          const base64Data = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result || ''));
            reader.onerror = () => reject(new Error('Gagal membaca foto untuk unggah cadangan.'));
            reader.readAsDataURL(prepared.file);
          });
          const fallback = await apiPost('uploadCloudinary', { fileData: base64Data, mimeType: prepared.file.type });
          if (!fallback?.success || !fallback.url) throw new Error(fallback?.message || 'Unggah foto gagal. Periksa koneksi lalu coba lagi.');
          imageUrl = fallback.url;
        }
        setGambarUtama(imageUrl);
        setUploadProgress(100);
        setUploadStage('Foto siap digunakan.');
        triggerToast(`Foto berhasil diunggah (${formatImageSize(prepared.file.size)}, di bawah 1 MB).`, 'ok');
      } catch (error: any) {
        setUploadStage('Unggah gagal.');
        triggerToast(error?.message || 'Gagal mengunggah foto.', 'er');
      }

    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveBerita = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!judul.trim()) {
      triggerToast('Judul artikel wajib diisi.', 'er');
      return;
    }
    if (!konten.trim()) {
      triggerToast('Konten naskah artikel berita wajib diisi.', 'er');
      return;
    }
    if (isUploading) {
      triggerToast('Tunggu sampai unggah foto selesai sebelum menyimpan artikel.', 'er');
      return;
    }

    const cleanSlug = slug.trim() || generateSlug(judul);
    const parsedTags = tagsInput
      .split(',')
      .map(t => t.trim().replace(/^#/, ''))
      .filter(Boolean);

    const payload: Omit<BeritaItem, 'id'> = {
      judul: judul.trim(),
      slug: cleanSlug,
      kategori,
      penulis: penulis.trim() || 'Pemerintah Desa Tugurejo',
      publishedAt: publishedAt.trim() || '21 Agustus 2026',
      status,
      isFeatured,
      ringkasan: ringkasan.trim() || judul.trim(),
      konten: konten.trim(),
      gambarUtama: gambarUtama.trim() || 'https://images.unsplash.com/photo-1577495508048-b635879837f1?auto=format&fit=crop&w=1200&q=80',
      captionGambar: captionGambar.trim(),
      tags: parsedTags,
      views: isEditing ? (beritaList.find(b => b.id === currentId)?.views || 0) : 0,
      updatedAt: new Date(),
    };

    showLoad(isEditing ? 'Memperbarui artikel...' : 'Menerbitkan artikel baru...');

    try {
      if (db) {
        if (isEditing && currentId) {
          const docRef = doc(db, 'berita', currentId);
          await updateDoc(docRef, payload);
          triggerToast('Artikel berita berhasil diperbarui!', 'ok');
        } else {
          const docRef = doc(collection(db, 'berita'));
          await setDoc(docRef, {
            ...payload,
            createdAt: new Date(),
          });
          triggerToast('Artikel berita baru berhasil diterbitkan!', 'ok');
        }
      } else {
        if (isEditing && currentId) {
          const updated = beritaList.map(item =>
            item.id === currentId ? { ...payload, id: currentId } : item
          );
          setBeritaList(updated);
          localStorage.setItem('tentrem_berita_local', JSON.stringify(updated));
          triggerToast('Artikel diperbarui di memori lokal.', 'ok');
        } else {
          const newItem: BeritaItem = {
            ...payload,
            id: `local-${Date.now()}`,
            createdAt: new Date(),
          };
          const updated = [newItem, ...beritaList];
          setBeritaList(updated);
          localStorage.setItem('tentrem_berita_local', JSON.stringify(updated));
          triggerToast('Artikel baru diterbitkan di memori lokal.', 'ok');
        }
      }

      setShowFormModal(false);
    } catch (err: any) {
      console.error('Error saving news:', err);
      triggerToast(err.message || 'Gagal menyimpan berita.', 'er');
    } finally {
      hideLoad();
    }
  };

  const handleToggleStatus = async (item: BeritaItem) => {
    const nextStatus = item.status === 'published' ? 'draft' : 'published';
    showLoad(`Mengubah status artikel...`);

    try {
      if (db) {
        const docRef = doc(db, 'berita', item.id);
        await updateDoc(docRef, { status: nextStatus, updatedAt: new Date() });
      } else {
        const updated = beritaList.map(b =>
          b.id === item.id ? { ...b, status: nextStatus } : b
        );
        setBeritaList(updated);
        localStorage.setItem('tentrem_berita_local', JSON.stringify(updated));
      }
      triggerToast(`Status artikel: ${nextStatus === 'published' ? 'TERBIT' : 'DRAF'}`, 'ok');
    } catch (err: any) {
      triggerToast('Gagal mengubah status berita.', 'er');
    } finally {
      hideLoad();
    }
  };

  const handleDeleteBerita = async (id: string) => {
    showLoad('Menghapus artikel...');
    try {
      if (db) {
        await deleteDoc(doc(db, 'berita', id));
      } else {
        const updated = beritaList.filter(b => b.id !== id);
        setBeritaList(updated);
        localStorage.setItem('tentrem_berita_local', JSON.stringify(updated));
      }
      triggerToast('Artikel berita berhasil dihapus.', 'ok');
      setDeleteConfirmId(null);
    } catch (err: any) {
      triggerToast('Gagal menghapus berita.', 'er');
    } finally {
      hideLoad();
    }
  };

  const handleCopyLink = (item: BeritaItem) => {
    const url = `${window.location.origin}/berita/${item.slug || item.id}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      triggerToast('Tautan artikel disalin ke clipboard!', 'ok');
    } else {
      triggerToast(url, 'inf');
    }
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedKategori('Semua');
    setSelectedStatus('Semua');
  };

  const filteredList = useMemo(() => {
    return beritaList.filter(item => {
      const matchSearch =
        (item.judul || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.ringkasan || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.kategori || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.penulis || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.tags || []).some(t => t.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchKategori = selectedKategori === 'Semua' || item.kategori === selectedKategori;
      const matchStatus = selectedStatus === 'Semua' || item.status === selectedStatus;

      return matchSearch && matchKategori && matchStatus;
    });
  }, [beritaList, searchTerm, selectedKategori, selectedStatus]);

  const totalBerita = beritaList.length;
  const totalPublished = beritaList.filter(b => b.status === 'published').length;
  const totalDraft = beritaList.filter(b => b.status === 'draft').length;
  const totalViews = beritaList.reduce((acc, b) => acc + (b.views || 0), 0);

  const wordCount = useMemo(() => {
    return konten.trim() ? konten.trim().split(/\s+/).length : 0;
  }, [konten]);

  const readingTime = useMemo(() => {
    return Math.max(1, Math.ceil(wordCount / 180));
  }, [wordCount]);

  if (loading) {
    return <BeritaSkeleton />;
  }

  return (
    <div className="fu">

      {/* Summary Metrics Cards (Standard TENTREM Style) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3" style={{ marginBottom: '1.25rem' }}>
        {/* Total Artikel */}
        <div className="scard cb">
          <div className="sico"><Newspaper className="w-5 h-5" /></div>
          <div className="scard-text">
            <div className="snum">{totalBerita}</div>
            <div className="slbl">Total Artikel</div>
          </div>
        </div>

        {/* Artikel Terbit */}
        <div className="scard cg">
          <div className="sico"><CheckCircle2 className="w-5 h-5" /></div>
          <div className="scard-text">
            <div className="snum">{totalPublished}</div>
            <div className="slbl">Artikel Terbit</div>
          </div>
        </div>

        {/* Draf Disimpan */}
        <div className="scard ca">
          <div className="sico"><EyeOff className="w-5 h-5" /></div>
          <div className="scard-text">
            <div className="snum">{totalDraft}</div>
            <div className="slbl">Draf Disimpan</div>
          </div>
        </div>

        {/* Total Pembaca */}
        <div className="scard cp">
          <div className="sico"><Eye className="w-5 h-5" /></div>
          <div className="scard-text">
            <div className="snum">{totalViews}</div>
            <div className="slbl">Total Pembaca</div>
          </div>
        </div>
      </div>

      {/* Main Panel Box */}
      <div className="panel">
        
        {/* Panel Header */}
        <div className="phd">
          <span className="ptl">
            <Newspaper className="w-4 h-4 inline-block align-middle" /> Manajemen Warta &amp; Berita Desa
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button className="bp" onClick={handleOpenCreate} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Plus className="w-4 h-4" /> Tulis Berita Baru
            </button>
          </div>
        </div>

        {/* Filter Bar (Standard TENTREM Style) */}
        <div className="fbar">
          <div className="fsrch" style={{ flex: '2 1 200px' }}>
            <Search className="w-4 h-4 fsi" />
            <input
              className="fctl"
              type="text"
              placeholder="Cari judul berita, topik, penulis..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flex: '0 0 auto', flexWrap: 'nowrap' }}>
            <select
              className="fctl"
              style={{ flex: '1 1 130px', minWidth: '130px' }}
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="Semua">Semua Status</option>
              <option value="published">Terbit (Published)</option>
              <option value="draft">Draf (Draft)</option>
            </select>

            <select
              className="fctl"
              style={{ flex: '1 1 160px', minWidth: '160px' }}
              value={selectedKategori}
              onChange={(e) => setSelectedKategori(e.target.value)}
            >
              <option value="Semua">Semua Kategori</option>
              {KATEGORI_BERITA.map(k => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>

            <button className="bg2" onClick={handleResetFilters} title="Reset Filter" style={{ padding: '8px 10px' }}>
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          <div className="fbar-right">
            <button
              className={`bg2 ${viewMode === 'grid' ? 'bp' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Tampilan Grid Kartu"
              style={{ padding: '7px 10px' }}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              className={`bg2 ${viewMode === 'table' ? 'bp' : ''}`}
              onClick={() => setViewMode('table')}
              title="Tampilan Tabel"
              style={{ padding: '7px 10px' }}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Category Pills Bar */}
        <div style={{ padding: '10px 16px', background: 'var(--card)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto' }}>
          <button
            type="button"
            onClick={() => setSelectedKategori('Semua')}
            className={`chip ${selectedKategori === 'Semua' ? 'cb' : 'cm'}`}
            style={{ cursor: 'pointer', padding: '4px 10px', fontSize: '.65rem' }}
          >
            Semua ({beritaList.length})
          </button>
          {KATEGORI_BERITA.map((k) => {
            const count = beritaList.filter(b => b.kategori === k).length;
            const isSel = selectedKategori === k;
            return (
              <button
                key={k}
                type="button"
                onClick={() => setSelectedKategori(k)}
                className={`chip ${isSel ? 'cb' : 'cm'}`}
                style={{ cursor: 'pointer', padding: '4px 10px', fontSize: '.65rem', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
              >
                <span>{k}</span>
                <span style={{ opacity: 0.8, fontWeight: 'normal' }}>({count})</span>
              </button>
            );
          })}
        </div>

        {/* Panel Content (Grid or Table) */}
        <div className="pbd" style={{ padding: '16px' }}>
          {filteredList.length === 0 ? (
            <div className="empty" style={{ padding: '40px 0', textAlign: 'center' }}>
              <Newspaper className="w-8 h-8 opacity-[0.17] mx-auto mb-2 block" />
              <p style={{ fontWeight: 700, color: 'var(--text)' }}>Tidak ada artikel berita ditemukan</p>
              <p style={{ fontSize: '.72rem', color: 'var(--muted)', marginTop: '4px' }}>
                Silakan sesuaikan kata kunci pencarian atau buat berita baru.
              </p>
            </div>
          ) : viewMode === 'grid' ? (
            /* Grid View */
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
              {filteredList.map((item) => {
                const chipClass = getKategoriChipClass(item.kategori);
                return (
                  <div
                    key={item.id}
                    style={{
                      background: 'var(--card)',
                      border: '1.5px solid var(--border)',
                      borderRadius: '16px',
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                      boxShadow: 'var(--sh)',
                      transition: 'all .2s ease',
                    }}
                    className="hover:border-[var(--blue)] hover:shadow-md"
                  >
                    {/* Thumbnail Image */}
                    <div style={{ position: 'relative', width: '100%', height: '185px', background: '#0f172a', overflow: 'hidden' }}>
                      <img
                        src={item.gambarUtama}
                        alt={item.judul}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1577495508048-b635879837f1?auto=format&fit=crop&w=800&q=80';
                        }}
                      />
                      
                      {/* Gradient Overlay */}
                      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.2) 40%, transparent 100%)', pointerEvents: 'none' }} />

                      {/* Top Badges: Status Publikasi on top right */}
                      <div style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(item)}
                          className={item.status === 'published' ? 'chip cg' : 'chip ca'}
                          style={{ cursor: 'pointer', fontWeight: 800, boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
                          title="Klik untuk ubah status publikasi"
                        >
                          {item.status === 'published' ? '🟢 Terbit' : '🟡 Draf'}
                        </button>
                      </div>

                      {/* Featured Badge */}
                      {item.isFeatured && (
                        <div style={{ position: 'absolute', bottom: '10px', left: '10px' }}>
                          <span className="chip" style={{ background: '#f59e0b', color: '#0f172a', fontWeight: 800 }}>
                            <Star className="w-3 h-3 inline mr-1 fill-current" /> Berita Utama
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Card Body */}
                    <div style={{ padding: '14px 16px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '10px' }}>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {/* Kategori text (bersih tanpa bungkus card) & Meta row */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                          <span style={{ fontSize: '.72rem', fontWeight: 800, color: 'var(--blue)', textTransform: 'uppercase', letterSpacing: '.04em' }}>
                            {item.kategori}
                          </span>
                        </div>

                        {/* Meta row */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '.7rem', color: 'var(--muted)', flexWrap: 'wrap' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Calendar className="w-3.5 h-3.5 text-[var(--blue)]" /> {item.publishedAt}
                          </span>
                          <span>•</span>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }} title={item.penulis}>
                            <User className="w-3.5 h-3.5" /> {item.penulis}
                          </span>
                          {item.views !== undefined && (
                            <>
                              <span>•</span>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <Eye className="w-3.5 h-3.5" /> {item.views}
                              </span>
                            </>
                          )}
                        </div>

                        {/* Title */}
                        <h4
                          onClick={() => setPreviewBerita(item)}
                          style={{
                            fontSize: '.88rem',
                            fontWeight: 800,
                            color: 'var(--text)',
                            lineHeight: '1.35',
                            cursor: 'pointer',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                          className="hover:text-[var(--blue)] transition-colors"
                        >
                          {item.judul}
                        </h4>

                        {/* Excerpt */}
                        <p
                          style={{
                            fontSize: '.74rem',
                            color: 'var(--mid)',
                            lineHeight: '1.55',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {item.ringkasan}
                        </p>

                        {/* Tags */}
                        {item.tags && item.tags.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '2px' }}>
                            {item.tags.slice(0, 3).map((t, idx) => (
                              <span key={idx} className="chip cm" style={{ fontSize: '.58rem' }}>
                                #{t}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Card Footer Actions */}
                      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', marginTop: '8px' }}>
                        <button
                          type="button"
                          onClick={() => setPreviewBerita(item)}
                          className="be"
                          style={{ padding: '4px 10px', fontSize: '.68rem' }}
                        >
                          <Eye className="w-3.5 h-3.5" /> Pratinjau
                        </button>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <button
                            type="button"
                            onClick={() => handleCopyLink(item)}
                            className="bg2"
                            style={{ padding: '4px 8px' }}
                            title="Salin Tautan"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenEdit(item)}
                            className="be"
                            style={{ padding: '4px 8px' }}
                            title="Edit Berita"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(item.id)}
                            className="bd"
                            style={{ padding: '4px 8px' }}
                            title="Hapus Berita"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Table View */
            <div className="twrap">
              <table className="dtbl dtbl-sp">
                <thead>
                  <tr>
                    <th style={{ width: '45%' }}>Artikel Berita</th>
                    <th style={{ width: '15%' }}>Kategori</th>
                    <th style={{ width: '15%' }}>Penulis</th>
                    <th style={{ width: '10%' }}>Tanggal</th>
                    <th style={{ width: '8%', textAlign: 'center' }}>Status</th>
                    <th style={{ width: '7%', textAlign: 'right' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredList.map((item) => {
                    const chipClass = getKategoriChipClass(item.kategori);
                    return (
                      <tr key={item.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '48px', height: '48px', borderRadius: '8px', background: '#0f172a', overflow: 'hidden', flexShrink: 0, border: '1px solid var(--border)' }}>
                              <img src={item.gambarUtama} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                {item.isFeatured && <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" style={{ flexShrink: 0 }} />}
                                <strong
                                  onClick={() => setPreviewBerita(item)}
                                  style={{ color: 'var(--text)', cursor: 'pointer', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}
                                  className="hover:text-[var(--blue)]"
                                >
                                  {item.judul}
                                </strong>
                              </div>
                              <p style={{ fontSize: '.7rem', color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: '2px 0 0 0' }}>
                                {item.ringkasan}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span style={{ fontSize: '.74rem', fontWeight: 700, color: 'var(--blue)', textTransform: 'uppercase', letterSpacing: '.04em' }}>
                            {item.kategori}
                          </span>
                        </td>
                        <td style={{ fontSize: '.74rem', color: 'var(--text)' }}>{item.penulis}</td>
                        <td style={{ fontSize: '.72rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>{item.publishedAt}</td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(item)}
                            className={item.status === 'published' ? 'chip cg' : 'chip ca'}
                            style={{ cursor: 'pointer' }}
                          >
                            {item.status === 'published' ? 'Terbit' : 'Draf'}
                          </button>
                        </td>
                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <button type="button" onClick={() => setPreviewBerita(item)} className="be" style={{ marginRight: '4px', padding: '4px 7px' }} title="Pratinjau">
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button type="button" onClick={() => handleOpenEdit(item)} className="be" style={{ marginRight: '4px', padding: '4px 7px' }} title="Edit">
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button type="button" onClick={() => setDeleteConfirmId(item.id)} className="bd" style={{ padding: '4px 7px' }} title="Hapus">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          MODAL FORM: STUDIO EDITOR BERITA (CREATE & EDIT)
          ═══════════════════════════════════════════════════════ */}
      <Modal
        show={showFormModal}
        onClose={() => setShowFormModal(false)}
        size="lg"
        title={
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Newspaper className="w-4 h-4 text-[var(--blue)] inline" />
            {isEditing ? 'Edit Artikel Berita' : 'Tulis Berita Baru'}
          </span>
        }
        footer={
          <>
            <button className="bg2" onClick={() => setShowFormModal(false)}>
              Batal
            </button>
            <button className="bp" onClick={handleSaveBerita} disabled={isUploading} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', opacity: isUploading ? .65 : 1, cursor: isUploading ? 'not-allowed' : 'pointer' }}>
              <Save className="w-4 h-4" /> {isUploading ? 'Menunggu Unggahan…' : isEditing ? 'Simpan Perubahan' : 'Terbitkan Artikel'}
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          {/* Sub Navigation Tabs */}
          <div className="in-tabs" style={{ marginBottom: '10px' }}>
            <button
              type="button"
              className={`in-tab ${editorTab === 'edit' ? 'on' : ''}`}
              onClick={() => setEditorTab('edit')}
            >
              <FileText className="w-3.5 h-3.5 inline mr-1" /> Editor Naskah
            </button>
            <button
              type="button"
              className={`in-tab ${editorTab === 'preview' ? 'on' : ''}`}
              onClick={() => setEditorTab('preview')}
            >
              <Eye className="w-3.5 h-3.5 inline mr-1" /> Pratinjau Tampilan
            </button>
          </div>

          {editorTab === 'edit' ? (
            <form onSubmit={handleSaveBerita} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              
              {/* Judul Berita */}
              <div className="fgrp">
                <label className="flbl" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Judul Artikel Berita <span className="req">*</span></span>
                  <span style={{ fontSize: '.65rem', color: 'var(--muted)', fontWeight: 'normal' }}>{judul.length}/140 karakter</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={140}
                  className="fctl font-bold"
                  placeholder="Masukkan judul artikel berita yang jelas..."
                  value={judul}
                  onChange={(e) => {
                    setJudul(e.target.value);
                    if (!isEditing || !slug) {
                      setSlug(generateSlug(e.target.value));
                    }
                  }}
                />
              </div>

              {/* Slug URL */}
              <div className="fgrp">
                <label className="flbl">Slug URL Berita</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '.75rem', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>/berita/</span>
                  <input
                    type="text"
                    className="fctl txt-mono"
                    style={{ flex: 1 }}
                    placeholder="slug-otomatis"
                    value={slug}
                    onChange={(e) => setSlug(generateSlug(e.target.value))}
                  />
                </div>
              </div>

              {/* Ringkasan */}
              <div className="fgrp">
                <label className="flbl">Ringkasan Singkat (Excerpt)</label>
                <textarea
                  rows={2}
                  className="fctl"
                  placeholder="Ringkasan inti sari naskah yang tampil pada kartu depan..."
                  value={ringkasan}
                  onChange={(e) => setRingkasan(e.target.value)}
                />
              </div>

              {/* Konten Naskah & Toolbar Format */}
              <div className="fgrp">
                <label className="flbl" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Naskah Berita Lengkap <span className="req">*</span></span>
                  <span style={{ fontSize: '.65rem', color: 'var(--muted)', fontWeight: 'normal' }}>
                    {wordCount} kata • ±{readingTime} menit baca
                  </span>
                </label>

                {/* Toolbar Format */}
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '6px' }}>
                  <button
                    type="button"
                    onClick={() => setKonten(k => k + (k ? '\n\n' : '') + '### Sub-Judul Baru\n')}
                    className="bg2"
                    style={{ padding: '3px 8px', fontSize: '.68rem' }}
                  >
                    <Hash className="w-3 h-3 inline mr-1" /> Sub-Judul
                  </button>
                  <button
                    type="button"
                    onClick={() => setKonten(k => k + (k ? '\n\n' : '') + '1. Poin pertama\n2. Poin kedua\n')}
                    className="bg2"
                    style={{ padding: '3px 8px', fontSize: '.68rem' }}
                  >
                    <ListOrdered className="w-3 h-3 inline mr-1" /> Daftar Angka
                  </button>
                  <button
                    type="button"
                    onClick={() => setKonten(k => k + (k ? '\n\n' : '') + '- Poin pertama\n- Poin kedua\n')}
                    className="bg2"
                    style={{ padding: '3px 8px', fontSize: '.68rem' }}
                  >
                    <List className="w-3 h-3 inline mr-1" /> Poin Bullets
                  </button>
                  <button
                    type="button"
                    onClick={() => setKonten(k => k + (k ? '\n\n' : '') + '> "Kutipan pernyataan tokoh masyarakat atau narasumber..."\n')}
                    className="bg2"
                    style={{ padding: '3px 8px', fontSize: '.68rem' }}
                  >
                    <Quote className="w-3 h-3 inline mr-1" /> Kutipan
                  </button>
                  <button
                    type="button"
                    onClick={() => setKonten(k => k + (k ? '\n\n' : '') + '---\n')}
                    className="bg2"
                    style={{ padding: '3px 8px', fontSize: '.68rem' }}
                  >
                    <Minus className="w-3 h-3 inline mr-1" /> Garis
                  </button>
                </div>

                <textarea
                  rows={8}
                  required
                  className="fctl"
                  style={{ lineHeight: '1.6', fontSize: '.8rem' }}
                  placeholder="Tuliskan naskah berita lengkap di sini..."
                  value={konten}
                  onChange={(e) => setKonten(e.target.value)}
                />
              </div>

              {/* Foto Sampul & Cloudinary CDN */}
              <div className="fgrp">
                <label className="flbl" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Foto Sampul Artikel (Cloudinary CDN)</span>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="be"
                    disabled={isUploading}
                    style={{ padding: '3px 8px', fontSize: '.68rem' }}
                  >
                    <Upload className="w-3 h-3 inline mr-1" /> {isUploading ? 'Mengunggah…' : 'Unggah Foto'}
                  </button>
                </label>

                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/jpeg,image/png,image/webp"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />

                {(isUploading || uploadStage) && (
                  <div role="status" aria-live="polite" style={{ marginTop: '8px', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', fontSize: '.7rem', color: 'var(--text)', fontWeight: 700 }}>
                      <span>{uploadStage}</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div style={{ height: '6px', borderRadius: '999px', overflow: 'hidden', background: 'var(--border)', marginTop: '7px' }}>
                      <div style={{ width: `${uploadProgress}%`, height: '100%', borderRadius: 'inherit', background: uploadProgress === 100 ? '#16a34a' : 'var(--blue)', transition: 'width .2s ease' }} />
                    </div>
                    {imageInfo && <p style={{ margin: '7px 0 0', fontSize: '.67rem', color: 'var(--muted)' }}>Dioptimalkan dari {formatImageSize(imageInfo.originalSize)} menjadi {formatImageSize(imageInfo.uploadedSize)}. Batas hasil: {formatImageSize(MAX_NEWS_IMAGE_BYTES)}.</p>}
                  </div>
                )}

                {gambarUtama ? (
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', background: 'var(--bg)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <div style={{ width: '80px', height: '55px', borderRadius: '6px', overflow: 'hidden', background: '#000', flexShrink: 0 }}>
                      <img src={gambarUtama} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <input
                        type="text"
                        className="fctl"
                        style={{ padding: '6px 8px', fontSize: '.72rem' }}
                        placeholder="Caption foto (contoh: Dokumentasi rapat di balai desa)"
                        value={captionGambar}
                        onChange={(e) => setCaptionGambar(e.target.value)}
                      />
                      <input
                        type="url"
                        className="fctl txt-mono"
                        style={{ padding: '6px 8px', fontSize: '.7rem' }}
                        placeholder="URL foto..."
                        value={gambarUtama}
                        onChange={(e) => setGambarUtama(e.target.value)}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => { setGambarUtama(''); setImageInfo(null); setUploadStage(''); setUploadProgress(0); }}
                      className="bd"
                      disabled={isUploading}
                      style={{ padding: '6px 8px' }}
                      title="Hapus Foto"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      border: '2px dashed var(--border)',
                      borderRadius: '8px',
                      padding: '16px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      background: 'var(--bg)',
                    }}
                  >
                    <Upload className="w-5 h-5 mx-auto text-[var(--muted)] mb-1" />
                    <p style={{ fontSize: '.75rem', fontWeight: 700, color: 'var(--text)', margin: 0 }}>Klik untuk unggah foto sampul artikel</p>
                    <p style={{ fontSize: '.68rem', color: 'var(--muted)', margin: '2px 0 0 0' }}>JPG, PNG, WebP • otomatis dikompresi maksimal 1 MB</p>
                  </div>
                )}
              </div>

              {/* 3 Columns: Kategori, Penulis, Tanggal */}
              <div className="frow3">
                <div className="fcol">
                  <label className="flbl">Kategori</label>
                  <select
                    className="fctl"
                    value={kategori}
                    onChange={(e) => setKategori(e.target.value)}
                  >
                    {KATEGORI_BERITA.map(k => (
                      <option key={k} value={k}>{k}</option>
                    ))}
                  </select>
                </div>

                <div className="fcol">
                  <label className="flbl">Penulis</label>
                  <input
                    type="text"
                    className="fctl"
                    value={penulis}
                    onChange={(e) => setPenulis(e.target.value)}
                    placeholder="Pemerintah Desa Tugurejo"
                  />
                </div>

                <div className="fcol">
                  <label className="flbl">Tanggal Terbit</label>
                  <input
                    type="text"
                    className="fctl"
                    value={publishedAt}
                    onChange={(e) => setPublishedAt(e.target.value)}
                    placeholder="21 Agustus 2026"
                  />
                </div>
              </div>

              {/* 2 Columns: Status & Featured Switch */}
              <div className="frow">
                <div className="fcol">
                  <label className="flbl">Status Publikasi</label>
                  <select
                    className="fctl"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                  >
                    <option value="published">Terbitkan Langsung (Published)</option>
                    <option value="draft">Simpan Sebagai Draf (Draft)</option>
                  </select>
                </div>

                <div className="fcol" style={{ justifyContent: 'center' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginTop: '16px', fontSize: '.78rem', fontWeight: 800, color: 'var(--text)' }}>
                    <input
                      type="checkbox"
                      checked={isFeatured}
                      onChange={(e) => setIsFeatured(e.target.checked)}
                      style={{ cursor: 'pointer' }}
                    />
                    <span>⭐ Jadikan Berita Utama (Featured)</span>
                  </label>
                </div>
              </div>

              {/* Tags */}
              <div className="fgrp">
                <label className="flbl">Tags / Kata Kunci (Pisahkan dengan koma)</label>
                <input
                  type="text"
                  className="fctl"
                  placeholder="Contoh: Satlinmas, Keamanan, Dusun Krajan"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                />
              </div>

            </form>
          ) : (
            /* Live Preview */
            <div style={{ background: 'var(--bg)', padding: '16px', borderRadius: '10px', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <span className={getKategoriChipClass(kategori)}>{kategori}</span>
                {isFeatured && <span className="chip ca">⭐ Berita Utama</span>}
              </div>

              <h2 style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--text)', lineHeight: '1.3', marginBottom: '8px' }}>
                {judul || '(Judul Berita)'}
              </h2>

              <div style={{ display: 'flex', gap: '10px', fontSize: '.72rem', color: 'var(--muted)', borderBottom: '1px solid var(--border)', paddingBottom: '8px', marginBottom: '12px' }}>
                <span><User className="w-3.5 h-3.5 inline mr-1 text-[var(--blue)]" /> {penulis}</span>
                <span>•</span>
                <span><Calendar className="w-3.5 h-3.5 inline mr-1" /> {publishedAt}</span>
              </div>

              {gambarUtama && (
                <div style={{ marginBottom: '12px' }}>
                  <img src={gambarUtama} alt="" style={{ width: '100%', maxHeight: '280px', objectFit: 'cover', borderRadius: '8px' }} />
                  {captionGambar && <p style={{ fontSize: '.7rem', color: 'var(--muted)', fontStyle: 'italic', textAlign: 'center', marginTop: '4px' }}>{captionGambar}</p>}
                </div>
              )}

              {ringkasan && (
                <div style={{ background: 'var(--card)', borderLeft: '3px solid var(--blue)', padding: '10px 12px', borderRadius: '6px', fontSize: '.78rem', fontWeight: 600, color: 'var(--text)', marginBottom: '12px' }}>
                  {ringkasan}
                </div>
              )}

              <SafeArticleRenderer text={konten || '(Naskah artikel berita akan tampil di sini...)'} />
            </div>
          )}

        </div>
      </Modal>

      {/* ═══════════════════════════════════════════════════════
          MODAL READER PREVIEW (FULL ARTICLE)
          ═══════════════════════════════════════════════════════ */}
      {previewBerita && (
        <Modal
          show={!!previewBerita}
          onClose={() => setPreviewBerita(null)}
          size="lg"
          title={
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className={getKategoriChipClass(previewBerita.kategori)}>{previewBerita.kategori}</span>
              <span style={{ maxWidth: '400px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'inline-block' }}>
                {previewBerita.judul}
              </span>
            </span>
          }
          footer={
            <>
              <button className="bg2" onClick={() => handleCopyLink(previewBerita)}>
                <Share2 className="w-4 h-4 inline mr-1" /> Salin Tautan
              </button>
              <button className="bp" onClick={() => setPreviewBerita(null)}>
                Tutup
              </button>
            </>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            
            <h1 style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--text)', lineHeight: '1.3', margin: '0' }}>
              {previewBerita.judul}
            </h1>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', fontSize: '.74rem', color: 'var(--muted)', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
              <span style={{ fontWeight: 700, color: 'var(--text)' }}><User className="w-3.5 h-3.5 inline mr-1 text-[var(--blue)]" /> {previewBerita.penulis}</span>
              <span>•</span>
              <span><Calendar className="w-3.5 h-3.5 inline mr-1" /> {previewBerita.publishedAt}</span>
              <span>•</span>
              <span><Eye className="w-3.5 h-3.5 inline mr-1" /> {previewBerita.views || 0} Pembaca</span>
            </div>

            {previewBerita.gambarUtama && (
              <div>
                <img
                  src={previewBerita.gambarUtama}
                  alt={previewBerita.judul}
                  style={{ width: '100%', maxHeight: '320px', objectFit: 'cover', borderRadius: '10px' }}
                />
                {previewBerita.captionGambar && (
                  <p style={{ fontSize: '.7rem', color: 'var(--muted)', fontStyle: 'italic', textAlign: 'center', marginTop: '4px' }}>
                    {previewBerita.captionGambar}
                  </p>
                )}
              </div>
            )}

            {previewBerita.ringkasan && (
              <div style={{ background: 'var(--bluelo)', borderLeft: '3px solid var(--blue)', padding: '10px 14px', borderRadius: '6px', fontSize: '.8rem', fontWeight: 600, color: 'var(--text)' }}>
                {previewBerita.ringkasan}
              </div>
            )}

            <div style={{ marginTop: '6px' }}>
              <SafeArticleRenderer text={previewBerita.konten} />
            </div>

            {previewBerita.tags && previewBerita.tags.length > 0 && (
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                <Tag className="w-3.5 h-3.5 text-[var(--muted)] mr-1" />
                {previewBerita.tags.map((t, idx) => (
                  <span key={idx} className="chip cm">
                    #{t}
                  </span>
                ))}
              </div>
            )}

          </div>
        </Modal>
      )}

      {/* ═══════════════════════════════════════════════════════
          CONFIRM DELETE MODAL
          ═══════════════════════════════════════════════════════ */}
      <ConfirmModal
        show={!!deleteConfirmId}
        title="Konfirmasi Hapus Berita"
        msg="Apakah Anda yakin ingin menghapus artikel berita ini secara permanen? Data yang telah dihapus tidak dapat dipulihkan kembali."
        onConfirm={() => handleDeleteBerita(deleteConfirmId!)}
        onCancel={() => setDeleteConfirmId(null)}
      />

    </div>
  );
};

export default Berita;
