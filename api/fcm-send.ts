/**
 * api/fcm-send.ts — Vercel Serverless Function & Dev Middleware
 *
 * Menerima array FCM device tokens + payload notifikasi,
 * lalu mengirimkan push notification via Firebase Admin SDK ke Google FCM.
 * Persis seperti implementasi Mesen.Ae-Capacitor.
 */

import * as admin from 'firebase-admin';

// Inisialisasi Firebase Admin SDK (hanya sekali)
function getFirebaseAdminApp() {
  if (admin.apps.length > 0) {
    return admin.apps[0];
  }

  const rawServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!rawServiceAccount) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT environment variable is not defined.');
  }

  let serviceAccount: any;
  try {
    serviceAccount = typeof rawServiceAccount === 'string' ? JSON.parse(rawServiceAccount) : rawServiceAccount;
  } catch (err: any) {
    throw new Error('Gagal parse FIREBASE_SERVICE_ACCOUNT JSON: ' + err.message);
  }

  return admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
  });
}

export default async function handler(req: any, res: any) {
  // ── CORS Headers ──────────────────────────────────────────────────────────
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { tokens, payload } = req.body as {
      tokens: string[];
      payload: { title: string; body: string; url?: string; ticket?: string };
    };

    if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
      return res.status(400).json({ error: 'No tokens provided' });
    }

    getFirebaseAdminApp();

    const targetUrl = payload.url || '/aduan';

    // ── Buat pesan FCM multicast (Persis Mesen.Ae) ───────────────────────────
    const message: admin.messaging.MulticastMessage = {
      tokens,

      // Data tingkat-root untuk kemudahan parsing latar belakang di semua perangkat
      data: {
        title: payload.title,
        body: payload.body,
        url: targetUrl,
        aduanId: String(Date.now()),
        ticket: payload.ticket || '',
      },

      // Notifikasi dasar (tampil di semua platform)
      notification: {
        title: payload.title,
        body: payload.body,
      },

      // ── Android: prioritas tinggi + pola getar ───────────
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          priority: 'max',
          channelId: 'tentrem_aduan',
          vibrateTimingsMillis: [0, 500, 110, 500, 110, 450, 110, 200, 110, 170, 40, 500],
          defaultVibrateTimings: false,
          defaultSound: true,
          notificationCount: 1,
        },
        data: { url: targetUrl },
      },

      // ── APNs (iOS): prioritas tinggi + suara default ──
      apns: {
        headers: {
          'apns-priority': '10',
          'apns-push-type': 'alert',
        },
        payload: {
          aps: {
            alert: {
              title: payload.title,
              body: payload.body,
            },
            sound: 'default',
            badge: 1,
          },
        },
      },

      // ── Web Push: getar + renotify + requireInteraction ───────────
      webpush: {
        headers: {
          Urgency: 'high',
          TTL: '86400',
        },
        notification: {
          title: payload.title,
          body: payload.body,
          icon: '/assets/icon-192.png',
          badge: '/assets/icon-192.png',
          requireInteraction: true,
          vibrate: [500, 110, 500, 110, 450, 110, 200, 110, 170, 40, 500],
          tag: 'tentrem-aduan-' + (payload.ticket || Date.now()),
          renotify: true,
          silent: false,
          data: { url: targetUrl },
          actions: [
            { action: 'open', title: '📋 Buka Admin' },
            { action: 'dismiss', title: '✕ Tutup' },
          ],
        } as any,
        fcmOptions: {
          link: targetUrl,
        },
      },
    };

    // ── Kirim ke semua device sekaligus ────────────────────────────────────
    const response = await admin.messaging().sendEachForMulticast(message);

    const failedTokens: string[] = [];
    response.responses.forEach((resp, idx) => {
      if (!resp.success) {
        const code = (resp.error as any)?.code;
        if (
          code === 'messaging/registration-token-not-registered' ||
          code === 'messaging/invalid-registration-token'
        ) {
          failedTokens.push(tokens[idx]);
        }
        console.error(`[FCM] Token[${idx}] gagal:`, resp.error?.message);
      }
    });

    return res.status(200).json({
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount,
      failedTokens,
    });
  } catch (error: any) {
    console.error('[FCM] Send error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
