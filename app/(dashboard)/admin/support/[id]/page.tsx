// app/(dashboard)/admin/support/[id]/page.tsx
'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, CheckCircle2, User, Send } from 'lucide-react';

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

export default function AdminSupportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [userInfo, setUserInfo] = useState<{ name: string | null; phone: string | null; salonName: string | null }>({ name: null, phone: null, salonName: null });
  const [status, setStatus] = useState<SupportStatus>('PENDING');
  const [thread, setThread] = useState<ThreadItem[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isFetching, setIsFetching] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

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
      if (res.status === 403) {
        setAccessDenied(true);
        return;
      }
      if (res.status === 404) {
        setNotFound(true);
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setStatus(data.ticket.status);
        setUserInfo({
          name: data.ticket.user?.name || data.ticket.name,
          phone: data.ticket.phone || data.ticket.user?.phone,
          salonName: data.ticket.hadSalon ? data.ticket.salonName : null,
        });
        setThread(buildThread(data.ticket));
        if (!data.ticket.seenByAdmin) {
          fetch(`/api/support/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ seenByAdmin: true }),
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
        alert(err.error || 'خطا در ارسال پاسخ');
      }
    } catch (error) {
      console.error(error);
      alert('خطای شبکه در ارتباط با سرور');
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = async () => {
    try {
      const res = await fetch(`/api/support/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CLOSED' }),
      });
      if (res.ok) fetchThread();
    } catch (error) {
      console.error(error);
    }
  };

  if (accessDenied) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center px-4">
        <p className="text-zinc-500">شما دسترسی ادمین ندارید.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-white">

      {/* هدر */}
      <div className="sticky top-0 z-10 bg-white border-b border-zinc-100 px-4 py-3.5 flex items-center gap-3">
        <Link
          href="/admin/support"
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-zinc-100 transition-colors shrink-0"
        >
          <ChevronRight className="w-5 h-5 text-zinc-600" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-sm font-bold text-zinc-900 truncate">{userInfo.name || 'کاربر'}</h1>
          <p className="text-[11px] text-zinc-400" dir="ltr">{userInfo.phone}</p>
        </div>
        <span className={`text-[11px] px-2.5 py-1 rounded-lg font-medium shrink-0 ${statusMap[status].className}`}>
          {statusMap[status].label}
        </span>
      </div>

      {userInfo.salonName && (
        <div className="max-w-2xl mx-auto w-full px-4 pt-3">
          <p className="text-xs text-[#824c71] bg-[#e3c9dc]/15 inline-block px-2.5 py-1 rounded-lg">
            سالن: {userInfo.salonName}
          </p>
        </div>
      )}

      {/* پیام‌ها */}
      <div className="max-w-2xl mx-auto w-full px-4 py-5 space-y-3 flex-1 pb-28">
        {isFetching && <p className="text-center text-zinc-400 text-sm py-14">در حال بارگذاری...</p>}
        {notFound && <p className="text-center text-zinc-400 text-sm py-14">این مکالمه یافت نشد.</p>}

        {thread.map((item) =>
          item.sender === 'USER' ? (
            <div key={item.id} className="flex items-start gap-2 max-w-[85%] mr-auto flex-row-reverse">
              <div className="bg-zinc-50 border border-zinc-200 rounded-xl rounded-tr-sm px-4 py-3 text-[14px] leading-relaxed text-zinc-700">
                <div className="flex items-center gap-1.5 text-zinc-500 text-[11px] font-medium mb-1.5">
                  <User className="w-3.5 h-3.5" /> پیام کاربر
                </div>
                {item.message}
                <div className="text-[10px] text-zinc-400 mt-1.5">
                  {new Date(item.createdAt).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ) : (
            <div key={item.id} className="flex items-start gap-2 max-w-[85%]">
              <div className="bg-[#e3c9dc]/25 border border-[#e3c9dc]/60 rounded-xl rounded-tl-sm px-4 py-3 text-[14px] leading-relaxed text-zinc-700">
                <div className="flex items-center gap-1.5 text-[#824c71] text-[11px] font-medium mb-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> پاسخ شما
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

      {/* باکس ارسال پاسخ */}
      {!isFetching && !notFound && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-zinc-100 px-4 py-3">
          <div className="max-w-2xl mx-auto flex items-center gap-2">
            {status !== 'CLOSED' && (
              <button
                onClick={handleClose}
                className="text-[11px] text-zinc-400 hover:text-zinc-600 px-2 shrink-0 underline"
              >
                بستن مکالمه
              </button>
            )}
            <input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value.slice(0, 2000))}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="پاسخ خود را بنویسید..."
              className="flex-1 border border-zinc-200 rounded-xl px-4 py-2.5 text-sm focus:border-[#824c71] focus:ring-2 focus:ring-[#824c71]/15 outline-none transition-all"
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