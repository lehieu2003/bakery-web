import { FileText, ChevronRight } from 'lucide-react';

const sections = [
  {
    id: '1',
    title: 'Giới thiệu',
    paragraphs: [
      'Chào mừng bạn đến với Phương Loan Bakery – Artisan Bakery ("chúng tôi"). Khi truy cập và sử dụng trang web phuongloan.vn ("Website"), bạn đồng ý tuân thủ các Điều khoản Sử dụng dưới đây.',
      'Vui lòng đọc kỹ các điều khoản này trước khi sử dụng dịch vụ. Nếu bạn không đồng ý với bất kỳ điều khoản nào, hãy ngừng sử dụng Website.',
    ],
  },
  {
    id: '2',
    title: 'Tài khoản người dùng',
    paragraphs: [
      'Để đặt hàng, bạn cần tạo tài khoản với thông tin chính xác và đầy đủ. Bạn chịu trách nhiệm bảo mật thông tin đăng nhập và mọi hoạt động phát sinh từ tài khoản của mình.',
      'Chúng tôi có quyền tạm khóa hoặc xóa tài khoản nếu phát hiện hành vi gian lận, vi phạm chính sách hoặc gây hại cho hệ thống.',
    ],
  },
  {
    id: '3',
    title: 'Đặt hàng và thanh toán',
    paragraphs: [
      'Tất cả đơn hàng được xác nhận qua email sau khi thanh toán thành công. Giá sản phẩm hiển thị trên Website đã bao gồm VAT.',
      'Chúng tôi chấp nhận thanh toán qua MoMo, VNPAY, chuyển khoản ngân hàng và tiền mặt khi nhận hàng. Đơn hàng chỉ được xử lý sau khi xác nhận thanh toán.',
      'Phương Loan Bakery có quyền từ chối hoặc hủy đơn hàng trong trường hợp sản phẩm hết hàng, thông tin đặt hàng không hợp lệ hoặc nghi ngờ gian lận.',
    ],
  },
  {
    id: '4',
    title: 'Sở hữu trí tuệ',
    paragraphs: [
      'Toàn bộ nội dung trên Website bao gồm hình ảnh, logo, văn bản, thiết kế và mã nguồn là tài sản của Phương Loan Bakery, được bảo hộ theo luật sở hữu trí tuệ Việt Nam.',
      'Bạn không được sao chép, phân phối, chỉnh sửa hoặc sử dụng bất kỳ nội dung nào cho mục đích thương mại mà không có sự cho phép bằng văn bản từ chúng tôi.',
    ],
  },
  {
    id: '5',
    title: 'Hành vi bị cấm',
    paragraphs: [
      'Khi sử dụng Website, bạn không được thực hiện các hành vi sau:',
    ],
    bullets: [
      'Sử dụng thông tin giả mạo để đặt hàng hoặc tạo tài khoản.',
      'Can thiệp vào hoạt động bình thường của hệ thống hoặc máy chủ.',
      'Thu thập dữ liệu người dùng khác bằng bất kỳ hình thức tự động nào.',
      'Đăng tải nội dung vi phạm pháp luật, thô tục hoặc xúc phạm.',
      'Sử dụng Website cho mục đích cạnh tranh không lành mạnh.',
    ],
  },
  {
    id: '6',
    title: 'Giới hạn trách nhiệm',
    paragraphs: [
      'Phương Loan Bakery không chịu trách nhiệm về các thiệt hại gián tiếp, đặc biệt hoặc mang tính hậu quả phát sinh từ việc sử dụng Website hoặc sản phẩm, trừ các trường hợp pháp luật quy định khác.',
      'Chúng tôi nỗ lực duy trì Website hoạt động ổn định nhưng không đảm bảo Website sẽ không bị gián đoạn do sự cố kỹ thuật hoặc bảo trì hệ thống.',
    ],
  },
  {
    id: '7',
    title: 'Thay đổi điều khoản',
    paragraphs: [
      'Phương Loan Bakery có quyền cập nhật Điều khoản Sử dụng bất cứ lúc nào. Phiên bản mới nhất sẽ được đăng tải trên Website với ngày có hiệu lực rõ ràng.',
      'Việc tiếp tục sử dụng Website sau khi điều khoản được cập nhật đồng nghĩa với việc bạn chấp nhận các thay đổi đó.',
    ],
  },
  {
    id: '8',
    title: 'Liên hệ',
    paragraphs: [
      'Mọi thắc mắc về Điều khoản Sử dụng, vui lòng liên hệ:',
      'Email: hello@phuongloan.vn | Hotline: 1900 779907 | Địa chỉ: TT. Chợ Chùa, Nghĩa Hành, Quảng Ngãi.',
    ],
  },
];

export default function DieuKhoanSuDungScreen() {
  return (
    <div className='font-sans py-8'>
      {/* Page header */}
      <div className='mb-10'>
        <div className='flex items-center gap-3 mb-3'>
          <div className='w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center'>
            <FileText size={20} className='text-primary' />
          </div>
          <p className='text-xs tracking-[0.2em] uppercase text-muted-foreground font-medium'>
            Thông tin
          </p>
        </div>
        <h1 className='font-serif text-3xl md:text-4xl font-bold text-foreground text-balance'>
          Điều khoản sử dụng
        </h1>
        <p className='text-sm text-muted-foreground mt-3'>
          Cập nhật lần cuối: Tháng 1, 2025
        </p>
      </div>

      {/* Table of contents */}
      <nav className='bg-secondary/40 rounded-2xl p-6 mb-10'>
        <p className='font-serif font-semibold text-foreground text-sm mb-4'>
          Mục lục
        </p>
        <ul className='space-y-2'>
          {sections.map(({ id, title }) => (
            <li key={id}>
              <a
                href={`#section-${id}`}
                className='flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors group'
              >
                <ChevronRight
                  size={14}
                  className='text-primary/50 group-hover:text-primary transition-colors'
                />
                {id}. {title}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {/* Sections */}
      <div className='space-y-8 max-w-3xl'>
        {sections.map(({ id, title, paragraphs, bullets }) => (
          <section key={id} id={`section-${id}`} className='scroll-mt-24'>
            <h2 className='font-serif text-xl font-semibold text-foreground mb-3 flex items-center gap-2'>
              <span className='text-primary text-base'>{id}.</span>
              {title}
            </h2>
            <div className='space-y-3'>
              {paragraphs.map((p, i) => (
                <p
                  key={i}
                  className='text-sm text-muted-foreground leading-relaxed'
                >
                  {p}
                </p>
              ))}
              {bullets && (
                <ul className='space-y-2 mt-2'>
                  {bullets.map((b, i) => (
                    <li
                      key={i}
                      className='flex items-start gap-2 text-sm text-muted-foreground leading-relaxed'
                    >
                      <span className='w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0' />
                      {b}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
