/**
 * Migration Script: Encrypt Cloudinary Credentials
 * 
 * Script ini mengenkripsi credentials Cloudinary yang sudah ada di database.
 * Jalankan SEKALI setelah deploy encryption feature.
 * 
 * Prerequisites:
 * 1. Set CLOUDINARY_MASTER_KEY di .env
 * 2. Backup database sebelum menjalankan
 * 
 * Usage:
 *   npx tsx scripts/migrate-encrypt-credentials.ts
 */

import { PrismaClient } from '@prisma/client';
import { encrypt, isEncrypted } from '../src/lib/encryption';

const prisma = new PrismaClient();

async function migrateCredentials() {
  console.log('🔐 Starting Cloudinary credentials encryption migration...\n');

  try {
    // Check if encryption is configured
    if (!process.env.CLOUDINARY_MASTER_KEY) {
      console.error('❌ Error: CLOUDINARY_MASTER_KEY environment variable is not set.');
      console.log('   Generate a key with: openssl rand -hex 32');
      process.exit(1);
    }

    // Get all Cloudinary accounts
    const accounts = await prisma.vendorCloudinary.findMany({
      select: {
        id: true,
        name: true,
        apiKey: true,
        apiSecret: true,
      },
    });

    console.log(`📊 Found ${accounts.length} Cloudinary account(s)\n`);

    if (accounts.length === 0) {
      console.log('✅ No accounts to migrate.');
      return;
    }

    let encryptedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const account of accounts) {
      try {
        // Check if already encrypted (heuristic)
        const keyEncrypted = isEncrypted(account.apiKey);
        const secretEncrypted = isEncrypted(account.apiSecret);

        if (keyEncrypted && secretEncrypted) {
          console.log(`⏭️  Skipping "${account.name}" - already encrypted`);
          skippedCount++;
          continue;
        }

        // Encrypt each credential separately to avoid double encryption
        // If one is already encrypted and the other isn't, only encrypt the unencrypted one
        const encryptedKey = keyEncrypted ? account.apiKey : encrypt(account.apiKey);
        const encryptedSecret = secretEncrypted ? account.apiSecret : encrypt(account.apiSecret);

        // Update database
        await prisma.vendorCloudinary.update({
          where: { id: account.id },
          data: {
            apiKey: encryptedKey,
            apiSecret: encryptedSecret,
          },
        });

        console.log(`🔒 Encrypted "${account.name}" (${account.id})`);
        encryptedCount++;
      } catch (error) {
        console.error(`❌ Error encrypting "${account.name}":`, error);
        errorCount++;
      }
    }

    console.log('\n📈 Migration Summary:');
    console.log(`   Encrypted: ${encryptedCount}`);
    console.log(`   Skipped:   ${skippedCount}`);
    console.log(`   Errors:    ${errorCount}`);

    if (errorCount === 0) {
      console.log('\n✅ Migration completed successfully!');
    } else {
      console.log('\n⚠️  Migration completed with errors.');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration
migrateCredentials();
