import { prisma } from '@/lib/prisma';

export type DeliverySettings = {
  deliveryFee: number;
  freeDeliveryThreshold: number;
};

export const DELIVERY_SETTING_KEYS = {
  DELIVERY_FEE: 'delivery_fee',
  FREE_DELIVERY_THRESHOLD: 'free_delivery_threshold',
} as const;

export const DEFAULT_DELIVERY_SETTINGS: DeliverySettings = {
  deliveryFee: 30000,
  freeDeliveryThreshold: 500000,
};

type DeliverySettingsDeps = {
  findSettings: (
    keys: string[],
  ) => Promise<Array<{ key: string; value: string }>>;
};

const defaultDeliverySettingsDeps: DeliverySettingsDeps = {
  findSettings: async (keys) =>
    prisma.setting.findMany({
      where: {
        key: {
          in: keys,
        },
      },
      select: {
        key: true,
        value: true,
      },
    }),
};

function parseIntOrFallback(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function getDeliverySettings(
  deps: DeliverySettingsDeps = defaultDeliverySettingsDeps,
): Promise<DeliverySettings> {
  const rows = await deps.findSettings([
    DELIVERY_SETTING_KEYS.DELIVERY_FEE,
    DELIVERY_SETTING_KEYS.FREE_DELIVERY_THRESHOLD,
  ]);
  const settingsMap = Object.fromEntries(
    rows.map((row) => [row.key, row.value]),
  );

  return {
    deliveryFee: parseIntOrFallback(
      settingsMap[DELIVERY_SETTING_KEYS.DELIVERY_FEE],
      DEFAULT_DELIVERY_SETTINGS.deliveryFee,
    ),
    freeDeliveryThreshold: parseIntOrFallback(
      settingsMap[DELIVERY_SETTING_KEYS.FREE_DELIVERY_THRESHOLD],
      DEFAULT_DELIVERY_SETTINGS.freeDeliveryThreshold,
    ),
  };
}
