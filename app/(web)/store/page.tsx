import { MapPin, Phone, Clock, Navigation } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cửa hàng | La Douceur',
  description:
    'Thông tin địa chỉ, giờ mở cửa và bản đồ cửa hàng bánh Bánh Kem Phương Loan.',
};

const STORE = {
  name: 'Bánh Kem Phương Loan',
  address: '2QXG+RXV, ĐT624, TT. Chợ Chùa, Nghĩa Hành, Quảng Ngãi, Vietnam',
  phone: '+84 978 780 176',
  hours: '8:00 - 21:00',
  mapEmbed:
    'https://www.google.com/maps?q=15.049699221301797,108.77759515458729&z=16&output=embed',
  directionsUrl:
    'https://www.google.com/maps/dir/?api=1&destination=15.049699221301797,108.77759515458729',
};

export default function StorePage() {
  return (
    <main className='min-h-screen bg-background'>
      {/* Hero */}
      <section className='bg-primary/5 border-b border-primary/10 py-12'>
        <div className='max-w-7xl mx-auto px-4 lg:px-8 text-center'>
          <p className='text-sm font-semibold uppercase tracking-widest text-primary mb-2'>
            Hệ thống cửa hàng
          </p>
          <h1 className='text-3xl md:text-4xl font-bold text-foreground text-balance'>
            Tìm chúng tôi ở đây
          </h1>
          <p className='mt-3 text-muted-foreground text-sm max-w-md mx-auto'>
            Ghé thăm cửa hàng để trải nghiệm hương vị bánh tươi mỗi ngày.
          </p>
        </div>
      </section>

      {/* Content */}
      <section className='max-w-7xl mx-auto px-4 lg:px-8 py-12'>
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-8 items-start'>
          {/* Store info card */}
          <div className='bg-card border border-border rounded-2xl p-8 shadow-sm flex flex-col gap-6'>
            <div>
              <h2 className='text-xl font-bold text-foreground'>{STORE.name}</h2>
              <p className='text-sm text-muted-foreground mt-1'>Cửa hàng duy nhất</p>
            </div>

            <div className='flex flex-col gap-5'>
              {/* Address */}
              <div className='flex gap-3'>
                <span className='mt-0.5 flex-shrink-0 w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center'>
                  <MapPin size={17} className='text-primary' />
                </span>
                <div>
                  <p className='text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-0.5'>
                    Địa chỉ
                  </p>
                  <p className='text-sm text-foreground leading-relaxed'>{STORE.address}</p>
                </div>
              </div>

              {/* Phone */}
              <div className='flex gap-3'>
                <span className='mt-0.5 flex-shrink-0 w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center'>
                  <Phone size={17} className='text-primary' />
                </span>
                <div>
                  <p className='text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-0.5'>
                    Điện thoại
                  </p>
                  <a
                    href={`tel:${STORE.phone}`}
                    className='text-sm text-foreground hover:text-primary transition-colors font-medium'
                  >
                    {STORE.phone}
                  </a>
                </div>
              </div>

              {/* Hours */}
              <div className='flex gap-3'>
                <span className='mt-0.5 flex-shrink-0 w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center'>
                  <Clock size={17} className='text-primary' />
                </span>
                <div>
                  <p className='text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-0.5'>
                    Giờ mở cửa
                  </p>
                  <p className='text-sm text-foreground font-medium'>{STORE.hours}</p>
                  <p className='text-xs text-muted-foreground mt-0.5'>Thứ Hai – Chủ Nhật</p>
                </div>
              </div>
            </div>

            {/* CTA buttons */}
            <div className='flex flex-col sm:flex-row gap-3 pt-2'>
              <a
                href={STORE.directionsUrl}
                target='_blank'
                rel='noopener noreferrer'
                className='flex items-center justify-center gap-2 flex-1 px-4 py-3 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors'
              >
                <Navigation size={15} />
                Chỉ đường
              </a>
              <a
                href={`tel:${STORE.phone}`}
                className='flex items-center justify-center gap-2 flex-1 px-4 py-3 rounded-xl border border-primary text-primary text-sm font-semibold hover:bg-primary/5 transition-colors'
              >
                <Phone size={15} />
                Gọi ngay
              </a>
            </div>
          </div>

          {/* Map */}
          <div className='rounded-2xl overflow-hidden border border-border shadow-sm aspect-[4/3] lg:aspect-auto lg:h-full min-h-[360px]'>
            <iframe
              src={STORE.mapEmbed}
              width='100%'
              height='100%'
              style={{ border: 0, minHeight: '360px' }}
              allowFullScreen
              loading='lazy'
              referrerPolicy='no-referrer-when-downgrade'
              title={`Bản đồ ${STORE.name}`}
            />
          </div>
        </div>
      </section>
    </main>
  );
}
