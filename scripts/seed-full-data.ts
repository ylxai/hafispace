import { config } from "dotenv";

config({ path: ".env" });

async function main() {
  const [{ prisma }, { hashPassword }] = await Promise.all([
    import("../src/lib/db"),
    import("../src/lib/auth/password"),
  ]);

  console.log("🌱 Seeding production data...\n");

  const vendor = await prisma.vendor.upsert({
    where: { username: "nandika" },
    update: {},
    create: {
      username: "nandika",
      email: "hafi@hafiportrait.photography",
      password: await hashPassword("klp123456"),
      namaStudio: "Hafiportrait Photography",
      phone: "6282353345446",
      waAdmin: "6282353345446",
      dpPercentage: 30,
      themeColor: "#d4af37",
      bookingFormActive: true,
      subscriptionType: "OMNISPACE",
      status: "ACTIVE",
    },
  });

  console.log(`✅ Vendor: ${vendor.namaStudio}`);

  // Create packages (let Prisma generate UUIDs)
  const packages = await Promise.all([
    prisma.package.create({
      data: {
        vendorId: vendor.id,
        namaPaket: "Wedding Package",
        kategori: "WEDDING",
        harga: 10000000,
        kuotaEdit: 100,
        deskripsi: "Paket pernikahan lengkap",
        includeCetak: [{ nama: "Album", jumlah: 1 }],
        status: "active",
      },
    }),
    prisma.package.create({
      data: {
        vendorId: vendor.id,
        namaPaket: "Prewed Package",
        kategori: "PREWED",
        harga: 3000000,
        kuotaEdit: 50,
        deskripsi: "Paket pre-wedding",
        status: "active",
      },
    }),
    prisma.package.create({
      data: {
        vendorId: vendor.id,
        namaPaket: "Custom Package",
        kategori: "LAINNYA",
        harga: 2500000,
        deskripsi: "Paket custom sesuai kebutuhan",
        status: "active",
      },
    }),
  ]);

  console.log(`✅ Packages: ${packages.length}`);

  const clients = await Promise.all([
    prisma.client.create({
      data: {
        vendorId: vendor.id,
        name: "Lestari & Dani",
        email: "lestari@example.com",
        phone: "+6281234567891",
        instagram: "@lestari_dani",
      },
    }),
    prisma.client.create({
      data: {
        vendorId: vendor.id,
        name: "Test Client A",
        email: "testclient@example.com",
        phone: "6281234567890",
      },
    }),
    prisma.client.create({
      data: {
        vendorId: vendor.id,
        name: "Fulan & Fulanah",
        email: "fulan@example.com",
        phone: "085828362720",
        instagram: "@fulan_fulanah",
      },
    }),
  ]);

  console.log(`✅ Clients: ${clients.length}`);

  const bookings = await Promise.all([
    prisma.booking.create({
      data: {
        vendorId: vendor.id,
        clientId: clients[0].id,
        paketId: packages[0].id,
        kodeBooking: "BK-WEDDING001",
        namaClient: "Lestari & Dani",
        hpClient: "+6281234567891",
        emailClient: "lestari@example.com",
        tanggalSesi: new Date("2024-04-18T10:00:00Z"),
        lokasiSesi: "Gedung Serbaguna Bandung",
        status: "COMPLETED",
        hargaPaket: 10000000,
        dpAmount: 3000000,
        dpStatus: "PAID",
      },
    }),
    prisma.booking.create({
      data: {
        vendorId: vendor.id,
        clientId: clients[1].id,
        paketId: packages[2].id,
        kodeBooking: "BK-MMBO96IL",
        namaClient: "Test Client A",
        hpClient: "6281234567890",
        emailClient: "testclient@example.com",
        tanggalSesi: new Date("2026-04-18T14:00:00Z"),
        lokasiSesi: "Studio",
        status: "CONFIRMED",
        hargaPaket: 2500000,
        dpAmount: 0,
        dpStatus: "UNPAID",
      },
    }),
    prisma.booking.create({
      data: {
        vendorId: vendor.id,
        clientId: clients[2].id,
        paketId: packages[1].id,
        kodeBooking: "BK-MMDG7EN8",
        namaClient: "Fulan & Fulanah",
        hpClient: "085828362720",
        emailClient: "fulan@example.com",
        tanggalSesi: new Date("2026-03-26T12:00:00Z"),
        lokasiSesi: "Taman Bunga",
        status: "CONFIRMED",
        hargaPaket: 3000000,
        dpAmount: 700000,
        dpStatus: "PARTIAL",
      },
    }),
  ]);

  console.log(`✅ Bookings: ${bookings.length}`);

  const galleries = await Promise.all([
    prisma.gallery.create({
      data: {
        vendorId: vendor.id,
        bookingId: bookings[0].id,
        namaProject: "Lestari Wedding",
        clientToken: "abc123def456",
        cloudinaryFolderId: "lestari_wedding",
        status: "DELIVERED",
      },
    }),
    prisma.gallery.create({
      data: {
        vendorId: vendor.id,
        bookingId: bookings[1].id,
        namaProject: "Test Client Session",
        clientToken: "test-client-token",
        cloudinaryFolderId: "test_client",
        status: "DELIVERED",
      },
    }),
    prisma.gallery.create({
      data: {
        vendorId: vendor.id,
        bookingId: bookings[2].id,
        namaProject: "Fulan Prewed",
        clientToken: "fulan-token-001",
        cloudinaryFolderId: "fulan_prewed",
        status: "DELIVERED",
      },
    }),
  ]);

  console.log(`✅ Galleries: ${galleries.length}`);

  console.log("\n✅ Full seed data created successfully!");
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("❌ Seed error:", err.message);
  process.exit(1);
});
