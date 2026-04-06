import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUserFromRequest } from '@/lib/session';

type ReorderUnavailableReason =
  | 'PRODUCT_UNAVAILABLE'
  | 'VARIANT_UNAVAILABLE'
  | 'INSUFFICIENT_STOCK';

type ReorderPayload = {
  orderId?: string;
};

type ReorderOrderItemReadModel = {
  productId: string;
  variantId: string | null;
  name: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    price: unknown;
    stock: number;
    isActive: boolean;
    images: Array<{ url: string }>;
    categories: Array<{
      category: { slug: string };
    }>;
  } | null;
  variant: {
    id: string;
    productId: string;
    name: string;
    price: unknown;
    stock: number;
  } | null;
};

type ReorderOrderReadModel = {
  id: string;
  orderNumber: string;
  status: string;
  orderItems: ReorderOrderItemReadModel[];
};

type ReorderRouteDeps = {
  getCurrentUser: (request: NextRequest) => Promise<{ id: string } | null>;
  findOrderByIdForUser: (
    orderId: string,
    userId: string,
  ) => Promise<ReorderOrderReadModel | null>;
};

type PreparedCartItem = {
  productId: string;
  variantId: string | null;
  name: string;
  variantName: string | null;
  price: number;
  quantity: number;
  image: string;
  type: 'cake' | 'ingredient';
};

type UnavailableItem = {
  productId: string;
  variantId: string | null;
  name: string;
  reason: ReorderUnavailableReason;
  requestedQuantity: number;
  availableQuantity: number;
  guidance: string;
};

type PreparedOrderItem = {
  productId: string;
  variantId: string | null;
  quantity: number;
  name: string;
  product: ReorderOrderItemReadModel['product'];
  variant: ReorderOrderItemReadModel['variant'];
};

const reorderDeps: ReorderRouteDeps = {
  getCurrentUser: getCurrentUserFromRequest,
  findOrderByIdForUser: (orderId, userId) =>
    prisma.order.findFirst({
      where: {
        id: orderId,
        userId,
      },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        orderItems: {
          select: {
            productId: true,
            variantId: true,
            name: true,
            quantity: true,
            product: {
              select: {
                id: true,
                name: true,
                price: true,
                stock: true,
                isActive: true,
                images: {
                  where: { isPrimary: true },
                  select: { url: true, isPrimary: true },
                  take: 1,
                },
                categories: {
                  select: {
                    category: {
                      select: { slug: true },
                    },
                  },
                },
              },
            },
            variant: {
              select: {
                id: true,
                productId: true,
                name: true,
                price: true,
                stock: true,
              },
            },
          },
        },
      },
    }) as Promise<ReorderOrderReadModel | null>,
};

function asNumber(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (
    value &&
    typeof value === 'object' &&
    'toNumber' in value &&
    typeof (value as { toNumber?: unknown }).toNumber === 'function'
  ) {
    const parsed = (value as { toNumber: () => number }).toNumber();
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function parseOrderId(body: unknown): string | null {
  if (!body || typeof body !== 'object') return null;
  const orderId = (body as ReorderPayload).orderId;
  if (typeof orderId !== 'string') return null;

  const normalized = orderId.trim();
  return normalized.length > 0 ? normalized : null;
}

function isJsonParseError(error: unknown): boolean {
  return error instanceof SyntaxError;
}

function inferCartType(categorySlugs: string[]): 'cake' | 'ingredient' {
  const ingredientPattern = /(ingredient|nguyen-lieu|raw|supply)/i;
  return categorySlugs.some((slug) => ingredientPattern.test(slug))
    ? 'ingredient'
    : 'cake';
}

function buildOutOfStockGuidance(args: {
  productName: string;
  requestedQuantity: number;
  availableQuantity: number;
  variantName?: string | null;
}): string {
  const targetLabel = args.variantName
    ? `${args.productName} (${args.variantName})`
    : args.productName;

  if (args.availableQuantity <= 0) {
    return `${targetLabel} is currently out of stock. Please choose another item.`;
  }

  return `${targetLabel} only has ${args.availableQuantity} item(s) available (requested ${args.requestedQuantity}). Adjust quantity in cart before checkout.`;
}

function groupOrderItems(items: ReorderOrderItemReadModel[]): PreparedOrderItem[] {
  const grouped = new Map<string, PreparedOrderItem>();

  for (const item of items) {
    const key = `${item.productId}|${item.variantId ?? ''}`;
    const existing = grouped.get(key);

    if (existing) {
      existing.quantity += Math.max(item.quantity, 1);
      continue;
    }

    grouped.set(key, {
      productId: item.productId,
      variantId: item.variantId,
      quantity: Math.max(item.quantity, 1),
      name: item.name,
      product: item.product,
      variant: item.variant,
    });
  }

  return Array.from(grouped.values());
}

function prepareReorderItems(items: ReorderOrderItemReadModel[]) {
  const preparedItems: PreparedCartItem[] = [];
  const unavailableItems: UnavailableItem[] = [];

  for (const item of groupOrderItems(items)) {
    const requestedQuantity = Math.max(item.quantity, 1);
    const product = item.product;

    if (!product || !product.isActive) {
      unavailableItems.push({
        productId: item.productId,
        variantId: item.variantId,
        name: item.name,
        reason: 'PRODUCT_UNAVAILABLE',
        requestedQuantity,
        availableQuantity: 0,
        guidance: `${item.name} is no longer available. Please choose a similar item from the catalog.`,
      });
      continue;
    }

    const categorySlugs = product.categories.map((entry) => entry.category.slug);
    const image = product.images[0]?.url ?? '/images/placeholder.jpg';
    let unitPrice = asNumber(product.price);
    let availableStock = Math.max(product.stock, 0);
    let variantName: string | null = null;

    if (item.variantId) {
      if (!item.variant || item.variant.productId !== product.id) {
        unavailableItems.push({
          productId: item.productId,
          variantId: item.variantId,
          name: item.name,
          reason: 'VARIANT_UNAVAILABLE',
          requestedQuantity,
          availableQuantity: 0,
          guidance: `The previously selected variant for ${product.name} is unavailable. Please choose another variant.`,
        });
        continue;
      }

      variantName = item.variant.name;
      unitPrice = asNumber(item.variant.price) || unitPrice;
      availableStock = Math.max(item.variant.stock, 0);
    }

    const availableQuantity = Math.min(requestedQuantity, availableStock);
    if (availableQuantity <= 0) {
      unavailableItems.push({
        productId: item.productId,
        variantId: item.variantId,
        name: product.name,
        reason: 'INSUFFICIENT_STOCK',
        requestedQuantity,
        availableQuantity: 0,
        guidance: buildOutOfStockGuidance({
          productName: product.name,
          requestedQuantity,
          availableQuantity: 0,
          variantName,
        }),
      });
      continue;
    }

    preparedItems.push({
      productId: item.productId,
      variantId: item.variantId,
      name: product.name,
      variantName,
      price: unitPrice,
      quantity: availableQuantity,
      image,
      type: inferCartType(categorySlugs),
    });

    if (availableQuantity < requestedQuantity) {
      unavailableItems.push({
        productId: item.productId,
        variantId: item.variantId,
        name: product.name,
        reason: 'INSUFFICIENT_STOCK',
        requestedQuantity,
        availableQuantity,
        guidance: buildOutOfStockGuidance({
          productName: product.name,
          requestedQuantity,
          availableQuantity,
          variantName,
        }),
      });
    }
  }

  return { preparedItems, unavailableItems };
}

export async function handlePrepareReorderRequest(
  body: unknown,
  request: NextRequest,
  deps: ReorderRouteDeps = reorderDeps,
) {
  const orderId = parseOrderId(body);
  if (!orderId) {
    return {
      status: 400,
      body: {
        success: false,
        error: 'orderId is required',
      },
    };
  }

  const user = await deps.getCurrentUser(request);
  if (!user) {
    return {
      status: 401,
      body: {
        success: false,
        error: 'Unauthorized',
      },
    };
  }

  const order = await deps.findOrderByIdForUser(orderId, user.id);
  if (!order) {
    return {
      status: 404,
      body: {
        success: false,
        error: 'Order not found',
      },
    };
  }

  if (order.status !== 'COMPLETED') {
    return {
      status: 400,
      body: {
        success: false,
        error: 'Reorder is available for completed orders only.',
      },
    };
  }

  const { preparedItems, unavailableItems } = prepareReorderItems(order.orderItems);

  return {
    status: 200,
    body: {
      success: true,
      data: {
        sourceOrderId: order.id,
        sourceOrderNumber: order.orderNumber,
        items: preparedItems,
        unavailableItems,
      },
    },
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await handlePrepareReorderRequest(body, request, reorderDeps);
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    if (isJsonParseError(error)) {
      return NextResponse.json(
        { success: false, error: 'Invalid request payload' },
        { status: 400 },
      );
    }

    console.error('Prepare reorder error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to prepare reorder' },
      { status: 500 },
    );
  }
}
