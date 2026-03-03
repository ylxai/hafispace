-- Migration: packages_and_payments
-- Tambah kategori, kuotaEdit, includeCetak ke packages
-- Tambah model Payment baru

-- 1. Tambah enum PackageCategory
CREATE TYPE "PackageCategory" AS ENUM ('PREWED', 'WEDDING', 'PERSONAL', 'EVENT', 'LAINNYA');

-- 2. Update packages table
ALTER TABLE "packages" 
  ADD COLUMN "kategori" "PackageCategory" NOT NULL DEFAULT 'LAINNYA',
  ADD COLUMN "kuota_edit" INTEGER,
  ADD COLUMN "include_cetak" JSONB;

-- 3. Tambah indexes ke packages
CREATE INDEX IF NOT EXISTS "packages_vendor_id_idx" ON "packages"("vendor_id");
CREATE INDEX IF NOT EXISTS "packages_kategori_idx" ON "packages"("kategori");

-- 4. Tambah enum PaymentType
CREATE TYPE "PaymentType" AS ENUM ('DP', 'PELUNASAN', 'LAINNYA');

-- 5. Buat tabel payments
CREATE TABLE "payments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "booking_id" UUID NOT NULL,
  "vendor_id" UUID NOT NULL,
  "jumlah" DECIMAL(15,0) NOT NULL,
  "tipe" "PaymentType" NOT NULL DEFAULT 'DP',
  "keterangan" TEXT,
  "bukti_bayar" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "payments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "payments_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE,
  CONSTRAINT "payments_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE
);

-- 6. Indexes untuk payments
CREATE INDEX "payments_booking_id_idx" ON "payments"("booking_id");
CREATE INDEX "payments_vendor_id_idx" ON "payments"("vendor_id");
CREATE INDEX "payments_created_at_idx" ON "payments"("created_at");
