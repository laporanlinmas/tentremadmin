import React from 'react';

/* ─── Primitive Blocks ─────────────────────────────── */
const Sk: React.FC<{ className?: string; style?: React.CSSProperties }> = ({ className = '', style }) => (
  <div className={`skeleton rounded-lg ${className}`} style={style} />
);

/* ─── 1. DASHBOARD ─────────────────────────────────── */
export const DashboardSkeleton: React.FC = () => (
  <div className="flex flex-col gap-2">
    {/* Clock Panel Skeleton */}
    <div className="dash-clock-panel bg-[var(--card)] border border-[var(--border)] rounded-[var(--r)] mb-4 flex items-center justify-between gap-6 shadow-sm" style={{ minHeight: '72px', padding: '16px 20px' }}>
      <div className="flex items-center gap-4 flex-1">
        <div className="flex items-baseline gap-1">
          <Sk className="h-10 w-14 md:h-12 md:w-16" />
          <div className="text-[var(--blue)] mx-1">:</div>
          <Sk className="h-10 w-14 md:h-12 md:w-16" />
          <div className="hidden md:flex items-baseline gap-1 ml-1.5">
            <div className="text-[var(--muted)]">:</div>
            <Sk className="h-6 w-10" />
          </div>
        </div>
        <div className="hidden sm:block w-px h-10 bg-[var(--border)] mx-2" />
        <div className="hidden sm:flex flex-col gap-1.5">
          <Sk className="h-4 w-32" />
          <Sk className="h-3 w-20" />
        </div>
      </div>
      <div className="flex flex-col items-end gap-1.5">
        <Sk className="h-3 w-20" />
        <Sk className="h-4 w-28" />
      </div>
    </div>

    {/* Metrics Summary Cards (6 cards) */}
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 mb-4">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="scard">
          <div className="sico"><Sk className="h-4 w-4 rounded-full" /></div>
          <div className="scard-text">
            <Sk className="h-7 w-12 mb-1.5" />
            <Sk className="h-3 w-20" />
          </div>
        </div>
      ))}
    </div>

    {/* Charts Panels - Row 1 */}
    <div className="cg2">
      <div className="panel" style={{ marginBottom: 0 }}>
        <div className="phd">
          <Sk className="h-4 w-32" />
        </div>
        <div className="pbd flex items-end gap-3 p-6 h-[300px]">
          {[...Array(7)].map((_, i) => (
            <Sk key={i} className="flex-1 rounded-t-lg" style={{ height: `${30 + i * 10}%` }} />
          ))}
        </div>
      </div>
      <div className="panel" style={{ marginBottom: 0 }}>
        <div className="phd">
          <Sk className="h-4 w-28" />
        </div>
        <div className="pbd flex gap-5 p-5 items-center">
          <Sk className="h-28 w-28 rounded-full shrink-0" />
          <div className="flex-1 flex flex-col gap-2.5">
            {[...Array(4)].map((_, i) => <Sk key={i} className="h-3 w-full" />)}
          </div>
        </div>
      </div>
    </div>

    {/* Charts Panels - Row 2 */}
    <div className="cg2" style={{ marginTop: '0px' }}>
      <div className="panel" style={{ marginBottom: 0 }}>
        <div className="phd">
          <Sk className="h-4 w-40" />
        </div>
        <div className="pbd flex items-end gap-3 p-6 h-[300px]">
          {[...Array(12)].map((_, i) => (
            <Sk key={i} className="flex-1" style={{ height: `${20 + (i % 5) * 15}%` }} />
          ))}
        </div>
      </div>
      <div className="panel" style={{ marginBottom: 0 }}>
        <div className="phd">
          <Sk className="h-4 w-36" />
        </div>
        <div className="pbd flex gap-5 p-5 items-center h-[300px]">
          <Sk className="h-32 w-32 rounded-full shrink-0" />
          <div className="flex-1 flex flex-col gap-2.5">
            {[...Array(4)].map((_, i) => <Sk key={i} className="h-3 w-full" />)}
          </div>
        </div>
      </div>
    </div>
  </div>
);

/* ─── 2. DATA SATLINMAS ─────────────────────────────── */
export const SatlinmasSkeleton: React.FC = () => (
  <div className="fu">
    <div className="fbar">
      <div className="fsrch" style={{ flex: '2 1 180px' }}>
        <Sk className="h-9 w-full rounded-md" />
      </div>
      <div style={{ display: 'flex', gap: '6px', flex: '1 1 160px', alignItems: 'center' }}>
        <Sk className="h-9 flex-1 rounded-md min-w-[100px]" />
        <Sk className="h-9 w-10 rounded-md shrink-0" />
      </div>
      <Sk className="h-9 w-20 rounded-md shrink-0" />
    </div>
    <div className="ag-grid" style={{ padding: '12px' }}>
      {[...Array(12)].map((_, i) => (
        <div key={i} className="ag-card">
          <Sk className="ag-av h-14 w-14 rounded-full mx-auto" />
          <div className="ag-info flex flex-col items-center gap-2 mt-3">
            <Sk className="h-4 w-[80%] rounded" />
            <Sk className="h-3 w-[60%] rounded" />
            <div className="ag-meta flex justify-center gap-2 mt-2">
              <Sk className="h-5 w-14 rounded-full" />
              <Sk className="h-5 w-20 rounded-full" />
            </div>
          </div>
          <div style={{ position: 'absolute', top: '12px', right: '12px', display: 'flex', gap: '5px' }}>
            <Sk className="h-7 w-7 rounded" />
            <Sk className="h-7 w-7 rounded" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

/* ─── 4. PETA TUGUREJO ──────────────────────────────── */
export const PetaSkeleton: React.FC = () => (
  <div className="relative w-full rounded-xl overflow-hidden border border-[var(--border)] bg-[var(--card)]" style={{ height: 'calc(100vh - 96px)' }}>
    {/* Map area */}
    <Sk className="h-full w-full" style={{ borderRadius: 0 }} />
    {/* Right toolbar */}
    <div className="absolute top-14 right-3 z-10 flex flex-col gap-1.5">
      {[...Array(5)].map((_, i) => <Sk key={i} className="h-8 w-8 rounded-lg" />)}
    </div>
  </div>
);

/* ─── 8. PENGATURAN ─────────────────────────────────── */
export const PengaturanSkeleton: React.FC = () => (
  <div className="flex flex-col gap-0">
    {[...Array(7)].map((_, i) => (
      <div key={i} className="panel" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
            <Sk className="h-4 w-4 rounded shrink-0" />
            <Sk className="h-3.5 rounded" style={{ width: `${90 + i * 18}px` }} />
          </div>
          <Sk className="h-4 w-4 rounded shrink-0" />
        </div>
      </div>
    ))}
  </div>
);

/* ─── 11. PRAKIRAAN CUACA ────────────────────────────── */
export const CuacaSkeleton: React.FC = () => (
  <div className="fu flex flex-col gap-4 p-4 max-w-6xl mx-auto">
    <div className="flex items-center justify-between">
      <div className="flex flex-col gap-2">
        <Sk className="h-6 w-48" />
        <Sk className="h-4 w-72" />
      </div>
      <Sk className="h-9 w-28 rounded-lg" />
    </div>
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 flex flex-col md:flex-row gap-6 items-center justify-between">
      <div className="flex items-center gap-5">
        <Sk className="h-20 w-20 rounded-2xl shrink-0" />
        <div className="flex flex-col gap-2">
          <Sk className="h-10 w-24" />
          <Sk className="h-5 w-36" />
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full md:w-auto">
        {[...Array(4)].map((_, i) => (
          <Sk key={i} className="h-16 w-24 rounded-xl" />
        ))}
      </div>
    </div>
    <div className="flex gap-2">
      <Sk className="h-10 w-32 rounded-xl" />
      <Sk className="h-10 w-32 rounded-xl" />
      <Sk className="h-10 w-32 rounded-xl" />
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <Sk className="h-4 w-16" />
            <Sk className="h-6 w-6 rounded-full" />
          </div>
          <Sk className="h-8 w-20" />
          <Sk className="h-3 w-28" />
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[var(--border)]">
            <Sk className="h-3 w-16" />
            <Sk className="h-3 w-16" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

/* ─── 12. ADUAN ───────────────────────────────────────── */
export const AduanSkeleton: React.FC = () => (
  <div className="fu">
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3" style={{ marginBottom: '2rem' }}>
      {[...Array(4)].map((_, i) => (
        <div key={i} className="scard cb">
          <div className="sico"><Sk className="h-5 w-5 rounded-full" /></div>
          <div className="scard-text">
            <Sk className="h-6 w-12 mb-1" />
            <Sk className="h-3 w-20" />
          </div>
        </div>
      ))}
    </div>
    <div className="panel">
      <div className="phd">
        <Sk className="h-4 w-40" />
        <Sk className="h-2 w-32 mt-1" />
      </div>
      <div className="fbar">
        <div className="fsrch" style={{ flex: '2 1 180px' }}>
          <Sk className="h-9 w-full rounded-md" />
        </div>
        <Sk className="h-9 flex-[1_1_120px] rounded-md min-w-[120px]" />
        <Sk className="h-9 w-10 rounded-md shrink-0" />
      </div>
      <div className="rtbl-wrap hidden md:block">
        <table className="dtbl dtbl-sp">
          <thead>
            <tr>
              {[5, 15, 15, 15, 10, 15, 10, 5, 10].map((w, i) => (
                <th key={i} style={{ width: `${w}%` }}><Sk className="h-3 w-full rounded" /></th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...Array(6)].map((_, i) => (
              <tr key={i}>
                {[5, 15, 15, 15, 10, 15, 10, 5, 10].map((w, j) => (
                  <td key={j}><Sk className="h-3 w-full rounded" /></td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mcard-list md:hidden">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="mcard-item" style={{ padding: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <Sk className="h-4 w-24" />
              <Sk className="h-5 w-16 rounded-full" />
            </div>
            <div style={{ marginBottom: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <Sk className="h-3 w-32" />
              <Sk className="h-3 w-40" />
              <Sk className="h-3 w-[90%]" />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
              <Sk className="h-8 w-8 rounded" />
              <Sk className="h-8 w-16 rounded" />
            </div>
          </div>
        ))}
      </div>
      <div className="pgw" style={{ padding: '14px' }}>
        <Sk className="h-3 w-32" />
        <div className="pbs flex gap-1">
          {[...Array(4)].map((_, i) => <Sk key={i} className="h-7 w-7 rounded" />)}
        </div>
      </div>
    </div>
  </div>
);

/* ─── 13. SURVEI ───────────────────────────────────────── */
export const SurveiSkeleton: React.FC = () => (
  <div className="fu">
    {/* Summary Metrics Cards */}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3" style={{ marginBottom: '0.75rem' }}>
      {[...Array(4)].map((_, i) => (
        <div key={i} className="scard cb">
          <div className="sico"><Sk className="h-4 w-4 rounded-full" /></div>
          <div className="scard-text">
            <Sk className="h-6 w-12 mb-1" />
            <Sk className="h-3 w-20" />
          </div>
        </div>
      ))}
    </div>

    {/* Charts Layout */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-6 mb-3 lg:mb-6">
      <div className="panel flex flex-col h-[380px]">
        <div className="phd"><Sk className="h-4 w-40" /></div>
        <div className="p-4 flex-1 flex items-center justify-center"><Sk className="h-60 w-60 rounded-full" /></div>
      </div>
      <div className="panel flex flex-col h-[380px]">
        <div className="phd"><Sk className="h-4 w-32" /></div>
        <div className="p-4 flex-1 flex items-end gap-3"><Sk className="h-10 w-full" /></div>
      </div>
    </div>

    {/* Ratings & Feedback Grid */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 lg:gap-6">
      {/* Rincian Skor */}
      <div className="panel lg:col-span-1 flex flex-col">
        <div className="phd"><Sk className="h-4 w-24" /></div>
        <div className="flex-1 p-4 flex flex-col gap-4">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="flex justify-between items-center pb-4 border-b border-slate-800/40 last:border-none last:pb-0">
              <div className="flex items-center gap-3">
                <Sk className="h-8 w-8 rounded-lg" />
                <div className="flex flex-col gap-1"><Sk className="h-3 w-24" /><Sk className="h-2 w-12" /></div>
              </div>
              <Sk className="h-4 w-8" />
            </div>
          ))}
        </div>
      </div>

      {/* Saran & Masukan Warga */}
      <div className="panel lg:col-span-2 flex flex-col">
        <div className="phd"><Sk className="h-4 w-32" /></div>
        <div className="flex-1 flex flex-col divide-y divide-slate-800/50">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="p-4 flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <div className="flex gap-2"><Sk className="h-4 w-16" /><Sk className="h-4 w-12" /><Sk className="h-3 w-16" /></div>
                <Sk className="h-3 w-16" />
              </div>
              <Sk className="h-3 w-full" />
            </div>
          ))}
        </div>
      </div>
    </div>

    {/* Data Responden Table */}
    <div className="panel mt-3 lg:mt-6">
      <div className="phd"><Sk className="h-4 w-28" /></div>
      <div className="p-4 flex flex-col gap-3">
        <Sk className="h-8 w-full rounded" />
        <Sk className="h-8 w-full rounded" />
        <Sk className="h-8 w-full rounded" />
      </div>
    </div>
  </div>
);

/* ─── 14. BERITA ───────────────────────────────────────── */
export const BeritaSkeleton: React.FC = () => (
  <div className="fu">
    {/* Summary Metrics Cards */}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3" style={{ marginBottom: '1.5rem' }}>
      {[...Array(4)].map((_, i) => (
        <div key={i} className="scard cb">
          <div className="sico"><Sk className="h-5 w-5 rounded-full" /></div>
          <div className="scard-text">
            <Sk className="h-6 w-12 mb-1" />
            <Sk className="h-3 w-24" />
          </div>
        </div>
      ))}
    </div>

    {/* Filter and Action Bar */}
    <div className="panel" style={{ marginBottom: '1.5rem' }}>
      <div className="fbar">
        <div className="fsrch" style={{ flex: '2 1 200px' }}>
          <Sk className="h-9 w-full rounded-md" />
        </div>
        <Sk className="h-9 flex-[1_1_140px] rounded-md min-w-[130px]" />
        <Sk className="h-9 flex-[1_1_120px] rounded-md min-w-[110px]" />
        <Sk className="h-9 w-28 rounded-md shrink-0" />
      </div>
    </div>

    {/* News Cards Grid */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="panel flex flex-col overflow-hidden" style={{ marginBottom: 0 }}>
          <Sk className="h-44 w-full" />
          <div className="p-4 flex-1 flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <Sk className="h-4 w-20 rounded-full" />
              <Sk className="h-3 w-16" />
            </div>
            <Sk className="h-5 w-full" />
            <Sk className="h-3 w-[90%]" />
            <Sk className="h-3 w-[75%]" />
            <div className="flex justify-between items-center pt-3 border-t border-[var(--border)] mt-auto">
              <Sk className="h-3 w-24" />
              <div className="flex gap-2">
                <Sk className="h-7 w-7 rounded" />
                <Sk className="h-7 w-7 rounded" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);


/* ─── REKAP LAPORAN ─────────────────────────────── */
export const RekapSkeleton: React.FC = () => (
  <div className="fu">
    <div className="panel">
      <div className="phd">
        <Sk className="h-4 w-32" />
        <div className="fbar-right"><Sk className="h-3 w-8" /></div>
      </div>
      <div className="fbar">
        <div className="fsrch" style={{ flex: '2 1 150px' }}><Sk className="h-9 w-full rounded-md" /></div>
        <div className="fbar-dates-row" style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: '3 1 200px' }}>
          <div className="fbar-dates" style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1 }}>
            <div style={{ flex: 1 }}><Sk className="h-9 w-full rounded-md" /></div>
            <div style={{ flex: 1 }}><Sk className="h-9 w-full rounded-md" /></div>
          </div>
          <Sk className="h-9 w-10 rounded-md shrink-0" />
        </div>
      </div>
      <div className="rtbl-wrap hidden md:block">
        <table className="dtbl" style={{ tableLayout: 'fixed' }}>
          <thead>
            <tr>
              {[5, 10, 10, 15, 20, 15, 10, 5, 10].map((w, i) => (
                <th key={i} style={{ width: `${w}%` }}><Sk className="h-3 w-full rounded" /></th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...Array(6)].map((_, i) => (
              <tr key={i}>
                {[5, 10, 10, 15, 20, 15, 10, 5, 10].map((w, j) => (
                  <td key={j}><Sk className="h-3 w-full rounded" /></td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mcard-list md:hidden">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="mcard-item">
            <div className="mcard-row">
              <Sk className="h-4 w-[60%]" />
              <Sk className="h-5 w-16 rounded-full" />
            </div>
            <div className="mcard-meta flex flex-col gap-2 mt-2">
              <Sk className="h-3 w-[80%]" />
              <Sk className="h-3 w-[90%]" />
              <Sk className="h-3 w-[50%]" />
            </div>
            <div className="mcard-acts flex gap-2 mt-3 pt-2 border-t border-[var(--border)]">
              <Sk className="h-6 w-16 rounded" />
            </div>
          </div>
        ))}
      </div>
      <div className="pgw">
        <Sk className="h-3 w-32" />
        <div className="pbs flex gap-1">
          {[...Array(4)].map((_, i) => <Sk key={i} className="h-7 w-7 rounded" />)}
        </div>
      </div>
    </div>
  </div>
);
