/**
 * GambarPetaPanel — Modal floating kecil di atas peta
 * Tools: Rectangle (kotak) & Polyline (garis).
 * Fitur: garis yang ditutup (klik titik awal) otomatis jadi area/polygon berisi warna.
 * Semua shape menempel ke koordinat peta — stabil saat zoom/drag/pan.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  PenLine, Trash2, Edit, Save, X,
  Square, Minus, RotateCcw, CheckCircle, MapPin, ChevronDown,
} from 'lucide-react';
import { useApp, useAuth } from '../../App';
import { apiGet, apiPost } from '../../services/api';
import { GambarPeta } from '../../types';

// ── Warna preset ──────────────────────────────────────────────────────────────
const WARNA_PRESET = [
  { hex: '#1e6fd9', lbl: 'Biru' },   { hex: '#c0392b', lbl: 'Merah' },
  { hex: '#0d9268', lbl: 'Hijau' },  { hex: '#d97706', lbl: 'Kuning' },
  { hex: '#7c3aed', lbl: 'Ungu' },   { hex: '#0891b2', lbl: 'Tosca' },
  { hex: '#e67e22', lbl: 'Oranye' }, { hex: '#e91e63', lbl: 'Pink' },
  { hex: '#607d8b', lbl: 'Abu' },    { hex: '#1a1a2e', lbl: 'Hitam' },
  { hex: '#10b981', lbl: 'Zamrud' }, { hex: '#f59e0b', lbl: 'Emas' },
];

type DrawTool = 'none' | 'polyline' | 'rectangle';

interface Props {
  mapRef: React.MutableRefObject<any>;
  gambarGroupRef: React.MutableRefObject<any>;
  isMapReady: boolean;
  /** Dipanggil dari PetaTugurejo untuk open/close modal */
  open: boolean;
  onClose: () => void;
}

// ── Geo helpers ────────────────────────────────────────────────────────────────
function haverDist(a: [number, number], b: [number, number]): number {
  const R = 6371000, dLat = (b[0] - a[0]) * Math.PI / 180, dLng = (b[1] - a[1]) * Math.PI / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * Math.PI / 180) * Math.cos(b[0] * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}
function fmtDist(m: number) { return m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${m.toFixed(0)} m`; }
function calcArea(pts: [number, number][]): string {
  if (pts.length < 3) return '';
  const R = 6371000; let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length;
    a += (pts[j][1] - pts[i][1]) * Math.PI / 180 * (2 + Math.sin(pts[i][0] * Math.PI / 180) + Math.sin(pts[j][0] * Math.PI / 180));
  }
  a = Math.abs(a) * R * R / 2;
  return a >= 10000 ? `${(a / 10000).toFixed(2)} ha` : `${a.toFixed(0)} m²`;
}
function calcLen(pts: [number, number][]): string {
  if (pts.length < 2) return '';
  let t = 0; for (let i = 1; i < pts.length; i++) t += haverDist(pts[i - 1], pts[i]);
  return fmtDist(t);
}
/** Cek apakah titik baru cukup dekat ke titik pertama untuk "menutup" garis jadi area */
function isClosingPoint(first: [number, number], cur: [number, number], map: any): boolean {
  if (!map) return false;
  const p1 = map.latLngToContainerPoint(first);
  const p2 = map.latLngToContainerPoint(cur);
  const dx = p1.x - p2.x, dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy) < 18; // px threshold
}

const TYPE_LABEL: Record<string, string> = {
  polygon: 'Area', polyline: 'Garis', rectangle: 'Kotak',
};

const GambarPetaPanel: React.FC<Props> = ({ mapRef, gambarGroupRef, isMapReady, open, onClose }) => {
  const { triggerToast, showLoad, hideLoad } = useApp();
  const { isAdmin } = useAuth();

  const [gambarList, setGambarList]      = useState<GambarPeta[]>([]);
  const [loading, setLoading]            = useState(false);
  const [activeTool, setActiveTool]      = useState<DrawTool>('none');
  const [drawColor, setDrawColor]        = useState('#1e6fd9');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [pointCount, setPointCount]      = useState(0);
  const [pendingShape, setPendingShape]  = useState<{ type: string; geojson: string; measurement: string } | null>(null);
  const [formNama, setFormNama]          = useState('');
  const [formKet, setFormKet]            = useState('');
  const [editingId, setEditingId]        = useState<string | null>(null);
  const [editNama, setEditNama]          = useState('');
  const [editKet, setEditKet]            = useState('');
  const [editWarna, setEditWarna]        = useState('#1e6fd9');
  const [showList, setShowList]          = useState(false);
  // Snap indicator — titik awal akan highlight saat hover dekat
  const [snapReady, setSnapReady]        = useState(false);

  const pointsRef    = useRef<[number, number][]>([]);
  const previewRef   = useRef<any>(null);
  const startDotRef  = useRef<any>(null); // marker kecil di titik pertama garis
  const toolRef      = useRef<DrawTool>('none');
  const colorRef     = useRef('#1e6fd9');
  const cssInjected  = useRef(false);

  useEffect(() => { toolRef.current = activeTool; }, [activeTool]);
  useEffect(() => { colorRef.current = drawColor; }, [drawColor]);

  // ── CSS crosshair ─────────────────────────────────────────────────────────
  const injectDrawCss = useCallback(() => {
    if (cssInjected.current) return;
    const s = document.createElement('style');
    s.id = 'gambar-draw-css';
    s.textContent = `
      .gambar-draw-active .leaflet-container,
      .gambar-draw-active .leaflet-container * { cursor: crosshair !important; }
    `;
    document.head.appendChild(s);
    cssInjected.current = true;
  }, []);

  const setDrawMode = useCallback((active: boolean) => {
    const c = document.getElementById('leaflet-wrap');
    if (!c) return;
    if (active) { injectDrawCss(); c.classList.add('gambar-draw-active'); }
    else c.classList.remove('gambar-draw-active');
  }, [injectDrawCss]);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchGambar = async () => {
    setLoading(true);
    try {
      const res = await apiGet('getGambarPeta');
      if (res.success && Array.isArray(res.shapes)) setGambarList(res.shapes as GambarPeta[]);
    } catch {}
    setLoading(false);
  };
  useEffect(() => { if (open) fetchGambar(); }, [open]);

  // ── Render shapes ke Leaflet ──────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !window.L || !gambarGroupRef.current || !isMapReady) return;
    const L = window.L;
    const group = gambarGroupRef.current;
    group.clearLayers();

    gambarList.forEach(item => {
      try {
        const geo = typeof item.geojson === 'string' ? JSON.parse(item.geojson) : item.geojson;
        if (!geo) return;
        const w = item.warna || '#1e6fd9';
        const s = { color: w, weight: 2.5, opacity: 0.92, fillColor: w, fillOpacity: 0.22 };
        let layer: any = null;

        if (geo.type === 'Feature' || geo.type === 'FeatureCollection') {
          layer = L.geoJSON(geo, { style: () => s });
        } else if (Array.isArray(geo.latlngs)) {
          if (item.type === 'polyline') layer = L.polyline(geo.latlngs, { color: w, weight: 3, opacity: 0.92 });
          else layer = L.polygon(geo.latlngs, s); // rectangle & polygon (area)
        }
        if (!layer) return;

        const html = [
          item.nama ? `<div style="font-weight:800;font-size:.85rem;color:var(--text);margin-bottom:3px">${item.nama}</div>` : '',
          item.ket ? `<div style="font-size:.72rem;color:var(--muted);line-height:1.4">${item.ket}</div>` : '',
          item.measurement ? `<div style="font-size:.65rem;color:var(--blue);margin-top:4px;font-family:var(--mono);font-weight:700">${item.measurement}</div>` : '',
        ].filter(Boolean).join('');
        if (html) layer.bindPopup(`<div class="lf-clean-popup" style="min-width:150px">${html}</div>`);
        layer.on('mouseover', () => layer.setStyle?.({ fillOpacity: 0.38, weight: 3.5 }));
        layer.on('mouseout', () => layer.setStyle?.({ fillOpacity: 0.22, weight: 2.5 }));
        group.addLayer(layer);
      } catch {}
    });
  }, [gambarList, isMapReady]);

  // ── Draw engine ───────────────────────────────────────────────────────────
  const clearPrev = () => {
    const m = mapRef.current;
    if (!m) return;
    if (previewRef.current) { try { m.removeLayer(previewRef.current); } catch {} previewRef.current = null; }
  };
  const clearStartDot = () => {
    const m = mapRef.current;
    if (!m) return;
    if (startDotRef.current) { try { m.removeLayer(startDotRef.current); } catch {} startDotRef.current = null; }
  };

  const finish = (pts: [number, number][], type: string) => {
    clearPrev();
    clearStartDot();
    let geo = '', meas = '';
    if (type === 'rectangle' && pts.length >= 3) {
      meas = calcArea(pts); geo = JSON.stringify({ latlngs: pts });
    } else if (type === 'polygon' && pts.length >= 3) {
      meas = calcArea(pts); geo = JSON.stringify({ latlngs: pts });
    } else if (type === 'polyline' && pts.length >= 2) {
      meas = calcLen(pts); geo = JSON.stringify({ latlngs: pts });
    } else return;
    setPendingShape({ type, geojson: geo, measurement: meas });
    setFormNama(''); setFormKet('');
    stopDraw();
  };

  const stopDraw = useCallback(() => {
    const m = mapRef.current;
    if (m) {
      m.off('click', onMapClick);
      m.off('mousemove', onMapMove);
      m.doubleClickZoom.enable();
    }
    setDrawMode(false);
    clearPrev();
    clearStartDot();
    pointsRef.current = [];
    setActiveTool('none'); toolRef.current = 'none';
    setPointCount(0);
    setSnapReady(false);
  }, [setDrawMode]);

  const onMapClick = (e: any) => {
    const tool = toolRef.current;
    if (tool === 'none') return;
    window.L?.DomEvent?.stopPropagation(e);
    const ll: [number, number] = [e.latlng.lat, e.latlng.lng];
    const L = window.L;
    const m = mapRef.current;

    if (tool === 'rectangle') {
      const pts = pointsRef.current;
      if (pts.length === 0) {
        pointsRef.current = [ll];
        setPointCount(1);
      } else {
        const s = pts[0];
        finish([s, [s[0], ll[1]], ll, [ll[0], s[1]]], 'rectangle');
      }
      return;
    }

    // polyline — cek apakah klik menutup ke titik pertama (jadi area)
    const pts = pointsRef.current;
    if (tool === 'polyline' && pts.length >= 3 && isClosingPoint(pts[0], ll, m)) {
      // Tutup jadi area/polygon
      finish([...pts], 'polygon');
      return;
    }

    // tambah titik baru
    pointsRef.current.push(ll);
    setPointCount(pointsRef.current.length);

    // Taruh marker titik awal di titik pertama agar user tahu bisa ditutup
    if (tool === 'polyline' && pointsRef.current.length === 1 && L) {
      clearStartDot();
      const dotHtml = `<div style="width:14px;height:14px;border-radius:50%;background:${colorRef.current};border:2.5px solid #fff;box-shadow:0 1px 6px rgba(0,0,0,.4);cursor:pointer"></div>`;
      startDotRef.current = L.marker(ll, {
        icon: L.divIcon({ html: dotHtml, className: '', iconSize: [14, 14], iconAnchor: [7, 7] }),
        interactive: false,
        zIndexOffset: 100,
      }).addTo(m);
    }

    // Update preview
    clearPrev();
    if (pointsRef.current.length >= 2 && L) {
      previewRef.current = L.polyline(pointsRef.current, {
        color: colorRef.current, weight: 2.5, dashArray: '6,4', opacity: 0.9, interactive: false,
      }).addTo(m);
    }
  };

  const onMapMove = (e: any) => {
    const tool = toolRef.current;
    if (tool === 'none') return;
    const ll: [number, number] = [e.latlng.lat, e.latlng.lng];
    const L = window.L;
    const m = mapRef.current;

    if (tool === 'rectangle') {
      const pts = pointsRef.current;
      if (pts.length === 0) return;
      const s = pts[0];
      clearPrev();
      previewRef.current = L.polygon([s, [s[0], ll[1]], ll, [ll[0], s[1]]], {
        color: colorRef.current, weight: 2, fillOpacity: 0.12, dashArray: '6,4', interactive: false,
      }).addTo(m);
      return;
    }

    // polyline preview
    const pts = [...pointsRef.current, ll];
    if (pts.length < 2) return;

    // Snap highlight
    if (tool === 'polyline' && pointsRef.current.length >= 3) {
      const snap = isClosingPoint(pointsRef.current[0], ll, m);
      setSnapReady(snap);
      // Update warna dot titik pertama
      if (startDotRef.current) {
        const dotHtml = snap
          ? `<div style="width:18px;height:18px;border-radius:50%;background:#fff;border:3px solid ${colorRef.current};box-shadow:0 0 0 3px ${colorRef.current}55;cursor:pointer;transition:all .12s"></div>`
          : `<div style="width:14px;height:14px;border-radius:50%;background:${colorRef.current};border:2.5px solid #fff;box-shadow:0 1px 6px rgba(0,0,0,.4);cursor:pointer"></div>`;
        startDotRef.current.setIcon(L.divIcon({ html: dotHtml, className: '', iconSize: snap ? [18, 18] : [14, 14], iconAnchor: snap ? [9, 9] : [7, 7] }));
      }
    }

    clearPrev();
    previewRef.current = L.polyline(pts, {
      color: colorRef.current, weight: 2.5, dashArray: '6,4', opacity: 0.8, interactive: false,
    }).addTo(m);
  };

  const startDraw = (tool: DrawTool) => {
    if (!mapRef.current || !window.L) return;
    stopDraw();
    if (tool === 'none') return;
    const m = mapRef.current;
    setActiveTool(tool); toolRef.current = tool;
    pointsRef.current = []; setPointCount(0);
    m.doubleClickZoom.disable();
    setDrawMode(true);
    m.on('click', onMapClick);
    m.on('mousemove', onMapMove);
  };

  // Dbl-klik selesaikan garis
  const onMapDblClick = useCallback((e: any) => {
    window.L?.DomEvent?.stop(e);
    if (toolRef.current === 'polyline' && pointsRef.current.length >= 2) {
      finish([...pointsRef.current], 'polyline');
    }
  }, []);

  // Pasang / lepas dblclick handler saat tool berubah
  useEffect(() => {
    const m = mapRef.current;
    if (!m) return;
    if (activeTool === 'polyline') {
      m.on('dblclick', onMapDblClick);
    } else {
      m.off('dblclick', onMapDblClick);
    }
    return () => { m.off('dblclick', onMapDblClick); };
  }, [activeTool, onMapDblClick]);

  useEffect(() => () => stopDraw(), []);

  // Tutup modal → stop draw
  useEffect(() => {
    if (!open) stopDraw();
  }, [open]);

  // ── Save / Update / Delete ────────────────────────────────────────────────
  const handleSave = async () => {
    if (!pendingShape) return;
    showLoad('Menyimpan gambar peta...');
    try {
      const res = await apiPost('saveGambarPeta', {
        type: pendingShape.type, warna: drawColor,
        nama: formNama.trim() || `Gambar ${TYPE_LABEL[pendingShape.type] || pendingShape.type}`,
        ket: formKet.trim(), measurement: pendingShape.measurement,
        geojson: pendingShape.geojson, ts: new Date().toISOString(),
      });
      if (res.success) {
        triggerToast('Gambar peta disimpan.', 'ok');
        setPendingShape(null);
        fetchGambar();
      } else triggerToast('Gagal: ' + (res.message || ''), 'er');
    } catch (e: any) { triggerToast('Error: ' + e.message, 'er'); }
    hideLoad();
  };

  const handleUpdate = async (item: GambarPeta) => {
    showLoad('Memperbarui...');
    try {
      const res = await apiPost('saveGambarPeta', {
        id: item.id, type: item.type, warna: editWarna,
        nama: editNama.trim() || item.nama, ket: editKet.trim(),
        measurement: item.measurement || '', geojson: item.geojson,
        ts: item.ts || new Date().toISOString(),
      });
      if (res.success) { triggerToast('Berhasil diperbarui.', 'ok'); setEditingId(null); fetchGambar(); }
      else triggerToast('Gagal: ' + (res.message || ''), 'er');
    } catch (e: any) { triggerToast('Error: ' + e.message, 'er'); }
    hideLoad();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus gambar peta ini?')) return;
    showLoad('Menghapus...');
    try {
      const res = await apiPost('deleteGambarPeta', { id });
      if (res.success) { triggerToast('Gambar dihapus.', 'ok'); fetchGambar(); }
      else triggerToast('Gagal: ' + (res.message || ''), 'er');
    } catch (e: any) { triggerToast('Error: ' + e.message, 'er'); }
    hideLoad();
  };

  const openEdit = (item: GambarPeta) => {
    setEditingId(item.id); setEditNama(item.nama); setEditKet(item.ket); setEditWarna(item.warna || '#1e6fd9');
  };

  if (!isAdmin) return null;

  const TOOLS: { tool: DrawTool; icon: React.ReactNode; label: string; hint: string }[] = [
    { tool: 'polyline',  icon: <Minus  className="w-3.5 h-3.5" />, label: 'Garis',  hint: 'Klik titik → dbl-klik selesai. Klik ke titik awal = jadi Area.' },
    { tool: 'rectangle', icon: <Square className="w-3.5 h-3.5" />, label: 'Kotak',  hint: 'Klik 2 pojok diagonal' },
  ];

  const bannerText =
    activeTool === 'rectangle' ? (pointCount === 0 ? 'Klik pojok pertama' : 'Klik pojok kedua') :
    activeTool === 'polyline' ? (
      snapReady ? '⭕ Klik untuk tutup jadi Area!' :
      pointCount === 0 ? 'Klik titik pertama' :
      `${pointCount} titik — dbl-klik selesai${pointCount >= 3 ? ' / klik titik awal → Area' : ''}`
    ) : '';

  if (!open) {
    // Tetap render gambar shapes ke peta meski modal tertutup
    return null;
  }

  return (
    <>
      {/* ── Floating Draw Banner (saat mode gambar aktif) ────────────────── */}
      {activeTool !== 'none' && (
        <div style={{
          position: 'fixed', top: 68, left: '50%', transform: 'translateX(-50%)',
          zIndex: 10010, pointerEvents: 'auto',
          background: snapReady ? '#0d9268' : colorRef.current,
          color: '#fff', padding: '7px 16px', borderRadius: 30,
          boxShadow: `0 4px 18px ${snapReady ? '#0d926888' : colorRef.current + '77'}`,
          display: 'flex', alignItems: 'center', gap: 10,
          fontSize: '.72rem', fontWeight: 800, whiteSpace: 'nowrap',
          border: '1.5px solid rgba(255,255,255,.25)',
          transition: 'background .2s',
        }}>
          <MapPin className="w-3.5 h-3.5 shrink-0" />
          <span>{bannerText}</span>
          <button onClick={stopDraw} style={{
            background: 'rgba(255,255,255,.22)', border: '1px solid rgba(255,255,255,.35)',
            color: '#fff', borderRadius: 16, padding: '2px 10px',
            fontSize: '.64rem', fontWeight: 800, cursor: 'pointer', marginLeft: 4,
          }}>✕ Batal</button>
        </div>
      )}

      {/* ── Modal Floating ───────────────────────────────────────────────── */}
      <div style={{
        position: 'absolute', bottom: 68, right: 10, zIndex: 1000,
        width: 248, background: 'var(--card)', border: '1px solid var(--border)',
        borderRadius: 14, boxShadow: '0 8px 32px rgba(0,0,0,.18)',
        overflow: 'hidden', pointerEvents: 'auto',
      }}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '9px 12px', borderBottom: '1px solid var(--border)',
          background: 'var(--card)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{
              width: 26, height: 26, borderRadius: 7,
              background: activeTool !== 'none' ? drawColor : 'var(--teal)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              transition: 'background .2s',
            }}>
              <PenLine className="w-3.5 h-3.5 text-white" />
            </div>
            <div>
              <div style={{ fontSize: '.74rem', fontWeight: 800, color: 'var(--text)', lineHeight: 1.2 }}>Gambar Peta</div>
              <div style={{ fontSize: '.58rem', color: 'var(--muted)', fontWeight: 600 }}>{gambarList.length} objek</div>
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 4,
            borderRadius: 6, transition: 'background .12s',
          }}
            onMouseOver={e => (e.currentTarget.style.background = 'var(--bg)')}
            onMouseOut={e => (e.currentTarget.style.background = 'none')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>

          {/* Warna */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ fontSize: '.64rem', fontWeight: 800, color: 'var(--muted)', flexShrink: 0 }}>Warna</span>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <button
                onClick={() => setShowColorPicker(v => !v)}
                style={{
                  width: 24, height: 24, borderRadius: 6, background: drawColor,
                  border: '2px solid var(--border)', cursor: 'pointer',
                  boxShadow: `0 0 0 2px ${drawColor}44`,
                }}
              />
              {showColorPicker && (
                <div style={{
                  position: 'absolute', bottom: 30, left: 0, zIndex: 600,
                  background: 'var(--card)', border: '1px solid var(--border)',
                  borderRadius: 10, padding: 9, boxShadow: 'var(--shl)',
                  display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 5, width: 144,
                }}>
                  {WARNA_PRESET.map(w => (
                    <button key={w.hex} title={w.lbl}
                      onClick={() => { setDrawColor(w.hex); setShowColorPicker(false); }}
                      style={{
                        width: 24, height: 24, borderRadius: 6, background: w.hex, cursor: 'pointer',
                        border: w.hex === drawColor ? '2.5px solid var(--text)' : '2px solid transparent',
                      }}
                    />
                  ))}
                  <div style={{ gridColumn: '1/-1', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                    <span style={{ fontSize: '.58rem', color: 'var(--muted)', fontWeight: 700 }}>Custom:</span>
                    <input type="color" value={drawColor} onChange={e => setDrawColor(e.target.value)}
                      style={{ width: 32, height: 20, border: 'none', cursor: 'pointer', borderRadius: 4 }} />
                  </div>
                </div>
              )}
            </div>
            <div style={{ flex: 1, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {WARNA_PRESET.slice(0, 6).map(w => (
                <button key={w.hex} title={w.lbl}
                  onClick={() => setDrawColor(w.hex)}
                  style={{
                    width: 16, height: 16, borderRadius: 4, background: w.hex, cursor: 'pointer',
                    border: w.hex === drawColor ? '2px solid var(--text)' : '1px solid transparent',
                    flexShrink: 0,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Tool Buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {TOOLS.map(({ tool, icon, label, hint }) => (
              <button key={tool}
                onClick={() => activeTool === tool ? stopDraw() : startDraw(tool)}
                title={hint}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                  padding: '9px 6px', borderRadius: 9, cursor: 'pointer', transition: 'all .15s',
                  background: activeTool === tool ? drawColor : 'var(--bg)',
                  color: activeTool === tool ? '#fff' : 'var(--text)',
                  border: `1.5px solid ${activeTool === tool ? drawColor : 'var(--border)'}`,
                  boxShadow: activeTool === tool ? `0 2px 8px ${drawColor}44` : 'none',
                  fontSize: '.65rem', fontWeight: 800,
                  transform: activeTool === tool ? 'scale(1.04)' : 'scale(1)',
                }}>
                {icon}{label}
              </button>
            ))}
          </div>

          {/* Mode aktif info */}
          {activeTool !== 'none' && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '5px 9px', background: `${drawColor}14`, borderRadius: 7,
              border: `1px solid ${drawColor}38`,
            }}>
              <span style={{ fontSize: '.64rem', fontWeight: 700, color: drawColor, lineHeight: 1.3 }}>
                {activeTool === 'polyline' ? 'Garis — klik titik awal untuk jadi Area' : 'Klik 2 titik diagonal'}
              </span>
              <button onClick={stopDraw} style={{
                background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)',
                display: 'flex', alignItems: 'center', gap: 2, fontSize: '.6rem', fontWeight: 700, flexShrink: 0, marginLeft: 6,
              }}>
                <RotateCcw className="w-3 h-3" /> Batal
              </button>
            </div>
          )}

          {/* Daftar Objek (collapsible) */}
          <div>
            <button
              onClick={() => setShowList(v => !v)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '4px 0', background: 'none', border: 'none', cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: '.62rem', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>
                Objek ({gambarList.length})
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-[var(--muted)]" style={{ transform: showList ? 'rotate(180deg)' : '', transition: 'transform .2s' }} />
            </button>

            {showList && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 200, overflowY: 'auto', marginTop: 4 }}>
                {loading ? (
                  <div style={{ fontSize: '.68rem', color: 'var(--muted)', textAlign: 'center', padding: '8px 0' }}>Memuat...</div>
                ) : gambarList.length === 0 ? (
                  <div style={{ fontSize: '.68rem', color: 'var(--muted)', textAlign: 'center', padding: '10px 0', fontStyle: 'italic' }}>
                    Belum ada gambar.
                  </div>
                ) : gambarList.map(item => (
                  <div key={item.id} style={{
                    background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden',
                  }}>
                    {editingId === item.id ? (
                      <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <input value={editNama} onChange={e => setEditNama(e.target.value)} placeholder="Nama objek"
                          style={{ fontSize: '.7rem', padding: '4px 7px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text)', fontWeight: 700 }} />
                        <textarea value={editKet} onChange={e => setEditKet(e.target.value)} placeholder="Keterangan" rows={2}
                          style={{ fontSize: '.68rem', padding: '4px 7px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text)', resize: 'vertical' }} />
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, alignItems: 'center' }}>
                          {WARNA_PRESET.slice(0, 8).map(w => (
                            <button key={w.hex} onClick={() => setEditWarna(w.hex)}
                              style={{ width: 18, height: 18, borderRadius: 4, background: w.hex, border: w.hex === editWarna ? '2px solid var(--text)' : '1.5px solid transparent', cursor: 'pointer' }} />
                          ))}
                          <input type="color" value={editWarna} onChange={e => setEditWarna(e.target.value)}
                            style={{ width: 24, height: 18, border: '1px solid var(--border)', cursor: 'pointer', borderRadius: 4 }} />
                        </div>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button onClick={() => handleUpdate(item)} style={{ flex: 1, padding: '4px 0', borderRadius: 6, background: 'var(--teal)', color: '#fff', border: 'none', fontSize: '.64rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
                            <Save className="w-3 h-3" /> Simpan
                          </button>
                          <button onClick={() => setEditingId(null)} style={{ flex: 1, padding: '4px 0', borderRadius: 6, background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)', fontSize: '.64rem', fontWeight: 700, cursor: 'pointer' }}>
                            Batal
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 9, height: 9, borderRadius: 2, background: item.warna || '#1e6fd9', flexShrink: 0, border: '1px solid var(--border)' }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '.7rem', fontWeight: 800, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.nama || 'Tanpa nama'}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 1 }}>
                            <span style={{ fontSize: '.58rem', color: 'var(--muted)', background: 'var(--border)', padding: '1px 5px', borderRadius: 4, fontWeight: 700 }}>
                              {TYPE_LABEL[item.type] || item.type}
                            </span>
                            {item.measurement && (
                              <span style={{ fontSize: '.58rem', color: 'var(--blue)', fontFamily: 'var(--mono)', fontWeight: 600 }}>{item.measurement}</span>
                            )}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
                          <button onClick={() => openEdit(item)} title="Edit"
                            style={{ width: 24, height: 24, borderRadius: 6, background: 'var(--card)', border: '1px solid var(--border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--blue)' }}>
                            <Edit className="w-3 h-3" />
                          </button>
                          <button onClick={() => handleDelete(item.id)} title="Hapus"
                            style={{ width: 24, height: 24, borderRadius: 6, background: 'var(--card)', border: '1px solid var(--border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--red)' }}>
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ── Modal Simpan Shape Baru ─────────────────────────────────────── */}
      {pendingShape && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 11000,
          background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(3px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
        }}>
          <div style={{
            background: 'var(--card)', borderRadius: 16, padding: '18px 20px',
            maxWidth: 340, width: '100%', boxShadow: 'var(--shl)', border: '1px solid var(--border)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--teal)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Save className="w-3.5 h-3.5 text-white" />
              </div>
              <div>
                <div style={{ fontSize: '.8rem', fontWeight: 800, color: 'var(--text)' }}>Simpan Gambar Peta</div>
                <div style={{ fontSize: '.62rem', color: 'var(--muted)', fontWeight: 600 }}>
                  {TYPE_LABEL[pendingShape.type] || pendingShape.type}
                  {pendingShape.measurement && ` — ${pendingShape.measurement}`}
                </div>
              </div>
              <button onClick={() => setPendingShape(null)}
                style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={{ fontSize: '.68rem', fontWeight: 800, color: 'var(--text)', display: 'block', marginBottom: 3 }}>
                  Nama Objek <span style={{ color: 'var(--red)' }}>*</span>
                </label>
                <input autoFocus value={formNama} onChange={e => setFormNama(e.target.value)}
                  placeholder="Contoh: Batas Dusun Krajan…"
                  style={{ width: '100%', padding: '7px 9px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '.76rem', boxSizing: 'border-box', fontWeight: 600 }} />
              </div>
              <div>
                <label style={{ fontSize: '.68rem', fontWeight: 800, color: 'var(--text)', display: 'block', marginBottom: 3 }}>
                  Keterangan <span style={{ fontSize: '.6rem', color: 'var(--muted)', fontWeight: 600 }}>(opsional)</span>
                </label>
                <textarea value={formKet} onChange={e => setFormKet(e.target.value)}
                  placeholder="Deskripsi atau catatan…" rows={2}
                  style={{ width: '100%', padding: '7px 9px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '.74rem', resize: 'vertical', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: '.68rem', fontWeight: 800, color: 'var(--text)', display: 'block', marginBottom: 5 }}>Warna</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
                  {WARNA_PRESET.map(w => (
                    <button key={w.hex} title={w.lbl} onClick={() => setDrawColor(w.hex)}
                      style={{ width: 20, height: 20, borderRadius: 5, background: w.hex, border: w.hex === drawColor ? '2px solid var(--text)' : '1.5px solid transparent', cursor: 'pointer' }} />
                  ))}
                  <input type="color" value={drawColor} onChange={e => setDrawColor(e.target.value)}
                    style={{ width: 26, height: 20, border: '1px solid var(--border)', cursor: 'pointer', borderRadius: 4 }} />
                </div>
              </div>
              {/* Preview chip */}
              <div style={{ padding: '6px 10px', borderRadius: 8, background: 'var(--bg)', border: `2px solid ${drawColor}`, display: 'flex', alignItems: 'center', gap: 7 }}>
                <div style={{ width: 24, height: 24, borderRadius: 6, background: drawColor, opacity: 0.75, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '.7rem', fontWeight: 700, color: 'var(--text)' }}>{formNama || '—'}</div>
                  <div style={{ fontSize: '.62rem', color: 'var(--muted)' }}>
                    {TYPE_LABEL[pendingShape.type] || pendingShape.type} · {pendingShape.measurement}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 7, marginTop: 2 }}>
                <button onClick={handleSave}
                  style={{ flex: 2, padding: '8px 0', borderRadius: 9, background: 'var(--teal)', color: '#fff', border: 'none', fontSize: '.76rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                  <CheckCircle className="w-4 h-4" /> Simpan ke Peta
                </button>
                <button onClick={() => setPendingShape(null)}
                  style={{ flex: 1, padding: '8px 0', borderRadius: 9, background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)', fontSize: '.72rem', fontWeight: 700, cursor: 'pointer' }}>
                  Batal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default GambarPetaPanel;
