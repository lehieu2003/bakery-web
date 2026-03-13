'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Loader2, ChevronDown, ShoppingCart } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { ENDPOINTS } from '@/lib/api/endpoints';
import { http } from '@/lib/api/client';
import { useCart } from '@/lib/cart-store';

interface SuggestedProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  comparePrice: number | null;
  shortDescription: string | null;
  stock: number;
  images: { url: string; isPrimary: boolean; displayOrder: number }[];
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  suggestedProducts?: SuggestedProduct[];
}

function parseMessageContent(text: string) {
  // Convert **bold**, strip 👉 /products/slug lines (replaced by cards), and line breaks
  const parts: React.ReactNode[] = [];
  const lines = text.split('\n');

  lines.forEach((line, lineIdx) => {
    // Skip lines that are purely a product link (will be shown as cards)
    if (/^👉\s*\/products\/\S+$/.test(line.trim())) return;

    if (parts.length > 0) parts.push(<br key={`br-${lineIdx}`} />);

    // Process inline bold
    const segments = line.split(/(\*\*[^*]+\*\*)/g);
    segments.forEach((seg, segIdx) => {
      if (seg.startsWith('**') && seg.endsWith('**')) {
        parts.push(
          <strong key={`bold-${lineIdx}-${segIdx}`}>{seg.slice(2, -2)}</strong>,
        );
      } else {
        parts.push(<span key={`text-${lineIdx}-${segIdx}`}>{seg}</span>);
      }
    });
  });

  return parts;
}

function ProductCard({ product }: { product: SuggestedProduct }) {
  const { addToCart } = useCart();
  const imageUrl =
    product.images.find((img) => img.isPrimary)?.url ??
    product.images[0]?.url ??
    '/placeholder.jpg';

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    addToCart({
      id: `${product.id}-${Date.now()}`,
      productId: product.id,
      name: product.name,
      price: product.price,
      image: imageUrl,
      type: 'cake',
      quantity: 1,
    });
  };

  const discount =
    product.comparePrice && product.comparePrice > product.price
      ? Math.round((1 - product.price / product.comparePrice) * 100)
      : null;

  return (
    <Link
      href={`/products/${product.id}`}
      className='flex gap-2.5 bg-card border border-border rounded-xl overflow-hidden hover:shadow-md transition-shadow group'
    >
      {/* Image */}
      <div className='relative w-20 h-20 shrink-0 bg-secondary overflow-hidden'>
        <Image
          src={imageUrl}
          alt={product.name}
          fill
          sizes='80px'
          className='object-cover group-hover:scale-105 transition-transform'
        />
        {discount && (
          <span className='absolute top-1 left-1 bg-destructive text-destructive-foreground text-[9px] font-bold px-1 py-0.5 rounded'>
            -{discount}%
          </span>
        )}
      </div>

      {/* Info */}
      <div className='flex-1 py-2 pr-2 flex flex-col justify-between min-w-0'>
        <div>
          <p className='text-xs font-semibold text-foreground line-clamp-2 leading-snug'>
            {product.name}
          </p>
          {product.shortDescription && (
            <p className='text-[10px] text-muted-foreground line-clamp-1 mt-0.5'>
              {product.shortDescription}
            </p>
          )}
        </div>
        <div className='flex items-center justify-between gap-1 mt-1'>
          <div>
            <p className='text-xs font-bold text-primary leading-none'>
              {product.price.toLocaleString('vi-VN')}đ
            </p>
            {product.comparePrice && product.comparePrice > product.price && (
              <p className='text-[10px] text-muted-foreground line-through leading-none mt-0.5'>
                {product.comparePrice.toLocaleString('vi-VN')}đ
              </p>
            )}
          </div>
          <button
            onClick={handleAddToCart}
            disabled={product.stock <= 0}
            className='shrink-0 w-6 h-6 rounded-lg bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 active:scale-95 transition-all disabled:opacity-40'
            aria-label={`Thêm ${product.name} vào giỏ hàng`}
          >
            <ShoppingCart size={11} />
          </button>
        </div>
      </div>
    </Link>
  );
}

export default function ChatbotBubble() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content:
        'Xin chào! Tôi là trợ lý tư vấn bánh của La Douceur. Bạn cần tôi giúp gì hôm nay? 🎂',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [unread, setUnread] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      setUnread(0);
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, open]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;

    const newMessages: Message[] = [
      ...messages,
      { role: 'user', content: text },
    ];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await http.post(ENDPOINTS.CHATBOT, {
        headers: { 'Content-Type': 'application/json' },
        message: text,
        history: messages,
      });

      const reply =
        res?.data?.reply || 'Xin lỗi, tôi không thể trả lời lúc này.';
      const suggestedProducts: SuggestedProduct[] =
        res?.data?.suggestedProducts ?? [];

      setMessages([
        ...newMessages,
        { role: 'assistant', content: reply, suggestedProducts },
      ]);

      if (!open) setUnread((u) => u + 1);
    } catch {
      setMessages([
        ...newMessages,
        {
          role: 'assistant',
          content: 'Đã có lỗi xảy ra. Vui lòng thử lại sau.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <div className='fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3'>
      {/* Chat window */}
      {open && (
        <div
          className='bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden'
          style={{
            width: 'min(380px, calc(100vw - 48px))',
            height: 'min(540px, calc(100svh - 120px))',
          }}
          role='dialog'
          aria-label='Chatbot tư vấn bánh'
        >
          {/* Header */}
          <div className='flex items-center justify-between px-4 py-3 bg-primary text-primary-foreground shrink-0'>
            <div className='flex items-center gap-2.5'>
              <div className='w-8 h-8 rounded-full bg-primary-foreground/20 flex items-center justify-center'>
                <MessageCircle size={16} />
              </div>
              <div>
                <p className='text-sm font-semibold leading-tight'>
                  La Douceur
                </p>
                <p className='text-[11px] opacity-75 leading-tight'>
                  Trợ lý tư vấn bánh
                </p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className='w-7 h-7 rounded-full hover:bg-primary-foreground/20 flex items-center justify-center transition-colors'
              aria-label='Đóng chat'
            >
              <ChevronDown size={16} />
            </button>
          </div>

          {/* Messages */}
          <div className='flex-1 overflow-y-auto px-4 py-3 space-y-3 scroll-smooth'>
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className='w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5'>
                    <MessageCircle size={13} className='text-primary' />
                  </div>
                )}
                <div className={`max-w-[85%] flex flex-col gap-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div
                    className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground rounded-tr-sm'
                        : 'bg-secondary text-foreground rounded-tl-sm'
                    }`}
                  >
                    {msg.role === 'assistant'
                      ? parseMessageContent(msg.content)
                      : msg.content}
                  </div>
                  {/* Product cards */}
                  {msg.role === 'assistant' &&
                    msg.suggestedProducts &&
                    msg.suggestedProducts.length > 0 && (
                      <div className='w-full flex flex-col gap-2'>
                        {msg.suggestedProducts.map((product) => (
                          <ProductCard key={product.id} product={product} />
                        ))}
                      </div>
                    )}
                </div>
              </div>
            ))}

            {loading && (
              <div className='flex gap-2 justify-start'>
                <div className='w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5'>
                  <MessageCircle size={13} className='text-primary' />
                </div>
                <div className='bg-secondary rounded-2xl rounded-tl-sm px-3 py-2.5 flex items-center gap-1.5'>
                  <span className='w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:0ms]' />
                  <span className='w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:150ms]' />
                  <span className='w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:300ms]' />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className='px-3 py-3 border-t border-border bg-card shrink-0'>
            <div className='flex items-end gap-2 bg-secondary rounded-xl px-3 py-2'>
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder='Nhập tin nhắn...'
                rows={1}
                className='flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground resize-none outline-none max-h-24 leading-relaxed'
                style={{ minHeight: '24px' }}
                aria-label='Nhập tin nhắn'
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || loading}
                className='w-7 h-7 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shrink-0 disabled:opacity-40 hover:opacity-90 transition-opacity'
                aria-label='Gửi tin nhắn'
              >
                {loading ? (
                  <Loader2 size={13} className='animate-spin' />
                ) : (
                  <Send size={13} />
                )}
              </button>
            </div>
            <p className='text-[10px] text-muted-foreground text-center mt-1.5'>
              Enter để gửi · Shift+Enter xuống dòng
            </p>
          </div>
        </div>
      )}

      {/* Floating button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className='w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center relative'
        aria-label={open ? 'Đóng chat' : 'Mở chat tư vấn'}
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
        {!open && unread > 0 && (
          <span className='absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center'>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
    </div>
  );
}
