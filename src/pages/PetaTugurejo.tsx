import { Map, RefreshCw, Compass, Plus, ChevronUp, ChevronLeft, ChevronRight, ChevronDown, Navigation, Crosshair, Layers, Minimize2, Maximize2, Loader2, Minus, PenLine } from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';
import { useApp, useAuth } from '../App';
import { apiPost } from '../services/api';
import { esc } from '../utils/helpers';
import { LayerPeta } from '../types';
import { ConfirmModal } from '../components/common/ConfirmModal';

// Modular Sub-components
import { EditLayersModal } from '../components/peta/EditLayersModal';
import { PetaSkeleton } from '../components/SkeletonPages';
import GambarPetaPanel from '../components/peta/GambarPetaPanel';

declare const window: any;

interface PtkSimbol {
  id: string;
  ico: string;
  label: string;
  warna: string;
}

export const PetaTugurejo: React.FC = () => {
  const { showLoad, hideLoad, triggerToast, cacheGet, cacheSet, cacheRefresh, refreshTrigger, openGallery } = useApp();
  const { isAdmin } = useAuth();

  const [isInitialFetching, setIsInitialFetching] = useState(true);

  // Register global photo popup click handler for Leaflet
  useEffect(() => {
    (window as any).openGalleryFromMap = (linkDriveOrUrl: string) => {
      if (!linkDriveOrUrl) return;
      const driveId = (/\/file\/d\/([^\/\?]+)/.exec(linkDriveOrUrl)?.[1] || /[?&]id=([^&]+)/.exec(linkDriveOrUrl)?.[1]);
      const fullUrl = driveId ? `https://lh3.googleusercontent.com/d/${driveId}` : linkDriveOrUrl;
      openGallery([fullUrl], [fullUrl], 0);
    };
    return () => {
      delete (window as any).openGalleryFromMap;
    };
  }, [openGallery]);

  // UI state
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);

  // Leaflet references
  const mapRef = useRef<any>(null);
  const layersControlRef = useRef<any>(null);
  const kmlGroupRef = useRef<any>(null);
  const layerMarkersGroupRef = useRef<any>(null);
  const photosGroupRef = useRef<any>(null);
  const gambarGroupRef = useRef<any>(null);
  const kmlBoundsRef = useRef<any>(null);
  const locateMarkerRef = useRef<any>(null);
  const locateCircleRef = useRef<any>(null);
  const tempMarkerRef = useRef<any>(null);

  // Map Data states
  const [layersList, setLayersList] = useState<LayerPeta[]>([]);
  const [photosList, setPhotosList] = useState<any[]>([]);

  // Edit Map Layers Modal state
  const [showLayerModal, setShowLayerModal] = useState(false);
  const [editingLayer, setEditingLayer] = useState<LayerPeta | null>(null);
  const [layerFormOpen, setLayerFormOpen] = useState(false);

  // Nav panel state
  const [isNavPanelOpen, setIsNavPanelOpen] = useState(false);

  // Gambar Peta modal state
  const [showGambarPane, setShowGambarPane] = useState(false);

  // Form states for layer management
  const [layerFormNama, setLayerFormNama] = useState('');
  const [layerFormDeskripsi, setLayerFormDeskripsi] = useState('');
  const [layerFormSimbol, setLayerFormSimbol] = useState('rute');
  const [layerFormWarna, setLayerFormWarna] = useState('#1e6fd9');
  const [layerFormLat, setLayerFormLat] = useState('');
  const [layerFormLng, setLayerFormLng] = useState('');
  const [pickCoordMode, setPickCoordMode] = useState(false);
  const pickCoordModeRef = useRef<boolean>(false);
  const [showConfirmDeleteLayer, setShowConfirmDeleteLayer] = useState<string | number | null>(null);

  // Constants (Center of Tugurejo)
  const PETA_CENTER: [number, number] = [-8.04826, 111.37173];
  const PETA_ZOOM = 14;

  const DRAW_WARNA_PRESET = [
    { hex: '#1e6fd9', lbl: 'Biru' }, { hex: '#c0392b', lbl: 'Merah' },
    { hex: '#0d9268', lbl: 'Hijau' }, { hex: '#d97706', lbl: 'Kuning' },
    { hex: '#7c3aed', lbl: 'Ungu' }, { hex: '#0891b2', lbl: 'Tosca' },
    { hex: '#e67e22', lbl: 'Oranye' }, { hex: '#e91e63', lbl: 'Pink' },
    { hex: '#607d8b', lbl: 'Abu' }, { hex: '#1a1a2e', lbl: 'Hitam' },
    { hex: '#f59e0b', lbl: 'Emas' }, { hex: '#10b981', lbl: 'Zamrud' }
  ];

  const SIMBOL_DEF: PtkSimbol[] = [
    { id: 'rute',     ico: 'fa-route',               label: 'Rute Patroli', warna: '#1e6fd9' },
    { id: 'hotspot',  ico: 'fa-triangle-exclamation', label: 'Titik Rawan', warna: '#c0392b' },
    { id: 'posjaga',  ico: 'fa-shield-halved',        label: 'Pos Jaga',    warna: '#0d9268' },
    { id: 'toko',     ico: 'fa-store',                label: 'Toko',        warna: '#d97706' },
    { id: 'batas',    ico: 'fa-draw-polygon',         label: 'Batas',       warna: '#7c3aed' },
    { id: 'bangunan', ico: 'fa-building',             label: 'Bangunan',    warna: '#0891b2' },
    { id: 'kamera',   ico: 'fa-video',                label: 'Kamera Pantau', warna: '#e67e22' },
    { id: 'parkir',   ico: 'fa-square-parking',       label: 'Parkir',      warna: '#2ecc71' }
  ];

  const TILE_LAYERS: Record<string, any> = {
    osm: { url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', attr: '© OpenStreetMap', label: 'OpenStreetMap', maxZoom: 19 },
    satellite: { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', attr: 'Esri', label: 'Satelit Esri', maxZoom: 19 },
    hybrid: { url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', attr: 'Google', label: 'Google Hybrid', maxZoom: 20 },
    google_sat: { url: 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', attr: 'Google', label: 'Google Sat', maxZoom: 20 },
    topo: { url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', attr: 'OpenTopoMap', label: 'Topografi', maxZoom: 17 }
  };

  useEffect(() => {
    setIsInitialFetching(false);
  }, []);

  // React to global cache refresh triggers
  useEffect(() => {
    fetchMapResources();
  }, [refreshTrigger]);

  // Keep pickCoordModeRef synced with state
  useEffect(() => {
    pickCoordModeRef.current = pickCoordMode;
    if (mapRef.current) {
      const container = mapRef.current.getContainer();
      if (container) {
        container.style.cursor = pickCoordMode ? 'crosshair' : '';
      }
    }
  }, [pickCoordMode]);

  // Unified Coordinate Picker Handler (works on map, KML polygons, or markers)
  const handlePickCoordinateEvent = (latlng: any) => {
    if (!pickCoordModeRef.current) return false;
    const lat = Number(latlng.lat).toFixed(6);
    const lng = Number(latlng.lng).toFixed(6);
    
    setLayerFormLat(lat);
    setLayerFormLng(lng);

    const L = window.L;
    if (L && mapRef.current) {
      if (tempMarkerRef.current) {
        tempMarkerRef.current.setLatLng(latlng);
      } else {
        tempMarkerRef.current = L.marker(latlng, {
          icon: L.icon({
            iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSIjYzAzOTJiIj48cGF0aCBkPSJNMTIgMkM4LjEzIDIgNCA2LjEzIDQgMTJjMCA1LjI1IDggMTIgOCAxMnM4LTYuNzUgOC0xMmMwLTUuODctNC4xMy0xMC04LTEwem0wIDE0Yy0yLjIxIDAtNC0xLjc5LTQtNHMxLjc5LTQgNC00IDQgMS43OSA0IDQtMS43OSA0LTQgNHoiLz48L3N2Zz4=',
            iconSize: [24, 24],
            iconAnchor: [12, 24],
          })
        }).addTo(mapRef.current);
      }
      mapRef.current.closePopup();
    }

    setPickCoordMode(false);
    pickCoordModeRef.current = false;
    setShowLayerModal(true);
    triggerToast(`Koordinat terpilih: ${lat}, ${lng}`, 'ok');
    return true;
  };

  // Ensure Leaflet is loaded
  const _ensureLeafletLoaded = (cb: () => void) => {
    if (window.L) {
      cb();
      return;
    }
    const injectStyle = (href: string, id: string) => {
      if (document.getElementById(id)) return;
      const l = document.createElement('link');
      l.id = id;
      l.rel = 'stylesheet';
      l.href = href;
      document.head.appendChild(l);
    };

    const injectScript = (src: string, onLoad: () => void) => {
      const e = document.createElement('script');
      e.src = src;
      e.onload = onLoad;
      document.head.appendChild(e);
    };

    injectStyle('https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css', 'lf-css');
    injectScript('https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js', cb);
  };

  const SVG_ICONS: Record<string, string> = {
    'rute': `<path d="M9 17a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z" /><path d="M19 7a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z" /><path d="M7 15V9a4 4 0 0 1 4-4h4" />`,
    'hotspot': `<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />`,
    'posjaga': `<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />`,
    'toko': `<path d="m2 7 4.41-3.67A2 2 0 0 1 7.7 3h8.6a2 2 0 0 1 1.3.33L22 7" /><path d="M2 12h20" /><path d="M2 7v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V7" /><path d="M12 17V12" /><path d="M9 17H4v-5h5v5zm10 0h-5v-5h5v5z" />`,
    'batas': `<polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" /><line x1="9" y1="3" x2="9" y2="18" /><line x1="15" y1="6" x2="15" y2="21" />`,
    'bangunan': `<rect x="4" y="2" width="16" height="20" rx="2" ry="2" /><line x1="9" y1="22" x2="9" y2="16" /><line x1="15" y1="22" x2="15" y2="16" /><line x1="9" y1="16" x2="15" y2="16" /><path d="M8 6h2" /><path d="M14 6h2" /><path d="M8 11h2" /><path d="M14 11h2" />`,
    'kamera': `<path d="m22 8-6 4 6 4V8Z" /><rect x="2" y="6" width="14" height="12" rx="2" ry="2" />`,
    'parkir': `<rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 17V7h4a3 3 0 0 1 0 6H9" />`,
    'map-pin': `<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" />`
  };

  const _makeLeafletIcon = (warna: string, simbolId: string) => {
    const pathContent = SVG_ICONS[simbolId] || SVG_ICONS['map-pin'];
    const html = `
      <svg width="28" height="36" viewBox="0 0 32 40" style="display: block; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.25))">
        <path d="M16 0 C9.37 0 4 5.37 4 12 C4 21.5 16 40 16 40 C16 40 28 21.5 28 12 C28 5.37 22.63 0 16 0 Z" fill="${warna}" />
        <circle cx="16" cy="12" r="7.5" fill="#ffffff" />
        <g transform="translate(10, 6) scale(0.5)" stroke="${warna}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none">
          ${pathContent}
        </g>
      </svg>
    `;
    return window.L.divIcon({
      html: html,
      className: 'custom-div-icon',
      iconSize: [28, 36],
      iconAnchor: [14, 36],
      popupAnchor: [0, -32],
    });
  };

  const extractLayers = (res: any): LayerPeta[] => {
    if (Array.isArray(res)) return res;
    if (Array.isArray(res?.layers)) return res.layers;
    if (Array.isArray(res?.data?.layers)) return res.data.layers;
    if (Array.isArray(res?.data)) return res.data;
    return [];
  };

  const extractPhotos = (res: any): any[] => {
    if (Array.isArray(res)) return res;
    if (Array.isArray(res?.photos)) return res.photos;
    if (Array.isArray(res?.data?.photos)) return res.data.photos;
    if (Array.isArray(res?.data)) return res.data;
    return [];
  };

  // Load Map Data (Layers & Photos)
  const fetchMapResources = async () => {
    // 1. Fetch Layers
    try {
      const cached = cacheGet('layerPeta');
      if (cached) {
        setLayersList(extractLayers(cached));
        cacheRefresh('layerPeta').then(() => {
          const fresh = cacheGet('layerPeta');
          if (fresh) setLayersList(extractLayers(fresh));
        });
      } else {
        await cacheRefresh('layerPeta', true);
        const fresh = cacheGet('layerPeta');
        if (fresh) setLayersList(extractLayers(fresh));
      }
    } catch (e) {
      console.error(e);
    }

    // 2. Fetch Photos details
    try {
      const cached = cacheGet('fotoMarker');
      if (cached) {
        setPhotosList(extractPhotos(cached));
        cacheRefresh('fotoMarker').then(() => {
          const fresh = cacheGet('fotoMarker');
          if (fresh) setPhotosList(extractPhotos(fresh));
        });
      } else {
        await cacheRefresh('fotoMarker', true);
        const fresh = cacheGet('fotoMarker');
        if (fresh) setPhotosList(extractPhotos(fresh));
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Load KML from public/tugurejo.kml and add to map
  const loadTugurejoKml = async (map: any) => {
    const L = window.L;
    if (!L || !map || !kmlGroupRef.current) return;

    try {
      const res = await fetch('/tugurejo.kml');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const kmlText = await res.text();

      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(kmlText, 'text/xml');

      const kmlGroup = kmlGroupRef.current;
      kmlGroup.clearLayers();

      const placemarks = xmlDoc.getElementsByTagName('Placemark');

      for (let i = 0; i < placemarks.length; i++) {
        const pm = placemarks[i];
        
        const dataNodes = pm.getElementsByTagName('Data');
        const dataObj: Record<string, string> = {};
        for (let j = 0; j < dataNodes.length; j++) {
          const dName = dataNodes[j].getAttribute('name');
          const valNode = dataNodes[j].getElementsByTagName('value')[0];
          if (dName && valNode) {
            dataObj[dName] = valNode.textContent || '';
          }
        }

        // Polygon Parsing
        const polygonNodes = pm.getElementsByTagName('Polygon');
        for (let p = 0; p < polygonNodes.length; p++) {
          const poly = polygonNodes[p];
          const outerCoordNodes = poly.getElementsByTagName('outerBoundaryIs')[0]?.getElementsByTagName('coordinates')[0];
          if (outerCoordNodes && outerCoordNodes.textContent) {
            const rawCoords = outerCoordNodes.textContent.trim().split(/\s+/);
            const latlngs: [number, number][] = rawCoords
              .map(coordStr => {
                const parts = coordStr.split(',');
                const lng = parseFloat(parts[0]);
                const lat = parseFloat(parts[1]);
                return [lat, lng] as [number, number];
              })
              .filter(([lat, lng]) => !isNaN(lat) && !isNaN(lng));

            if (latlngs.length > 0) {
              const polygonLayer = L.polygon(latlngs, {
                color: '#0284c7',
                weight: 2.8,
                opacity: 0.95,
                fillColor: '#0ea5e9',
                fillOpacity: 0.15,
              });

              polygonLayer.on('mouseover', () => {
                polygonLayer.setStyle({
                  weight: 3.8,
                  fillOpacity: 0.25,
                  color: '#0369a1'
                });
              });
              polygonLayer.on('mouseout', () => {
                polygonLayer.setStyle({
                  weight: 2.8,
                  fillOpacity: 0.15,
                  color: '#0284c7'
                });
              });

              const kelurahan = dataObj.nm_kelurahan || 'Tugurejo';
              const popupHtml = `
                <div class="lf-clean-popup" style="min-width:180px">
                  <div style="font-weight:800;font-size:0.85rem;color:var(--text);display:flex;align-items:center;gap:6px">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0284c7" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                    <span>Desa ${esc(kelurahan)}</span>
                  </div>
                  <div style="margin-top:5px;display:inline-block;padding:2px 8px;background:#0284c718;color:#0284c7;border:1px solid #0284c730;border-radius:4px;font-size:0.64rem;font-weight:700">
                    Batas Administrasi Wilayah
                  </div>
                  <div style="font-size:0.68rem;color:var(--muted);margin-top:6px;line-height:1.4">
                    Kec. Slahung, Kab. Ponorogo, Jawa Timur
                  </div>
                </div>
              `;
              polygonLayer.bindPopup(popupHtml);

              // Allow clicking directly ON TOP of the KML Polygon to pick coordinates
              polygonLayer.on('click', (e: any) => {
                if (pickCoordModeRef.current) {
                  L.DomEvent.stopPropagation(e);
                  L.DomEvent.preventDefault(e);
                  handlePickCoordinateEvent(e.latlng);
                  return;
                }
              });

              kmlGroup.addLayer(polygonLayer);
            }
          }
        }

        // LineString Parsing
        const lineNodes = pm.getElementsByTagName('LineString');
        for (let l = 0; l < lineNodes.length; l++) {
          const line = lineNodes[l];
          const coordNode = line.getElementsByTagName('coordinates')[0];
          if (coordNode && coordNode.textContent) {
            const rawCoords = coordNode.textContent.trim().split(/\s+/);
            const latlngs: [number, number][] = rawCoords
              .map(coordStr => {
                const parts = coordStr.split(',');
                return [parseFloat(parts[1]), parseFloat(parts[0])] as [number, number];
              })
              .filter(([lat, lng]) => !isNaN(lat) && !isNaN(lng));

            if (latlngs.length > 0) {
              const lineLayer = L.polyline(latlngs, {
                color: '#0284c7',
                weight: 3,
                opacity: 0.9,
              });

              lineLayer.on('click', (e: any) => {
                if (pickCoordModeRef.current) {
                  L.DomEvent.stopPropagation(e);
                  L.DomEvent.preventDefault(e);
                  handlePickCoordinateEvent(e.latlng);
                  return;
                }
              });

              kmlGroup.addLayer(lineLayer);
            }
          }
        }
      }

      if (kmlGroup.getLayers().length > 0) {
        const bounds = kmlGroup.getBounds();
        kmlBoundsRef.current = bounds;
        map.fitBounds(bounds, { padding: [25, 25], animate: true });
      }
    } catch (err) {
      console.error('Failed to load tugurejo.kml:', err);
    }
  };

  // Init leaflet instance on render
  useEffect(() => {
    if (isInitialFetching) return;

    _ensureLeafletLoaded(() => {
      const L = window.L;
      if (!L) return;

      const md = document.getElementById('lf-map-div');
      if (!md) return;

      if (mapRef.current) {
        try {
          mapRef.current.off();
          mapRef.current.remove();
        } catch (e) {
          // Ignore
        }
        mapRef.current = null;
      }

      const map = L.map('lf-map-div', {
        center: PETA_CENTER,
        zoom: PETA_ZOOM,
        zoomControl: false,
        attributionControl: true,
      });
      mapRef.current = map;

      // Base tile layers
      const osmL = L.tileLayer(TILE_LAYERS.osm.url, { attribution: TILE_LAYERS.osm.attr, maxZoom: 19, crossOrigin: true });
      const satL = L.tileLayer(TILE_LAYERS.satellite.url, { attribution: TILE_LAYERS.satellite.attr, maxZoom: 19, crossOrigin: true });
      const hybL = L.tileLayer(TILE_LAYERS.hybrid.url, { attribution: TILE_LAYERS.hybrid.attr, maxZoom: 20, crossOrigin: true });
      const gsL = L.tileLayer(TILE_LAYERS.google_sat.url, { attribution: TILE_LAYERS.google_sat.attr, maxZoom: 20, crossOrigin: true });
      const toL = L.tileLayer(TILE_LAYERS.topo.url, { attribution: TILE_LAYERS.topo.attr, maxZoom: 17, crossOrigin: true });

      osmL.addTo(map);

      // Create Overlay FeatureGroups
      const kmlGroup = L.featureGroup().addTo(map);
      kmlGroupRef.current = kmlGroup;

      const layerMarkersGroup = L.layerGroup().addTo(map);
      layerMarkersGroupRef.current = layerMarkersGroup;

      const photosGroup = L.layerGroup().addTo(map);
      photosGroupRef.current = photosGroup;

      const gambarGroup = L.featureGroup().addTo(map);
      gambarGroupRef.current = gambarGroup;

      // Layer switcher control (Base layers + Overlays including KML Tugurejo)
      const baseMaps = {
        '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1e6fd9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:middle;margin-right:2px"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/></svg>&nbsp;OSM': osmL,
        '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0d9268" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:middle;margin-right:2px"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/></svg>&nbsp;Satelit': satL,
        '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ea580c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:middle;margin-right:2px"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1 4-10z"/></svg>&nbsp;G.Sat': gsL,
        '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:middle;margin-right:2px"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/><path d="M15 3v18"/><path d="M3 9h18"/><path d="M3 15h18"/></svg>&nbsp;Hybrid': hybL,
        '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#b45309" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:middle;margin-right:2px"><path d="m8 3 4 8 5-5 5 15H2L8 3z"/></svg>&nbsp;Topo': toL,
      };

      const overlayMaps = {
        '<span style="font-weight:700;color:var(--text);font-size:0.7rem;"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#0284c7" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:middle;margin-right:3px"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>Peta KML Tugurejo</span>': kmlGroup,
        '<span style="font-weight:700;color:var(--text);font-size:0.7rem;"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#1e6fd9" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:middle;margin-right:3px"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>Layer Titik Lokasi</span>': layerMarkersGroup,
        '<span style="font-weight:700;color:var(--text);font-size:0.7rem;"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#0d9268" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:middle;margin-right:3px"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>Foto Dokumentasi</span>': photosGroup,
        '<span style="font-weight:700;color:var(--text);font-size:0.7rem;"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#0d9268" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:middle;margin-right:3px"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>Gambar &amp; Area Peta</span>': gambarGroup,
      };

      const layersControl = L.control.layers(baseMaps, overlayMaps, { collapsed: true, position: 'topright' }).addTo(map);
      layersControlRef.current = layersControl;

      // Handle layer toggle container on click
      const container = layersControl.getContainer();
      if (container) {
        const blockHover = (e: Event) => {
          e.stopImmediatePropagation();
          e.stopPropagation();
        };
        container.addEventListener('mouseover', blockHover, true);
        container.addEventListener('mouseout', blockHover, true);
        container.addEventListener('mouseenter', blockHover, true);
        container.addEventListener('mouseleave', blockHover, true);
        container.addEventListener('pointerover', blockHover, true);
        container.addEventListener('pointerout', blockHover, true);
        container.addEventListener('pointerenter', blockHover, true);
        container.addEventListener('pointerleave', blockHover, true);
        
        let expanded = false;
        const toggleBtn = container.querySelector('.leaflet-control-layers-toggle');
        if (toggleBtn) {
          L.DomEvent.on(toggleBtn, 'click', (e: any) => {
            L.DomEvent.stop(e);
            if (expanded) {
              (layersControl as any)._collapse();
              expanded = false;
            } else {
              (layersControl as any)._expand();
              expanded = true;
            }
          });
        }
        
        map.on('click', () => {
          if (expanded) {
            (layersControl as any)._collapse();
            expanded = false;
          }
        });
      }

      L.control.scale({ imperial: false, position: 'bottomleft' }).addTo(map);

      // Base map click listener for coordinate picking
      map.on('click', (e: any) => {
        if (pickCoordModeRef.current) {
          handlePickCoordinateEvent(e.latlng);
        }
      });

      // Load KML boundary & center
      loadTugurejoKml(map);

      // Fetch resources
      fetchMapResources();

      setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.invalidateSize({ animate: false });
        }
        setIsMapReady(true);
      }, 100);
    });

    return () => {
      setIsMapReady(false);
      if (mapRef.current) {
        try {
          mapRef.current.off();
          mapRef.current.remove();
        } catch (e) {
          // Ignore
        }
        mapRef.current = null;
      }
      kmlGroupRef.current = null;
      layerMarkersGroupRef.current = null;
      photosGroupRef.current = null;
      gambarGroupRef.current = null;
      layersControlRef.current = null;
      if (tempMarkerRef.current) {
        tempMarkerRef.current = null;
      }
      locateMarkerRef.current = null;
      locateCircleRef.current = null;
    };
  }, [isInitialFetching]);

  // Sync Layer Markers & Field Photos to respective Leaflet groups
  useEffect(() => {
    if (!mapRef.current || !window.L) return;
    const L = window.L;

    // 1. Render Layer Peta Markers
    if (layerMarkersGroupRef.current) {
      const markersGroup = layerMarkersGroupRef.current;
      markersGroup.clearLayers();

      const activeLayers = layersList.filter((l) => l.aktif);
      activeLayers.forEach((layer) => {
        const sd = SIMBOL_DEF.find((s) => s.id === layer.simbol) || SIMBOL_DEF[0];
        const marker = L.marker([layer.lat, layer.lng], {
          icon: _makeLeafletIcon(layer.warna || sd.warna, layer.simbol)
        });
        const gmUrl = `https://maps.google.com/?q=${layer.lat},${layer.lng}`;
        marker.bindPopup(`
          <div class="lf-clean-popup">
            <div class="lf-popup-title" style="font-weight:800;color:var(--text);font-size:0.78rem;margin-bottom:4px">
              ${esc(layer.nama)}
            </div>
            ${layer.deskripsi ? `<div style="font-size:0.7rem;color:var(--muted);line-height:1.4;margin-bottom:8px">${esc(layer.deskripsi)}</div>` : '<div style="margin-bottom:8px"/>'}
            <a href="${gmUrl}" target="_blank" rel="noopener noreferrer"
              style="display:inline-flex;align-items:center;gap:5px;padding:5px 11px;background:${layer.warna || '#1e6fd9'};color:#fff;border-radius:7px;font-size:0.68rem;font-weight:700;text-decoration:none;width:100%;justify-content:center;box-sizing:border-box">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
              Buka di Google Maps
            </a>
          </div>
        `, { maxWidth: 220 });

        marker.on('click', (e: any) => {
          if (pickCoordModeRef.current) {
            L.DomEvent.stopPropagation(e);
            L.DomEvent.preventDefault(e);
            handlePickCoordinateEvent(e.latlng);
            return;
          }
        });

        markersGroup.addLayer(marker);
      });
    }

    // 2. Render Field Photos
    if (photosGroupRef.current) {
      const photoGroup = photosGroupRef.current;
      photoGroup.clearLayers();

      photosList.forEach((pt: any) => {
        if (!pt.lat || !pt.lng) return;
        const c = '#1e6fd9';
        
        const iconHtml = `<div class="df-dot" style="background:${c};box-shadow:0 2px 8px ${c}55"></div>`;
        const icon = L.divIcon({ html: iconHtml, className: '', iconSize: [13, 13], iconAnchor: [6, 6], popupAnchor: [0, -8] });
        
        const m = L.marker([pt.lat, pt.lng], { icon });

        const driveId = pt.linkDrive ? (/\/file\/d\/([^\/\?]+)/.exec(pt.linkDrive)?.[1] || /[?&]id=([^&]+)/.exec(pt.linkDrive)?.[1]) : null;
        const imageUrl = driveId ? `https://lh3.googleusercontent.com/d/${driveId}` : (pt.thumbUrl || pt.linkDrive || '');

        const thumb = imageUrl
          ? `<img src="${esc(imageUrl)}" style="width:100%;max-height:100px;object-fit:cover;border-radius:7px;margin:6px 0 4px;cursor:pointer" onclick="window.openGalleryFromMap('${esc(pt.linkDrive || imageUrl)}')" onerror="this.style.display='none';" />`
          : '';
        const btnDrv = pt.linkDrive ? `<a href="${esc(pt.linkDrive)}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:4px;padding:4px 9px;background:#0d9268;color:#fff;border-radius:6px;font-size:.62rem;font-weight:700;text-decoration:none;margin-right:4px"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:4px;"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg> Drive</a>` : '';
        const btnGmaps = pt.linkGmaps ? `<a href="${esc(pt.linkGmaps)}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:4px;padding:4px 9px;background:#1e6fd9;color:#fff;border-radius:6px;font-size:.62rem;font-weight:700;text-decoration:none"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:4px;"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg> Maps</a>` : '';
        const actions = (btnDrv || btnGmaps) ? `<div style="margin-top:7px;display:flex;flex-wrap:wrap;gap:4px">${btnDrv}${btnGmaps}</div>` : '';

        const popupHtml = `
          <div class="lf-clean-popup">
            <div class="lf-popup-title" style="font-weight:800;color:var(--text);font-size:0.75rem;margin-bottom:4px">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:4px;"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg> ${esc(pt.namaFile || 'Foto Lapangan')}
            </div>
            ${thumb}
            ${pt.danru ? `<div class="lf-popup-row" style="font-size:0.68rem;color:var(--text);margin-top:3px;"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#0d9268" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:4px;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg><b>${esc(pt.danru)}</b></div>` : ''}
            ${pt.waktuExif ? `<div class="lf-popup-row" style="font-size:0.65rem;color:var(--muted);margin-top:3px;"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:4px;"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>${esc(pt.waktuExif)}</div>` : ''}
            <div class="lf-popup-row" style="font-size:0.63rem;color:var(--muted);margin-top:3px;"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:4px;"><circle cx="12" cy="12" r="10"/><line x1="22" y1="12" x2="18" y2="12"/><line x1="6" y1="12" x2="2" y2="12"/><line x1="12" y1="6" x2="12" y2="2"/><line x1="12" y1="22" x2="12" y2="18"/></svg><span style="font-family:var(--mono)">${pt.lat.toFixed(6)}, ${pt.lng.toFixed(6)}</span></div>
            ${pt.ket ? `<div class="lf-popup-row" style="font-size:0.68rem;color:var(--mid);margin-top:3px;"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:4px;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg><span>${esc(pt.ket)}</span></div>` : ''}
            ${actions}
          </div>
        `;

        m.bindPopup(popupHtml, { maxWidth: 260 });

        m.on('click', (e: any) => {
          if (pickCoordModeRef.current) {
            L.DomEvent.stopPropagation(e);
            L.DomEvent.preventDefault(e);
            handlePickCoordinateEvent(e.latlng);
            return;
          }
        });

        photoGroup.addLayer(m);
      });
    }
  }, [layersList, photosList, isMapReady]);

  // Client Locate position trigger
  const handleLocateMe = () => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    
    map.locate({ setView: true, maxZoom: 16 });
    
    map.on('locationfound', (e: any) => {
      if (locateMarkerRef.current) map.removeLayer(locateMarkerRef.current);
      if (locateCircleRef.current) map.removeLayer(locateCircleRef.current);

      const radius = e.accuracy / 2;
      const L = window.L;

      locateMarkerRef.current = L.marker(e.latlng, {
        icon: L.divIcon({
          className: 'custom-div-icon',
          html: '<div class="peta-locate-dot"></div>',
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        }),
      }).addTo(map);

      locateCircleRef.current = L.circle(e.latlng, radius, {
        color: '#1e6fd9',
        fillColor: '#1e6fd9',
        fillOpacity: 0.15,
        weight: 1.5,
      }).addTo(map);

      triggerToast('Lokasi Anda ditemukan.', 'ok');
    });

    map.on('locationerror', () => {
      triggerToast('Gagal melacak lokasi. Pastikan izin GPS aktif.', 'er');
    });
  };

  const handlePetaResetView = () => {
    if (!mapRef.current) return;
    if (kmlBoundsRef.current) {
      mapRef.current.fitBounds(kmlBoundsRef.current, { padding: [25, 25], animate: true });
    } else {
      mapRef.current.flyTo(PETA_CENTER, PETA_ZOOM, { animate: true, duration: 1.2 });
    }
  };

  // Fullscreen trigger using HTML5 API
  const togglePetaFullscreen = () => {
    const mainWrap = document.getElementById('peta-main-wrap');
    if (!mainWrap) return;

    if (!document.fullscreenElement) {
      mainWrap.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
        mainWrap.classList.add('peta-fs-active');
        setIsFullscreen(true);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      const isFs = !!document.fullscreenElement;
      setIsFullscreen(isFs);
      const mainWrap = document.getElementById('peta-main-wrap');
      if (mainWrap) {
        if (isFs) mainWrap.classList.add('peta-fs-active');
        else mainWrap.classList.remove('peta-fs-active');
      }
      setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.invalidateSize({ animate: false });
        }
      }, 120);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Reload Active Map
  const reloadPetaActive = async () => {
    showLoad('Memperbarui data peta...');
    try {
      await Promise.all([
        cacheRefresh('layerPeta'),
        cacheRefresh('fotoMarker'),
        cacheRefresh('rekap')
      ]);
      await fetchMapResources();
      if (mapRef.current) {
        await loadTugurejoKml(mapRef.current);
      }
      triggerToast('Peta Tugurejo diperbarui.', 'ok');
    } catch (err: any) {
      triggerToast('Gagal memperbarui: ' + err.message, 'er');
    } finally {
      hideLoad();
    }
  };

  // --- LAYER EDIT MODAL METHODS ---
  const handleOpenLayerModal = () => {
    setEditingLayer(null);
    setLayerFormOpen(false);
    setShowLayerModal(true);
  };

  const openLayerForm = (layer: LayerPeta | null) => {
    setEditingLayer(layer);
    if (layer) {
      setLayerFormNama(layer.nama);
      setLayerFormDeskripsi(layer.deskripsi || '');
      setLayerFormSimbol(layer.simbol);
      setLayerFormWarna(layer.warna || '#1e6fd9');
      setLayerFormLat(String(layer.lat));
      setLayerFormLng(String(layer.lng));
    } else {
      setLayerFormNama('');
      setLayerFormDeskripsi('');
      setLayerFormSimbol('rute');
      setLayerFormWarna('#1e6fd9');
      setLayerFormLat('');
      setLayerFormLng('');
    }
    setLayerFormOpen(true);
  };

  const triggerPickCoordinate = () => {
    setShowLayerModal(false);
    setPickCoordMode(true);
    pickCoordModeRef.current = true;
    if (mapRef.current) {
      mapRef.current.closePopup();
      mapRef.current.getContainer().style.cursor = 'crosshair';
    }
    triggerToast('Silakan klik lokasi pada peta (atau di dalam area KML) untuk menyalin koordinat.', 'inf');
  };

  const cancelPickCoordinate = () => {
    setPickCoordMode(false);
    pickCoordModeRef.current = false;
    if (mapRef.current) {
      mapRef.current.getContainer().style.cursor = '';
    }
    setShowLayerModal(true);
  };

  const handleToggleLayerActive = async (layer: LayerPeta) => {
    setLayersList((prev) =>
      prev.map((l) => (l._ri === layer._ri ? { ...l, aktif: !l.aktif } : l))
    );

    try {
      const res = await apiPost('toggleLayerAktif', {
        ri: layer._ri,
        aktif: !layer.aktif,
      });
      if (res.success) {
        cacheSet('layerPeta', null);
      } else {
        triggerToast('Gagal update layer: ' + res.message, 'er');
        setLayersList((prev) =>
          prev.map((l) => (l._ri === layer._ri ? { ...l, aktif: l.aktif } : l))
        );
      }
    } catch (e: any) {
      triggerToast('Error: ' + e.message, 'er');
    }
  };

  const handleSubmitLayerForm = async () => {
    if (!layerFormNama.trim() || !layerFormLat || !layerFormLng) {
      triggerToast('Nama, Latitude, dan Longitude wajib diisi.', 'er');
      return;
    }

    const payload: Record<string, any> = {
      nama: layerFormNama.trim(),
      deskripsi: layerFormDeskripsi.trim(),
      simbol: layerFormSimbol,
      warna: layerFormWarna,
      lat: parseFloat(layerFormLat),
      lng: parseFloat(layerFormLng),
      aktif: editingLayer ? editingLayer.aktif : true,
    };

    if (editingLayer) {
      payload._ri = editingLayer._ri;
    }

    const action = editingLayer ? 'updateLayerPeta' : 'addLayerPeta';
    showLoad('Menyimpan layer...');
    setLayerFormOpen(false);

    try {
      const res = await apiPost(action, payload);
      hideLoad();
      if (res.success) {
        triggerToast(editingLayer ? 'Layer diperbarui.' : 'Layer ditambahkan.', 'ok');
        cacheSet('layerPeta', null);
        fetchMapResources();
        setShowLayerModal(true);
      } else {
        triggerToast('Gagal: ' + (res.message || ''), 'er');
        setLayerFormOpen(true);
      }
    } catch (e: any) {
      hideLoad();
      triggerToast('Error: ' + e.message, 'er');
      setLayerFormOpen(true);
    }
  };

  const handleDeleteLayer = async () => {
    if (showConfirmDeleteLayer === null) return;
    const ri = showConfirmDeleteLayer;
    setShowConfirmDeleteLayer(null);
    showLoad('Menghapus layer...');

    try {
      const res = await apiPost('deleteLayerPeta', { ri });
      hideLoad();
      if (res.success) {
        triggerToast('Layer terhapus.', 'ok');
        cacheSet('layerPeta', null);
        fetchMapResources();
      } else {
        triggerToast('Gagal menghapus layer: ' + res.message, 'er');
      }
    } catch (e: any) {
      hideLoad();
      triggerToast('Error: ' + e.message, 'er');
    }
  };

  if (isInitialFetching) {
    return <PetaSkeleton />;
  }

  return (
    <div style={{ height: '100%', overflowY: 'auto', overflowX: 'hidden', display: 'flex', flexDirection: 'column', gap: 10 }}>
    <div className="fu peta-container" id="peta-main-wrap" style={{ padding: '0!important', position: 'relative', flexShrink: 0 }}>
      <style>{`
        .df-dot {
          width: 13px;
          height: 13px;
          border-radius: 50%;
          border: 2px solid var(--card);
          cursor: pointer;
          transition: transform .12s, box-shadow .12s;
        }
        .df-dot:hover {
          transform: scale(1.3);
        }

        /* Navigation Panel (Top Left) */
        .lf-nav-wrap {
          position: absolute;
          top: 10px;
          left: 10px;
          z-index: 900;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0;
        }
        .lf-nav-toggle {
          width: 30px;
          height: 30px;
          border-radius: 6px;
          background: var(--card);
          color: var(--text);
          border: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: .8rem;
          cursor: pointer;
          backdrop-filter: blur(8px);
          box-shadow: var(--sh);
          transition: all .14s ease;
          flex-shrink: 0;
        }
        .lf-nav-toggle.open, .lf-nav-toggle:hover {
          background: var(--blue);
          color: #fff;
          border-color: var(--blueh);
        }
        .lf-nav-panel {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          overflow: hidden;
          max-height: 0;
          opacity: 0;
          transition: max-height .22s ease, opacity .18s ease;
          margin-top: 3px;
        }
        .lf-nav-panel.open {
          max-height: 250px;
          opacity: 1;
        }
        .lf-nav-btn {
          width: 28px;
          height: 28px;
          border-radius: 5px;
          background: var(--card);
          color: var(--text);
          border: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: .72rem;
          cursor: pointer;
          backdrop-filter: blur(6px);
          box-shadow: var(--sh0);
          transition: all .12s ease;
        }
        .lf-nav-btn:hover {
          background: var(--border);
        }
        .lf-nav-sep {
          height: 1px;
          width: 28px;
          background: var(--border);
          margin: 1px 0;
        }

        /* Edit Layers Button (Top Right) */
        .lf-layer-btn {
          width: 34px;
          height: 34px;
          border-radius: 8px;
          background: var(--card);
          color: var(--text);
          border: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: var(--sh);
          transition: all .15s ease;
        }
        .lf-layer-btn:hover {
          background: var(--teal);
          color: #fff;
          border-color: var(--teal);
          transform: scale(1.05);
        }

        /* Coordinate Pick Banner */
        .lf-pick-banner {
          position: absolute;
          top: 12px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 1050;
          background: var(--blue);
          color: #fff;
          padding: 8px 18px;
          border-radius: 20px;
          box-shadow: 0 4px 16px rgba(30,111,217,0.45);
          font-size: .76rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 12px;
          animation: pulse 2s infinite;
        }
        .lf-pick-cancel {
          background: rgba(255,255,255,0.28);
          border: none;
          color: #fff;
          padding: 3px 10px;
          border-radius: 10px;
          font-size: .65rem;
          cursor: pointer;
          font-weight: 700;
          transition: background .12s;
        }
        .lf-pick-cancel:hover {
          background: rgba(255,255,255,0.4);
        }

        /* Standard Leaflet overrides for theme integration */
        .leaflet-container {
          background: var(--bg) !important;
          font-family: var(--font) !important;
        }
        .leaflet-popup-content-wrapper {
          background: var(--card) !important;
          color: var(--text) !important;
          border-radius: 12px !important;
          box-shadow: var(--shl) !important;
          border: 1px solid var(--border) !important;
          padding: 2px !important;
        }
        .leaflet-popup-tip {
          background: var(--card) !important;
        }
        .leaflet-control-layers {
          background: var(--card) !important;
          color: var(--text) !important;
          border: 1px solid var(--border) !important;
          border-radius: 8px !important;
          box-shadow: var(--sh) !important;
        }
        .leaflet-control-layers-toggle {
          background-color: var(--card) !important;
          border-radius: 8px !important;
        }
        .leaflet-control-layers:not(.leaflet-control-layers-expanded) {
          border: none !important;
          background: transparent !important;
          box-shadow: none !important;
        }
        .leaflet-control-layers:not(.leaflet-control-layers-expanded) .leaflet-control-layers-toggle {
          width: 32px !important;
          height: 32px !important;
          border-radius: 6px !important;
          background-color: rgba(255,255,255,0.92) !important;
          border: 1px solid var(--border) !important;
          box-shadow: var(--sh) !important;
          background-size: 16px 16px !important;
          transition: all 0.15s ease !important;
        }
        .dark-mode .leaflet-control-layers:not(.leaflet-control-layers-expanded) .leaflet-control-layers-toggle {
          background-color: rgba(27, 34, 48, 0.95) !important;
          border-color: var(--border) !important;
        }
        .leaflet-control-layers:not(.leaflet-control-layers-expanded) .leaflet-control-layers-toggle:hover {
          background-color: var(--card) !important;
          border-color: var(--blueh) !important;
        }
        .leaflet-control-layers:not(.leaflet-control-layers-expanded):hover .leaflet-control-layers-toggle {
          background-color: #fff !important;
        }
        .leaflet-control-layers-expanded {
          padding: 10px 14px !important;
          font-size: 0.72rem !important;
          font-weight: 700 !important;
          border-radius: 10px !important;
          min-width: 170px;
        }
        .leaflet-control-layers-expanded .leaflet-control-layers-toggle {
          display: none !important;
        }
        .leaflet-control-layers-expanded label {
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 5px;
          color: var(--text) !important;
        }
        .leaflet-control-layers-separator {
          border-top: 1px solid var(--border) !important;
          margin: 6px 0 !important;
        }
        .leaflet-control-layers-expanded input {
          accent-color: var(--blue);
          cursor: pointer;
        }
      `}</style>
      
      {/* Map Actions Header */}
      <div style={{ padding: '6px 12px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px', borderBottom: '1px solid var(--border)', background: 'var(--card)', backdropFilter: 'blur(8px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ fontWeight: 700, fontSize: '.78rem', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Map className="w-4 h-4 text-[var(--teal)]" /> Peta Tugurejo
          </div>
          <span style={{ fontSize: '.68rem', color: 'var(--muted)', background: 'var(--border)', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
            Desa Tugurejo, Slahung
          </span>
        </div>
        <div style={{ display: 'flex', gap: '5px', flexShrink: 0, alignItems: 'center' }}>
          <button className="peta-btn" onClick={togglePetaFullscreen} style={{ padding: '5px 10px', fontSize: '.69rem' }}>
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{isFullscreen ? 'Keluar' : 'Layar Penuh'}</span>
          </button>
          <button className="peta-btn peta-btn-primary" onClick={reloadPetaActive} style={{ padding: '5px 10px', fontSize: '.69rem' }}>
            <RefreshCw className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Map Viewports Container */}
      <div style={{ flex: 1, padding: '0px', minHeight: 0, height: '100%', position: 'relative' }}>
        
        {/* Realtime Leaflet Map */}
        <div
          id="leaflet-wrap"
          style={{
            height: '100%',
            position: 'relative',
            background: 'var(--bg)',
            borderRadius: 'var(--r)',
            overflow: 'hidden',
            border: '1px solid var(--border)',
            display: 'block',
          }}
        >
          {/* Main Leaflet Map Target */}
          <div id="lf-map-div" style={{ height: '100%', width: '100%', position: 'relative', background: 'var(--bg)' }}>
            {!isMapReady && (
              <div style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--card)',
                color: 'var(--muted)',
                zIndex: 1000
              }}>
                <Loader2 className="w-8 h-8 animate-spin mx-auto" style={{ marginBottom: '12px', color: 'var(--blue)' }} />
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Menyiapkan Peta Tugurejo...</span>
              </div>
            )}
          </div>

          {/* Top Left: Navigasi Peta Controls */}
          <div className="lf-nav-wrap">
            <button
              className={`lf-nav-toggle ${isNavPanelOpen ? 'open' : ''}`}
              title="Navigasi"
              onClick={() => setIsNavPanelOpen(!isNavPanelOpen)}
            >
              <Compass className="w-4 h-4 inline-block align-middle" />
            </button>
            <div className={`lf-nav-panel ${isNavPanelOpen ? 'open' : ''}`}>
              <button className="lf-nav-btn" title="Zoom In" onClick={() => mapRef.current?.zoomIn()}><Plus className="w-4 h-4 inline-block align-middle" /></button>
              <button className="lf-nav-btn" title="Zoom Out" onClick={() => mapRef.current?.zoomOut()}><Minus className="w-4 h-4 inline-block align-middle" /></button>
              <div className="lf-nav-sep"></div>
              <button className="lf-nav-btn" title="Geser Atas" onClick={() => mapRef.current?.panBy([0,-80])}><ChevronUp className="w-4 h-4 inline-block align-middle" /></button>
              <div style={{ display: 'flex', gap: '2px' }}>
                <button className="lf-nav-btn" title="Geser Kiri" onClick={() => mapRef.current?.panBy([-80,0])}><ChevronLeft className="w-4 h-4 inline-block align-middle" /></button>
                <button className="lf-nav-btn" title="Geser Kanan" onClick={() => mapRef.current?.panBy([80,0])}><ChevronRight className="w-4 h-4 inline-block align-middle" /></button>
              </div>
              <button className="lf-nav-btn" title="Geser Bawah" onClick={() => mapRef.current?.panBy([0,80])}><ChevronDown className="w-4 h-4 inline-block align-middle" /></button>
              <div className="lf-nav-sep"></div>
              <button className="lf-nav-btn" title="Navigasi GPS" onClick={handleLocateMe} style={{ color: 'var(--blue)' }}><Navigation className="w-4 h-4 inline-block align-middle" /></button>
              <button className="lf-nav-btn" title="Fokus Wilayah Tugurejo" onClick={handlePetaResetView} style={{ color: 'var(--amber)' }}><Crosshair className="w-4 h-4 inline-block align-middle" /></button>
            </div>
          </div>

          {/* Bottom Right: Tombol Admin (sejajar di atas Layers control) */}
          {isAdmin && (
            <div style={{
              position: 'absolute', bottom: 30, right: 10, zIndex: 900,
              display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4,
            }}>
              {/* Gambar Peta */}
              <button
                className="lf-layer-btn"
                onClick={() => setShowGambarPane(v => !v)}
                title="Gambar Peta"
                style={{
                  background: showGambarPane ? 'var(--teal)' : 'var(--card)',
                  color: showGambarPane ? '#fff' : 'var(--text)',
                  borderColor: showGambarPane ? 'var(--teal)' : 'var(--border)',
                }}
              >
                <PenLine className="w-4 h-4 inline-block align-middle" />
              </button>
              {/* Edit Layer Titik Lokasi */}
              <button
                className="lf-layer-btn"
                onClick={handleOpenLayerModal}
                title="Edit Layer Titik Lokasi"
              >
                <Layers className="w-4 h-4 inline-block align-middle" />
              </button>
            </div>
          )}

          {/* Gambar Peta Modal (floating di dalam peta, bawah kanan) */}
          {isAdmin && (
            <GambarPetaPanel
              mapRef={mapRef}
              gambarGroupRef={gambarGroupRef}
              isMapReady={isMapReady}
              open={showGambarPane}
              onClose={() => setShowGambarPane(false)}
            />
          )}

        </div>
      </div>

      {/* Banner for coordinate pick cursor */}
      {pickCoordMode && (
        <div className="lf-pick-banner">
          <Crosshair className="w-4 h-4 inline-block align-middle" /> Mode Pilih Koordinat (Klik di mana saja pada peta/wilayah KML)
          <button className="lf-pick-cancel" onClick={cancelPickCoordinate}>
            Batal
          </button>
        </div>
      )}

      {/* ─── EDIT LAYER MODAL (ADMIN ONLY) ─────────────────────────────────── */}
      <EditLayersModal
        show={showLayerModal}
        onClose={() => setShowLayerModal(false)}
        layersList={layersList}
        SIMBOL_DEF={SIMBOL_DEF}
        DRAW_WARNA_PRESET={DRAW_WARNA_PRESET}
        layerFormOpen={layerFormOpen}
        setLayerFormOpen={setLayerFormOpen}
        editingLayer={editingLayer}
        layerFormNama={layerFormNama}
        setLayerFormNama={setLayerFormNama}
        layerFormDeskripsi={layerFormDeskripsi}
        setLayerFormDeskripsi={setLayerFormDeskripsi}
        layerFormSimbol={layerFormSimbol}
        setLayerFormSimbol={setLayerFormSimbol}
        layerFormWarna={layerFormWarna}
        setLayerFormWarna={setLayerFormWarna}
        layerFormLat={layerFormLat}
        setLayerFormLat={setLayerFormLat}
        layerFormLng={layerFormLng}
        setLayerFormLng={setLayerFormLng}
        openLayerForm={openLayerForm}
        handleToggleLayerActive={handleToggleLayerActive}
        setShowConfirmDeleteLayer={setShowConfirmDeleteLayer}
        triggerPickCoordinate={triggerPickCoordinate}
        handleSubmitLayerForm={handleSubmitLayerForm}
      />

      {/* Layer Confirm Delete Modal */}
      <ConfirmModal
        show={showConfirmDeleteLayer !== null}
        msg="Hapus layer ini dari peta? Data tidak dapat dikembalikan."
        onConfirm={handleDeleteLayer}
        onCancel={() => setShowConfirmDeleteLayer(null)}
      />

    </div>
    </div>
  );
};
export default PetaTugurejo;
