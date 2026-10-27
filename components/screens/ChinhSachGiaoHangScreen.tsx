import {
  Truck,
  Clock,
  MapPin,
  Package,
  Phone,
  AlertCircle,
} from 'lucide-react';
import { SHOP_PHONE } from '@/lib/shop-contact';

const shippingZones = [
  {
    zone: 'Trong bán kính 10km từ cửa hàng',
    time: '2 – 4 tiếng',
    fee: '20.000đ – 35.000đ',
    note: 'Miễn phí cho đơn từ 500.000đ',
  },
  {
    zone: 'Các khu vực còn lại của Quảng Ngãi',
    time: '4 – 8 tiếng',
    fee: '40.000đ – 60.000đ',
    note: 'Miễn phí cho đơn từ 500.000đ',
  },
  {
    zone: 'Tỉnh thành lân cận',
    time: '1 – 2 ngày',
    fee: '60.000đ – 100.000đ',
    note: 'Liên hệ để được tư vấn',
  },
];

const sections = [
  {
    icon: Clock,
    title: 'Thời gian giao hàng',
    content: [
      'Đơn hàng được đặt trước 14:00 sẽ được giao trong ngày (áp dụng khu vực tại Quảng Ngãi).',
      'Đơn hàng đặt sau 14:00 sẽ được giao vào ngày hôm sau.',
      'Với các dịp lễ, Tết hoặc cuối tuần, thời gian giao hàng có thể chậm hơn 1 – 2 tiếng do lượng đơn tăng cao.',
      'Quý khách có thể chọn khung giờ giao hàng mong muốn khi đặt hàng: 8:00–12:00, 12:00–16:00 hoặc 16:00–20:00.',
    ],
  },
  {
    icon: Package,
    title: 'Quy trình đóng gói',
    content: [
      'Tất cả sản phẩm được đóng gói trong hộp cứng chuyên dụng có lót xốp cách nhiệt.',
      'Bánh kem và mousse được giữ lạnh bằng đá khô trong suốt quá trình vận chuyển.',
      'Hộp quà tặng được buộc ruy-băng và đính kèm thiệp theo yêu cầu của khách.',
    ],
  },
  {
    icon: MapPin,
    title: 'Khu vực giao hàng',
    content: [
      'Phương Loan Bakery hiện giao hàng tại các khu vực thuộc tỉnh Quảng Ngãi.',
      'Giao hàng liên tỉnh áp dụng cho các tỉnh thành lân cận: Bình Định, Kon Tum, Đà Nẵng. Vui lòng liên hệ trước để được hỗ trợ.',
      'Với các đơn hàng ngoài khu vực trên, vui lòng liên hệ hotline để được hỗ trợ.',
    ],
  },
  {
    icon: AlertCircle,
    title: 'Lưu ý quan trọng',
    content: [
      'Quý khách vui lòng kiểm tra sản phẩm khi nhận hàng. Nếu có bất kỳ sự cố nào về chất lượng, hãy chụp ảnh và liên hệ ngay với chúng tôi trong vòng 2 tiếng.',
      'Phương Loan Bakery không chịu trách nhiệm với các hư hỏng do bảo quản không đúng cách sau khi đã nhận hàng.',
      'Trong trường hợp không có người nhận, shipper sẽ liên hệ qua điện thoại trước khi quay lại.',
    ],
  },
];

export default function ChinhSachGiaoHangScreen() {
  return (
    <div className='font-sans py-8'>
      {/* Page header */}
      <div className='mb-10'>
        <div className='flex items-center gap-3 mb-3'>
          <div className='w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center'>
            <Truck size={20} className='text-primary' />
          </div>
          <p className='text-xs tracking-[0.2em] uppercase text-muted-foreground font-medium'>
            Thông tin
          </p>
        </div>
        <h1 className='font-serif text-3xl md:text-4xl font-bold text-foreground text-balance'>
          Chính sách giao hàng
        </h1>
        <p className='text-sm text-muted-foreground mt-3 max-w-2xl text-pretty'>
          Phương Loan Bakery cam kết giao bánh tươi ngon, an toàn và đúng giờ
          đến tận tay quý khách. Dưới đây là những thông tin chi tiết về dịch vụ
          giao hàng của chúng tôi.
        </p>
      </div>

      {/* Shipping zones table */}
      <section className='mb-10'>
        <h2 className='font-serif text-xl font-semibold text-foreground mb-5'>
          Bảng phí giao hàng
        </h2>
        <div className='overflow-x-auto rounded-2xl border border-border'>
          <table className='w-full text-sm'>
            <thead>
              <tr className='bg-secondary/60 text-left'>
                <th className='px-5 py-4 font-semibold text-foreground'>
                  Khu vực
                </th>
                <th className='px-5 py-4 font-semibold text-foreground'>
                  Thời gian
                </th>
                <th className='px-5 py-4 font-semibold text-foreground'>
                  Phí giao hàng
                </th>
                <th className='px-5 py-4 font-semibold text-foreground'>
                  Ưu đãi
                </th>
              </tr>
            </thead>
            <tbody className='divide-y divide-border'>
              {shippingZones.map((row) => (
                <tr key={row.zone} className='bg-card'>
                  <td className='px-5 py-4 text-foreground font-medium'>
                    {row.zone}
                  </td>
                  <td className='px-5 py-4 text-muted-foreground'>
                    {row.time}
                  </td>
                  <td className='px-5 py-4 text-muted-foreground'>{row.fee}</td>
                  <td className='px-5 py-4 text-primary font-medium'>
                    {row.note}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Detailed sections */}
      <div className='space-y-8'>
        {sections.map(({ icon: Icon, title, content }) => (
          <section
            key={title}
            className='bg-card border border-border rounded-2xl p-6'
          >
            <div className='flex items-center gap-3 mb-4'>
              <div className='w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0'>
                <Icon size={18} className='text-primary' />
              </div>
              <h2 className='font-serif text-lg font-semibold text-foreground'>
                {title}
              </h2>
            </div>
            <ul className='space-y-2'>
              {content.map((item, i) => (
                <li
                  key={i}
                  className='flex items-start gap-2 text-sm text-muted-foreground leading-relaxed'
                >
                  <span className='w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0' />
                  {item}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      {/* Contact CTA */}
      <section className='mt-10 bg-espresso/5 border border-espresso/20 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center gap-4'>
        <div className='w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0'>
          <Phone size={18} className='text-primary' />
        </div>
        <div>
          <p className='font-serif font-semibold text-foreground'>
            Cần hỗ trợ về giao hàng?
          </p>
          <p className='text-sm text-muted-foreground mt-1'>
            Gọi hotline{' '}
            <a
              href={`tel:${SHOP_PHONE.tel}`}
              className='text-primary font-semibold hover:underline'
            >
              {SHOP_PHONE.display}
            </a>{' '}
            hoặc nhắn tin qua{' '}
            <a href='#' className='text-primary font-semibold hover:underline'>
              Zalo
            </a>{' '}
            để được hỗ trợ ngay.
          </p>
        </div>
      </section>
    </div>
  );
}
