import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Chart } from 'chart.js/auto';
import { UserSession } from './types';
import { apiGet, apiPost } from './services/api';
import { idbGet, idbSet, idbDel, idbClear, idbGetTs } from './services/idb-cache';
import { Login } from './pages/Login';
import { AppLayout } from './components/AppLayout';
import { ConfirmModal } from './components/common/ConfirmModal';
import { AlertModal } from './components/common/AlertModal';
import { LogOut } from 'lucide-react';
import { NotificationProvider } from './hooks/useRealtimeNotifications';

// ==========================================
// 1. THEME CONTEXT
// ==========================================
interface ThemeContextType {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);
const DM_KEY = 'tentrem_dark';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(DM_KEY);
      if (saved) return saved === 'dark';
      if (typeof window !== 'undefined' && window.matchMedia) {
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
      }
    } catch (e) {
      // Ignore
    }
    return false;
  });

  const applyTheme = (dark: boolean) => {
    const body = document.body;
    const docEl = document.documentElement;
    if (dark) {
      body.classList.add('dark-mode');
      docEl.classList.add('dark-pre');
      docEl.classList.add('dark');
    } else {
      body.classList.remove('dark-mode');
      docEl.classList.remove('dark-pre');
      docEl.classList.remove('dark');
    }

    if (Chart) {
      const textColor = dark ? '#94a3b8' : '#64748b';
      const gridColor = dark ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.05)';
      Chart.defaults.color = textColor;
      if (Chart.defaults.scales && Chart.defaults.scales.linear) {
        if (!Chart.defaults.scales.linear.grid) Chart.defaults.scales.linear.grid = {};
        Chart.defaults.scales.linear.grid.color = gridColor;
      }
      if (Chart.defaults.scale && Chart.defaults.scale.grid) {
        Chart.defaults.scale.grid.color = gridColor;
      }
    }
  };

  useEffect(() => {
    applyTheme(isDarkMode);
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => {
      const newVal = !prev;
      try {
        localStorage.setItem(DM_KEY, newVal ? 'dark' : 'light');
      } catch (e) {
        // Ignore
      }
      return newVal;
    });
  };

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};

// ==========================================
// 2. APP CONTEXT
// ==========================================
interface GalleryState {
  show: boolean;
  fotos: string[];
  thumbs: string[];
  index: number;
}

interface ToastState {
  msg: string;
  type: 'ok' | 'er' | 'inf';
  id: number;
}

// In-memory mirror of IDB (keyed by cache key → data).
// Pages read from this synchronously; IDB is the persistent backing store.
interface MemCache {
  [key: string]: { data: any; ts: number };
}

interface AppContextType {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  loading: boolean;
  loadingMessage: string;
  showLoad: (msg?: string) => void;
  hideLoad: () => void;
  toasts: ToastState[];
  triggerToast: (msg: string, type?: 'ok' | 'er' | 'inf') => void;
  removeToast: (id: number) => void;
  gallery: GalleryState;
  openGallery: (fotos: string[], thumbs: string[], index?: number) => void;
  closeGallery: () => void;
  galleryNav: (dir: number) => void;
  cacheGet: (key: string) => any;
  cacheSet: (key: string, data: any) => void;
  cacheDel: (key: string) => void;
  cacheClear: () => void;
  cacheRefresh: (key: string, force?: boolean) => Promise<void>;
  prefetchAll: () => void;
  refreshTrigger: number;
  triggerRefresh: () => void;
}

const getTabFromPath = (path: string): string => {
  const cleanPath = path.toLowerCase().replace(/\/+$/, '') || '/';
  if (cleanPath === '/berita') return 'br';
  if (cleanPath === '/ronda') return 'rd';
  if (cleanPath === '/galeri') return 'gl';
  if (cleanPath === '/aduan') return 'ad';
  if (cleanPath === '/survei') return 'sv';
  if (cleanPath === '/anggota') return 'sl';
  if (cleanPath === '/peta') return 'pt';
  if (cleanPath === '/pengaturan') return 'set';
  if (cleanPath === '/dashboard' || cleanPath === '/') return 'db';
  return 'db';
};

const getPathFromTab = (tab: string): string => {
  switch (tab) {
    case 'br': return '/berita';
    case 'rd': return '/ronda';
    case 'gl': return '/galeri';
    case 'ad': return '/aduan';
    case 'sv': return '/survei';
    case 'sl': return '/anggota';
    case 'pt': return '/peta';
    case 'set': return '/pengaturan';
    case 'db':
    default:
      return '/dashboard';
  }
};

const AppContext = createContext<AppContextType | undefined>(undefined);

// How often background poll re-fetches each key (3 minutes)
const POLL_INTERVAL = 3 * 60 * 1000;
// IDB TTL for data (30 minutes)
const IDB_TTL = 30 * 60 * 1000;
// Threshold to consider in-memory data "still fresh" for instant render (5 min)
const MEM_TTL = 5 * 60 * 1000;

// API fetcher per cache key
const CACHE_JOBS: Record<string, () => Promise<any>> = {
  layerPeta: () => apiGet('getLayerPeta'),
  fotoMarker: () => apiGet('getDetailFotoMarkers'),
  dashboard: async () => {
    const res = await apiGet('getDashboard');
    if (res.success) {
      return res.data || res;
    }
    return null;
  }
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTabState] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return getTabFromPath(window.location.pathname);
    }
    return 'db';
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('Memuat...');
  const [toasts, setToasts] = useState<ToastState[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  // In-memory mirror: fast synchronous read for components
  const [memCache, setMemCache] = useState<MemCache>({});
  // Ref so callbacks close over latest value without re-creating
  const memCacheRef = useRef<MemCache>({});
  // Ref untuk polling interval — hindari leak saat re-mount
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [gallery, setGallery] = useState<GalleryState>({
    show: false,
    fotos: [],
    thumbs: [],
    index: 0,
  });

  // Redirect root path or invalid paths to /dashboard or /login depending on session
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const currentPath = window.location.pathname.toLowerCase().replace(/\/+$/, '') || '/';
      const validPaths = [
        '/login',
        '/dashboard',
        '/berita',
        '/ronda',
        '/galeri',
        '/aduan',
        '/anggota',
        '/peta',
        '/pengaturan'
      ];
      if (currentPath === '/rekap') {
        window.history.replaceState(null, '', '/ronda');
        setActiveTabState('rd');
      } else if (!validPaths.includes(currentPath)) {
        window.history.replaceState(null, '', '/dashboard');
        setActiveTabState('db');
      } else {
        const tab = getTabFromPath(currentPath);
        setActiveTabState(tab);
      }
    }
  }, []);

  // Listen for browser navigation (back/forward)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handlePopState = () => {
      const tab = getTabFromPath(window.location.pathname);
      setActiveTabState(tab);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Sync Peta class to container
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const ct = document.getElementById('ct');
      if (ct) {
        if (activeTab === 'pt') {
          ct.classList.add('peta-outer-pa');
        } else {
          ct.classList.remove('peta-outer-pa');
        }
      }
    }
  }, [activeTab]);

  const setActiveTab = useCallback((tab: string) => {
    setActiveTabState(tab);
    if (typeof window !== 'undefined') {
      const targetPath = getPathFromTab(tab);
      if (window.location.pathname !== targetPath) {
        window.history.pushState(null, '', targetPath);
      }
    }
  }, []);

  const triggerRefresh = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  const showLoad = useCallback((msg?: string) => {
    setLoadingMessage(msg || 'Memuat...');
    setLoading(true);
  }, []);

  const hideLoad = useCallback(() => {
    setLoading(false);
  }, []);

  const triggerToast = useCallback((msg: string, type: 'ok' | 'er' | 'inf' = 'inf') => {
    const id = Date.now() + Math.random();
    setToasts([{ msg, type, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3600);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const openGallery = useCallback((fotos: string[], thumbs: string[], index = 0) => {
    if (!fotos || !fotos.length) {
      triggerToast('Tidak ada foto.', 'inf');
      return;
    }
    setGallery({
      show: true,
      fotos,
      thumbs: thumbs && thumbs.length ? thumbs : fotos,
      index,
    });
  }, [triggerToast]);

  const closeGallery = useCallback(() => {
    setGallery((prev) => ({ ...prev, show: false }));
  }, []);

  const galleryNav = useCallback((dir: number) => {
    setGallery((prev) => {
      if (!prev.show || !prev.fotos.length) return prev;
      const nextIndex = Math.max(0, Math.min(prev.fotos.length - 1, prev.index + dir));
      return { ...prev, index: nextIndex };
    });
  }, []);

  // ─── CACHE HELPERS ────────────────────────────────────────────────────────

  /** Write to both in-memory mirror and IDB. */
  const cacheSet = useCallback((key: string, data: any) => {
    const entry = { data, ts: Date.now() };
    memCacheRef.current = { ...memCacheRef.current, [key]: entry };
    setMemCache((prev) => ({ ...prev, [key]: entry }));
    if (data !== null && data !== undefined) {
      idbSet(key, data, IDB_TTL).catch(() => {});
    } else {
      // null means "invalidate"
      idbDel(key).catch(() => {});
    }
  }, []);

  /** Synchronous read from in-memory mirror (fast, for components). */
  const cacheGet = useCallback((key: string) => {
    const item = memCacheRef.current[key];
    if (!item || item.data === null || item.data === undefined) return null;
    if (Date.now() - item.ts > MEM_TTL) return null;
    return item.data;
  }, []);

  const cacheDel = useCallback((key: string) => {
    memCacheRef.current = { ...memCacheRef.current };
    delete memCacheRef.current[key];
    setMemCache((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    idbDel(key).catch(() => {});
  }, []);

  const cacheClear = useCallback(() => {
    memCacheRef.current = {};
    setMemCache({});
    idbClear().catch(() => {});
  }, []);

  /** Fetch fresh data from API, update IDB + memory, trigger re-render. */
  const cacheRefresh = useCallback(async (key: string, force = false) => {
    const job = CACHE_JOBS[key];
    if (!job) return;

    // Check if the current in-memory cache is still fresh.
    // If it's less than 30 seconds old, we skip the network request to save database cost,
    // unless 'force' is true.
    const item = memCacheRef.current[key];
    if (!force && item && (Date.now() - item.ts < 30000)) {
      return; // Skip database fetch, cache is fresh
    }

    try {
      const res = await job();
      if (res && res.success !== false) {
        const prevJson = item ? JSON.stringify(item.data) : '';
        const newJson = JSON.stringify(res);
        if (prevJson !== newJson) {
          cacheSet(key, res);
        } else if (item) {
          // Data is identical — update only the timestamp to prolong freshness
          // and prevent repeated API hits on subsequent mounts.
          const updated = { data: item.data, ts: Date.now() };
          memCacheRef.current = { ...memCacheRef.current, [key]: updated };
          setMemCache((prev) => ({ ...prev, [key]: updated }));
          idbSet(key, item.data, IDB_TTL).catch(() => {});
        }
      }
    } catch {
      // Fail silently — stale data stays in memory
    }
  }, [cacheSet]);

  /**
   * On first mount: hydrate in-memory cache from IDB so pages get instant data
   * without a network call. Then start a background polling loop.
   */
  useEffect(() => {
    let cancelled = false;

    const hydrateFromIDB = async () => {
      const keys = Object.keys(CACHE_JOBS);
      await Promise.all(
        keys.map(async (key) => {
          try {
            const data = await idbGet(key);
            if (data && !cancelled) {
              const ts = (await idbGetTs(key)) ?? Date.now();
              const entry = { data, ts };
              memCacheRef.current = { ...memCacheRef.current, [key]: entry };
              setMemCache((prev) => ({ ...prev, [key]: entry }));
            }
          } catch {
            // Ignore
          }
        })
      );
    };

    hydrateFromIDB();

    // Background polling: re-fetch all keys every POLL_INTERVAL.
    // Only updates memory+IDB if data actually differs (by JSON comparison).
    const poll = async () => {
      if (cancelled) return;
      const keys = Object.keys(CACHE_JOBS);
      for (const key of keys) {
        if (cancelled) break;
        try {
          const job = CACHE_JOBS[key];
          const res = await job();
          if (cancelled) break;
          if (res && res.success !== false) {
            const prev = memCacheRef.current[key];
            const prevJson = prev ? JSON.stringify(prev.data) : '';
            const newJson = JSON.stringify(res);
            if (prevJson !== newJson) {
              // Data changed — update cache and trigger re-render
              const entry = { data: res, ts: Date.now() };
              memCacheRef.current = { ...memCacheRef.current, [key]: entry };
              setMemCache((prev2) => ({ ...prev2, [key]: entry }));
              idbSet(key, res, IDB_TTL).catch(() => {});
              setRefreshTrigger((n) => n + 1);
            } else if (prev) {
              // Data is identical — update only the timestamp in memory and IndexedDB
              const updated = { data: prev.data, ts: Date.now() };
              memCacheRef.current = { ...memCacheRef.current, [key]: updated };
              setMemCache((prev2) => ({ ...prev2, [key]: updated }));
              idbSet(key, prev.data, IDB_TTL).catch(() => {});
            }
          }
        } catch {
          // Ignore per-key errors
        }
        // Stagger requests 1.5 s apart to avoid hammering the proxy
        await new Promise((r) => setTimeout(r, 1500));
      }
    };

    // First poll after 8 s (let app settle), then every POLL_INTERVAL
    const firstTimer = setTimeout(() => {
      poll();
      const interval = setInterval(() => { poll(); }, POLL_INTERVAL);
      // Simpan di ref (bukan window) agar tidak leak saat re-mount
      pollIntervalRef.current = interval;
    }, 8000);

    return () => {
      cancelled = true;
      clearTimeout(firstTimer);
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /** Prefetch all keys that aren't already in memory. */
  const prefetchAll = useCallback(() => {
    let delay = 2000;
    const jobs = Object.entries(CACHE_JOBS);
    jobs.forEach(([key, fn]) => {
      setTimeout(async () => {
        if (memCacheRef.current[key]?.data) return; // already in memory
        // Also check IDB before hitting network
        const cached = await idbGet(key).catch(() => null);
        if (cached) {
          const ts = (await idbGetTs(key).catch(() => null)) ?? Date.now();
          const entry = { data: cached, ts };
          memCacheRef.current = { ...memCacheRef.current, [key]: entry };
          setMemCache((prev) => ({ ...prev, [key]: entry }));
          return;
        }
        try {
          const res = await fn();
          if (res && res.success !== false) cacheSet(key, res);
        } catch {
          // Ignore
        }
      }, delay);
      delay += 1200;
    });
  }, [cacheSet]);

  return (
    <AppContext.Provider
      value={{
        activeTab,
        setActiveTab,
        loading,
        loadingMessage,
        showLoad,
        hideLoad,
        toasts,
        triggerToast,
        removeToast,
        gallery,
        openGallery,
        closeGallery,
        galleryNav,
        cacheGet,
        cacheSet,
        cacheDel,
        cacheClear,
        cacheRefresh,
        prefetchAll,
        refreshTrigger,
        triggerRefresh,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};

// ==========================================
// 3. AUTH CONTEXT
// ==========================================
interface AuthContextType {
  session: UserSession | null;
  isAdmin: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: (confirmFirst?: boolean) => void;
  forceLogout: (msg?: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode; onClearCache: () => void }> = ({ children, onClearCache }) => {
  const [session, setSession] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const SESSION_TTL_MS = 60 * 60 * 1000; // 60 minutes

  // Custom modal states
  const [logoutConfirmShow, setLogoutConfirmShow] = useState(false);
  const [alertShow, setAlertShow] = useState(false);
  const [alertMsg, setAlertMsg] = useState('');

  const forceLogout = useCallback((msg?: string) => {
    localStorage.removeItem('_slm');
    setSession(null);
    onClearCache();
    if (msg) {
      setAlertMsg(msg);
      setAlertShow(true);
    }
  }, [onClearCache]);

  const logout = useCallback((confirmFirst = true) => {
    if (confirmFirst) {
      setLogoutConfirmShow(true);
    } else {
      forceLogout();
    }
  }, [forceLogout]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('_slm');
      if (saved) {
        const parsed: UserSession = JSON.parse(saved);
        const ts = parsed._loginTs || 0;
        if (ts && Date.now() - ts > SESSION_TTL_MS) {
          localStorage.removeItem('_slm');
        } else {
          setSession(parsed);
        }
      }
    } catch (e) {
      console.error('Error loading session:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!session) return;
    const timer = setInterval(() => {
      try {
        const curStr = localStorage.getItem('_slm');
        if (!curStr) {
          forceLogout();
          return;
        }
        const cur: UserSession = JSON.parse(curStr);
        if (!cur._loginTs || Date.now() - cur._loginTs > SESSION_TTL_MS) {
          forceLogout('Sesi Anda telah berakhir (60 menit). Silakan login kembali.');
        }
      } catch (e) {
        forceLogout();
      }
    }, 30000);
    return () => clearInterval(timer);
  }, [session, forceLogout]);

  const login = async (username: string, password: string) => {
    const res = await apiPost('login', { username, password });
    if (res.success) {
      const d = res.data || res;
      const newSession: UserSession = {
        username: d.username,
        role: d.role,
        namaLengkap: d.namaLengkap,
        _loginTs: Date.now(),
      };
      localStorage.setItem('_slm', JSON.stringify(newSession));
      setSession(newSession);
      return { success: true };
    } else {
      return { success: false, message: res.message || 'Login gagal.' };
    }
  };

  const isAdmin = session ? String(session.role).toLowerCase() === 'admin' : false;

  return (
    <AuthContext.Provider value={{ session, isAdmin, isLoading, login, logout, forceLogout }}>
      {children}

      {/* Logout Confirmation Modal */}
      <ConfirmModal
        show={logoutConfirmShow}
        title="Konfirmasi Keluar"
        msg="Yakin ingin keluar dari dashboard TENTREM?"
        onConfirm={() => {
          setLogoutConfirmShow(false);
          forceLogout();
        }}
        onCancel={() => setLogoutConfirmShow(false)}
        confirmText="Keluar"
        confirmClass="bp"
        confirmIcon={<LogOut className="w-4 h-4" />}
      />

      {/* Alert Modal */}
      <AlertModal
        show={alertShow}
        title="Pemberitahuan Sistem"
        msg={alertMsg}
        onClose={() => setAlertShow(false)}
      />
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

// ==========================================
// 4. MAIN APP COMPONENT
// ==========================================
const AppContent: React.FC = () => {
  const { session, isLoading } = useAuth();
  const { setActiveTab } = useApp();

  useEffect(() => {
    if (typeof window === 'undefined' || isLoading) return;
    const path = window.location.pathname;
    if (!session) {
      if (path !== '/login') {
        window.history.replaceState(null, '', '/login');
      }
    } else {
      if (path === '/login') {
        window.history.replaceState(null, '', '/dashboard');
        setActiveTab('db');
      }
      // Preserve the current URL if it matches a valid page
    }
  }, [session, isLoading, setActiveTab]);

  if (isLoading) {
    return (
      <div id="lov" className="on">
        <div className="spw">
          <div className="spo"></div>
          <div className="spi"></div>
        </div>
        <span>Memulai Aplikasi...</span>
      </div>
    );
  }

  if (!session) {
    return <Login />;
  }

  return (
    <NotificationProvider>
      <AppLayout />
    </NotificationProvider>
  );
};

const AuthProviderWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { cacheClear } = useApp();
  return (
    <AuthProvider onClearCache={cacheClear}>
      {children}
    </AuthProvider>
  );
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AppProvider>
        <AuthProviderWrapper>
          <AppContent />
        </AuthProviderWrapper>
      </AppProvider>
    </ThemeProvider>
  );
};

export default App;
