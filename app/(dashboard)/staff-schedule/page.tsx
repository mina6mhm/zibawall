// app/(dashboard)/staff-schedule/page.tsx
'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Loader2, Calendar, Clock, Phone, User as UserIcon,
  Scissors, ChevronRight, ChevronLeft, CalendarDays, Users, CalendarX,
} from 'lucide-react';
import { DateObject } from 'react-multi-date-picker';
import persian from 'react-date-object/calendars/persian';
import persian_fa from 'react-date-object/locales/persian_fa';
import PersianCalendar from '@/components/ui/PersianCalendar';
import { toDateOnlyAnchor } from '@/lib/dateUtils';

// ─── Types ───────────────────────────────────────────────────────────────────

type StaffSalonOption = {
  staffId: string;
  staffName: string;
  salonId: string;
  salonName: string;
};

type ServiceItem = { name: string; price?: number; durationMin?: number };

type StaffBooking = {
  id: string;
  date: string;
  startTime: string;
  customerName: string | null;
  customerPhone: string;
  services: ServiceItem[];
  bookingGroupId: string | null;
};

const toPersianDigits = (str: string) => str.replace(/[0-9]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);
const formatMoney = (n: number) => n.toLocaleString('fa-IR');

export default function StaffSchedulePage() {
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [salonOptions, setSalonOptions] = useState<StaffSalonOption[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');

  const [bookings, setBookings] = useState<StaffBooking[]>([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState(false);

  const [selectedDate, setSelectedDate] = useState<Date>(() => toDateOnlyAnchor(new Date()));
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const datePickerRef = useRef<HTMLDivElement>(null);

  // ── بارگذاری سالن‌هایی که این شماره در آن‌ها پرسنل است ──
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/staff/my-salons');
        if (!res.ok) {
          if (res.status === 401) router.push('/login');
          return;
        }
        const data = await res.json();
        const salons: StaffSalonOption[] = data.salons ?? [];
        setSalonOptions(salons);
        if (salons.length > 0) setSelectedStaffId(salons[0].staffId);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [router]);

  // ── بارگذاری نوبت‌های پرسنل انتخاب‌شده ──
  const fetchBookings = useCallback(async () => {
    if (!selectedStaffId) { setBookings([]); return; }
    setIsLoadingBookings(true);
    try {
      const res = await fetch(`/api/staff/bookings?staffId=${selectedStaffId}`);
      if (res.ok) {
        const data = await res.json();
        setBookings(data.bookings ?? []);
      }
    } finally {
      setIsLoadingBookings(false);
    }
  }, [selectedStaffId]);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  useEffect(() => {
    if (!isDatePickerOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(e.target as Node)) {
        setIsDatePickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDatePickerOpen]);

  const goToPrevDay = () => setSelectedDate((prev) => { const d = new Date(prev); d.setUTCDate(d.getUTCDate() - 1); return d; });
  const goToNextDay = () => setSelectedDate((prev) => { const d = new Date(prev); d.setUTCDate(d.getUTCDate() + 1); return d; });
  const goToToday = () => setSelectedDate(toDateOnlyAnchor(new Date()));

  const selectedDateStr = selectedDate.toISOString().slice(0, 10);
  const todayStr = toDateOnlyAnchor(new Date()).toISOString().slice(0, 10);
  const isToday = selectedDateStr === todayStr;

  const dayLabel = selectedDate.toLocaleDateString('fa-IR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  const dayBookings = useMemo(
    () => bookings
      .filter((b) => b.date.slice(0, 10) === selectedDateStr)
      .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [bookings, selectedDateStr]
  );

  const currentOption = salonOptions.find((s) => s.staffId === selectedStaffId);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 text-[#824c71] animate-spin mb-4" />
        <p className="text-zinc-500 font-medium text-sm">در حال دریافت اطلاعات...</p>
      </div>
    );
  }

  if (salonOptions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center gap-3">
        <Users className="w-12 h-12 text-zinc-300" />
        <p className="text-zinc-600 font-medium">شما در هیچ سالنی به‌عنوان پرسنل ثبت نشده‌اید.</p>
        <p className="text-zinc-400 text-xs">اگر فکر می‌کنید این یک اشتباه است، با سالن مربوطه هماهنگ کنید.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto pt-8 pb-32 px-4 md:pt-10 md:px-0">
      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-zinc-900">نوبت‌های من</h1>
        <p className="text-zinc-500 text-xs md:text-sm mt-0.5">
          نوبت‌هایی که برای شما به‌عنوان پرسنل ثبت شده است
        </p>
      </div>

      {/* انتخاب سالن — فقط اگر پرسنل بیش از یک سالن باشد */}
      {salonOptions.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 mb-5 -mx-1 px-1">
          {salonOptions.map((opt) => (
            <button
              key={opt.staffId}
              onClick={() => setSelectedStaffId(opt.staffId)}
              className={`shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                selectedStaffId === opt.staffId
                  ? 'bg-[#824c71] text-white'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              }`}
            >
              {opt.salonName}
            </button>
          ))}
        </div>
      )}

      {currentOption && (
        <div className="bg-[#824c71]/5 border border-[#824c71]/20 rounded-2xl p-3.5 mb-5 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-[#824c71]/10 text-[#824c71] flex items-center justify-center text-xs font-bold shrink-0">
            {currentOption.staffName.slice(0, 1)}
          </div>
          <div>
            <p className="text-sm font-bold text-zinc-800">{currentOption.staffName}</p>
            <p className="text-[11px] text-zinc-500">پرسنل {currentOption.salonName}</p>
          </div>
        </div>
      )}

      {/* ناوبری روز */}
      <div className="flex items-center gap-2 mb-3 mt-1">
        <button onClick={goToNextDay} aria-label="روز بعد" className="w-11 h-11 flex items-center justify-center rounded-xl bg-zinc-100 text-zinc-600 hover:bg-zinc-200 transition shrink-0">
          <ChevronRight className="w-5 h-5" />
        </button>

        <div ref={datePickerRef} className="relative flex-1">
          <button
            type="button"
            onClick={() => setIsDatePickerOpen((o) => !o)}
            className="w-full h-11 flex items-center justify-center gap-2 rounded-xl bg-white border border-zinc-200 px-2"
          >
            <CalendarDays className="w-4 h-4 text-[#824c71] shrink-0" />
            <span className="text-xs sm:text-sm font-bold text-zinc-800 truncate">{dayLabel}</span>
          </button>

          {isDatePickerOpen && (
            <div className="absolute z-50 top-full mt-2 left-1/2 -translate-x-1/2 w-80">
              <PersianCalendar
                selectedDate={selectedDateStr}
                initialMonth={new DateObject({ date: selectedDate, calendar: persian, locale: persian_fa })}
                onSelectDate={(dateStr) => {
                  setSelectedDate(toDateOnlyAnchor(new Date(dateStr)));
                  setIsDatePickerOpen(false);
                }}
                className="shadow-lg shadow-zinc-200/60"
              />
            </div>
          )}
        </div>

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

      <div className="mb-8 mt-4">
        <h2 className="text-sm font-bold text-zinc-800 mb-3">
          نوبت‌های این روز {dayBookings.length > 0 && `(${dayBookings.length.toLocaleString('fa-IR')})`}
        </h2>

        {isLoadingBookings ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-7 h-7 text-[#824c71] animate-spin" />
          </div>
        ) : dayBookings.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {dayBookings.map((booking) => (
              <div key={booking.id} className="bg-white border border-zinc-100 rounded-2xl p-4 shadow-sm shadow-zinc-200/50">
                <div className="flex items-center gap-2 text-zinc-800 mb-3">
                  <UserIcon className="w-4 h-4 text-[#824c71]" />
                  <span className="font-bold text-sm">{booking.customerName || 'بدون نام'}</span>
                </div>

                <div className="flex items-center gap-1.5 text-[13px] text-zinc-600 pb-3 mb-1 border-b border-zinc-100">
                  <Phone className="w-3.5 h-3.5 text-zinc-400" />
                  <span dir="ltr">{booking.customerPhone}</span>
                  <span className="text-zinc-300">·</span>
                  <Clock className="w-3.5 h-3.5 text-zinc-400" />
                  <span dir="ltr">{toPersianDigits(booking.startTime)}</span>
                </div>

                {/* خدمات — لیست تخت با خط جداکننده نازک، بدون باکس تو در تو */}
                <div className="divide-y divide-zinc-50">
                  {booking.services.map((s, idx) => (
                    <div key={idx} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Scissors className="w-3 h-3 text-[#824c71]/60 shrink-0" />
                        <p className="text-[12.5px] font-bold text-zinc-800 truncate">{s.name}</p>
                      </div>
                      <div className="flex items-center gap-2.5 shrink-0 text-[11px] text-zinc-500">
                        {s.price != null && (
                          <span className="font-medium text-zinc-700">{formatMoney(s.price)} تومان</span>
                        )}
                        {s.durationMin != null && (
                          <span>{toPersianDigits(String(s.durationMin))} دقیقه</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 bg-zinc-50 rounded-2xl">
            <CalendarX className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
            <p className="text-zinc-400 text-sm">نوبتی برای این روز ثبت نشده است.</p>
          </div>
        )}
      </div>
    </div>
  );
}