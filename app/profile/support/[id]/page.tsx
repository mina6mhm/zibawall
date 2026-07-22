// app/profile/support/[id]/page.tsx
'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, CheckCircle2, User, Send, Trash2 } from 'lucide-react';

type SupportStatus = 'PENDING' | 'IN_PROGRESS' | 'ANSWERED' | 'CLOSED';
type Sender = 'USER' | 'ADMIN';

interface ThreadItem {
  id: string;
  sender: Sender;
  message: string;
  createdAt: string;
}

const statusMap: Record<SupportStatus, { label: string; className: string }> = {
  PENDING: { label: 'در انتظار بررسی', className: 'bg-zinc-100 text-zinc-500' },
  IN_PROGRESS: { label: 'در حال بررسی', className: 'bg-amber-50 text-amber-600' },
  ANSWERED: { label: 'پاسخ داده شد', className: 'bg-emerald-50 text-emerald-600' },
  CLOSED: { label: 'بسته شده', className: 'bg-zinc-100 text-zinc-400' },
};

export default function SupportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [status, setStatus] = useState<SupportStatus>('PENDING');
  const [thread, setThread] = useState<ThreadItem[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isFetching, setIsFetching] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const buildThread = (ticket: any): ThreadItem[] => {
    const items: ThreadItem[] = [
      { id: `${ticket.id}-first`, sender: 'USER', message: ticket.message, createdAt: ticket.createdAt },
    ];
    if (ticket.adminReply && ticket.replies.length === 0) {
      items.push({
        id: `${ticket.id}-legacy`,
        sender: 'ADMIN',
        message: ticket.adminReply,
        createdAt: ticket.repliedAt || ticket.createdAt,
      });
    }
    ticket.replies.forEach((r: any) => {
      items.push({ id: r.id, sender: r.sender, message: r.message, createdAt: r.createdAt });
    });
    return items;
  };

  const fetchThread = async () => {
    try {
      const res = await fetch(`/api/support/${id}`);
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      if (res.status === 404 || res.status === 403) {
        setNotFound(true);
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setStatus(data.ticket.status);
        setThread(buildThread(data.ticket));
        if (!data.ticket.seenByUser) {
          fetch(`/api/support/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ seen: true }),
          });
        }
      }
    } catch (error) {
      console.error('خطا در دریافت مکالمه:', error);
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    fetchThread();
  }, [id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thread]);

  // ارتفاع خودکار textarea بر اساس محتوا
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 120) + 'px';
    }
  }, [newMessage]);

  const handleSend = async () => {
    const trimmed = newMessage.trim();
    if (!trimmed) return;

    setIsSending(true);
    try {
      const res = await fetch(`/api/support/${id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed }),
      });
      if (res.ok) {
        setNewMessage('');
        fetchThread();
      } else {
        const err = await res.json();
        alert(err.error || 'خطا در ارسال پیام');
      }
    } catch (error) {
      console.error(error);
      alert('خطای شبکه در ارتباط با سرور');
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('آیا از حذف کامل این مکالمه مطمئن هستید؟ این عمل غیرقابل بازگشت است.')) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/support/${id}`, { method: 'DELETE' });
      if (res.ok) {
        router.push('/profile/support');
      } else {
        const err = await res.json();
        alert(err.error || 'خطا در حذف مکالمه');
      }
    } catch (error) {
      console.error(error);
      alert('خطای شبکه در ارتباط با سرور');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-white">

      {/* هدر */}
      <div className="sticky top-0 z-10 bg-white border-b border-zinc-100 px-4 py-3.5 flex items-center gap-3">
        <Link
          href="/profile/support"
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-zinc-100 transition-colors shrink-0"
        >
          <ChevronRight className="w-5 h-5 text-zinc-600" />
        </Link>
        <h1 className="text-base font-bold text-zinc-900 flex-1">پشتیبانی</h1>
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="w-8 h-8 flex items-center justify-center rounded-full text-zinc-400 hover:bg-red-50 hover:text-red-500 transition-colors shrink-0 disabled:opacity-40"
          aria-label="حذف مکالمه"
        >
          <Trash2 className="w-4 h-4" />
        </button>
        <span className={`text-[11px] px-2.5 py-1 rounded-lg font-medium shrink-0 ${statusMap[status].className}`}>
          {statusMap[status].label}
        </span>
      </div>

      {/* پیام‌ها */}
      <div className="max-w-lg mx-auto w-full px-4 py-5 space-y-3 flex-1 pb-28">
        {isFetching && (
          <p className="text-center text-zinc-400 text-sm py-14">در حال بارگذاری...</p>
        )}

        {notFound && (
          <p className="text-center text-zinc-400 text-sm py-14">این مکالمه یافت نشد.</p>
        )}

        {thread.map((item) =>
          item.sender === 'USER' ? (
            <div key={item.id} className="flex items-start gap-2 max-w-[85%] mr-auto flex-row-reverse">
              <div className="bg-[#e3c9dc]/25 border border-[#e3c9dc]/60 rounded-xl rounded-tr-sm px-4 py-3 text-[14px] leading-relaxed text-zinc-700 whitespace-pre-wrap break-words">
                <div className="flex items-center gap-1.5 text-[#824c71] text-[11px] font-medium mb-1.5">
                  <User className="w-3.5 h-3.5" /> پیام شما
                </div>
                {item.message}
                <div className="text-[10px] text-zinc-400 mt-1.5">
                  {new Date(item.createdAt).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ) : (
            <div key={item.id} className="flex items-start gap-2 max-w-[85%]">
              <div className="bg-[#e3c9dc]/25 border border-[#e3c9dc]/60 rounded-xl rounded-tl-sm px-4 py-3 text-[14px] leading-relaxed text-zinc-700 whitespace-pre-wrap break-words">
                <div className="flex items-center gap-1.5 text-[#824c71] text-[11px] font-medium mb-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> پاسخ پشتیبانی
                </div>
                {item.message}
                <div className="text-[10px] text-zinc-400 mt-1.5">
                  {new Date(item.createdAt).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          )
        )}
        <div ref={bottomRef} />
      </div>

      {/* باکس ارسال پیام جدید */}
      {!isFetching && !notFound && (
        <div className="fixed bottom-6 left-0 right-0 bg-white border-t border-zinc-100 px-4 py-3 z-50">
          <div className="max-w-lg mx-auto flex items-end gap-2">
            <textarea
              ref={textareaRef}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value.slice(0, 2000))}
              onKeyDown={handleKeyDown}
              placeholder="پیام خود را بنویسید..."
              rows={1}
              className="flex-1 border border-zinc-200 rounded-xl px-4 py-2.5 text-sm resize-none leading-relaxed max-h-[120px] overflow-y-auto focus:border-[#824c71] focus:ring-2 focus:ring-[#824c71]/15 outline-none transition-all"
            />
            <button
              onClick={handleSend}
              disabled={isSending || !newMessage.trim()}
              className="w-11 h-11 flex items-center justify-center bg-[#824c71] text-white rounded-xl shadow-sm shadow-[#824c71]/30 hover:bg-[#6d3f5e] transition-all active:scale-95 disabled:opacity-40 disabled:shadow-none shrink-0"
              aria-label="ارسال"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}