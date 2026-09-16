import { Menu, RefreshCw, Sun, Moon, Bell, BellRing } from 'lucide-react';
import React, { useState } from 'react';
import { useApp, useAuth, useTheme } from '../App';
import { useNotifications } from '../hooks/useRealtimeNotifications';

interface TopbarProps {
  onToggleMobileSidebar: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ onToggleMobileSidebar }) => {
  const { activeTab, setActiveTab, triggerRefresh, triggerToast } = useApp();
  const { session } = useAuth();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const { unreadAduanCount, permissionStatus, requestPermission, markAllAduanAsRead } = useNotifications();
  const [isSpinning, setIsSpinning] = useState(false);

  const handleRefresh = () => {
    setIsSpinning(true);
    triggerToast('Memuat ulang data...', 'inf');
    triggerRefresh();
    setTimeout(() => {
      setIsSpinning(false);
    }, 600);
  };

  const handleBellClick = () => {
    markAllAduanAsRead();
    if (permissionStatus !== 'granted') {
      requestPermission();
    }
    setActiveTab('ad');
    if (window.location.pathname !== '/aduan') {
      window.history.pushState(null, '', '/aduan');
    }
  };

  const getPageMeta = () => {
    switch (activeTab) {
      case 'db':
        return { title: 'Dashboard Tentrem', subtitle: 'Statistik & grafik visualisasi data sistem Tentrem' };
      case 'br':
        return { title: 'Berita & Warta Desa', subtitle: 'Manajemen publikasi artikel berita poskamling desa' };
      case 'rd':
        return { title: 'Jadwal Ronda', subtitle: 'Laporan, jadwal kelompok jaga, kontak darurat' };
      case 'ad':
        return { title: 'Aduan Warga', subtitle: 'Pengaduan masyarakat yang dikirim dari website Tentrem' };
      case 'sv':
        return { title: 'Survei Kepuasan Publik', subtitle: 'Kuesioner kritik saran & indeks kepuasan pelayanan desa' };
      case 'sl':
        return { title: 'Struktur Poskamling', subtitle: 'Bagan struktur organisasi dan direktori personil Poskamling' };
      case 'pt':
        return { title: 'Peta Geospasial Tugurejo', subtitle: 'Peta wilayah, batas desa & titik fasilitas, kamtibmas desa' };
      case 'inv':
        return { title: 'Inventaris Aset Poskamling', subtitle: 'Data aset dan perlengkapan poskamling desa' };
      case 'set':
        return { title: 'Pengaturan Sistem', subtitle: 'Konfigurasi akun, sistem, unit satlinmas & jadwal petugas' };
      case 'gl':
        return { title: 'Galeri Kegiatan', subtitle: 'Dokumentasi foto kegiatan siskamling dan kegiatan desa' };
      default:
        return { title: 'Dashboard Monitoring', subtitle: 'Statistik & grafik visualisasi data sistem Tentrem' };
    }
  };

  const { title, subtitle } = getPageMeta();

  const initials = session
    ? (session.namaLengkap || session.username || '?').charAt(0).toUpperCase()
    : '?';

  return (
    <div className="topb">
      <div className="tbl">
        <button className="hmb" onClick={onToggleMobileSidebar}>
          <Menu className="w-4 h-4 inline-block align-middle" />
        </button>
        <div>
          <div className="pgtl" id="pgtl">
            {title}
          </div>
          <div className="pgsb" id="pgsb">
            {subtitle}
          </div>
        </div>
      </div>
      <div className="tbr">
        {/* Tombol Notifikasi Realtime / FCM Bell */}
        <button
          id="notif-btn"
          className="tb-btn relative cursor-pointer"
          onClick={handleBellClick}
          title={
            permissionStatus === 'granted'
              ? `Notifikasi Real-time Aktif${unreadAduanCount > 0 ? ` (${unreadAduanCount} aduan baru)` : ''}`
              : 'Aktifkan Notifikasi Aduan Real-time'
          }
        >
          {unreadAduanCount > 0 ? (
            <BellRing className="w-4 h-4 inline-block align-middle text-amber-500 animate-pulse" />
          ) : (
            <Bell className="w-4 h-4 inline-block align-middle" />
          )}
          {unreadAduanCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 bg-rose-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center shadow-sm pointer-events-none">
              {unreadAduanCount > 99 ? '99+' : unreadAduanCount}
            </span>
          )}
          {permissionStatus !== 'granted' && unreadAduanCount === 0 && (
            <span
              className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-[var(--card)]"
              title="Izin notifikasi belum diaktifkan"
            />
          )}
        </button>
        <button
          id="refresh-btn"
          className={`tb-btn ${isSpinning ? 'spinning' : ''}`}
          onClick={handleRefresh}
          title="Refresh Data"
        >
          <RefreshCw className="w-4 h-4 inline-block align-middle" />
        </button>
        <button
          id="dm-btn"
          className="tb-btn"
          onClick={toggleDarkMode}
          title={isDarkMode ? 'Mode Terang' : 'Mode Gelap'}
        >
          {isDarkMode ? <Sun className="w-4 h-4 inline-block align-middle" /> : <Moon className="w-4 h-4 inline-block align-middle" />}
        </button>
        {session && (
          <div className="tb-acct" id="tb-acct">
            <div className="tb-av" id="tb-av">
              {initials}
            </div>
            <div className="flex flex-col">
              <div className="tb-un" id="tb-un">
                {session.namaLengkap || session.username}
              </div>
              <div className="tb-rl" id="tb-rl">
                Administrator
              </div>
            </div>
            <span className="rbdg adm" id="tb-bdg">
              Admin
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
