import React, { useState, useEffect } from 'react';
import { useAuth, useTheme } from '../App';
import { User, Lock, Eye, EyeOff, AlertCircle, Loader2, ShieldCheck, Sun, Moon } from 'lucide-react';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('tentrem_pref');
      if (saved) {
        const data = JSON.parse(saved);
        if (data.username) { setUsername(data.username); setRememberMe(true); }
      }
    } catch (e) {}
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) { setError('Username dan password wajib diisi'); return; }
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await login(username, password);
      if (!res.success) {
        setError(res.message || 'Login gagal.');
      } else {
        if (rememberMe) localStorage.setItem('tentrem_pref', JSON.stringify({ username }));
        else localStorage.removeItem('tentrem_pref');
      }
    } catch (err: any) {
      setError(err.message || 'Error koneksi sistem');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-root relative min-h-screen">
      {/* Dot grid decoration */}
      <div className="login-dot-grid" aria-hidden="true" />

      {/* Dark Mode Toggle Desktop */}
      <div className="absolute top-6 right-6 z-[100] hidden sm:block">
        <button
          onClick={toggleDarkMode}
          className="flex items-center justify-center w-10 h-10 rounded-full bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shadow-md hover:scale-105 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          title={isDarkMode ? 'Ubah ke Mode Terang' : 'Ubah ke Mode Gelap'}
        >
          {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
      </div>

      <div className="login-card">
        {/* ── Left panel ── */}
        <div className="login-left">
          <div className="flex items-center justify-between w-full mb-[28px] relative z-10">
            <div className="login-brand !mb-0">
              <div className="login-logo-wrap">
                <img src="/assets/linmas.svg" alt="TENTREM" className="login-logo-img" onError={e => (e.currentTarget.style.display = 'none')} />
              </div>
              <div>
                <div className="login-brand-name">POSKAMLING TENTREM</div>
                <div className="login-brand-sub">Desa Tugurejo, Slahung, Ponorogo</div>
              </div>
            </div>
            
            {/* Dark Mode Toggle Mobile */}
            <button
              onClick={toggleDarkMode}
              className="sm:hidden flex shrink-0 items-center justify-center w-[34px] h-[34px] rounded-full bg-white/15 text-white border border-white/20 shadow-sm hover:bg-white/25 transition-all focus:outline-none"
              title={isDarkMode ? 'Ubah ke Mode Terang' : 'Ubah ke Mode Gelap'}
            >
              {isDarkMode ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
            </button>
          </div>

          <div className="login-left-body">
            <div className="login-hero-sub">Dashboard Admin</div>
            <div className="login-hero-full">Tugurejo Nyaman Tanggap<br />Responsif Modern</div>
            <div className="login-features">
              {['Dashboard website Tentrem', 'Portal Berita Terkini', 'Tindak lanjut aduan', 'Jadwal Ronda', 'Manajemen personil Satlinmas', 'Peta Desa Tugurejo'].map(f => (
                <div key={f} className="login-feature-item">
                  <div className="login-feature-dot" />
                  {f}
                </div>
              ))}
            </div>
          </div>

          <div className="login-left-footer">
            <ShieldCheck className="login-shield-icon" />
            <span className="login-enc-label">Satlinmas</span>
            <span className="login-version">v1.1.0</span>
          </div>
        </div>

        {/* ── Right panel (form) ── */}
        <div className="login-right">
          <div className="login-form-head">
            <h2 className="login-form-title">Masuk ke Sistem</h2>
            <p className="login-form-sub">Masukkan kredensial akun Anda untuk melanjutkan.</p>
          </div>

          {error && (
            <div className="login-error" role="alert">
              <AlertCircle className="login-error-icon" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="login-form" noValidate>
            <div className="login-field">
              <label htmlFor="login-username" className="login-label">Username</label>
              <div className="login-input-wrap">
                <User className="login-input-icon" />
                <input
                  id="login-username"
                  type="text"
                  className="login-input"
                  placeholder="Masukkan username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            <div className="login-field">
              <label htmlFor="login-password" className="login-label">Password</label>
              <div className="login-input-wrap">
                <Lock className="login-input-icon" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  className="login-input"
                  placeholder="Masukkan password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="login-pw-toggle"
                  onClick={() => setShowPassword(v => !v)}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                >
                  {showPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button type="submit" className="login-btn" disabled={isSubmitting}>
              {isSubmitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Memverifikasi...</>
              ) : 'Masuk ke Sistem'}
            </button>
          </form>

          <p className="login-copy">&copy; 2026 Pemdes Tugurejo & Satlinmas Kabupaten Ponorogo</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
