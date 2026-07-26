//app/(dashboard)/profile/accounting/income/page.tsx
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ArrowRight, Loader2, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type ServiceItem = { name: string; price: number; staffPercent?: number };
type Visit = { visitDate: string; totalAmount: number; services: ServiceItem[] };

type RangeKey = 'today' | 'week' | 'month' | 'all';

const RANGE_LABELS: Record<RangeKey, string> = {
  today: 'امروز',
  week: '۷ روز اخیر',
  month: '۳۰ روز اخیر',
  all: 'همه',
};

function isInRange(dateStr: string, range: RangeKey) {
  if (range === 'all') return true;
  const date = new Date(dateStr);
  const now = new Date();
  if (range === 'today') return date.toDateString() === now.toDateString();
  const days = range === 'week' ? 7 : 30;
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - days);
  return date >= cutoff;
}

export default function IncomeReportPage() {
  const router = useRouter();
  const [userPhone, setUserPhone] = useState('');
  const [visits, setVisits] = useState<Visit[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [range, setRange] = useState<RangeKey>('today');

  useEffect(() => {
    const init = async () => {
      const meRes = await fetch('/api/auth/me');
      if (!meRes.ok) {
        router.push('/login');
        return;
      }
      const user = await meRes.json();
      setUserPhone(user.phone);
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

  const rangeVisits = useMemo(() => visits.filter((v) => isInRange(v.visitDate, range)), [visits, range]);
  const rangeIncome = rangeVisits.reduce((sum, v) => sum + v.totalAmount, 0);
  const rangeCommission = rangeVisits.reduce(
    (sum, v) => sum + v.services.reduce((s, item) => s + (item.price * (item.staffPercent || 0)) / 100, 0),
    0
  );

  return (
    <div className="flex flex-col min-h-screen bg-white pb-24">
      <div className="max-w-lg mx-auto w-full px-4 pt-6">
        <Link href="/profile/accounting" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-700 transition-colors mb-5">
          <ArrowRight className="w-4 h-4" /> بازگشت
        </Link>

        <h1 className="text-base font-bold text-zinc-900 mb-5">درآمد کل</h1>

        {isFetching ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-[#824c71] animate-spin mb-3" />
            <p className="text-sm text-zinc-400">در حال دریافت اطلاعات...</p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-5">
              {(Object.keys(RANGE_LABELS) as RangeKey[]).map((key) => (
                <button
                  key={key}
                  onClick={() => setRange(key)}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-colors ${
                    range === key ? 'bg-[#824c71] text-white' : 'bg-zinc-50 text-zinc-500'
                  }`}
                >
                  {RANGE_LABELS[key]}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="border border-zinc-100 rounded-2xl p-4">
                <p className="text-xs text-zinc-500 mb-1">تعداد مراجعه</p>
                <p className="text-lg font-bold text-zinc-800">{rangeVisits.length.toLocaleString('fa-IR')}</p>
              </div>
              <div className="border border-[#824c71]/15 bg-[#824c71]/5 rounded-2xl p-4">
                <p className="text-xs text-zinc-500 mb-1">درآمد</p>
                <p className="text-lg font-bold text-[#824c71]">{rangeIncome.toLocaleString('fa-IR')}</p>
                <p className="text-[10px] text-zinc-400">تومان</p>
              </div>
              <div className="border border-zinc-100 rounded-2xl p-4">
                <p className="text-xs text-zinc-500 mb-1">پورسانت پرسنل</p>
                <p className="text-lg font-bold text-zinc-700">{Math.round(rangeCommission).toLocaleString('fa-IR')}</p>
                <p className="text-[10px] text-zinc-400">تومان</p>
              </div>
              <div className="border border-green-100 bg-green-50 rounded-2xl p-4">
                <p className="text-xs text-zinc-500 mb-1 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> سود خالص (تقریبی)
                </p>
                <p className="text-lg font-bold text-green-600">
                  {Math.round(rangeIncome - rangeCommission).toLocaleString('fa-IR')}
                </p>
                <p className="text-[10px] text-zinc-400">تومان</p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}