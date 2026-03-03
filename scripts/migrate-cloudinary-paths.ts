/**
 * Migration Script: Update Cloudinary folder paths dari `galleries/` → `hafispace/galleries/`
 *
 * Script ini melakukan:
 * 1. Cari semua foto di DB yang storageKey-nya diawali `galleries/`
 * 2. Update storageKey → `hafispace/galleries/...`
 * 3. Update url & thumbnailUrl dengan replace domain Cloudinary
 * 4. Log summary hasil migrasi
 *
 * PENTING: Script ini hanya update database. Untuk move file di Cloudinary,
 * gunakan Cloudinary Console atau Cloudinary Migration API secara terpisah.
 *
 * Jalankan:
 *   npx tsx scripts/migrate-cloudinary-paths.ts
 *   npx tsx scripts/migrate-cloudinary-paths.ts --dry-run  (preview tanpa update)
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const OLD_PREFIX = "galleries/";
const NEW_PREFIX = "hafispace/galleries/";

function migrateStorageKey(storageKey: string): string {
  if (storageKey.startsWith(OLD_PREFIX)) {
    return NEW_PREFIX + storageKey.slice(OLD_PREFIX.length);
  }
  return storageKey;
}

function migrateUrl(url: string): string {
  // Ganti path di Cloudinary URL
  // Contoh: https://res.cloudinary.com/xxx/image/upload/galleries/... 
  //       → https://res.cloudinary.com/xxx/image/upload/hafispace/galleries/...
  return url.replace(
    /\/image\/upload\/(v\d+\/)?galleries\//,
    (match, version) => `/image/upload/${version ?? ""}hafispace/galleries/`
  );
}

async function run() {
  const isDryRun = process.argv.includes("--dry-run");

  console.log(`\n🔍 Cloudinary Path Migration`);
  console.log(`   Mode: ${isDryRun ? "DRY RUN (no changes will be made)" : "LIVE"}`);
  console.log(`   Old prefix: ${OLD_PREFIX}`);
  console.log(`   New prefix: ${NEW_PREFIX}\n`);

  // Cari semua foto dengan path lama
  const photos = await prisma.photo.findMany({
    where: {
      storageKey: {
        startsWith: OLD_PREFIX,
      },
    },
    select: {
      id: true,
      storageKey: true,
      url: true,
      thumbnailUrl: true,
      galleryId: true,
    },
  });

  console.log(`📊 Ditemukan ${photos.length} foto dengan path lama\n`);

  if (photos.length === 0) {
    console.log("✅ Tidak ada yang perlu dimigrasi.");
    await prisma.$disconnect();
    return;
  }

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (const photo of photos) {
    const newStorageKey = migrateStorageKey(photo.storageKey);
    const newUrl = migrateUrl(photo.url);
    const newThumbnailUrl = photo.thumbnailUrl ? migrateUrl(photo.thumbnailUrl) : photo.thumbnailUrl;

    if (newStorageKey === photo.storageKey) {
      skipCount++;
      continue;
    }

    console.log(`  [${photo.id}]`);
    console.log(`    storageKey: ${photo.storageKey}`);
    console.log(`             → ${newStorageKey}`);
    console.log(`    url:       ${photo.url}`);
    console.log(`             → ${newUrl}\n`);

    if (!isDryRun) {
      try {
        await prisma.photo.update({
          where: { id: photo.id },
          data: {
            storageKey: newStorageKey,
            url: newUrl,
            thumbnailUrl: newThumbnailUrl,
          },
        });
        successCount++;
      } catch (err) {
        console.error(`  ❌ Gagal update foto ${photo.id}:`, err);
        errorCount++;
      }
    } else {
      successCount++;
    }
  }

  console.log(`\n📋 Hasil Migrasi:`);
  console.log(`   ✅ ${isDryRun ? "Akan diupdate" : "Berhasil diupdate"}: ${successCount}`);
  console.log(`   ⏭️  Dilewati (tidak perlu update): ${skipCount}`);
  if (errorCount > 0) {
    console.log(`   ❌ Error: ${errorCount}`);
  }

  if (isDryRun) {
    console.log(`\n⚠️  Ini adalah DRY RUN. Jalankan tanpa --dry-run untuk apply perubahan.`);
  } else {
    console.log(`\n✅ Migrasi database selesai!`);
    console.log(`\n⚠️  LANGKAH SELANJUTNYA:`);
    console.log(`   Foto di Cloudinary masih berada di path lama (${OLD_PREFIX}...)`);
    console.log(`   Anda perlu memindahkan folder di Cloudinary Console:`);
    console.log(`   1. Login ke cloudinary.com`);
    console.log(`   2. Buka Media Library → folder "galleries"`);
    console.log(`   3. Rename/Move ke "hafispace/galleries"`);
    console.log(`   Atau gunakan Cloudinary Admin API (rename resource) per file.\n`);
  }

  await prisma.$disconnect();
}

run().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
