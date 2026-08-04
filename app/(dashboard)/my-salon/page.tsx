// app/(dashboard)/my-salon/page.tsx
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Plus, Loader2, Store, Settings, ChevronRight, ChevronLeft, CalendarDays,
  Wallet, TrendingUp, Users, BarChart3, Clock, Ban, ListChecks,
} from 'lucide-react';
import DatePicker, { DateObject } from 'react-multi-date-picker';
import persian from 'react-date-object/calendars/persian';
import persian_fa from 'react-date-object/locales/persian_fa';
import NewBookingModal, { BookingToEdit } from '@/components/booking/NewBookingModal';
import StaffShareModal from '@/components/booking/StaffShareModal';
import ScheduleModal from '@/components/booking/ScheduleModal';
import BlockTimeModal from '@/components/booking/BlockTimeModal';
import DayTimeline, { TimelineBooking, TimelineBlock } from '@/components/booking/DayTimeline';
import { toDateOnlyAnchor } from '@/lib/dateUtils';
import { getTotalDuration, jsDateToPersianDayIndex } from '@/lib/booking-availability';

type ServiceItem = {
  name: string;
  price?: number;
  staffName?: string;
  staffPercentage?: number;
  duration?: number;
};

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
  source?: 'ONLINE' | 'MANUAL';
};

type ScheduleDay = { dayOfWeek: number; label: string; isOpen: boolean; openTime: string; closeTime: string };

const DEFAULT_OPEN = '10:00';
const DEFAULT_CLOSE = '20:00';

export default function MySalonPage() {
  const router = useRouter();

  const [hasSalon, setHasSalon] = useState<boolean | null>(null);
  const [salonName, setSalonName] = useState('');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [scheduleDays, setScheduleDays] = useState<ScheduleDay[]>([]);
  const [timeBlocks, setTimeBlocks] = useState<TimelineBlock[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<BookingToEdit | null>(null);
  const [modalPrefillTime, setModalPrefillTime] = useState<string | undefined>(undefined);

  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [blockPrefillTime, setBlockPrefillTime] = useState<string | undefined>(undefined);

  const [selectedDate, setSelectedDate] = useState<Date>(() => toDateOnlyAnchor(new Date()));

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

  const fetchSchedule = useCallback(async () => {
    try {
      const res = await fetch('/api/salon/schedule');
      if (res.ok) {
        const data = await res.json();
        setScheduleDays(data.days || []);
      }
    } catch (error) {
      console.error('خطا در دریافت ساعات کاری:', error);
    }
  }, []);

  const fetchTimeBlocks = useCallback(async (dateStr: string) => {
    try {
      const res = await fetch(`/api/salon/time-blocks?date=${dateStr}`);
      if (res.ok) {
        const data = await res.json();
        setTimeBlocks(data.blocks || []);
      }
    } catch (error) {
      console.error('خطا در دریافت مسدودی‌ها:', error);
    }
  }, []);

  useEffect(() => {
    fetchData();
    fetchSchedule();
  }, [fetchData, fetchSchedule]);

  const selectedDateStr = selectedDate.toISOString().slice(0, 10);

  useEffect(() => {
    fetchTimeBlocks(selectedDateStr);
  }, [selectedDateStr, fetchTimeBlocks]);

  const openNewBookingModal = () => {
    setEditingBooking(null);
    setModalPrefillTime(undefined);
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
    setModalPrefillTime(undefined);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingBooking(null);
    setModalPrefillTime(undefined);
  };

  const handleModalSaved = () => {
    fetchData();
    fetchTimeBlocks(selectedDateStr);
  };

  const handleDeleteBlock = async (blockId: string) => {
    if (!window.confirm('آیا می‌خواهید این مسدودی را لغو کنید و دوباره خالی نمایش داده شود؟')) return;
    try {
      const res = await fetch(`/api/salon/time-blocks?id=${blockId}`, { method: 'DELETE' });
      if (res.ok) {
        setTimeBlocks((prev) => prev.filter((b) => b.id !== blockId));
      } else {
        const data = await res.json();
        alert(data.error || 'خطا در حذف مسدودی');
      }
    } catch {
      alert('خطای ارتباط با سرور');
    }
  };

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

  const todayStr = toDateOnlyAnchor(new Date()).toISOString().slice(0, 10);
  const isToday = selectedDateStr === todayStr;

  const dayLabel = selectedDate.toLocaleDateString('fa-IR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // ساعات کاری همین روز، بر اساس ساعات کاری هفتگی که سالن‌دار تنظیم کرده
  const todaySchedule = useMemo(() => {
    const dayIndex = jsDateToPersianDayIndex(selectedDate);
    const row = scheduleDays.find((d) => d.dayOfWeek === dayIndex);
    if (row) return row;
    return { dayOfWeek: dayIndex, label: '', isOpen: true, openTime: DEFAULT_OPEN, closeTime: DEFAULT_CLOSE };
  }, [scheduleDays, selectedDate]);

  const dayBookings = useMemo(
    () =>
      bookings
        .filter((b) => b.date.slice(0, 10) === selectedDateStr)
        .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [bookings, selectedDateStr]
  );

  // تبدیل نوبت‌های واقعی به شکل مورد نیاز تایم‌لاین
  const timelineBookings: TimelineBooking[] = useMemo(
    () =>
      dayBookings.map((b) => ({
        id: b.id,
        startTime: b.startTime,
        durationMinutes: getTotalDuration(b.services),
        title: b.customerName || 'بدون نام',
        subtitle: b.services.map((s) => s.name).join('، '),
        status: b.status,
        source: b.source || 'MANUAL',
      })),
    [dayBookings]
  );

  const handleTimelineBookingClick = (tb: TimelineBooking) => {
    const fullBooking = dayBookings.find((b) => b.id === tb.id);
    if (fullBooking) openEditBookingModal(fullBooking);
  };

  const handleEmptySlotClick = (time: string) => {
    setEditingBooking(null);
    setModalPrefillTime(time);
    setIsModalOpen(true);
  };

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

  return (
    <div className="max-w-3xl mx-auto pt-8 pb-32 px-4 md:pt-10 md:px-0">
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-zinc-900">{salonName}</h1>
          <p className="text-zinc-500 text-xs md:text-sm mt-0.5">مدیریت نوبت‌های سالن</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">

          <Link
  href="/my-salon/services"
  aria-label="خدمات نوبت‌دهی آنلاین"
  className="w-10 h-10 flex items-center justify-center rounded-xl bg-zinc-100 text-zinc-600 hover:bg-zinc-200 transition-colors"
>
  <ListChecks className="w-4.5 h-4.5" />
</Link>

          <button
            onClick={() => setIsScheduleModalOpen(true)}
            aria-label="ساعات کاری"
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-zinc-100 text-zinc-600 hover:bg-zinc-200 transition-colors"
          >
            <Clock className="w-4.5 h-4.5" />
          </button>
          <button
            onClick={() => {
              setBlockPrefillTime(undefined);
              setIsBlockModalOpen(true);
            }}
            aria-label="مسدود کردن بازه"
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-zinc-100 text-zinc-600 hover:bg-zinc-200 transition-colors"
          >
            <Ban className="w-4.5 h-4.5" />
          </button>
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

      <button
        onClick={openNewBookingModal}
        className="w-full flex items-center justify-center gap-2 bg-[#824c71] hover:bg-[#6e3f60] text-white py-3.5 rounded-xl font-medium text-sm transition-colors shadow-lg shadow-[#e3c9dc]/40 mb-6"
      >
        <Plus className="w-4.5 h-4.5" />
        ثبت نوبت جدید
      </button>

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

      {/* تقویم روزانه — قلب مدیریت نوبت‌ها: دیدن، ثبت دستی با کلیک، و مسدودسازی */}
      <div className="mb-8 mt-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-zinc-800">
            تقویم امروز {dayBookings.length > 0 && `(${dayBookings.length.toLocaleString('fa-IR')} نوبت)`}
          </h2>
          <p className="text-[11px] text-zinc-400">برای ثبت نوبت روی هر بازه‌ی خالی کلیک کنید</p>
        </div>

        <DayTimeline
          openTime={todaySchedule.openTime}
          closeTime={todaySchedule.closeTime}
          isDayOpen={todaySchedule.isOpen}
          bookings={timelineBookings}
          blocks={timeBlocks}
          onEmptySlotClick={handleEmptySlotClick}
          onBookingClick={handleTimelineBookingClick}
          onBlockClick={(block) => handleDeleteBlock(block.id)}
        />
      </div>

      <NewBookingModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSaved={handleModalSaved}
        bookingToEdit={editingBooking}
        prefillDate={selectedDateStr}
        prefillStartTime={modalPrefillTime}
      />

      <StaffShareModal
        isOpen={isStaffModalOpen}
        onClose={() => setIsStaffModalOpen(false)}
        staffBreakdown={dailySummary.staffBreakdown}
        total={dailySummary.staffShareTotal}
        dayLabel={dayLabel}
      />

      <ScheduleModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        onSaved={fetchSchedule}
      />

      <BlockTimeModal
        isOpen={isBlockModalOpen}
        onClose={() => setIsBlockModalOpen(false)}
        onSaved={() => fetchTimeBlocks(selectedDateStr)}
        date={selectedDateStr}
        dayLabel={dayLabel}
        prefillStartTime={blockPrefillTime}
      />
    </div>
  );
}