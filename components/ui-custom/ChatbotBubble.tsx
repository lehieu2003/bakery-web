'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Loader2, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { ENDPOINTS } from '@/lib/api/endpoints';
import { http } from '@/lib/api/client';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

function parseMessageContent(text: string) {
  // Convert **bold**, links /products/slug, and line breaks
  const parts: React.ReactNode[] = [];
  const lines = text.split('\n');

  lines.forEach((line, lineIdx) => {
    if (lineIdx > 0) parts.push(<br key={`br-${lineIdx}`} />);

    // Process inline bold and product links
    const segments = line.split(/(\*\*[^*]+\*\*|👉\s*\/\S+)/g);
    segments.forEach((seg, segIdx) => {
      if (seg.startsWith('**') && seg.endsWith('**')) {
        parts.push(
          <strong key={`bold-${lineIdx}-${segIdx}`}>{seg.slice(2, -2)}</strong>,
        );
      } else if (seg.startsWith('👉')) {
        const slug = seg.replace('👉', '').trim();
        parts.push(
          <Link
            key={`link-${lineIdx}-${segIdx}`}
            href={slug}
            className='inline-flex items-center gap-1 text-primary underline underline-offset-2 hover:opacity-80 transition-opacity text-xs font-medium'
          >
            Xem sản phẩm →
          </Link>,
        );
      } else {
        parts.push(<span key={`text-${lineIdx}-${segIdx}`}>{seg}</span>);
      }
    });
  });

  return parts;
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
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: messages,
        }),
      });

      const data = await res.json();
      const reply =
        data?.data?.reply || 'Xin lỗi, tôi không thể trả lời lúc này.';

      setMessages([...newMessages, { role: 'assistant', content: reply }]);

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
                <div
                  className={`max-w-[78%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-tr-sm'
                      : 'bg-secondary text-foreground rounded-tl-sm'
                  }`}
                >
                  {msg.role === 'assistant'
                    ? parseMessageContent(msg.content)
                    : msg.content}
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
