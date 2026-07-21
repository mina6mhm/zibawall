// app/(dashboard)/admin/support/[id]/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, Send, CheckCircle2, Clock } from 'lucide-react';

type SupportStatus = 'PENDING' | 'IN_PROGRESS' | 'ANSWERED' | 'CLOSED';

interface SupportMessage {
  id: string;
  message: string;
  status: SupportStatus;
  adminReply: string | null;
  repliedAt: string | null;
  createdAt: string;
  phone: string | null;
  name: string | null;
  hadSalon: boolean;
  salonName: string | null;
  user: { name: string | null; phone: string | null; username: string | null };
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
  const [msg, setMsg] = useState<SupportMessage | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isFetching, setIsFetching] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);

  const fetchMessage = async () => {
    try {
      const res = await fetch('/api/support');
      if (res.status === 403) {
        setAccessDenied(true);
        return;
      }
      if (res.ok) {
        const data = await res.json();
        const found = data.messages.find((m: SupportMessage) => m.id === id);
        setMsg(found || null);
      }
    } catch (error) {
      console.error('خطا در دریافت پیام:', error);
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    fetchMessage();
  }, [id]);

  const handleReply = async () => {
    if (!replyText.trim()) return;
    setIsSending(true);
    try {
      const res = await fetch(`/api/support/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reply: replyText.trim(), status: 'ANSWERED' }),
      });
      if (res.ok) {
        setReplyText('');
        fetchMessage();
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
          <h1 className="text-sm font-bold text-zinc-900 truncate">
            {msg?.user?.name || msg?.name || 'کاربر'}
          </h1>
          <p className="text-[11px] text-zinc-400" dir="ltr">{msg?.phone || msg?.user?.phone}</p>
        </div>
        {msg && (
          <span className={`text-[11px] px-2.5 py-1 rounded-lg font-medium shrink-0 ${statusMap[msg.status].className}`}>
            {statusMap[msg.status].label}
          </span>
        )}
      </div>

      <div className="max-w-2xl mx-auto w-full px-4 py-5 flex-1 space-y-4">
        {isFetching && <p className="text-center text-zinc-400 text-sm py-14">در حال بارگذاری...</p>}

        {!isFetching && !msg && (
          <p className="text-center text-zinc-400 text-sm py-14">این پیام یافت نشد.</p>
        )}

        {msg && (
          <>
            {msg.hadSalon && msg.salonName && (
              <p className="text-xs text-[#824c71] bg-[#e3c9dc]/15 inline-block px-2.5 py-1 rounded-lg">
                سالن: {msg.salonName}
              </p>
            )}

            <div className="bg-zinc-50 rounded-xl p-4 text-sm text-zinc-700 leading-relaxed">
              {msg.message}
              <div className="text-[10px] text-zinc-400 mt-2">
                {new Date(msg.createdAt).toLocaleDateString('fa-IR')}
              </div>
            </div>

            {msg.adminReply && (
              <div className="bg-[#e3c9dc]/25 border border-[#e3c9dc]/60 rounded-xl p-4 text-sm text-zinc-700 leading-relaxed">
                <div className="flex items-center gap-1.5 text-[#824c71] text-[11px] font-medium mb-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> پاسخ قبلی
                </div>
                {msg.adminReply}
                {msg.repliedAt && (
                  <div className="flex items-center gap-1 text-zinc-400 text-[10px] mt-2">
                    <Clock className="w-3 h-3" />
                    {new Date(msg.repliedAt).toLocaleDateString('fa-IR')}
                  </div>
                )}
              </div>
            )}

            <div className="pt-2">
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                rows={5}
                placeholder="پاسخ خود را بنویسید..."
                className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-sm resize-none focus:border-[#824c71] focus:ring-2 focus:ring-[#824c71]/15 outline-none"
              />
              <button
                onClick={handleReply}
                disabled={isSending || !replyText.trim()}
                className="mt-3 bg-[#824c71] text-white px-5 py-2.5 rounded-xl shadow-sm shadow-[#824c71]/30 hover:bg-[#6d3f5e] hover:shadow-md hover:shadow-[#824c71]/40 transition-all active:scale-[0.98] disabled:opacity-40 disabled:shadow-none flex items-center gap-2 text-sm font-semibold"
              >
                <Send className="w-4 h-4" />
                {isSending ? 'در حال ارسال...' : 'ارسال پاسخ'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}