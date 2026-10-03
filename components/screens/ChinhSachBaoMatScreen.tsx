import { Shield, ChevronRight } from 'lucide-react';

const sections = [
  {
    id: '1',
    title: 'Thông tin chúng tôi thu thập',
    paragraphs: [
      'Khi bạn sử dụng Website phuongloan.vn, chúng tôi có thể thu thập các loại thông tin sau:',
    ],
    bullets: [
      'Thông tin cá nhân: họ tên, số điện thoại, địa chỉ email và địa chỉ giao hàng khi bạn đặt hàng hoặc tạo tài khoản.',
      'Thông tin thanh toán: phương thức thanh toán (chúng tôi không lưu trữ thông tin thẻ tín dụng/ghi nợ).',
      'Dữ liệu sử dụng: trang web bạn truy cập, thời gian sử dụng, thiết bị và trình duyệt.',
      'Cookie và công nghệ theo dõi tương tự để cải thiện trải nghiệm người dùng.',
    ],
  },
  {
    id: '2',
    title: 'Mục đích sử dụng thông tin',
    paragraphs: ['Thông tin bạn cung cấp được sử dụng cho các mục đích sau:'],
    bullets: [
      'Xử lý và giao hàng đơn đặt của bạn.',
      'Gửi xác nhận đơn hàng, thông báo trạng thái giao hàng qua email hoặc SMS.',
      'Chăm sóc khách hàng và giải quyết khiếu nại.',
      'Cải thiện sản phẩm, dịch vụ và trải nghiệm mua sắm.',
      'Gửi thông tin khuyến mãi (nếu bạn đã đồng ý nhận).',
    ],
  },
  {
    id: '3',
    title: 'Chia sẻ thông tin',
    paragraphs: [
      'Phương Loan Bakery không bán, cho thuê hoặc trao đổi thông tin cá nhân của bạn với bên thứ ba vì mục đích thương mại.',
      'Chúng tôi chỉ chia sẻ thông tin cần thiết với các đối tác dịch vụ như đơn vị vận chuyển (để giao hàng) và cổng thanh toán (để xử lý giao dịch), các bên này có nghĩa vụ bảo mật thông tin tương đương.',
      'Chúng tôi có thể tiết lộ thông tin khi được yêu cầu bởi cơ quan pháp luật có thẩm quyền.',
    ],
  },
  {
    id: '4',
    title: 'Bảo mật dữ liệu',
    paragraphs: [
      'Chúng tôi áp dụng các biện pháp kỹ thuật và tổ chức phù hợp để bảo vệ thông tin cá nhân của bạn, bao gồm mã hóa SSL, kiểm soát truy cập và giám sát hệ thống.',
      'Tuy nhiên, không có phương thức truyền tải dữ liệu qua Internet nào là an toàn tuyệt đối. Chúng tôi khuyến khích bạn không chia sẻ mật khẩu với bất kỳ ai.',
    ],
  },
  {
    id: '5',
    title: 'Cookie',
    paragraphs: [
      'Website sử dụng cookie để ghi nhớ tùy chọn của bạn, giữ thông tin giỏ hàng và phân tích lưu lượng truy cập.',
      'Bạn có thể tắt cookie trong cài đặt trình duyệt, tuy nhiên một số tính năng của Website có thể không hoạt động đúng.',
    ],
  },
  {
    id: '6',
    title: 'Quyền của bạn',
    paragraphs: ['Bạn có các quyền sau đối với dữ liệu cá nhân của mình:'],
    bullets: [
      'Quyền truy cập và xem lại thông tin cá nhân đang được lưu trữ.',
      'Quyền yêu cầu chỉnh sửa thông tin không chính xác.',
      'Quyền yêu cầu xóa tài khoản và toàn bộ dữ liệu liên quan.',
      'Quyền từ chối nhận thông tin tiếp thị bất cứ lúc nào.',
    ],
  },
  {
    id: '7',
    title: 'Thời gian lưu trữ',
    paragraphs: [
      'Chúng tôi lưu trữ thông tin cá nhân của bạn trong thời gian cần thiết để thực hiện các mục đích đã nêu hoặc theo quy định của pháp luật.',
      'Dữ liệu đơn hàng được lưu trữ tối thiểu 5 năm cho mục đích kế toán và giải quyết tranh chấp.',
    ],
  },
  {
    id: '8',
    title: 'Liên hệ về quyền riêng tư',
    paragraphs: [
      'Nếu bạn có câu hỏi hoặc yêu cầu liên quan đến chính sách bảo mật, vui lòng liên hệ:',
      'Email: privacy@phuongloan.vn | Hotline: 1900 779907 | Địa chỉ: TT. Chợ Chùa, Nghĩa Hành, Quảng Ngãi.',
    ],
  },
];

export default function ChinhSachBaoMatScreen() {
  return (
    <div className='font-sans py-8'>
      {/* Page header */}
      <div className='mb-10'>
        <div className='flex items-center gap-3 mb-3'>
          <div className='w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center'>
            <Shield size={20} className='text-primary' />
          </div>
          <p className='text-xs tracking-[0.2em] uppercase text-muted-foreground font-medium'>
            Thông tin
          </p>
        </div>
        <h1 className='font-serif text-3xl md:text-4xl font-bold text-foreground text-balance'>
          Chính sách bảo mật
        </h1>
        <p className='text-sm text-muted-foreground mt-3 max-w-2xl text-pretty'>
          Phương Loan Bakery coi trọng quyền riêng tư của bạn. Chính sách này mô
          tả cách chúng tôi thu thập, sử dụng và bảo vệ thông tin cá nhân của
          bạn khi sử dụng Website phuongloan.vn.
        </p>
        <p className='text-xs text-muted-foreground mt-2'>
          Cập nhật lần cuối: Tháng 1, 2025
        </p>
      </div>

      {/* Commitment banner */}
      <div className='grid grid-cols-1 md:grid-cols-3 gap-4 mb-10'>
        {[
          {
            title: 'Không bán dữ liệu',
            desc: 'Chúng tôi không bao giờ bán hoặc cho thuê thông tin cá nhân của bạn.',
          },
          {
            title: 'Mã hóa SSL',
            desc: 'Mọi dữ liệu truyền đến website đều được mã hóa bằng SSL 256-bit.',
          },
          {
            title: 'Quyền kiểm soát',
            desc: 'Bạn luôn có quyền truy cập, chỉnh sửa hoặc xóa dữ liệu của mình.',
          },
        ].map(({ title, desc }) => (
          <div
            key={title}
            className='bg-card border border-border rounded-2xl p-5 flex items-start gap-3'
          >
            <Shield size={16} className='text-primary mt-0.5 shrink-0' />
            <div>
              <p className='font-semibold text-sm text-foreground mb-1'>
                {title}
              </p>
              <p className='text-xs text-muted-foreground leading-relaxed'>
                {desc}
              </p>
            </div>
          </div>
        ))}
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
