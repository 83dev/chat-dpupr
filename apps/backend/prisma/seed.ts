import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create Bidang (sesuai SSO DPUPR)
  const bidangList = [
    { kode: 'SEK', nama: 'Sekretariat' },
    { kode: 'BM', nama: 'Bina Marga' },
    { kode: 'SDA', nama: 'Sumber Daya Air' },
    { kode: 'CK', nama: 'Cipta Karya' },
    { kode: 'TR', nama: 'Tata Ruang' },
    { kode: 'JP', nama: 'Jasa Konstruksi dan Peralatan' },
  ];

  for (const bidang of bidangList) {
    await prisma.bidang.upsert({
      where: { kode: bidang.kode },
      create: bidang,
      update: bidang,
    });
    console.log(`✅ Bidang: ${bidang.nama}`);
  }

  // Create Jabatan (sesuai SSO DPUPR)
  const jabatanList = [
    { id: 1, nama: 'Staff' },
    { id: 2, nama: 'Analis' },
    { id: 3, nama: 'Teknisi' },
    { id: 4, nama: 'Administrator' },
    { id: 5, nama: 'Kepala Sub Bagian' },
    { id: 6, nama: 'Kepala Seksi' },
    { id: 7, nama: 'Kepala Bidang' },
    { id: 8, nama: 'Kepala Bidang Bina Marga' },
    { id: 9, nama: 'Kepala Bidang Sumber Daya Air' },
    { id: 10, nama: 'Kepala Bidang Cipta Karya' },
    { id: 11, nama: 'Kepala Bidang Tata Ruang' },
    { id: 12, nama: 'Kepala Bidang Jasa Konstruksi' },
    { id: 13, nama: 'Sekretaris Dinas' },
    { id: 14, nama: 'Kepala Dinas' },
  ];

  for (const jabatan of jabatanList) {
    await prisma.jabatan.upsert({
      where: { id: jabatan.id },
      create: jabatan,
      update: jabatan,
    });
    console.log(`✅ Jabatan: ${jabatan.nama}`);
  }

  // Get all bidang for creating rooms
  const bidangData = await prisma.bidang.findMany();

  // Create Chat Rooms for each Bidang
  for (const bidang of bidangData) {
    const roomName = `Grup ${bidang.nama}`;
    
    const existingRoom = await prisma.chatRoom.findFirst({
      where: { type: 'BIDANG', bidangId: bidang.id }
    });

    if (!existingRoom) {
      await prisma.chatRoom.create({
        data: {
          nama: roomName,
          description: `Grup diskusi internal Bidang ${bidang.nama}`,
          type: 'BIDANG',
          bidangId: bidang.id,
        },
      });
      console.log(`✅ Room: ${roomName}`);
    }
  }

  console.log('\n✨ Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
