//app/(dashboard)/profile/accounting/page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ArrowRight, Plus, Loader2, User, Clock, Calendar } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import CreateVisitModal from '@/components/business/CreateVisitModal';

type ServiceItem = { name: string; price: number; staffName?: string; staffPercent?: number };
type Visit = {
  id: string;
  customerName: string | null;
  customerPhone: string;
  visitDate: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  services: ServiceItem[];
  totalAmount: number;
  paymentStatus: 'PENDING' | 'SUCCESS' | 'FAILED';
};

export default function AccountingPage() {
  const router = useRouter();
  const [userPhone, setUserPhone] = useState('');
  const [visits, setVisits] = useState<Visit[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchVisits = useCallback(async (phone: string) => {
    setIsFetching(true);
    try {
      const res = await fetch(`/api/visit?scope=salon&userPhone=${phone}`);
      if (res.ok) {
        const data = await res.json();
        setVisits(data.visits || []);
      }
    } catch (error) {
      console.error('خطا در دریافت مراجعه‌ها:', error);
    } finally {
      setIsFetching(false);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      const meRes = await fetch('/api/auth/me');
      if (!meRes.ok) {
        router.push('/login');
        return;
      }
      const user = await meRes.json();
      setUserPhone(user.phone);
      fetchVisits(user.phone);
    };
    init();
  }, [router, fetchVisits]);

  const totalIncome = visits.reduce((sum, v) => sum + v.totalAmount, 0);
  const totalCommission = visits.reduce(
    (sum, v) => sum + v.services.reduce((s, item) => s + (item.price * (item.staffPercent || 0)) / 100, 0),
    0
  );

  return (
    <div className="flex flex-col min-h-screen bg-white pb-32">
      <div className="max-w-lg mx-auto w-full px-4 pt-6">
        <Link href="/profile" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-700 transition-colors mb-5">
          <ArrowRight className="w-4 h-4" /> بازگشت
        </Link>

        <div className="flex items-center justify-between mb-5">
          <h1 className="text-base font-bold text-zinc-900">حسابداری</h1>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 bg-[#824c71] text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-[#6d3f5e] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> ثبت مراجعه
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="bg-[#824c71]/5 border border-[#824c71]/15 rounded-2xl p-4">
            <p className="text-xs text-zinc-500 mb-1">درآمد کل</p>
            <p className="text-lg font-bold text-[#824c71]">{totalIncome.toLocaleString('fa-IR')}</p>
            <p className="text-[10px] text-zinc-400">تومان</p>
          </div>
          <div className="bg-zinc-50 border border-zinc-100 rounded-2xl p-4">
            <p className="text-xs text-zinc-500 mb-1">پورسانت پرسنل</p>
            <p className="text-lg font-bold text-zinc-700">{Math.round(totalCommission).toLocaleString('fa-IR')}</p>
            <p className="text-[10px] text-zinc-400">تومان</p>
          </div>
        </div>

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
                  <div className="flex items-center gap-1.5 text-sm font-bold text-zinc-900">
                    <User className="w-3.5 h-3.5 text-[#824c71]" />
                    {visit.customerName || visit.customerPhone}
                  </div>
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
                        {s.name} {s.staffName ? `· ${s.staffName}` : ''} {s.staffPercent ? `(${s.staffPercent}٪)` : ''}
                      </span>
                      <span className="font-medium text-zinc-800">{s.price.toLocaleString('fa-IR')} ت</span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-100">
                  <span className="text-xs text-zinc-500">مبلغ کل</span>
                  <span className="text-sm font-bold text-[#824c71]">{visit.totalAmount.toLocaleString('fa-IR')} تومان</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <CreateVisitModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={() => fetchVisits(userPhone)}
        userPhone={userPhone}
      />
    </div>
  );
}