import { Star } from 'lucide-react';

type Testimonial = {
  name: string;
  context: string;
  quote: string;
  rating: number;
};

const testimonials: Testimonial[] = [
  {
    name: 'Minh Anh',
    context: 'Sinh nhật gia đình',
    quote:
      'Bánh kem phô mai rất thơm, vị ngọt vừa phải nên cả nhà ai cũng ăn được. Mình đặt hơi gấp nhưng bánh vẫn được chuẩn bị chỉn chu và giao đúng giờ.',
    rating: 5,
  },
  {
    name: 'Hoàng Nam',
    context: 'Hẹn cà phê cuối tuần',
    quote:
      'Không gian dễ chịu, bánh lạnh nhẹ vị và cà phê hợp gu. Đây là chỗ mình hay ghé khi cần một buổi chiều yên tĩnh để gặp bạn.',
    rating: 5,
  },
  {
    name: 'Thu Hà',
    context: 'Tiệc công ty',
    quote:
      'Đội ngũ tư vấn rất kỹ về số lượng bánh cho tiệc. Set bánh mini nhìn đẹp, dễ chia phần và vẫn giữ được độ tươi khi mang đến văn phòng.',
    rating: 5,
  },
  {
    name: 'Gia Hân',
    context: 'Bánh tặng mẹ',
    quote:
      'Mình thích cách Phương Loan Bakery trang trí tinh tế, không quá cầu kỳ nhưng nhìn rất sang. Mẹ mình khen phần kem mịn và không bị ngấy.',
    rating: 5,
  },
  {
    name: 'Quốc Bảo',
    context: 'Mua mang đi',
    quote:
      'Cookies đóng gói đẹp, giòn và thơm bơ. Mỗi lần ghé đều có thêm vài món mới để thử, nhân viên cũng giới thiệu rất nhiệt tình.',
    rating: 4,
  },
  {
    name: 'Phương Linh',
    context: 'Gặp bạn sau giờ làm',
    quote:
      'Điểm mình thích nhất là cảm giác rất thoải mái khi ngồi lại. Bánh đẹp, nước uống ổn định, bàn ghế và ánh sáng đều hợp để trò chuyện lâu.',
    rating: 5,
  },
];

function RatingStars({ rating }: { rating: number }) {
  return (
    <div
      className='flex items-center gap-1'
      aria-label={`${rating} trên 5 sao`}
    >
      {Array.from({ length: 5 }).map((_, index) => {
        const isFilled = index < rating;

        return (
          <Star
            key={index}
            size={14}
            className={
              isFilled ? 'fill-amber-400 text-amber-400' : 'text-border'
            }
            aria-hidden='true'
          />
        );
      })}
    </div>
  );
}

export default function TestimonialsSection() {
  return (
    <section
      data-home-reveal
      className='bg-surface-soft px-4 py-16 lg:px-8'
      aria-labelledby='testimonials-heading'
    >
      <div className='mx-auto max-w-6xl'>
        <div className='mx-auto mb-10 max-w-2xl text-center'>
          <p className='mb-3 font-sans text-xs font-light uppercase tracking-[0.25em] text-muted-foreground'>
            Cảm nhận khách hàng
          </p>
          <h2
            id='testimonials-heading'
            className='font-serif text-3xl font-bold tracking-wide text-primary text-balance md:text-4xl'
          >
            Những lời nhắn gửi từ khách hàng Phương Loan Bakery
          </h2>
        </div>

        <div
          className='columns-1 gap-4 sm:columns-2 lg:columns-3'
          role='list'
          aria-label='Cảm nhận khách hàng Phương Loan Bakery'
        >
          {testimonials.map((testimonial) => (
            <article
              key={`${testimonial.name}-${testimonial.context}`}
              data-home-card
              className='mb-4 break-inside-avoid rounded-2xl border border-border/40 bg-card p-6 shadow-sm transition-shadow hover:shadow-md'
              role='listitem'
            >
              <div className='mb-5 flex items-center justify-between gap-4'>
                <span className='rounded-full border border-primary/10 bg-secondary px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary'>
                  {testimonial.context}
                </span>
                <RatingStars rating={testimonial.rating} />
              </div>

              <p className='text-sm leading-relaxed text-foreground text-pretty'>
                &ldquo;{testimonial.quote}&rdquo;
              </p>

              <div className='mt-6 border-t border-border/50 pt-4'>
                <p className='font-serif text-base font-semibold text-primary'>
                  {testimonial.name}
                </p>
                <p className='mt-1 text-xs text-muted-foreground'>
                  Khách hàng Phương Loan Bakery
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
