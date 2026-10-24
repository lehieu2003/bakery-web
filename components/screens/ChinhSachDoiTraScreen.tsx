import { RefreshCw, CheckCircle, XCircle, Phone, Info } from 'lucide-react';

const acceptedCases = [
  'Sản phẩm bị hư hỏng, biến dạng do lỗi đóng gói hoặc vận chuyển.',
  'Sản phẩm không đúng mô tả, không đúng hương vị hoặc kích cỡ đã đặt.',
  'Sản phẩm thiếu hàng so với đơn đặt.',
  'Sản phẩm có dấu hiệu ôi thiu, mốc hoặc bất thường về mùi vị khi nhận hàng.',
];

const rejectedCases = [
  'Sản phẩm đã được mở ra và sử dụng một phần.',
  'Khiếu nại sau 2 tiếng kể từ thời điểm nhận hàng mà không có bằng chứng kèm theo.',
  'Sản phẩm bị hư hỏng do bảo quản không đúng cách sau khi nhận.',
  'Thay đổi ý kiến cá nhân về hương vị hoặc thiết kế đã được xác nhận khi đặt hàng.',
];

const steps = [
  {
    step: '01',
    title: 'Chụp ảnh sản phẩm',
    description:
      'Chụp ảnh rõ ràng sản phẩm bị lỗi ngay khi nhận hàng, bao gồm cả hộp đựng và tình trạng bên trong.',
  },
  {
    step: '02',
    title: 'Liên hệ Phương Loan Bakery',
    description:
      'Gọi hotline 1900 779907 hoặc nhắn tin Zalo/Facebook kèm ảnh chụp và mã đơn hàng trong vòng 2 tiếng.',
  },
  {
    step: '03',
    title: 'Xác nhận & xử lý',
    description:
      'Đội ngũ chăm sóc khách hàng sẽ xem xét và phản hồi trong vòng 30 phút. Phương án đổi/trả sẽ được thống nhất.',
  },
  {
    step: '04',
    title: 'Nhận sản phẩm mới',
    description:
      'Sản phẩm thay thế sẽ được giao trong vòng 2 – 4 tiếng (tại Quảng Ngãi) hoặc theo lịch giao gần nhất.',
  },
];

export default function ChinhSachDoiTraScreen() {
  return (
    <div className='font-sans py-8'>
      {/* Page header */}
      <div className='mb-10'>
        <div className='flex items-center gap-3 mb-3'>
          <div className='w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center'>
            <RefreshCw size={20} className='text-primary' />
          </div>
          <p className='text-xs tracking-[0.2em] uppercase text-muted-foreground font-medium'>
            Thông tin
          </p>
        </div>
        <h1 className='font-serif text-3xl md:text-4xl font-bold text-foreground text-balance'>
          Chính sách đổi trả
        </h1>
        <p className='text-sm text-muted-foreground mt-3 max-w-2xl text-pretty'>
          Sự hài lòng của quý khách là ưu tiên hàng đầu của Phương Loan Bakery.
          Chúng tôi cam kết hỗ trợ đổi trả nhanh chóng và công bằng trong mọi
          trường hợp sản phẩm không đạt chất lượng.
        </p>
      </div>

      {/* Time notice */}
      <div className='flex items-start gap-3 bg-primary/5 border border-primary/20 rounded-2xl p-5 mb-10'>
        <Info size={18} className='text-primary mt-0.5 shrink-0' />
        <p className='text-sm text-foreground leading-relaxed'>
          <strong>Lưu ý:</strong> Yêu cầu đổi trả phải được thực hiện trong vòng{' '}
          <strong className='text-primary'>2 tiếng</strong> kể từ khi nhận hàng
          và cần có ảnh/video làm bằng chứng.
        </p>
      </div>

      {/* Accepted / Rejected cases */}
      <div className='grid grid-cols-1 md:grid-cols-2 gap-6 mb-10'>
        {/* Accepted */}
        <section className='bg-card border border-border rounded-2xl p-6'>
          <div className='flex items-center gap-3 mb-5'>
            <CheckCircle size={20} className='text-green-600 shrink-0' />
            <h2 className='font-serif text-lg font-semibold text-foreground'>
              Trường hợp được đổi trả
            </h2>
          </div>
          <ul className='space-y-3'>
            {acceptedCases.map((item, i) => (
              <li
                key={i}
                className='flex items-start gap-2 text-sm text-muted-foreground leading-relaxed'
              >
                <span className='w-1.5 h-1.5 rounded-full bg-green-500 mt-2 shrink-0' />
                {item}
              </li>
            ))}
          </ul>
        </section>

        {/* Rejected */}
        <section className='bg-card border border-border rounded-2xl p-6'>
          <div className='flex items-center gap-3 mb-5'>
            <XCircle size={20} className='text-destructive shrink-0' />
            <h2 className='font-serif text-lg font-semibold text-foreground'>
              Trường hợp không áp dụng
            </h2>
          </div>
          <ul className='space-y-3'>
            {rejectedCases.map((item, i) => (
              <li
                key={i}
                className='flex items-start gap-2 text-sm text-muted-foreground leading-relaxed'
              >
                <span className='w-1.5 h-1.5 rounded-full bg-destructive mt-2 shrink-0' />
                {item}
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* Process steps */}
      <section className='mb-10'>
        <h2 className='font-serif text-xl font-semibold text-foreground mb-6'>
          Quy trình đổi trả
        </h2>
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5'>
          {steps.map(({ step, title, description }) => (
            <div
              key={step}
              className='bg-card border border-border rounded-2xl p-5 relative'
            >
              <span className='font-serif text-5xl font-bold text-primary/10 absolute top-4 right-5 select-none'>
                {step}
              </span>
              <h3 className='font-serif font-semibold text-foreground text-base mb-2 relative'>
                {title}
              </h3>
              <p className='text-sm text-muted-foreground leading-relaxed relative'>
                {description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Refund methods */}
      <section className='bg-secondary/40 rounded-2xl p-6 mb-10'>
        <h2 className='font-serif text-lg font-semibold text-foreground mb-4'>
          Hình thức bồi hoàn
        </h2>
        <div className='grid grid-cols-1 md:grid-cols-3 gap-4 text-sm'>
          {[
            {
              label: 'Giao lại sản phẩm',
              desc: 'Ưu tiên giao sản phẩm thay thế trong ngày hoặc ngày hôm sau.',
            },
            {
              label: 'Hoàn tiền vào ví',
              desc: 'Hoàn tiền vào ví Phương Loan Bakery để sử dụng cho đơn hàng tiếp theo.',
            },
            {
              label: 'Hoàn tiền gốc',
              desc: 'Hoàn tiền về tài khoản gốc trong 3 – 5 ngày làm việc.',
            },
          ].map(({ label, desc }) => (
            <div
              key={label}
              className='bg-card rounded-xl p-4 border border-border'
            >
              <p className='font-semibold text-foreground mb-1'>{label}</p>
              <p className='text-muted-foreground text-xs leading-relaxed'>
                {desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Contact CTA */}
      <section className='bg-espresso/5 border border-espresso/20 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center gap-4'>
        <div className='w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0'>
          <Phone size={18} className='text-primary' />
        </div>
        <div>
          <p className='font-serif font-semibold text-foreground'>
            Cần hỗ trợ đổi trả?
          </p>
          <p className='text-sm text-muted-foreground mt-1'>
            Liên hệ hotline{' '}
            <a
              href='tel:19007799'
              className='text-primary font-semibold hover:underline'
            >
              1900 779907
            </a>{' '}
            hoặc email{' '}
            <a
              href='mailto:hello@phuongloan.vn'
              className='text-primary font-semibold hover:underline'
            >
              hello@phuongloan.vn
            </a>
            .
          </p>
        </div>
      </section>
    </div>
  );
}
