import type { IncomingMessage, ServerResponse } from 'http';
import {
  checkLogin,
  changePassword,
  createAccount,
  getSatlinmasData,
  addSatlinmas,
  updateSatlinmas,
  deleteSatlinmas,
  getLayerPeta,
  addLayerPeta,
  updateLayerPeta,
  deleteLayerPeta,
  toggleLayerAktif,
  saveGambarPeta,
  getGambarPeta,
  deleteGambarPeta,
  getNoWaList,
  addNoWa,
  updateNoWa,
  deleteNoWa,
  getSettings,
  saveSettings,
  getDashboardStats,
  getRekapData,
  generateLaporanHtml,
  addLaporan,
  deleteLaporan,
  updateLaporan,
  getKelompokRondaList,
  addKelompokRonda,
  updateKelompokRonda,
  deleteKelompokRonda,
  getRondaSecurity,
  saveRondaSecurity,
  fetchFotoBase64,
  runMigration,
  getInventaris,
  addInventaris,
  updateInventaris,
  deleteInventaris,
  success,
  error
} from './lib/firebase-service';

interface VercelRequest extends IncomingMessage {
  query: { [key: string]: string | string[] };
  cookies: { [key: string]: string };
  body: any;
  method?: string;
}

interface VercelResponse extends ServerResponse {
  status: (statusCode: number) => VercelResponse;
  send: (body: any) => VercelResponse;
  json: (jsonBody: any) => VercelResponse;
  redirect: (statusOrUrl: number | string, url?: string) => VercelResponse;
  end: (cb?: () => void) => this;
  setHeader: (name: string, value: string | string[]) => this;
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<any> {
  // CORS headers
  const allowedOrigin = process.env.ALLOWED_ORIGIN || '';
  const origin = (req.headers as any)['origin'] || '';
  if (allowedOrigin && origin === allowedOrigin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    let result: any;

    if (req.method === 'GET') {
      const { action } = req.query as { [key: string]: string };

      switch (action) {
        case 'ping':
          result = success({ pong: true, time: new Date().toISOString(), engine: 'Firebase Firestore + Cloudinary' });
          break;
        case 'getSatlinmas':
          result = await getSatlinmasData();
          break;
        case 'getLayerPeta':
          result = await getLayerPeta();
          break;
        case 'getGambarPeta':
          result = await getGambarPeta();
          break;
        case 'getNoWa':
          result = await getNoWaList();
          break;
        case 'getSettings':
          result = await getSettings();
          break;
        case 'getDashboard':
          result = await getDashboardStats();
          break;
        case 'getRekap':
          result = await getRekapData();
          break;
        case 'getKelompokRonda':
          result = await getKelompokRondaList();
          break;
        case 'getRondaSecurity':
          result = await getRondaSecurity();
          break;
        case 'getDetailFotoMarkers':
          result = success({ photos: [] });
          break;
        case 'getInventaris':
          result = await getInventaris();
          break;
        default:
          result = success({ message: `Action ${action} ready.` });
      }

    } else if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      const action = body.action || '';

      switch (action) {
        case 'login':
          result = await checkLogin(body.username || body.u, body.password || body.p);
          break;
        case 'changePassword':
          result = await changePassword(body.username || body.u, body.oldPassword || body.oldP, body.newPassword || body.newP);
          break;
        case 'createAccount':
          result = await createAccount(body.username || body.u, body.password || body.p, body.role || body.r, body.nama || body.namaLengkap);
          break;
        case 'uploadCloudinary':
        case 'proxy':
          result = await uploadCloudinary(body.fileData || body.base64);
          break;
        case 'uploadFoto':
          result = await uploadCloudinary(body?.data?.foto?.data || body.fileData || '');
          if (result.success) result = { ...result, linkFile: result.url, namaFile: 'laporan-' + Date.now() + '.jpg' };
          break;
        case 'submitLaporan': {
          const payload = body.data || body;
          const linkedPhotos = Array.isArray(payload.linkFoto)
            ? payload.linkFoto.map((photo: any) => photo?.link || photo?.url || photo).filter(Boolean)
            : [];
          result = await addLaporan({
            laporan:   payload.laporan,
            // Field utama ronda dari laportentrem
            waktu:     payload.waktu     || '',
            kondisi:   payload.kondisi   || payload.identitas || 'Aman dan kondusif',
            kejadian:  payload.kejadian  || payload.deskripsi || payload.laporan || '',
            tindakan:  payload.tindakan  || '',
            // Field lokasi & personil
            lokasi:    payload.lokasi,
            tanggal:   payload.tanggal,
            namaDanru: payload.namaDanru,
            danru:     payload.danru,
            personil:  payload.personil,
            // Backward compat
            identitas: payload.kondisi || payload.identitas || 'Aman dan kondusif',
            deskripsi: payload.kejadian || payload.laporan || '',
            // Foto & koordinat
            fotos:     linkedPhotos,
            koordinat: payload.koordinat,
          });
          break;
        }
        case 'getSettings':
          result = await getSettings();
          break;
        case 'saveSettings':
          result = await saveSettings(body.settings || body);
          break;
        case 'getSatlinmas':
          result = await getSatlinmasData();
          break;
        case 'addSatlinmas':
          result = await addSatlinmas(body.data || body);
          break;
        case 'updateSatlinmas':
          result = await updateSatlinmas(body.id || body.ri || body._ri, body.data || body);
          break;
        case 'deleteSatlinmas':
          result = await deleteSatlinmas(body.id || body.ri || body._ri);
          break;
        case 'getLayerPeta':
          result = await getLayerPeta();
          break;
        case 'addLayerPeta':
          result = await addLayerPeta(body.data || body);
          break;
        case 'updateLayerPeta':
          result = await updateLayerPeta(body.id || body.ri || body._ri, body.data || body);
          break;
        case 'deleteLayerPeta':
          result = await deleteLayerPeta(body.id || body.ri || body._ri);
          break;
        case 'toggleLayerAktif':
          result = await toggleLayerAktif(body.id || body.ri || body._ri, body.aktif);
          break;
        case 'getGambarPeta':
          result = await getGambarPeta();
          break;
        case 'saveGambarPeta':
          result = await saveGambarPeta(body.data || body);
          break;
        case 'deleteGambarPeta':
          result = await deleteGambarPeta(body.id || body.ri || body._ri);
          break;
        case 'getNoWa':
          result = await getNoWaList();
          break;
        case 'addNoWa':
          result = await addNoWa(body.data || body);
          break;
        case 'updateNoWa':
          result = await updateNoWa(body.id || body.ri || body._ri, body.data || body);
          break;
        case 'deleteNoWa':
          result = await deleteNoWa(body.id || body.ri || body._ri);
          break;
        case 'deleteLaporan':
          result = await deleteLaporan(body.id || body._ri || body.ri);
          break;
        case 'updateLaporan': {
          const id = body._ri || body.id || body.ri;
          result = await updateLaporan(id, body);
          break;
        }
        case 'getKelompokRonda':
          result = await getKelompokRondaList();
          break;
        case 'addKelompokRonda':
          result = await addKelompokRonda(body.data || body);
          break;
        case 'updateKelompokRonda':
          result = await updateKelompokRonda(body.id || body.ri || body._ri, body.data || body);
          break;
        case 'deleteKelompokRonda':
          result = await deleteKelompokRonda(body.id || body.ri || body._ri);
          break;
        case 'getRondaSecurity':
          result = await getRondaSecurity();
          break;
        case 'saveRondaSecurity':
          result = await saveRondaSecurity(body.data || body);
          break;
        case 'fetchFotoBase64':
          result = await fetchFotoBase64(body.urls || []);
          break;
        case 'generateLaporanHtml':
          result = generateLaporanHtml(body);
          break;
        case 'initAllSheets':
        case 'runMigration':
          result = await runMigration();
          break;
        case 'getInventaris':
          result = await getInventaris();
          break;
        case 'addInventaris':
          result = await addInventaris(body.data || body);
          break;
        case 'updateInventaris':
          result = await updateInventaris(body.id, body.data || body);
          break;
        case 'deleteInventaris':
          result = await deleteInventaris(body.id);
          break;
        default:
          result = success({ message: `Action ${action} processed.` });
      }

    } else {
      result = error('Method not allowed.');
    }

    return res.status(200).json(result);

  } catch (err: any) {
    console.error('[API Error]:', err.stack || err.message);
    return res.status(200).json(error('Server Error: ' + err.message));
  }
}

// Cloudinary signature-based secure upload helper
async function uploadCloudinary(fileDataBase64: string) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  
  if (!cloudName || !apiKey || !apiSecret) {
    return { success: false, message: 'Cloudinary credentials are not configured in environment.' };
  }

  try {
    const timestamp = Math.round(new Date().getTime() / 1000);
    const folder = 'tentrem_tugurejo';
    
    // Params to sign (alphabetical order)
    const params: Record<string, any> = {
      folder,
      timestamp,
    };
    
    // Generate signature
    const crypto = await import('crypto');
    const sortedKeys = Object.keys(params).sort();
    const paramString = sortedKeys.map(key => `${key}=${params[key]}`).join('&') + apiSecret;
    const signature = crypto.createHash('sha1').update(paramString).digest('hex');

    // Build URL encoded body
    const searchParams = new URLSearchParams();
    searchParams.append('file', fileDataBase64);
    searchParams.append('folder', folder);
    searchParams.append('timestamp', String(timestamp));
    searchParams.append('api_key', apiKey);
    searchParams.append('signature', signature);

    const url = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
    const response = await fetch(url, {
      method: 'POST',
      body: searchParams.toString(),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      }
    });

    const resData = await response.json();
    if (resData.secure_url) {
      return { success: true, url: resData.secure_url };
    } else {
      return { success: false, message: resData.error?.message || 'Failed to upload to Cloudinary.' };
    }
  } catch (err: any) {
    console.error('[uploadCloudinary Error]:', err);
    return { success: false, message: 'Server error during Cloudinary upload: ' + err.message };
  }
}
