'use client';

import {
  Crown,
  Star,
  Gift,
  ShoppingBag,
  CheckCircle2,
  ArrowRight,
  Coins,
  Sparkles,
  BadgePercent,
  Truck,
  CalendarDays,
  HeartHandshake,
} from 'lucide-react';
import Link from 'next/link';

/* ─── Tier data ─────────────────────────────────────────── */
const TIERS = [
  {
    key: 'silver',
    label: 'Silver',
    subtitle: 'Hạng Bạc',
    minPoints: 0,
    maxPoints: 299,
    discount: 3,
    icon: Star,
    badgeClass: 'bg-slate-100 text-slate-700 border border-slate-300',
    cardClass:
      'bg-white border-2 border-slate-200 hover:border-slate-400 hover:shadow-lg',
    iconBg: 'bg-slate-100',
    iconColor: 'text-slate-500',
    accentBar: 'bg-slate-400',
    benefits: [
      'Giảm 3% trên mỗi đơn hàng',
      'Tích điểm mỗi lần mua hàng',
      'Nhận thông báo khuyến mãi sớm',
      'Tham gia chương trình sinh nhật',
    ],
  },
  {
    key: 'gold',
    label: 'Gold',
    subtitle: 'Hạng Vàng',
    minPoints: 300,
    maxPoints: 899,
    discount: 7,
    icon: Crown,
    badgeClass: 'bg-amber-100 text-amber-700 border border-amber-300',
    cardClass:
      'bg-amber-50 border-2 border-amber-300 hover:border-amber-500 hover:shadow-lg shadow-amber-100',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    accentBar: 'bg-amber-400',
    featured: true,
    benefits: [
      'Giảm 7% trên mỗi đơn hàng',
      'Tích điểm mỗi lần mua hàng',
      'Ưu tiên giao hàng nhanh miễn phí',
      'Nhận quà sinh nhật đặc biệt',
      'Tham gia sự kiện ra mắt sản phẩm',
      'Hỗ trợ khách hàng ưu tiên',
    ],
  },
  {
    key: 'platinum',
    label: 'Platinum',
    subtitle: 'Hạng Bạch Kim',
    minPoints: 900,
    maxPoints: null,
    discount: 12,
    icon: Sparkles,
    badgeClass: 'bg-rose-100 text-rose-700 border border-rose-300',
    cardClass:
      'bg-rose-50 border-2 border-rose-300 hover:border-rose-500 hover:shadow-lg shadow-rose-100',
    iconBg: 'bg-rose-100',
    iconColor: 'text-rose-500',
    accentBar: 'bg-rose-400',
    benefits: [
      'Giảm 12% trên mỗi đơn hàng',
      'Tích điểm mỗi lần mua hàng',
      'Giao hàng ưu tiên hoàn toàn miễn phí',
      'Quà sinh nhật cao cấp mỗi năm',
      'Thử sản phẩm mới trước khi ra mắt',
      'Tư vấn thiết kế bánh riêng tư',
      'Đường dây hỗ trợ VIP 24/7',
    ],
  },
];

const EARN_STEPS = [
  {
    icon: ShoppingBag,
    title: 'Đặt hàng',
    desc: 'Mua sản phẩm bất kỳ trên website hoặc tại cửa hàng Phương Loan Bakery.',
  },
  {
    icon: Coins,
    title: 'Tích điểm tự động',
    desc: 'Cứ mỗi 10.000đ trong đơn hàng, bạn nhận được 1 điểm thưởng.',
  },
  {
    icon: Crown,
    title: 'Nâng hạng thành viên',
    desc: 'Đạt đủ điểm tích lũy để tự động thăng hạng Silver → Gold → Platinum.',
  },
];

const USE_STEPS = [
  {
    icon: BadgePercent,
    title: 'Giảm giá trực tiếp',
    desc: 'Hạng thành viên của bạn tự động áp dụng mức giảm giá tương ứng cho mỗi đơn hàng.',
  },
  {
    icon: Gift,
    title: 'Đổi điểm lấy quà',
    desc: 'Sử dụng điểm tích lũy để đổi lấy voucher, sản phẩm miễn phí hoặc quà tặng đặc biệt.',
  },
  {
    icon: Truck,
    title: 'Miễn phí vận chuyển',
    desc: 'Thành viên Gold và Platinum được hưởng ưu tiên giao hàng nhanh hoàn toàn miễn phí.',
  },
  {
    icon: CalendarDays,
    title: 'Ưu đãi sinh nhật',
    desc: 'Nhận quà tặng sinh nhật độc quyền tuỳ hạng thành viên mỗi năm một lần.',
  },
];

const JOIN_CONDITIONS = [
  'Đăng ký tài khoản tại Phương Loan Bakery (miễn phí)',
  'Thực hiện ít nhất 1 đơn hàng để kích hoạt hạng Silver',
  'Điểm tích lũy được tính từ ngày tài khoản được tạo',
  'Hạng thành viên được xét lại mỗi năm dựa trên tổng điểm tích lũy',
  'Điểm không có thời hạn sử dụng (trừ khi tài khoản không hoạt động 24 tháng)',
];

/* ─── Component ─────────────────────────────────────────── */
export default function MembershipScreen() {
  return (
    <div className='py-10 space-y-20'>
      {/* Hero */}
      <section className='text-center space-y-5 py-8'>
        <span className='inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-widest'>
          <Crown size={13} />
          Chương trình thành viên
        </span>
        <h1 className='font-serif text-4xl md:text-5xl font-bold text-foreground text-balance leading-tight'>
          Được chăm sóc như một <br className='hidden md:block' />
          <span className='text-primary'>thượng khách</span>
        </h1>
        <p className='text-gray-500 text-base md:text-lg max-w-2xl mx-auto leading-relaxed'>
          Tham gia chương trình thành viên Phương Loan Bakery để nhận ưu đãi độc
          quyền, tích điểm mỗi đơn hàng và thăng hạng để mở khóa những quyền lợi
          cao hơn.
        </p>
        <Link
          href='/auth'
          className='inline-flex items-center gap-2 mt-2 px-7 py-3 bg-primary text-white rounded-full text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm'
        >
          Đăng ký ngay miễn phí
          <ArrowRight size={15} />
        </Link>
      </section>

      {/* Tier cards */}
      <section id='hang-thanh-vien'>
        <div className='text-center mb-10'>
          <h2 className='font-serif text-3xl font-bold text-foreground'>
            Các hạng thành viên
          </h2>
          <p className='text-gray-500 text-sm mt-2'>
            Ba hạng thành viên với quyền lợi ngày càng cao, tự động nâng hạng
            khi bạn tích đủ điểm.
          </p>
        </div>
        <div className='grid md:grid-cols-3 gap-6'>
          {TIERS.map((tier) => {
            const Icon = tier.icon;
            return (
              <div
                key={tier.key}
                className={`relative rounded-2xl p-6 transition-all duration-200 ${tier.cardClass}`}
              >
                {tier.featured && (
                  <span className='absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-400 text-white text-xs font-bold uppercase tracking-widest px-4 py-1 rounded-full shadow'>
                    Phổ biến nhất
                  </span>
                )}

                {/* Top accent bar */}
                <div
                  className={`h-1 w-12 rounded-full ${tier.accentBar} mb-5`}
                />

                <div className='flex items-center gap-3 mb-4'>
                  <div className={`p-2.5 rounded-xl ${tier.iconBg}`}>
                    <Icon size={20} className={tier.iconColor} />
                  </div>
                  <div>
                    <p className='font-serif text-lg font-bold text-foreground'>
                      {tier.label}
                    </p>
                    <p className='text-xs text-gray-500'>{tier.subtitle}</p>
                  </div>
                  <span
                    className={`ml-auto text-xs font-semibold px-3 py-1 rounded-full ${tier.badgeClass}`}
                  >
                    {tier.discount}% off
                  </span>
                </div>

                <p className='text-xs text-gray-500 mb-4 pb-4 border-b border-current/10'>
                  {tier.maxPoints
                    ? `${tier.minPoints.toLocaleString()} – ${tier.maxPoints.toLocaleString()} điểm`
                    : `Từ ${tier.minPoints.toLocaleString()} điểm trở lên`}
                </p>

                <ul className='space-y-2.5'>
                  {tier.benefits.map((b) => (
                    <li
                      key={b}
                      className='flex items-start gap-2 text-sm text-gray-700'
                    >
                      <CheckCircle2
                        size={15}
                        className={`${tier.iconColor} flex-shrink-0 mt-0.5`}
                      />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      {/* Join conditions */}
      <section className='bg-gray-50 rounded-2xl p-8 md:p-10'>
        <div className='flex flex-col md:flex-row gap-8'>
          <div className='md:w-1/3'>
            <span className='inline-flex items-center gap-2 text-primary text-xs font-semibold uppercase tracking-widest mb-3'>
              <HeartHandshake size={14} />
              Điều kiện
            </span>
            <h2 className='font-serif text-2xl font-bold text-foreground leading-snug'>
              Điều kiện trở thành thành viên
            </h2>
            <p className='text-gray-500 text-sm mt-3 leading-relaxed'>
              Tham gia hoàn toàn miễn phí — chỉ cần tạo tài khoản và bắt đầu mua
              sắm.
            </p>
          </div>
          <div className='md:w-2/3'>
            <ul className='space-y-3'>
              {JOIN_CONDITIONS.map((c, i) => (
                <li key={i} className='flex items-start gap-3'>
                  <span className='flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center mt-0.5'>
                    {i + 1}
                  </span>
                  <p className='text-sm text-gray-700 leading-relaxed'>{c}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* How to earn points */}
      <section>
        <div className='text-center mb-10'>
          <h2 className='font-serif text-3xl font-bold text-foreground'>
            Cách tích điểm
          </h2>
          <p className='text-gray-500 text-sm mt-2'>
            Đơn giản, tự động — điểm được cộng ngay sau khi đơn hàng hoàn thành.
          </p>
        </div>
        <div className='grid md:grid-cols-3 gap-6'>
          {EARN_STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <div
                key={i}
                className='relative bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow'
              >
                <div className='flex items-center gap-3 mb-4'>
                  <div className='w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0'>
                    <Icon size={18} className='text-primary' />
                  </div>
                  <span className='text-3xl font-serif font-bold text-gray-100 select-none'>
                    0{i + 1}
                  </span>
                </div>
                <h3 className='font-semibold text-foreground mb-2'>
                  {step.title}
                </h3>
                <p className='text-sm text-gray-500 leading-relaxed'>
                  {step.desc}
                </p>

                {i < EARN_STEPS.length - 1 && (
                  <ArrowRight
                    size={18}
                    className='absolute -right-3 top-1/2 -translate-y-1/2 text-gray-300 hidden md:block'
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Point rate highlight */}
        <div className='mt-8 flex flex-col sm:flex-row gap-4 items-center justify-center bg-primary/5 border border-primary/20 rounded-2xl p-6'>
          <Coins size={28} className='text-primary flex-shrink-0' />
          <div className='text-center sm:text-left'>
            <p className='font-semibold text-foreground'>
              Tỷ lệ tích điểm hiện tại
            </p>
            <p className='text-sm text-gray-500 mt-0.5'>
              <span className='text-primary font-bold text-lg'>10.000đ</span> =
              1 điểm thưởng — áp dụng cho tất cả sản phẩm
            </p>
          </div>
        </div>
      </section>

      {/* How to use points */}
      <section>
        <div className='text-center mb-10'>
          <h2 className='font-serif text-3xl font-bold text-foreground'>
            Cách sử dụng điểm
          </h2>
          <p className='text-gray-500 text-sm mt-2'>
            Điểm tích lũy có thể dùng nhiều cách khác nhau để tối đa hoá quyền
            lợi.
          </p>
        </div>
        <div className='grid sm:grid-cols-2 gap-5'>
          {USE_STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <div
                key={i}
                className='flex gap-4 bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow'
              >
                <div className='w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0'>
                  <Icon size={20} className='text-primary' />
                </div>
                <div>
                  <h3 className='font-semibold text-foreground mb-1'>
                    {step.title}
                  </h3>
                  <p className='text-sm text-gray-500 leading-relaxed'>
                    {step.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section className='text-center bg-primary rounded-2xl py-14 px-6'>
        <Crown size={36} className='text-white/60 mx-auto mb-4' />
        <h2 className='font-serif text-3xl font-bold text-white mb-3 text-balance'>
          Bắt đầu hành trình của bạn ngay hôm nay
        </h2>
        <p className='text-white/70 text-sm max-w-md mx-auto leading-relaxed mb-7'>
          Đăng ký miễn phí, nhận ngay hạng Silver và tích điểm từ đơn hàng đầu
          tiên.
        </p>
        <div className='flex flex-col sm:flex-row gap-3 justify-center'>
          <Link
            href='/auth'
            className='inline-flex items-center justify-center gap-2 px-7 py-3 bg-white text-primary rounded-full text-sm font-semibold hover:bg-white/90 transition-colors shadow'
          >
            Đăng ký thành viên
            <ArrowRight size={15} />
          </Link>
          <Link
            href='/'
            className='inline-flex items-center justify-center gap-2 px-7 py-3 bg-white/10 text-white border border-white/30 rounded-full text-sm font-semibold hover:bg-white/20 transition-colors'
          >
            Khám phá sản phẩm
          </Link>
        </div>
      </section>
    </div>
  );
}
