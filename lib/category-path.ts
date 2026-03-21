import type { Category } from '@/types/api.types';

function normalizeSlugSegment(segment: string) {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

function findTrailBySlugDfs(
  nodes: Category[],
  slug: string,
  trail: Category[] = [],
): Category[] | undefined {
  for (const node of nodes) {
    const nextTrail = [...trail, node];
    if (node.slug === slug) return nextTrail;
    if (node.children?.length) {
      const found = findTrailBySlugDfs(node.children, slug, nextTrail);
      if (found) return found;
    }
  }
  return undefined;
}

export function findCategoryTrailBySlugPath(
  categories: Category[],
  slugPath: string[],
): Category[] | undefined {
  if (!slugPath.length) return undefined;
  const normalizedPath = slugPath.map(normalizeSlugSegment);

  // Backward-compatible fallback for old single-segment URLs.
  if (normalizedPath.length === 1) {
    return findTrailBySlugDfs(categories, normalizedPath[0]);
  }

  const trail: Category[] = [];
  let currentLevel = categories;

  for (const slug of normalizedPath) {
    const current = currentLevel.find((node) => node.slug === slug);
    if (!current) return undefined;
    trail.push(current);
    currentLevel = current.children || [];
  }

  return trail;
}

export function findCategoryTrailById(
  categories: Category[],
  id: string,
  trail: Category[] = [],
): Category[] | undefined {
  for (const node of categories) {
    const nextTrail = [...trail, node];
    if (node.id === id) return nextTrail;
    if (node.children?.length) {
      const found = findCategoryTrailById(node.children, id, nextTrail);
      if (found) return found;
    }
  }
  return undefined;
}

export function categoryHrefFromTrail(trail: Category[]) {
  const slugs = trail
    .map((item) => item.slug)
    .filter(Boolean)
    .map((slug) => encodeURIComponent(slug));
  return slugs.length ? `/categories/${slugs.join('/')}` : '/categories';
}
