/*
  Warnings:

  - You are about to drop the `Client` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Event` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Gallery` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "VendorStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "SubscriptionType" AS ENUM ('VIEWSPACE', 'PICKSPACE', 'BIZSPACE', 'OMNISPACE');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DpStatus" AS ENUM ('UNPAID', 'PAID', 'PARTIAL');

-- CreateEnum
CREATE TYPE "SelectionType" AS ENUM ('EDIT', 'PRINT');

-- CreateEnum
CREATE TYPE "FieldType" AS ENUM ('TEXT', 'NUMBER', 'DATE', 'SELECT', 'TEXTAREA');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('BOOKING_NEW', 'BOOKING_CONFIRMED', 'DP_RECEIVED', 'SELECTION_DONE', 'PRINT_LOCKED');

-- DropForeignKey
ALTER TABLE "Client" DROP CONSTRAINT "Client_eventId_fkey";

-- DropForeignKey
ALTER TABLE "Event" DROP CONSTRAINT "Event_adminId_fkey";

-- DropForeignKey
ALTER TABLE "Gallery" DROP CONSTRAINT "Gallery_eventId_fkey";

-- DropTable
DROP TABLE "Client";

-- DropTable
DROP TABLE "Event";

-- DropTable
DROP TABLE "Gallery";

-- DropTable
DROP TABLE "User";

-- DropEnum
DROP TYPE "EventStatus";

-- CreateTable
CREATE TABLE "vendors" (
    "id" UUID NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "nama_studio" TEXT,
    "logo_url" TEXT,
    "phone" TEXT,
    "google_refresh_token" TEXT,
    "google_folder_id" TEXT,
    "status" "VendorStatus" NOT NULL DEFAULT 'ACTIVE',
    "subscription_type" "SubscriptionType" NOT NULL DEFAULT 'VIEWSPACE',
    "subscription_expired" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "packages" (
    "id" UUID NOT NULL,
    "vendor_id" UUID NOT NULL,
    "nama_paket" TEXT NOT NULL,
    "harga" DECIMAL(15,0) NOT NULL DEFAULT 0,
    "deskripsi" TEXT,
    "fitur" JSONB,
    "is_customable" BOOLEAN NOT NULL DEFAULT false,
    "urutan" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" UUID NOT NULL,
    "vendor_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "instagram" TEXT,
    "custom_fields" JSONB,
    "total_booking" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" UUID NOT NULL,
    "vendor_id" UUID NOT NULL,
    "client_id" UUID,
    "kode_booking" TEXT NOT NULL,
    "nama_client" TEXT NOT NULL,
    "hp_client" TEXT NOT NULL,
    "email_client" TEXT,
    "paket_id" UUID,
    "paket_custom" TEXT,
    "harga_paket" DECIMAL(15,0),
    "tanggal_sesi" TIMESTAMP(3) NOT NULL,
    "lokasi_sesi" TEXT,
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
    "dp_amount" DECIMAL(15,0),
    "dp_status" "DpStatus" NOT NULL DEFAULT 'UNPAID',
    "invoice_url" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "galleries" (
    "id" UUID NOT NULL,
    "vendor_id" UUID NOT NULL,
    "booking_id" UUID,
    "nama_project" TEXT NOT NULL,
    "client_token" TEXT NOT NULL,
    "google_folder_id" TEXT,
    "google_photos" JSONB,
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "status" "GalleryStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "galleries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gallery_settings" (
    "id" UUID NOT NULL,
    "gallery_id" UUID NOT NULL,
    "max_selection" INTEGER NOT NULL DEFAULT 20,
    "enable_download" BOOLEAN NOT NULL DEFAULT true,
    "download_expired" TIMESTAMP(3),
    "enable_print" BOOLEAN NOT NULL DEFAULT false,
    "print_specs" JSONB,
    "watermark_enabled" BOOLEAN NOT NULL DEFAULT false,
    "watermark_text" TEXT,
    "banner_client_name" TEXT,
    "banner_event_date" TIMESTAMP(3),
    "banner_message" TEXT,
    "welcome_message" TEXT,
    "thank_you_message" TEXT,

    CONSTRAINT "gallery_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "photo_selections" (
    "id" UUID NOT NULL,
    "gallery_id" UUID NOT NULL,
    "file_id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "file_path" TEXT,
    "selection_type" "SelectionType" NOT NULL DEFAULT 'EDIT',
    "print_size" TEXT,
    "selected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "locked_at" TIMESTAMP(3),
    "is_locked" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "photo_selections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_fields" (
    "id" UUID NOT NULL,
    "vendor_id" UUID NOT NULL,
    "nama_field" TEXT NOT NULL,
    "tipe" "FieldType" NOT NULL DEFAULT 'TEXT',
    "options" JSONB,
    "wajib" BOOLEAN NOT NULL DEFAULT false,
    "urutan" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "custom_fields_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "vendor_id" UUID NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT,
    "data" JSONB,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" UUID NOT NULL,
    "vendor_id" UUID,
    "gallery_id" UUID,
    "action" TEXT NOT NULL,
    "details" TEXT,
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "vendors_username_key" ON "vendors"("username");

-- CreateIndex
CREATE UNIQUE INDEX "vendors_email_key" ON "vendors"("email");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_kode_booking_key" ON "bookings"("kode_booking");

-- CreateIndex
CREATE UNIQUE INDEX "galleries_client_token_key" ON "galleries"("client_token");

-- CreateIndex
CREATE UNIQUE INDEX "gallery_settings_gallery_id_key" ON "gallery_settings"("gallery_id");

-- AddForeignKey
ALTER TABLE "packages" ADD CONSTRAINT "packages_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_paket_id_fkey" FOREIGN KEY ("paket_id") REFERENCES "packages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "galleries" ADD CONSTRAINT "galleries_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "galleries" ADD CONSTRAINT "galleries_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gallery_settings" ADD CONSTRAINT "gallery_settings_gallery_id_fkey" FOREIGN KEY ("gallery_id") REFERENCES "galleries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photo_selections" ADD CONSTRAINT "photo_selections_gallery_id_fkey" FOREIGN KEY ("gallery_id") REFERENCES "galleries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_fields" ADD CONSTRAINT "custom_fields_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
