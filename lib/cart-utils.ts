export const CART_STORAGE_VERSION = 1;
export const CART_STORAGE_PREFIX = 'bakery-cart-v1';
export const GUEST_CART_STORAGE_KEY = `${CART_STORAGE_PREFIX}:guest`;
export const MIN_CART_ITEM_QUANTITY = 1;
export const MAX_CART_ITEM_QUANTITY = 100;

export interface CartIdentityFields {
  productId: string;
  variantId?: string;
  size?: string;
  flavor?: string;
  message?: string;
  pickupDate?: string;
}

export interface PersistedCartItem extends CartIdentityFields {
  id: string;
  name: string;
  price: number;
  image: string;
  type: 'cake' | 'ingredient';
  variantName?: string;
  quantity: number;
}

export interface PersistedCheckoutInfo {
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  customerAddress?: string;
}

export interface PersistedCartState {
  version: number;
  cart: PersistedCartItem[];
  checkoutInfo: PersistedCheckoutInfo | null;
}

function normalizeText(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.trim();
}

function normalizeLooseText(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  return '';
}

function normalizeLowerText(value: unknown): string {
  return normalizeLooseText(value).toLowerCase();
}

export function getUserCartStorageKey(userId: string): string {
  return `${CART_STORAGE_PREFIX}:user:${userId}`;
}

export function clampCartQuantity(quantity: number): number {
  if (!Number.isFinite(quantity)) return MIN_CART_ITEM_QUANTITY;
  const rounded = Math.round(quantity);
  if (rounded < MIN_CART_ITEM_QUANTITY) return MIN_CART_ITEM_QUANTITY;
  if (rounded > MAX_CART_ITEM_QUANTITY) return MAX_CART_ITEM_QUANTITY;
  return rounded;
}

export function clampCartQuantityWithDelta(
  currentQuantity: number,
  delta: number,
): number {
  return clampCartQuantity(clampCartQuantity(currentQuantity) + delta);
}

export function buildCartItemIdentityKey(fields: CartIdentityFields): string {
  const parts = [
    normalizeText(fields.productId),
    normalizeText(fields.variantId),
    normalizeLowerText(fields.size),
    normalizeLowerText(fields.flavor),
    normalizeText(fields.message),
    normalizeText(fields.pickupDate),
  ];
  return parts.join('|');
}

export function normalizeCheckoutInfo(
  input: unknown,
): PersistedCheckoutInfo | null {
  if (!input || typeof input !== 'object') return null;
  const value = input as Partial<PersistedCheckoutInfo>;
  const customerName = normalizeText(value.customerName);
  const customerPhone = normalizeText(value.customerPhone);
  if (!customerName || !customerPhone) return null;

  const customerEmail = normalizeText(value.customerEmail);
  const customerAddress = normalizeText(value.customerAddress);

  return {
    customerName,
    customerPhone,
    customerEmail: customerEmail || undefined,
    customerAddress: customerAddress || undefined,
  };
}

export function normalizeCartItem(input: unknown): PersistedCartItem | null {
  if (!input || typeof input !== 'object') return null;
  const value = input as Partial<PersistedCartItem>;
  const productId = normalizeLooseText(value.productId);
  const name = normalizeLooseText(value.name);
  const image = normalizeLooseText(value.image) || '/images/placeholder.jpg';
  const price =
    typeof value.price === 'number' && Number.isFinite(value.price)
      ? value.price
      : typeof value.price === 'string' && value.price.trim() !== ''
        ? Number(value.price)
        : NaN;
  const type = value.type === 'cake' || value.type === 'ingredient'
    ? value.type
    : null;

  if (!productId || !name || !Number.isFinite(price) || !type) {
    return null;
  }

  const normalized: PersistedCartItem = {
    id: '',
    productId,
    name,
    price,
    image,
    type,
    variantId: normalizeLooseText(value.variantId) || undefined,
    variantName: normalizeLooseText(value.variantName) || undefined,
    size: normalizeLooseText(value.size) || undefined,
    flavor: normalizeLooseText(value.flavor) || undefined,
    message: normalizeLooseText(value.message) || undefined,
    pickupDate: normalizeLooseText(value.pickupDate) || undefined,
    quantity: clampCartQuantity(
      typeof value.quantity === 'number' ? value.quantity : 1,
    ),
  };

  normalized.id = buildCartItemIdentityKey(normalized);
  return normalized;
}

export function mergeCartItems(
  baseItems: readonly PersistedCartItem[],
  incomingItems: readonly PersistedCartItem[],
): PersistedCartItem[] {
  const merged = new Map<string, PersistedCartItem>();

  for (const base of baseItems) {
    const normalized = normalizeCartItem(base);
    if (!normalized) continue;
    merged.set(normalized.id, normalized);
  }

  for (const incoming of incomingItems) {
    const normalized = normalizeCartItem(incoming);
    if (!normalized) continue;
    const existing = merged.get(normalized.id);
    if (!existing) {
      merged.set(normalized.id, normalized);
      continue;
    }

    merged.set(normalized.id, {
      ...normalized,
      quantity: clampCartQuantity(existing.quantity + normalized.quantity),
    });
  }

  return Array.from(merged.values());
}

export function readPersistedCartState(
  storage: Pick<Storage, 'getItem'>,
  key: string,
): PersistedCartState {
  const fallback: PersistedCartState = {
    version: CART_STORAGE_VERSION,
    cart: [],
    checkoutInfo: null,
  };

  const raw = storage.getItem(key);
  if (!raw) return fallback;

  try {
    const parsed = JSON.parse(raw) as Partial<PersistedCartState>;
    const cartSource = Array.isArray(parsed.cart) ? parsed.cart : [];
    return {
      version: CART_STORAGE_VERSION,
      cart: cartSource
        .map((item) => normalizeCartItem(item))
        .filter((item): item is PersistedCartItem => item !== null),
      checkoutInfo: normalizeCheckoutInfo(parsed.checkoutInfo),
    };
  } catch {
    return fallback;
  }
}

export function writePersistedCartState(
  storage: Pick<Storage, 'setItem'>,
  key: string,
  state: { cart: readonly PersistedCartItem[]; checkoutInfo: unknown },
): void {
  const payload: PersistedCartState = {
    version: CART_STORAGE_VERSION,
    cart: state.cart
      .map((item) => normalizeCartItem(item))
      .filter((item): item is PersistedCartItem => item !== null),
    checkoutInfo: normalizeCheckoutInfo(state.checkoutInfo),
  };
  storage.setItem(key, JSON.stringify(payload));
}

export function removePersistedCartState(
  storage: Pick<Storage, 'removeItem'>,
  key: string,
): void {
  storage.removeItem(key);
}
