import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Inbox, CheckCircle2, Star, Newspaper,
  Users, BarChart2, PieChart,
  Calendar, ChevronRight,
  Shield, Eye, AlertTriangle, MessageCircle
} from 'lucide-react';
import { useApp, useAuth, useTheme } from '../App';
import { Chart } from 'chart.js/auto';
import { DashboardSkeleton } from '../components/SkeletonPages';

// Firebase imports
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot } from 'firebase/firestore';

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface AduanItem {
  id: string;
  ticket: string;
  timestamp: string;
  nama: string;
  kategori: string;
  lokasi: string;
  deskripsi: string;
  status: string;
}

interface SurveyItem {
  id: string;
  nama: string;
  pekerjaan: string;
  kemudahan: number;
  kegunaan: number;
  kecepatan: number;
  keakuratan: number;
  rekomendasi: number;
  saran: string;
  createdAt: string;
}

interface BeritaItem {
  id: string;
  slug: string;
  judul: string;
  ringkasan: string;
  kategori: string;
  gambarUtama: string;
  penulis: string;
  status: 'published' | 'draft';
  isFeatured?: boolean;
  views?: number;
  publishedAt: string;
}

interface AnggotaPoskamlingItem {
  id: string;
  nama: string;
  kategori: string;
  usia?: number;
  wa?: string;
}

interface KelompokRondaItem {
  id: string;
  nama: string;
  hari?: string;
  danpok?: string;
  danru?: string;
  poskamling?: string;
  anggota?: string[];
  aktif?: boolean;
}

interface InventarisItem {
  id: string;
  namaAset: string;
  jumlah: number;
  kondisi: string;
}

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

// ─── Component ────────────────────────────────────────────────────────────────

export const Dashboard: React.FC = () => {
  const { setActiveTab } = useApp();
  const { session } = useAuth();
  const { isDarkMode } = useTheme();

  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);

  const [kelompokList, setKelompokList] = useState<KelompokRondaItem[]>([]);
  const [aduanList, setAduanList] = useState<AduanItem[]>([]);
  const [surveyList, setSurveyList] = useState<SurveyItem[]>([]);
  const [beritaList, setBeritaList] = useState<BeritaItem[]>([]);
  const [anggotaPoskamlingList, setAnggotaPoskamlingList] = useState<AnggotaPoskamlingItem[]>([]);
  const [inventarisList, setInventarisList] = useState<InventarisItem[]>([]);

  // Chart refs
  const aduanTrendChartRef = useRef<HTMLCanvasElement>(null);
  const kategoriChartRef = useRef<HTMLCanvasElement>(null);
  const surveyRadarChartRef = useRef<HTMLCanvasElement>(null);
  const aduanTrendChartInstance = useRef<any>(null);
  const kategoriChartInstance = useRef<any>(null);
  const surveyRadarChartInstance = useRef<any>(null);

  // Clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Firestore listeners
  useEffect(() => {
    if (!db) { setLoading(false); return; }

    let count = 0;
    const checkDone = () => { count++; if (count >= 6) setLoading(false); };

    // Kelompok Ronda
    const unsubKelompok = onSnapshot(collection(db, 'kelompok_ronda'), (snap) => {
      const list: KelompokRondaItem[] = [];
      snap.forEach((doc) => {
        const d = doc.data();
        list.push({
          id: doc.id,
          nama: d.nama || '',
          hari: d.hari || '',
          danpok: d.danpok || d.danru || '',
          poskamling: d.poskamling || '',
          anggota: Array.isArray(d.anggota) ? d.anggota : [],
          aktif: d.aktif !== false,
        });
      });
      setKelompokList(list);
      checkDone();
    }, () => checkDone());

    // Aduan
    const unsubAduan = onSnapshot(collection(db, 'aduan'), (snap) => {
      const list: AduanItem[] = [];
      snap.forEach((doc) => {
        const d = doc.data();
        list.push({
          id: doc.id,
          ticket: d.ticket || doc.id,
          timestamp: d.timestamp || '',
          nama: d.nama || '',
          kategori: d.kategori || 'Umum',
          lokasi: d.lokasi || '',
          deskripsi: d.deskripsi || '',
          status: d.status || 'Baru',
        });
      });
      list.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
      setAduanList(list);
      checkDone();
    }, () => checkDone());

    // Survey
    const unsubSurvey = onSnapshot(collection(db, 'survey_kepuasan'), (snap) => {
      const list: SurveyItem[] = [];
      snap.forEach((doc) => {
        const d = doc.data();
        list.push({
          id: doc.id,
          nama: d.nama || 'Responden',
          pekerjaan: d.pekerjaan || '',
          kemudahan: Number(d.kemudahan || 0),
          kegunaan: Number(d.kegunaan || 0),
          kecepatan: Number(d.kecepatan || 0),
          keakuratan: Number(d.keakuratan || 0),
          rekomendasi: Number(d.rekomendasi || 0),
          saran: d.saran || '',
          createdAt: d.createdAt || '',
        });
      });
      list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      setSurveyList(list);
      checkDone();
    }, () => checkDone());

    // Berita
    const unsubBerita = onSnapshot(collection(db, 'berita'), (snap) => {
      const list: BeritaItem[] = [];
      snap.forEach((doc) => {
        const d = doc.data() as Omit<BeritaItem, 'id'>;
        list.push({ id: doc.id, ...d });
      });
      setBeritaList(list);
      checkDone();
    }, () => checkDone());

    // Anggota Poskamling
    const unsubSatlinmas = onSnapshot(collection(db, 'anggotaPoskamling'), (snap) => {
      const list: AnggotaPoskamlingItem[] = [];
      snap.forEach((doc) => {
        const d = doc.data();
        list.push({
          id: doc.id,
          nama: d.nama || '',
          kategori: d.kategori || 'Anggota',
          usia: d.usia ? Number(d.usia) : undefined,
          wa: d.wa || '',
        });
      });
      setAnggotaPoskamlingList(list);
      checkDone();
    }, () => checkDone());
    // Inventaris
    const unsubInventaris = onSnapshot(collection(db, 'inventaris'), (snap) => {
      const list: InventarisItem[] = [];
      snap.forEach((doc) => {
        const d = doc.data();
        list.push({
          id: doc.id,
          namaAset: d.namaAset || '',
          jumlah: Number(d.jumlah || 0),
          kondisi: d.kondisi || 'Baik',
        });
      });
      setInventarisList(list);
      checkDone();
    }, () => checkDone());

    return () => {
      unsubKelompok(); unsubAduan(); unsubSurvey(); unsubBerita(); unsubSatlinmas(); unsubInventaris();
    };
  }, []);

  // ── Metrics ──────────────────────────────────────────────────────────────────

  const totalKelompok = kelompokList.length > 0 ? kelompokList.length : 0;
  const kelompokAktif = kelompokList.filter(k => k.aktif !== false).length;

  const totalAduan = aduanList.length;
  const aduanDitindaklanjuti = aduanList.filter(a => a.status === 'Diproses' || a.status === 'Selesai').length;
  const persenAduanDitindaklanjuti = totalAduan > 0 ? Math.round((aduanDitindaklanjuti / totalAduan) * 100) : 0;

  const totalSurvey = surveyList.length;
  const avgKemudahan   = totalSurvey > 0 ? surveyList.reduce((s, x) => s + x.kemudahan, 0)   / totalSurvey : 0;
  const avgKegunaan    = totalSurvey > 0 ? surveyList.reduce((s, x) => s + x.kegunaan, 0)    / totalSurvey : 0;
  const avgKecepatan   = totalSurvey > 0 ? surveyList.reduce((s, x) => s + x.kecepatan, 0)   / totalSurvey : 0;
  const avgKeakuratan  = totalSurvey > 0 ? surveyList.reduce((s, x) => s + x.keakuratan, 0)  / totalSurvey : 0;
  const avgRekomendasi = totalSurvey > 0 ? surveyList.reduce((s, x) => s + x.rekomendasi, 0) / totalSurvey : 0;
  const ikmScore = totalSurvey > 0
    ? Number(((avgKemudahan + avgKegunaan + avgKecepatan + avgKeakuratan + avgRekomendasi) / 5).toFixed(2))
    : 0;
  const ikmPercent = totalSurvey > 0 ? Math.round((ikmScore / 5) * 100) : 0;

  const ikmMutu = useMemo(() => {
    if (totalSurvey === 0) return { label: 'Belum Ada Survei', color: 'var(--muted)' };
    if (ikmScore >= 4.0) return { label: 'Sangat Baik (A)', color: 'var(--green)' };
    if (ikmScore >= 3.0) return { label: 'Baik (B)', color: 'var(--blue)' };
    if (ikmScore >= 2.0) return { label: 'Cukup (C)', color: 'var(--amber)' };
    return { label: 'Kurang (D)', color: 'var(--red)' };
  }, [totalSurvey, ikmScore]);

  const totalBerita = beritaList.length;
  const beritaPublished = beritaList.filter(b => b.status === 'published');
  const featuredBerita = beritaPublished.find(b => b.isFeatured) || beritaPublished[0] || null;
  const totalAnggota = anggotaPoskamlingList.length;

  const totalAset = inventarisList.length;
  const asetBaik  = inventarisList.filter(i => i.kondisi === 'Baik').length;

  const kategoriCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    anggotaPoskamlingList.forEach(m => {
      const k = m.kategori || 'Anggota';
      counts[k] = (counts[k] || 0) + 1;
    });
    return counts;
  }, [anggotaPoskamlingList]);

  // Distribusi kategori aduan untuk bar chart
  const kategoriData = useMemo(() => {
    const counts: Record<string, number> = {};
    aduanList.forEach(a => {
      const k = a.kategori || 'Lainnya';
      counts[k] = (counts[k] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 7); // Maksimal 7 kategori teratas
  }, [aduanList]);

  // ── Charts ───────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (loading) return;

    // 1. Tren aduan 7 hari
    if (aduanTrendChartRef.current) {
      if (aduanTrendChartInstance.current) aduanTrendChartInstance.current.destroy();
      const days: string[] = [];
      const dataSelesai: number[] = [];
      const dataPending: number[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const pad = (n: number) => String(n).padStart(2, '0');
        days.push(`${d.getDate()}/${d.getMonth() + 1}`);
        const fmt = `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;
        dataSelesai.push(aduanList.filter(r => r.timestamp.includes(fmt) && r.status === 'Selesai').length);
        dataPending.push(aduanList.filter(r => r.timestamp.includes(fmt) && r.status !== 'Selesai').length);
      }
      aduanTrendChartInstance.current = new Chart(aduanTrendChartRef.current, {
        type: 'bar',
        data: {
          labels: days,
          datasets: [
            { label: 'Selesai',      data: dataSelesai, backgroundColor: 'rgba(16,185,129,0.85)', borderRadius: 6 },
            { label: 'Baru/Proses',  data: dataPending, backgroundColor: 'rgba(245,158,11,0.85)',  borderRadius: 6 },
          ],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: true, position: 'top', labels: { boxWidth: 10, font: { size: 10, weight: 'bold' } } } },
          scales: { x: { grid: { display: false } }, y: { beginAtZero: true, ticks: { precision: 0 } } },
        },
      });
    }

    // 2. Bar chart kategori aduan
    if (kategoriChartRef.current) {
      if (kategoriChartInstance.current) kategoriChartInstance.current.destroy();
      if (kategoriData.length > 0) {
        const KATEGORI_COLORS = [
          'rgba(239,68,68,0.85)',
          'rgba(245,158,11,0.85)',
          'rgba(59,130,246,0.85)',
          'rgba(16,185,129,0.85)',
          'rgba(139,92,246,0.85)',
          'rgba(236,72,153,0.85)',
          'rgba(20,184,166,0.85)',
        ];
        kategoriChartInstance.current = new Chart(kategoriChartRef.current, {
          type: 'bar',
          data: {
            labels: kategoriData.map(([k]) => k.length > 18 ? k.slice(0, 18) + '…' : k),
            datasets: [{
              label: 'Jumlah Aduan',
              data: kategoriData.map(([, v]) => v),
              backgroundColor: kategoriData.map((_, i) => KATEGORI_COLORS[i % KATEGORI_COLORS.length]),
              borderRadius: 6,
              borderSkipped: false,
            }],
          },
          options: {
            indexAxis: 'y',
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              x: { beginAtZero: true, ticks: { precision: 0 }, grid: { display: false } },
              y: { grid: { display: false }, ticks: { font: { size: 10, weight: 'bold' } } },
            },
          },
        });
      }
    }

    // 3. Radar IKM
    if (surveyRadarChartRef.current && totalSurvey > 0) {
      if (surveyRadarChartInstance.current) surveyRadarChartInstance.current.destroy();
      surveyRadarChartInstance.current = new Chart(surveyRadarChartRef.current, {
        type: 'radar',
        data: {
          labels: ['Kemudahan', 'Kemanfaatan', 'Kecepatan', 'Keakuratan', 'Rekomendasi'],
          datasets: [{
            label: 'Skor IKM',
            data: [avgKemudahan, avgKegunaan, avgKecepatan, avgKeakuratan, avgRekomendasi],
            backgroundColor: isDarkMode ? 'rgba(59,130,246,0.25)' : 'rgba(30,111,217,0.20)',
            borderColor: '#3b82f6',
            borderWidth: 2.5,
            pointBackgroundColor: '#3b82f6',
            pointRadius: 3,
          }],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            r: {
              min: 0, max: 5,
              ticks: { stepSize: 1, display: false },
              grid: { color: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' },
              pointLabels: { font: { size: 9, weight: 'bold' } },
            },
          },
        },
      });
    }

    return () => {
      aduanTrendChartInstance.current?.destroy();
      kategoriChartInstance.current?.destroy();
      surveyRadarChartInstance.current?.destroy();
    };
  }, [loading, aduanList, surveyList, isDarkMode, totalSurvey,
      avgKemudahan, avgKegunaan, avgKecepatan, avgKeakuratan, avgRekomendasi, kategoriData]);

  // ── Clock ─────────────────────────────────────────────────────────────────────

  const pad = (n: number) => String(n).padStart(2, '0');
  const dayNames   = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
  const monthNames = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  const clockHours   = pad(currentTime.getHours());
  const clockMinutes = pad(currentTime.getMinutes());
  const clockSeconds = pad(currentTime.getSeconds());
  const clockDay  = dayNames[currentTime.getDay()];
  const clockDate = `${currentTime.getDate()} ${monthNames[currentTime.getMonth()]} ${currentTime.getFullYear()}`;

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="fu">

      {/* ── 1. CLOCK & GREETING ─────────────────────────────────────────── */}
      <div className="panel" style={{ padding: '12px 16px', marginBottom: '1rem', background: 'var(--card)', borderRadius: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 'clamp(1.35rem, 4vw, 1.9rem)', fontWeight: 900, color: 'var(--text)', lineHeight: 1 }}>
              <span>{clockHours}</span>
              <span style={{ color: 'var(--blue)', margin: '0 2px' }}>:</span>
              <span>{clockMinutes}</span>
              <span style={{ fontSize: '.75em', color: 'var(--muted)', fontWeight: 600, marginLeft: '3px' }}>:{clockSeconds}</span>
            </div>
            <div style={{ width: '1px', height: '26px', background: 'var(--border)' }} />
            <div>
              <div style={{ fontSize: 'clamp(.74rem, 2.2vw, .86rem)', fontWeight: 800, color: 'var(--text)' }}>{clockDate}</div>
              <div style={{ fontSize: '.6rem', fontWeight: 800, color: 'var(--blue)', textTransform: 'uppercase', letterSpacing: '.04em' }}>
                {clockDay} · Desa Tugurejo
              </div>
            </div>
          </div>
          {session && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '.6rem', color: 'var(--muted)', fontWeight: 600 }}>
                {(() => { const h = currentTime.getHours(); if (h < 11) return 'Selamat pagi,'; if (h < 15) return 'Selamat siang,'; if (h < 18) return 'Selamat sore,'; return 'Selamat malam,'; })()}
              </div>
              <div style={{ fontSize: 'clamp(.76rem, 2vw, .88rem)', fontWeight: 800, color: 'var(--text)', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {session.namaLengkap || session.username}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── 2. STAT CARDS: 2-kolom mobile, 3 tablet, 6 desktop ─────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mb-4">

        <div className="scard cg" onClick={() => setActiveTab('rd')} style={{ cursor: 'pointer' }}>
          <div className="sico"><Users className="w-4 h-4" /></div>
          <div className="scard-text">
            <div className="snum">
              {totalKelompok}
              {kelompokAktif > 0 && kelompokAktif < totalKelompok && (
                <span style={{ fontSize: '.58rem', color: 'var(--green)', fontWeight: 800, marginLeft: '3px' }}>({kelompokAktif} aktif)</span>
              )}
            </div>
            <div className="slbl">Kelompok Ronda</div>
          </div>
        </div>

        <div className="scard cr" onClick={() => setActiveTab('ad')} style={{ cursor: 'pointer' }}>
          <div className="sico"><MessageCircle className="w-4 h-4" /></div>
          <div className="scard-text"><div className="snum">{totalAduan}</div><div className="slbl">Aduan Masuk</div></div>
        </div>

        <div className="scard ca" onClick={() => setActiveTab('ad')} style={{ cursor: 'pointer' }}>
          <div className="sico"><CheckCircle2 className="w-4 h-4" /></div>
          <div className="scard-text">
            <div className="snum">
              {aduanDitindaklanjuti}
              {totalAduan > 0 && <span style={{ fontSize: '.58rem', color: 'var(--amber)', fontWeight: 800, marginLeft: '3px' }}>({persenAduanDitindaklanjuti}%)</span>}
            </div>
            <div className="slbl">Ditindaklanjuti</div>
          </div>
        </div>

        <div className="scard ct" onClick={() => setActiveTab('sl')} style={{ cursor: 'pointer' }}>
          <div className="sico"><Shield className="w-4 h-4" /></div>
          <div className="scard-text"><div className="snum">{totalAnggota}</div><div className="slbl">Anggota Poskamling</div></div>
        </div>

        <div className="scard cv" onClick={() => setActiveTab('br')} style={{ cursor: 'pointer' }}>
          <div className="sico"><Newspaper className="w-4 h-4" /></div>
          <div className="scard-text">
            <div className="snum">
              {totalBerita}
              {totalBerita > 0 && (
                <span style={{ fontSize: '.58rem', color: isDarkMode ? '#c084fc' : '#7c3aed', fontWeight: 800, marginLeft: '3px' }}>
                  ({beritaPublished.length} terbit)
                </span>
              )}
            </div>
            <div className="slbl">Total Berita</div>
          </div>
        </div>

        <div className="scard cb" onClick={() => setActiveTab('inv')} style={{ cursor: 'pointer' }}>
          <div className="sico"><Inbox className="w-4 h-4" /></div>
          <div className="scard-text">
            <div className="snum">
              {totalAset}
              {totalAset > 0 && asetBaik < totalAset && (
                <span style={{ fontSize: '.58rem', color: 'var(--green)', fontWeight: 800, marginLeft: '3px' }}>({asetBaik} baik)</span>
              )}
            </div>
            <div className="slbl">Aset Inventaris</div>
          </div>
        </div>
      </div>

      {/* ── 3. 2 KOLOM: ADUAN TERKINI | BERITA TERKINI ──────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" style={{ marginBottom: '1rem' }}>

        {/* Aduan Terkini */}
        <div className="panel" style={{ marginBottom: 0 }}>
          <div className="phd">
            <span className="ptl"><AlertTriangle className="w-4 h-4 inline-block align-middle text-[var(--red)]" /> Aduan Warga Terkini</span>
            <button className="be" onClick={() => setActiveTab('ad')} style={{ padding: '4px 10px', fontSize: '.68rem' }}>
              Semua <ChevronRight className="w-3.5 h-3.5 inline" />
            </button>
          </div>
          <div className="pbd" style={{ padding: '10px 12px' }}>
            {aduanList.length === 0 ? (
              <div className="empty" style={{ padding: '24px 0', textAlign: 'center' }}>
                <Inbox className="w-8 h-8 opacity-20 mx-auto mb-2" />
                <p style={{ fontSize: '.74rem', color: 'var(--muted)', margin: 0 }}>Belum ada aduan masuk.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                {aduanList.slice(0, 4).map((item) => (
                  <div key={item.id} onClick={() => setActiveTab('ad')}
                    style={{ padding: '9px 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '9px', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', marginBottom: '3px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '.7rem', fontWeight: 800, color: 'var(--blue)', fontFamily: 'var(--mono)' }}>{item.ticket}</span>
                      <span className={item.status === 'Selesai' ? 'chip cg' : item.status === 'Diproses' ? 'chip ca' : 'chip cb'}
                        style={{ fontSize: '.57rem', padding: '1px 5px' }}>{item.status}</span>
                    </div>
                    <div style={{ fontSize: '.72rem', fontWeight: 700, color: 'var(--text)', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.nama}
                      <span className="chip cb2" style={{ fontSize: '.6rem', padding: '1px 5px', marginLeft: '5px' }}>{item.kategori}</span>
                    </div>
                    <div style={{ fontSize: '.66rem', color: 'var(--muted)', display: 'flex', justifyContent: 'space-between', gap: '6px' }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '65%' }}>{item.lokasi || '—'}</span>
                      <span style={{ flexShrink: 0 }}>{item.timestamp?.slice(0, 16) || ''}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Berita Terkini */}
        <div className="panel" style={{ marginBottom: 0 }}>
          <div className="phd">
            <span className="ptl"><Newspaper className="w-4 h-4 inline-block align-middle" /> Warta Desa</span>
            <button className="be" onClick={() => setActiveTab('br')} style={{ padding: '4px 10px', fontSize: '.68rem' }}>
              Kelola <ChevronRight className="w-3.5 h-3.5 inline" />
            </button>
          </div>
          <div className="pbd" style={{ padding: '12px' }}>
            {featuredBerita ? (
              <div onClick={() => setActiveTab('br')}
                style={{ border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden', cursor: 'pointer' }}>
                <div style={{ position: 'relative', height: '130px', background: '#0f172a' }}>
                  <img src={featuredBerita.gambarUtama} alt={featuredBerita.judul}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: .9 }}
                    onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1577495508048-b635879837f1?auto=format&fit=crop&w=800&q=80'; }}
                  />
                  {featuredBerita.isFeatured && (
                    <span className="chip ca" style={{ position: 'absolute', top: 7, right: 7, fontSize: '.57rem', padding: '2px 7px' }}>★ Utama</span>
                  )}
                </div>
                <div style={{ padding: '9px 12px' }}>
                  <div style={{ fontSize: '.6rem', color: 'var(--blue)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: '3px' }}>{featuredBerita.kategori}</div>
                  <div style={{ fontSize: '.79rem', fontWeight: 800, color: 'var(--text)', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {featuredBerita.judul}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.63rem', color: 'var(--muted)', marginTop: '7px', paddingTop: '7px', borderTop: '1px solid var(--border)' }}>
                    <span><Calendar className="w-3 h-3 inline mr-0.5" />{featuredBerita.publishedAt}</span>
                    <span><Eye className="w-3 h-3 inline mr-0.5" />{featuredBerita.views || 0} baca</span>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ padding: '20px', textAlign: 'center', border: '1.5px dashed var(--border)', borderRadius: '10px' }}>
                <Newspaper className="w-8 h-8 opacity-20 mx-auto mb-2" />
                <p style={{ fontSize: '.7rem', color: 'var(--muted)', margin: '0 0 10px' }}>Belum ada berita diterbitkan</p>
                <button className="bp" onClick={() => setActiveTab('br')} style={{ padding: '5px 12px', fontSize: '.7rem' }}>+ Buat Berita</button>
              </div>
            )}
            {/* Berita lainnya */}
            {beritaPublished.length > 1 && (
              <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                {beritaPublished.slice(1, 3).map((b) => (
                  <div key={b.id} onClick={() => setActiveTab('br')}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 10px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '6px', background: '#0f172a', overflow: 'hidden', flexShrink: 0 }}>
                      <img src={b.gambarUtama} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    </div>
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <div style={{ fontSize: '.7rem', fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.judul}</div>
                      <div style={{ fontSize: '.6rem', color: 'var(--muted)' }}>{b.kategori} · {b.publishedAt}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── 4. 2 KOLOM: TREN ADUAN 7 HARI | KATEGORI ADUAN ─────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" style={{ marginBottom: '1rem' }}>

        <div className="panel" style={{ marginBottom: 0 }}>
          <div className="phd">
            <span className="ptl"><BarChart2 className="w-4 h-4 inline-block align-middle" /> Tren Aduan 7 Hari Terakhir</span>
          </div>
          <div className="pbd" style={{ padding: '12px' }}>
            <div style={{ height: '180px', position: 'relative' }}>
              <canvas ref={aduanTrendChartRef}></canvas>
            </div>
          </div>
        </div>

        <div className="panel" style={{ marginBottom: 0 }}>
          <div className="phd">
            <span className="ptl"><PieChart className="w-4 h-4 inline-block align-middle" /> Kategori Aduan Terbanyak</span>
          </div>
          <div className="pbd" style={{ padding: '12px' }}>
            {kategoriData.length > 0 ? (
              <div style={{ height: '180px', position: 'relative' }}>
                <canvas ref={kategoriChartRef}></canvas>
              </div>
            ) : (
              <div className="empty" style={{ padding: '28px 0', textAlign: 'center' }}>
                <PieChart className="w-8 h-8 opacity-20 mx-auto mb-1" />
                <p style={{ fontSize: '.72rem', color: 'var(--muted)', margin: 0 }}>Belum ada data kategori aduan.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── 5. 2 KOLOM: IKM RADAR | KESIAPSIAGAAN SATLINMAS ─────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        <div className="panel" style={{ marginBottom: 0 }}>
          <div className="phd">
            <span className="ptl"><Star className="w-4 h-4 inline-block align-middle mr-1 text-[var(--amber)]" /> Indeks Kepuasan Masyarakat (IKM)</span>
            <button className="be" onClick={() => setActiveTab('sv')} style={{ padding: '4px 10px', fontSize: '.68rem' }}>
              Detail <ChevronRight className="w-3.5 h-3.5 inline" />
            </button>
          </div>
          <div className="pbd" style={{ padding: '12px' }}>
            {totalSurvey > 0 ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.6rem', fontWeight: 900, color: ikmMutu.color, lineHeight: 1 }}>{ikmScore.toFixed(1)}</div>
                    <div style={{ fontSize: '.6rem', color: 'var(--muted)', fontWeight: 700 }}>/ 5.0</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '.72rem', fontWeight: 800, color: ikmMutu.color }}>{ikmMutu.label}</div>
                    <div style={{ fontSize: '.62rem', color: 'var(--muted)' }}>{totalSurvey} responden · {ikmPercent}% kepuasan</div>
                  </div>
                </div>
                <div style={{ height: '150px', position: 'relative' }}>
                  <canvas ref={surveyRadarChartRef}></canvas>
                </div>
              </>
            ) : (
              <div className="empty" style={{ padding: '28px 0', textAlign: 'center' }}>
                <PieChart className="w-8 h-8 opacity-20 mx-auto mb-1" />
                <p style={{ fontSize: '.72rem', color: 'var(--muted)', margin: 0 }}>Belum ada data survei IKM.</p>
              </div>
            )}
          </div>
        </div>

        <div className="panel" style={{ marginBottom: 0 }}>
          <div className="phd">
            <span className="ptl"><Shield className="w-4 h-4 inline-block align-middle mr-1 text-[var(--blue)]" /> Kesiapsiagaan Anggota Poskamling</span>
            <button className="be" onClick={() => setActiveTab('sl')} style={{ padding: '4px 10px', fontSize: '.68rem' }}>
              Data <ChevronRight className="w-3.5 h-3.5 inline" />
            </button>
          </div>
          <div className="pbd" style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--bg)', padding: '11px 14px', borderRadius: '9px', border: '1px solid var(--border)' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '9px', background: 'var(--blue)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Users className="w-5 h-5" />
              </div>
              <div>
                <div style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--text)', lineHeight: 1.15 }}>
                  {totalAnggota} <span style={{ fontSize: '.68rem', fontWeight: 600, color: 'var(--muted)' }}>Personil</span>
                </div>
                <div style={{ fontSize: '.64rem', color: totalAnggota > 0 ? 'var(--green)' : 'var(--muted)', fontWeight: 700 }}>
                  {totalAnggota > 0 ? '🛡️ Siaga Patroli & Poskamling' : 'Belum ada anggota'}
                </div>
              </div>
            </div>
            {Object.keys(kategoriCounts).length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(Object.keys(kategoriCounts).length, 3)}, 1fr)`, gap: '7px', textAlign: 'center' }}>
                {Object.entries(kategoriCounts).slice(0, 3).map(([unitName, count]) => (
                  <div key={unitName} style={{ padding: '7px 5px', background: 'var(--bg)', borderRadius: '7px', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '.6rem', color: 'var(--muted)', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{unitName}</div>
                    <div style={{ fontSize: '.84rem', fontWeight: 800, color: 'var(--blue)' }}>{count}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
};

export default Dashboard;
