'use client';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

type FaqItem = {
  question: string;
  answer: string;
};

const faqs: FaqItem[] = [
  {
    question: 'Tôi nên đặt bánh trước bao lâu?',
    answer:
      'Với bánh có sẵn hoặc mẫu cơ bản, bạn nên đặt trước ít nhất 1 ngày để tiệm chuẩn bị tốt nhất. Với bánh sinh nhật, bánh tiệc hoặc yêu cầu trang trí riêng, La Douceur khuyến khích đặt trước 2-3 ngày.',
  },
  {
    question: 'La Douceur có giao bánh trong TP.HCM không?',
    answer:
      'Có. Tiệm hỗ trợ giao hàng trong TP.HCM tùy theo khu vực và khung giờ hoạt động của chi nhánh. Phí giao hàng sẽ được hiển thị hoặc xác nhận trước khi hoàn tất đơn.',
  },
  {
    question: 'Tôi có thể yêu cầu viết chữ hoặc đổi trang trí trên bánh không?',
    answer:
      'Bạn có thể ghi chú lời nhắn trên bánh khi đặt hàng. Một số thay đổi nhỏ về màu sắc, chữ viết hoặc chi tiết trang trí có thể được hỗ trợ tùy mẫu bánh và thời gian chuẩn bị.',
  },
  {
    question: 'Bánh nên được bảo quản như thế nào?',
    answer:
      'Bánh lạnh nên được giữ trong ngăn mát và dùng trong ngày để có hương vị tốt nhất. Với cookies hoặc bánh khô, bạn nên bảo quản nơi thoáng mát, tránh nắng trực tiếp và đóng kín sau khi mở.',
  },
  {
    question: 'Các chi nhánh có chỗ ngồi lại không?',
    answer:
      'Có. La Douceur kết hợp tiệm bánh và không gian F&B, phù hợp để dùng bánh tại chỗ, gặp bạn bè hoặc nghỉ nhẹ cuối tuần. Sức chứa và bố trí chỗ ngồi có thể khác nhau tùy chi nhánh.',
  },
  {
    question: 'Tiệm hỗ trợ những phương thức thanh toán nào?',
    answer:
      'Bạn có thể thanh toán bằng tiền mặt khi nhận hàng hoặc các phương thức thanh toán điện tử được hỗ trợ tại thời điểm đặt hàng, tùy kênh mua và chính sách của từng chi nhánh.',
  },
  {
    question: 'Tôi có thể đổi giờ nhận hoặc chỉnh sửa đơn sau khi đặt không?',
    answer:
      'Bạn nên liên hệ tiệm càng sớm càng tốt nếu cần đổi giờ nhận, đổi thông tin giao hàng hoặc chỉnh sửa đơn. Những thay đổi đã sát giờ chuẩn bị bánh có thể bị giới hạn để đảm bảo chất lượng sản phẩm.',
  },
];

export default function FaqSection() {
  return (
    <section
      className='bg-background px-4 py-16 lg:px-8'
      aria-labelledby='faq-heading'
    >
      <div className='mx-auto max-w-3xl'>
        <div className='mb-10 text-center'>
          <p className='mb-3 font-sans text-xs font-light uppercase tracking-[0.25em] text-muted-foreground'>
            Câu hỏi thường gặp
          </p>
          <h2
            id='faq-heading'
            className='font-serif text-3xl font-bold tracking-wide text-primary text-balance md:text-4xl'
          >
            Những điều cần biết trước khi đặt bánh
          </h2>
        </div>

        <Accordion
          type='single'
          collapsible
          className='overflow-hidden rounded-2xl border border-border/40 bg-card shadow-sm'
        >
          {faqs.map((item, index) => (
            <AccordionItem
              key={item.question}
              value={`faq-${index}`}
              className='border-border/50 px-5 transition-colors data-[state=open]:bg-secondary/40 sm:px-6'
            >
              <AccordionTrigger className='py-5 text-left font-serif text-base font-semibold leading-snug text-foreground hover:text-primary hover:no-underline data-[state=open]:text-primary'>
                {item.question}
              </AccordionTrigger>
              <AccordionContent className='pb-5 text-sm leading-relaxed text-muted-foreground'>
                {item.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
