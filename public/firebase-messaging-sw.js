// firebase-messaging-sw.js — Firebase Cloud Messaging Service Worker (Admin)
// Menangani notifikasi background di HP agar tampil profesional di status bar

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// ─── Konfigurasi Firebase (dari URL params atau hardcoded fallback) ────────────
const urlParams = new URLSearchParams(location.search);
const firebaseConfig = {
  apiKey:            urlParams.get('apiKey')            || "AIzaSyC4dtS_MPlvlNjiCxNJ37R0X95uIznqsnc",
  authDomain:        urlParams.get('authDomain')        || "tentrem.firebaseapp.com",
  projectId:         urlParams.get('projectId')         || "tentrem",
  storageBucket:     urlParams.get('storageBucket')     || "tentrem.firebasestorage.app",
  messagingSenderId: urlParams.get('messagingSenderId') || "536621352207",
  appId:             urlParams.get('appId')             || "1:536621352207:web:e8d15de81269e536b4aa7a",
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// ─── BACKGROUND MESSAGE HANDLER ──────────────────────────────────────────────
// Dipanggil saat tab admin tertutup / tidak aktif
messaging.onBackgroundMessage((payload) => {
  console.info('[FCM SW Admin] Background message received:', payload);

  const data    = payload.data || {};
  const notif   = payload.notification || {};

  const title   = notif.title || data.title || '🚨 Aduan Warga Baru Masuk!';
  const body    = notif.body  || data.body  || 'Ada pengaduan baru dari warga yang membutuhkan penanganan segera.';
  const ticket  = data.ticket || '';
  const url     = data.url    || '/aduan';

  // Tag unik per ticket supaya notif tidak menumpuk untuk tiket yang sama
  const tag = 'tentrem-aduan-' + (ticket || Date.now());

  self.registration.showNotification(title, {
    body,
    // Icon besar (512px ideal) di area notifikasi
    icon: '/assets/icon-192.png',
    // Badge kecil (96px) di status bar / notif bar Android
    badge: '/assets/icon-192.png',
    // Pola getar: 500ms getar, 110ms jeda, berulang — terasa kuat & jelas
    vibrate: [500, 110, 500, 110, 450, 110, 200, 110, 170, 40, 500],
    // Tag unik → Android menggantikan notif lama dengan tiket yang sama
    tag,
    // Renotify → Android tetap membunyikan & menggetar meski tag sama
    renotify: true,
    // requireInteraction → notif tidak hilang sendiri, harus disentuh (Android Chrome)
    requireInteraction: true,
    silent: false,
    // Data yang diteruskan ke notificationclick handler
    data: { url, ticket },
    // Tombol aksi di notifikasi (Android Chrome 114+)
    actions: [
      { action: 'open', title: '📋 Buka Admin' },
      { action: 'dismiss', title: '✕ Tutup' },
    ],
  });
});

// ─── NOTIFICATION CLICK HANDLER ───────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  const notification = event.notification;
  const action       = event.action;
  const targetUrl    = notification.data?.url || '/aduan';

  notification.close();

  // Tombol "Tutup" → hanya dismiss, tidak membuka tab
  if (action === 'dismiss') return;

  // Tombol "Buka Admin" atau klik area notifikasi → buka/fokus tab admin
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Cari tab yang sudah terbuka dan arahkan ke URL tujuan
      for (const client of clientList) {
        const clientUrl = new URL(client.url);
        if (clientUrl.pathname === targetUrl || client.url.includes(targetUrl)) {
          if ('focus' in client) {
            if (client.navigate) client.navigate(targetUrl);
            return client.focus();
          }
        }
      }
      // Tidak ada tab yang cocok → buka tab baru
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// ─── PUSH EVENT HANDLER (Fallback jika FCM compat tidak handle) ──────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data = {};
  try {
    data = event.data.json();
  } catch {
    // Bukan JSON — abaikan, FCM compat sudah handle
    return;
  }

  // Hanya proses jika belum ditangani oleh FCM messaging.onBackgroundMessage
  const notifData  = data.notification || data.data || data;
  const title      = notifData.title || '🚨 Aduan Warga Baru!';
  const body       = notifData.body  || 'Laporan pengaduan baru masuk, segera tindaklanjuti.';
  const ticket     = (data.data || {}).ticket || '';

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon:  '/assets/icon-192.png',
      badge: '/assets/icon-192.png',
      vibrate: [500, 110, 500, 110, 450, 110, 200, 110, 170, 40, 500],
      tag:   'tentrem-aduan-' + (ticket || Date.now()),
      renotify: true,
      requireInteraction: true,
      data:  { url: '/aduan', ticket },
      actions: [
        { action: 'open',    title: '📋 Buka Admin' },
        { action: 'dismiss', title: '✕ Tutup' },
      ],
    })
  );
});
