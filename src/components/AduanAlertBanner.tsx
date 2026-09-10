/**
 * AduanAlertBanner.tsx
 * Banner notifikasi aduan baru yang muncul dari atas — profesional & eye-catching.
 * Dipicu oleh NotificationProvider saat ada aduan baru masuk secara realtime.
 */

import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, X, ExternalLink, MapPin, User, Tag } from 'lucide-react';

export interface AduanBannerData {
  id: string;
  ticket: string;
  nama?: string;
  kategori?: string;
  lokasi?: string;
  deskripsi?: string;
  tingkatKeparahan?: string;
  timestamp?: number;
}

interface AduanAlertBannerProps {
  data: AduanBannerData | null;
  onClose: () => void;
  onNavigate: () => void;
}

const KEPARAHAN_CFG: Record<string, { label: string; color: string; bg: string; border: string; dot: string }> = {
  kritis: {
    label: 'KRITIS',
    color: '#ef4444',
    bg: 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 50%, #b91c1c 100%)',
    border: 'rgba(239,68,68,0.5)',
    dot: '#ef4444',
  },
  tinggi: {
    label: 'TINGGI',
    color: '#f97316',
    bg: 'linear-gradient(135deg, #431407 0%, #7c2d12 50%, #9a3412 100%)',
    border: 'rgba(249,115,22,0.5)',
    dot: '#f97316',
  },
  sedang: {
    label: 'SEDANG',
    color: '#f59e0b',
    bg: 'linear-gradient(135deg, #1c1917 0%, #292524 60%, #1c1917 100%)',
    border: 'rgba(245,158,11,0.5)',
    dot: '#f59e0b',
  },
  ringan: {
    label: 'RINGAN',
    color: '#22d3ee',
    bg: 'linear-gradient(135deg, #0c1a2e 0%, #0f2346 60%, #0c1a2e 100%)',
    border: 'rgba(34,211,238,0.4)',
    dot: '#22d3ee',
  },
};

const AUTO_CLOSE_MS = 12000;

export const AduanAlertBanner: React.FC<AduanAlertBannerProps> = ({ data, onClose, onNavigate }) => {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [progress, setProgress] = useState(100);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevDataId = useRef<string | null>(null);

  const dismiss = () => {
    setLeaving(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (animRef.current) clearInterval(animRef.current);
    setTimeout(() => {
      setVisible(false);
      setLeaving(false);
      setProgress(100);
      onClose();
    }, 350);
  };

  const handleNavigate = () => {
    dismiss();
    onNavigate();
  };

  useEffect(() => {
    if (!data) return;
    // Jangan reset jika data yang sama
    if (data.id === prevDataId.current) return;
    prevDataId.current = data.id;

    // Reset state
    if (timerRef.current) clearTimeout(timerRef.current);
    if (animRef.current) clearInterval(animRef.current);
    setLeaving(false);
    setProgress(100);
    setVisible(true);

    // Progress bar countdown
    const startTime = Date.now();
    animRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / AUTO_CLOSE_MS) * 100);
      setProgress(remaining);
      if (remaining <= 0) {
        if (animRef.current) clearInterval(animRef.current);
      }
    }, 50);

    // Auto-close after timeout
    timerRef.current = setTimeout(() => {
      dismiss();
    }, AUTO_CLOSE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (animRef.current) clearInterval(animRef.current);
    };
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!data || !visible) return null;

  const kep = KEPARAHAN_CFG[data.tingkatKeparahan || 'ringan'] || KEPARAHAN_CFG.ringan;

  return (
    <>
      {/* ── Keyframe styles ── */}
      <style>{`
        @keyframes aduanBannerIn {
          from { transform: translateX(-50%) translateY(-110%); opacity: 0; }
          to   { transform: translateX(-50%) translateY(0);    opacity: 1; }
        }
        @keyframes aduanBannerOut {
          from { transform: translateX(-50%) translateY(0);    opacity: 1; }
          to   { transform: translateX(-50%) translateY(-120%); opacity: 0; }
        }
        @keyframes aduanPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,.6); }
          50%       { box-shadow: 0 0 0 12px rgba(239,68,68,0); }
        }
        @keyframes aduanDotBlink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.3; }
        }
      `}</style>

      {/* ── Banner ── */}
      <div
        style={{
          position: 'fixed',
          top: '72px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 99999,
          width: 'min(520px, calc(100vw - 24px))',
          animation: leaving
            ? 'aduanBannerOut 0.35s cubic-bezier(.4,0,.2,1) forwards'
            : 'aduanBannerIn 0.42s cubic-bezier(.34,1.56,.64,1) forwards',
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: `0 20px 60px -8px rgba(0,0,0,.65), 0 0 0 1px ${kep.border}, 0 2px 0 0 ${kep.dot}`,
          background: kep.bg,
          backdropFilter: 'blur(12px)',
          willChange: 'transform, opacity',
        }}
        role="alert"
        aria-live="assertive"
      >
        {/* ── Progress bar (auto-close countdown) ── */}
        <div style={{ height: '3px', background: 'rgba(255,255,255,.12)', position: 'relative' }}>
          <div
            style={{
              height: '100%',
              width: `${progress}%`,
              background: kep.dot,
              transition: 'width 0.1s linear',
              boxShadow: `0 0 8px ${kep.dot}`,
            }}
          />
        </div>

        <div style={{ padding: '14px 16px 16px' }}>
          {/* ── Header row ── */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {/* Pulsing alert icon */}
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: `rgba(239,68,68,.18)`,
                  border: `1.5px solid rgba(239,68,68,.4)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  animation: data.tingkatKeparahan === 'kritis' || data.tingkatKeparahan === 'tinggi'
                    ? 'aduanPulse 1.8s infinite'
                    : 'none',
                }}
              >
                <AlertTriangle style={{ width: '20px', height: '20px', color: '#ef4444' }} />
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                  {/* Blinking dot */}
                  <span
                    style={{
                      display: 'inline-block',
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: kep.dot,
                      animation: 'aduanDotBlink 1s infinite',
                      boxShadow: `0 0 6px ${kep.dot}`,
                      flexShrink: 0,
                    }}
                  />
                  <span style={{
                    fontSize: '.6rem',
                    fontWeight: 900,
                    letterSpacing: '.1em',
                    textTransform: 'uppercase',
                    color: kep.color,
                  }}>
                    Aduan Warga Baru Masuk
                  </span>
                  <span style={{
                    fontSize: '.58rem',
                    fontWeight: 800,
                    padding: '1px 6px',
                    borderRadius: '99px',
                    background: `${kep.dot}22`,
                    border: `1px solid ${kep.dot}55`,
                    color: kep.color,
                    letterSpacing: '.05em',
                  }}>
                    {kep.label}
                  </span>
                </div>
                <div style={{ fontSize: '.84rem', fontWeight: 900, color: '#fff', letterSpacing: '-.02em', lineHeight: 1.2 }}>
                  #{data.ticket}
                </div>
              </div>
            </div>

            {/* Close button */}
            <button
              type="button"
              onClick={dismiss}
              aria-label="Tutup notifikasi"
              style={{
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                background: 'rgba(255,255,255,.1)',
                border: '1px solid rgba(255,255,255,.2)',
                color: 'rgba(255,255,255,.7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                flexShrink: 0,
                transition: 'background .15s, color .15s',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,.2)';
                (e.currentTarget as HTMLButtonElement).style.color = '#fff';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,.1)';
                (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,.7)';
              }}
            >
              <X style={{ width: '13px', height: '13px' }} />
            </button>
          </div>

          {/* ── Info grid ── */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '6px',
            marginBottom: '12px',
          }}>
            {data.nama && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(255,255,255,.06)', borderRadius: '8px', padding: '6px 8px' }}>
                <User style={{ width: '12px', height: '12px', color: 'rgba(255,255,255,.5)', flexShrink: 0 }} />
                <span style={{ fontSize: '.72rem', color: 'rgba(255,255,255,.9)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {data.nama}
                </span>
              </div>
            )}
            {data.kategori && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(255,255,255,.06)', borderRadius: '8px', padding: '6px 8px' }}>
                <Tag style={{ width: '12px', height: '12px', color: 'rgba(255,255,255,.5)', flexShrink: 0 }} />
                <span style={{ fontSize: '.72rem', color: 'rgba(255,255,255,.9)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {data.kategori}
                </span>
              </div>
            )}
            {data.lokasi && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(255,255,255,.06)', borderRadius: '8px', padding: '6px 8px', gridColumn: '1 / -1' }}>
                <MapPin style={{ width: '12px', height: '12px', color: 'rgba(255,255,255,.5)', flexShrink: 0 }} />
                <span style={{ fontSize: '.72rem', color: 'rgba(255,255,255,.85)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {data.lokasi}
                </span>
              </div>
            )}
          </div>

          {/* ── Deskripsi singkat ── */}
          {data.deskripsi && (
            <div style={{
              fontSize: '.72rem',
              color: 'rgba(255,255,255,.7)',
              marginBottom: '12px',
              lineHeight: 1.5,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}>
              {data.deskripsi}
            </div>
          )}

          {/* ── Action button ── */}
          <button
            type="button"
            onClick={handleNavigate}
            style={{
              width: '100%',
              padding: '9px 16px',
              borderRadius: '10px',
              background: '#fff',
              color: '#1e293b',
              fontWeight: 800,
              fontSize: '.78rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              cursor: 'pointer',
              border: 'none',
              transition: 'opacity .15s, transform .1s',
              letterSpacing: '-.01em',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '.9'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
            onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(.98)'; }}
            onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
          >
            <ExternalLink style={{ width: '14px', height: '14px' }} />
            Buka Menu Aduan &amp; Tindak Lanjuti
          </button>
        </div>
      </div>
    </>
  );
};

export default AduanAlertBanner;
