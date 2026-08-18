import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Clock, MapPin, Sparkles } from 'lucide-react';
import BestSellersSection from '@/components/screens/BestSellersSection';
import FaqSection from '@/components/screens/FaqSection';
import HomeBannerSection from '@/components/screens/HomeBannerSection';
import HomeMotion from '@/components/screens/HomeMotion';
import PersonalizedSuggestionsSection from '@/components/screens/PersonalizedSuggestionsSection';
import PricingComparisonSection from '@/components/screens/PricingComparisonSection';
import TestimonialsSection from '@/components/screens/TestimonialsSection';
import CategoriesSection from './CategoriesSection';

const visitMoods = [
  {
    title: 'Bánh kem cho ngày đặc biệt',
    description:
      'Chọn mẫu bánh nhanh cho sinh nhật, kỷ niệm, tiệc gia đình và những lời chúc cần đẹp mắt.',
    href: '/store',
    image: '/images/cake-detail.jpg',
    cta: 'Đặt bánh tiệc',
  },
  {
    title: 'Ngồi lại cuối tuần',
    description:
      'Không gian ấm, bánh nướng thơm và đồ uống dùng tại chỗ cho một buổi hẹn nhẹ nhàng.',
    href: '/store',
    image: '/images/bakery-kitchen.jpg',
    cta: 'Xem cửa hàng',
  },
  {
    title: 'Món ngọt mang về',
    description:
      'Cookies, bánh lạnh và set quà nhỏ gọn cho văn phòng, bạn bè hoặc bữa trà chiều.',
    href: '/search',
    image: '/images/cake-2.jpg',
    cta: 'Tìm món phù hợp',
  },
];

const homeHighlights = [
  {
    icon: Sparkles,
    label: 'Bánh mới mỗi ngày',
    value: 'Làm trong ngày',
  },
  {
    icon: MapPin,
    label: 'Dễ ghé tại TP.HCM',
    value: '8 chi nhánh',
  },
  {
    icon: Clock,
    label: 'Nhanh cho dịp gấp',
    value: 'Đặt và lấy gọn',
  },
];

const storyChapters = [
  {
    kicker: '01 / Buổi sáng',
    title: 'Mẻ bánh đầu tiên bắt đầu trước khi phố thức dậy',
    description:
      'Bơ, phô mai và lớp vỏ nướng được chuẩn bị theo từng mẻ nhỏ để bánh lên kệ vẫn còn hương thơm mới.',
    image: '/images/bakery-kitchen.jpg',
    stat: '06:30',
    statLabel: 'bếp bắt đầu nóng',
  },
  {
    kicker: '02 / Quầy bánh',
    title: 'Mỗi vị bánh là một lý do để dừng lại lâu hơn',
    description:
      'Từ bánh nướng phô mai tan chảy đến cookies bơ giòn, từng nhóm sản phẩm được sắp như một hành trình chọn món.',
    image: '/images/cake-1.jpg',
    stat: '120+',
    statLabel: 'lựa chọn mỗi ngày',
  },
  {
    kicker: '03 / Khoảnh khắc',
    title: 'Mang về một hộp bánh, hoặc ở lại cho một cuộc hẹn',
    description:
      'Phương Loan Bakery không chỉ để mua nhanh. Không gian ngồi lại giúp khách biến một món ngọt thành một buổi gặp đáng nhớ.',
    image: '/images/hero-cake.jpg',
    stat: '8',
    statLabel: 'chi nhánh tại TP.HCM',
  },
];

export default function HomeScreen() {
  return (
    <HomeMotion>
      <div className='bg-background'>
        {/* Banner Carousel - full width, breaks out of parent padding */}
        <HomeBannerSection />

        {/* ── Scroll Story ── */}
        <section data-scroll-story className='relative bg-[#2d1913] text-white'>
          <div className='mx-auto grid max-w-7xl gap-10 px-4 py-16 lg:grid-cols-[0.92fr_1.08fr] lg:px-8 lg:py-24'>
            <div className='lg:sticky lg:top-20 lg:h-[calc(100vh-6rem)]'>
              <div className='relative h-[460px] overflow-hidden rounded-lg bg-[#1f100c] shadow-2xl shadow-black/30 lg:h-full'>
                {storyChapters.map((chapter, index) => (
                  <div
                    key={chapter.title}
                    data-story-visual={`${index}`}
                    className='absolute inset-0 opacity-0 transition duration-700 data-[active=true]:opacity-100'
                  >
                    <Image
                      src={chapter.image}
                      alt={chapter.title}
                      fill
                      className='object-cover'
                      sizes='(max-width: 1024px) 100vw, 50vw'
                    />
                    <div className='absolute inset-0 bg-[linear-gradient(180deg,rgba(20,9,6,0.12),rgba(20,9,6,0.78))]' />
                  </div>
                ))}

                <div className='absolute left-6 top-6 z-10 rounded-full border border-white/20 bg-white/12 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#f3cfa8] backdrop-blur'>
                  Phương Loan Bakery story
                </div>

                <div className='absolute bottom-6 left-6 right-6 z-10 grid gap-3 sm:grid-cols-3'>
                  {storyChapters.map((chapter, index) => (
                    <div
                      key={chapter.statLabel}
                      data-story-visual={`${index}`}
                      className='border-t border-white/20 pt-3 opacity-45 transition duration-500 data-[active=true]:opacity-100'
                    >
                      <p className='font-serif text-3xl font-semibold text-[#f3cfa8]'>
                        {chapter.stat}
                      </p>
                      <p className='mt-1 text-xs uppercase tracking-[0.16em] text-white/70'>
                        {chapter.statLabel}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className='space-y-6 lg:py-[18vh]'>
              <div className='mb-6 max-w-2xl lg:mb-16'>
                <h2 className='mt-4 font-serif text-4xl font-semibold leading-tight text-balance md:text-6xl'>
                  Đi theo một ngày trong tiệm bánh
                </h2>
              </div>

              {storyChapters.map((chapter, index) => (
                <article
                  key={chapter.title}
                  data-story-step={`${index}`}
                  className='min-h-[62vh] border-l border-white/15 pl-6 opacity-45 transition duration-500 data-[active=true]:border-[#f3cfa8] data-[active=true]:opacity-100 lg:pl-8'
                >
                  <p className='text-xs font-semibold uppercase tracking-[0.26em] text-[#f3cfa8]'>
                    {chapter.kicker}
                  </p>
                  <h3 className='mt-4 max-w-2xl font-serif text-3xl font-semibold leading-tight text-balance md:text-5xl'>
                    {chapter.title}
                  </h3>
                  <p className='mt-5 max-w-xl text-base leading-8 text-white/72'>
                    {chapter.description}
                  </p>
                  <Link
                    href={index === 2 ? '/store' : '/search'}
                    className='mt-7 inline-flex items-center gap-2 text-sm font-semibold text-[#f3cfa8] transition hover:text-white'
                  >
                    Khám phá tiếp
                    <ArrowRight size={16} />
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ── Exploration Hook ── */}
        <section
          data-home-reveal
          className='relative overflow-hidden bg-[#fffaf3] px-4 py-14 lg:px-8 lg:py-18'
        >
          <div className='mx-auto max-w-7xl'>
            <div className='grid gap-8 lg:grid-cols-[0.78fr_1.22fr] lg:items-end'>
              <div>
                <p className='text-xs font-semibold uppercase tracking-[0.28em] text-primary/70'>
                  Chọn trải nghiệm trước
                </p>
                <h2 className='mt-3 font-serif text-3xl font-semibold leading-tight text-primary text-balance md:text-5xl'>
                  Hôm nay bạn ghé Phương Loan Bakery vì điều gì?
                </h2>
                <p className='mt-5 max-w-xl text-sm leading-7 text-foreground/70 md:text-base'>
                  Đưa khách vào đúng nhu cầu ngay từ đầu: đặt bánh, ngồi lại thư
                  giãn, hay mua một món ngọt mang về. Mỗi lối vào đều dẫn đến
                  nội dung có thể mua hoặc khám phá tiếp.
                </p>
              </div>

              <div className='grid gap-3 sm:grid-cols-3'>
                {homeHighlights.map(({ icon: Icon, label, value }) => (
                  <div
                    key={label}
                    className='flex items-center gap-3 border-l border-primary/20 bg-white/70 px-4 py-3 shadow-sm shadow-primary/5'
                  >
                    <span className='flex size-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary'>
                      <Icon size={18} />
                    </span>
                    <span>
                      <span className='block text-sm font-semibold text-primary'>
                        {value}
                      </span>
                      <span className='block text-xs text-muted-foreground'>
                        {label}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className='mt-10 grid gap-4 lg:grid-cols-3'>
              {visitMoods.map((mood, index) => (
                <Link
                  key={mood.title}
                  href={mood.href}
                  className='group relative isolate min-h-[340px] overflow-hidden rounded-lg bg-primary text-white shadow-xl shadow-primary/10'
                  data-home-card
                >
                  <Image
                    src={mood.image}
                    alt={mood.title}
                    fill
                    className='object-cover transition duration-700 group-hover:scale-105'
                    sizes='(max-width: 1024px) 100vw, 33vw'
                  />
                  <div className='absolute inset-0 bg-[linear-gradient(180deg,rgba(42,22,15,0.08),rgba(42,22,15,0.88))]' />
                  <div className='relative z-10 flex h-full min-h-[340px] flex-col justify-end p-6'>
                    <span className='mb-4 inline-flex w-fit items-center rounded-full border border-white/25 bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white backdrop-blur'>
                      0{index + 1}
                    </span>
                    <h3 className='font-serif text-2xl font-semibold leading-tight text-balance'>
                      {mood.title}
                    </h3>
                    <p className='mt-3 text-sm leading-6 text-white/78'>
                      {mood.description}
                    </p>
                    <span className='mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#f3cfa8]'>
                      {mood.cta}
                      <ArrowRight
                        size={16}
                        className='transition-transform group-hover:translate-x-1'
                      />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ── Best Sellers ── */}
        <BestSellersSection />

        {/* ── Personalized Suggestions ── */}
        <div data-home-reveal>
          <PersonalizedSuggestionsSection />
        </div>

        {/* ── Categories ── */}
        <CategoriesSection />

        {/* ── Phương Loan Bakery – About section ── */}
        <section data-home-reveal className='px-4 lg:px-8 py-16 bg-[#faf8f5]'>
          <div className='max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center'>
            {/* Text side */}
            <div className='order-2 lg:order-1'>
              <p className='text-xs tracking-[0.25em] uppercase text-muted-foreground font-sans font-light mb-3'>
                Chuỗi tiệm bánh kết hợp không gian F&B tại TP.HCM
              </p>
              <h2 className='font-serif text-2xl lg:text-3xl font-semibold text-primary leading-snug mb-6 text-balance'>
                Phương Loan Bakery – TIỆM BÁNH NGON Ở SÀI GÒN VỚI KHÔNG GIAN ĂN
                UỐNG THOẢI MÁI
              </h2>
              <div className='space-y-4 text-sm text-foreground leading-relaxed'>
                <p>
                  Phương Loan Bakery là{' '}
                  <strong>tiệm bánh ngon ở Sài Gòn</strong> được nhiều khách
                  hàng lựa chọn nhờ sự kết hợp hài hòa giữa bánh chất lượng,
                  nước uống đa dạng và{' '}
                  <strong>không gian ngồi lại thoải mái</strong>. Với hệ thống{' '}
                  <strong>8 chi nhánh tại TP.HCM</strong>, Phương Loan Bakery
                  không chỉ là nơi mua bánh mang đi mà còn là điểm hẹn quen
                  thuộc cho gia đình, nhóm bạn hay những buổi gặp gỡ cuối tuần.
                </p>
                <p>
                  Các dòng bánh nổi bật tại Phương Loan Bakery gồm{' '}
                  <strong>bánh nướng phô mai tan chảy – best seller</strong>,
                  bánh cookies đa dạng và bánh lạnh nhẹ nhàng như su kem,
                  tiramisu, panna cotta. Bên cạnh đó, menu{' '}
                  <strong>nước uống dùng tại chỗ</strong> giúp trải nghiệm
                  thưởng thức bánh trở nên trọn vẹn và thư giãn hơn.
                </p>
                <p>
                  Nhờ không gian hiện đại, dễ chịu cùng menu phong phú, La
                  Douceur dần trở thành{' '}
                  <strong>tiệm bánh ngon tại TP.HCM</strong> phù hợp cho nhiều
                  nhu cầu: ăn nhẹ, trò chuyện, hẹn hò hay đưa trẻ nhỏ đi chơi
                  cuối tuần.
                </p>
              </div>
            </div>
            {/* Image side */}
            <div
              data-home-float
              className='order-1 lg:order-2 relative aspect-[4/3] overflow-hidden rounded-[28px] shadow-2xl shadow-primary/10 ring-1 ring-primary/10'
            >
              <Image
                src='/images/bakery-kitchen.jpg'
                alt='Đội ngũ thợ làm bánh Phương Loan Bakery đang làm việc trong bếp bánh chuyên nghiệp'
                fill
                className='object-cover'
                sizes='(max-width: 1024px) 100vw, 50vw'
              />
            </div>
          </div>
        </section>

        {/* ── Parallax Stats Banner ── */}
        <section
          data-home-reveal
          className='relative w-full py-20 overflow-hidden'
          style={{
            backgroundImage: "url('/images/stats-bg.jpg')",
            backgroundAttachment: 'fixed',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          {/* Dark overlay */}
          <div className='absolute inset-0 bg-black/60' />
          <div className='relative z-10 max-w-4xl mx-auto px-4 lg:px-8'>
            <div className='grid grid-cols-1 md:grid-cols-3 gap-10 text-center text-white'>
              {/* Stat 1 */}
              <div data-home-card className='flex flex-col items-center gap-3'>
                <svg
                  width='56'
                  height='56'
                  viewBox='0 0 56 56'
                  fill='none'
                  xmlns='http://www.w3.org/2000/svg'
                  className='opacity-90'
                  aria-hidden='true'
                >
                  <rect
                    x='8'
                    y='12'
                    width='40'
                    height='32'
                    rx='2'
                    stroke='white'
                    strokeWidth='2'
                  />
                  <path
                    d='M8 20h40M18 12v8M38 12v8'
                    stroke='white'
                    strokeWidth='2'
                  />
                  <path
                    d='M16 28h8M16 34h16'
                    stroke='white'
                    strokeWidth='2'
                    strokeLinecap='round'
                  />
                </svg>
                <div>
                  <p className='text-4xl font-bold text-[#e8c49a]'>+ 120</p>
                  <p className='text-xs tracking-[0.2em] uppercase mt-1 text-white/80'>
                    Loại bánh
                  </p>
                </div>
              </div>
              {/* Stat 2 */}
              <div data-home-card className='flex flex-col items-center gap-3'>
                <svg
                  width='56'
                  height='56'
                  viewBox='0 0 56 56'
                  fill='none'
                  xmlns='http://www.w3.org/2000/svg'
                  className='opacity-90'
                  aria-hidden='true'
                >
                  <circle
                    cx='28'
                    cy='16'
                    r='8'
                    stroke='white'
                    strokeWidth='2'
                  />
                  <path
                    d='M14 44c0-7.732 6.268-14 14-14s14 6.268 14 14'
                    stroke='white'
                    strokeWidth='2'
                    strokeLinecap='round'
                  />
                  <path
                    d='M28 30v6M24 36h8'
                    stroke='white'
                    strokeWidth='2'
                    strokeLinecap='round'
                  />
                </svg>
                <div>
                  <p className='text-4xl font-bold text-[#e8c49a]'>+ 1000</p>
                  <p className='text-xs tracking-[0.2em] uppercase mt-1 text-white/80'>
                    Khách hàng mỗi ngày
                  </p>
                </div>
              </div>
              {/* Stat 3 */}
              <div data-home-card className='flex flex-col items-center gap-3'>
                <svg
                  width='56'
                  height='56'
                  viewBox='0 0 56 56'
                  fill='none'
                  xmlns='http://www.w3.org/2000/svg'
                  className='opacity-90'
                  aria-hidden='true'
                >
                  <path
                    d='M28 10c-8 0-14 5-14 12 0 5 3 9 8 11v5h12v-5c5-2 8-6 8-11 0-7-6-12-14-12z'
                    stroke='white'
                    strokeWidth='2'
                  />
                  <path
                    d='M22 38h12M24 43h8'
                    stroke='white'
                    strokeWidth='2'
                    strokeLinecap='round'
                  />
                  <path
                    d='M22 24l4 4 8-8'
                    stroke='white'
                    strokeWidth='2'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                  />
                </svg>
                <div>
                  <p className='text-4xl font-bold text-[#e8c49a]'>+ 10</p>
                  <p className='text-xs tracking-[0.2em] uppercase mt-1 text-white/80'>
                    Năm kinh nghiệm
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Testimonials Masonry ── */}
        <TestimonialsSection />

        {/* ── Membership Pricing Comparison ── */}
        <div data-home-reveal>
          <PricingComparisonSection />
        </div>

        {/* ── FAQ Accordion ── */}
        <div data-home-reveal>
          <FaqSection />
        </div>
      </div>
    </HomeMotion>
  );
}
