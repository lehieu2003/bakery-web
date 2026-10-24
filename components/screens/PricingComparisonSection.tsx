'use client';

import Link from 'next/link';
import { CheckCircle2, Minus, ArrowRight } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type PlanKey = 'silver' | 'gold' | 'platinum';

type Plan = {
  key: PlanKey;
  label: string;
  subtitle: string;
  points: string;
  discount: string;
  badge?: string;
  headerClass: string;
  accentClass: string;
  badgeClass: string;
};

type FeatureValue =
  | {
      type: 'included';
      label: string;
    }
  | {
      type: 'unavailable';
      label: string;
    }
  | {
      type: 'text';
      label: string;
    };

type FeatureRow = {
  feature: string;
  values: Record<PlanKey, FeatureValue>;
};

const plans: Plan[] = [
  {
    key: 'silver',
    label: 'Silver',
    subtitle: 'Hạng Bạc',
    points: '0-299 điểm',
    discount: '3% off',
    headerClass: 'bg-slate-50 text-slate-700',
    accentClass: 'bg-slate-400',
    badgeClass: 'border-slate-300 bg-slate-100 text-slate-700',
  },
  {
    key: 'gold',
    label: 'Gold',
    subtitle: 'Hạng Vàng',
    points: '300-899 điểm',
    discount: '7% off',
    badge: 'Phổ biến',
    headerClass: 'bg-amber-50 text-amber-800',
    accentClass: 'bg-amber-400',
    badgeClass: 'border-amber-300 bg-amber-100 text-amber-700',
  },
  {
    key: 'platinum',
    label: 'Platinum',
    subtitle: 'Hạng Bạch Kim',
    points: 'Từ 900 điểm',
    discount: '12% off',
    headerClass: 'bg-rose-50 text-rose-800',
    accentClass: 'bg-rose-400',
    badgeClass: 'border-rose-300 bg-rose-100 text-rose-700',
  },
];

const features: FeatureRow[] = [
  {
    feature: 'Mức điểm tích lũy',
    values: {
      silver: { type: 'text', label: '0-299 điểm' },
      gold: { type: 'text', label: '300-899 điểm' },
      platinum: { type: 'text', label: 'Từ 900 điểm' },
    },
  },
  {
    feature: 'Giảm giá mỗi đơn hàng',
    values: {
      silver: { type: 'text', label: '3%' },
      gold: { type: 'text', label: '7%' },
      platinum: { type: 'text', label: '12%' },
    },
  },
  {
    feature: 'Tích điểm tự động',
    values: {
      silver: { type: 'included', label: 'Silver bao gồm tích điểm tự động' },
      gold: { type: 'included', label: 'Gold bao gồm tích điểm tự động' },
      platinum: {
        type: 'included',
        label: 'Platinum bao gồm tích điểm tự động',
      },
    },
  },
  {
    feature: 'Thông báo khuyến mãi sớm',
    values: {
      silver: {
        type: 'included',
        label: 'Silver nhận thông báo khuyến mãi sớm',
      },
      gold: {
        type: 'included',
        label: 'Gold nhận thông báo khuyến mãi sớm',
      },
      platinum: {
        type: 'included',
        label: 'Platinum nhận thông báo khuyến mãi sớm',
      },
    },
  },
  {
    feature: 'Ưu tiên giao hàng',
    values: {
      silver: {
        type: 'unavailable',
        label: 'Silver chưa bao gồm ưu tiên giao hàng',
      },
      gold: { type: 'text', label: 'Miễn phí' },
      platinum: { type: 'text', label: 'Ưu tiên VIP' },
    },
  },
  {
    feature: 'Quà sinh nhật',
    values: {
      silver: { type: 'text', label: 'Cơ bản' },
      gold: { type: 'text', label: 'Đặc biệt' },
      platinum: { type: 'text', label: 'Cao cấp' },
    },
  },
  {
    feature: 'Sự kiện sản phẩm mới',
    values: {
      silver: {
        type: 'unavailable',
        label: 'Silver chưa bao gồm sự kiện sản phẩm mới',
      },
      gold: {
        type: 'included',
        label: 'Gold bao gồm sự kiện sản phẩm mới',
      },
      platinum: {
        type: 'included',
        label: 'Platinum bao gồm sự kiện sản phẩm mới',
      },
    },
  },
  {
    feature: 'Tư vấn thiết kế bánh riêng',
    values: {
      silver: {
        type: 'unavailable',
        label: 'Silver chưa bao gồm tư vấn thiết kế bánh riêng',
      },
      gold: {
        type: 'unavailable',
        label: 'Gold chưa bao gồm tư vấn thiết kế bánh riêng',
      },
      platinum: {
        type: 'included',
        label: 'Platinum bao gồm tư vấn thiết kế bánh riêng',
      },
    },
  },
  {
    feature: 'Hỗ trợ khách hàng',
    values: {
      silver: { type: 'text', label: 'Tiêu chuẩn' },
      gold: { type: 'text', label: 'Ưu tiên' },
      platinum: { type: 'text', label: 'VIP 24/7' },
    },
  },
];

function FeatureCell({ value }: { value: FeatureValue }) {
  if (value.type === 'included') {
    return (
      <span className='inline-flex items-center justify-center text-primary'>
        <CheckCircle2 size={18} aria-hidden='true' />
        <span className='sr-only'>{value.label}</span>
      </span>
    );
  }

  if (value.type === 'unavailable') {
    return (
      <span className='inline-flex items-center justify-center text-muted-foreground/60'>
        <Minus size={18} aria-hidden='true' />
        <span className='sr-only'>{value.label}</span>
      </span>
    );
  }

  return <span className='font-semibold text-foreground'>{value.label}</span>;
}

export default function PricingComparisonSection() {
  return (
    <section
      className='bg-background px-4 py-16 lg:px-8'
      aria-labelledby='pricing-comparison-heading'
    >
      <div className='mx-auto max-w-6xl'>
        <div className='mx-auto mb-10 max-w-2xl text-center'>
          <p className='mb-3 font-sans text-xs font-light uppercase tracking-[0.25em] text-muted-foreground'>
            Quyền lợi thành viên
          </p>
          <h2
            id='pricing-comparison-heading'
            className='font-serif text-3xl font-bold tracking-wide text-primary text-balance md:text-4xl'
          >
            So sánh các hạng thành viên Phương Loan Bakery
          </h2>
          <p className='mt-4 text-sm leading-relaxed text-muted-foreground'>
            Tích điểm từ mỗi đơn hàng và mở khóa ưu đãi cao hơn khi bạn nâng
            hạng từ Silver đến Platinum.
          </p>
        </div>

        <div className='overflow-hidden rounded-2xl border border-border/40 bg-card shadow-sm'>
          <Table className='min-w-[760px]'>
            <TableHeader>
              <TableRow className='border-border/50 bg-secondary/40 hover:bg-secondary/40'>
                <TableHead className='w-[28%] px-5 py-6 align-bottom font-serif text-base font-semibold text-foreground'>
                  Quyền lợi
                </TableHead>
                {plans.map((plan) => (
                  <TableHead
                    key={plan.key}
                    className={`min-w-40 px-5 py-5 text-center align-top ${plan.headerClass}`}
                  >
                    <div
                      className={`mx-auto mb-3 h-1 w-10 rounded-full ${plan.accentClass}`}
                    />
                    <div className='flex min-h-6 items-center justify-center gap-2'>
                      <span className='font-serif text-lg font-bold'>
                        {plan.label}
                      </span>
                      {plan.badge && (
                        <span className='rounded-full bg-amber-400 px-2.5 py-1 text-xs font-bold uppercase tracking-widest text-white'>
                          {plan.badge}
                        </span>
                      )}
                    </div>
                    <p className='mt-1 text-xs font-normal opacity-75'>
                      {plan.subtitle}
                    </p>
                    <div className='mt-4 space-y-2'>
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${plan.badgeClass}`}
                      >
                        {plan.discount}
                      </span>
                      <p className='text-xs font-medium opacity-80'>
                        {plan.points}
                      </p>
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {features.map((row) => (
                <TableRow
                  key={row.feature}
                  className='border-border/40 hover:bg-secondary/30'
                >
                  <TableCell className='px-5 py-4 font-medium text-foreground whitespace-normal'>
                    {row.feature}
                  </TableCell>
                  {plans.map((plan) => (
                    <TableCell
                      key={`${row.feature}-${plan.key}`}
                      className='px-5 py-4 text-center text-sm'
                    >
                      <FeatureCell value={row.values[plan.key]} />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className='mt-6 flex flex-col items-center justify-between gap-4 rounded-2xl border border-primary/15 bg-primary/5 px-5 py-5 text-center sm:flex-row sm:text-left'>
          <p className='text-sm leading-relaxed text-muted-foreground'>
            Đăng ký miễn phí để bắt đầu tích điểm và nhận ưu đãi thành viên từ
            đơn hàng đầu tiên.
          </p>
          <Link
            href='/thanh-vien'
            className='inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90'
          >
            Xem chương trình
            <ArrowRight size={15} aria-hidden='true' />
          </Link>
        </div>
      </div>
    </section>
  );
}
