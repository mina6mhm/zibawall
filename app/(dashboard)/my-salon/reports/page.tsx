// app/(dashboard)/my-salon/reports/page.tsx
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowRight, Loader2, ChevronRight, ChevronLeft, TrendingUp, Wallet, Users,
  CalendarDays, Trophy, Star,
} from 'lucide-react';
import { DateObject } from 'react-multi-date-picker';
import persian from 'react-date-object/calendars/persian';
import persian_fa from 'react-date-object/locales/persian_fa';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import { toDateOnlyAnchor } from '@/lib/dateUtils';

type ServiceItem = { name: string; price?: number; staffName?: string; staffPercentage?: number };

type Booking = {
  id: string;
  date: string;
  services: ServiceItem[];
  status: 'PENDING_PAYMENT' | 'CONFIRMED' | 'CANCELLED';
};

const toPersianDigits = (value: string | number) =>
  String(value).replace(/[0-9]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);

const formatMoney = (amount: number) => amount.toLocaleString('fa-IR');

export default function SalonReportsPage() {
  const router = useRouter();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [anchorDate, setAnchorDate] = useState<Date>(() => toDateOnlyAnchor(new Date()));

  const fetchBookings = useCallback(async () => {
    try {
      const res = await fetch('/api/booking');
      if (!res.ok) {
        if (res.status === 401) router.push('/login');
        return;
      }
      const data = await res.json();
      setBookings(data.bookings || []);
    } catch (error) {
      console.error('خطا در دریافت اطلاعات گزارش:', error);
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const goToPrevMonth = () => {
    setAnchorDate((prev) => {
      const base = new DateObject({ date: prev, calendar: persian, locale: persian_fa });
      return toDateOnlyAnchor(base.subtract(1, 'month').toDate());
    });
  };

  const goToNextMonth = () => {
    setAnchorDate((prev) => {
      const base = new DateObject({ date: prev, calendar: persian, locale: persian_fa });
      return toDateOnlyAnchor(base.add(1, 'month').toDate());
    });
  };

  // تمام محاسبات ماه: بازه، برچسب، درآمد روز‌به‌روز، خلاصه، و رتبه‌بندی پرسنل
  const monthReport = useMemo(() => {
    const firstOfMonth = new DateObject({ date: anchorDate, calendar: persian, locale: persian_fa }).toFirstOfMonth();
    const daysInMonth = firstOfMonth.month.length;
    const monthLabel = `${firstOfMonth.month.name} ${toPersianDigits(firstOfMonth.year)}`;

    // نگاشت هر روز از ۱ تا آخر ماه به تاریخ میلادیِ معادلش
    const dayDates = Array.from({ length: daysInMonth }, (_, i) => {
      const d = new DateObject(firstOfMonth).add(i, 'day');
      const gDate = toDateOnlyAnchor(d.toDate());
      return { dayNumber: i + 1, dateStr: gDate.toISOString().slice(0, 10) };
    });

    const startStr = dayDates[0].dateStr;
    const endStr = dayDates[dayDates.length - 1].dateStr;

    const monthBookings = bookings.filter((b) => {
      const bStr = b.date.slice(0, 10);
      return b.status !== 'CANCELLED' && bStr >= startStr && bStr <= endStr;
    });

    let totalRevenue = 0;
    let totalStaffShare = 0;
    const revenueByDate: Record<string, number> = {};
    const staffMap: Record<string, { revenue: number; share: number; count: number }> = {};

    monthBookings.forEach((booking) => {
      const bStr = booking.date.slice(0, 10);
      booking.services.forEach((s) => {
        const price = s.price || 0;
        totalRevenue += price;
        revenueByDate[bStr] = (revenueByDate[bStr] || 0) + price;

        if (s.staffName) {
          if (!staffMap[s.staffName]) staffMap[s.staffName] = { revenue: 0, share: 0, count: 0 };
          staffMap[s.staffName].revenue += price;
          staffMap[s.staffName].count += 1;
          if (s.staffPercentage) {
            const share = Math.round((price * s.staffPercentage) / 100);
            staffMap[s.staffName].share += share;
            totalStaffShare += share;
          }
        }
      });
    });

    const chartData = dayDates.map(({ dayNumber, dateStr }) => ({
      day: dayNumber,
      dayLabel: toPersianDigits(dayNumber),
      revenue: revenueByDate[dateStr] || 0,
      dateStr,
    }));

    const bestDay = chartData.reduce<typeof chartData[number] | null>((best, curr) => {
      if (curr.revenue <= 0) return best;
      if (!best || curr.revenue > best.revenue) return curr;
      return best;
    }, null);

    const staffRanking = Object.entries(staffMap)
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.revenue - a.revenue);

    return {
      monthLabel,
      chartData,
      totalRevenue,
      totalStaffShare,
      netProfit: totalRevenue - totalStaffShare,
      bestDay,
      staffRanking,
      bestStaff: staffRanking[0] || null,
    };
  }, [bookings, anchorDate]);

  const formatBestDayDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('fa-IR', { day: 'numeric', month: 'long' });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 text-[#824c71] animate-spin mb-4" />
        <p className="text-zinc-500 font-medium text-sm">در حال دریافت گزارش...</p>
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
          <p className="text-zinc-500 text-xs md:text-sm mt-0.5">خلاصه‌ی مالی سالن به تفکیک ماه</p>
        </div>
      </div>

      {/* ناوبری ماه */}
      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={goToNextMonth}
          aria-label="ماه بعد"
          className="w-11 h-11 flex items-center justify-center rounded-xl bg-zinc-100 text-zinc-600 hover:bg-zinc-200 transition shrink-0"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        <div className="flex-1 h-11 flex items-center justify-center gap-2 rounded-xl bg-white border border-zinc-200 px-2">
          <CalendarDays className="w-4 h-4 text-[#824c71] shrink-0" />
          <span className="text-sm font-bold text-zinc-800">{monthReport.monthLabel}</span>
        </div>

        <button
          onClick={goToPrevMonth}
          aria-label="ماه قبل"
          className="w-11 h-11 flex items-center justify-center rounded-xl bg-zinc-100 text-zinc-600 hover:bg-zinc-200 transition shrink-0"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      </div>

      {/* کارت‌های خلاصه‌ی ماه */}
      <div className="grid grid-cols-3 gap-2 mb-6">
        <div className="bg-white border border-zinc-100 rounded-2xl p-3 shadow-sm shadow-zinc-200/50">
          <div className="flex items-center gap-1.5 mb-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-[11px] font-medium text-zinc-500">درآمد کل ماه</span>
          </div>
          <p className="text-sm font-bold text-zinc-800 leading-tight">
            {formatMoney(monthReport.totalRevenue)}
            <span className="text-[10px] font-medium text-zinc-400 mr-1">تومان</span>
          </p>
        </div>

        <div className="bg-white border border-zinc-100 rounded-2xl p-3 shadow-sm shadow-zinc-200/50">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Users className="w-3.5 h-3.5 text-[#824c71]" />
            <span className="text-[11px] font-medium text-zinc-500">سهم پرسنل</span>
          </div>
          <p className="text-sm font-bold text-[#824c71] leading-tight">
            {formatMoney(monthReport.totalStaffShare)}
            <span className="text-[10px] font-medium text-zinc-400 mr-1">تومان</span>
          </p>
        </div>

        <div className="bg-white border border-zinc-100 rounded-2xl p-3 shadow-sm shadow-zinc-200/50">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Wallet className="w-3.5 h-3.5 text-amber-600" />
            <span className="text-[11px] font-medium text-zinc-500">سود خالص</span>
          </div>
          <p className="text-sm font-bold text-zinc-800 leading-tight">
            {formatMoney(monthReport.netProfit)}
            <span className="text-[10px] font-medium text-zinc-400 mr-1">تومان</span>
          </p>
        </div>
      </div>

      {/* پردرآمدترین روز و پرسنل ماه */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
        <div className="bg-gradient-to-br from-[#824c71]/[0.06] to-transparent border border-[#824c71]/10 rounded-2xl p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <Trophy className="w-4 h-4 text-[#824c71]" />
            <span className="text-xs font-bold text-zinc-700">پردرآمدترین روز ماه</span>
          </div>
          {monthReport.bestDay ? (
            <>
              <p className="text-base font-bold text-zinc-900">{formatBestDayDate(monthReport.bestDay.dateStr)}</p>
              <p className="text-[13px] text-[#824c71] font-bold mt-0.5">
                {formatMoney(monthReport.bestDay.revenue)} تومان
              </p>
            </>
          ) : (
            <p className="text-sm text-zinc-400">هنوز درآمدی ثبت نشده است.</p>
          )}
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-transparent border border-amber-100 rounded-2xl p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <Star className="w-4 h-4 text-amber-600" />
            <span className="text-xs font-bold text-zinc-700">پردرآمدترین پرسنل ماه</span>
          </div>
          {monthReport.bestStaff ? (
            <>
              <p className="text-base font-bold text-zinc-900">{monthReport.bestStaff.name}</p>
              <p className="text-[13px] text-amber-600 font-bold mt-0.5">
                {formatMoney(monthReport.bestStaff.revenue)} تومان درآمد
              </p>
            </>
          ) : (
            <p className="text-sm text-zinc-400">هنوز خدمتی به پرسنل نسبت داده نشده است.</p>
          )}
        </div>
      </div>

      {/* نمودار رشد درآمد روزانه‌ی ماه */}
      <div className="bg-white border border-zinc-100 rounded-2xl p-4 mb-8 shadow-sm shadow-zinc-200/50">
        <h2 className="text-sm font-bold text-zinc-800 mb-4">روند درآمد روزانه</h2>
        {monthReport.totalRevenue > 0 ? (
          <div className="h-56 -mr-2" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthReport.chartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                <XAxis
                  dataKey="dayLabel"
                  tick={{ fontSize: 10, fill: '#a1a1aa' }}
                  axisLine={{ stroke: '#f4f4f5' }}
                  tickLine={false}
                  interval={Math.ceil(monthReport.chartData.length / 10)}
                />
                <YAxis hide />
                <Tooltip
                  cursor={{ fill: 'rgba(130,76,113,0.06)' }}
formatter={(value: any) => [`${formatMoney(Number(value) || 0)} تومان`, 'درآمد']}
labelFormatter={(label: any) => `روز ${label}`}
                  contentStyle={{
                    direction: 'rtl',
                    borderRadius: 12,
                    border: '1px solid #f4f4f5',
                    fontSize: 12,
                    fontFamily: 'inherit',
                  }}
                />
                <Bar dataKey="revenue" fill="#824c71" radius={[6, 6, 0, 0]} maxBarSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-40 flex items-center justify-center text-zinc-400 text-sm">
            برای این ماه هنوز درآمدی ثبت نشده است.
          </div>
        )}
      </div>

      {/* رتبه‌بندی کامل پرسنل */}
      <div className="mb-4">
        <h2 className="text-sm font-bold text-zinc-800 mb-3">درآمد به تفکیک پرسنل</h2>
        {monthReport.staffRanking.length > 0 ? (
          <div className="space-y-2">
            {monthReport.staffRanking.map((staff, idx) => (
              <div
                key={staff.name}
                className="flex items-center justify-between bg-white border border-zinc-100 rounded-xl p-3.5"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-full bg-[#824c71]/10 text-[#824c71] flex items-center justify-center text-xs font-bold shrink-0">
                    {toPersianDigits(idx + 1)}
                  </span>
                  <div>
                    <p className="text-sm font-bold text-zinc-800">{staff.name}</p>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      {toPersianDigits(staff.count)} خدمت این ماه
                    </p>
                  </div>
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-zinc-800">{formatMoney(staff.revenue)} تومان</p>
                  <p className="text-[11px] text-[#824c71] mt-0.5">سهم: {formatMoney(staff.share)} تومان</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 bg-zinc-50 rounded-2xl">
            <p className="text-zinc-400 text-sm">پرسنلی برای این ماه ثبت نشده است.</p>
          </div>
        )}
      </div>
    </div>
  );
}