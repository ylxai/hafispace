import { config } from "dotenv";

config({ path: ".env" });

async function main() {
  const [{ prisma }, { hashPassword }] = await Promise.all([
    import("../src/lib/db"),
    import("../src/lib/auth/password"),
  ]);

  const username = "nandika";
  const password = "klp123";
  const passwordHash = await hashPassword(password);

  // Create vendor (admin)
  const vendor = await prisma.vendor.upsert({
    where: { username },
    update: { password: passwordHash },
    create: {
      username,
      email: "nandika@example.com",
      password: passwordHash,
      namaStudio: "Detranium Photography",
      phone: "+6281234567890",
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
      tanggalSesi: new Date("2024-04-18"),
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
      tanggalSesi: new Date("2024-04-18"),
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
      cloudinaryFolderId: "lestar wedding",
      viewCount: 45,
      status: "DELIVERED",
    },
    create: {
      vendorId: vendor.id,
      bookingId: booking.id,
      namaProject: "Lestari Wedding",
      clientToken: "abc123def456",
      cloudinaryFolderId: "lestar wedding",
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
