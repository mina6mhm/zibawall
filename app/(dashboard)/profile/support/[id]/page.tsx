// app/(dashboard)/profile/support/[id]/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, CheckCircle2, Clock, User } from 'lucide-react';

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

export default function SupportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [msg, setMsg] = useState<SupportMessage | null>(null);
  const [isFetching, setIsFetching] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetchOne = async () => {
      try {
        const res = await fetch('/api/support/mine');
        if (res.ok) {
          const data = await res.json();
          const found = data.messages.find((m: SupportMessage) => m.id === id);
          if (!found) {
            setNotFound(true);
          } else {
            setMsg(found);
            // علامت‌گذاری به عنوان دیده‌شده
            if (found.adminReply && !found.seenByUser) {
              fetch(`/api/support/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ seen: true }),
              });
            }
          }
        } else if (res.status === 401) {
          router.push('/login');
        }
      } catch (error) {
        console.error('خطا در دریافت پیام:', error);
      } finally {
        setIsFetching(false);
      }
    };
    fetchOne();
  }, [id, router]);

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
        <h1 className="text-base font-bold text-zinc-900">جزئیات پیام</h1>
        {msg && (
          <span className={`mr-auto text-[11px] px-2.5 py-1 rounded-lg font-medium ${statusMap[msg.status].className}`}>
            {statusMap[msg.status].label}
          </span>
        )}
      </div>

      <div className="max-w-lg mx-auto w-full px-4 py-5 space-y-3 flex-1">
        {isFetching && (
          <p className="text-center text-zinc-400 text-sm py-14">در حال بارگذاری...</p>
        )}

        {notFound && (
          <p className="text-center text-zinc-400 text-sm py-14">این پیام یافت نشد.</p>
        )}

        {msg && (
          <>
            <span className="block text-[11px] text-zinc-400 text-center">
              {new Date(msg.createdAt).toLocaleDateString('fa-IR')}
            </span>

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
            {msg.adminReply ? (
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
            ) : (
              <p className="text-center text-zinc-400 text-xs py-4">هنوز پاسخی داده نشده است</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}