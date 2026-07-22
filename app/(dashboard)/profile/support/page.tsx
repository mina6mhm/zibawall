// app/(dashboard)/profile/support/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronRight, MessageCircle, Plus } from 'lucide-react';

type SupportStatus = 'PENDING' | 'IN_PROGRESS' | 'ANSWERED' | 'CLOSED';
type Sender = 'USER' | 'ADMIN';

interface SupportMessage {
  id: string;
  status: SupportStatus;
  seenByUser: boolean;
  createdAt: string;
  lastMessage: string;
  lastSender: Sender;
}

const statusMap: Record<SupportStatus, { label: string; className: string }> = {
  PENDING: { label: 'در انتظار بررسی', className: 'bg-zinc-100 text-zinc-500' },
  IN_PROGRESS: { label: 'در حال بررسی', className: 'bg-amber-50 text-amber-600' },
  ANSWERED: { label: 'پاسخ داده شد', className: 'bg-emerald-50 text-emerald-600' },
  CLOSED: { label: 'بسته شده', className: 'bg-zinc-100 text-zinc-400' },
};

export default function SupportListPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const res = await fetch('/api/support/mine');
        if (res.ok) {
          const data = await res.json();
          setMessages(data.messages);
        } else if (res.status === 401) {
          router.push('/login');
        }
      } catch (error) {
        console.error('خطا در دریافت پیام‌ها:', error);
      } finally {
        setIsFetching(false);
      }
    };
    fetchMessages();
  }, [router]);

  return (
    <div className="flex flex-col min-h-screen bg-white">

      {/* هدر */}
      <div className="sticky top-0 z-10 bg-white border-b border-zinc-100 px-4 py-3.5 flex items-center gap-3">
        <Link
          href="/profile"
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-zinc-100 transition-colors shrink-0"
        >
          <ChevronRight className="w-5 h-5 text-zinc-600" />
        </Link>
        <h1 className="text-base font-bold text-zinc-900">پشتیبانی</h1>
      </div>

      {/* لیست مکالمات */}
      <div className="max-w-lg mx-auto w-full flex-1">
        {isFetching && (
          <p className="text-center text-zinc-400 text-sm py-14">در حال بارگذاری...</p>
        )}

        {!isFetching && messages.length === 0 && (
          <div className="text-center py-16 px-4">
            <MessageCircle className="w-12 h-12 text-zinc-300 mx-auto mb-3" strokeWidth={1.5} />
            <p className="text-zinc-400 text-sm mb-6">هنوز پیامی ارسال نکرده‌اید</p>
            <Link
              href="/profile/support/new"
              className="inline-flex items-center gap-2 bg-[#824c71] text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-[#6d3f5e] transition-colors"
            >
              <Plus className="w-4 h-4" /> ارسال پیام جدید
            </Link>
          </div>
        )}

        <div className="divide-y divide-zinc-100">
          {messages.map((msg) => {
            // خونده‌نشده یعنی: آخرین پیام از طرف ادمین بوده و کاربر هنوز ندیدتش
            const unread = !msg.seenByUser && msg.lastSender === 'ADMIN';
            return (
              <Link
                key={msg.id}
                href={`/profile/support/${msg.id}`}
                className="flex items-start gap-3 px-4 py-3.5 hover:bg-zinc-50 transition-colors"
              >
                <div className="w-11 h-11 rounded-full bg-zinc-100 flex items-center justify-center shrink-0">
                  <MessageCircle className="w-5 h-5 text-[#824c71]" strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-[11px] px-2 py-0.5 rounded-md font-medium ${statusMap[msg.status].className}`}>
                      {statusMap[msg.status].label}
                    </span>
                    <span className="text-[11px] text-zinc-400 shrink-0">
                      {new Date(msg.createdAt).toLocaleDateString('fa-IR')}
                    </span>
                  </div>
                  <p className={`text-sm mt-1 truncate ${unread ? 'font-bold text-zinc-900' : 'text-zinc-500'}`}>
                    {msg.lastSender === 'ADMIN' ? '' : 'شما: '}{msg.lastMessage}
                  </p>
                </div>
                {unread && (
                  <span className="w-2.5 h-2.5 rounded-full bg-[#824c71] mt-1.5 shrink-0" />
                )}
              </Link>
            );
          })}
        </div>
      </div>

      {/* دکمه شناور پیام جدید */}
      <Link
        href="/profile/support/new"
        className="fixed bottom-24 left-4 md:left-auto md:right-1/2 md:translate-x-[calc(288px)] w-12 h-12 bg-[#824c71] text-white rounded-full flex items-center justify-center shadow-lg shadow-[#824c71]/30 hover:bg-[#6d3f5e] transition-colors z-20"
        aria-label="پیام جدید"
      >
        <Plus className="w-6 h-6" />
      </Link>
    </div>
  );
}