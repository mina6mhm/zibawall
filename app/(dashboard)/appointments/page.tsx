//app/(dashboard)/appointments/page.tsx
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Loader2, Calendar, Clock, User, Store, ChevronRight, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type ServiceItem = { name: string; price: number };
type CustomerAppointment = {
  id: string;
  status: 'CONFIRMED';
  visitDate: string | null;
  checkInTime: string | null;
  checkOutTime: string | null;
  services: ServiceItem[];
  totalAmount: number;
  salon: { name: string; imageUrl: string };
};
type SalonAppointment = {
  id: string;
  status: 'CONFIRMED';
  visitDate: string | null;
  checkInTime: string | null;
  checkOutTime: string | null;
  services: ServiceItem[];
  totalAmount: number;
  customer: { name: string | null; phone: string | null };
};

type TabKey = 'mine' | 'salon';
const MAX_DAYS_BACK = 6;

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

export default function AppointmentsPage() {
  const router = useRouter();
  const [hasSalon, setHasSalon] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('mine');

  const [myAppointments, setMyAppointments] = useState<CustomerAppointment[]>([]);
  const [salonAppointments, setSalonAppointments] = useState<SalonAppointment[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [dayOffset, setDayOffset] = useState(0);

  const fetchMine = useCallback(async (phone: string) => {
    const res = await fetch(`/api/appointment?scope=customer&userPhone=${phone}`);
    if (res.ok) {
      const data = await res.json();
      setMyAppointments((data.appointments || []).filter((a: any) => a.status === 'CONFIRMED'));
    }
  }, []);

  const fetchSalon = useCallback(async (phone: string) => {
    const res = await fetch(`/api/appointment?scope=salon&userPhone=${phone}`);
    if (res.ok) {
      const data = await res.json();
      setSalonAppointments((data.appointments || []).filter((a: any) => a.status === 'CONFIRMED'));
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

      const profileRes = await fetch('/api/user/profile');
      let ownsSalon = false;
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        ownsSalon = !!profileData.salon;
        setHasSalon(ownsSalon);
      }

      await fetchMine(user.phone);
      if (ownsSalon) await fetchSalon(user.phone);
      setIsFetching(false);
    };
    init();
  }, [router, fetchMine, fetchSalon]);

  const selectedDate = getDateForOffset(dayOffset);
  const dayLabel = getDayLabel(dayOffset, selectedDate);
  const confirmedForDay = useMemo(
    () =>
      salonAppointments.filter(
        (a) => a.visitDate && startOfDay(new Date(a.visitDate)).getTime() === selectedDate.getTime()
      ),
    [salonAppointments, selectedDate]
  );

  return (
    <div className="flex flex-col min-h-screen bg-white pb-32">
      <div className="max-w-lg mx-auto w-full px-4 pt-6">
        <h1 className="text-base font-bold text-zinc-900 mb-5">نوبت‌های من</h1>

        {hasSalon && (
          <div className="flex items-center gap-1.5 bg-zinc-50 rounded-2xl p-1.5 mb-5">
            <button
              onClick={() => setActiveTab('mine')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-colors ${
                activeTab === 'mine' ? 'bg-white text-[#824c71] shadow-sm' : 'text-zinc-500'
              }`}
            >
              <User className="w-3.5 h-3.5" /> نوبت‌های من
            </button>
            <button
              onClick={() => setActiveTab('salon')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-colors ${
                activeTab === 'salon' ? 'bg-white text-[#824c71] shadow-sm' : 'text-zinc-500'
              }`}
            >
              <Store className="w-3.5 h-3.5" /> نوبت‌های سالن
            </button>
          </div>
        )}

        {isFetching ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-[#824c71] animate-spin mb-3" />
            <p className="text-sm text-zinc-400">در حال دریافت اطلاعات...</p>
          </div>
        ) : activeTab === 'mine' ? (
          myAppointments.length === 0 ? (
            <p className="text-sm text-zinc-400 text-center py-16">هنوز نوبت قطعی‌شده‌ای ندارید.</p>
          ) : (
            <div className="space-y-3">
              {myAppointments.map((a) => (
                <Link
                  key={a.id}
                  href={`/appointments/${a.id}`}
                  className="block border border-zinc-100 rounded-2xl p-4 hover:border-zinc-200 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-zinc-900">{a.salon.name}</span>
                    <span className="text-[10px] px-2 py-1 rounded-full font-medium bg-green-50 text-green-600">تایید شده</span>
                  </div>
                  {a.visitDate && (
                    <div className="flex items-center gap-3 text-xs text-zinc-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> {new Date(a.visitDate).toLocaleDateString('fa-IR')}
                      </span>
                      {a.checkInTime && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {a.checkInTime}
                        </span>
                      )}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )
        ) : (
          <div>
            <div className="flex items-center justify-between bg-zinc-50 rounded-2xl p-2 mb-4">
              <button
                onClick={() => setDayOffset((v) => Math.max(v - 1, 0))}
                disabled={dayOffset <= 0}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-white text-zinc-600 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-zinc-100 transition-colors shrink-0"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              <div className="text-center">
                <p className="text-sm font-bold text-zinc-800">{dayLabel}</p>
                {confirmedForDay.length > 0 && (
                  <p className="text-[11px] text-zinc-400 mt-0.5">{confirmedForDay.length.toLocaleString('fa-IR')} نوبت</p>
                )}
              </div>
              <button
                onClick={() => setDayOffset((v) => Math.min(v + 1, MAX_DAYS_BACK))}
                disabled={dayOffset >= MAX_DAYS_BACK}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-white text-zinc-600 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-zinc-100 transition-colors shrink-0"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            </div>

            {confirmedForDay.length === 0 ? (
              <p className="text-sm text-zinc-400 text-center py-10">نوبتی برای این روز ثبت نشده است.</p>
            ) : (
              <div className="space-y-3">
                {confirmedForDay.map((a) => (
                  <Link
                    key={a.id}
                    href={`/appointments/${a.id}`}
                    className="block border border-zinc-100 rounded-2xl p-4 hover:border-zinc-200 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5 text-sm font-bold text-zinc-900">
                        <User className="w-3.5 h-3.5 text-[#824c71]" />
                        {a.customer.name || a.customer.phone}
                      </div>
                      {a.checkInTime && (
                        <span className="flex items-center gap-1 text-xs text-zinc-400">
                          <Clock className="w-3 h-3" /> {a.checkInTime} - {a.checkOutTime || '—'}
                        </span>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      {a.services.map((s, i) => (
                        <div key={i} className="flex items-center justify-between text-xs bg-zinc-50 rounded-lg px-3 py-2">
                          <span className="text-zinc-600">{s.name}</span>
                          {s.price > 0 && <span className="font-medium text-zinc-800">{s.price.toLocaleString('fa-IR')} ت</span>}
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-100">
                      <span className="text-xs text-zinc-500">مبلغ کل</span>
                      <span className="text-sm font-bold text-[#824c71]">{a.totalAmount.toLocaleString('fa-IR')} تومان</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}