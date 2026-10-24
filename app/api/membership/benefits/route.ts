import { NextRequest, NextResponse } from 'next/server';
import { mapAuthErrorToStatus } from '@/lib/rbac';
import { getCurrentUserFromRequest } from '@/lib/session';
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
  // Nullable variant: guests must reach the catalogue branch, not throw 401.
  getCurrentUser: getCurrentUserFromRequest,
  getMembershipConfig: getMembershipRulesConfig,
};

export async function handleGetMembershipBenefitsRequest(
  request: NextRequest,
  deps: MembershipBenefitsRouteDeps = defaultDeps,
) {
  try {
    const user = await deps.getCurrentUser(request);
    const config = await deps.getMembershipConfig();

    if (!user) {
      // Guests still get the tier catalogue so the marketing page can render
      // live admin-configured numbers — only the user-specific slice is
      // omitted.
      const guestBenefits = buildMembershipBenefitsView({
        config,
        memberLevel: null,
        points: 0,
      });
      return {
        status: 200,
        body: {
          success: true,
          data: {
            user: null,
            benefits: {
              tiers: guestBenefits.tiers,
              pointsPerOrder: config.pointsPerOrder,
            },
          },
        },
      };
    }

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
    const message = error instanceof Error ? error.message : 'Không tải được quyền lợi thành viên';
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
      { success: false, error: 'Không tải được quyền lợi thành viên' },
      { status: 500 },
    );
  }
}
