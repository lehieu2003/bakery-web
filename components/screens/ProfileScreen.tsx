'use client';

import { LogOut, ChevronRight } from 'lucide-react';
import { useApp, MemberLevel } from '@/lib/store';

const LEVEL_BENEFITS: Record<
  MemberLevel,
  { discount: string; perks: string[] }
> = {
  silver: {
    discount: '5% off all orders',
    perks: ['Birthday cake discount', 'Early sale access'],
  },
  gold: {
    discount: '10% off all orders',
    perks: [
      'Birthday cake discount',
      'Early sale access',
      'Free custom message',
      'Priority pickup',
    ],
  },
  platinum: {
    discount: '15% off all orders',
    perks: [
      'Birthday cake discount',
      'Early sale access',
      'Free custom message',
      'Priority pickup',
      'Complimentary tasting box',
      'Dedicated order manager',
    ],
  },
};

const MOCK_HISTORY = [
  {
    id: 'BK20341',
    date: '15 Mar 2025',
    total: 450000,
    items: 'Rose Signature Cake',
    points: 90,
  },
  {
    id: 'BK20280',
    date: '01 Mar 2025',
    total: 205000,
    items: 'Almond Flour + Chocolate',
    points: 41,
  },
  {
    id: 'BK20210',
    date: '14 Feb 2025',
    total: 380000,
    items: 'Dark Chocolate Mousse',
    points: 76,
  },
];

const MOCK_POINT_HISTORY = [
  { label: 'Order #BK20341', date: '15 Mar', points: 90, type: 'earn' },
  { label: 'Order #BK20280', date: '01 Mar', points: 41, type: 'earn' },
  { label: 'Referral Bonus', date: '20 Feb', points: 50, type: 'earn' },
  { label: 'Order #BK20210', date: '14 Feb', points: 76, type: 'earn' },
  { label: 'Redeemed Discount', date: '14 Feb', points: -100, type: 'redeem' },
];

export default function ProfileScreen() {
  const { user, navigate, logout } = useApp();

  if (!user) {
    return (
      <div className='bg-background'>
        <div className='border-b border-border/60 bg-card'>
          <div className='max-w-7xl mx-auto px-6 lg:px-8 py-10'>
            <h1 className='font-serif text-3xl font-semibold text-foreground'>
              Membership
            </h1>
            <p className='text-muted-foreground text-sm mt-1'>
              Join our exclusive club and enjoy premium rewards.
            </p>
          </div>
        </div>

        <div className='max-w-7xl mx-auto px-6 lg:px-8 py-12 flex flex-col lg:flex-row gap-12 items-start'>
          {/* Left CTA */}
          <div className='flex-1'>
            <h2 className='font-serif text-2xl font-semibold text-foreground mb-3'>
              Join Our Membership Club
            </h2>
            <p className='text-muted-foreground text-sm leading-relaxed mb-8 max-w-md'>
              Earn points on every order, unlock exclusive discounts up to 15%,
              and enjoy personalised bakery experiences at every tier.
            </p>
            <div className='flex gap-4'>
              <button
                onClick={() => navigate('auth')}
                className='px-8 py-3.5 bg-primary text-white rounded-full text-sm font-medium hover:bg-primary/90 transition-colors shadow-md'
              >
                Sign In
              </button>
              <button
                onClick={() => navigate('auth')}
                className='px-8 py-3.5 border border-primary text-primary rounded-full text-sm font-medium hover:bg-primary/8 transition-colors'
              >
                Create Account
              </button>
            </div>
          </div>

          {/* Level cards */}
          <div className='w-full lg:w-auto flex flex-col sm:flex-row lg:flex-col gap-4 lg:min-w-64'>
            {(['silver', 'gold', 'platinum'] as MemberLevel[]).map((level) => {
              const styles: Record<
                MemberLevel,
                { border: string; bg: string; text: string; badge: string }
              > = {
                silver: {
                  border: 'border-slate-200',
                  bg: 'bg-slate-50',
                  text: 'text-slate-700',
                  badge: 'bg-slate-200 text-slate-700',
                },
                gold: {
                  border: 'border-amber-200',
                  bg: 'bg-amber-50',
                  text: 'text-amber-800',
                  badge: 'bg-amber-100 text-amber-800',
                },
                platinum: {
                  border: 'border-rose-200',
                  bg: 'bg-rose-50',
                  text: 'text-rose-800',
                  badge: 'bg-rose-100 text-rose-800',
                },
              };
              const s = styles[level];
              return (
                <div
                  key={level}
                  className={`flex-1 rounded-2xl border ${s.border} ${s.bg} p-5`}
                >
                  <span
                    className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full ${s.badge}`}
                  >
                    {level}
                  </span>
                  <p className={`text-sm font-semibold ${s.text} mt-3 mb-1`}>
                    {LEVEL_BENEFITS[level].discount}
                  </p>
                  <ul className='space-y-0.5'>
                    {LEVEL_BENEFITS[level].perks.slice(0, 3).map((p) => (
                      <li key={p} className={`text-xs ${s.text} opacity-70`}>
                        · {p}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  const levelConfig: Record<
    MemberLevel,
    { bg: string; text: string; border: string; barColor: string }
  > = {
    silver: {
      bg: 'from-slate-100 to-slate-50',
      text: 'text-slate-700',
      border: 'border-slate-200',
      barColor: 'bg-slate-400',
    },
    gold: {
      bg: 'from-amber-50 to-yellow-50',
      text: 'text-amber-800',
      border: 'border-amber-200',
      barColor: 'bg-amber-400',
    },
    platinum: {
      bg: 'from-rose-50 to-pink-50',
      text: 'text-rose-800',
      border: 'border-rose-200',
      barColor: 'bg-rose-400',
    },
  };
  const lc = levelConfig[user.level];

  return (
    <div className='bg-background'>
      {/* Hero */}
      <div className={`bg-gradient-to-br ${lc.bg} border-b ${lc.border}`}>
        <div className='max-w-7xl mx-auto px-6 lg:px-8 py-10 flex items-center justify-between'>
          <div className='flex items-center gap-6'>
            <div
              className={`w-20 h-20 rounded-full border-2 ${lc.border} bg-white/80 flex items-center justify-center flex-shrink-0`}
            >
              <span className={`font-serif text-3xl font-bold ${lc.text}`}>
                {user.name.charAt(0)}
              </span>
            </div>
            <div>
              <p className={`font-serif text-2xl font-semibold ${lc.text}`}>
                {user.name}
              </p>
              <span
                className={`text-[11px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-white/60 ${lc.text} inline-block mt-1`}
              >
                {user.level} member
              </span>
            </div>
          </div>
          <div className='flex items-center gap-6'>
            <div className='text-right'>
              <p className={`font-serif text-3xl font-bold ${lc.text}`}>
                {user.points.toLocaleString()}
              </p>
              <p className={`text-sm ${lc.text} opacity-70`}>loyalty points</p>
            </div>
            <button
              onClick={logout}
              className='flex items-center gap-2 px-4 py-2 rounded-full border border-current/20 text-sm font-medium text-muted-foreground hover:bg-background/60 transition-colors'
              aria-label='Sign out'
            >
              <LogOut size={15} />
              Sign Out
            </button>
          </div>
        </div>

        {/* Progress */}
        <div className='max-w-7xl mx-auto px-6 lg:px-8 pb-8'>
          <div className='max-w-sm'>
            <div className='h-2 rounded-full bg-white/60 overflow-hidden mb-2'>
              <div
                className={`h-full rounded-full ${lc.barColor}`}
                style={{ width: '84%' }}
              />
            </div>
            <p className={`text-xs ${lc.text} opacity-70`}>
              {user.level !== 'platinum'
                ? '60 points to Platinum'
                : 'You have reached our highest tier. Thank you for your loyalty.'}
            </p>
          </div>
        </div>
      </div>

      <div className='max-w-7xl mx-auto px-6 lg:px-8 py-10 grid grid-cols-1 lg:grid-cols-3 gap-8'>
        {/* Left col: Membership benefits */}
        <div className='lg:col-span-1 space-y-6'>
          <div className='bg-card rounded-2xl border border-border/50 p-6'>
            <h2 className='font-serif text-lg font-semibold text-foreground mb-5'>
              Membership Benefits
            </h2>
            <div className='space-y-3'>
              {(['silver', 'gold', 'platinum'] as MemberLevel[]).map(
                (level) => {
                  const isCurrent = user.level === level;
                  const isUnlocked =
                    ['silver', 'gold', 'platinum'].indexOf(level) <=
                    ['silver', 'gold', 'platinum'].indexOf(user.level);
                  return (
                    <div
                      key={level}
                      className={`rounded-xl p-4 border ${isCurrent ? 'border-primary bg-primary/8' : 'border-border bg-secondary/30'}`}
                    >
                      <div className='flex items-center gap-2 mb-1.5'>
                        <span
                          className={`text-xs font-bold uppercase tracking-wider capitalize ${isCurrent ? 'text-primary' : isUnlocked ? 'text-foreground' : 'text-muted-foreground'}`}
                        >
                          {level}
                        </span>
                        {isCurrent && (
                          <span className='text-[10px] bg-primary text-white px-1.5 py-0.5 rounded-full font-semibold'>
                            Current
                          </span>
                        )}
                      </div>
                      <p
                        className={`text-sm font-semibold mb-2 ${isCurrent ? 'text-primary' : isUnlocked ? 'text-accent' : 'text-muted-foreground'}`}
                      >
                        {LEVEL_BENEFITS[level].discount}
                      </p>
                      <div className='flex flex-wrap gap-1.5'>
                        {LEVEL_BENEFITS[level].perks.map((perk) => (
                          <span
                            key={perk}
                            className={`text-[10px] px-2 py-0.5 rounded-full ${isUnlocked ? 'bg-background text-foreground border border-border' : 'bg-border/40 text-muted-foreground'}`}
                          >
                            {perk}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                },
              )}
            </div>
          </div>

          {/* Points history */}
          <div className='bg-card rounded-2xl border border-border/50 p-6'>
            <h2 className='font-serif text-lg font-semibold text-foreground mb-5'>
              Points History
            </h2>
            <div className='space-y-3'>
              {MOCK_POINT_HISTORY.map((entry, i) => (
                <div
                  key={i}
                  className='flex items-center justify-between py-1.5 border-b border-border/40 last:border-0'
                >
                  <div>
                    <p className='text-sm font-medium text-foreground'>
                      {entry.label}
                    </p>
                    <p className='text-xs text-muted-foreground'>
                      {entry.date}
                    </p>
                  </div>
                  <span
                    className={`text-sm font-bold ${entry.type === 'earn' ? 'text-primary' : 'text-muted-foreground'}`}
                  >
                    {entry.type === 'earn' ? '+' : ''}
                    {entry.points}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right col: Order history */}
        <div className='lg:col-span-2'>
          <div className='bg-card rounded-2xl border border-border/50 p-6'>
            <h2 className='font-serif text-lg font-semibold text-foreground mb-6'>
              Order History
            </h2>
            <div className='space-y-3'>
              {MOCK_HISTORY.map((order) => (
                <div
                  key={order.id}
                  className='flex items-center justify-between px-5 py-4 rounded-xl border border-border hover:border-primary/30 hover:bg-secondary/40 transition-colors cursor-pointer group'
                >
                  <div className='flex items-center gap-5'>
                    <div className='w-10 h-10 rounded-full bg-secondary flex items-center justify-center flex-shrink-0'>
                      <span className='font-serif text-xs font-semibold text-muted-foreground'>
                        {order.id.slice(-3)}
                      </span>
                    </div>
                    <div>
                      <p className='text-sm font-semibold text-foreground'>
                        #{order.id}
                      </p>
                      <p className='text-xs text-muted-foreground mt-0.5'>
                        {order.items}
                      </p>
                      <p className='text-xs text-muted-foreground'>
                        {order.date}
                      </p>
                    </div>
                  </div>
                  <div className='flex items-center gap-6'>
                    <div className='text-right'>
                      <p className='text-base font-bold text-accent'>
                        {order.total.toLocaleString('vi-VN')}đ
                      </p>
                      <p className='text-xs text-primary font-medium'>
                        +{order.points} pts
                      </p>
                    </div>
                    <ChevronRight
                      size={16}
                      className='text-muted-foreground group-hover:text-foreground transition-colors'
                    />
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => navigate('home')}
              className='w-full mt-6 py-3.5 border border-border text-muted-foreground rounded-full text-sm font-medium hover:bg-secondary hover:text-foreground transition-colors'
            >
              Place a New Order
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
