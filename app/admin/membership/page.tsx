'use client';

import { useState } from 'react';
import AdminShell from '@/components/admin/AdminShell';
import { Crown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { MEMBER_LEVEL_COLORS, MemberLevel } from '@/lib/admin-data';

interface MemberConfig {
  level: MemberLevel;
  label: string;
  minPoints: number;
  discountPercent: number;
  color: string;
}

const defaultLevels: MemberConfig[] = [
  { level: 'SILVER', label: 'Silver', minPoints: 0, discountPercent: 3, color: '#94a3b8' },
  { level: 'GOLD', label: 'Gold', minPoints: 300, discountPercent: 7, color: '#f59e0b' },
  { level: 'PLATINUM', label: 'Platinum', minPoints: 900, discountPercent: 12, color: '#ec4899' },
];

export default function MembershipPage() {
  const [levels, setLevels] = useState<MemberConfig[]>(defaultLevels);
  const [simulatePoints, setSimulatePoints] = useState('');
  const [simulateOrder, setSimulateOrder] = useState('');

  const updateLevel = (idx: number, field: keyof MemberConfig, value: string | number) => {
    setLevels((prev) =>
      prev.map((l, i) => (i === idx ? { ...l, [field]: value } : l)),
    );
  };

  const simPoints = Number(simulatePoints);
  const currentLevel = [...levels].reverse().find((l) => simPoints >= l.minPoints);
  const pointsEarned = Math.floor(Number(simulateOrder) / 10000);

  return (
    <AdminShell title='Membership'>
      <div className='flex items-center justify-between mb-6'>
        <div>
          <h1 className='font-serif text-xl font-semibold text-foreground'>Membership</h1>
          <p className='text-xs text-muted-foreground mt-0.5'>
            Configure membership levels and benefits
          </p>
        </div>
        <Button size='sm' className='h-8 text-xs'>
          Save Changes
        </Button>
      </div>

      <div className='grid lg:grid-cols-2 gap-4'>
        {/* Level configs */}
        <div className='space-y-4'>
          {levels.map((level, idx) => (
            <div
              key={level.level}
              className='bg-card rounded-xl border border-border shadow-sm overflow-hidden'
            >
              <div
                className='px-5 py-3 flex items-center gap-3 border-b border-border'
                style={{ borderLeftColor: level.color, borderLeftWidth: 3 }}
              >
                <Crown size={14} style={{ color: level.color }} />
                <p className='text-sm font-semibold text-foreground'>{level.label}</p>
                <span
                  className={`ml-auto inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${MEMBER_LEVEL_COLORS[level.level]}`}
                >
                  {level.level}
                </span>
              </div>
              <div className='px-5 py-4 grid grid-cols-2 gap-3'>
                <div>
                  <Label className='text-xs font-medium'>Min Points</Label>
                  <Input
                    type='number'
                    className='h-8 text-xs mt-1.5'
                    value={level.minPoints}
                    onChange={(e) => updateLevel(idx, 'minPoints', Number(e.target.value))}
                    disabled={idx === 0}
                  />
                </div>
                <div>
                  <Label className='text-xs font-medium'>Discount %</Label>
                  <Input
                    type='number'
                    className='h-8 text-xs mt-1.5'
                    value={level.discountPercent}
                    onChange={(e) =>
                      updateLevel(idx, 'discountPercent', Number(e.target.value))
                    }
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Simulator */}
        <div className='space-y-4'>
          <div className='bg-card rounded-xl border border-border shadow-sm p-5'>
            <h2 className='font-serif text-sm font-semibold text-foreground mb-4 pb-2 border-b border-border'>
              Level Simulator
            </h2>
            <div className='space-y-3'>
              <div>
                <Label className='text-xs font-medium'>Customer Points</Label>
                <Input
                  type='number'
                  className='h-8 text-xs mt-1.5'
                  placeholder='e.g. 420'
                  value={simulatePoints}
                  onChange={(e) => setSimulatePoints(e.target.value)}
                />
              </div>

              {simulatePoints && currentLevel && (
                <div
                  className={`px-4 py-3 rounded-lg border text-xs ${MEMBER_LEVEL_COLORS[currentLevel.level]}`}
                >
                  <div className='flex items-center gap-2'>
                    <Crown size={13} />
                    <p className='font-semibold'>{currentLevel.label} Member</p>
                  </div>
                  <p className='mt-1 opacity-80'>
                    {currentLevel.discountPercent}% discount on all orders
                  </p>
                  {(() => {
                    const next = levels.find((l) => l.minPoints > simPoints);
                    return next ? (
                      <p className='mt-1 opacity-70'>
                        {next.minPoints - simPoints} more points to {next.label}
                      </p>
                    ) : null;
                  })()}
                </div>
              )}

              <div className='border-t border-border pt-3'>
                <Label className='text-xs font-medium'>Order Total (VND)</Label>
                <Input
                  type='number'
                  className='h-8 text-xs mt-1.5'
                  placeholder='e.g. 850000'
                  value={simulateOrder}
                  onChange={(e) => setSimulateOrder(e.target.value)}
                />
                {simulateOrder && (
                  <div className='mt-2 px-3 py-2 bg-muted rounded-lg'>
                    <p className='text-xs text-muted-foreground'>
                      Points earned:{' '}
                      <span className='font-semibold text-foreground'>+{pointsEarned} pts</span>
                    </p>
                    <p className='text-[10px] text-muted-foreground mt-0.5'>
                      (1 pt per ₫10,000 spent)
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Level progress */}
          <div className='bg-card rounded-xl border border-border shadow-sm p-5'>
            <h2 className='font-serif text-sm font-semibold text-foreground mb-4 pb-2 border-b border-border'>
              Level Thresholds
            </h2>
            <div className='space-y-3'>
              {levels.map((level, idx) => {
                const next = levels[idx + 1];
                return (
                  <div key={level.level} className='flex items-center gap-3'>
                    <div
                      className='w-3 h-3 rounded-full shrink-0'
                      style={{ background: level.color }}
                    />
                    <div className='flex-1'>
                      <div className='flex justify-between text-xs'>
                        <span className='font-medium text-foreground'>{level.label}</span>
                        <span className='text-muted-foreground'>
                          {level.minPoints}
                          {next ? ` – ${next.minPoints - 1}` : '+'} pts
                        </span>
                      </div>
                      <p className='text-[10px] text-muted-foreground mt-0.5'>
                        {level.discountPercent}% off all orders
                      </p>
                    </div>
                    <ChevronRight size={12} className='text-muted-foreground' />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
