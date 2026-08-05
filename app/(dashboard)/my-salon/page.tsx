// app/(dashboard)/my-salon/page.tsx
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Plus, Loader2, Calendar, Clock, Phone, User as UserIcon,
  Scissors, Trash2, Store, Settings, Pencil, ChevronRight, ChevronLeft, CalendarDays,
  Wallet, TrendingUp, Users, BarChart3,
} from 'lucide-react';
import DatePicker, { DateObject } from 'react-multi-date-picker';
import persian from 'react-date-object/calendars/persian';
import persian_fa from 'react-date-object/locales/persian_fa';
import NewBookingModal, { BookingToEdit } from '@/components/booking/NewBookingModal';
import StaffShareModal from '@/components/booking/StaffShareModal';
import { toDateOnlyAnchor } from '@/lib/dateUtils';
import { CalendarClock } from 'lucide-react';

type ServiceItem = { name: string; price?: number; staffName?: string; staffPercentage?: number };

type Booking = {
  id: string;
  customerName: string | null;
  customerPhone: string;
  date: string;
  startTime: string;
  services: ServiceItem[];
  staffName: string | null;
  depositAmount: number;
  appFee: number;
  totalAmount: number;
  status: 'PENDING_PAYMENT' | 'CONFIRMED' | 'CANCELLED';
  paymentStatus: 'PENDING' | 'SUCCESS' | 'FAILED';
};

const STATUS_LABELS: Record<Booking['status'], { label: string; className: string }> = {
  PENDING_PAYMENT: { label: 'در انتظار پرداخت مشتری', className: 'bg-amber-50 text-amber-700' },
  CONFIRMED: { label: 'قطعی شده', className: 'bg-emerald-50 text-emerald-700' },
  CANCELLED: { label: 'لغو شده', className: 'bg-zinc-100 text-zinc-500' },
};

export default function MySalonPage() {
  const router = useRouter();

  const [hasSalon, setHasSalon] = useState<boolean | null>(null);
  const [salonName, setSalonName] = useState('');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<BookingToEdit | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);

  const [selectedDate, setSelectedDate] = useState<Date>(() => toDateOnlyAnchor(new Date()));

  const [bookingEnabled, setBookingEnabled] = useState(false);

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

      setBookingEnabled(!!profileData.salon.bookingEnabled);

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

  const openNewBookingModal = () => {
    setEditingBooking(null);
    setIsModalOpen(true);
  };

  const openEditBookingModal = (booking: Booking) => {
    setEditingBooking({
      id: booking.id,
      customerName: booking.customerName,
      customerPhone: booking.customerPhone,
      date: booking.date,
      startTime: booking.startTime,
      services: booking.services,
      depositAmount: booking.depositAmount,
    });
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingBooking(null);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('آیا از حذف این نوبت مطمئن هستید؟')) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/booking?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setBookings((prev) => prev.filter((b) => b.id !== id));
      } else {
        const data = await res.json();
        alert(data.error || 'خطا در حذف نوبت');
      }
    } catch {
      alert('خطای ارتباط با سرور');
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (isoDate: string) =>
    new Date(isoDate).toLocaleDateString('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' });

  const formatMoney = (amount: number) => amount.toLocaleString('fa-IR');

  const goToPrevDay = () => {
    setSelectedDate((prev) => {
      const d = new Date(prev);
      d.setUTCDate(d.getUTCDate() - 1);
      return d;
    });
  };

  const goToNextDay = () => {
    setSelectedDate((prev) => {
      const d = new Date(prev);
      d.setUTCDate(d.getUTCDate() + 1);
      return d;
    });
  };

  const goToToday = () => setSelectedDate(toDateOnlyAnchor(new Date()));

  const handleJumpToDate = (d: DateObject) => {
    setSelectedDate(toDateOnlyAnchor(d.toDate()));
  };

  const selectedDateStr = selectedDate.toISOString().slice(0, 10);
  const todayStr = toDateOnlyAnchor(new Date()).toISOString().slice(0, 10);
  const isToday = selectedDateStr === todayStr;

  const dayLabel = selectedDate.toLocaleDateString('fa-IR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const dayBookings = useMemo(
    () =>
      bookings
        .filter((b) => b.date.slice(0, 10) === selectedDateStr)
        .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [bookings, selectedDateStr]
  );

  type StaffShareRow = { name: string; amount: number };

  const dailySummary = useMemo(() => {
    let revenue = 0;
    let staffShareTotal = 0;
    const staffMap: Record<string, number> = {};

    dayBookings
      .filter((b) => b.status !== 'CANCELLED')
      .forEach((booking) => {
        booking.services.forEach((s) => {
          const price = s.price || 0;
          revenue += price;

          if (s.staffName && s.staffPercentage) {
            const share = Math.round((price * s.staffPercentage) / 100);
            staffShareTotal += share;
            staffMap[s.staffName] = (staffMap[s.staffName] || 0) + share;
          }
        });
      });

    const staffBreakdown: StaffShareRow[] = Object.entries(staffMap)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount);

    return {
      revenue,
      staffShareTotal,
      netProfit: revenue - staffShareTotal,
      staffBreakdown,
    };
  }, [dayBookings]);

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

  const renderBookingCard = (booking: Booking) => {
    const statusInfo = STATUS_LABELS[booking.status];
    return (
      <div key={booking.id} className="bg-white border border-zinc-100 rounded-2xl p-4 shadow-sm shadow-zinc-200/50">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 text-zinc-800">
            <UserIcon className="w-4 h-4 text-[#824c71]" />
            <span className="font-bold text-sm">{booking.customerName || 'بدون نام'}</span>
          </div>
          <span className={`text-[11px] font-medium px-2.5 py-1 rounded-lg whitespace-nowrap ${statusInfo.className}`}>
            {statusInfo.label}
          </span>
        </div>

        <div className="space-y-1.5 text-[13px] text-zinc-600 mb-3">
          <div className="flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5 text-zinc-400" />
            <span dir="ltr">{booking.customerPhone}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-zinc-400" />
            <span>{formatDate(booking.date)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-zinc-400" />
            <span dir="ltr">{booking.startTime}</span>
          </div>
        </div>

        <div className="bg-zinc-50 rounded-xl p-3 mb-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Scissors className="w-3.5 h-3.5 text-[#824c71]" />
            <span className="text-xs font-bold text-zinc-700">خدمات</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {booking.services.map((s, idx) => (
              <span key={idx} className="bg-white px-2 py-1 rounded-md text-[11px] text-zinc-600 border border-zinc-100">
                {s.name}
                {s.price ? ` · ${formatMoney(s.price)} تومان` : ''}
                {s.staffName ? ` · ${s.staffName}` : ''}
                {s.staffPercentage ? ` (${s.staffPercentage.toLocaleString('fa-IR')}٪)` : ''}
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between text-[12px] text-zinc-500 border-t border-zinc-100 pt-2.5">
          <span>بیعانه: {formatMoney(booking.depositAmount)} تومان</span>
          <span>مبلغ کل: {formatMoney(booking.totalAmount)} تومان</span>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={() => openEditBookingModal(booking)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-zinc-100 text-zinc-700 text-xs font-medium hover:bg-zinc-200 transition"
          >
            <Pencil className="w-3.5 h-3.5" />
            ویرایش
          </button>

          {booking.status !== 'CONFIRMED' && (
            <button
              onClick={() => handleDelete(booking.id)}
              disabled={deletingId === booking.id}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-red-50 text-red-600 text-xs font-medium hover:bg-red-100 transition disabled:opacity-50"
            >
              {deletingId === booking.id ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Trash2 className="w-3.5 h-3.5" />
              )}
              حذف نوبت
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-3xl mx-auto pt-8 pb-32 px-4 md:pt-10 md:px-0">
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-zinc-900">{salonName}</h1>
          <p className="text-zinc-500 text-xs md:text-sm mt-0.5">مدیریت نوبت‌های سالن</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/my-salon/reports"
            aria-label="گزارش درآمد"
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-zinc-100 text-zinc-600 hover:bg-zinc-200 transition-colors"
          >
            <BarChart3 className="w-4.5 h-4.5" />
          </Link>
          <Link
            href="/profile/business/overview"
            aria-label="تنظیمات"
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-zinc-100 text-zinc-600 hover:bg-zinc-200 transition-colors"
          >
            <Settings className="w-4.5 h-4.5" />
          </Link>
        </div>
      </div>

      <Link
  href="/my-salon/booking-settings"
  className={`w-full flex items-center justify-between gap-3 px-4 py-3.5 rounded-xl border transition-colors mb-6 ${
    bookingEnabled
      ? 'bg-[#824c71]/5 border-[#824c71]/30 text-[#824c71]'
      : 'bg-white border-zinc-200 text-zinc-700'
  }`}
>
  <div className="flex items-center gap-2.5">
  <CalendarClock className="w-4.5 h-4.5 shrink-0" />
  <p className="text-sm font-bold">نوبت‌دهی آنلاین</p>
</div>
  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg shrink-0 ${
    bookingEnabled ? 'bg-emerald-50 text-emerald-600' : 'bg-zinc-100 text-zinc-400'
  }`}>
    {bookingEnabled ? 'فعال' : 'غیرفعال'}
  </span>
</Link>

      {/* ناوبری روز: قبل / انتخاب تاریخ (برای پرش به روزهای دور) / بعد */}
      <div className="flex items-center gap-2 mb-3 mt-1">
        <button onClick={goToNextDay} aria-label="روز بعد" className="w-11 h-11 flex items-center justify-center rounded-xl bg-zinc-100 text-zinc-600 hover:bg-zinc-200 transition shrink-0">
          <ChevronRight className="w-5 h-5" />
        </button>

        <DatePicker
          value={new DateObject({ date: selectedDate, calendar: persian, locale: persian_fa })}
          onChange={(d) => {
            if (d) handleJumpToDate(d as DateObject);
          }}
          calendar={persian}
          locale={persian_fa}
          calendarPosition="bottom-center"
          className="salon-datepicker"
          containerClassName="flex-1"
          render={(_value, openCalendar) => (
            <button
              type="button"
              onClick={openCalendar}
              className="w-full h-11 flex items-center justify-center gap-2 rounded-xl bg-white border border-zinc-200 px-2"
            >
              <CalendarDays className="w-4 h-4 text-[#824c71] shrink-0" />
              <span className="text-xs sm:text-sm font-bold text-zinc-800 truncate">{dayLabel}</span>
            </button>
          )}
        />

        <button onClick={goToPrevDay} aria-label="روز قبل" className="w-11 h-11 flex items-center justify-center rounded-xl bg-zinc-100 text-zinc-600 hover:bg-zinc-200 transition shrink-0">
          <ChevronLeft className="w-5 h-5" />
        </button>
      </div>

      {!isToday && (
        <div className="mb-4">
          <button onClick={goToToday} className="text-xs font-medium text-[#824c71] underline underline-offset-2">
            بازگشت به امروز
          </button>
        </div>
      )}

      {dayBookings.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mb-6">
          <div className="bg-white border border-zinc-100 rounded-2xl p-3 shadow-sm shadow-zinc-200/50">
            <div className="flex items-center gap-1.5 mb-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-[11px] font-medium text-zinc-500">درآمد کل</span>
            </div>
            <p className="text-sm font-bold text-zinc-800 leading-tight">
              {formatMoney(dailySummary.revenue)}
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
              {formatMoney(dailySummary.staffShareTotal)}
              <span className="text-[10px] font-medium text-zinc-400 mr-1">تومان</span>
            </p>
          </button>

          <div className="bg-white border border-zinc-100 rounded-2xl p-3 shadow-sm shadow-zinc-200/50">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Wallet className="w-3.5 h-3.5 text-amber-600" />
              <span className="text-[11px] font-medium text-zinc-500">سود خالص</span>
            </div>
            <p className="text-sm font-bold text-zinc-800 leading-tight">
              {formatMoney(dailySummary.netProfit)}
              <span className="text-[10px] font-medium text-zinc-400 mr-1">تومان</span>
            </p>
          </div>
        </div>
      )}

      <div className="mb-8 mt-4">
        <h2 className="text-sm font-bold text-zinc-800 mb-3">
          نوبت‌های این روز {dayBookings.length > 0 && `(${dayBookings.length.toLocaleString('fa-IR')})`}
        </h2>
        {dayBookings.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {dayBookings.map(renderBookingCard)}
          </div>
        ) : (
          <div className="text-center py-10 bg-zinc-50 rounded-2xl">
            <p className="text-zinc-400 text-sm">نوبتی برای این روز ثبت نشده است.</p>
          </div>
        )}
      </div>

      <NewBookingModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSaved={fetchData}
        bookingToEdit={editingBooking}
      />

      <StaffShareModal
        isOpen={isStaffModalOpen}
        onClose={() => setIsStaffModalOpen(false)}
        staffBreakdown={dailySummary.staffBreakdown}
        total={dailySummary.staffShareTotal}
        dayLabel={dayLabel}
      />
    </div>
  );
}