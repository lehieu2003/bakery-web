import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { prisma } from '@/lib/prisma';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// POST /api/chat
export async function POST(request: NextRequest) {
  try {
    const { message, history = [] } = await request.json();

    if (!message?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Tin nhắn không được để trống' },
        { status: 400 },
      );
    }

    // Fetch products from DB to give AI context
    const products = await prisma.product.findMany({
      where: { isActive: true },
      select: {
        name: true,
        slug: true,
        shortDescription: true,
        price: true,
        comparePrice: true,
        stock: true,
        isFeatured: true,
        categories: {
          select: {
            category: {
              select: { name: true },
            },
          },
        },
      },
      orderBy: { isFeatured: 'desc' },
      take: 50,
    });

    const productContext = products
      .map((p) => {
        const categories = p.categories.map((c) => c.category.name).join(', ');
        return [
          `- Tên: ${p.name}`,
          `  Giá: ${Number(p.price).toLocaleString('vi-VN')}đ${
            p.comparePrice
              ? ` (gốc ${Number(p.comparePrice).toLocaleString('vi-VN')}đ)`
              : ''
          }`,
          `  Danh mục: ${categories || 'Chưa phân loại'}`,
          `  Mô tả: ${p.shortDescription || 'Không có mô tả'}`,
          `  Còn hàng: ${p.stock > 0 ? 'Có' : 'Hết hàng'}`,
          `  Slug: ${p.slug}`,
        ].join('\n');
      })
      .join('\n\n');

    const systemPrompt = `
Bạn là trợ lý tư vấn bánh của tiệm bánh.
Nhiệm vụ của bạn là giúp khách hàng tìm và chọn bánh phù hợp với nhu cầu.

Danh sách sản phẩm hiện có:
${productContext}

Hướng dẫn:
- Tư vấn thân thiện, ngắn gọn, dễ hiểu
- Gợi ý bánh phù hợp dựa trên nhu cầu khách (dịp đặc biệt, khẩu vị, ngân sách, số lượng người...)
- Nếu khách hỏi bánh không có trong danh sách, gợi ý sản phẩm gần nhất hoặc thông báo lịch sự
- Khi gợi ý bánh, luôn đính kèm giá và slug để frontend tạo link sản phẩm
- Trả lời bằng tiếng Việt
- Không bịa đặt thông tin ngoài danh sách trên
- Nếu có nhiều lựa chọn, gợi ý tối đa 3 sản phẩm

Định dạng khi gợi ý sản phẩm:
🎂 **Tên bánh** - Giá
Lý do phù hợp ngắn gọn
👉 /products/[slug]
    `.trim();

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: systemPrompt,
      },
      ...(history.map((h: { role: string; content: string }) => ({
        role: h.role === 'assistant' ? 'assistant' : 'user',
        content: h.content,
      })) as OpenAI.Chat.Completions.ChatCompletionMessageParam[]),
      {
        role: 'user',
        content: message,
      },
    ];

    const completion = await openai.chat.completions.create({
      model: process.env.GPT_MODEL_MINI || 'gpt-4.1-mini',
      messages,
      temperature: 0.7,
      max_tokens: 1024,
    });

    const reply =
      completion.choices?.[0]?.message?.content ||
      'Xin lỗi, tôi không hiểu yêu cầu của bạn.';

    return NextResponse.json({
      success: true,
      data: { reply },
    });
  } catch (error) {
    console.error('Chat API error:', error);

    return NextResponse.json(
      { success: false, error: 'Lỗi hệ thống' },
      { status: 500 },
    );
  }
}
