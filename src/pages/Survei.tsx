import { 
  BarChart3, 
  Inbox, 
  MessageSquare, 
  Star, 
  AlertTriangle, 
  Smile, 
  Award, 
  ThumbsUp, 
  ShieldCheck, 
  ChevronLeft, 
  ChevronRight, 
  MessageCircle,
  ThumbsDown
} from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../App';
import { esc, isMobileView } from '../utils/helpers';
import { SurveiSkeleton } from '../components/SkeletonPages';

// Firebase imports
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot } from 'firebase/firestore';
import { Chart } from 'chart.js/auto';

interface SurveyResponse {
  id: string;
  nama: string;
  pekerjaan: string;
  kemudahan: number;
  kegunaan: number;
  kecepatan: number;
  keakuratan: number;
  rekomendasi: number;
  saran: string;
  timestamp?: any;
  createdAt: string;
}

// Inisialisasi Firebase
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

export const Survei: React.FC = () => {
  const { triggerToast } = useApp();
  const [surveyList, setSurveyList] = useState<SurveyResponse[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

  const toggleCard = (id: string) => {
    setExpandedCards(prev => ({ ...prev, [id]: !prev[id] }));
  };
  
  // Charts references
  const radarChartRef = useRef<HTMLCanvasElement>(null);
  const barChartRef = useRef<HTMLCanvasElement>(null);
  const radarChartInstance = useRef<any>(null);
  const barChartInstance = useRef<any>(null);

  // Pagination for feedback/saran
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  // Listen to Firestore real-time updates for survey
  useEffect(() => {
    if (!db) {
      setIsFetching(false);
      return;
    }

    setIsFetching(true);
    const colRef = collection(db, 'survey_kepuasan');
    
    const unsubscribe = onSnapshot(
      colRef,
      (snapshot) => {
        const list: SurveyResponse[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          list.push({
            id: docSnap.id,
            nama: data.nama || '',
            pekerjaan: data.pekerjaan || '',
            kemudahan: Number(data.kemudahan || 0),
            kegunaan: Number(data.kegunaan || 0),
            kecepatan: Number(data.kecepatan || 0),
            keakuratan: Number(data.keakuratan || 0),
            rekomendasi: Number(data.rekomendasi || 0),
            saran: data.saran || '',
            createdAt: data.createdAt || '',
          });
        });

        // Sort by date/createdAt desc
        list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

        setSurveyList(list);
        setIsFetching(false);
      },
      (error) => {
        console.error('Error onSnapshot survey:', error);
        triggerToast('Gagal memuat data survei.', 'er');
        setIsFetching(false);
      }
    );

    return () => unsubscribe();
  }, [triggerToast]);

  // Calculate Metrics
  const totalResponses = surveyList.length;
  
  const getAverage = (key: keyof Omit<SurveyResponse, 'id' | 'saran' | 'createdAt' | 'timestamp'>) => {
    if (totalResponses === 0) return 0;
    const sum = surveyList.reduce((acc, curr) => acc + (curr[key] as number), 0);
    return Number((sum / totalResponses).toFixed(2));
  };

  const avgKemudahan = getAverage('kemudahan');
  const avgKegunaan = getAverage('kegunaan');
  const avgKecepatan = getAverage('kecepatan');
  const avgKeakuratan = getAverage('keakuratan');
  const avgRekomendasi = getAverage('rekomendasi');

  const overallAverage = Number(
    ((avgKemudahan + avgKegunaan + avgKecepatan + avgKeakuratan + avgRekomendasi) / 5).toFixed(2)
  );

  // Identify highest and lowest
  const metrics = [
    { label: 'Kemudahan Sistem', val: avgKemudahan, icon: <Smile className="w-4 h-4 text-blue-500" /> },
    { label: 'Kemanfaatan Fitur', val: avgKegunaan, icon: <Award className="w-4 h-4 text-emerald-500" /> },
    { label: 'Kecepatan Respon', val: avgKecepatan, icon: <ThumbsUp className="w-4 h-4 text-purple-500" /> },
    { label: 'Keakuratan Data', val: avgKeakuratan, icon: <ShieldCheck className="w-4 h-4 text-amber-500" /> },
    { label: 'Rekomendasi Layanan', val: avgRekomendasi, icon: <ThumbsUp className="w-4 h-4 text-indigo-500" /> },
  ];

  const sortedMetrics = [...metrics].sort((a, b) => b.val - a.val);
  const highestMetric = totalResponses > 0 ? sortedMetrics[0] : null;
  const lowestMetric = totalResponses > 0 ? sortedMetrics[sortedMetrics.length - 1] : null;

  // Render Charts — must be before any early return (Rules of Hooks)
  useEffect(() => {
    if (isFetching || totalResponses === 0) return;

    // Destroy existing charts
    if (radarChartInstance.current) radarChartInstance.current.destroy();
    if (barChartInstance.current) barChartInstance.current.destroy();

    const isDark = document.body.classList.contains('dark-mode');
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';
    const textColor = isDark ? '#e2e8f0' : '#0f172a';

    // 1. Radar Chart Setup
    if (radarChartRef.current) {
      const ctx = radarChartRef.current.getContext('2d');
      if (ctx) {
        radarChartInstance.current = new Chart(ctx, {
          type: 'radar',
          data: {
            labels: ['Kemudahan', 'Kemanfaatan', 'Kecepatan', 'Keakuratan', 'Rekomendasi'],
            datasets: [{
              label: 'Skor Kepuasan Rata-rata',
              data: [avgKemudahan, avgKegunaan, avgKecepatan, avgKeakuratan, avgRekomendasi],
              backgroundColor: isDark ? 'rgba(99, 102, 241, 0.22)' : 'rgba(99, 102, 241, 0.12)',
              borderColor: '#6366f1',
              borderWidth: 2,
              pointBackgroundColor: '#6366f1',
              pointBorderColor: '#fff',
              pointHoverBackgroundColor: '#fff',
              pointHoverBorderColor: '#6366f1',
              pointRadius: 4,
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              r: {
                angleLines: { color: gridColor },
                grid: { color: gridColor },
                pointLabels: { color: textColor, font: { family: 'DM Sans', weight: 'bold', size: 10 } },
                suggestedMin: 0,
                suggestedMax: 5,
                ticks: { stepSize: 1, color: isDark ? '#64748b' : '#94a3b8', backdropColor: 'transparent' }
              }
            }
          }
        });
      }
    }

    // 2. Bar Chart Setup
    if (barChartRef.current) {
      const ctx = barChartRef.current.getContext('2d');
      if (ctx) {
        barChartInstance.current = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: ['Kemudahan', 'Kemanfaatan', 'Kecepatan', 'Keakuratan', 'Rekomendasi'],
            datasets: [{
              label: 'Skor Rata-rata',
              data: [avgKemudahan, avgKegunaan, avgKecepatan, avgKeakuratan, avgRekomendasi],
              backgroundColor: [
                'rgba(59, 130, 246, 0.75)',
                'rgba(16, 185, 129, 0.75)',
                'rgba(139, 92, 246, 0.75)',
                'rgba(245, 158, 11, 0.75)',
                'rgba(99, 102, 241, 0.75)'
              ],
              borderRadius: 6,
              borderWidth: 0,
              barThickness: 24,
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              x: {
                grid: { display: false },
                ticks: { color: textColor, font: { family: 'DM Sans', size: 9, weight: 600 } }
              },
              y: {
                grid: { color: gridColor },
                suggestedMin: 0,
                suggestedMax: 5,
                ticks: { stepSize: 1, color: isDark ? '#64748b' : '#94a3b8' }
              }
            }
          }
        });
      }
    }

    return () => {
      if (radarChartInstance.current) radarChartInstance.current.destroy();
      if (barChartInstance.current) barChartInstance.current.destroy();
    };
  }, [isFetching, totalResponses, avgKemudahan, avgKegunaan, avgKecepatan, avgKeakuratan, avgRekomendasi]);

  if (isFetching && totalResponses === 0) {
    return <SurveiSkeleton />;
  }

  const feedbackList = surveyList.filter(s => s.saran.trim() !== '');
  const totalFeedback = feedbackList.length;
  const totalPages = Math.max(1, Math.ceil(totalFeedback / ITEMS_PER_PAGE));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, totalFeedback);
  const currentFeedback = feedbackList.slice(startIndex, endIndex);

  // Helper to format ISO date to readable local date
  const formatTanggal = (isoStr: string) => {
    if (!isoStr) return '—';
    try {
      const d = new Date(isoStr);
      const pad = (n: number) => String(n).padStart(2, '0');
      const dd = pad(d.getDate());
      const mm = pad(d.getMonth() + 1);
      const yyyy = d.getFullYear();
      const hh = pad(d.getHours());
      const min = pad(d.getMinutes());
      return `${dd}-${mm}-${yyyy} ${hh}:${min} WIB`;
    } catch {
      return isoStr;
    }
  };

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
        <ChevronLeft className="w-4 h-4 inline-block align-middle" />
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
        <ChevronRight className="w-4 h-4 inline-block align-middle" />
      </button>
    );

    return btns;
  };

  if (!isFirebaseConfigured) {
    return (
      <div className="fu">
        <div className="panel" style={{ padding: '24px', textAlign: 'center' }}>
          <AlertTriangle className="w-12 h-12 mx-auto text-[var(--amber)] mb-4" />
          <h2>Firebase Belum Dikonfigurasi</h2>
          <p style={{ color: 'var(--muted)', marginTop: '8px', maxWidth: '480px', margin: '8px auto 0' }}>
            Silakan lengkapi konfigurasi Firebase pada file <code>.env</code> Anda untuk melihat dashboard evaluasi kepuasan.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fu">
      {/* Summary Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3" style={{ marginBottom: '0.75rem' }}>
        {/* Total Responden */}
        <div className="scard cb">
          <div className="sico"><Inbox className="w-5 h-5" /></div>
          <div className="scard-text"><div className="snum">{totalResponses}</div><div className="slbl">Total Responden</div></div>
        </div>

        {/* Skor Rata-rata */}
        <div className="scard cp">
          <div className="sico"><Star className="w-5 h-5 text-amber-500 fill-amber-500" /></div>
          <div className="scard-text"><div className="snum">{totalResponses > 0 ? overallAverage : '0'}</div><div className="slbl">Indeks Kepuasan Rata-rata</div></div>
        </div>

        {/* Tertinggi */}
        <div className="scard cg">
          <div className="sico">
            <ThumbsUp className="w-4 h-4 inline-block align-middle" />
          </div>
          <div className="scard-text">
            <div className="snum" style={{ fontSize: '1rem' }}>
              {highestMetric ? highestMetric.val : '—'}
            </div>
            <div className="slbl">Kinerja Tertinggi{highestMetric ? ` (${highestMetric.label.split(' ')[0]})` : ''}</div>
          </div>
        </div>

        {/* Terendah */}
        <div className="scard cr">
          <div className="sico">
            <ThumbsDown className="w-4 h-4 inline-block align-middle" />
          </div>
          <div className="scard-text">
            <div className="snum" style={{ fontSize: '1rem' }}>
              {lowestMetric ? lowestMetric.val : '—'}
            </div>
            <div className="slbl">Kinerja Terendah{lowestMetric ? ` (${lowestMetric.label.split(' ')[0]})` : ''}</div>
          </div>
        </div>
      </div>

      {totalResponses === 0 ? (
        <div className="panel" style={{ padding: '40px', textAlign: 'center' }}>
          <Inbox className="w-12 h-12 mx-auto text-slate-400 opacity-30 mb-4" />
          <h3 className="text-lg font-bold text-slate-200">Belum Ada Data Survei</h3>
          <p className="text-slate-400 text-xs mt-2 max-w-sm mx-auto">
            Hasil evaluasi dan survei kepuasan masyarakat akan muncul di sini setelah adanya pengisian survei.
          </p>
        </div>
      ) : (
        <>
          {/* Charts Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-6 mb-3 lg:mb-6">
            
            {/* Radar Chart Panel */}
            <div className="panel flex flex-col">
              <div className="phd">
                <span className="ptl">
                  <BarChart3 className="w-4 h-4 inline-block align-middle" /> Analisis Spektrum Kepuasan
                </span>
                <span style={{ fontSize: '.64rem', color: 'var(--muted)' }}>
                  Perbandingan performa 7 aspek kuisioner (Skala 1-5)
                </span>
              </div>
              <div className="p-4 flex-1 min-h-[320px] relative flex items-center justify-center">
                <canvas ref={radarChartRef} className="w-full h-full" />
              </div>
            </div>

            {/* Bar Chart Panel */}
            <div className="panel flex flex-col">
              <div className="phd">
                <span className="ptl">
                  <BarChart3 className="w-4 h-4 inline-block align-middle" /> Distribusi Skor Kategori
                </span>
                <span style={{ fontSize: '.64rem', color: 'var(--muted)' }}>
                  Pencapaian skor rata-rata masing-masing indikator
                </span>
              </div>
              <div className="p-4 flex-1 min-h-[320px] relative flex items-center justify-center">
                <canvas ref={barChartRef} className="w-full h-full" />
              </div>
            </div>

          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 lg:gap-6">
            {/* Detail Ratings Table */}
            <div className="panel lg:col-span-1 flex flex-col">
              <div className="phd">
                <span className="ptl">
                  <Award className="w-4 h-4 inline-block align-middle" /> Rincian Skor
                </span>
              </div>
              <div className="flex-1" style={{ padding: '14px 16px' }}>
                <div className="space-y-4">
                  {metrics.map((m, i) => (
                    <div key={i} className="flex items-center justify-between pb-4 border-b border-slate-800/40 last:border-none last:pb-0">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center shrink-0">
                          {m.icon}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-250 leading-none">{m.label}</p>
                          <span style={{ fontSize: '0.62rem', color: 'var(--muted)' }}>Skala 1-5</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-slate-100">{m.val}</div>
                        <div style={{ display: 'flex', gap: '2px', justifyContent: 'flex-end', marginTop: '2px' }}>
                          {[1, 2, 3, 4, 5].map(starVal => (
                            <Star 
                              key={starVal} 
                              className={`w-2 h-2 ${
                                starVal <= Math.round(m.val) 
                                  ? 'text-amber-500 fill-amber-500' 
                                  : 'text-slate-700'
                              }`} 
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Citizens Feedback panel */}
            <div className="panel lg:col-span-2 flex flex-col">
              <div className="phd">
                <span className="ptl">
                  <MessageSquare className="w-4 h-4 inline-block align-middle" /> Saran &amp; Masukan Warga
                </span>
                <span style={{ fontSize: '.64rem', color: 'var(--muted)' }}>
                  Total masukan: {totalFeedback}
                </span>
              </div>
              
              <div className="flex-1 flex flex-col justify-between" style={{ padding: '0px' }}>
                <div className="divide-y divide-slate-800/50">
                  {feedbackList.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 text-xs">

                      <MessageCircle className="w-6 h-6 mx-auto opacity-20 mb-2" />
                      Tidak ada saran teks yang tertulis.
                    </div>
                  ) : (
                    currentFeedback.map((fb, idx) => (
                      <div key={fb.id} className="flex flex-col gap-3 hover:bg-slate-850/20 transition-colors" style={{ padding: '16px 18px', borderBottom: '1px solid var(--border)' }}>
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] text-blue-450 dark:text-blue-400 font-bold bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                              {fb.nama || `Responden #${totalResponses - (startIndex + idx)}`}
                            </span>
                            {fb.pekerjaan && (
                              <span className="text-[10px] text-slate-400 font-medium bg-slate-800/60 px-2 py-0.5 rounded border border-slate-700/40">
                                {fb.pekerjaan}
                              </span>
                            )}
                            <span className="text-[10px] text-slate-500 font-semibold">
                              {formatTanggal(fb.createdAt)}
                            </span>
                          </div>
                          <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map(sv => {
                              const overallRowAvg = (fb.kemudahan + fb.kegunaan + fb.kecepatan + fb.keakuratan + fb.rekomendasi) / 5;
                              return (
                                <Star 
                                  key={sv} 
                                  className={`w-2.5 h-2.5 ${
                                    sv <= Math.round(overallRowAvg) 
                                      ? 'text-amber-500 fill-amber-500' 
                                      : 'text-slate-700'
                                  }`} 
                                />
                              );
                            })}
                          </div>
                        </div>
                        <p className="text-[12px] text-slate-300 italic leading-relaxed pl-2 border-l-2 border-slate-700/60" style={{ marginTop: '2px' }}>
                          "{esc(fb.saran)}"
                        </p>
                      </div>
                    ))
                  )}
                </div>

                {/* Pagination */}
                <div className="pgw" style={{ padding: '12px 14px', borderTop: '1px solid var(--border)' }}>
                  <span>
                    {totalFeedback === 0
                      ? 'Tidak ada masukan tertulis'
                      : `Menampilkan ${startIndex + 1}–${endIndex} dari ${totalFeedback} masukan`}
                  </span>
                  <div className="pbs">{renderPaginationButtons()}</div>
                </div>
              </div>
            </div>
          </div>
          {/* Respondents Table */}
          <div className="panel mt-3 lg:mt-6">
            <div className="phd">
              <span className="ptl">
                <Inbox className="w-4 h-4 inline-block align-middle" /> Data Responden
              </span>
              <span style={{ fontSize: '.64rem', color: 'var(--muted)' }}>
                {totalResponses} responden
              </span>
            </div>
            <div className="twrap" style={{ display: isMobileView() ? 'none' : 'block' }}>
              <table className="dtbl dtbl-sp" style={{ minWidth: '780px' }}>
                <thead>
                  <tr>
                    <th style={{ width: '36px', textAlign: 'center' }}>#</th>
                    <th style={{ minWidth: '130px' }}>Nama</th>
                    <th style={{ minWidth: '120px' }}>Pekerjaan</th>
                    <th style={{ width: '52px', textAlign: 'center' }}>Mud.</th>
                    <th style={{ width: '52px', textAlign: 'center' }}>Guna</th>
                    <th style={{ width: '52px', textAlign: 'center' }}>Cepat</th>
                    <th style={{ width: '60px', textAlign: 'center' }}>Akurat</th>
                    <th style={{ width: '52px', textAlign: 'center' }}>Rekm.</th>
                    <th style={{ minWidth: '150px' }}>Tanggal</th>
                    <th style={{ minWidth: '180px' }}>Saran</th>
                  </tr>
                </thead>
                <tbody>
                  {surveyList.map((s, i) => (
                    <tr key={s.id}>
                      <td style={{ textAlign: 'center', color: 'var(--muted)' }}>{totalResponses - i}</td>
                      <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{s.nama || '—'}</td>
                      <td style={{ color: 'var(--mid)', whiteSpace: 'nowrap' }}>{s.pekerjaan || '—'}</td>
                      <td style={{ textAlign: 'center', color: '#f59e0b', fontWeight: 700 }}>{s.kemudahan}</td>
                      <td style={{ textAlign: 'center', color: '#f59e0b', fontWeight: 700 }}>{s.kegunaan}</td>
                      <td style={{ textAlign: 'center', color: '#f59e0b', fontWeight: 700 }}>{s.kecepatan}</td>
                      <td style={{ textAlign: 'center', color: '#f59e0b', fontWeight: 700 }}>{s.keakuratan}</td>
                      <td style={{ textAlign: 'center', color: '#f59e0b', fontWeight: 700 }}>{s.rekomendasi}</td>
                      <td style={{ color: 'var(--muted)', whiteSpace: 'nowrap', fontSize: '.7rem' }}>{formatTanggal(s.createdAt)}</td>
                      <td style={{ color: 'var(--mid)', maxWidth: '220px' }} className="truncate">{s.saran || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="mcard-list" style={{ display: isMobileView() ? 'block' : 'none', padding: '0 12px' }}>
              {surveyList.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs">
                  <Inbox className="w-8 h-8 opacity-[0.14] mx-auto mb-2 block" />
                  <p>Tidak ada data responden.</p>
                </div>
              ) : (
                surveyList.map((s, i) => {
                  const isExpanded = !!expandedCards[s.id];
                  return (
                    <div
                      key={s.id}
                      className="mcard-item"
                      style={{ padding: '14px', marginBottom: '12px', cursor: 'pointer' }}
                      onClick={() => toggleCard(s.id)}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 750, fontSize: '.8rem', color: 'var(--text)' }}>
                          {s.nama || '—'}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '.68rem', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
                            #{totalResponses - i}
                          </span>
                          <ChevronRight
                            className="w-4 h-4 text-[var(--muted)]"
                            style={{
                              transform: isExpanded ? 'rotate(90deg)' : 'none',
                              transition: 'transform 0.2s ease',
                              flexShrink: 0
                            }}
                          />
                        </div>
                      </div>

                      {isExpanded && (
                        <div
                          style={{
                            marginTop: '10px',
                            paddingTop: '10px',
                            borderTop: '1px solid var(--border)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px'
                          }}
                        >
                          {s.pekerjaan && (
                            <div style={{ fontSize: '.72rem', color: 'var(--mid)' }}>
                              <strong>Pekerjaan:</strong> {s.pekerjaan}
                            </div>
                          )}

                          {/* Ratings grid */}
                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(5, 1fr)',
                              gap: '4px',
                              background: 'var(--bg)',
                              padding: '6px 8px',
                              borderRadius: '6px',
                              textAlign: 'center'
                            }}
                          >
                            <div>
                              <div style={{ fontSize: '.58rem', color: 'var(--muted)', fontWeight: 700 }}>MUD</div>
                              <div style={{ fontSize: '.76rem', fontWeight: 850, color: '#f59e0b', marginTop: '2px' }}>{s.kemudahan}</div>
                            </div>
                            <div>
                              <div style={{ fontSize: '.58rem', color: 'var(--muted)', fontWeight: 700 }}>GUNA</div>
                              <div style={{ fontSize: '.76rem', fontWeight: 850, color: '#f59e0b', marginTop: '2px' }}>{s.kegunaan}</div>
                            </div>
                            <div>
                              <div style={{ fontSize: '.58rem', color: 'var(--muted)', fontWeight: 700 }}>CPT</div>
                              <div style={{ fontSize: '.76rem', fontWeight: 850, color: '#f59e0b', marginTop: '2px' }}>{s.kecepatan}</div>
                            </div>
                            <div>
                              <div style={{ fontSize: '.58rem', color: 'var(--muted)', fontWeight: 700 }}>AKR</div>
                              <div style={{ fontSize: '.76rem', fontWeight: 850, color: '#f59e0b', marginTop: '2px' }}>{s.keakuratan}</div>
                            </div>
                            <div>
                              <div style={{ fontSize: '.58rem', color: 'var(--muted)', fontWeight: 700 }}>RKM</div>
                              <div style={{ fontSize: '.76rem', fontWeight: 850, color: '#f59e0b', marginTop: '2px' }}>{s.rekomendasi}</div>
                            </div>
                          </div>

                          {s.saran && (
                            <p
                              style={{
                                fontSize: '.72rem',
                                color: 'var(--text)',
                                background: 'rgba(30, 111, 217, 0.05)',
                                padding: '8px 10px',
                                borderRadius: '6px',
                                borderLeft: '2px solid var(--blue)',
                                margin: 0,
                                fontStyle: 'italic'
                              }}
                            >
                              "{s.saran}"
                            </p>
                          )}

                          <div style={{ fontSize: '.64rem', color: 'var(--muted)', textAlign: 'right' }}>
                            {formatTanggal(s.createdAt)}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Survei;
