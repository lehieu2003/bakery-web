import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create admin user
  const adminEmail = 'admin@bakeryshop.com';
  const adminPassword =
    'b109f3bbbc244eb82441917ed06d618b9008dd09b3befd1b5e07394c706a8bb980b1d7785e5976ec049b46df5f1326af5a2ea6d103fd07c95385ffab0cacbc86'; // password: admin123 (hashed with PBKDF2)
  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      password: adminPassword,
      emailVerifiedAt: new Date(),
      name: 'Admin',
      role: 'ADMIN',
      isActive: true,
    },
  });
  console.log('✅ Admin user created:', adminUser.email);

  // Create categories
  const categories = [
    {
      name: 'Bánh Mì',
      slug: 'banh-mi',
      description: 'Các loại bánh mì tươi ngon mỗi ngày',
      displayOrder: 1,
    },
    {
      name: 'Bánh Ngọt',
      slug: 'banh-ngot',
      description: 'Bánh ngọt, pastry và desserts',
      displayOrder: 2,
    },
    {
      name: 'Bánh Sinh Nhật',
      slug: 'banh-sinh-nhat',
      description: 'Bánh sinh nhật theo yêu cầu',
      displayOrder: 3,
    },
    {
      name: 'Đồ Uống',
      slug: 'do-uong',
      description: 'Cà phê, trà và nước ép',
      displayOrder: 4,
    },
  ];

  const createdCategories: Array<{ id: string; name: string }> = [];
  for (const cat of categories) {
    const category = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
    createdCategories.push(category);
    console.log('✅ Category created:', category.name);
  }

  // Create sample products
  const products = [
    {
      name: 'Bánh Mì Việt Nam',
      slug: 'banh-mi-viet-nam',
      description: 'Bánh mì giòn rụm, thơm ngon',
      price: 20000,
      stock: 50,
      categoryId: createdCategories[0].id,
      isActive: true,
      isFeatured: true,
    },
    {
      name: 'Bánh Mì Bơ Tỏi',
      slug: 'banh-mi-bo-toi',
      description: 'Bánh mì nướng bơ tỏi thơm lừng',
      price: 25000,
      stock: 30,
      categoryId: createdCategories[0].id,
      isActive: true,
    },
    {
      name: 'Croissant Bơ',
      slug: 'croissant-bo',
      description: 'Croissant Pháp xốp mềm, tan trong miệng',
      price: 35000,
      comparePrice: 40000,
      stock: 20,
      categoryId: createdCategories[1].id,
      isActive: true,
      isFeatured: true,
    },
    {
      name: 'Tiramisu',
      slug: 'tiramisu',
      description: 'Bánh Tiramisu Ý truyền thống',
      price: 45000,
      stock: 15,
      categoryId: createdCategories[1].id,
      isActive: true,
    },
    {
      name: 'Bánh Sinh Nhật Red Velvet',
      slug: 'banh-sinh-nhat-red-velvet',
      description: 'Bánh sinh nhật Red Velvet size 20cm (6-8 người)',
      price: 350000,
      stock: 5,
      categoryId: createdCategories[2].id,
      isActive: true,
      isFeatured: true,
    },
    {
      name: 'Cà Phê Sữa Đá',
      slug: 'ca-phe-sua-da',
      description: 'Cà phê phin truyền thống Việt Nam',
      price: 25000,
      stock: 100,
      categoryId: createdCategories[3].id,
      isActive: true,
    },
  ];

  for (const prod of products) {
    const product = await prisma.product.upsert({
      where: { slug: prod.slug },
      update: {},
      create: prod,
    });
    console.log('✅ Product created:', product.name);
  }

  // Create sample banners
  const banners = [
    {
      title: 'Giảm giá 20% tất cả bánh sinh nhật',
      description: 'Áp dụng đến hết tháng 3',
      imageUrl: '/images/banner-birthday.jpg',
      linkUrl: '/categories/banh-sinh-nhat',
      displayOrder: 1,
      isActive: true,
    },
    {
      title: 'Khuyến mãi bánh mì buổi sáng',
      description: 'Mua 2 tặng 1 từ 6h-9h sáng',
      imageUrl: '/images/banner-morning.jpg',
      linkUrl: '/categories/banh-mi',
      displayOrder: 2,
      isActive: true,
    },
  ];

  for (const banner of banners) {
    const created = await prisma.banner.create({ data: banner });
    console.log('✅ Banner created:', created.title);
  }

  console.log('🎉 Seed completed successfully!');
  console.log('\n📱 Admin credentials:');
  console.log('Email:', adminEmail);
  console.log('Password: admin123');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
