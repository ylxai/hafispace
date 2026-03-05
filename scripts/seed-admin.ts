import { config } from "dotenv";

config({ path: ".env" });

/**
 * Seed script untuk membuat data awal vendor, paket, klien, booking, dan galeri.
 *
 * KEAMANAN: Kredensial admin dibaca dari environment variables.
 * Jalankan dengan:
 *   SEED_USERNAME=admin SEED_PASSWORD=password_kuat npx tsx scripts/seed-admin.ts
 *
 * Atau pastikan variabel berikut ada di .env:
 *   SEED_USERNAME=your_username
 *   SEED_PASSWORD=your_secure_password
 */

async function main() {
  const [{ prisma }, { hashPassword }] = await Promise.all([
    import("../src/lib/db"),
    import("../src/lib/auth/password"),
  ]);

  // Baca kredensial dari environment variables
  const username = process.env.SEED_USERNAME;
  const password = process.env.SEED_PASSWORD;

  if (!username || !password) {
    console.error(
      "❌ Error: SEED_USERNAME dan SEED_PASSWORD harus diisi di environment variables."
    );
    console.error(
      "   Contoh: SEED_USERNAME=admin SEED_PASSWORD=password_kuat npx tsx scripts/seed-admin.ts"
    );
    process.exit(1);
  }

  if (password.length < 8) {
    console.error("❌ Error: SEED_PASSWORD harus minimal 8 karakter.");
    process.exit(1);
  }

  const passwordHash = await hashPassword(password);

  // Create vendor (admin)
  const vendor = await prisma.vendor.upsert({
    where: { username },
    update: { password: passwordHash },
    create: {
      username,
      email: process.env.SEED_EMAIL ?? `${username}@example.com`,
      password: passwordHash,
      namaStudio: process.env.SEED_STUDIO_NAME ?? "Photography Studio",
      phone: process.env.SEED_PHONE ?? "+6281234567890",
      status: "ACTIVE",
      subscriptionType: "OMNISPACE",
    },
  });

  // Create package (idempotent)
  const existingPackage = await prisma.package.findFirst({
    where: { vendorId: vendor.id, namaPaket: "Wedding Package" },
  });

  const pkg = existingPackage
    ? await prisma.package.update({
        where: { id: existingPackage.id },
        data: {
          harga: 10000000,
          deskripsi: "Full wedding coverage",
          fitur: ["8 Hours", "2 Photographers", "500+ Photos", "Album"],
          isCustomable: false,
          status: "active",
        },
      })
    : await prisma.package.create({
        data: {
          vendorId: vendor.id,
          namaPaket: "Wedding Package",
          harga: 10000000,
          deskripsi: "Full wedding coverage",
          fitur: ["8 Hours", "2 Photographers", "500+ Photos", "Album"],
          isCustomable: false,
          status: "active",
        },
      });

  // Create client (idempotent)
  const existingClient = await prisma.client.findFirst({
    where: { vendorId: vendor.id, email: "lestari@example.com" },
  });

  const client = existingClient
    ? await prisma.client.update({
        where: { id: existingClient.id },
        data: {
          name: "Lestari & Dani",
          phone: "+6281234567891",
          instagram: "@lestari_dani",
        },
      })
    : await prisma.client.create({
        data: {
          vendorId: vendor.id,
          name: "Lestari & Dani",
          email: "lestari@example.com",
          phone: "+6281234567891",
          instagram: "@lestari_dani",
        },
      });

  // Create booking (idempotent)
  const booking = await prisma.booking.upsert({
    where: { kodeBooking: "BK-WEDDING001" },
    update: {
      namaClient: "Lestari & Dani",
      hpClient: "+6281234567891",
      emailClient: "lestari@example.com",
      paketId: pkg.id,
      hargaPaket: 10000000,
      tanggalSesi: new Date("2024-04-18T12:00:00.000Z"),
      lokasiSesi: "Gedung Serbaguna Bandung",
      status: "COMPLETED",
      dpAmount: 5000000,
      dpStatus: "PAID",
    },
    create: {
      vendorId: vendor.id,
      clientId: client.id,
      kodeBooking: "BK-WEDDING001",
      namaClient: "Lestari & Dani",
      hpClient: "+6281234567891",
      emailClient: "lestari@example.com",
      paketId: pkg.id,
      hargaPaket: 10000000,
      tanggalSesi: new Date("2024-04-18T12:00:00.000Z"),
      lokasiSesi: "Gedung Serbaguna Bandung",
      status: "COMPLETED",
      dpAmount: 5000000,
      dpStatus: "PAID",
    },
  });

  // Create gallery (idempotent)
  const gallery = await prisma.gallery.upsert({
    where: { clientToken: "abc123def456" },
    update: {
      bookingId: booking.id,
      namaProject: "Lestari Wedding",
      cloudinaryFolderId: "lestari_wedding",
      viewCount: 45,
      status: "DELIVERED",
    },
    create: {
      vendorId: vendor.id,
      bookingId: booking.id,
      namaProject: "Lestari Wedding",
      clientToken: "abc123def456",
      cloudinaryFolderId: "lestari_wedding",
      viewCount: 45,
      status: "DELIVERED",
    },
  });

  // Create gallery settings (idempotent)
  await prisma.gallerySetting.upsert({
    where: { galleryId: gallery.id },
    update: {
      enableDownload: true,
      enablePrint: true,
      welcomeMessage: "Hai Lestari & Dani! Senang sekali bisa mengabadikan momen indah kalian.",
      thankYouMessage: "Terima kasih telah memilih foto-foto kami! Akan kami proses dengan segera.",
    },
    create: {
      galleryId: gallery.id,
      enableDownload: true,
      enablePrint: true,
      welcomeMessage: "Hai Lestari & Dani! Senang sekali bisa mengabadikan momen indah kalian.",
      thankYouMessage: "Terima kasih telah memilih foto-foto kami! Akan kami proses dengan segera.",
    },
  });

  console.log(`✅ Vendor created/updated: ${vendor.username}`);
  console.log(`✅ Package ensured: ${pkg.namaPaket}`);
  console.log(`✅ Client ensured: ${client.name}`);
  console.log(`✅ Booking ensured: ${booking.kodeBooking}`);
  console.log(`✅ Gallery ensured: ${gallery.namaProject}`);

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
