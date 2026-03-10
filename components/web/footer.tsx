import Link from 'next/link';
import {
  MapPin,
  Phone,
  Mail,
  Instagram,
  Facebook,
  Youtube,
  ArrowRight,
} from 'lucide-react';

const footerLinks = {
  explore: [
    { label: 'Bánh sinh nhật', href: '/categories/banh-sinh-nhat' },
    { label: 'Bánh cưới', href: '/categories/banh-cuoi' },
    { label: 'Bánh mousse', href: '/categories/banh-mousse' },
    { label: 'Bánh theo mùa', href: '/categories/banh-theo-mua' },
    { label: 'Tất cả sản phẩm', href: '/cakes' },
  ],
  info: [
    { label: 'Về chúng tôi', href: '#' },
    { label: 'Chính sách giao hàng', href: '#' },
    { label: 'Chính sách đổi trả', href: '#' },
    { label: 'Điều khoản sử dụng', href: '#' },
    { label: 'Chính sách bảo mật', href: '#' },
  ],
};

const socialLinks = [
  {
    label: 'Instagram',
    href: '#',
    icon: Instagram,
  },
  {
    label: 'Facebook',
    href: '#',
    icon: Facebook,
  },
  {
    label: 'YouTube',
    href: '#',
    icon: Youtube,
  },
];

export default function WebFooter() {
  return (
    <footer className='bg-[#2a1a14] text-[#f5ebe4]'>
      {/* Newsletter banner */}
      <div className='border-b border-white/10'>
        <div className='max-w-7xl mx-auto px-6 lg:px-8 py-10 flex flex-col md:flex-row items-center justify-between gap-6'>
          <div>
            <p className='font-serif text-xl font-semibold text-white text-balance'>
              Nhận ưu đãi & công thức bánh mỗi tuần
            </p>
            <p className='text-sm text-[#c9a89a] mt-1'>
              Đăng ký nhận bản tin để không bỏ lỡ bộ sưu tập mới nhất.
            </p>
          </div>
          <form
            className='flex w-full md:w-auto gap-2'
            onSubmit={(e) => e.preventDefault()}
          >
            <input
              type='email'
              placeholder='Địa chỉ email của bạn'
              aria-label='Email đăng ký nhận bản tin'
              className='flex-1 md:w-72 px-4 py-2.5 rounded-md bg-white/10 border border-white/20 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/40 transition-colors'
            />
            <button
              type='submit'
              className='flex items-center gap-2 px-5 py-2.5 rounded-md bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors shrink-0'
            >
              Đăng ký
              <ArrowRight size={15} />
            </button>
          </form>
        </div>
      </div>

      {/* Main footer columns */}
      <div className='max-w-7xl mx-auto px-6 lg:px-8 py-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10'>
        {/* Brand column */}
        <div className='lg:col-span-1'>
          <Link href='/' aria-label='La Douceur home'>
            <p
              className='font-serif text-2xl font-bold text-white tracking-tight'
              style={{ fontFamily: 'Georgia, serif' }}
            >
              La Douceur
            </p>
            <p className='text-[10px] tracking-widest text-[#c9a89a] uppercase font-light mt-0.5'>
              Artisan Bakery
            </p>
          </Link>
          <p className='text-sm text-[#c9a89a] leading-relaxed mt-5 text-pretty'>
            Mỗi chiếc bánh là một tác phẩm nghệ thuật — được làm thủ công từ
            những nguyên liệu tươi ngon nhất, gửi gắm tình yêu vào từng lớp
            kem.
          </p>

          {/* Social links */}
          <div className='flex items-center gap-3 mt-6'>
            {socialLinks.map(({ label, href, icon: Icon }) => (
              <a
                key={label}
                href={href}
                aria-label={label}
                className='w-9 h-9 rounded-full border border-white/20 flex items-center justify-center text-[#c9a89a] hover:border-primary hover:text-primary transition-colors'
              >
                <Icon size={16} />
              </a>
            ))}
          </div>
        </div>

        {/* Explore links */}
        <div>
          <p className='text-xs font-semibold uppercase tracking-widest text-[#c9a89a] mb-5'>
            Khám phá
          </p>
          <ul className='space-y-3'>
            {footerLinks.explore.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className='text-sm text-[#f5ebe4]/80 hover:text-white transition-colors'
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Info links */}
        <div>
          <p className='text-xs font-semibold uppercase tracking-widest text-[#c9a89a] mb-5'>
            Thông tin
          </p>
          <ul className='space-y-3'>
            {footerLinks.info.map((link) => (
              <li key={link.label}>
                <Link
                  href={link.href}
                  className='text-sm text-[#f5ebe4]/80 hover:text-white transition-colors'
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Contact */}
        <div>
          <p className='text-xs font-semibold uppercase tracking-widest text-[#c9a89a] mb-5'>
            Liên hệ
          </p>
          <ul className='space-y-4'>
            <li>
              <a
                href='tel:19007799'
                className='flex items-start gap-3 text-sm text-[#f5ebe4]/80 hover:text-white transition-colors group'
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
                className='flex items-start gap-3 text-sm text-[#f5ebe4]/80 hover:text-white transition-colors group'
              >
                <Mail
                  size={15}
                  className='text-primary mt-0.5 shrink-0 group-hover:scale-110 transition-transform'
                />
                <span>hello@ladouceur.vn</span>
              </a>
            </li>
            <li>
              <div className='flex items-start gap-3 text-sm text-[#f5ebe4]/80'>
                <MapPin
                  size={15}
                  className='text-primary mt-0.5 shrink-0'
                />
                <span className='leading-relaxed'>
                  123 Đường Nguyễn Huệ,
                  <br />
                  Quận 1, TP. Hồ Chí Minh
                </span>
              </div>
            </li>
            <li className='text-sm text-[#f5ebe4]/80'>
              <span className='text-[#c9a89a] text-xs uppercase tracking-wider font-medium'>
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
          <p className='text-xs text-[#c9a89a]'>
            &copy; {new Date().getFullYear()} La Douceur Artisan Bakery. All
            rights reserved.
          </p>
          <p className='text-xs text-[#c9a89a]/60 italic font-serif'>
            Handcrafted with love in Saigon
          </p>
        </div>
      </div>
    </footer>
  );
}
