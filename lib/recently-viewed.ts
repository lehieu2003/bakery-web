export type RecentlyViewedItem = {
  id: string;
  slug: string | null;
  name: string;
  price: number;
  image: string | null;
};

const STORAGE_KEY = 'pl-recently-viewed';
const MAX_ITEMS = 8;

export function getRecentlyViewed(): RecentlyViewedItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as RecentlyViewedItem[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function recordRecentlyViewed(item: RecentlyViewedItem): void {
  if (typeof window === 'undefined') return;
  try {
    const next = [
      item,
      ...getRecentlyViewed().filter((existing) => existing.id !== item.id),
    ].slice(0, MAX_ITEMS);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // localStorage unavailable (private mode / quota) — recently viewed is
    // purely a nice-to-have, so silently skip.
  }
}
