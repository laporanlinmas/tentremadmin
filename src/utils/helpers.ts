/**
 * esc() — sanitasi teks untuk render di React JSX.
 * React sudah otomatis escape karakter HTML saat render teks biasa,
 * sehingga fungsi ini cukup mengembalikan string bersih tanpa encoding manual
 * agar tidak terjadi double-encoding (& → &amp; yang tampil sebagai literal teks).
 */
export function esc(v: string | null | undefined): string {
  if (!v) return '';
  return String(v);
}

/**
 * escUrlAttr() — untuk nilai yang dimasukkan ke dalam atribut HTML via dangerouslySetInnerHTML
 * atau string template di luar JSX. Tetap encode untuk keamanan.
 */
export function escUrlAttr(v: string | null | undefined): string {
  if (v == null || v === '') return '';
  return String(v)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

export function makeDriveThumbUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (url.startsWith('data:')) return url;
  const m1 = /[?&]id=([^&]+)/.exec(url);
  if (m1) return 'https://drive.google.com/thumbnail?id=' + m1[1] + '&sz=w800';
  const m2 = /\/file\/d\/([^\/]+)/.exec(url);
  if (m2) return 'https://drive.google.com/thumbnail?id=' + m2[1] + '&sz=w800';
  return url;
}

export function getMonthNameID(monthIndex: number): string {
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  return months[monthIndex];
}

export function parseISODate(s: string): Date | null {
  if (!s) return null;
  const m = /(\d{4})-(\d{2})-(\d{2})/.exec(s);
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
}

export function parseTglID(s: string): Date | null {
  if (!s) return null;
  const BLN: Record<string, number> = {
    januari: 1, februari: 2, maret: 3, april: 4, mei: 5, juni: 6,
    juli: 7, agustus: 8, september: 9, oktober: 10, november: 11, desember: 12
  };
  const b = s.replace(/^[A-Za-z]+,?\s*/, '').trim().toLowerCase();
  const m = /(\d{1,2})\s+([a-z]+)\s+(\d{4})/.exec(b);
  if (m && BLN[m[2]]) return new Date(+m[3], BLN[m[2]] - 1, +m[1]);
  const m2 = /(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/.exec(s);
  if (m2) return new Date(+m2[3], +m2[2] - 1, +m2[1]);
  return null;
}

export function getMonthYearKey(tanggal: string) {
  const dt = parseTglID(tanggal);
  if (!dt) return null;
  return {
    key: dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0'),
    year: dt.getFullYear(),
    month: dt.getMonth(),
    label: getMonthNameID(dt.getMonth()) + ' ' + dt.getFullYear()
  };
}

export function tglIDStr(d: Date): string {
  const BLN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  return d.getDate() + ' ' + BLN[d.getMonth()] + ' ' + d.getFullYear();
}

export function isRealMobile(): boolean {
  if (typeof navigator === 'undefined') return false;
  return (
    /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) ||
    (navigator.maxTouchPoints > 1 && window.screen.width <= 900)
  );
}

export function isMobileView(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.innerWidth > window.innerHeight) return false;
  return window.innerWidth <= 768 || isRealMobile();
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const cleanHex = (hex || '607d8b').replace('#', '');
  let paddedHex = cleanHex;
  if (cleanHex.length === 3) {
    paddedHex = cleanHex[0] + cleanHex[0] + cleanHex[1] + cleanHex[1] + cleanHex[2] + cleanHex[2];
  }
  return {
    r: parseInt(paddedHex.slice(0, 2), 16),
    g: parseInt(paddedHex.slice(2, 4), 16),
    b: parseInt(paddedHex.slice(4, 6), 16)
  };
}
