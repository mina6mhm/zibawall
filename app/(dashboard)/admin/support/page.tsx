// app/(dashboard)/admin/support/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { MessageCircle, Filter } from 'lucide-react';

type SupportStatus = 'PENDING' | 'IN_PROGRESS' | 'ANSWERED' | 'CLOSED';

interface SupportMessage {
  id: string;
  message: string;
  status: SupportStatus;
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

export default function AdminSupportPage() {
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [statusFilter, setStatusFilter] = useState<SupportStatus | 'ALL'>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    const fetchMessages = async () => {
      setIsLoading(true);
      try {
        const url = statusFilter === 'ALL' ? '/api/support' : `/api/support?status=${statusFilter}`;
        const res = await fetch(url);
        if (res.status === 403) {
          setAccessDenied(true);
          return;
        }
        if (res.ok) {
          const data = await res.json();
          setMessages(data.messages);
        }
      } catch (error) {
        console.error('خطا در دریافت پیام‌ها:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchMessages();
  }, [statusFilter]);

  if (accessDenied) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center px-4">
        <p className="text-zinc-500">شما دسترسی ادمین ندارید.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-3 sm:px-6 py-6 sm:py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-zinc-900">پیام‌های پشتیبانی</h1>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-zinc-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="border border-zinc-200 rounded-lg px-2.5 py-1.5 text-sm bg-white"
          >
            <option value="ALL">همه</option>
            <option value="PENDING">در انتظار بررسی</option>
            <option value="IN_PROGRESS">در حال بررسی</option>
            <option value="ANSWERED">پاسخ داده شد</option>
            <option value="CLOSED">بسته شده</option>
          </select>
        </div>
      </div>

      {isLoading && <p className="text-center text-zinc-400 text-sm py-14">در حال بارگذاری...</p>}

      {!isLoading && messages.length === 0 && (
        <div className="text-center py-14">
          <MessageCircle className="w-10 h-10 text-zinc-300 mx-auto mb-3" strokeWidth={1.5} />
          <p className="text-zinc-400 text-sm">پیامی وجود ندارد</p>
        </div>
      )}

      <div className="divide-y divide-zinc-100 border border-zinc-100 rounded-2xl overflow-hidden">
        {messages.map((msg) => {
          const unread = msg.status === 'PENDING' || msg.status === 'IN_PROGRESS';
          return (
            <Link
              key={msg.id}
              href={`/admin/support/${msg.id}`}
              className="flex items-start gap-3 px-4 py-3.5 hover:bg-zinc-50 transition-colors bg-white"
            >
              <div className="w-11 h-11 rounded-full bg-zinc-100 flex items-center justify-center shrink-0">
                <MessageCircle className="w-5 h-5 text-[#824c71]" strokeWidth={1.5} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="font-bold text-zinc-800 text-sm truncate">
                    {msg.user?.name || msg.name || 'کاربر'}
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-md font-medium shrink-0 ${statusMap[msg.status].className}`}>
                    {statusMap[msg.status].label}
                  </span>
                </div>
                <p className="text-zinc-500 text-xs truncate">{msg.message}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-zinc-400" dir="ltr">{msg.phone || msg.user?.phone}</span>
                  <span className="text-[10px] text-zinc-300">•</span>
                  <span className="text-[10px] text-zinc-400">
                    {new Date(msg.createdAt).toLocaleDateString('fa-IR')}
                  </span>
                </div>
              </div>
              {unread && <span className="w-2.5 h-2.5 rounded-full bg-[#824c71] mt-1.5 shrink-0" />}
            </Link>
          );
        })}
      </div>
    </div>
  );
}