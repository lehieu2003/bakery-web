import test from 'node:test';
import assert from 'node:assert/strict';
import {
  categoryHrefFromTrail,
  findCategoryTrailBySlugPath,
} from '@/lib/category-path';
import type { Category } from '@/types/api.types';

const categories: Category[] = [
  {
    id: 'c1',
    name: 'Banh Ngot',
    slug: 'banh-ngot',
    description: null,
    imageUrl: null,
    parentId: null,
    level: 1,
    displayOrder: 1,
    isActive: true,
    showInMenu: true,
    createdAt: '',
    updatedAt: '',
    children: [
      {
        id: 'c2',
        name: 'Banh Kem',
        slug: 'banh-kem',
        description: null,
        imageUrl: null,
        parentId: 'c1',
        level: 2,
        displayOrder: 1,
        isActive: true,
        showInMenu: true,
        createdAt: '',
        updatedAt: '',
        children: [],
      },
    ],
  },
];

test('findCategoryTrailBySlugPath resolves nested slug path', () => {
  const trail = findCategoryTrailBySlugPath(categories, ['banh-ngot', 'banh-kem']);
  assert.ok(trail);
  assert.deepEqual(
    trail?.map((item) => item.slug),
    ['banh-ngot', 'banh-kem'],
  );
});

test('findCategoryTrailBySlugPath returns undefined for invalid slug path', () => {
  const trail = findCategoryTrailBySlugPath(categories, ['banh-ngot', 'khong-ton-tai']);
  assert.equal(trail, undefined);
});

test('categoryHrefFromTrail builds canonical nested category url', () => {
  const trail = findCategoryTrailBySlugPath(categories, ['banh-ngot', 'banh-kem'])!;
  assert.equal(categoryHrefFromTrail(trail), '/categories/banh-ngot/banh-kem');
});
