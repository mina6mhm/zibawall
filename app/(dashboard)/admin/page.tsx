// app/(dashboard)/admin/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { MessageCircle, Store, ChevronLeft, ShieldCheck } from 'lucide-react';

export default function AdminHubPage() {
  const [pendingSupportCount, setPendingSupportCount] = useState<number | null>(null);
  const [pendingSalonsCount, setPendingSalonsCount] = useState<number | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const [supportRes, salonsRes] = await Promise.all([
          fetch('/api/support?status=PENDING'),
          fetch('/api/admin/salons?status=PENDING_APPROVAL'),
        ]);

        if (supportRes.status === 403 || salonsRes.status === 403) {
          setAccessDenied(true);
          return;
        }

        if (supportRes.ok) {
          const data = await supportRes.json();
          setPendingSupportCount(data.messages?.length ?? 0);
        }
        if (salonsRes.ok) {
          const data = await salonsRes.json();
          setPendingSalonsCount(data.salons?.length ?? 0);
        }
      } catch (error) {
        console.error('خطا در دریافت اطلاعات پنل مدیریت:', error);
      }
    };
    fetchCounts();
  }, []);

  if (accessDenied) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center px-4">
        <p className="text-zinc-500">شما دسترسی ادمین ندارید.</p>
      </div>
    );
  }

  const sections = [
    {
      key: 'salons',
      label: 'تایید سالن‌ها',
      description: 'بررسی و تایید یا رد کسب‌وکارهای ثبت‌شده',
      icon: Store,
      href: '/admin/salons',
      count: pendingSalonsCount,
    },
    {
      key: 'support',
      label: 'پیام‌های پشتیبانی',
      description: 'پاسخ‌گویی به پیام‌های کاربران',
      icon: MessageCircle,
      href: '/admin/support',
      count: pendingSupportCount,
    },
  ];

  return (
    <div className="max-w-2xl mx-auto px-3 sm:px-6 py-6 sm:py-10">
      <div className="flex items-center gap-2.5 mb-6">
        <div className="w-10 h-10 bg-zinc-100 rounded-xl flex items-center justify-center text-[#824c71] shrink-0">
          <ShieldCheck className="w-5 h-5" strokeWidth={1.5} />
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-zinc-900">پنل مدیریت</h1>
      </div>

      <div className="space-y-2.5">
        {sections.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.key}
              href={item.href}
              className="flex items-center justify-between gap-3 bg-white border border-zinc-100 px-4 py-4 rounded-2xl hover:bg-zinc-50 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 bg-zinc-50 rounded-xl flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-[#824c71]" strokeWidth={1.5} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-zinc-900">{item.label}</p>
                  <p className="text-xs text-zinc-400 mt-0.5 truncate">{item.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {!!item.count && (
                  <span className="min-w-[22px] h-[22px] px-1.5 flex items-center justify-center rounded-full bg-[#824c71] text-white text-[11px] font-bold">
                    {item.count}
                  </span>
                )}
                <ChevronLeft className="w-4 h-4 text-zinc-400" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}