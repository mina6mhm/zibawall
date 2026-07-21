// components/support/SupportPanel.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { Send, Clock, CheckCircle2, MessageCircle, User } from 'lucide-react';

type SupportStatus = 'PENDING' | 'IN_PROGRESS' | 'ANSWERED' | 'CLOSED';

interface SupportMessage {
  id: string;
  message: string;
  status: SupportStatus;
  adminReply: string | null;
  repliedAt: string | null;
  seenByUser: boolean;
  createdAt: string;
}

const statusMap: Record<SupportStatus, { label: string; className: string }> = {
  PENDING: { label: 'در انتظار بررسی', className: 'bg-zinc-100 text-zinc-500' },
  IN_PROGRESS: { label: 'در حال بررسی', className: 'bg-amber-50 text-amber-600' },
  ANSWERED: { label: 'پاسخ داده شد', className: 'bg-emerald-50 text-emerald-600' },
  CLOSED: { label: 'بسته شده', className: 'bg-zinc-100 text-zinc-400' },
};

export default function SupportPanel() {
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  const fetchMessages = async () => {
    try {
      const res = await fetch('/api/support/mine');
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages);

        // علامت‌گذاری پیام‌های جدید به عنوان دیده‌شده
        const unseen = data.messages.filter(
          (m: SupportMessage) => m.adminReply && !m.seenByUser
        );
        unseen.forEach((m: SupportMessage) => {
          fetch(`/api/support/${m.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ seen: true }),
          });
        });
      }
    } catch (error) {
      console.error('خطا در دریافت پیام‌های پشتیبانی:', error);
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  const handleSend = async () => {
    const trimmed = newMessage.trim();
    if (!trimmed) return;

    setIsLoading(true);
    try {
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed }),
      });

      if (res.ok) {
        setNewMessage('');
        fetchMessages();
      } else {
        const err = await res.json();
        alert(err.error || 'خطا در ارسال پیام');
      }
    } catch (error) {
      console.error(error);
      alert('خطای شبکه در ارتباط با سرور');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <h2 className="hidden md:block text-xl font-bold text-zinc-800">پشتیبانی</h2>

      {/* --- فرم ارسال پیام جدید --- */}
      <div className="bg-zinc-50/50 border border-zinc-200 rounded-2xl p-4 md:p-5">
        <textarea
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value.slice(0, 2000))}
          placeholder="سوال یا مشکلتون رو اینجا بنویسید..."
          rows={3}
          className="w-full bg-white border border-zinc-200 rounded-xl px-4 py-3 text-[14px] md:text-base resize-none focus:border-[#824c71] focus:ring-2 focus:ring-[#824c71]/15 outline-none transition-all"
        />
        <div className="flex items-center justify-between mt-3">
          <span className="text-[11px] text-zinc-400">{newMessage.length}/۲۰۰۰</span>
          <button
            onClick={handleSend}
            disabled={isLoading || !newMessage.trim()}
            className="bg-[#824c71] text-white px-5 py-2.5 rounded-xl shadow-sm shadow-[#824c71]/30 hover:bg-[#6d3f5e] hover:shadow-md hover:shadow-[#824c71]/40 transition-all active:scale-[0.98] disabled:opacity-40 disabled:shadow-none disabled:cursor-not-allowed flex items-center gap-2 text-[14px] font-semibold"
          >
            <Send className="w-4 h-4" />
            {isLoading ? 'در حال ارسال...' : 'ارسال پیام'}
          </button>
        </div>
      </div>

      {/* --- تاریخچه پیام‌ها --- */}
      <div className="space-y-4">
        {isFetching && (
          <p className="text-center text-zinc-400 text-sm py-8">در حال بارگذاری...</p>
        )}

        {!isFetching && messages.length === 0 && (
          <div className="text-center py-10">
            <MessageCircle className="w-10 h-10 text-zinc-300 mx-auto mb-3" strokeWidth={1.5} />
            <p className="text-zinc-400 text-sm">هنوز پیامی ارسال نکرده‌اید</p>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className="border border-zinc-100 rounded-2xl p-4 md:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-zinc-400">
                {new Date(msg.createdAt).toLocaleDateString('fa-IR')}
              </span>
              <span className={`text-[11px] px-2.5 py-1 rounded-lg font-medium ${statusMap[msg.status].className}`}>
                {statusMap[msg.status].label}
              </span>
            </div>

            {/* پیام کاربر */}
            <div className="flex items-start gap-2 max-w-[90%] mr-auto flex-row-reverse">
              <div className="bg-[#e3c9dc]/25 border border-[#e3c9dc]/60 rounded-xl rounded-tr-sm px-4 py-3 text-[14px] leading-relaxed text-zinc-700">
                <div className="flex items-center gap-1.5 text-[#824c71] text-[11px] font-medium mb-1.5">
                  <User className="w-3.5 h-3.5" /> پیام شما
                </div>
                {msg.message}
              </div>
            </div>

            {/* پاسخ ادمین */}
            {msg.adminReply && (
              <div className="flex items-start gap-2 max-w-[90%]">
                <div className="bg-[#e3c9dc]/25 border border-[#e3c9dc]/60 rounded-xl rounded-tl-sm px-4 py-3 text-[14px] leading-relaxed text-zinc-700">
                  <div className="flex items-center gap-1.5 text-[#824c71] text-[11px] font-medium mb-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> پاسخ پشتیبانی
                  </div>
                  {msg.adminReply}
                  {msg.repliedAt && (
                    <div className="flex items-center gap-1 text-zinc-400 text-[10px] mt-2">
                      <Clock className="w-3 h-3" />
                      {new Date(msg.repliedAt).toLocaleDateString('fa-IR')}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}