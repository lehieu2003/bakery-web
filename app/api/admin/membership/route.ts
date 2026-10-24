import { NextRequest, NextResponse } from 'next/server';
import type { MemberLevel, UserRole } from '@prisma/client';

import { prisma } from '@/lib/prisma';
import { mapAuthErrorToStatus } from '@/lib/rbac';
import { requireAdmin } from '@/lib/session';
import {
  DEFAULT_MEMBERSHIP_RULES,
  MEMBERSHIP_SETTING_KEYS,
  getMembershipRulesConfig,
} from '@/lib/membership/rules';
import { writeSettingAuditLogWithClient } from '@/lib/setting-audit';

const MEMBERSHIP_LEVELS: MemberLevel[] = ['SILVER', 'GOLD', 'PLATINUM'];

const LEVEL_LABELS: Record<MemberLevel, string> = {
  SILVER: 'Silver',
  GOLD: 'Gold',
  PLATINUM: 'Platinum',
};

type AdminUser = {
  id: string;
  role: UserRole;
};

type MembershipLevelConfig = {
  level: MemberLevel;
  minPoints: number;
  discountPercent: number;
};

type MembershipUpdatePayload = {
  levels?: MembershipLevelConfig[];
  pointsPerOrder?: number;
};

type MembershipHandlerResult = {
  status: number;
  body: {
    success: boolean;
    data?: unknown;
    error?: string;
    message?: string;
  };
};

type MembershipSettingRow = {
  key: string;
  value: string;
};

type MembershipDeps = {
  requireAdmin: () => Promise<AdminUser>;
  findSettings: (keys: string[]) => Promise<MembershipSettingRow[]>;
  countMembersByLevel: (level: MemberLevel) => Promise<number>;
  updateSettingsAndWriteAudit: (args: {
    actor: AdminUser;
    updates: Array<{ key: string; value: string }>;
    beforeValuesByKey: Record<string, string | undefined>;
  }) => Promise<void>;
};

const membershipSettingKeyByLevel: Record<
  MemberLevel,
  { minPoints: string; discount: string }
> = {
  SILVER: {
    minPoints: MEMBERSHIP_SETTING_KEYS.SILVER_MIN_POINTS,
    discount: MEMBERSHIP_SETTING_KEYS.SILVER_DISCOUNT,
  },
  GOLD: {
    minPoints: MEMBERSHIP_SETTING_KEYS.GOLD_MIN_POINTS,
    discount: MEMBERSHIP_SETTING_KEYS.GOLD_DISCOUNT,
  },
  PLATINUM: {
    minPoints: MEMBERSHIP_SETTING_KEYS.PLATINUM_MIN_POINTS,
    discount: MEMBERSHIP_SETTING_KEYS.PLATINUM_DISCOUNT,
  },
};

const defaultDeps: MembershipDeps = {
  requireAdmin,
  findSettings: (keys) =>
    prisma.setting.findMany({
      where: {
        key: { in: keys },
      },
      select: {
        key: true,
        value: true,
      },
    }),
  countMembersByLevel: (level) =>
    prisma.user.count({
      where: {
        role: 'CUSTOMER',
        memberLevel: level,
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
            domain: 'membership',
          },
        });
      }
    });
  },
};


function getCurrentMembershipKeys() {
  return [
    MEMBERSHIP_SETTING_KEYS.SILVER_MIN_POINTS,
    MEMBERSHIP_SETTING_KEYS.SILVER_DISCOUNT,
    MEMBERSHIP_SETTING_KEYS.GOLD_MIN_POINTS,
    MEMBERSHIP_SETTING_KEYS.GOLD_DISCOUNT,
    MEMBERSHIP_SETTING_KEYS.PLATINUM_MIN_POINTS,
    MEMBERSHIP_SETTING_KEYS.PLATINUM_DISCOUNT,
    MEMBERSHIP_SETTING_KEYS.POINTS_PER_ORDER,
  ];
}

function parseMembershipUpdatePayload(raw: unknown) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { error: 'Dữ liệu không hợp lệ' } as const;
  }

  const body = raw as Record<string, unknown>;
  const allowedKeys = new Set(['levels', 'pointsPerOrder']);
  const hasUnknownKey = Object.keys(body).some((key) => !allowedKeys.has(key));
  if (hasUnknownKey) {
    return { error: 'Trường dữ liệu không hợp lệ' } as const;
  }

  const parsed: MembershipUpdatePayload = {};

  if (body.levels !== undefined) {
    if (!Array.isArray(body.levels)) {
      return { error: 'levels phải là một mảng' } as const;
    }
    if (body.levels.length !== MEMBERSHIP_LEVELS.length) {
      return { error: 'levels phải đủ 3 hạng SILVER, GOLD và PLATINUM' } as const;
    }

    const levelMap = new Map<MemberLevel, MembershipLevelConfig>();
    for (const row of body.levels) {
      if (!row || typeof row !== 'object' || Array.isArray(row)) {
        return { error: 'Mỗi hạng phải là một object' } as const;
      }

      const item = row as Record<string, unknown>;
      const levelRaw = item.level;
      if (
        typeof levelRaw !== 'string' ||
        !MEMBERSHIP_LEVELS.includes(levelRaw as MemberLevel)
      ) {
        return { error: 'Hạng thành viên không hợp lệ' } as const;
      }
      const level = levelRaw as MemberLevel;

      if (!Number.isInteger(item.minPoints) || (item.minPoints as number) < 0) {
        return { error: `minPoints của ${level} phải là số nguyên không âm` } as const;
      }

      if (
        !Number.isInteger(item.discountPercent) ||
        (item.discountPercent as number) < 0 ||
        (item.discountPercent as number) > 100
      ) {
        return { error: `discountPercent của ${level} phải là số nguyên từ 0 đến 100` } as const;
      }

      levelMap.set(level, {
        level,
        minPoints: item.minPoints as number,
        discountPercent: item.discountPercent as number,
      });
    }

    if (levelMap.size !== MEMBERSHIP_LEVELS.length) {
      return { error: 'levels không được trùng nhau' } as const;
    }

    const ordered = MEMBERSHIP_LEVELS.map((level) => levelMap.get(level)!);
    if (
      !(ordered[0].minPoints < ordered[1].minPoints) ||
      !(ordered[1].minPoints < ordered[2].minPoints)
    ) {
      return {
        error: 'Điểm tối thiểu phải tăng dần từ SILVER lên PLATINUM',
      } as const;
    }

    parsed.levels = ordered;
  }

  if (body.pointsPerOrder !== undefined) {
    if (!Number.isInteger(body.pointsPerOrder) || (body.pointsPerOrder as number) <= 0) {
      return { error: 'pointsPerOrder must be a positive integer' } as const;
    }
    parsed.pointsPerOrder = body.pointsPerOrder as number;
  }

  if (!parsed.levels && parsed.pointsPerOrder === undefined) {
    return { error: 'Payload cần levels hoặc pointsPerOrder' } as const;
  }

  return { payload: parsed } as const;
}

function toMembershipUpdates(payload: MembershipUpdatePayload) {
  const updates: Array<{ key: string; value: string }> = [];

  if (payload.levels) {
    for (const level of payload.levels) {
      const keyMap = membershipSettingKeyByLevel[level.level];
      updates.push({
        key: keyMap.minPoints,
        value: String(level.minPoints),
      });
      updates.push({
        key: keyMap.discount,
        value: String(level.discountPercent),
      });
    }
  }

  if (payload.pointsPerOrder !== undefined) {
    updates.push({
      key: MEMBERSHIP_SETTING_KEYS.POINTS_PER_ORDER,
      value: String(payload.pointsPerOrder),
    });
  }

  return updates;
}

async function buildMembershipResponse(deps: MembershipDeps) {
  const config = await getMembershipRulesConfig({
    findSettings: deps.findSettings,
  });
  const levelConfigMap = new Map(config.levels.map((item) => [item.level, item]));
  const defaultLevelMap = new Map(
    DEFAULT_MEMBERSHIP_RULES.levels.map((item) => [item.level, item]),
  );

  const [silverCount, goldCount, platinumCount] = await Promise.all([
    deps.countMembersByLevel('SILVER'),
    deps.countMembersByLevel('GOLD'),
    deps.countMembersByLevel('PLATINUM'),
  ]);

  const countsByLevel: Record<MemberLevel, number> = {
    SILVER: silverCount,
    GOLD: goldCount,
    PLATINUM: platinumCount,
  };

  const levels = MEMBERSHIP_LEVELS.map((level, index) => ({
    level,
    label: LEVEL_LABELS[level],
    minPoints:
      levelConfigMap.get(level)?.minPoints ??
      defaultLevelMap.get(level)?.minPoints ??
      DEFAULT_MEMBERSHIP_RULES.levels[index].minPoints,
    discountPercent:
      levelConfigMap.get(level)?.discountPercent ??
      defaultLevelMap.get(level)?.discountPercent ??
      DEFAULT_MEMBERSHIP_RULES.levels[index].discountPercent,
    memberCount: countsByLevel[level],
  }));

  return {
    levels,
    pointsPerOrder: config.pointsPerOrder,
    totalMembers: levels.reduce((sum, item) => sum + item.memberCount, 0),
  };
}

export async function handleAdminMembershipGetRequest(
  deps: MembershipDeps = defaultDeps,
): Promise<MembershipHandlerResult> {
  await deps.requireAdmin();

  const data = await buildMembershipResponse(deps);
  return {
    status: 200,
    body: {
      success: true,
      data,
    },
  };
}

export async function handleAdminMembershipPutRequest(
  request: Pick<NextRequest, 'json'>,
  deps: MembershipDeps = defaultDeps,
): Promise<MembershipHandlerResult> {
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

  const parsed = parseMembershipUpdatePayload(rawBody);
  if ('error' in parsed) {
    return {
      status: 400,
      body: { success: false, error: parsed.error },
    };
  }

  const updates = toMembershipUpdates(parsed.payload);
  const settings = await deps.findSettings(getCurrentMembershipKeys());
  const beforeValuesByKey = Object.fromEntries(settings.map((row) => [row.key, row.value]));

  const changedUpdates = updates.filter((update) => beforeValuesByKey[update.key] !== update.value);
  if (changedUpdates.length > 0) {
    await deps.updateSettingsAndWriteAudit({
      actor: admin,
      updates: changedUpdates,
      beforeValuesByKey,
    });
  }

  const data = await buildMembershipResponse(deps);
  return {
    status: 200,
    body: {
      success: true,
      data,
      message:
        changedUpdates.length > 0
          ? 'Membership configuration updated'
          : 'No membership configuration changes detected',
    },
  };
}

// GET /api/admin/membership
export async function GET() {
  try {
    const result = await handleAdminMembershipGetRequest();
    return NextResponse.json(result.body, { status: result.status });
  } catch (error: unknown) {
    console.error('Get membership config error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = mapAuthErrorToStatus(message);
    return NextResponse.json(
      { success: false, error: status === 500 ? 'Internal server error' : message },
      { status },
    );
  }
}

// PUT /api/admin/membership
export async function PUT(request: NextRequest) {
  try {
    const result = await handleAdminMembershipPutRequest(request);
    return NextResponse.json(result.body, { status: result.status });
  } catch (error: unknown) {
    console.error('Update membership config error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = mapAuthErrorToStatus(message);
    return NextResponse.json(
      { success: false, error: status === 500 ? 'Internal server error' : message },
      { status },
    );
  }
}


