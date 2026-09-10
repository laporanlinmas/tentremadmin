import {
  LayoutDashboard, Map,
  MessageSquare, ShieldCheck, Settings, LogOut,
  ChevronRight, ChevronLeft, Newspaper, BarChart3, Camera, Package, GitBranch
} from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { useApp, useAuth } from '../App';
import { isMobileView } from '../utils/helpers';
import { useNotifications } from '../hooks/useRealtimeNotifications';

interface SidebarProps {
  isOpenMobile: boolean;
  setIsOpenMobile: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpenMobile, setIsOpenMobile }) => {
  const { activeTab, setActiveTab } = useApp();
  const { isAdmin, logout } = useAuth();
  const { unreadAduanCount, markAllAduanAsRead } = useNotifications();

  const [isCollapsed, setIsCollapsed] = useState(() => localStorage.getItem('sb-collapsed') === 'true');

  useEffect(() => {
    document.body.classList.toggle('sb-collapsed', isCollapsed);
  }, [isCollapsed]);

  const nav = (tab: string) => {
    if (tab === 'ad') {
      markAllAduanAsRead();
    }
    setActiveTab(tab);
    setIsOpenMobile(false);
  };

  const toggle = () => {
    if (isMobileView()) {
      setIsOpenMobile(!isOpenMobile);
    } else {
      const next = !isCollapsed;
      setIsCollapsed(next);
      localStorage.setItem('sb-collapsed', String(next));
    }
  };

  const NavBtn = ({
    tab,
    icon,
    label,
    tabs,
    badge,
  }: {
    tab: string;
    icon: React.ReactNode;
    label: string;
    tabs?: string[];
    badge?: number;
  }) => {
    const isActive = tabs ? tabs.includes(activeTab) : activeTab === tab;
    return (
      <button className={`sb-nav-btn${isActive ? ' active' : ''}`} onClick={() => nav(tab)} title={isCollapsed ? label : undefined}>
        <span className="sb-nav-icon relative">
          {icon}
          {badge && isCollapsed && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-600 rounded-full ring-2 ring-[var(--card)]" />
          )}
        </span>
        <span className="sb-nav-label flex items-center justify-between flex-1">
          <span>{label}</span>
          {badge && (
            <span className="ml-auto px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-rose-600 text-white leading-none">
              {badge > 99 ? '99+' : badge}
            </span>
          )}
        </span>
      </button>
    );
  };

  return (
    <nav className={`sb${isOpenMobile ? ' on' : ''}${isCollapsed ? ' collapsed' : ''}`} id="sidebar">
      {/* Floating collapse toggle button — di tepi kanan sidebar */}
      <button className="sb-toggle-btn" onClick={toggle} title={isCollapsed ? 'Buka Sidebar' : 'Tutup Sidebar'}>
        {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
      </button>

      {/* Header */}
      <div className="sb-header">
        <div className="sb-brand">
          <div className="sb-logo-wrap">
            <img src="/assets/linmas.svg" alt="Logo TENTREM" className="sb-logo" />
          </div>
          <div className="sb-brand-text">
            <span className="sb-brand-name">TENTREM</span>
            <span className="sb-brand-sub">Dashboard Monitoring</span>
          </div>
        </div>
      </div>

      {/* Nav */}
      <div className="sb-nav">
        <span className="sb-section-label">Menu Utama</span>
        <NavBtn tab="db" icon={<LayoutDashboard className="w-4 h-4" />} label="Dashboard" />
        <NavBtn tab="br" icon={<Newspaper className="w-4 h-4" />} label="Berita Desa" />
        <NavBtn tab="rd" icon={<ShieldCheck className="w-4 h-4" />} label="Jadwal Ronda" />
        <NavBtn tab="gl" icon={<Camera className="w-4 h-4" />} label="Galeri Kegiatan" />
        <NavBtn
          tab="ad"
          icon={<MessageSquare className="w-4 h-4" />}
          label="Aduan Warga"
          badge={unreadAduanCount > 0 ? unreadAduanCount : undefined}
        />
        <NavBtn tab="sv" icon={<BarChart3 className="w-4 h-4" />} label="Survei Kepuasan" />

        <span className="sb-section-label">Data &amp; Peta</span>
        <NavBtn tab="sl" icon={<GitBranch className="w-4 h-4" />} label="Struktur Poskamling" />
        <NavBtn tab="pt" icon={<Map className="w-4 h-4" />} label="Peta Tugurejo" />
        <NavBtn tab="inv" icon={<Package className="w-4 h-4" />} label="Inventaris Aset" />

        <span className="sb-section-label">Sistem</span>
        {isAdmin && <NavBtn tab="set" icon={<Settings className="w-4 h-4" />} label="Pengaturan" />}
      </div>

      {/* Footer */}
      <div className="sb-footer">
        <button className="sb-logout" onClick={() => logout()}>
          <LogOut className="w-4 h-4" />
          <span>Keluar</span>
        </button>
      </div>
    </nav>
  );
};

export default Sidebar;
