import { NextRequest, NextResponse } from 'next/server';
import type { UserRole } from '@prisma/client';

import { prisma } from '@/lib/prisma';
import { mapAuthErrorToStatus } from '@/lib/rbac';
import { requireAdmin } from '@/lib/session';
import { writeSettingAuditLogWithClient } from '@/lib/setting-audit';

const LEGACY_SETTINGS_KEY_MAP = {
  min_order_delivery: 'min_order_amount',
  min_order_free_delivery: 'free_delivery_threshold',
} as const;

const SETTINGS_KEYS = {
  STORE_NAME: 'store_name',
  STORE_EMAIL: 'store_email',
  STORE_PHONE: 'store_phone',
  STORE_ADDRESS: 'store_address',
  OPENING_HOURS: 'opening_hours',
  PICKUP_SLOTS: 'pickup_slots',
  ALLOW_DELIVERY: 'allow_delivery',
  MIN_ORDER_AMOUNT: 'min_order_amount',
  DELIVERY_FEE: 'delivery_fee',
  FREE_DELIVERY_THRESHOLD: 'free_delivery_threshold',
} as const;

const SETTINGS_DEFAULTS = {
  [SETTINGS_KEYS.STORE_NAME]: 'Bakery Shop',
  [SETTINGS_KEYS.STORE_EMAIL]: 'hello@bakeryshop.com',
  [SETTINGS_KEYS.STORE_PHONE]: '028 3820 1234',
  [SETTINGS_KEYS.STORE_ADDRESS]: '12 Nguyen Thi Minh Khai, Dist 1, HCMC',
  [SETTINGS_KEYS.OPENING_HOURS]: 'Mon - Sat: 8:00 AM - 7:00 PM\nSun: 9:00 AM - 5:00 PM',
  [SETTINGS_KEYS.PICKUP_SLOTS]: JSON.stringify([
    '09:00',
    '10:00',
    '11:00',
    '13:00',
    '14:00',
    '15:00',
    '16:00',
  ]),
  [SETTINGS_KEYS.ALLOW_DELIVERY]: 'true',
  [SETTINGS_KEYS.MIN_ORDER_AMOUNT]: '0',
  [SETTINGS_KEYS.DELIVERY_FEE]: '30000',
  [SETTINGS_KEYS.FREE_DELIVERY_THRESHOLD]: '500000',
} as const;

const CANONICAL_SETTING_KEYS: string[] = Object.values(SETTINGS_KEYS);
const PICKUP_SLOT_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

type AdminUser = {
  id: string;
  role: UserRole;
};

type SettingsHandlerResult = {
  status: number;
  body: {
    success: boolean;
    data?: unknown;
    error?: string;
    message?: string;
  };
};

type SettingsRow = {
  key: string;
  value: string;
};

type SettingsDeps = {
  requireAdmin: () => Promise<AdminUser>;
  findSettings: (keys?: string[]) => Promise<SettingsRow[]>;
  updateSettingsAndWriteAudit: (args: {
    actor: AdminUser;
    updates: Array<{ key: string; value: string }>;
    beforeValuesByKey: Record<string, string | undefined>;
  }) => Promise<void>;
};

type NormalizedStoreSettings = {
  store_name: string;
  store_email: string;
  store_phone: string;
  store_address: string;
  opening_hours: string;
  pickup_slots: string[];
  allow_delivery: boolean;
  min_order_amount: number;
  delivery_fee: number;
  free_delivery_threshold: number;
};

type StoreSettingsUpdatePayload = Partial<NormalizedStoreSettings>;

const defaultDeps: SettingsDeps = {
  requireAdmin,
  findSettings: (keys) =>
    prisma.setting.findMany({
      where: keys?.length
        ? {
            key: { in: keys },
          }
        : undefined,
      select: {
        key: true,
        value: true,
      },
    }),
  updateSettingsAndWriteAudit: async ({ actor, updates, beforeValuesByKey }) => {
    await prisma.$transaction(async (tx) => {
      for (const update of updates) {
        await tx.setting.upsert({
          where: { key: update.key },
          update: { value: update.value },
          create: {
            key: update.key,
            value: update.value,
          },
        });

        await writeSettingAuditLogWithClient(tx, {
          settingKey: update.key,
          mutationType: 'UPSERT',
          actorUserId: actor.id,
          actorRole: actor.role,
          beforeValue: beforeValuesByKey[update.key] ?? null,
          afterValue: update.value,
          metadata: {
            domain: 'store-settings',
          },
        });
      }
    });
  },
};


function normalizeInt(value: string, fallback: number, min = 0) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  if (parsed < min) return min;
  return parsed;
}

function parsePickupSlots(raw: string) {
  const text = raw.trim();
  if (!text) return [];

  try {
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) return [];
    const slots = parsed
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter((item) => item.length > 0)
      .filter((item) => PICKUP_SLOT_PATTERN.test(item));
    return Array.from(new Set(slots));
  } catch {
    const slots = text
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0)
      .filter((item) => PICKUP_SLOT_PATTERN.test(item));
    return Array.from(new Set(slots));
  }
}

function parseBooleanLike(value: unknown) {
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string') return null;

  const normalized = value.trim().toLowerCase();
  if (normalized === 'true' || normalized === '1' || normalized === 'yes') {
    return true;
  }
  if (normalized === 'false' || normalized === '0' || normalized === 'no') {
    return false;
  }

  return null;
}

function parseNonNegativeIntegerLike(value: unknown) {
  if (typeof value === 'number' && Number.isInteger(value) && value >= 0) {
    return value;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!/^\d+$/.test(trimmed)) return null;
    const parsed = Number.parseInt(trimmed, 10);
    if (Number.isInteger(parsed) && parsed >= 0) {
      return parsed;
    }
  }

  return null;
}

function parsePickupSlotsPayload(
  value: unknown,
): { slots: string[] } | { error: string } {
  if (Array.isArray(value)) {
    const normalizedSlots = value
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter((item) => item.length > 0);
    if (normalizedSlots.some((item) => !PICKUP_SLOT_PATTERN.test(item))) {
      return { error: 'pickup_slots must use valid 24h HH:mm format' };
    }
    return { slots: Array.from(new Set(normalizedSlots)) };
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return { slots: [] };

    let normalizedSlots: string[];
    try {
      const parsed = JSON.parse(trimmed);
      if (!Array.isArray(parsed)) {
        return { error: 'pickup_slots must be an array of HH:mm values' };
      }
      normalizedSlots = parsed
        .map((item) => (typeof item === 'string' ? item.trim() : ''))
        .filter((item) => item.length > 0);
    } catch {
      normalizedSlots = trimmed
        .split(',')
        .map((item) => item.trim())
        .filter((item) => item.length > 0);
    }

    if (normalizedSlots.some((item) => !PICKUP_SLOT_PATTERN.test(item))) {
      return { error: 'pickup_slots must use valid 24h HH:mm format' };
    }
    return { slots: Array.from(new Set(normalizedSlots)) };
  }

  return { error: 'pickup_slots must be an array of HH:mm values' };
}

function normalizeSettingsValueMap(rows: SettingsRow[]) {
  const map: Record<string, string> = { ...SETTINGS_DEFAULTS };

  // Legacy aliases are applied first, then canonical keys overwrite deterministically.
  for (const row of rows) {
    if (!Object.prototype.hasOwnProperty.call(LEGACY_SETTINGS_KEY_MAP, row.key)) {
      continue;
    }

    const canonicalKey =
      LEGACY_SETTINGS_KEY_MAP[row.key as keyof typeof LEGACY_SETTINGS_KEY_MAP] ?? row.key;

    if (!CANONICAL_SETTING_KEYS.includes(canonicalKey)) {
      continue;
    }

    map[canonicalKey] = row.value;
  }

  for (const row of rows) {
    if (Object.prototype.hasOwnProperty.call(LEGACY_SETTINGS_KEY_MAP, row.key)) {
      continue;
    }

    if (!CANONICAL_SETTING_KEYS.includes(row.key)) {
      continue;
    }

    map[row.key] = row.value;
  }

  return map;
}

function toStoreSettingsData(rows: SettingsRow[]): NormalizedStoreSettings {
  const valueMap = normalizeSettingsValueMap(rows);

  return {
    store_name: valueMap[SETTINGS_KEYS.STORE_NAME] ?? SETTINGS_DEFAULTS.store_name,
    store_email: valueMap[SETTINGS_KEYS.STORE_EMAIL] ?? SETTINGS_DEFAULTS.store_email,
    store_phone: valueMap[SETTINGS_KEYS.STORE_PHONE] ?? SETTINGS_DEFAULTS.store_phone,
    store_address: valueMap[SETTINGS_KEYS.STORE_ADDRESS] ?? SETTINGS_DEFAULTS.store_address,
    opening_hours:
      valueMap[SETTINGS_KEYS.OPENING_HOURS] ?? SETTINGS_DEFAULTS.opening_hours,
    pickup_slots: parsePickupSlots(
      valueMap[SETTINGS_KEYS.PICKUP_SLOTS] ?? SETTINGS_DEFAULTS.pickup_slots,
    ),
    allow_delivery:
      (valueMap[SETTINGS_KEYS.ALLOW_DELIVERY] ?? SETTINGS_DEFAULTS.allow_delivery) ===
      'true',
    min_order_amount: normalizeInt(
      valueMap[SETTINGS_KEYS.MIN_ORDER_AMOUNT] ?? SETTINGS_DEFAULTS.min_order_amount,
      normalizeInt(SETTINGS_DEFAULTS.min_order_amount, 0),
      0,
    ),
    delivery_fee: normalizeInt(
      valueMap[SETTINGS_KEYS.DELIVERY_FEE] ?? SETTINGS_DEFAULTS.delivery_fee,
      normalizeInt(SETTINGS_DEFAULTS.delivery_fee, 30000),
      0,
    ),
    free_delivery_threshold: normalizeInt(
      valueMap[SETTINGS_KEYS.FREE_DELIVERY_THRESHOLD] ??
        SETTINGS_DEFAULTS.free_delivery_threshold,
      normalizeInt(SETTINGS_DEFAULTS.free_delivery_threshold, 500000),
      0,
    ),
  };
}

function stringifySettingValue(
  key: keyof NormalizedStoreSettings,
  value: NormalizedStoreSettings[keyof NormalizedStoreSettings],
) {
  if (key === 'pickup_slots') {
    return JSON.stringify(value);
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  return String(value);
}

function parseStoreSettingsUpdatePayload(raw: unknown) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { error: 'Dữ liệu không hợp lệ' } as const;
  }

  const body = raw as Record<string, unknown>;
  const allowedKeys = new Set([
    ...Object.keys(SETTINGS_DEFAULTS),
    ...Object.keys(LEGACY_SETTINGS_KEY_MAP),
  ]);

  const hasUnknownKey = Object.keys(body).some((key) => !allowedKeys.has(key));
  if (hasUnknownKey) {
    return { error: 'Trường dữ liệu không hợp lệ' } as const;
  }

  const parsed: StoreSettingsUpdatePayload = {};

  for (const [rawKey, value] of Object.entries(body)) {
    const key = Object.prototype.hasOwnProperty.call(LEGACY_SETTINGS_KEY_MAP, rawKey)
      ? LEGACY_SETTINGS_KEY_MAP[rawKey as keyof typeof LEGACY_SETTINGS_KEY_MAP]
      : rawKey;

    switch (key) {
      case SETTINGS_KEYS.STORE_NAME:
        if (typeof value !== 'string') {
          return { error: `${key} must be a string` } as const;
        }
        parsed.store_name = value.trim();
        break;
      case SETTINGS_KEYS.STORE_EMAIL:
        if (typeof value !== 'string') {
          return { error: `${key} must be a string` } as const;
        }
        parsed.store_email = value.trim();
        break;
      case SETTINGS_KEYS.STORE_PHONE:
        if (typeof value !== 'string') {
          return { error: `${key} must be a string` } as const;
        }
        parsed.store_phone = value.trim();
        break;
      case SETTINGS_KEYS.STORE_ADDRESS:
        if (typeof value !== 'string') {
          return { error: `${key} must be a string` } as const;
        }
        parsed.store_address = value.trim();
        break;
      case SETTINGS_KEYS.OPENING_HOURS:
        if (typeof value !== 'string') {
          return { error: `${key} must be a string` } as const;
        }
        parsed.opening_hours = value.trim();
        break;
      case SETTINGS_KEYS.ALLOW_DELIVERY:
        {
          const parsedBool = parseBooleanLike(value);
          if (parsedBool === null) {
            return { error: 'allow_delivery must be a boolean' } as const;
          }
          parsed.allow_delivery = parsedBool;
          break;
        }
      case SETTINGS_KEYS.PICKUP_SLOTS: {
        const parsedSlots = parsePickupSlotsPayload(value);
        if ('error' in parsedSlots) {
          return { error: parsedSlots.error } as const;
        }
        parsed.pickup_slots = parsedSlots.slots;
        break;
      }
      case SETTINGS_KEYS.MIN_ORDER_AMOUNT: {
        const parsedInt = parseNonNegativeIntegerLike(value);
        if (parsedInt === null) {
          return { error: `${key} must be a non-negative integer` } as const;
        }
        parsed.min_order_amount = parsedInt;
        break;
      }
      case SETTINGS_KEYS.DELIVERY_FEE: {
        const parsedInt = parseNonNegativeIntegerLike(value);
        if (parsedInt === null) {
          return { error: `${key} must be a non-negative integer` } as const;
        }
        parsed.delivery_fee = parsedInt;
        break;
      }
      case SETTINGS_KEYS.FREE_DELIVERY_THRESHOLD: {
        const parsedInt = parseNonNegativeIntegerLike(value);
        if (parsedInt === null) {
          return { error: `${key} must be a non-negative integer` } as const;
        }
        parsed.free_delivery_threshold = parsedInt;
        break;
      }
      default:
        break;
    }
  }

  if (Object.keys(parsed).length === 0) {
    return { error: 'Payload cần ít nhất một trường cài đặt để cập nhật' } as const;
  }

  return { payload: parsed } as const;
}

function toSettingsUpdates(payload: StoreSettingsUpdatePayload) {
  const updates: Array<{ key: string; value: string }> = [];

  for (const [key, value] of Object.entries(payload)) {
    const typedKey = key as keyof NormalizedStoreSettings;
    updates.push({
      key: typedKey,
      value: stringifySettingValue(typedKey, value),
    });
  }

  return updates;
}

export async function handleAdminSettingsGetRequest(
  deps: SettingsDeps = defaultDeps,
): Promise<SettingsHandlerResult> {
  await deps.requireAdmin();
  const settings = await deps.findSettings();

  return {
    status: 200,
    body: {
      success: true,
      data: toStoreSettingsData(settings),
    },
  };
}

export async function handleAdminSettingsPutRequest(
  request: Pick<NextRequest, 'json'>,
  deps: SettingsDeps = defaultDeps,
): Promise<SettingsHandlerResult> {
  const admin = await deps.requireAdmin();

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return {
      status: 400,
      body: { success: false, error: 'Dữ liệu JSON không hợp lệ' },
    };
  }

  const parsed = parseStoreSettingsUpdatePayload(rawBody);
  if ('error' in parsed) {
    return {
      status: 400,
      body: { success: false, error: parsed.error },
    };
  }

  const updates = toSettingsUpdates(parsed.payload);
  const keys = updates.map((update) => update.key);
  const beforeRows = await deps.findSettings(keys);
  const beforeValuesByKey = Object.fromEntries(beforeRows.map((row) => [row.key, row.value]));

  const changedUpdates = updates.filter(
    (update) => beforeValuesByKey[update.key] !== update.value,
  );
  if (changedUpdates.length > 0) {
    await deps.updateSettingsAndWriteAudit({
      actor: admin,
      updates: changedUpdates,
      beforeValuesByKey,
    });
  }

  const latestSettings = await deps.findSettings();
  return {
    status: 200,
    body: {
      success: true,
      data: toStoreSettingsData(latestSettings),
      message:
        changedUpdates.length > 0
          ? 'Settings updated'
          : 'No settings changes detected',
    },
  };
}

// GET /api/admin/settings
export async function GET() {
  try {
    const result = await handleAdminSettingsGetRequest();
    return NextResponse.json(result.body, { status: result.status });
  } catch (error: unknown) {
    console.error('Get settings error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = mapAuthErrorToStatus(message);
    return NextResponse.json(
      { success: false, error: status === 500 ? 'Internal server error' : message },
      { status },
    );
  }
}

// PUT /api/admin/settings
export async function PUT(request: NextRequest) {
  try {
    const result = await handleAdminSettingsPutRequest(request);
    return NextResponse.json(result.body, { status: result.status });
  } catch (error: unknown) {
    console.error('Update settings error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = mapAuthErrorToStatus(message);
    return NextResponse.json(
      { success: false, error: status === 500 ? 'Internal server error' : message },
      { status },
    );
  }
}


