import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import QRCode from 'qrcode';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Delete all existing data in correct dependency order
  console.log('🧹 Clearing existing database data...');
  await prisma.payment.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.complaint.deleteMany();
  await prisma.tenant.deleteMany();
  await prisma.roomFacility.deleteMany();
  await prisma.room.deleteMany();
  await prisma.facility.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.user.deleteMany();

  // Create Admin user
  const adminPassword = await bcrypt.hash('admin123', 12);
  const admin = await prisma.user.create({
    data: {
      email: 'admin@kosciparay.com',
      password: adminPassword,
      name: 'Administrator',
      role: Role.ADMIN,
      phone: '08123456789',
      isActive: true,
    },
  });
  console.log('✅ Admin created:', admin.email);

  // Create Facilities
  const facilitiesData = [
    { name: 'WiFi', icon: '📶' },
    { name: 'AC', icon: '❄️' },
    { name: 'Kamar Mandi Dalam', icon: '🚿' },
    { name: 'Lemari', icon: '🗄️' },
    { name: 'Kasur', icon: '🛏️' },
  ];

  for (const f of facilitiesData) {
    await prisma.facility.create({ data: f });
  }
  console.log('✅ Facilities seeded');

  // Create 3 specific rooms
  const wifi = await prisma.facility.findFirst({ where: { name: 'WiFi' } });
  const ac = await prisma.facility.findFirst({ where: { name: 'AC' } });
  const km = await prisma.facility.findFirst({ where: { name: 'Kamar Mandi Dalam' } });

  const roomsData = [
    {
      roomNumber: 'A',
      name: 'Kamar A',
      floor: 1,
      size: 3.5,
      capacity: 1,
      monthlyPrice: 800000,
      yearlyPrice: 8500000,
      status: 'OCCUPIED' as const, // occupied by Budi
      description: 'Kamar A lantai 1 nyaman dengan fasilitas lengkap',
    },
    {
      roomNumber: 'B',
      name: 'Kamar B',
      floor: 1,
      size: 3.5,
      capacity: 1,
      monthlyPrice: 800000,
      yearlyPrice: 8500000,
      status: 'AVAILABLE' as const,
      description: 'Kamar B lantai 1 siap huni',
    },
    {
      roomNumber: 'C',
      name: 'Kamar C',
      floor: 1,
      size: 3.5,
      capacity: 1,
      monthlyPrice: 800000,
      yearlyPrice: 8500000,
      status: 'AVAILABLE' as const,
      description: 'Kamar C lantai 1 siap huni',
    },
  ];

  for (const roomData of roomsData) {
    const room = await prisma.room.create({ data: roomData });
    const facilities = [wifi, ac, km].filter(Boolean);
    for (const facility of facilities) {
      if (facility) {
        await prisma.roomFacility.create({
          data: { roomId: room.id, facilityId: facility.id },
        });
      }
    }
  }
  console.log('✅ Rooms (Kamar A, Kamar B, Kamar C) seeded');

  // Create Sample Tenant user
  const tenantPassword = await bcrypt.hash('tenant123', 12);
  const tenantUser = await prisma.user.create({
    data: {
      email: 'budi@example.com',
      password: tenantPassword,
      name: 'Budi Santoso',
      role: Role.TENANT,
      phone: '08129876543',
      isActive: true,
    },
  });

  const roomA = await prisma.room.findFirst({ where: { roomNumber: 'A' } });
  if (roomA) {
    const tenant = await prisma.tenant.create({
      data: {
        userId: tenantUser.id,
        roomId: roomA.id,
        fullName: 'Budi Santoso',
        nik: '3201234567890001',
        phone: '08129876543',
        email: 'budi@example.com',
        gender: 'MALE',
        address: 'Jl. Contoh No. 1, Ciparay, Bandung',
        checkInDate: new Date(),
        isActive: true,
        qrCode: '',
      },
    });

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5174';
    const qrData = `${clientUrl}/verify-tenant/${tenant.id}`;
    const qrCode = await QRCode.toDataURL(qrData);

    await prisma.tenant.update({
      where: { id: tenant.id },
      data: { qrCode },
    });

    console.log('✅ Tenant Budi created and assigned to Kamar A');
  }

  // Create sample announcements
  await prisma.announcement.create({
    data: {
      title: 'Selamat Datang di Kos Ciparay!',
      content: 'Kami mengucapkan selamat datang kepada seluruh penghuni Kos Ciparay. Nikmati fasilitas lengkap dan layanan terbaik kami.',
      category: 'GENERAL',
      isPinned: true,
    },
  });
  console.log('✅ Announcements seeded');

  console.log('\n🎉 Seeding complete!');
  console.log('📧 Admin login: admin@kosciparay.com / admin123');
  console.log('📧 Tenant login: budi@example.com / tenant123');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
