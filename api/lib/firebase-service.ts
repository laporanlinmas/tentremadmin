import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  initializeFirestore,
  getFirestore,
  collection,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  query,
  orderBy
} from 'firebase/firestore';
import bcrypt from 'bcryptjs';

export function success(data?: any, message?: string): any {
  if (typeof data === 'string' && !message) {
    message = data;
    data = {};
  }
  return { success: true, message: message || 'OK', ...(data || {}) };
}

export function error(message: string, code?: number): any {
  return { success: false, error: message, message: message, code: code || 400 };
}

// Firebase Configuration matching the dashboard frontend
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.FIREBASE_DATABASE_URL || '',
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
};

// Initialize Firebase Client App (Runs on Node serverless backend)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db = (() => {
  try {
    return initializeFirestore(app, {
      ignoreUndefinedProperties: true,
      experimentalAutoDetectLongPolling: true,
    });
  } catch {
    return getFirestore(app);
  }
})();

// Helper to check if string looks like bcrypt hash
function isBcryptHash(str: string): boolean {
  return typeof str === 'string' && (str.startsWith('$2a$') || str.startsWith('$2b$'));
}

// Helper to calculate age (satlinmas)
function hitungUsia(tglLahirStr: any): number {
  if (!tglLahirStr) return 0;
  try {
    const parts = String(tglLahirStr).split('-');
    if (parts.length < 3) return 0;
    const tgl = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    if (isNaN(tgl.getTime())) return 0;
    const today = new Date();
    let age = today.getFullYear() - tgl.getFullYear();
    const m = today.getMonth() - tgl.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < tgl.getDate())) {
      age--;
    }
    return age > 0 ? age : 0;
  } catch (e) {
    return 0;
  }
}

// ================================================================
//  1. AUTHENTICATION & USERS (Firestore: 'users')
// ================================================================

export async function checkLogin(u: string, p: string): Promise<any> {
  try {
    const username = (u || '').trim().toLowerCase();
    const password = (p || '').trim();

    if (!username) {
      return error('Username tidak boleh kosong.');
    }
    if (!password) {
      return error('Password tidak boleh kosong.');
    }

    const userRef = doc(db, 'users', username);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      // Auto-provisioning default admin if credentials match
      if ((username === 'admin' && password === 'admin') || (username === 'satlinmas' && password === 'satlinmas')) {
        const hashed = await bcrypt.hash(password, 10);
        const defaultName = username === 'admin' ? 'Administrator Desa' : 'Satgas Linmas';
        try {
          await setDoc(userRef, {
            username,
            password: hashed,
            role: 'admin',
            namaLengkap: defaultName
          });
        } catch (e) {}

        return success({
          username,
          role: 'admin',
          namaLengkap: defaultName
        }, 'Login berhasil');
      }

      return error('Username tidak ditemukan.');
    }

    const userData = userDoc.data();
    const storedPass = String(userData.password || '');
    let isValid = false;

    if (isBcryptHash(storedPass)) {
      isValid = await bcrypt.compare(password, storedPass);
    } else {
      isValid = storedPass === password;
    }

    if (!isValid) {
      return error('Password salah.');
    }

    return success({
      username: userData.username || username,
      role: userData.role || 'user',
      namaLengkap: userData.namaLengkap || username
    }, 'Login berhasil');
  } catch (err: any) {
    console.error('[Firebase checkLogin Error]:', err);
    return error(`Login error: ${err.message}`);
  }
}

export async function changePassword(u: string, oldP: string, newP: string): Promise<any> {
  try {
    const username = (u || '').trim().toLowerCase();
    if (!username) return error('Username tidak boleh kosong.');

    const userRef = doc(db, 'users', username);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) return error('User tidak ditemukan.');

    const userData = userDoc.data();
    const storedPass = String(userData.password || '');
    let isValid = false;

    if (isBcryptHash(storedPass)) {
      isValid = await bcrypt.compare(oldP, storedPass);
    } else {
      isValid = storedPass === oldP;
    }

    if (!isValid) return error('Password lama salah.');

    const hashedNew = await bcrypt.hash(newP, 10);
    await updateDoc(userRef, { password: hashedNew });

    return success('Password berhasil diperbarui.');
  } catch (err: any) {
    return error(`Gagal ubah password: ${err.message}`);
  }
}

export async function createAccount(u: string, p: string, r: string, nama: string): Promise<any> {
  try {
    const username = (u || '').trim().toLowerCase();
    if (!username) return error('Username tidak boleh kosong.');

    const userRef = doc(db, 'users', username);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) return error('Username sudah digunakan.');

    const hashed = await bcrypt.hash(p, 10);
    await setDoc(userRef, {
      username,
      password: hashed,
      role: r || 'user',
      namaLengkap: nama || username
    });

    return success('Akun berhasil dibuat.');
  } catch (err: any) {
    return error(`Gagal buat akun: ${err.message}`);
  }
}

// ================================================================
//  2. DATA SATLINMAS (Firestore: 'satlinmas')
// ================================================================

export async function getSatlinmasData(): Promise<any> {
  try {
    const snap = await getDocs(collection(db, 'satlinmas'));
    const members: any[] = [];
    const unitCounts: Record<string, number> = {};
    let totalUsia = 0;
    let validUsiaCount = 0;

    snap.forEach((d) => {
      const data = d.data();
      const usia = hitungUsia(data.tglLahir);
      const unit = data.unit || 'Lainnya';

      members.push({
        id: d.id,
        _ri: d.id,
        nama: data.nama || '',
        tglLahir: data.tglLahir || '',
        unit,
        wa: data.wa || '',
        usia
      });

      unitCounts[unit] = (unitCounts[unit] || 0) + 1;
      if (usia > 0) {
        totalUsia += usia;
        validUsiaCount++;
      }
    });

    members.sort((a, b) => (a.nama || '').localeCompare(b.nama || ''));

    return success({
      satlinmas: members,
      stats: {
        total: members.length,
        unitCounts,
        rataRataUsia: validUsiaCount > 0 ? Math.round(totalUsia / validUsiaCount) : 0
      }
    });
  } catch (err: any) {
    return error(`Gagal mengambil data Satlinmas: ${err.message}`);
  }
}

export async function addSatlinmas(data: any): Promise<any> {
  try {
    const docRef = doc(collection(db, 'satlinmas'));
    await setDoc(docRef, {
      nama: data.nama || '',
      tglLahir: data.tglLahir || '',
      unit: data.unit || '',
      wa: data.wa || ''
    });
    return success({ id: docRef.id, _ri: docRef.id }, 'Anggota Satlinmas berhasil ditambahkan.');
  } catch (err: any) {
    return error(`Gagal tambah Satlinmas: ${err.message}`);
  }
}

export async function updateSatlinmas(id: string, data: any): Promise<any> {
  try {
    const targetId = id || data._ri || data.id;
    if (!targetId) return error('ID Satlinmas tidak valid.');
    await updateDoc(doc(db, 'satlinmas', targetId), {
      nama: data.nama || '',
      tglLahir: data.tglLahir || '',
      unit: data.unit || '',
      wa: data.wa || ''
    });
    return success('Data Satlinmas berhasil diperbarui.');
  } catch (err: any) {
    return error(`Gagal update Satlinmas: ${err.message}`);
  }
}

export async function deleteSatlinmas(id: string): Promise<any> {
  try {
    if (!id) return error('ID Satlinmas tidak valid.');
    await deleteDoc(doc(db, 'satlinmas', id));
    return success('Anggota Satlinmas berhasil dihapus.');
  } catch (err: any) {
    return error(`Gagal hapus Satlinmas: ${err.message}`);
  }
}

// ================================================================
//  3. LAYER PETA (Firestore: 'layer_peta')
// ================================================================

export async function getLayerPeta(): Promise<any> {
  try {
    const snap = await getDocs(collection(db, 'layer_peta'));
    const layers: any[] = [];
    snap.forEach((d) => {
      const data = d.data();
      layers.push({
        id: d.id,
        _ri: d.id,
        nama: data.nama || '',
        deskripsi: data.deskripsi || data.ket || '',
        simbol: data.simbol || 'rute',
        warna: data.warna || '#1e6fd9',
        lat: typeof data.lat === 'number' ? data.lat : parseFloat(data.lat) || -8.04826,
        lng: typeof data.lng === 'number' ? data.lng : parseFloat(data.lng) || 111.37173,
        aktif: data.aktif !== false
      });
    });

    if (layers.length === 0) {
      // Default initial layers
      const defaults = [
        { nama: 'Balai Desa Tugurejo', simbol: 'pos', warna: '#10b981', lat: -8.04826, lng: 111.37173, deskripsi: 'Pusat pemerintahan dan pelayanan warga Desa Tugurejo' },
        { nama: 'Pos Linmas Dusun Krajan', simbol: 'pos', warna: '#3b82f6', lat: -8.04512, lng: 111.36850, deskripsi: 'Pos kamling dan titik kumpul regu Linmas Dusun Krajan' },
        { nama: 'Pos Linmas Dusun Tugu', simbol: 'pos', warna: '#8b5cf6', lat: -8.05140, lng: 111.37520, deskripsi: 'Pos kamling dan pos pantau keamanan Dusun Tugu' }
      ];
      for (const def of defaults) {
        const ref = doc(collection(db, 'layer_peta'));
        await setDoc(ref, { ...def, aktif: true });
        layers.push({ id: ref.id, _ri: ref.id, ...def, aktif: true });
      }
    }

    return success({ layers });
  } catch (err: any) {
    return error(`Gagal mengambil data layer peta: ${err.message}`);
  }
}

export async function addLayerPeta(data: any): Promise<any> {
  try {
    const docRef = doc(collection(db, 'layer_peta'));
    await setDoc(docRef, {
      nama: data.nama || '',
      deskripsi: data.deskripsi || data.ket || '',
      simbol: data.simbol || 'rute',
      warna: data.warna || '#1e6fd9',
      lat: parseFloat(data.lat) || -8.04826,
      lng: parseFloat(data.lng) || 111.37173,
      aktif: data.aktif !== false
    });
    return success({ id: docRef.id, _ri: docRef.id }, 'Layer peta berhasil ditambahkan.');
  } catch (err: any) {
    return error(`Gagal tambah layer peta: ${err.message}`);
  }
}

export async function updateLayerPeta(id: string, data: any): Promise<any> {
  try {
    const targetId = id || data._ri || data.id || data.ri;
    if (!targetId) return error('ID Layer tidak valid.');
    await updateDoc(doc(db, 'layer_peta', targetId), {
      nama: data.nama || '',
      deskripsi: data.deskripsi || data.ket || '',
      simbol: data.simbol || 'rute',
      warna: data.warna || '#1e6fd9',
      lat: parseFloat(data.lat) || 0,
      lng: parseFloat(data.lng) || 0,
      aktif: data.aktif !== false
    });
    return success('Layer peta berhasil diperbarui.');
  } catch (err: any) {
    return error(`Gagal update layer peta: ${err.message}`);
  }
}

export async function deleteLayerPeta(id: string): Promise<any> {
  try {
    if (!id) return error('ID Layer tidak valid.');
    await deleteDoc(doc(db, 'layer_peta', id));
    return success('Layer peta berhasil dihapus.');
  } catch (err: any) {
    return error(`Gagal hapus layer peta: ${err.message}`);
  }
}

export async function toggleLayerAktif(id: string, aktif: boolean): Promise<any> {
  try {
    if (!id) return error('ID Layer tidak valid.');
    await updateDoc(doc(db, 'layer_peta', id), { aktif });
    return success('Status layer peta berhasil diubah.');
  } catch (err: any) {
    return error(`Gagal ubah status layer: ${err.message}`);
  }
}

// ================================================================
//  4. GAMBAR PETA CORETAN (Firestore: 'gambar_peta')
// ================================================================

export async function getGambarPeta(): Promise<any> {
  try {
    const snap = await getDocs(collection(db, 'gambar_peta'));
    const shapes: any[] = [];
    snap.forEach((d) => {
      shapes.push({ id: d.id, ...d.data() });
    });
    return success({ shapes });
  } catch (err: any) {
    return error(`Gagal mengambil coretan peta: ${err.message}`);
  }
}

export async function saveGambarPeta(data: any): Promise<any> {
  try {
    const docRef = data.id ? doc(db, 'gambar_peta', data.id) : doc(collection(db, 'gambar_peta'));
    await setDoc(docRef, {
      id: docRef.id,
      type: data.type || 'polygon',
      warna: data.warna || '#1e6fd9',
      nama: data.nama || '',
      ket: data.ket || '',
      measurement: data.measurement || '',
      geojson: typeof data.geojson === 'object' ? JSON.stringify(data.geojson) : data.geojson,
      ts: data.ts || new Date().toISOString(),
      user: data.user || 'Admin'
    });
    return success({ id: docRef.id }, 'Coretan peta berhasil disimpan.');
  } catch (err: any) {
    return error(`Gagal simpan gambar peta: ${err.message}`);
  }
}

export async function deleteGambarPeta(id: string): Promise<any> {
  try {
    await deleteDoc(doc(db, 'gambar_peta', id));
    return success('Coretan peta berhasil dihapus.');
  } catch (err: any) {
    return error(`Gagal hapus gambar peta: ${err.message}`);
  }
}

// ================================================================
//  5. PETUGAS WA PIKET (Firestore: 'nowa')
// ================================================================

export async function getNoWaList(): Promise<any> {
  try {
    const snap = await getDocs(collection(db, 'nowa'));
    const list: any[] = [];
    snap.forEach((d) => {
      list.push({
        id: d.id,
        _ri: d.id,
        ...d.data()
      });
    });

    if (list.length === 0) {
      // Default WhatsApp Piket
      const defWa = {
        nama: 'Piket Pos Linmas Balai Desa',
        number: '6281234567890',
        jadwal: 'Setiap Hari 24 Jam',
        keterangan: 'Nomor siaga tanggap darurat dan aduan ketertiban desa'
      };
      const ref = doc(collection(db, 'nowa'));
      await setDoc(ref, defWa);
      list.push({ id: ref.id, _ri: ref.id, ...defWa });
    }

    return success({ noWaList: list });
  } catch (err: any) {
    return error(`Gagal mengambil daftar No WhatsApp: ${err.message}`);
  }
}

export async function addNoWa(data: any): Promise<any> {
  try {
    const docRef = doc(collection(db, 'nowa'));
    await setDoc(docRef, {
      nama: data.nama || '',
      number: data.number || '',
      jadwal: data.jadwal || '',
      keterangan: data.keterangan || ''
    });
    return success({ id: docRef.id, _ri: docRef.id }, 'No WhatsApp berhasil ditambahkan.');
  } catch (err: any) {
    return error(`Gagal tambah No WhatsApp: ${err.message}`);
  }
}

export async function updateNoWa(id: string, data: any): Promise<any> {
  try {
    const targetId = id || data._ri || data.id || data.ri;
    if (!targetId) return error('ID No WA tidak valid.');
    await updateDoc(doc(db, 'nowa', targetId), {
      nama: data.nama || '',
      number: data.number || '',
      jadwal: data.jadwal || '',
      keterangan: data.keterangan || ''
    });
    return success('No WhatsApp berhasil diperbarui.');
  } catch (err: any) {
    return error(`Gagal update No WhatsApp: ${err.message}`);
  }
}

export async function deleteNoWa(id: string): Promise<any> {
  try {
    if (!id) return error('ID No WA tidak valid.');
    await deleteDoc(doc(db, 'nowa', id));
    return success('No WhatsApp berhasil dihapus.');
  } catch (err: any) {
    return error(`Gagal hapus No WhatsApp: ${err.message}`);
  }
}

// ================================================================
//  6. PENGATURAN SISTEM (Firestore: 'settings' -> 'app_settings')
// ================================================================

export async function getSettings(): Promise<any> {
  try {
    const docRef = doc(db, 'settings', 'app_settings');
    const docSnap = await getDoc(docRef);

    const defaultSettings = {
      appName: 'TENTREM - Desa Tugurejo',
      instansi: 'Pemerintah Desa Tugurejo, Kec. Slahung, Kab. Ponorogo',
      units: 'Satpol PP,Satlinmas Desa Tugurejo,Satgas Linmas Dusun Krajan,Satgas Linmas Dusun Tugu',
      pdfJudul: 'LAPORAN REKAPITULASI KEGIATAN LINMAS DESA TUGUREJO',
      pdfTujuan: 'Kepala Satuan Polisi Pamong Praja Kabupaten Ponorogo',
      pdfAnggota: 'Anggota Satgas Linmas Desa Tugurejo',
      pdfPukul: '20.00 WIB s/d Selesai',
      pdfJabatan: 'Kepala Desa Tugurejo',
      pdfNama: 'HERU SETIAWAN, S.Sos',
      pdfPangkat: 'Pembina / IV.a',
      pdfNip: '19750815 200501 1 008',
      kolJudul: 'REKAPITULASI LAPORAN OPERASIONAL & KETERTIBAN DESA',
      kolSubjudul: 'DESA TUGUREJO KECAMATAN SLAHUNG KABUPATEN PONOROGO',
      kolJabatan: 'Koordinator Satlinmas Desa Tugurejo',
      kolNama: 'SUGENG RIYADI',
      kolPangkat: 'Ketua Regu Satlinmas',
      kolNip: '-',
      petaJudul: 'PETA SPASIAL & KEAMANAN WILAYAH DESA TUGUREJO',
      petaJabatan: 'Petugas Pengendali Spasial Linmas',
      petaNama: 'TIM IT SATGAS TENTREM'
    };

    if (!docSnap.exists()) {
      await setDoc(docRef, defaultSettings);
      return success({ settings: defaultSettings });
    }

    const data = docSnap.data();
    const settings: Record<string, any> = { ...defaultSettings, ...data };

    // Ensure camelCase aliases exist (backward compat: Firestore may have snake_case from old saves)
    if (!settings.pdfJudul) settings.pdfJudul = settings.pdf_judul || defaultSettings.pdfJudul;
    if (!settings.pdfTujuan) settings.pdfTujuan = settings.pdf_tujuan || defaultSettings.pdfTujuan;
    if (!settings.pdfAnggota) settings.pdfAnggota = settings.pdf_anggota || defaultSettings.pdfAnggota;
    if (!settings.pdfPukul) settings.pdfPukul = settings.pdf_pukul || defaultSettings.pdfPukul;
    if (!settings.pdfJabatan) settings.pdfJabatan = settings.pdf_jabatan || defaultSettings.pdfJabatan;
    if (!settings.pdfNama) settings.pdfNama = settings.pdf_nama || defaultSettings.pdfNama;
    if (!settings.pdfPangkat) settings.pdfPangkat = settings.pdf_pangkat || defaultSettings.pdfPangkat;
    if (!settings.pdfNip) settings.pdfNip = settings.pdf_nip || defaultSettings.pdfNip;

    if (!settings.kolJudul) settings.kolJudul = settings.kol_judul || defaultSettings.kolJudul;
    if (!settings.kolSubjudul) settings.kolSubjudul = settings.kol_subjudul || defaultSettings.kolSubjudul;
    if (!settings.kolJabatan) settings.kolJabatan = settings.kol_jabatan || defaultSettings.kolJabatan;
    if (!settings.kolNama) settings.kolNama = settings.kol_nama || defaultSettings.kolNama;
    if (!settings.kolPangkat) settings.kolPangkat = settings.kol_pangkat || defaultSettings.kolPangkat;
    if (!settings.kolNip) settings.kolNip = settings.kol_nip || defaultSettings.kolNip;

    if (!settings.petaJudul) settings.petaJudul = settings.peta_judul || defaultSettings.petaJudul;
    if (!settings.petaJabatan) settings.petaJabatan = settings.peta_jabatan || defaultSettings.petaJabatan;
    if (!settings.petaNama) settings.petaNama = settings.peta_nama || defaultSettings.petaNama;

    return success({ settings });
  } catch (err: any) {
    return error(`Gagal memuat pengaturan: ${err.message}`);
  }
}

export async function saveSettings(data: any): Promise<any> {
  try {
    const docRef = doc(db, 'settings', 'app_settings');
    await setDoc(docRef, data, { merge: true });
    return success('Pengaturan sistem berhasil disimpan.');
  } catch (err: any) {
    return error(`Gagal menyimpan pengaturan: ${err.message}`);
  }
}

export async function getRondaSecurity(): Promise<any> {
  try {
    const docRef = doc(db, 'settings', 'ronda_security');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return success({
        enabled: data.enabled !== false,
        passcode: data.passcode || 'linmas123',
        hint: data.hint || 'Tanyakan sandi pada Komandan Regu (Danru) atau Koordinator Ronda.',
        updatedAt: data.updatedAt || '',
        updatedBy: data.updatedBy || '',
      });
    } else {
      const defaultSec = {
        enabled: true,
        passcode: 'linmas123',
        hint: 'Tanyakan sandi pada Komandan Regu (Danru) atau Koordinator Ronda.',
        updatedAt: new Date().toISOString(),
        updatedBy: 'Sistem',
      };
      await setDoc(docRef, defaultSec);
      return success(defaultSec);
    }
  } catch (err: any) {
    return error(`Gagal memuat keamanan ronda: ${err.message}`);
  }
}

export async function saveRondaSecurity(data: any): Promise<any> {
  try {
    const docRef = doc(db, 'settings', 'ronda_security');
    const payload = {
      enabled: data.enabled !== false,
      passcode: String(data.passcode || 'linmas123').trim(),
      hint: String(data.hint || '').trim(),
      updatedAt: new Date().toISOString(),
      updatedBy: data.updatedBy || 'Administrator',
    };
    await setDoc(docRef, payload, { merge: true });
    return success('Sandi dan pengaturan keamanan ronda berhasil diperbarui.');
  } catch (err: any) {
    return error(`Gagal menyimpan sandi keamanan: ${err.message}`);
  }
}

// ================================================================
//  7. DASHBOARD & REKAP DATA (Firestore: 'aduan', 'satlinmas', 'berita', 'survei')
// ================================================================

export async function getDashboardStats(): Promise<any> {
  try {
    const [satlinmasSnap, aduanSnap, beritaSnap, surveiSnap] = await Promise.all([
      getDocs(collection(db, 'satlinmas')),
      getDocs(collection(db, 'ronda')),
      getDocs(collection(db, 'berita')),
      getDocs(collection(db, 'survei'))
    ]);

    const totalPersonil = satlinmasSnap.size;
    const totalAduan = aduanSnap.size;
    const totalBerita = beritaSnap.size;
    const totalSurvei = surveiSnap.size;

    let aduanBaru = 0;
    let aduanProses = 0;
    let aduanSelesai = 0;

    aduanSnap.forEach((d) => {
      const st = String(d.data().status || '').toLowerCase();
      if (st === 'selesai') aduanSelesai++;
      else if (st === 'proses' || st === 'diproses') aduanProses++;
      else aduanBaru++;
    });

    return success({
      totalPersonil,
      totalAduan,
      totalBerita,
      totalSurvei,
      aduanBaru,
      aduanProses,
      aduanSelesai,
      kpi: {
        tingkatPenyelesaian: totalAduan > 0 ? Math.round((aduanSelesai / totalAduan) * 100) : 100,
        keaktifanPoskamling: '100% Aktif',
      }
    });
  } catch (err: any) {
    return error(`Gagal memuat statistik dashboard: ${err.message}`);
  }
}

export async function getRekapData(): Promise<any> {
  try {
    const snap = await getDocs(collection(db, 'ronda'));
    const rows: any[] = [];
    snap.forEach((d) => {
      const data = d.data();
      rows.push({
        id: d.id,
        _ri: d.id,
        ...data
      });
    });
    return success({ rows });
  } catch (err: any) {
    return error(`Gagal memuat rekap: ${err.message}`);
  }
}

// ================================================================
//  HELPER — escape HTML
// ================================================================
function escHtml(v?: any): string {
  if (!v) return '';
  return String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function generateLaporanHtml(payload: any): any {
  try {
    const fotos: string[] = Array.isArray(payload.fotos) ? payload.fotos.filter(Boolean) : [];
    const photoPosition: string = payload.photoPosition || 'bottom';
    const photoColumns: number = parseInt(payload.photoColumns) || 2;

    // Build foto HTML
    let fotoHtml = '';
    if (fotos.length) {
      fotoHtml = `<table class="foto-table" style="width:100%;border-collapse:collapse;margin-top:6px;table-layout:fixed">`;
      for (let i = 0; i < fotos.length; i += photoColumns) {
        fotoHtml += '<tr style="page-break-inside:avoid;break-inside:avoid;">';
        for (let j = i; j < Math.min(i + photoColumns, fotos.length); j++) {
          const widthPct = Math.floor(100 / photoColumns);
          fotoHtml += `<td class="foto-td" style="padding:4px;border:1px solid #000;text-align:center;width:${widthPct}%;vertical-align:top;page-break-inside:avoid;break-inside:avoid;">` +
            `<img src="${fotos[j]}" style="width:100%;max-height:240px;object-fit:contain;display:block;margin:0 auto 2px auto;">` +
            `<div style="font-size:8pt;color:#000;font-weight:800;line-height:1;margin-top:2px;text-transform:uppercase;">FOTO ${j + 1}</div></td>`;
        }
        // Isi sel kosong jika baris tidak genap
        const remainder = fotos.length % photoColumns;
        if (remainder !== 0 && i + photoColumns >= fotos.length) {
          for (let k = 0; k < photoColumns - remainder; k++) {
            fotoHtml += `<td class="foto-td" style="border:1px solid #000;background:#fdfdfd;"></td>`;
          }
        }
        fotoHtml += '</tr>';
      }
      fotoHtml += '</table>';
    } else {
      fotoHtml = '<p style="font-style:italic;color:#888;font-size:9pt;margin-top:6px">Tidak ada foto dokumentasi.</p>';
    }

    const identitas = payload.identitas || '';
    const adaPelanggar = identitas.trim() !== '' && identitas.toUpperCase() !== 'NIHIL';
    const keterangan = payload.keterangan || payload.uraian || '';
    const uraianHtml = (keterangan && keterangan.trim())
      ? escHtml(keterangan).replace(/\n/g, '<br>')
      : '<span style="color:#bbb;font-style:italic">— belum diisi —</span>';

    const judulUtama = payload.judulUtama || payload.pdfJudul || 'LAPORAN KEGIATAN LINMAS DESA TUGUREJO';

    let html = '<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"><title>Laporan Patroli</title>' +
      '<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:"Times New Roman",serif;font-size:11pt;color:#000;background:#fff}' +
      '@page{size:A4 portrait}' +
      'h1{font-size:11.5pt;font-weight:bold;text-align:center;text-transform:uppercase;margin-bottom:14px;line-height:1.5}' +
      'table.main-data{width:100%;border-collapse:collapse;table-layout:fixed;border:none;}' +
      'table.main-data td{padding:7px 10px;vertical-align:top;font-size:10.5pt;line-height:1.6;border-top:1px solid #000;border-bottom:1px solid #000;}' +
      '.lbl{font-weight:bold;width:4.2cm;border-left:1px solid #000;border-right:none !important;}' +
      '.sep{width:25px;text-align:center;padding-left:0 !important;padding-right:0 !important;border-left:none !important;border-right:1px solid #000 !important;}' +
      '.val{border-left:none !important;border-right:1px solid #000;background:#fff;}' +
      '.uraian-cell{min-height:180px;line-height:1.75}' +
      '.ttd-wrap{margin-top:20px;display:flex;justify-content:flex-end;page-break-inside:avoid;break-inside:avoid}' +
      '.ttd-box{text-align:left;min-width:240px}.ttd-space{height:64px}.ttd-nama{font-weight:bold;text-decoration:underline}' +
      '.lamp-judul{font-size:11pt;font-weight:bold;margin:20px 0 8px;text-decoration:underline}' +
      'tr{page-break-inside:avoid;break-inside:avoid;}' +
      '.spc-td,.spc-row td{border:none !important;background:transparent !important;}' +
      '.kop-divider{border-top:3px solid #000;border-bottom:1.5px solid #000;height:1.5px;margin-top:10px;margin-bottom:12px;}' +
      '.foto-table{width:100%;border-collapse:collapse;margin-top:6px;table-layout:fixed;}' +
      '.foto-td{padding:4px;border:1px solid #000;text-align:center;vertical-align:top;page-break-inside:avoid;break-inside:avoid;}' +
      '.val table,.val table td,.val table th,.val table tr{border:none !important;background:transparent !important;}' +
      '@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head><body>' +
      '<table style="width:100%;border:none;border-collapse:collapse;">';

    // KOP SURAT
    let headerHtml = '';
    if (payload.kopAktif) {
      const logoKiri = (payload.kopLogoKiri && String(payload.kopLogoKiri).startsWith('data:'))
        ? `<img src="${payload.kopLogoKiri}" style="position:absolute;left:2.5cm;top:15px;height:4.5cm;max-width:3cm;object-fit:contain;">`
        : '';
      const logoKanan = (payload.kopLogoKanan && String(payload.kopLogoKanan).startsWith('data:'))
        ? `<img src="${payload.kopLogoKanan}" style="position:absolute;right:2.5cm;top:15px;height:4.5cm;max-width:3cm;object-fit:contain;">`
        : '';
      headerHtml = '<thead style="border:none;"><tr><td style="border:none;text-align:center;padding:15px 2cm 0;position:relative;">' +
        logoKiri +
        `<div style="font-size:14pt;font-family:Arial,sans-serif;line-height:1.2;margin:0 3cm;">${escHtml(payload.kopInstansi || '')}</div>` +
        `<div style="font-size:16pt;font-family:Arial,sans-serif;font-weight:bold;line-height:1.2;margin:0 3cm;">${escHtml(payload.kopDinas || '')}</div>` +
        `<div style="font-size:10pt;font-family:Arial,sans-serif;margin-top:2px;margin:0 3cm;">${escHtml(payload.kopJalan || '')}</div>` +
        logoKanan +
        '<div class="kop-divider"></div>' +
        '</td></tr></thead>';
    } else {
      headerHtml = '<thead class="spc-thead" style="border:none;"><tr class="spc-row"><td class="spc-td" style="border:none !important;height:0;padding:0;"></td></tr></thead>';
    }

    html += headerHtml +
      '<tbody style="border:none;"><tr><td style="border:none;padding:0;vertical-align:top;">' +
      `<h1>${judulUtama}</h1>` +
      '<table class="main-data">';

    // Baris data utama
    html += `<tr><td class="lbl">Tanggal / Waktu</td><td class="sep">:</td><td class="val">${escHtml(payload.tanggal || '')}, ${escHtml(payload.hari || '')}</td></tr>`;
    html += `<tr><td class="lbl">Tujuan</td><td class="sep">:</td><td class="val">${escHtml(payload.tujuan || payload.pdfTujuan || '')}</td></tr>`;
    html += `<tr><td class="lbl">Nomor SPT</td><td class="sep">:</td><td class="val">${escHtml(payload.nomorSpt || payload.noSpt || '')}</td></tr>`;
    html += `<tr><td class="lbl">Lokasi</td><td class="sep">:</td><td class="val">${escHtml(payload.lokasi || '')}</td></tr>`;
    html += `<tr><td class="lbl">Anggota</td><td class="sep">:</td><td class="val">${escHtml(payload.anggota || payload.pdfAnggota || '')}</td></tr>`;
    html += `<tr><td class="lbl">Pukul</td><td class="sep">:</td><td class="val">${escHtml(payload.pukul || payload.pdfPukul || '')}</td></tr>`;

    if (adaPelanggar) {
      let identitasFormatted = '';
      const lines = identitas.split('\n');
      const hasColon = lines.some((l: string) => l.includes(':'));
      if (hasColon) {
        identitasFormatted = '<table style="width:100%;border:none;margin:0;padding:0;border-collapse:collapse;table-layout:auto;">';
        lines.forEach((l: string) => {
          const idx = l.indexOf(':');
          if (idx !== -1) {
            const k = escHtml(l.substring(0, idx).trim());
            const v = escHtml(l.substring(idx + 1).trim());
            identitasFormatted += `<tr><td style="width:1%;white-space:nowrap;padding:0 8px 0 0;border:none;vertical-align:top;background:transparent;">${k}</td>` +
              `<td style="width:1%;padding:0 4px 0 0;border:none;vertical-align:top;background:transparent;">:</td>` +
              `<td style="padding:0;border:none;vertical-align:top;background:transparent;word-break:break-word;white-space:normal;">${v}</td></tr>`;
          } else {
            identitasFormatted += `<tr><td colspan="3" style="padding:0;border:none;vertical-align:top;background:transparent;">${escHtml(l.trim())}</td></tr>`;
          }
        });
        identitasFormatted += '</table>';
      } else {
        identitasFormatted = escHtml(identitas).replace(/\n/g, '<br>');
      }
      html += `<tr><td class="lbl">Kondisi Wilayah</td><td class="sep">:</td><td class="val">${identitasFormatted}</td></tr>`;
    }

    html += `<tr><td class="lbl">Kejadian / Temuan</td><td class="sep">:</td><td class="val uraian-cell">${uraianHtml}</td></tr>`;
    html += '</table>';

    // Foto — posisi atas atau bawah
    const lampiranSection = '<p class="lamp-judul">LAMPIRAN DOKUMENTASI</p>' + fotoHtml;
    if (photoPosition === 'top') {
      html = html.replace('</table>', '</table>' + lampiranSection);
    } else {
      html += lampiranSection;
    }

    // Tanda tangan
    html += `<div class="ttd-wrap"><div class="ttd-box">` +
      `<p>Tugurejo, ${escHtml(payload.tglSurat || '')}</p>` +
      `<p>${escHtml(payload.jabatanTtd || payload.pdfJabatan || 'Kepala Desa Tugurejo')}</p>` +
      '<div class="ttd-space"></div>' +
      `<p class="ttd-nama">${escHtml(payload.namaTtd || payload.pdfNama || 'HERU SETIAWAN, S.Sos')}</p>` +
      `<p>${escHtml(payload.pangkatTtd || payload.pdfPangkat || '')}</p>` +
      `<p>NIP. ${escHtml(payload.nipTtd || payload.pdfNip || '-')}</p>` +
      '</div></div>' +
      '</td></tr></tbody>' +
      '<tfoot class="spc-tfoot" style="border:none;"><tr class="spc-row"><td class="spc-td" style="border:none !important;height:0;padding:0;"></td></tr></tfoot>' +
      '</table></body></html>';

    return success({ html }, 'HTML laporan berhasil digenerate.');
  } catch (e: any) {
    return error(`Gagal generate HTML: ${(e as any).message}`);
  }
}


export async function runMigration(): Promise<any> {
  return success({ log: ['Sistem telah beroperasi penuh menggunakan Cloud Firestore murni.'] }, 'Database Cloud Firestore aktif & normal.');
}


/** Simpan laporan Ronda pada koleksi realtime yang dipantau admin. */
export async function addLaporan(data: any): Promise<any> {
  try {
    const now = new Date();
    const period = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' }).slice(0, 7).replace('-', '');
    const docRef = doc(collection(db, 'ronda'));
    const photos = Array.isArray(data.fotos) ? data.fotos.filter(Boolean) : [];
    const coordinates = data.koordinat?.lat != null && data.koordinat?.lng != null
      ? { lat: Number(data.koordinat.lat), lng: Number(data.koordinat.lng) } : null;
    const timestamp = now.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' WIB';

    // Field dari laportentrem parser:
    //   kondisi   → kondisi wilayah (bukan identitas pelanggar)
    //   kejadian  → kejadian/temuan ronda
    //   tindakan  → tindakan/keterangan tambahan
    //   waktu     → waktu mulai ronda
    const kondisi  = data.kondisi  || data.identitas || 'Aman dan kondusif';
    const kejadian = data.kejadian || data.deskripsi  || data.laporan || '';
    const tindakan = data.tindakan || '';
    const waktu    = data.waktu    || '';

    await setDoc(docRef, {
      ticket: 'RND-' + period + '-' + docRef.id.slice(0, 6).toUpperCase(),
      timestamp,
      tanggalKejadian: data.tanggal || '',
      waktu,
      nama: data.nama || data.namaDanru || 'Petugas Linmas',
      kontak: data.kontak || '',
      kategori: data.kategori || 'Laporan Ronda',
      lokasi: data.lokasi || 'Desa Tugurejo',
      koordinat: coordinates,
      mapUrl: coordinates ? 'https://maps.google.com/?q=' + coordinates.lat + ',' + coordinates.lng : '',
      // Field ronda utama
      kondisi,
      kejadian,
      tindakan,
      // Backward-compatible aliases
      deskripsi: kejadian,
      laporanAsli: data.laporan || '',
      identitas: kondisi,
      personil: data.personil || '',
      danru: data.danru || '',
      namaDanru: data.namaDanru || data.nama || '',
      fotos: photos,
      status: 'Baru',
      catatan: '',
      source: 'Ronda',
      createdAt: now.toISOString(),
      updatedAt: timestamp,
    });
    return success({ id: docRef.id }, 'Laporan Ronda berhasil masuk ke admin TENTREM.');
  } catch (err: any) { return error('Gagal menyimpan laporan: ' + err.message); }
}

// ================================================================
//  8. CRUD LAPORAN RONDA (Firestore: 'ronda')
// ================================================================

/**
 * Helper: Upload base64 foto ke Cloudinary (server-side)
 */
async function uploadFotoCloudinary(base64: string): Promise<string> {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error('Konfigurasi Cloudinary belum lengkap.');
  }
  const timestamp = Math.round(Date.now() / 1000);
  const folder = 'tentrem_tugurejo';
  const crypto = await import('crypto');
  const paramString = `folder=${folder}&timestamp=${timestamp}` + apiSecret;
  const signature = crypto.createHash('sha1').update(paramString).digest('hex');
  const formData = new URLSearchParams();
  formData.append('file', base64);
  formData.append('folder', folder);
  formData.append('timestamp', String(timestamp));
  formData.append('api_key', apiKey);
  formData.append('signature', signature);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body: formData.toString(),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  const json = await res.json();
  if (json.secure_url) return json.secure_url;
  throw new Error(json.error?.message || 'Cloudinary upload gagal');
}

/**
 * Hapus laporan ronda dari Firestore berdasarkan ID dokumen.
 */
export async function deleteLaporan(id: string): Promise<any> {
  try {
    if (!id) return error('ID laporan tidak valid.');
    await deleteDoc(doc(db, 'ronda', id));
    return success('Laporan berhasil dihapus.');
  } catch (err: any) {
    return error(`Gagal hapus laporan: ${err.message}`);
  }
}

/**
 * Update laporan ronda di Firestore.
 * Foto baru (object {data, mime}) akan diupload ke Cloudinary terlebih dahulu.
 */
export async function updateLaporan(id: string, data: any): Promise<any> {
  try {
    if (!id) return error('ID laporan tidak valid.');

    // Proses foto: existing string URL dipertahankan, object {data/mime} diupload
    const fotosRaw: any[] = Array.isArray(data.fotos) ? data.fotos : [];
    const processedFotos: string[] = [];

    for (const foto of fotosRaw) {
      if (typeof foto === 'string' && foto.trim()) {
        // URL existing
        processedFotos.push(foto.trim());
      } else if (foto && typeof foto === 'object') {
        if (typeof foto.url === 'string' && foto.url.trim()) {
          // { url: '...' } — existing
          processedFotos.push(foto.url.trim());
        } else if (foto.data && foto.mime) {
          // Foto baru — upload ke Cloudinary
          try {
            const cloudUrl = await uploadFotoCloudinary(foto.data);
            processedFotos.push(cloudUrl);
          } catch (upErr: any) {
            console.error('[updateLaporan] Upload foto gagal:', upErr.message);
          }
        }
      }
    }

    const updatePayload: Record<string, any> = {
      updatedAt: new Date().toLocaleString('id-ID', {
        timeZone: 'Asia/Jakarta',
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      }) + ' WIB',
      fotos: processedFotos,
    };

    // Field-field yang bisa diupdate
    const allowedFields = [
      'kelompokRonda', 'noSpt', 'lokasi', 'tanggal', 'tanggalKejadian', 'waktu', 'timestamp',
      'kondisi', 'kejadian', 'tindakan', 'status',
      'personil', 'danpok', 'namaDanpok', 'danru', 'namaDanru',
      // backward-compat aliases
      'hari', 'identitas', 'keterangan', 'deskripsi', 'laporan',
    ];
    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        updatePayload[field] = data[field];
      }
    }

    await updateDoc(doc(db, 'ronda', id), updatePayload);
    return success({ id }, 'Laporan berhasil diperbarui.');
  } catch (err: any) {
    return error(`Gagal update laporan: ${err.message}`);
  }
}

/**
 * Ambil foto dari URL eksternal (Cloudinary/lainnya), konversi ke base64 data-URI.
 * Mengembalikan array string base64 data-URI.
 */
export async function fetchFotoBase64(urls: string[]): Promise<any> {
  try {
    if (!Array.isArray(urls) || urls.length === 0) {
      return success({ data: [] });
    }

    const base64Array: string[] = await Promise.all(
      urls.map(async (url) => {
        try {
          const res = await fetch(url);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const contentType = res.headers.get('content-type') || 'image/jpeg';
          const buffer = await res.arrayBuffer();
          const base64 = Buffer.from(buffer).toString('base64');
          return `data:${contentType};base64,${base64}`;
        } catch (e: any) {
          console.error(`[fetchFotoBase64] Gagal fetch ${url}:`, e.message);
          return '';
        }
      })
    );

    return success({ data: base64Array });
  } catch (err: any) {
    return error(`Gagal mengambil foto: ${err.message}`);
  }
}

// ================================================================
//  9. KELOMPOK RONDA MASTER DATA (Firestore: 'kelompok_ronda')
// ================================================================

export async function getKelompokRondaList(): Promise<any> {
  try {
    const snap = await getDocs(collection(db, 'kelompok_ronda'));
    const list: any[] = [];
    snap.forEach((d) => {
      list.push({ id: d.id, _ri: d.id, ...d.data() });
    });
    list.sort((a, b) => (a.urutan || 99) - (b.urutan || 99));
    return success({ list });
  } catch (err: any) {
    return error(`Gagal mengambil daftar kelompok ronda: ${err.message}`);
  }
}

export async function addKelompokRonda(data: any): Promise<any> {
  try {
    const docRef = doc(collection(db, 'kelompok_ronda'));
    await setDoc(docRef, {
      nama: data.nama || 'Kelompok Baru',
      danru: data.danru || '',
      poskamling: data.poskamling || '',
      anggota: Array.isArray(data.anggota) ? data.anggota : (data.anggota ? String(data.anggota).split('\n').filter(Boolean) : []),
      jadwal: data.jadwal || '',
      keterangan: data.keterangan || '',
      urutan: Number(data.urutan) || 10,
      aktif: data.aktif !== false,
      createdAt: new Date().toISOString(),
    });
    return success({ id: docRef.id, _ri: docRef.id }, 'Kelompok ronda berhasil ditambahkan.');
  } catch (err: any) {
    return error(`Gagal tambah kelompok ronda: ${err.message}`);
  }
}

export async function updateKelompokRonda(id: string, data: any): Promise<any> {
  try {
    const targetId = id || data._ri || data.id;
    if (!targetId) return error('ID kelompok ronda tidak valid.');
    await updateDoc(doc(db, 'kelompok_ronda', targetId), {
      nama: data.nama,
      danru: data.danru,
      poskamling: data.poskamling,
      anggota: Array.isArray(data.anggota) ? data.anggota : (data.anggota ? String(data.anggota).split('\n').filter(Boolean) : []),
      jadwal: data.jadwal,
      keterangan: data.keterangan,
      urutan: Number(data.urutan) || 10,
      aktif: data.aktif !== false,
      updatedAt: new Date().toISOString(),
    });
    return success('Kelompok ronda berhasil diperbarui.');
  } catch (err: any) {
    return error(`Gagal update kelompok ronda: ${err.message}`);
  }
}

export async function deleteKelompokRonda(id: string): Promise<any> {
  try {
    if (!id) return error('ID kelompok ronda tidak valid.');
    await deleteDoc(doc(db, 'kelompok_ronda', id));
    return success('Kelompok ronda berhasil dihapus.');
  } catch (err: any) {
    return error(`Gagal hapus kelompok ronda: ${err.message}`);
  }
}

// ================================================================
//  INVENTARIS ASET POSKAMLING (Firestore: 'inventaris')
// ================================================================

export async function getInventaris(): Promise<any> {
  try {
    const snap = await getDocs(query(collection(db, 'inventaris'), orderBy('namaAset', 'asc')));
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return success({ items });
  } catch (err: any) {
    return error(`Gagal mengambil inventaris: ${err.message}`);
  }
}

export async function addInventaris(data: any): Promise<any> {
  try {
    const docRef = doc(collection(db, 'inventaris'));
    const nowIso = new Date().toISOString();
    await setDoc(docRef, {
      namaAset:     data.namaAset     || 'Aset Baru',
      jenis:        data.jenis        || 'Lainnya',
      jumlah:       Number(data.jumlah) || 1,
      satuan:       data.satuan       || 'Unit',
      kondisi:      data.kondisi      || 'Baik',
      keterangan:   data.keterangan   || '',
      foto:         data.foto         || '',
      tanggalMasuk: data.tanggalMasuk || nowIso.split('T')[0],
      ts:           nowIso,
    });
    return success({ id: docRef.id }, 'Inventaris berhasil ditambahkan.');
  } catch (err: any) {
    return error(`Gagal tambah inventaris: ${err.message}`);
  }
}

export async function updateInventaris(id: string, data: any): Promise<any> {
  try {
    const targetId = id || data.id;
    if (!targetId) return error('ID inventaris tidak valid.');
    const updateData: any = {
      namaAset:   data.namaAset,
      jenis:      data.jenis,
      jumlah:     Number(data.jumlah) || 1,
      satuan:     data.satuan,
      kondisi:    data.kondisi,
      keterangan: data.keterangan || '',
      foto:       data.foto       || '',
      ts:         new Date().toISOString(),
    };
    if (data.tanggalMasuk) {
      updateData.tanggalMasuk = data.tanggalMasuk;
    }
    await updateDoc(doc(db, 'inventaris', targetId), updateData);
    return success('Inventaris berhasil diperbarui.');
  } catch (err: any) {
    return error(`Gagal update inventaris: ${err.message}`);
  }
}

export async function deleteInventaris(id: string): Promise<any> {
  try {
    if (!id) return error('ID inventaris tidak valid.');
    await deleteDoc(doc(db, 'inventaris', id));
    return success('Inventaris berhasil dihapus.');
  } catch (err: any) {
    return error(`Gagal hapus inventaris: ${err.message}`);
  }
}
