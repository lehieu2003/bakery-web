import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function slugify(input) {
  return String(input || '')
    .toLowerCase()
    .replace(/đ/g, 'd')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function makeUniqueSlug(baseSlug, used) {
  let candidate = baseSlug || 'category';
  let i = 2;
  while (used.has(candidate)) {
    candidate = `${baseSlug || 'category'}-${i}`;
    i += 1;
  }
  used.add(candidate);
  return candidate;
}

async function run() {
  const categories = await prisma.category.findMany({
    select: { id: true, name: true, slug: true },
    orderBy: [{ level: 'asc' }, { displayOrder: 'asc' }, { createdAt: 'asc' }],
  });

  const used = new Set();
  const updates = [];

  for (const c of categories) {
    const normalizedBase = slugify(c.slug || c.name);
    const uniqueSlug = makeUniqueSlug(normalizedBase, used);

    if (c.slug !== uniqueSlug) {
      updates.push({
        id: c.id,
        from: c.slug,
        to: uniqueSlug,
        name: c.name,
      });
    }
  }

  if (updates.length === 0) {
    console.log('No category slug updates needed.');
    return;
  }

  for (const item of updates) {
    await prisma.category.update({
      where: { id: item.id },
      data: { slug: item.to },
    });
  }

  console.log(`Updated ${updates.length} category slug(s):`);
  for (const item of updates) {
    console.log(`- ${item.name}: ${item.from} -> ${item.to}`);
  }
}

run()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

