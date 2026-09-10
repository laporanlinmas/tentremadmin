import { Plus, Edit, Trash2, Crosshair, Save, Layers, Eye, EyeOff, MousePointerClick, Route, AlertTriangle, Shield, Store, Map, Building, Video, Square } from 'lucide-react';
import React from 'react';
import { LayerPeta } from '../../types';
import { esc } from '../../utils/helpers';
import { Modal } from '../common/Modal';

interface PtkSimbol {
  id: string;
  ico: string;
  label: string;
  warna: string;
}

interface EditLayersModalProps {
  show: boolean;
  onClose: () => void;
  layersList: LayerPeta[];
  SIMBOL_DEF: PtkSimbol[];
  DRAW_WARNA_PRESET: Array<{ hex: string; lbl: string }>;
  
  layerFormOpen: boolean;
  setLayerFormOpen: (open: boolean) => void;
  editingLayer: LayerPeta | null;
  
  layerFormNama: string;
  setLayerFormNama: (val: string) => void;
  layerFormDeskripsi: string;
  setLayerFormDeskripsi: (val: string) => void;
  layerFormSimbol: string;
  setLayerFormSimbol: (val: string) => void;
  layerFormWarna: string;
  setLayerFormWarna: (val: string) => void;
  layerFormLat: string;
  setLayerFormLat: (val: string) => void;
  layerFormLng: string;
  setLayerFormLng: (val: string) => void;
  
  openLayerForm: (layer: LayerPeta | null) => void;
  handleToggleLayerActive: (layer: LayerPeta) => void;
  setShowConfirmDeleteLayer: (id: number | null) => void;
  triggerPickCoordinate: () => void;
  handleSubmitLayerForm: () => void;
}

const getSimbolIcon = (ico: string, className = "w-4 h-4") => {
  switch (ico) {
    case 'fa-route':
    case 'fa-road':
      return <Route className={className} />;
    case 'fa-triangle-exclamation':
      return <AlertTriangle className={className} />;
    case 'fa-shield-halved':
      return <Shield className={className} />;
    case 'fa-store':
      return <Store className={className} />;
    case 'fa-draw-polygon':
    case 'fa-map-location-dot':
      return <Map className={className} />;
    case 'fa-building':
      return <Building className={className} />;
    case 'fa-video':
      return <Video className={className} />;
    case 'fa-square-parking':
      return <Square className={className} />;
    default:
      return <Map className={className} />;
  }
};

export const EditLayersModal: React.FC<EditLayersModalProps> = ({
  show,
  onClose,
  layersList,
  SIMBOL_DEF,
  DRAW_WARNA_PRESET,
  
  layerFormOpen,
  setLayerFormOpen,
  editingLayer,
  
  layerFormNama,
  setLayerFormNama,
  layerFormDeskripsi,
  setLayerFormDeskripsi,
  layerFormSimbol,
  setLayerFormSimbol,
  layerFormWarna,
  setLayerFormWarna,
  layerFormLat,
  setLayerFormLat,
  layerFormLng,
  setLayerFormLng,
  
  openLayerForm,
  handleToggleLayerActive,
  setShowConfirmDeleteLayer,
  triggerPickCoordinate,
  handleSubmitLayerForm
}) => {
  return (
    <Modal
      show={show}
      onClose={onClose}
      size="xl"
      style={{ maxWidth: '720px' }}
      title={
        <>
          <Layers className="w-4 h-4 inline-block align-middle mr-1.5 text-[var(--teal)]" /> Edit Layer Peta Tugurejo
        </>
      }
      footer={
        <button className="bg2" onClick={onClose}>
          Tutup
        </button>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', height: '68vh', minHeight: '400px', margin: '-16px -18px' }}>
            
            {/* Left side: layer list */}
            <div style={{ padding: '12px', borderRight: '1px solid var(--border)', overflowY: 'auto', background: 'var(--bg)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '9px' }}>
                <p style={{ fontSize: '.67rem', fontWeight: 800, color: 'var(--mid)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
                  Daftar Layer
                </p>
                <button className="bp" style={{ fontSize: '.63rem', padding: '5px 10px' }} onClick={() => openLayerForm(null)}>
                  <Plus className="w-4 h-4 inline-block align-middle" /> Tambah
                </button>
              </div>
              <div id="layer-list-body">
                {layersList.length === 0 ? (
                  <div className="empty" style={{ padding: '40px 10px' }}>
                    <Layers className="w-8 h-8 opacity-[0.14] mx-auto mb-2 block" />
                    <p style={{ fontSize: '.72rem' }}>Tidak ada layer.</p>
                  </div>
                ) : (
                  layersList.map((layer) => {
                    const sd = SIMBOL_DEF.find((s) => s.id === layer.simbol) || SIMBOL_DEF[0];
                    return (
                      <div key={layer._ri} className={`layer-list-item ${layer.aktif ? '' : 'inactive'}`}>
                        <div className="layer-item-ico" style={{ background: `${layer.warna || sd.warna}22`, color: layer.warna || sd.warna }}>
                          {getSimbolIcon(sd.ico, "w-4 h-4")}
                        </div>
                        <div className="layer-item-info">
                          <div className="layer-item-name">{esc(layer.nama)}</div>
                          <div className="layer-item-sub">
                            {sd.label} · {layer.aktif ? <span style={{ color: 'var(--green)' }}>Aktif</span> : <span style={{ color: 'var(--muted)' }}>Nonaktif</span>}
                          </div>
                        </div>
                        <div className="layer-item-acts">
                          <button
                            className="ag-btn"
                            style={{ background: layer.aktif ? 'var(--greenl)' : 'var(--bg)', color: layer.aktif ? 'var(--green)' : 'var(--muted)' }}
                            onClick={() => handleToggleLayerActive(layer)}
                            title="Toggle Aktif"
                          >
                            {layer.aktif ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                          </button>
                          <button className="ag-btn ag-edit" onClick={() => openLayerForm(layer)} title="Edit">
                            <Edit className="w-4 h-4 inline-block align-middle" />
                          </button>
                          <button className="ag-btn ag-del" onClick={() => setShowConfirmDeleteLayer(layer._ri)} title="Hapus">
                            <Trash2 className="w-4 h-4 inline-block align-middle" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right side: layer edit form */}
            <div style={{ padding: '12px', overflowY: 'auto' }}>
              {layerFormOpen ? (
                <div className="layer-form">
                  <p style={{ fontSize: '.7rem', fontWeight: 800, color: 'var(--mid)', textTransform: 'uppercase', marginBottom: '10px' }}>
                    {editingLayer ? 'Edit Layer' : 'Tambah Layer Baru'}
                  </p>
                  <div className="fgrp">
                    <label className="flbl">Nama Lokasi / Point</label>
                    <input
                      className="fctl"
                      value={layerFormNama}
                      onChange={(e) => setLayerFormNama(e.target.value)}
                    />
                  </div>
                  <div className="fgrp">
                    <label className="flbl">Keterangan / Deskripsi</label>
                    <input
                      className="fctl"
                      value={layerFormDeskripsi}
                      onChange={(e) => setLayerFormDeskripsi(e.target.value)}
                    />
                  </div>
                  
                  {/* Simbol grid selector */}
                  <div className="fgrp">
                    <label className="flbl">Simbol</label>
                    <div className="mlayer-simbol-grid">
                      {SIMBOL_DEF.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          className={`msimbol-btn ${layerFormSimbol === s.id ? 'on' : ''}`}
                          onClick={() => {
                            setLayerFormSimbol(s.id);
                            setLayerFormWarna(s.warna);
                          }}
                        >
                          {getSimbolIcon(s.ico, "w-4 h-4 simbol-ico")}
                          <span style={{ marginTop: '2px' }}>{s.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Warna Swatches & Custom Picker */}
                  <div className="fgrp">
                    <label className="flbl">Warna Pin</label>
                    <div className="color-swatches">
                      {DRAW_WARNA_PRESET.map((p) => (
                        <div
                          key={p.hex}
                          className={`color-swatch ${layerFormWarna === p.hex ? 'on' : ''}`}
                          style={{ backgroundColor: p.hex }}
                          onClick={() => setLayerFormWarna(p.hex)}
                          title={p.lbl}
                        ></div>
                      ))}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                      <input
                        type="color"
                        id="lf-warna-inp"
                        value={layerFormWarna}
                        onChange={(e) => setLayerFormWarna(e.target.value)}
                        style={{ width: '34px', height: '28px', border: 'none', borderRadius: '5px', cursor: 'pointer', background: 'none', padding: 0 }}
                      />
                      <span style={{ fontSize: '.68rem', fontFamily: 'var(--mono)', color: 'var(--mid)' }}>
                        {layerFormWarna}
                      </span>
                    </div>
                  </div>

                  <div className="frow" style={{ alignItems: 'flex-end' }}>
                    <div className="fcol">
                      <label className="flbl">Latitude</label>
                      <input
                        className="fctl"
                        value={layerFormLat}
                        onChange={(e) => setLayerFormLat(e.target.value)}
                      />
                    </div>
                    <div className="fcol">
                      <label className="flbl">Longitude</label>
                      <input
                        className="fctl"
                        value={layerFormLng}
                        onChange={(e) => setLayerFormLng(e.target.value)}
                      />
                    </div>
                    <button className="bg2" style={{ padding: '9px 12px' }} onClick={triggerPickCoordinate} title="Pick dari Peta">
                      <Crosshair className="w-4 h-4 inline-block align-middle" />
                    </button>
                  </div>
                  <div style={{ marginTop: '12px', display: 'flex', gap: '6px' }}>
                    <button className="bp" style={{ flex: 1 }} onClick={handleSubmitLayerForm}>
                      <Save className="w-4 h-4 inline-block align-middle" /> Simpan Layer
                    </button>
                    <button className="bg2" onClick={() => setLayerFormOpen(false)}>
                      Batal
                    </button>
                  </div>
                </div>
              ) : (
                <div className="empty" style={{ padding: '40px 10px' }}>
                  <MousePointerClick className="w-8 h-8 opacity-[0.14] mx-auto mb-2 block" />
                  <p style={{ fontSize: '.72rem' }}>Pilih layer di kiri untuk diedit,<br />atau klik Tambah untuk layer baru.</p>
                </div>
              )}
            </div>

          </div>
    </Modal>
  );
};
