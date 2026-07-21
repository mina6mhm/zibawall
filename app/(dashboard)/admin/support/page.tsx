// app/(dashboard)/admin/support/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { MessageCircle, Send, Clock, CheckCircle2, Filter } from 'lucide-react';

type SupportStatus = 'PENDING' | 'IN_PROGRESS' | 'ANSWERED' | 'CLOSED';

interface SupportMessage {
  id: string;
  message: string;
  status: SupportStatus;
  adminReply: string | null;
  repliedAt: string | null;
  seenByUser: boolean;
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
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [statusFilter, setStatusFilter] = useState<SupportStatus | 'ALL'>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);

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

  useEffect(() => {
    fetchMessages();
  }, [statusFilter]);

  const selectedMessage = messages.find((m) => m.id === selectedId) || null;

  const handleReply = async () => {
    if (!selectedId || !replyText.trim()) return;
    setIsSending(true);
    try {
      const res = await fetch(`/api/support/${selectedId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reply: replyText.trim(), status: 'ANSWERED' }),
      });
      if (res.ok) {
        setReplyText('');
        fetchMessages();
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
    <div className="max-w-6xl mx-auto px-3 sm:px-6 py-6 sm:py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-zinc-900">مدیریت پیام‌های پشتیبانی</h1>

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* --- لیست پیام‌ها --- */}
        <div className="lg:col-span-1 space-y-3 max-h-[75vh] overflow-y-auto pr-1">
          {isLoading && <p className="text-center text-zinc-400 text-sm py-8">در حال بارگذاری...</p>}

          {!isLoading && messages.length === 0 && (
            <div className="text-center py-10">
              <MessageCircle className="w-10 h-10 text-zinc-300 mx-auto mb-3" strokeWidth={1.5} />
              <p className="text-zinc-400 text-sm">پیامی وجود ندارد</p>
            </div>
          )}

          {messages.map((msg) => (
            <button
              key={msg.id}
              onClick={() => {
                setSelectedId(msg.id);
                setReplyText('');
              }}
              className={`w-full text-right border rounded-xl p-3.5 transition-all ${
                selectedId === msg.id ? 'border-[#824c71] bg-[#e3c9dc]/10' : 'border-zinc-100 bg-white hover:bg-zinc-50'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold text-zinc-800 text-xs">
                  {msg.user?.name || msg.name || 'کاربر'}
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-md font-medium ${statusMap[msg.status].className}`}>
                  {statusMap[msg.status].label}
                </span>
              </div>
              <p className="text-zinc-500 text-[11px] mb-1" dir="ltr">{msg.phone || msg.user?.phone}</p>
              <p className="text-zinc-600 text-xs line-clamp-2">{msg.message}</p>
              {msg.hadSalon && msg.salonName && (
                <p className="text-[10px] text-[#824c71] mt-1">سالن: {msg.salonName}</p>
              )}
              <p className="text-[10px] text-zinc-400 mt-1.5">
                {new Date(msg.createdAt).toLocaleDateString('fa-IR')}
              </p>
            </button>
          ))}
        </div>

        {/* --- جزئیات و پاسخ --- */}
        <div className="lg:col-span-2">
          {!selectedMessage ? (
            <div className="h-full flex items-center justify-center text-zinc-400 text-sm py-20">
              یک پیام را از لیست انتخاب کنید
            </div>
          ) : (
            <div className="bg-white border border-zinc-100 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                <div>
                  <p className="font-bold text-zinc-800 text-sm">
                    {selectedMessage.user?.name || selectedMessage.name || 'کاربر'}
                  </p>
                  <p className="text-zinc-400 text-xs" dir="ltr">
                    {selectedMessage.phone || selectedMessage.user?.phone}
                  </p>
                </div>
                <span className={`text-[11px] px-2.5 py-1 rounded-lg font-medium ${statusMap[selectedMessage.status].className}`}>
                  {statusMap[selectedMessage.status].label}
                </span>
              </div>

              <div className="bg-zinc-50 rounded-xl p-4 text-sm text-zinc-700 leading-relaxed">
                {selectedMessage.message}
              </div>

              {selectedMessage.adminReply && (
                <div className="bg-[#e3c9dc]/20 border border-[#e3c9dc]/60 rounded-xl p-4 text-sm text-zinc-700 leading-relaxed">
                  <div className="flex items-center gap-1.5 text-[#824c71] text-[11px] font-medium mb-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> پاسخ قبلی
                  </div>
                  {selectedMessage.adminReply}
                  {selectedMessage.repliedAt && (
                    <div className="flex items-center gap-1 text-zinc-400 text-[10px] mt-2">
                      <Clock className="w-3 h-3" />
                      {new Date(selectedMessage.repliedAt).toLocaleDateString('fa-IR')}
                    </div>
                  )}
                </div>
              )}

              <div>
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows={4}
                  placeholder="پاسخ خود را بنویسید..."
                  className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-sm resize-none focus:border-[#d3aec8] focus:ring-2 focus:ring-[#e3c9dc]/40 outline-none"
                />
                <button
                  onClick={handleReply}
                  disabled={isSending || !replyText.trim()}
                  className="mt-3 bg-[#824c71] text-white px-5 py-2.5 rounded-xl hover:bg-[#6d3f5e] transition-all active:scale-[0.98] disabled:opacity-40 flex items-center gap-2 text-sm font-medium"
                >
                  <Send className="w-4 h-4" />
                  {isSending ? 'در حال ارسال...' : 'ارسال پاسخ'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}