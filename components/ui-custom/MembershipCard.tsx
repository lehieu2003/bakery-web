"use client";

import { User, MemberLevel } from "@/lib/store";

const LEVEL_CONFIG: Record<MemberLevel, { label: string; bg: string; text: string; border: string; badge: string }> = {
  silver: {
    label: "Silver Member",
    bg: "from-slate-200 to-slate-100",
    text: "text-slate-700",
    border: "border-slate-300",
    badge: "bg-slate-400 text-white",
  },
  gold: {
    label: "Gold Member",
    bg: "from-yellow-50 to-amber-50",
    text: "text-amber-800",
    border: "border-amber-200",
    badge: "bg-amber-400 text-white",
  },
  platinum: {
    label: "Platinum Member",
    bg: "from-pink-50 to-rose-50",
    text: "text-rose-800",
    border: "border-rose-200",
    badge: "bg-rose-400 text-white",
  },
};

const NEXT_LEVEL_POINTS: Record<MemberLevel, number> = {
  silver: 300,
  gold: 500,
  platinum: 0,
};

export default function MembershipCard({ user }: { user: User }) {
  const config = LEVEL_CONFIG[user.level];
  const nextPoints = NEXT_LEVEL_POINTS[user.level];
  const remaining = nextPoints ? nextPoints - (user.points % nextPoints) : 0;
  const progress = nextPoints ? ((user.points % nextPoints) / nextPoints) * 100 : 100;

  return (
    <div className={`rounded-2xl border ${config.border} bg-gradient-to-br ${config.bg} p-4`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${config.badge}`}>
              {config.label}
            </span>
          </div>
          <p className={`font-serif text-base font-semibold ${config.text} mt-1`}>{user.name}</p>
        </div>
        <div className="text-right">
          <p className={`font-serif text-xl font-bold ${config.text}`}>{user.points.toLocaleString()}</p>
          <p className={`text-xs ${config.text} opacity-70`}>points</p>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="h-1.5 rounded-full bg-white/60 overflow-hidden">
          <div
            className="h-full rounded-full bg-current transition-all duration-700"
            style={{ width: `${progress}%`, color: user.level === "gold" ? "#D97706" : user.level === "platinum" ? "#F43F5E" : "#94A3B8" }}
          />
        </div>
        {nextPoints > 0 && (
          <p className={`text-xs ${config.text} opacity-70`}>
            {remaining} points away from {user.level === "silver" ? "Gold" : "Platinum"}
          </p>
        )}
      </div>

      <div className={`mt-3 pt-3 border-t border-current/10 flex items-center justify-between`}>
        <p className={`text-xs ${config.text} opacity-80`}>Saved this month</p>
        <p className={`text-sm font-semibold ${config.text}`}>{user.savedThisMonth.toLocaleString("vi-VN")}đ</p>
      </div>
    </div>
  );
}
