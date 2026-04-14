import assert from 'node:assert/strict';
import test from 'node:test';

import {
  handleAdminMembershipGetRequest,
  handleAdminMembershipPutRequest,
} from '@/app/api/admin/membership/route';
import {
  handleAdminSettingsGetRequest,
  handleAdminSettingsPutRequest,
} from '@/app/api/admin/settings/route';

function makePutRequest(body: unknown) {
  return {
    json: async () => body,
  } as never;
}

test('admin settings GET normalizes legacy keys and pickup slots', async () => {
  const result = await handleAdminSettingsGetRequest({
    requireAdmin: async () => ({ id: 'admin-1', role: 'ADMIN' }),
    findSettings: async () => [
      { key: 'store_name', value: 'Bakery Legacy' },
      { key: 'pickup_slots', value: '["09:00","10:00"]' },
      { key: 'allow_delivery', value: 'false' },
      { key: 'min_order_delivery', value: '150000' },
      { key: 'min_order_free_delivery', value: '600000' },
    ],
    updateSettingsAndWriteAudit: async () => {
      throw new Error('should not be called');
    },
  });

  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
  const data = result.body.data as {
    store_name: string;
    pickup_slots: string[];
    allow_delivery: boolean;
    min_order_amount: number;
    free_delivery_threshold: number;
  };
  assert.equal(data.store_name, 'Bakery Legacy');
  assert.deepEqual(data.pickup_slots, ['09:00', '10:00']);
  assert.equal(data.allow_delivery, false);
  assert.equal(data.min_order_amount, 150000);
  assert.equal(data.free_delivery_threshold, 600000);
});

test('admin settings GET prefers canonical keys when both legacy and canonical exist', async () => {
  const result = await handleAdminSettingsGetRequest({
    requireAdmin: async () => ({ id: 'admin-1', role: 'ADMIN' }),
    findSettings: async () => [
      { key: 'min_order_delivery', value: '150000' },
      { key: 'min_order_amount', value: '250000' },
      { key: 'min_order_free_delivery', value: '600000' },
      { key: 'free_delivery_threshold', value: '700000' },
    ],
    updateSettingsAndWriteAudit: async () => {
      throw new Error('should not be called');
    },
  });

  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
  const data = result.body.data as {
    min_order_amount: number;
    free_delivery_threshold: number;
  };
  assert.equal(data.min_order_amount, 250000);
  assert.equal(data.free_delivery_threshold, 700000);
});

test('admin settings PUT rejects malformed json payload', async () => {
  const result = await handleAdminSettingsPutRequest(
    {
      json: async () => {
        throw new SyntaxError('Unexpected end of JSON input');
      },
    },
    {
      requireAdmin: async () => ({ id: 'admin-1', role: 'ADMIN' }),
      findSettings: async () => [],
      updateSettingsAndWriteAudit: async () => {
        throw new Error('should not be called');
      },
    },
  );

  assert.equal(result.status, 400);
  assert.equal(result.body.success, false);
  assert.equal(result.body.error, 'Invalid JSON payload');
});

test('admin settings PUT rejects unknown payload fields', async () => {
  const result = await handleAdminSettingsPutRequest(
    makePutRequest({ unknown_field: 'x' }),
    {
      requireAdmin: async () => ({ id: 'admin-1', role: 'ADMIN' }),
      findSettings: async () => [],
      updateSettingsAndWriteAudit: async () => {
        throw new Error('should not be called');
      },
    },
  );

  assert.equal(result.status, 400);
  assert.equal(result.body.success, false);
  assert.equal(result.body.error, 'Invalid payload fields');
});

test('admin settings PUT normalizes legacy min_order_delivery key and writes audit updates', async () => {
  const store = new Map<string, string>([
    ['min_order_amount', '0'],
    ['delivery_fee', '30000'],
    ['pickup_slots', '["09:00"]'],
    ['allow_delivery', 'true'],
  ]);
  const auditUpdates: Array<{ key: string; value: string }> = [];

  const result = await handleAdminSettingsPutRequest(
    makePutRequest({
      min_order_delivery: 200000,
      delivery_fee: 40000,
      pickup_slots: ['09:00', '10:00'],
      allow_delivery: false,
    }),
    {
      requireAdmin: async () => ({ id: 'admin-1', role: 'ADMIN' }),
      findSettings: async (keys) => {
        const entries = [...store.entries()]
          .filter(([key]) => !keys || keys.includes(key))
          .map(([key, value]) => ({ key, value }));
        return entries;
      },
      updateSettingsAndWriteAudit: async ({ updates }) => {
        updates.forEach((item) => {
          auditUpdates.push(item);
          store.set(item.key, item.value);
        });
      },
    },
  );

  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
  assert.equal(auditUpdates.some((item) => item.key === 'min_order_amount'), true);
  assert.equal(auditUpdates.some((item) => item.key === 'delivery_fee'), true);
  assert.equal(auditUpdates.some((item) => item.key === 'pickup_slots'), true);
  assert.equal(auditUpdates.some((item) => item.key === 'allow_delivery'), true);

  const data = result.body.data as {
    min_order_amount: number;
    delivery_fee: number;
    pickup_slots: string[];
    allow_delivery: boolean;
  };
  assert.equal(data.min_order_amount, 200000);
  assert.equal(data.delivery_fee, 40000);
  assert.deepEqual(data.pickup_slots, ['09:00', '10:00']);
  assert.equal(data.allow_delivery, false);
});

test('admin settings PUT coerces legacy-compatible string payload values', async () => {
  const store = new Map<string, string>([
    ['min_order_amount', '0'],
    ['delivery_fee', '30000'],
    ['free_delivery_threshold', '500000'],
    ['pickup_slots', '["09:00"]'],
    ['allow_delivery', 'true'],
  ]);

  const result = await handleAdminSettingsPutRequest(
    makePutRequest({
      min_order_delivery: '200000',
      delivery_fee: '40000',
      min_order_free_delivery: '650000',
      pickup_slots: '09:00,10:00',
      allow_delivery: 'false',
    }),
    {
      requireAdmin: async () => ({ id: 'admin-1', role: 'ADMIN' }),
      findSettings: async (keys) =>
        [...store.entries()]
          .filter(([key]) => !keys || keys.includes(key))
          .map(([key, value]) => ({ key, value })),
      updateSettingsAndWriteAudit: async ({ updates }) => {
        updates.forEach((item) => {
          store.set(item.key, item.value);
        });
      },
    },
  );

  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
  const data = result.body.data as {
    min_order_amount: number;
    delivery_fee: number;
    free_delivery_threshold: number;
    pickup_slots: string[];
    allow_delivery: boolean;
  };
  assert.equal(data.min_order_amount, 200000);
  assert.equal(data.delivery_fee, 40000);
  assert.equal(data.free_delivery_threshold, 650000);
  assert.deepEqual(data.pickup_slots, ['09:00', '10:00']);
  assert.equal(data.allow_delivery, false);
});

test('admin settings PUT rejects impossible pickup slot values', async () => {
  const result = await handleAdminSettingsPutRequest(
    makePutRequest({
      pickup_slots: ['25:99', '09:30'],
    }),
    {
      requireAdmin: async () => ({ id: 'admin-1', role: 'ADMIN' }),
      findSettings: async () => [],
      updateSettingsAndWriteAudit: async () => {
        throw new Error('should not be called');
      },
    },
  );

  assert.equal(result.status, 400);
  assert.equal(result.body.success, false);
  assert.equal(result.body.error, 'pickup_slots must use valid 24h HH:mm format');
});

test('admin membership GET returns levels and total members', async () => {
  const result = await handleAdminMembershipGetRequest({
    requireAdmin: async () => ({ id: 'admin-1', role: 'ADMIN' }),
    findSettings: async () => [
      { key: 'membership_silver_min_points', value: '0' },
      { key: 'membership_silver_discount', value: '3' },
      { key: 'membership_gold_min_points', value: '300' },
      { key: 'membership_gold_discount', value: '7' },
      { key: 'membership_platinum_min_points', value: '900' },
      { key: 'membership_platinum_discount', value: '12' },
      { key: 'membership_points_per_order', value: '10000' },
    ],
    countMembersByLevel: async (level) =>
      level === 'SILVER' ? 10 : level === 'GOLD' ? 5 : 1,
    updateSettingsAndWriteAudit: async () => {
      throw new Error('should not be called');
    },
  });

  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
  const data = result.body.data as {
    levels: Array<{ level: string; memberCount: number }>;
    pointsPerOrder: number;
    totalMembers: number;
  };
  assert.equal(data.levels.length, 3);
  assert.equal(data.pointsPerOrder, 10000);
  assert.equal(data.totalMembers, 16);
});

test('admin membership GET maps values by explicit level key even when thresholds are out of order', async () => {
  const result = await handleAdminMembershipGetRequest({
    requireAdmin: async () => ({ id: 'admin-1', role: 'ADMIN' }),
    findSettings: async () => [
      { key: 'membership_silver_min_points', value: '900' },
      { key: 'membership_silver_discount', value: '12' },
      { key: 'membership_gold_min_points', value: '300' },
      { key: 'membership_gold_discount', value: '7' },
      { key: 'membership_platinum_min_points', value: '0' },
      { key: 'membership_platinum_discount', value: '3' },
      { key: 'membership_points_per_order', value: '10000' },
    ],
    countMembersByLevel: async () => 0,
    updateSettingsAndWriteAudit: async () => {
      throw new Error('should not be called');
    },
  });

  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
  const data = result.body.data as {
    levels: Array<{ level: string; minPoints: number; discountPercent: number }>;
  };
  const silver = data.levels.find((item) => item.level === 'SILVER');
  const platinum = data.levels.find((item) => item.level === 'PLATINUM');
  assert.equal(silver?.minPoints, 900);
  assert.equal(silver?.discountPercent, 12);
  assert.equal(platinum?.minPoints, 0);
  assert.equal(platinum?.discountPercent, 3);
});

test('admin membership PUT rejects invalid threshold order', async () => {
  const result = await handleAdminMembershipPutRequest(
    makePutRequest({
      levels: [
        { level: 'SILVER', minPoints: 0, discountPercent: 3 },
        { level: 'GOLD', minPoints: 100, discountPercent: 7 },
        { level: 'PLATINUM', minPoints: 90, discountPercent: 12 },
      ],
    }),
    {
      requireAdmin: async () => ({ id: 'admin-1', role: 'ADMIN' }),
      findSettings: async () => [],
      countMembersByLevel: async () => 0,
      updateSettingsAndWriteAudit: async () => {
        throw new Error('should not be called');
      },
    },
  );

  assert.equal(result.status, 400);
  assert.equal(result.body.success, false);
  assert.match(
    String(result.body.error),
    /strictly increasing/i,
  );
});

test('admin membership PUT rejects malformed json payload', async () => {
  const result = await handleAdminMembershipPutRequest(
    {
      json: async () => {
        throw new SyntaxError('Unexpected end of JSON input');
      },
    },
    {
      requireAdmin: async () => ({ id: 'admin-1', role: 'ADMIN' }),
      findSettings: async () => [],
      countMembersByLevel: async () => 0,
      updateSettingsAndWriteAudit: async () => {
        throw new Error('should not be called');
      },
    },
  );

  assert.equal(result.status, 400);
  assert.equal(result.body.success, false);
  assert.equal(result.body.error, 'Invalid JSON payload');
});

test('admin membership PUT updates changed keys and returns refreshed config', async () => {
  const settings = new Map<string, string>([
    ['membership_silver_min_points', '0'],
    ['membership_silver_discount', '3'],
    ['membership_gold_min_points', '300'],
    ['membership_gold_discount', '7'],
    ['membership_platinum_min_points', '900'],
    ['membership_platinum_discount', '12'],
    ['membership_points_per_order', '10000'],
  ]);
  const updates: Array<{ key: string; value: string }> = [];

  const result = await handleAdminMembershipPutRequest(
    makePutRequest({
      levels: [
        { level: 'SILVER', minPoints: 0, discountPercent: 3 },
        { level: 'GOLD', minPoints: 350, discountPercent: 8 },
        { level: 'PLATINUM', minPoints: 1000, discountPercent: 13 },
      ],
      pointsPerOrder: 12000,
    }),
    {
      requireAdmin: async () => ({ id: 'admin-1', role: 'ADMIN' }),
      findSettings: async (keys) =>
        [...settings.entries()]
          .filter(([key]) => !keys || keys.includes(key))
          .map(([key, value]) => ({ key, value })),
      countMembersByLevel: async (level) =>
        level === 'SILVER' ? 8 : level === 'GOLD' ? 4 : 2,
      updateSettingsAndWriteAudit: async ({ updates: changed }) => {
        changed.forEach((item) => {
          updates.push(item);
          settings.set(item.key, item.value);
        });
      },
    },
  );

  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
  assert.equal(
    updates.some((item) => item.key === 'membership_gold_min_points' && item.value === '350'),
    true,
  );
  assert.equal(
    updates.some((item) => item.key === 'membership_points_per_order' && item.value === '12000'),
    true,
  );

  const data = result.body.data as {
    levels: Array<{ level: string; minPoints: number; discountPercent: number }>;
    pointsPerOrder: number;
    totalMembers: number;
  };
  const gold = data.levels.find((item) => item.level === 'GOLD');
  assert.equal(gold?.minPoints, 350);
  assert.equal(gold?.discountPercent, 8);
  assert.equal(data.pointsPerOrder, 12000);
  assert.equal(data.totalMembers, 14);
});
