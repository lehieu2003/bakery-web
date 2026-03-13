import {
  PrismaClient,
  OrderStatus,
  PaymentMethod,
  MemberLevel,
  DiscountType,
} from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // ============================================
  // 1. ADMIN USER
  // ============================================
  const adminEmail = 'admin@bakeryshop.com';
  const adminPassword =
    'b109f3bbbc244eb82441917ed06d618b9008dd09b3befd1b5e07394c706a8bb980b1d7785e5976ec049b46df5f1326af5a2ea6d103fd07c95385ffab0cacbc86'; // password: admin123 (SHA-512)

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

  // ============================================
  // 2. CUSTOMERS (from mockCustomers)
  // ============================================
  const customersData = [
    {
      name: 'Linh Nguyen',
      email: 'linh@email.com',
      phone: '0901234567',
      level: 'GOLD' as MemberLevel,
      points: 420,
      createdAt: new Date('2025-06-01'),
    },
    {
      name: 'An Tran',
      email: 'an@email.com',
      phone: '0912345678',
      level: 'SILVER' as MemberLevel,
      points: 180,
      createdAt: new Date('2025-09-15'),
    },
    {
      name: 'Mai Pham',
      email: 'mai@email.com',
      phone: '0923456789',
      level: 'PLATINUM' as MemberLevel,
      points: 1250,
      createdAt: new Date('2025-01-10'),
    },
    {
      name: 'Duc Le',
      email: 'duc@email.com',
      phone: '0934567890',
      level: 'SILVER' as MemberLevel,
      points: 90,
      createdAt: new Date('2025-11-20'),
    },
    {
      name: 'Hoa Vo',
      email: 'hoa@email.com',
      phone: '0945678901',
      level: 'GOLD' as MemberLevel,
      points: 540,
      createdAt: new Date('2025-04-05'),
    },
    {
      name: 'Nam Bui',
      email: 'nam@email.com',
      phone: '0956789012',
      level: 'SILVER' as MemberLevel,
      points: 50,
      createdAt: new Date('2025-12-01'),
    },
  ];

  const customers: Record<string, { id: string; name: string }> = {};
  for (const cust of customersData) {
    const user = await prisma.user.upsert({
      where: { email: cust.email },
      update: {},
      create: {
        email: cust.email,
        password: adminPassword, // Same password for demo
        emailVerifiedAt: new Date(),
        name: cust.name,
        phone: cust.phone,
        role: 'CUSTOMER',
        memberLevel: cust.level,
        points: cust.points,
        isActive: true,
        createdAt: cust.createdAt,
      },
    });
    customers[cust.name] = { id: user.id, name: user.name || cust.name };
    console.log('✅ Customer created:', cust.name);
  }

  // ============================================
  // 3. CATEGORIES (with tree structure)
  // ============================================

  // Parent categories
  const parentCategoriesData = [
    {
      name: 'Cakes',
      slug: 'cakes',
      description: 'All types of cakes',
      displayOrder: 1,
      level: 1,
    },
    {
      name: 'Ingredients',
      slug: 'ingredients',
      description: 'Baking ingredients and supplies',
      displayOrder: 2,
      level: 1,
    },
  ];

  const categories: Record<string, string> = {}; // name -> id
  for (const cat of parentCategoriesData) {
    const category = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
    categories[cat.name] = category.id;
    console.log('✅ Parent category created:', cat.name);
  }

  // Child categories
  const childCategoriesData = [
    {
      name: 'Birthday Cakes',
      slug: 'birthday-cakes',
      description: 'Beautiful birthday cakes for all ages',
      displayOrder: 1,
      level: 2,
      parentId: categories['Cakes'],
    },
    {
      name: 'Wedding Cakes',
      slug: 'wedding-cakes',
      description: 'Elegant wedding cakes for your special day',
      displayOrder: 2,
      level: 2,
      parentId: categories['Cakes'],
    },
    {
      name: 'Seasonal',
      slug: 'seasonal',
      description: 'Limited edition seasonal cakes',
      displayOrder: 3,
      level: 2,
      parentId: categories['Cakes'],
    },
    {
      name: 'Flour & Baking',
      slug: 'flour-baking',
      description: 'Premium baking flour and essentials',
      displayOrder: 1,
      level: 2,
      parentId: categories['Ingredients'],
    },
    {
      name: 'Chocolate & Cocoa',
      slug: 'chocolate-cocoa',
      description: 'High-quality chocolate and cocoa products',
      displayOrder: 2,
      level: 2,
      parentId: categories['Ingredients'],
    },
    {
      name: 'Decorations',
      slug: 'decorations',
      description: 'Cake decorations and toppings',
      displayOrder: 3,
      level: 2,
      parentId: categories['Ingredients'],
    },
  ];

  for (const cat of childCategoriesData) {
    const category = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
    categories[cat.name] = category.id;
    console.log('✅ Child category created:', cat.name);
  }

  // ============================================
  // 4. PRODUCTS with images (ProductImage table)
  // ============================================
  const productsData = [
    {
      name: 'Rose Garden Birthday Cake',
      slug: 'rose-garden-birthday-cake',
      description:
        'A beautiful rose garden themed birthday cake with delicate buttercream roses.',
      price: 850000,
      categoryName: 'Birthday Cakes',
      images: [
        { url: '/images/cake-1.jpg', isPrimary: true },
        { url: '/images/cake-detail.jpg', isPrimary: false },
      ],
      stock: 10,
      isActive: true,
      isFeatured: true,
    },
    {
      name: 'Chocolate Lava Dream',
      slug: 'chocolate-lava-dream',
      description: 'Rich dark chocolate cake with molten lava center.',
      price: 720000,
      categoryName: 'Birthday Cakes',
      images: [{ url: '/images/cake-2.jpg', isPrimary: true }],
      stock: 15,
      isActive: true,
      isFeatured: true,
    },
    {
      name: 'Classic White Wedding',
      slug: 'classic-white-wedding',
      description: 'Elegant 3-tier white wedding cake with fondant finish.',
      price: 2400000,
      categoryName: 'Wedding Cakes',
      images: [{ url: '/images/cake-3.jpg', isPrimary: true }],
      stock: 5,
      isActive: true,
      isFeatured: true,
    },
    {
      name: 'Matcha Sakura Delight',
      slug: 'matcha-sakura-delight',
      description: 'Japanese-inspired matcha cake with sakura decoration.',
      price: 650000,
      categoryName: 'Seasonal',
      images: [{ url: '/images/cake-4.jpg', isPrimary: true }],
      stock: 0,
      isActive: false,
      isFeatured: false,
    },
    {
      name: 'Premium Almond Flour',
      slug: 'premium-almond-flour',
      description: 'Fine ground blanched almond flour, perfect for macarons.',
      price: 85000,
      categoryName: 'Flour & Baking',
      images: [{ url: '/images/ing-1.jpg', isPrimary: true }],
      variants: [
        { name: '250g', price: 85000, stock: 100 },
        { name: '500g', price: 155000, stock: 60 },
        { name: '1kg', price: 280000, stock: 30 },
      ],
      stock: 100,
      isActive: true,
      isFeatured: false,
    },
    {
      name: 'Belgian Dark Chocolate 70%',
      slug: 'belgian-dark-chocolate',
      description: 'Premium Belgian dark chocolate with 70% cocoa content.',
      price: 120000,
      categoryName: 'Chocolate & Cocoa',
      images: [{ url: '/images/ing-2.jpg', isPrimary: true }],
      variants: [
        { name: '200g', price: 120000, stock: 80 },
        { name: '500g', price: 270000, stock: 40 },
      ],
      stock: 80,
      isActive: true,
      isFeatured: true,
    },
    {
      name: 'Edible Gold Flakes',
      slug: 'edible-gold-flakes',
      description: '24K edible gold flakes for luxury cake decoration.',
      price: 250000,
      categoryName: 'Decorations',
      images: [{ url: '/images/ing-3.jpg', isPrimary: true }],
      stock: 30,
      isActive: true,
      isFeatured: false,
    },
  ];

  const products: Record<string, { id: string; name: string; price: number }> =
    {}; // slug -> product info
  for (const prod of productsData) {
    const product = await prisma.product.upsert({
      where: { slug: prod.slug },
      update: {},
      create: {
        name: prod.name,
        slug: prod.slug,
        description: prod.description,
        price: prod.price,
        categories: {
          create: [
            {
              category: {
                connect: { id: categories[prod.categoryName] },
              },
            },
          ],
        },
        stock: prod.stock,
        isActive: prod.isActive,
        isFeatured: prod.isFeatured,
        images: {
          create: prod.images,
        },
        ...(prod.variants
          ? {
              variants: {
                create: prod.variants,
              },
            }
          : {}),
      },
    });
    products[prod.slug] = {
      id: product.id,
      name: product.name,
      price: prod.price,
    };
    console.log('✅ Product created:', prod.name);
  }

  // ============================================
  // 5. BANNERS (from mockBanners)
  // ============================================
  const bannersData = [
    {
      title: 'Spring Collection 2026',
      description: 'Discover our new spring-inspired cake collection!',
      imageUrl: '/images/hero-cake.jpg',
      linkUrl: '/category/seasonal',
      placement: 'HOME_HERO',
      displayOrder: 1,
      isActive: true,
    },
    {
      title: 'Premium Ingredients Sale',
      description: 'Up to 30% off on premium baking ingredients.',
      imageUrl: '/images/ing-1.jpg',
      linkUrl: '/category/ingredients',
      placement: 'HOME_PROMO',
      displayOrder: 2,
      isActive: true,
    },
    {
      title: 'Wedding Season Special',
      description: 'Book your dream wedding cake today!',
      imageUrl: '/images/cake-3.jpg',
      linkUrl: '/category/wedding',
      placement: 'HOME_HERO',
      displayOrder: 3,
      isActive: false,
    },
  ];

  // Clear existing banners first (no upsert by unique field available)
  await prisma.banner.deleteMany({});
  for (const banner of bannersData) {
    await prisma.banner.create({ data: banner });
    console.log('✅ Banner created:', banner.title);
  }

  // ============================================
  // 6. ORDERS (from mockOrders)
  // ============================================
  const ordersData = [
    {
      orderNumber: 'BK20241',
      customerName: 'Linh Nguyen',
      customerPhone: '0901234567',
      customerEmail: 'linh@email.com',
      subtotal: 900000,
      discount: 20000,
      total: 880000,
      status: 'PENDING' as OrderStatus,
      paymentMethod: 'BANK_TRANSFER' as PaymentMethod,
      paymentStatus: 'PENDING',
      createdAt: new Date('2026-03-02T08:30:00'),
      items: [{ slug: 'rose-garden-birthday-cake', quantity: 1 }],
    },
    {
      orderNumber: 'BK20242',
      customerName: 'An Tran',
      customerPhone: '0912345678',
      customerEmail: 'an@email.com',
      customerAddress: '123 Nguyen Hue, Dist 1, HCMC',
      subtotal: 2400000,
      discount: 0,
      total: 2400000,
      status: 'CONFIRMED' as OrderStatus,
      paymentMethod: 'COD' as PaymentMethod,
      paymentStatus: 'PENDING',
      createdAt: new Date('2026-03-02T09:15:00'),
      items: [{ slug: 'classic-white-wedding', quantity: 1 }],
    },
    {
      orderNumber: 'BK20243',
      customerName: 'Mai Pham',
      customerPhone: '0923456789',
      customerEmail: 'mai@email.com',
      subtotal: 490000,
      discount: 0,
      total: 490000,
      status: 'PROCESSING' as OrderStatus,
      paymentMethod: 'COD' as PaymentMethod,
      paymentStatus: 'PAID',
      createdAt: new Date('2026-03-01T20:00:00'),
      items: [
        { slug: 'belgian-dark-chocolate', quantity: 2 },
        { slug: 'edible-gold-flakes', quantity: 1 },
      ],
    },
    {
      orderNumber: 'BK20244',
      customerName: 'Duc Le',
      customerPhone: '0934567890',
      customerEmail: 'duc@email.com',
      subtotal: 720000,
      discount: 0,
      total: 720000,
      status: 'READY' as OrderStatus,
      paymentMethod: 'BANK_TRANSFER' as PaymentMethod,
      paymentStatus: 'PAID',
      createdAt: new Date('2026-03-01T18:00:00'),
      items: [{ slug: 'chocolate-lava-dream', quantity: 1 }],
    },
    {
      orderNumber: 'BK20245',
      customerName: 'Hoa Vo',
      customerPhone: '0945678901',
      customerEmail: 'hoa@email.com',
      subtotal: 850000,
      discount: 0,
      total: 850000,
      status: 'COMPLETED' as OrderStatus,
      paymentMethod: 'COD' as PaymentMethod,
      paymentStatus: 'PAID',
      createdAt: new Date('2026-03-01T10:00:00'),
      items: [{ slug: 'rose-garden-birthday-cake', quantity: 1 }],
    },
    {
      orderNumber: 'BK20246',
      customerName: 'Nam Bui',
      customerPhone: '0956789012',
      customerEmail: 'nam@email.com',
      customerAddress: '45 Le Loi, Dist 3, HCMC',
      subtotal: 650000,
      discount: 0,
      total: 650000,
      status: 'CANCELLED' as OrderStatus,
      paymentMethod: 'COD' as PaymentMethod,
      paymentStatus: 'PENDING',
      createdAt: new Date('2026-02-28T16:00:00'),
      items: [{ slug: 'matcha-sakura-delight', quantity: 1 }],
    },
  ];

  // Clear existing orders first
  await prisma.review.deleteMany({});
  await prisma.wishlist.deleteMany({});
  await prisma.cartItem.deleteMany({});
  await prisma.cart.deleteMany({});
  await prisma.address.deleteMany({});
  await prisma.coupon.deleteMany({});
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});

  for (const orderData of ordersData) {
    const { items, ...orderFields } = orderData;

    // Find customer
    const customer = customers[orderData.customerName];

    const order = await prisma.order.create({
      data: {
        ...orderFields,
        userId: customer?.id,
        deliveryFee: 0,
      },
    });

    // Create order items
    for (const item of items) {
      const product = products[item.slug];
      if (product) {
        await prisma.orderItem.create({
          data: {
            orderId: order.id,
            productId: product.id,
            name: product.name,
            price: product.price,
            quantity: item.quantity,
            subtotal: product.price * item.quantity,
          },
        });
      }
    }
    console.log('✅ Order created:', order.orderNumber);
  }

  // ============================================
  // 7. SETTINGS
  // ============================================
  const settingsData = [
    { key: 'store_name', value: 'La Douceur Bakery' },
    { key: 'store_phone', value: '0901234567' },
    { key: 'store_email', value: 'contact@ladouceur.vn' },
    {
      key: 'store_address',
      value: '123 Nguyen Hue, District 1, Ho Chi Minh City',
    },
    { key: 'delivery_fee', value: '30000' },
    { key: 'min_order_free_delivery', value: '500000' },
    { key: 'points_per_order', value: '10' }, // Points per 100k spent
    { key: 'silver_threshold', value: '0' },
    { key: 'gold_threshold', value: '5000000' },
    { key: 'platinum_threshold', value: '15000000' },
  ];

  for (const setting of settingsData) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: setting,
    });
    console.log('✅ Setting created:', setting.key);
  }

  // ============================================
  // 8. ADDRESSES (sample addresses for customers)
  // ============================================
  const addressesData = [
    {
      userId: customers['Linh Nguyen'].id,
      fullName: 'Linh Nguyen',
      phone: '0901234567',
      province: 'Hồ Chí Minh',
      district: 'Quận 1',
      ward: 'Phường Bến Nghé',
      street: '123 Nguyễn Huệ',
      isDefault: true,
    },
    {
      userId: customers['Mai Pham'].id,
      fullName: 'Mai Pham',
      phone: '0923456789',
      province: 'Hồ Chí Minh',
      district: 'Quận 3',
      ward: 'Phường 6',
      street: '45 Lê Lợi',
      isDefault: true,
    },
    {
      userId: customers['An Tran'].id,
      fullName: 'An Tran',
      phone: '0912345678',
      province: 'Hồ Chí Minh',
      district: 'Quận 7',
      ward: 'Phường Tân Phú',
      street: '78 Nguyễn Thị Thập',
      isDefault: true,
    },
  ];

  for (const addr of addressesData) {
    await prisma.address.create({ data: addr });
    console.log('✅ Address created for:', addr.fullName);
  }

  // ============================================
  // 9. REVIEWS (sample product reviews)
  // ============================================
  const reviewsData = [
    {
      userId: customers['Linh Nguyen'].id,
      productId: products['rose-garden-birthday-cake'].id,
      rating: 5,
      comment: 'Bánh đẹp quá, gia đình rất thích!',
    },
    {
      userId: customers['Mai Pham'].id,
      productId: products['rose-garden-birthday-cake'].id,
      rating: 4,
      comment: 'Bánh ngon, trang trí đẹp. Giao hàng hơi chậm.',
    },
    {
      userId: customers['An Tran'].id,
      productId: products['classic-white-wedding'].id,
      rating: 5,
      comment: 'Tuyệt vời cho đám cưới!',
    },
    {
      userId: customers['Hoa Vo'].id,
      productId: products['belgian-dark-chocolate'].id,
      rating: 5,
      comment: 'Chocolate chất lượng cao, rất hài lòng.',
    },
  ];

  for (const review of reviewsData) {
    await prisma.review.create({ data: review });
    console.log('✅ Review created for product:', review.productId);
  }

  // ============================================
  // 10. COUPONS (sample coupon codes)
  // ============================================
  const couponsData = [
    {
      code: 'WELCOME10',
      type: 'PERCENTAGE' as DiscountType,
      value: 10,
      minOrder: 200000,
      startAt: new Date('2026-01-01'),
      endAt: new Date('2026-12-31'),
      usageLimit: 100,
    },
    {
      code: 'SAVE50K',
      type: 'FIXED' as DiscountType,
      value: 50000,
      minOrder: 500000,
      startAt: new Date('2026-03-01'),
      endAt: new Date('2026-06-30'),
      usageLimit: 50,
    },
  ];

  for (const coupon of couponsData) {
    await prisma.coupon.create({ data: coupon });
    console.log('✅ Coupon created:', coupon.code);
  }

  console.log('\n🎉 Seed completed successfully!');
  console.log('\n📱 Admin credentials:');
  console.log('Email:', adminEmail);
  console.log('Password: admin123');
  console.log('\n👥 Customer credentials (all use password: admin123):');
  customersData.forEach((c) => console.log(`  - ${c.email}`));
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
