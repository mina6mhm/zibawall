// app/(dashboard)/my-salon/reports/page.tsx
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Loader2, ArrowRight, ChevronRight, ChevronLeft, CalendarDays,
  TrendingUp, Wallet, Users, Trophy, Store,
} from 'lucide-react';
import DatePicker, { DateObject } from 'react-multi-date-picker';
import persian from 'react-date-object/calendars/persian';
import persian_fa from 'react-date-object/locales/persian_fa';
import StaffShareModal from '@/components/booking/StaffShareModal';
import { toDateOnlyAnchor } from '@/lib/dateUtils';

type ServiceItem = { name: string; price?: number; staffName?: string; staffPercentage?: number };

type Booking = {
  id: string;
  date: string;
  services: ServiceItem[];
  status: 'PENDING_PAYMENT' | 'CONFIRMED' | 'CANCELLED';
};

export default function SalonReportsPage() {
  const router = useRouter();

  const [hasSalon, setHasSalon] = useState<boolean | null>(null);
  const [salonName, setSalonName] = useState('');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);

  // ماه انتخاب‌شده به تقویم شمسی — پیش‌فرض ماه جاری
  const [selectedMonth, setSelectedMonth] = useState<DateObject>(
    () => new DateObject({ calendar: persian, locale: persian_fa })
  );

  const fetchData = useCallback(async () => {
    try {
      const profileRes = await fetch('/api/user/profile');
      if (!profileRes.ok) {
        if (profileRes.status === 401) router.push('/login');
        return;
      }
      const profileData = await profileRes.json();

      if (!profileData.salon) {
        setHasSalon(false);
        return;
      }

      setHasSalon(true);
      setSalonName(profileData.salon.name);

      const bookingsRes = await fetch('/api/booking');
      if (bookingsRes.ok) {
        const bookingsData = await bookingsRes.json();
        setBookings(bookingsData.bookings || []);
      }
    } catch (error) {
      console.error('خطا در دریافت اطلاعات:', error);
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const goToPrevMonth = () => setSelectedMonth((prev) => new DateObject(prev).subtract(1, 'month'));
  const goToNextMonth = () => setSelectedMonth((prev) => new DateObject(prev).add(1, 'month'));
  const goToCurrentMonth = () => setSelectedMonth(new DateObject({ calendar: persian, locale: persian_fa }));

  const handleJumpToMonth = (d: DateObject) => setSelectedMonth(d);

  const monthLabel = `${selectedMonth.month.name} ${selectedMonth.year.toLocaleString('fa-IR')}`;

  const isCurrentMonth = useMemo(() => {
    const now = new DateObject({ calendar: persian, locale: persian_fa });
    return selectedMonth.month.number === now.month.number && selectedMonth.year === now.year;
  }, [selectedMonth]);

  const formatMoney = (amount: number) => amount.toLocaleString('fa-IR');

  // لیست تک‌تک روزهای ماه شمسی انتخاب‌شده، هرکدام با معادل میلادی برای مچ کردن با booking.date
  const monthDays = useMemo(() => {
    const firstDay = new DateObject(selectedMonth).set('day', 1);
    const length = selectedMonth.month.length;
    const days: { dateStr: string; dayNumber: number }[] = [];

    for (let i = 0; i < length; i++) {
      const d = new DateObject(firstDay).add(i, 'day');
      const gDate = toDateOnlyAnchor(d.toDate());
      days.push({ dateStr: gDate.toISOString().slice(0, 10), dayNumber: i + 1 });
    }
    return days;
  }, [selectedMonth]);

  const monthStats = useMemo(() => {
    const dateSet = new Set(monthDays.map((d) => d.dateStr));
    const dailyRevenueMap: Record<string, number> = {};
    monthDays.forEach((d) => (dailyRevenueMap[d.dateStr] = 0));

    let totalRevenue = 0;
    let totalStaffShare = 0;
    const staffMap: Record<string, { revenue: number; share: number }> = {};

    bookings
      .filter((b) => b.status !== 'CANCELLED' && dateSet.has(b.date.slice(0, 10)))
      .forEach((b) => {
        const dStr = b.date.slice(0, 10);
        b.services.forEach((s) => {
          const price = s.price || 0;
          totalRevenue += price;
          dailyRevenueMap[dStr] = (dailyRevenueMap[dStr] || 0) + price;

          if (s.staffName) {
            if (!staffMap[s.staffName]) staffMap[s.staffName] = { revenue: 0, share: 0 };
            staffMap[s.staffName].revenue += price;

            if (s.staffPercentage) {
              const share = Math.round((price * s.staffPercentage) / 100);
              staffMap[s.staffName].share += share;
              totalStaffShare += share;
            }
          }
        });
      });

    const staffBreakdown = Object.entries(staffMap)
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.revenue - a.revenue);

    const dailyBreakdown = monthDays.map((d) => ({ ...d, revenue: dailyRevenueMap[d.dateStr] || 0 }));

    const bestDay = dailyBreakdown.reduce(
      (max, cur) => (cur.revenue > max.revenue ? cur : max),
      dailyBreakdown[0] || { dateStr: '', dayNumber: 0, revenue: 0 }
    );

    return {
      totalRevenue,
      totalStaffShare,
      netProfit: totalRevenue - totalStaffShare,
      staffBreakdown,
      dailyBreakdown,
      bestDay,
    };
  }, [bookings, monthDays]);

  const maxDailyRevenue = Math.max(1, ...monthStats.dailyBreakdown.map((d) => d.revenue));

  const staffModalRows = monthStats.staffBreakdown.map((s) => ({ name: s.name, amount: s.share }));

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 text-[#824c71] animate-spin mb-4" />
        <p className="text-zinc-500 font-medium text-sm">در حال دریافت اطلاعات...</p>
      </div>
    );
  }

  if (hasSalon === false) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center gap-4">
        <Store className="w-12 h-12 text-zinc-300" />
        <p className="text-zinc-600 font-medium">شما هنوز کسب‌وکاری ثبت نکرده‌اید.</p>
        <Link
          href="/profile/business"
          className="bg-[#824c71] text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-[#6e3f60] transition"
        >
          ثبت نام کسب‌وکار
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto pt-8 pb-32 px-4 md:pt-10 md:px-0">
      <div className="flex items-center gap-3 mb-7">
        <Link
          href="/my-salon"
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-zinc-100 text-zinc-600 hover:bg-zinc-200 transition-colors shrink-0"
        >
          <ArrowRight className="w-4.5 h-4.5" />
        </Link>
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-zinc-900">گزارش درآمد</h1>
          <p className="text-zinc-500 text-xs md:text-sm mt-0.5">{salonName}</p>
        </div>
      </div>

      {/* ناوبری ماه: قبل / انتخاب ماه / بعد */}
      <div className="flex items-center gap-2 mb-3 mt-1">
        <button onClick={goToNextMonth} aria-label="ماه بعد" className="w-11 h-11 flex items-center justify-center rounded-xl bg-zinc-100 text-zinc-600 hover:bg-zinc-200 transition shrink-0">
          <ChevronRight className="w-5 h-5" />
        </button>

        <DatePicker
          value={selectedMonth}
          onChange={(d) => {
            if (d) handleJumpToMonth(d as DateObject);
          }}
          calendar={persian}
          locale={persian_fa}
          onlyMonthPicker
          calendarPosition="bottom-center"
          containerClassName="flex-1"
          render={(_value, openCalendar) => (
            <button
              type="button"
              onClick={openCalendar}
              className="w-full h-11 flex items-center justify-center gap-2 rounded-xl bg-white border border-zinc-200 px-2"
            >
              <CalendarDays className="w-4 h-4 text-[#824c71] shrink-0" />
              <span className="text-xs sm:text-sm font-bold text-zinc-800 truncate">{monthLabel}</span>
            </button>
          )}
        />

        <button onClick={goToPrevMonth} aria-label="ماه قبل" className="w-11 h-11 flex items-center justify-center rounded-xl bg-zinc-100 text-zinc-600 hover:bg-zinc-200 transition shrink-0">
          <ChevronLeft className="w-5 h-5" />
        </button>
      </div>

      {!isCurrentMonth && (
        <div className="mb-4">
          <button onClick={goToCurrentMonth} className="text-xs font-medium text-[#824c71] underline underline-offset-2">
            بازگشت به ماه جاری
          </button>
        </div>
      )}

      {/* کارت‌های خلاصه ماه */}
      <div className="grid grid-cols-3 gap-2 mb-6">
        <div className="bg-white border border-zinc-100 rounded-2xl p-3 shadow-sm shadow-zinc-200/50">
          <div className="flex items-center gap-1.5 mb-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-[11px] font-medium text-zinc-500">درآمد کل ماه</span>
          </div>
          <p className="text-sm font-bold text-zinc-800 leading-tight">
            {formatMoney(monthStats.totalRevenue)}
            <span className="text-[10px] font-medium text-zinc-400 mr-1">تومان</span>
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsStaffModalOpen(true)}
          className="bg-white border border-zinc-100 rounded-2xl p-3 shadow-sm shadow-zinc-200/50 text-right"
        >
          <div className="flex items-center gap-1.5 mb-1.5">
            <Users className="w-3.5 h-3.5 text-[#824c71]" />
            <span className="text-[11px] font-medium text-zinc-500">سهم پرسنل</span>
          </div>
          <p className="text-sm font-bold text-[#824c71] leading-tight underline underline-offset-2">
            {formatMoney(monthStats.totalStaffShare)}
            <span className="text-[10px] font-medium text-zinc-400 mr-1">تومان</span>
          </p>
        </button>

        <div className="bg-white border border-zinc-100 rounded-2xl p-3 shadow-sm shadow-zinc-200/50">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Wallet className="w-3.5 h-3.5 text-amber-600" />
            <span className="text-[11px] font-medium text-zinc-500">سود خالص</span>
          </div>
          <p className="text-sm font-bold text-zinc-800 leading-tight">
            {formatMoney(monthStats.netProfit)}
            <span className="text-[10px] font-medium text-zinc-400 mr-1">تومان</span>
          </p>
        </div>
      </div>

      {/* نمودار روند درآمد روز به روز */}
      <div className="bg-white border border-zinc-100 rounded-2xl p-4 mb-6 shadow-sm shadow-zinc-200/50">
        <h2 className="text-sm font-bold text-zinc-800 mb-1">روند درآمد روزانه</h2>
        {monthStats.bestDay.revenue > 0 && (
          <p className="text-[11px] text-zinc-400 mb-4">
            پردرآمدترین روز: {monthStats.bestDay.dayNumber.toLocaleString('fa-IR')} {selectedMonth.month.name} با{' '}
            <span className="font-bold text-[#824c71]">{formatMoney(monthStats.bestDay.revenue)} تومان</span>
          </p>
        )}

        {monthStats.totalRevenue === 0 ? (
          <div className="text-center py-10 bg-zinc-50 rounded-xl">
            <p className="text-zinc-400 text-sm">درآمدی برای این ماه ثبت نشده است.</p>
          </div>
        ) : (
          <div className="flex items-end gap-[3px] h-36 overflow-x-auto pb-1">
            {monthStats.dailyBreakdown.map((d) => {
              const isBest = d.dayNumber === monthStats.bestDay.dayNumber && d.revenue > 0;
              const heightPct = Math.max((d.revenue / maxDailyRevenue) * 100, d.revenue > 0 ? 4 : 0);
              return (
                <div key={d.dateStr} className="flex flex-col items-center justify-end h-full shrink-0" style={{ width: 9 }}>
                  <div
                    title={`روز ${d.dayNumber.toLocaleString('fa-IR')} — ${formatMoney(d.revenue)} تومان`}
                    className={`w-full rounded-t-[3px] transition-all ${isBest ? 'bg-[#824c71]' : 'bg-[#824c71]/25'}`}
                    style={{ height: `${heightPct}%` }}
                  />
                </div>
              );
            })}
          </div>
        )}
        <div className="flex items-center justify-between mt-2 text-[10px] text-zinc-400">
          <span>روز ۱</span>
          <span>روز {monthStats.dailyBreakdown.length.toLocaleString('fa-IR')}</span>
        </div>
      </div>

      {/* رتبه‌بندی پرسنل */}
      <div className="mb-8">
        <h2 className="text-sm font-bold text-zinc-800 mb-3 flex items-center gap-1.5">
          <Trophy className="w-4 h-4 text-amber-500" />
          عملکرد پرسنل در این ماه
        </h2>

        {monthStats.staffBreakdown.length === 0 ? (
          <div className="text-center py-10 bg-zinc-50 rounded-2xl">
            <Users className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
            <p className="text-zinc-400 text-sm">برای این ماه سهمی ثبت نشده است.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {monthStats.staffBreakdown.map((s, idx) => (
              <div
                key={s.name}
                className="flex items-center justify-between bg-white border border-zinc-100 rounded-xl p-3 shadow-sm shadow-zinc-200/40"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-[#824c71]/10 text-[#824c71] flex items-center justify-center text-xs font-bold shrink-0">
                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : (idx + 1).toLocaleString('fa-IR')}
                  </div>
                  <span className="text-sm font-medium text-zinc-700">{s.name}</span>
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-zinc-800">{formatMoney(s.revenue)} تومان</p>
                  <p className="text-[10px] text-zinc-400">سهم: {formatMoney(s.share)} تومان</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <StaffShareModal
        isOpen={isStaffModalOpen}
        onClose={() => setIsStaffModalOpen(false)}
        staffBreakdown={staffModalRows}
        total={monthStats.totalStaffShare}
        dayLabel={monthLabel}
      />
    </div>
  );
}