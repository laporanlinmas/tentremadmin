import React, { useState, lazy, Suspense, Component, ErrorInfo } from 'react';
import { useApp, useAuth } from '../App';
import { useNotifications } from '../hooks/useRealtimeNotifications';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { LoadingOverlay } from './common/LoadingOverlay';
import { GalleryOverlay } from './common/GalleryOverlay';
import { AduanAlertBanner } from './AduanAlertBanner';
import { CheckCircle, XCircle, Info, RefreshCw } from 'lucide-react';
import {
  DashboardSkeleton,
  SatlinmasSkeleton,
  PetaSkeleton,
  PengaturanSkeleton,
  AduanSkeleton,
  SurveiSkeleton,
  BeritaSkeleton,
} from './SkeletonPages';

// Error boundary to catch lazy load or component runtime failures
interface ErrorBoundaryProps {
  children: React.ReactNode;
  tabKey: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class PageErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn('[PageErrorBoundary Caught]:', error, info);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    if (prevProps.tabKey !== this.props.tabKey && this.state.hasError) {
      this.setState({ hasError: false, error: undefined });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center gap-3 bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-sm my-4">
          <XCircle className="w-12 h-12 text-amber-500 opacity-80" />
          <h4 className="text-sm font-bold text-[var(--tx)]">Komponen Sedang Disinkronkan</h4>
          <p className="text-[var(--tx2)] text-xs max-w-md">
            {this.state.error?.message || 'Data modul sedang disinkronkan dengan database Cloud Firestore.'}
          </p>
          <button
            type="button"
            className="bp px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-2 mt-2 cursor-pointer shadow-md"
            onClick={() => {
              this.setState({ hasError: false, error: undefined });
            }}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Muat Ulang Halaman
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Page components with safe fallback resolution
const Dashboard      = lazy(() => import('../pages/Dashboard').then(m => ({ default: m.Dashboard || m.default })));
const Berita         = lazy(() => import('../pages/Berita').then(m => ({ default: m.Berita || m.default })));
const Ronda          = lazy(() => import('../pages/Ronda').then(m => ({ default: m.Ronda || m.default })));
const GaleriKegiatan = lazy(() => import('../pages/GaleriKegiatan').then(m => ({ default: m.GaleriKegiatan || m.default })));
const Aduan          = lazy(() => import('../pages/Aduan').then(m => ({ default: m.Aduan || m.default })));
const Survei         = lazy(() => import('../pages/Survei').then(m => ({ default: m.Survei || m.default })));
const DataAnggota    = lazy(() => import('../pages/DataAnggota').then(m => ({ default: m.DataAnggota || m.default })));
const Pengaturan     = lazy(() => import('../pages/Pengaturan').then(m => ({ default: m.Pengaturan || m.default })));
const PetaTugurejo   = lazy(() => import('../pages/PetaTugurejo').then(m => ({ default: m.PetaTugurejo || m.default })));
const InventarisPage = lazy(() => import('../pages/Inventaris').then(m => ({ default: m.InventarisPage || m.default })));

export const AppLayout: React.FC = () => {
  const { activeTab, toasts, removeToast, setActiveTab } = useApp();
  const { aduanBanner, closeAduanBanner } = useNotifications();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const renderActiveTab = () => {
    const wrap = (node: React.ReactNode, fallback: React.ReactNode) => (
      <Suspense fallback={fallback}>{node}</Suspense>
    );

    switch (activeTab) {
      case 'db':
        return wrap(<Dashboard />, <DashboardSkeleton />);
      case 'br':
        return wrap(<Berita />, <BeritaSkeleton />);
      case 'rd':
        return wrap(<Ronda />, <AduanSkeleton />);
      case 'gl':
        return wrap(<GaleriKegiatan />, <BeritaSkeleton />);
      case 'ad':
        return wrap(<Aduan />, <AduanSkeleton />);
      case 'sv':
        return wrap(<Survei />, <SurveiSkeleton />);
      case 'sl':
        return wrap(<DataAnggota />, <SatlinmasSkeleton />);
      case 'pt':
        return wrap(<PetaTugurejo />, <PetaSkeleton />);
      case 'inv':
        return wrap(<InventarisPage />, <SatlinmasSkeleton />);
      case 'set':
        return wrap(<Pengaturan />, <PengaturanSkeleton />);
      default:
        return wrap(<Dashboard />, <DashboardSkeleton />);
    }
  };

  const renderToastIcon = (type: 'ok' | 'er' | 'inf') => {
    switch (type) {
      case 'ok':
        return <CheckCircle className="w-4 h-4 inline-block align-middle" />;
      case 'er':
        return <XCircle className="w-4 h-4 inline-block align-middle" />;
      case 'inf':
      default:
        return <Info className="w-4 h-4 inline-block align-middle" />;
    }
  };

  return (
    <div id="app-wrap" className="min-h-screen bg-[var(--bg)] font-sans transition-colors duration-300 relative">
      {/* Mobile Sidebar Backdrop */}
      <div
        id="mbb"
        className={isMobileSidebarOpen ? 'on' : ''}
        onClick={() => setIsMobileSidebarOpen(false)}
      ></div>

      <div id="app" className="on flex min-h-screen overflow-hidden">
        <Sidebar
          isOpenMobile={isMobileSidebarOpen}
          setIsOpenMobile={setIsMobileSidebarOpen}
        />
        <div className="main flex-1 flex flex-col min-h-screen transition-all duration-300 overflow-hidden">
          <Topbar onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)} />
          
          <div
            className="pa flex-1 p-3 md:p-4 w-full"
            id="ct"
            style={{
              overflowY: (activeTab === 'pt' || activeTab === 'peta') ? 'hidden' : 'auto',
              overflowX: 'hidden',
            }}
          >
            <PageErrorBoundary key={activeTab} tabKey={activeTab}>
              {renderActiveTab()}
            </PageErrorBoundary>
          </div>
        </div>
      </div>

      {/* Global Overlays & Modals */}
      <LoadingOverlay />
      <GalleryOverlay />

      {/* Aduan Alert Banner — slide dari atas saat aduan baru masuk */}
      <AduanAlertBanner
        data={aduanBanner}
        onClose={closeAduanBanner}
        onNavigate={() => {
          closeAduanBanner();
          setActiveTab('ad');
        }}
      />

      {/* Toast container */}
      <div id="tco">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`ti ${t.type}`}
            onClick={() => removeToast(t.id)}
            style={{ cursor: 'pointer' }}
          >
            {renderToastIcon(t.type)}
            <span>{t.msg}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
export default AppLayout;
