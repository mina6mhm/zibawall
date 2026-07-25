//app/(dashboard)/visits/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Loader2, Calendar, Clock, CreditCard } from 'lucide-react';
import { useRouter } from 'next/navigation';

type ServiceItem = { name: string; price: number; staffName?: string };
type Visit = {
  id: string;
  visitDate: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  services: ServiceItem[];
  totalAmount: number;
  paymentStatus: 'PENDING' | 'SUCCESS' | 'FAILED';
  salon?: { name: string };
};

export default function MyVisitsPage() {
  const router = useRouter();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    const init = async () => {
      const meRes = await fetch('/api/auth/me');
      if (!meRes.ok) {
        router.push('/login');
        return;
      }
      const user = await meRes.json();
      try {
        const res = await fetch(`/api/visit?scope=customer&customerPhone=${user.phone}`);
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

  const handlePay = (visitId: string) => {
    // نکته: این بخش هنوز به درگاه پرداخت واقعی وصل نشده
    alert('اتصال به درگاه پرداخت به‌زودی فعال می‌شود.');
  };

  return (
    <div className="flex flex-col min-h-screen bg-white pb-32">
      <div className="max-w-lg mx-auto w-full px-4 pt-6">
        <h1 className="text-base font-bold text-zinc-900 mb-5">مراجعه‌های من</h1>

        {isFetching ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-[#824c71] animate-spin mb-3" />
            <p className="text-sm text-zinc-400">در حال دریافت اطلاعات...</p>
          </div>
        ) : visits.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-sm text-zinc-400">هنوز مراجعه‌ای ثبت نشده است.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {visits.map((visit) => (
              <div key={visit.id} className="border border-zinc-100 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-zinc-900">{visit.salon?.name || 'سالن'}</span>
                  <span
                    className={`text-[10px] px-2 py-1 rounded-full font-medium ${
                      visit.paymentStatus === 'SUCCESS'
                        ? 'bg-green-50 text-green-600'
                        : visit.paymentStatus === 'FAILED'
                        ? 'bg-red-50 text-red-500'
                        : 'bg-amber-50 text-amber-600'
                    }`}
                  >
                    {visit.paymentStatus === 'SUCCESS' ? 'پرداخت‌شده' : visit.paymentStatus === 'FAILED' ? 'ناموفق' : 'در انتظار پرداخت'}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs text-zinc-400 mb-3">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> {new Date(visit.visitDate).toLocaleDateString('fa-IR')}
                  </span>
                  {visit.checkInTime && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {visit.checkInTime} - {visit.checkOutTime || '—'}
                    </span>
                  )}
                </div>

                <div className="space-y-1.5">
                  {visit.services.map((s, i) => (
                    <div key={i} className="flex items-center justify-between text-xs bg-zinc-50 rounded-lg px-3 py-2">
                      <span className="text-zinc-600">
                        {s.name} {s.staffName ? `· ${s.staffName}` : ''}
                      </span>
                      <span className="font-medium text-zinc-800">{s.price.toLocaleString('fa-IR')} ت</span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-100">
                  <span className="text-xs text-zinc-500">مبلغ کل</span>
                  <span className="text-sm font-bold text-[#824c71]">{visit.totalAmount.toLocaleString('fa-IR')} تومان</span>
                </div>

                {visit.paymentStatus === 'PENDING' && (
                  <button
                    onClick={() => handlePay(visit.id)}
                    className="w-full mt-3 flex items-center justify-center gap-1.5 bg-[#824c71] text-white py-2.5 rounded-xl text-xs font-bold hover:bg-[#6d3f5e] transition-colors"
                  >
                    <CreditCard className="w-3.5 h-3.5" /> پرداخت آنلاین
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
