'use client';

import Link from 'next/link';
import {
  MapPin,
  Phone,
  Mail,
  Instagram,
  Facebook,
  Youtube,
} from 'lucide-react';
import NewsletterForm from './newsletter-form';
import { useCategories } from '@/hooks/use-products';
import { categoryHrefFromTrail } from '@/lib/category-path';

const infoLinks = [
  { label: 'Về chúng tôi', href: '/ve-chung-toi' },
  { label: 'Chính sách giao hàng', href: '/chinh-sach-giao-hang' },
  { label: 'Chính sách đổi trả', href: '/chinh-sach-doi-tra' },
  { label: 'Điều khoản sử dụng', href: '/dieu-khoan-su-dung' },
  { label: 'Chính sách bảo mật', href: '/chinh-sach-bao-mat' },
];

const socialLinks = [
  { label: 'Instagram', href: '#', icon: Instagram },
  { label: 'Facebook', href: '#', icon: Facebook },
  { label: 'YouTube', href: '#', icon: Youtube },
];

export default function WebFooter() {
  const { data: categoriesData } = useCategories();

  // Flatten to at most 6 root categories for the "Khám phá" column
  const exploreLinks = (categoriesData || []).slice(0, 6).map((cat) => ({
    label: cat.name,
    href: categoryHrefFromTrail([cat]),
  }));

  // Fallback static links while loading
  const displayLinks =
    exploreLinks.length > 0
      ? exploreLinks
      : [
          { label: 'Bánh sinh nhật', href: '/categories/banh-sinh-nhat' },
          { label: 'Bánh cưới', href: '/categories/banh-cuoi' },
          { label: 'Bánh mousse', href: '/categories/banh-mousse' },
          { label: 'Tất cả sản phẩm', href: '/search' },
        ];

  return (
    <footer className='bg-[#3d1a0f] text-[#f5ebe4]'>
      {/* Newsletter banner */}
      <div className='border-b border-white/10'>
        <div className='max-w-7xl mx-auto px-6 lg:px-8 py-10 flex flex-col md:flex-row items-center justify-between gap-6'>
          <div>
            <p className='font-serif text-xl font-semibold text-white text-balance'>
              Nhận ưu đãi &amp; công thức bánh mỗi tuần
            </p>
            <p className='text-sm text-primary/80 mt-1'>
              Đăng ký nhận bản tin để không bỏ lỡ bộ sưu tập mới nhất.
            </p>
          </div>
          <NewsletterForm />
        </div>
      </div>

      {/* Main footer columns */}
      <div className='max-w-7xl mx-auto px-6 lg:px-8 py-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10'>
        {/* Brand column */}
        <div className='lg:col-span-1'>
          <Link href='/' aria-label='Phương Loan Bakery home'>
            <p
              className='font-serif text-2xl font-bold text-white tracking-tight'
              style={{ fontFamily: 'Georgia, serif' }}
            >
              Phương Loan Bakery
            </p>
            <p className='text-[10px] tracking-widest text-primary/70 uppercase font-light mt-0.5'>
              Artisan Bakery
            </p>
          </Link>
          <p className='text-sm text-[#f5ebe4]/70 leading-relaxed mt-5 text-pretty'>
            Mỗi chiếc bánh là một tác phẩm nghệ thuật — được làm thủ công từ
            những nguyên liệu tươi ngon nhất, gửi gắm tình yêu vào từng lớp kem.
          </p>

          {/* Social links */}
          <div className='flex items-center gap-3 mt-6'>
            {socialLinks.map(({ label, href, icon: Icon }) => (
              <a
                key={label}
                href={href}
                aria-label={label}
                className='w-9 h-9 rounded-full border border-white/20 flex items-center justify-center text-primary/70 hover:border-primary hover:text-primary transition-colors'
              >
                <Icon size={16} />
              </a>
            ))}
          </div>
        </div>

        {/* Explore links — dynamic from API */}
        <div>
          <p className='text-xs font-semibold uppercase tracking-widest text-primary/70 mb-5'>
            Khám phá
          </p>
          <ul className='space-y-3'>
            {displayLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className='text-sm text-[#f5ebe4]/75 hover:text-white transition-colors'
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href='/search'
                className='text-sm text-primary hover:text-primary/80 transition-colors font-medium'
              >
                Tất cả sản phẩm →
              </Link>
            </li>
          </ul>
        </div>

        {/* Info links */}
        <div>
          <p className='text-xs font-semibold uppercase tracking-widest text-primary/70 mb-5'>
            Thông tin
          </p>
          <ul className='space-y-3'>
            {infoLinks.map((link) => (
              <li key={link.label}>
                <Link
                  href={link.href}
                  className='text-sm text-[#f5ebe4]/75 hover:text-white transition-colors'
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Contact */}
        <div>
          <p className='text-xs font-semibold uppercase tracking-widest text-primary/70 mb-5'>
            Liên hệ
          </p>
          <ul className='space-y-4'>
            <li>
              <a
                href='tel:19007799'
                className='flex items-start gap-3 text-sm text-[#f5ebe4]/75 hover:text-white transition-colors group'
              >
                <Phone
                  size={15}
                  className='text-primary mt-0.5 shrink-0 group-hover:scale-110 transition-transform'
                />
                <span>1900 779907</span>
              </a>
            </li>
            <li>
              <a
                href='mailto:hello@ladouceur.vn'
                className='flex items-start gap-3 text-sm text-[#f5ebe4]/75 hover:text-white transition-colors group'
              >
                <Mail
                  size={15}
                  className='text-primary mt-0.5 shrink-0 group-hover:scale-110 transition-transform'
                />
                <span>hello@ladouceur.vn</span>
              </a>
            </li>
            <li>
              <div className='flex items-start gap-3 text-sm text-[#f5ebe4]/75'>
                <MapPin size={15} className='text-primary mt-0.5 shrink-0' />
                <span className='leading-relaxed'>
                  123 Đường Nguyễn Huệ,
                  <br />
                  Quận 1, TP. Hồ Chí Minh
                </span>
              </div>
            </li>
            <li className='text-sm text-[#f5ebe4]/75'>
              <span className='text-primary/70 text-xs uppercase tracking-wider font-medium'>
                Giờ mở cửa
              </span>
              <p className='mt-1'>Thứ 2 – Chủ nhật: 8:00 – 21:00</p>
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom bar */}
      <div className='border-t border-white/10'>
        <div className='max-w-7xl mx-auto px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3'>
          <p className='text-xs text-[#f5ebe4]/50'>
            &copy; {new Date().getFullYear()} Phương Loan Bakery Artisan Bakery.
            All rights reserved.
          </p>
          <p className='text-xs text-[#f5ebe4]/40 italic font-serif'>
            Handcrafted with love in Saigon
          </p>
        </div>
      </div>
    </footer>
  );
}
