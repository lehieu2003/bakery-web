import Image from 'next/image';
import { MapPin, Clock, Phone, Users, Award, Heart } from 'lucide-react';

const values = [
  {
    icon: Heart,
    title: 'Làm bằng tình yêu',
    description:
      'Mỗi chiếc bánh được nhào nặn thủ công với sự tỉ mỉ và tình yêu nghề, mang lại hương vị chân thực và ấm áp trong từng miếng cắn.',
  },
  {
    icon: Award,
    title: 'Nguyên liệu cao cấp',
    description:
      'Chúng tôi chỉ sử dụng bơ Pháp, socola couverture, trứng hữu cơ và bột mì nhập khẩu để đảm bảo chất lượng vượt trội.',
  },
  {
    icon: Users,
    title: 'Đội ngũ chuyên nghiệp',
    description:
      'Đội ngũ thợ bánh được đào tạo bài bản trong và ngoài nước, liên tục cập nhật xu hướng bánh ngọt thế giới.',
  },
];

const branches = [
  {
    name: 'Chi nhánh Quận 1',
    address: '123 Đường Nguyễn Huệ, P. Bến Nghé, Quận 1, TP.HCM',
    hours: '8:00 – 21:00',
    phone: '028 3823 xxxx',
  },
  {
    name: 'Chi nhánh Quận 3',
    address: '45 Đường Lê Văn Sỹ, P. 13, Quận 3, TP.HCM',
    hours: '8:00 – 21:00',
    phone: '028 3930 xxxx',
  },
  {
    name: 'Chi nhánh Thủ Đức',
    address: '89 Đường Võ Văn Ngân, P. Bình Thọ, TP. Thủ Đức, TP.HCM',
    hours: '8:30 – 21:30',
    phone: '028 3722 xxxx',
  },
];

export default function VeChungToiScreen() {
  return (
    <div className='font-sans'>
      {/* Hero */}
      <section className='relative h-64 md:h-80 rounded-2xl overflow-hidden my-8'>
        <Image
          src='/images/bakery-kitchen.jpg'
          alt='Đội ngũ thợ bánh Phương Loan Bakery trong bếp bánh chuyên nghiệp'
          fill
          className='object-cover'
          priority
        />
        <div className='absolute inset-0 bg-[#3d1a0f]/60 flex flex-col items-center justify-center text-center px-4'>
          <p className='text-xs tracking-[0.25em] uppercase text-[#e8c49a] font-light mb-2'>
            Về chúng tôi
          </p>
          <h1 className='font-serif text-3xl md:text-4xl font-bold text-white text-balance'>
            Phương Loan Bakery – Artisan Bakery
          </h1>
          <p className='text-sm text-white/80 mt-3 max-w-md text-pretty'>
            Hơn 10 năm mang đến những chiếc bánh thủ công tinh tế tại TP. Hồ Chí
            Minh
          </p>
        </div>
      </section>

      {/* Story */}
      <section className='py-12 max-w-3xl mx-auto'>
        <h2 className='font-serif text-2xl font-semibold text-primary mb-6 text-balance'>
          Câu chuyện của chúng tôi
        </h2>
        <div className='space-y-4 text-sm text-foreground leading-relaxed'>
          <p>
            Phương Loan Bakery – tiếng Pháp có nghĩa là{' '}
            <em>&ldquo;sự ngọt ngào&rdquo;</em> – ra đời năm 2013 từ ước mơ của
            một người thợ bánh trẻ yêu thích nghệ thuật làm bánh theo phong cách
            Pháp. Bắt đầu từ một tiệm nhỏ tại Quận 1, TP.HCM, Phương Loan Bakery
            nhanh chóng chinh phục thực khách bởi hương vị tinh tế và cách trình
            bày nghệ thuật.
          </p>
          <p>
            Sau hơn một thập kỷ, Phương Loan Bakery đã mở rộng lên{' '}
            <strong>8 chi nhánh tại TP.HCM</strong>, phục vụ hơn{' '}
            <strong>1.000 khách hàng mỗi ngày</strong>. Tuy nhiên, triết lý làm
            bánh của chúng tôi vẫn không thay đổi: mỗi chiếc bánh phải được làm
            thủ công, từ những nguyên liệu tươi ngon nhất, với sự tận tâm cao
            nhất.
          </p>
          <p>
            Từ bánh sinh nhật cầu kỳ đến chiếc croissant bơ giòn tan mỗi sáng,
            Phương Loan Bakery luôn hướng đến một điều duy nhất: mang lại niềm
            vui và sự ấm áp qua từng chiếc bánh.
          </p>
        </div>
      </section>

      {/* Values */}
      <section className='py-12 bg-secondary/40 rounded-2xl px-6 md:px-10 my-8'>
        <h2 className='font-serif text-2xl font-semibold text-primary mb-8 text-center text-balance'>
          Giá trị cốt lõi
        </h2>
        <div className='grid grid-cols-1 md:grid-cols-3 gap-8'>
          {values.map(({ icon: Icon, title, description }) => (
            <div key={title} className='flex flex-col items-start gap-4'>
              <div className='w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0'>
                <Icon size={22} className='text-primary' />
              </div>
              <div>
                <h3 className='font-serif text-base font-semibold text-foreground mb-1'>
                  {title}
                </h3>
                <p className='text-sm text-muted-foreground leading-relaxed'>
                  {description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Stats */}
      <section className='py-12 my-4'>
        <div className='grid grid-cols-2 md:grid-cols-4 gap-6 text-center'>
          {[
            { value: '2013', label: 'Năm thành lập' },
            { value: '8+', label: 'Chi nhánh' },
            { value: '120+', label: 'Loại bánh' },
            { value: '1.000+', label: 'Khách/ngày' },
          ].map(({ value, label }) => (
            <div
              key={label}
              className='bg-card border border-border rounded-2xl p-6'
            >
              <p className='font-serif text-3xl font-bold text-primary'>
                {value}
              </p>
              <p className='text-xs text-muted-foreground mt-1 uppercase tracking-wider'>
                {label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Branches */}
      <section className='py-12 my-4'>
        <h2 className='font-serif text-2xl font-semibold text-primary mb-8 text-balance'>
          Hệ thống chi nhánh
        </h2>
        <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
          {branches.map((branch) => (
            <div
              key={branch.name}
              className='bg-card border border-border rounded-2xl p-6 space-y-3'
            >
              <h3 className='font-serif font-semibold text-foreground text-base'>
                {branch.name}
              </h3>
              <div className='flex items-start gap-2 text-sm text-muted-foreground'>
                <MapPin size={14} className='text-primary mt-0.5 shrink-0' />
                <span>{branch.address}</span>
              </div>
              <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                <Clock size={14} className='text-primary shrink-0' />
                <span>{branch.hours}</span>
              </div>
              <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                <Phone size={14} className='text-primary shrink-0' />
                <span>{branch.phone}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
