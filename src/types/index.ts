export interface UserSession {
  username: string;
  role: string;
  namaLengkap: string;
  _loginTs: number;
}

export interface KelompokRonda {
  id?: string;
  _ri?: string | number;
  nama: string;
  nomorUrut?: number;  // 1-14: posisi dalam siklus 14 hari
  hari?: string;       // legacy field (tidak dipakai untuk penentuan jadwal)
  danpok?: string;
  danru?: string;
  poskamling?: string;
  anggota?: string[];
  jadwal?: string;
  keterangan?: string;
  urutan?: number;
  aktif?: boolean;
}

export interface Anggota {
  _ri: string | number;
  nama: string;
  tglLahir?: string;
  kategori?: string;
  unit?: string;
  wa?: string;
  usia?: number;
}

/** @deprecated Gunakan Anggota */
export type Satlinmas = Anggota;

export interface LayerPeta {
  _ri: string | number;
  nama: string;
  deskripsi?: string;
  simbol: string;
  warna?: string;
  lat: number;
  lng: number;
  aktif?: boolean;
}

export interface GambarPeta {
  id: string;
  type: 'polygon' | 'polyline' | 'rectangle' | 'circle' | 'marker';
  warna: string;
  nama: string;
  ket: string;
  measurement?: string;
  geojson: string;
  ts?: string;
  user?: string;
}

export interface Settings {
  pdf_judul?: string;
  pdf_tujuan?: string;
  pdf_anggota?: string;
  pdf_pukul?: string;
  pdf_jabatan?: string;
  pdf_nama?: string;
  pdf_pangkat?: string;
  pdf_nip?: string;
  kol_judul?: string;
  kol_subjudul?: string;
  kol_jabatan?: string;
  kol_nama?: string;
  kol_pangkat?: string;
  kol_nip?: string;
  peta_judul?: string;
  peta_jabatan?: string;
  peta_nama?: string;
  [key: string]: string | undefined;
}

export interface WaPiket {
  _ri: string | number;
  nama: string;
  number: string;
  jadwal: string;
  keterangan?: string;
}

export interface Inventaris {
  id: string;
  namaAset: string;
  jenis: string;       // Elektronik | Peralatan | Perlengkapan | Kendaraan | Lainnya
  jumlah: number;
  satuan: string;      // Unit | Buah | Set | Kg | Meter | dst
  kondisi: string;     // Baik | Rusak Ringan | Rusak Berat | Tidak Layak
  keterangan?: string;
  foto?: string;       // URL foto (Google Drive / Storage)
  tanggalMasuk?: string; // Tanggal ditambahkan / masuk aset (YYYY-MM-DD)
  ts?: string;         // ISO timestamp terakhir diupdate
}
