import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';

// Settings key constants
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
};

// GET: Get all settings
export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const settings = await (prisma as any).setting.findMany();

    // Convert to key-value object
    const settingsObject: Record<string, string> = {};
    settings.forEach((s: { key: string; value: string }) => {
      settingsObject[s.key] = s.value;
    });

    // Apply defaults for missing settings
    const defaultSettings = {
      [SETTINGS_KEYS.STORE_NAME]: 'Bakery Shop',
      [SETTINGS_KEYS.STORE_EMAIL]: 'hello@bakeryshop.com',
      [SETTINGS_KEYS.STORE_PHONE]: '028 3820 1234',
      [SETTINGS_KEYS.STORE_ADDRESS]: '12 Nguyen Thi Minh Khai, Dist 1, HCMC',
      [SETTINGS_KEYS.OPENING_HOURS]:
        'Mon – Sat: 8:00 AM – 7:00 PM\nSun: 9:00 AM – 5:00 PM',
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
    };

    return NextResponse.json({
      success: true,
      data: { ...defaultSettings, ...settingsObject },
    });
  } catch (error) {
    console.error('Get settings error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch settings' },
      { status: 500 },
    );
  }
}

// PUT: Update settings
export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      );
    }

    const body = await request.json();

    // Valid settings keys
    const validKeys = Object.values(SETTINGS_KEYS);

    // Update each setting
    const updates = Object.entries(body).filter(([key]) =>
      validKeys.includes(key),
    );

    for (const [key, value] of updates) {
      const stringValue =
        typeof value === 'object' ? JSON.stringify(value) : String(value);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (prisma as any).setting.upsert({
        where: { key },
        update: { value: stringValue },
        create: { key, value: stringValue },
      });
    }

    // Fetch updated settings
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const settings = await (prisma as any).setting.findMany();
    const settingsObject: Record<string, string> = {};
    settings.forEach((s: { key: string; value: string }) => {
      settingsObject[s.key] = s.value;
    });

    return NextResponse.json({
      success: true,
      data: settingsObject,
    });
  } catch (error) {
    console.error('Update settings error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update settings' },
      { status: 500 },
    );
  }
}
