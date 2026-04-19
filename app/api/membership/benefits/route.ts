import { NextRequest, NextResponse } from 'next/server';
import { mapAuthErrorToStatus, requireUserFromRequest } from '@/lib/rbac';
import {
  buildMembershipBenefitsView,
  getMembershipRulesConfig,
  normalizeMembershipLevel,
  type MembershipRulesConfig,
} from '@/lib/membership/rules';

type MembershipBenefitsRouteDeps = {
  getCurrentUser: (request: NextRequest) => Promise<{
    id: string;
    memberLevel?: string | null;
    points?: number | null;
  } | null>;
  getMembershipConfig: () => Promise<MembershipRulesConfig>;
};

const defaultDeps: MembershipBenefitsRouteDeps = {
  getCurrentUser: requireUserFromRequest,
  getMembershipConfig: getMembershipRulesConfig,
};

export async function handleGetMembershipBenefitsRequest(
  request: NextRequest,
  deps: MembershipBenefitsRouteDeps = defaultDeps,
) {
  try {
    const user = await deps.getCurrentUser(request);

    if (!user) {
      return {
        status: 401,
        body: { success: false, error: 'Unauthorized' },
      };
    }

    const config = await deps.getMembershipConfig();
    const points = Number.isFinite(user.points) && (user.points ?? 0) > 0
      ? Number(user.points)
      : 0;

    const benefits = buildMembershipBenefitsView({
      config,
      memberLevel: user.memberLevel,
      points,
    });

    return {
      status: 200,
      body: {
        success: true,
        data: {
          user: {
            id: user.id,
            memberLevel:
              normalizeMembershipLevel(user.memberLevel) ?? benefits.currentTier.level,
            points,
          },
          benefits: {
            ...benefits,
            pointsPerOrder: config.pointsPerOrder,
          },
        },
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch membership benefits';
    const status = mapAuthErrorToStatus(message);
    if (status !== 500) {
      return {
        status,
        body: { success: false, error: message },
      };
    }
    throw error;
  }
}

export async function GET(request: NextRequest) {
  try {
    const result = await handleGetMembershipBenefitsRequest(request, defaultDeps);
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error('Get membership benefits error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch membership benefits' },
      { status: 500 },
    );
  }
}
