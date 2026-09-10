/**
 * run-migrate.mjs
 * Migrasi Firestore: satlinmas → anggotaPoskamling
 * Pakai: node scripts/run-migrate.mjs
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Baca .env manual
const envPath = resolve(__dirname, '../.env');
const envContent = readFileSync(envPath, 'utf-8');
const envLines = envContent.split('\n');
const env = {};
for (const line of envLines) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    let val = match[2].trim();
    if ((val.startsWith("'") && val.endsWith("'")) || (val.startsWith('"') && val.endsWith('"'))) {
      val = val.slice(1, -1);
    }
    env[match[1].trim()] = val;
  }
}

// Dynamic import firebase-admin
const { initializeApp, cert } = await import('firebase-admin/app').catch(() => {
  console.error('❌ firebase-admin belum terinstall. Jalankan: npm install firebase-admin');
  process.exit(1);
});
const { getFirestore } = await import('firebase-admin/firestore');

const serviceAccount = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT);

const fbApp = initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore(fbApp);

async function migrate() {
  console.log('🚀 Memulai migrasi: satlinmas → anggotaPoskamling ...\n');

  const srcRef  = db.collection('satlinmas');
  const destRef = db.collection('anggotaPoskamling');

  const snapshot = await srcRef.get();

  if (snapshot.empty) {
    console.log('⚠️  Collection satlinmas kosong. Tidak ada yang dimigrasi.');
    process.exit(0);
  }

  console.log(`📋 Ditemukan ${snapshot.size} dokumen di satlinmas.\n`);

  const BATCH_SIZE = 400;
  let batch = db.batch();
  let count = 0;
  let batchIdx = 0;

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    // Hapus field unit, tambah kategori = 'Anggota'
    const { unit, ...rest } = data;
    const newData = {
      ...rest,
      kategori: 'Anggota',
      migratedAt: new Date().toISOString(),
      migratedFrom: 'satlinmas',
    };

    batch.set(destRef.doc(docSnap.id), newData);
    count++;

    if (count % BATCH_SIZE === 0) {
      await batch.commit();
      batchIdx++;
      console.log(`  ✅ Batch ${batchIdx} di-commit (${count} dokumen)`);
      batch = db.batch();
    }
  }

  if (count % BATCH_SIZE !== 0) {
    await batch.commit();
    console.log(`  ✅ Batch terakhir di-commit`);
  }

  console.log(`\n✅ Selesai! ${count} dokumen dipindahkan ke 'anggotaPoskamling'.`);
  console.log(`ℹ️  Collection 'satlinmas' TIDAK dihapus otomatis.\n`);
  process.exit(0);
}

migrate().catch(err => {
  console.error('❌ Migrasi gagal:', err.message);
  process.exit(1);
});
