import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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
          select: { category: { select: { name: true } } },
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
          `  Giá: ${Number(p.price).toLocaleString('vi-VN')}đ${p.comparePrice ? ` (gốc ${Number(p.comparePrice).toLocaleString('vi-VN')}đ)` : ''}`,
          `  Danh mục: ${categories || 'Chưa phân loại'}`,
          `  Mô tả: ${p.shortDescription || 'Không có mô tả'}`,
          `  Còn hàng: ${p.stock > 0 ? 'Có' : 'Hết hàng'}`,
          `  Slug: ${p.slug}`,
        ].join('\n');
      })
      .join('\n\n');

    const systemPrompt = `Bạn là trợ lý tư vấn bánh của tiệm bánh. Nhiệm vụ của bạn là giúp khách hàng tìm và chọn bánh phù hợp với nhu cầu.

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
👉 /products/[slug]`;

    // Build Gemini contents array (multi-turn history)
    const contents = [
      ...history.map((h: { role: string; content: string }) => ({
        role: h.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: h.content }],
      })),
      { role: 'user', parts: [{ text: message }] },
    ];

    const apiKey = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const aiResponse = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: {
          maxOutputTokens: 1024,
          temperature: 0.7,
        },
      }),
    });

    if (!aiResponse.ok) {
      console.error('Gemini API error:', await aiResponse.text());
      return NextResponse.json(
        { success: false, error: 'Chatbot tạm thời không khả dụng' },
        { status: 500 },
      );
    }

    const aiData = await aiResponse.json();
    const reply =
      aiData.candidates?.[0]?.content?.parts?.[0]?.text ||
      'Xin lỗi, tôi không hiểu yêu cầu của bạn.';

    return NextResponse.json({ success: true, data: { reply } });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi hệ thống' },
      { status: 500 },
    );
  }
}
