/**
 * migrate-satlinmas.ts
 *
 * Script migrasi Firestore: salin semua dokumen dari collection 'satlinmas'
 * ke collection 'anggotaPoskamling'.
 *
 * - Field `unit` → dihapus
 * - Field `kategori` → diset ke 'Anggota' untuk semua data lama
 * - Dokumen ID dipertahankan (sama dengan id di satlinmas)
 *
 * Cara pakai:
 *   1. Pastikan file .env di root project sudah berisi kredensial Firebase
 *   2. npx ts-node -r tsconfig-paths/register scripts/migrate-satlinmas.ts
 *
 * Atau kalau belum ada ts-node:
 *   npx tsx scripts/migrate-satlinmas.ts
 */

import { initializeApp, cert, getApps, getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env dari root project
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// ── Init Firebase Admin ────────────────────────────────────────────────────
const serviceAccount = {
  projectId:   process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  // Ganti newline yang di-escape di .env
  privateKey:  (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
};

const fbApp = getApps().length === 0
  ? initializeApp({ credential: cert(serviceAccount as any) })
  : getApp();

const db = getFirestore(fbApp);

// ── Jalankan migrasi ────────────────────────────────────────────────────────
async function migrate() {
  console.log('🚀 Memulai migrasi: satlinmas → anggotaPoskamling ...\n');

  const srcRef  = db.collection('satlinmas');
  const destRef = db.collection('anggotaPoskamling');

  const snapshot = await srcRef.get();

  if (snapshot.empty) {
    console.log('⚠️  Collection satlinmas kosong. Tidak ada yang perlu dimigrasi.');
    return;
  }

  console.log(`📋 Ditemukan ${snapshot.size} dokumen di satlinmas.\n`);

  // Firestore batched write: maks 500 operasi per batch
  const BATCH_SIZE = 400;
  let batch = db.batch();
  let count = 0;
  let batchCount = 0;

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();

    // Mapping field: hapus unit, tambah kategori = 'Anggota'
    const { unit, ...rest } = data as any; // buang field unit
    const newData = {
      ...rest,
      kategori: 'Anggota',  // semua data lama jadi 'Anggota'
      migratedAt: new Date().toISOString(),
      migratedFrom: 'satlinmas',
    };

    // Pertahankan ID yang sama
    batch.set(destRef.doc(docSnap.id), newData);
    count++;

    if (count % BATCH_SIZE === 0) {
      await batch.commit();
      batchCount++;
      console.log(`  ✅ Batch ${batchCount} di-commit (${count} dokumen)`);
      batch = db.batch();
    }
  }

  // Commit sisa
  if (count % BATCH_SIZE !== 0) {
    await batch.commit();
    batchCount++;
    console.log(`  ✅ Batch ${batchCount} di-commit (sisa)`);
  }

  console.log(`\n✅ Migrasi selesai! Total ${count} dokumen berhasil dipindahkan.`);
  console.log(`   Collection sumber: satlinmas`);
  console.log(`   Collection tujuan: anggotaPoskamling`);
  console.log(`   Field kategori:    semua diset ke 'Anggota'\n`);
  console.log('ℹ️  Collection satlinmas TIDAK dihapus otomatis.');
  console.log('   Hapus manual dari Firebase Console jika sudah tidak diperlukan.\n');
}

migrate().catch((err) => {
  console.error('❌ Migrasi gagal:', err);
  process.exit(1);
});
