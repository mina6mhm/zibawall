//app/(dashboard)/profile/accounting/commission/page.tsx
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ArrowRight, Loader2, ChevronRight, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type ServiceItem = { name: string; price: number; staffId?: string | null; staffName?: string | null; staffPercent?: number };
type Visit = { visitDate: string; services: ServiceItem[] };

const MAX_DAYS_BACK = 6; // امروز + ۶ روز قبل = ۷ روز

function startOfDay(d: Date) {
  const nd = new Date(d);
  nd.setHours(0, 0, 0, 0);
  return nd;
}

function getDateForOffset(offset: number) {
  const d = startOfDay(new Date());
  d.setDate(d.getDate() - offset);
  return d;
}

function getDayLabel(offset: number, date: Date) {
  if (offset === 0) return 'امروز';
  if (offset === 1) return 'دیروز';
  return date.toLocaleDateString('fa-IR', { weekday: 'long', day: 'numeric', month: 'long' });
}

export default function CommissionReportPage() {
  const router = useRouter();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [dayOffset, setDayOffset] = useState(0); // ۰ = امروز

  useEffect(() => {
    const init = async () => {
      const meRes = await fetch('/api/auth/me');
      if (!meRes.ok) {
        router.push('/login');
        return;
      }
      const user = await meRes.json();
      try {
        const res = await fetch(`/api/visit?scope=salon&userPhone=${user.phone}`);
        if (res.ok) {
          const data = await res.json();
          setVisits(data.visits || []);
        }
      } finally {
        setIsFetching(false);
      }
    };
    init();
  }, [router]);

  const selectedDate = getDateForOffset(dayOffset);
  const dayLabel = getDayLabel(dayOffset, selectedDate);

  const dayEntries = useMemo(() => {
    const dayVisits = visits.filter((v) => startOfDay(new Date(v.visitDate)).getTime() === selectedDate.getTime());
    const map = new Map<string, { name: string; totalCommission: number; serviceCount: number }>();
    dayVisits.forEach((v) => {
      v.services.forEach((s) => {
        if (!s.staffPercent) return;
        const key = s.staffId || `unlinked:${s.staffName || 'نامشخص'}`;
        const name = s.staffName || 'بدون پرسنل مشخص';
        const commission = (s.price * (s.staffPercent || 0)) / 100;
        const entry = map.get(key) || { name, totalCommission: 0, serviceCount: 0 };
        entry.totalCommission += commission;
        entry.serviceCount += 1;
        map.set(key, entry);
      });
    });
    return Array.from(map.values()).sort((a, b) => b.totalCommission - a.totalCommission);
  }, [visits, selectedDate]);

  const dayTotal = dayEntries.reduce((sum, e) => sum + e.totalCommission, 0);

  return (
    <div className="flex flex-col min-h-screen bg-white pb-24">
      <div className="max-w-lg mx-auto w-full px-4 pt-6">
        <Link href="/profile/accounting" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-700 transition-colors mb-5">
          <ArrowRight className="w-4 h-4" /> بازگشت
        </Link>

        <h1 className="text-base font-bold text-zinc-900 mb-5">پورسانت پرسنل</h1>

        {isFetching ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-[#824c71] animate-spin mb-3" />
            <p className="text-sm text-zinc-400">در حال دریافت اطلاعات...</p>
          </div>
        ) : (
          <>
            {/* ناوبری روزها با فلش */}
            <div className="flex items-center justify-between bg-zinc-50 rounded-2xl p-2 mb-5">
              <button
                onClick={() => setDayOffset((v) => Math.max(v - 1, 0))}
                disabled={dayOffset <= 0}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-white text-zinc-600 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-zinc-100 transition-colors shrink-0"
                aria-label="روز بعد"
              >
                <ChevronRight className="w-5 h-5" />
              </button>

              <div className="text-center">
                <p className="text-sm font-bold text-zinc-800">{dayLabel}</p>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  {Math.round(dayTotal).toLocaleString('fa-IR')} تومان
                </p>
              </div>

              <button
                onClick={() => setDayOffset((v) => Math.min(v + 1, MAX_DAYS_BACK))}
                disabled={dayOffset >= MAX_DAYS_BACK}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-white text-zinc-600 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-zinc-100 transition-colors shrink-0"
                aria-label="روز قبل"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            </div>

            {dayEntries.length === 0 ? (
              <p className="text-sm text-zinc-400 text-center py-12">پورسانتی برای این روز ثبت نشده است.</p>
            ) : (
              <div className="space-y-2.5">
                {dayEntries.map((entry, idx) => (
                  <div key={idx} className="flex items-center justify-between border border-zinc-100 rounded-2xl p-4">
                    <div>
                      <p className="text-sm font-bold text-zinc-900">{entry.name}</p>
                      <p className="text-xs text-zinc-400 mt-0.5">{entry.serviceCount.toLocaleString('fa-IR')} خدمت</p>
                    </div>
                    <p className="text-sm font-bold text-[#824c71]">
                      {Math.round(entry.totalCommission).toLocaleString('fa-IR')} تومان
                    </p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}