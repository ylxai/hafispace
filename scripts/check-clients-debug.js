const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    // Find vendor
    const vendor = await prisma.user.findUnique({
      where: { email: 'hafi@hafiportrait.photography' },
      select: { id: true, namaStudio: true }
    });
    
    if (!vendor) {
      console.log('❌ Vendor not found');
      process.exit(1);
    }

    console.log(`\n📌 Vendor: ${vendor.namaStudio} (${vendor.id})\n`);

    // Get all clients for this vendor
    const allClients = await prisma.client.findMany({
      where: { vendorId: vendor.id },
      select: { 
        id: true, 
        name: true, 
        phone: true, 
        email: true,
        createdAt: true,
        _count: { select: { bookings: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`✅ Total Clients in DB: ${allClients.length}`);
    allClients.forEach((c, i) => {
      console.log(`  [${i+1}] "${c.name}" | ${c.phone} | ${c.email || '-'} | Bookings: ${c._count.bookings}`);
    });

    // Get all bookings
    const allBookings = await prisma.booking.findMany({
      where: { vendorId: vendor.id },
      select: { 
        id: true,
        kodeBooking: true,
        namaClient: true, 
        hpClient: true,
        clientId: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`\n✅ Total Bookings in DB: ${allBookings.length}`);
    allBookings.forEach((b, i) => {
      console.log(`  [${i+1}] ${b.kodeBooking} | "${b.namaClient}" | ${b.hpClient} | ClientID: ${b.clientId || 'NULL'} | Created: ${new Date(b.createdAt).toLocaleDateString('id-ID')}`);
    });

    // Check for mismatches
    console.log(`\n🔍 Analysis:`);
    const clientsWithBookings = new Set(allBookings.map(b => b.clientId).filter(Boolean));
    console.log(`  - Clients with bookings: ${clientsWithBookings.size}`);
    console.log(`  - Total clients in DB: ${allClients.length}`);
    
    if (clientsWithBookings.size !== allClients.length) {
      console.log(`  ⚠️  MISMATCH! Some clients may be orphaned or not linked`);
    }

    await prisma.$disconnect();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
