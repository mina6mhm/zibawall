// app/(dashboard)/my-salon/page.tsx
'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Loader2, Clock, Phone, User as UserIcon,
  Scissors, Trash2, Store, Settings, Pencil, ChevronRight, ChevronLeft, ChevronDown, CalendarDays,
  Wallet, TrendingUp, Users, BarChart3, CalendarClock, CalendarX, Plus, Check, ShieldCheck,
} from 'lucide-react';
import { DateObject } from 'react-multi-date-picker';
import persian from 'react-date-object/calendars/persian';
import persian_fa from 'react-date-object/locales/persian_fa';
import EditBookingModal from '@/components/booking/EditBookingModal';
import StaffShareModal from '@/components/booking/StaffShareModal';
import PersianCalendar from '@/components/ui/PersianCalendar';
import { toDateOnlyAnchor } from '@/lib/dateUtils';

type ServiceItem = {
  name: string;
  price?: number;
  staffName?: string;
  staffPercentage?: number;
  durationMin?: number;
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
  bookingGroupId: string | null;
};

type StaffSalonOption = {
  staffId: string;
  staffName: string;
  salonId: string;
  salonName: string;
};

// سالن‌هایی که کاربر لاگین‌شده بهشون دسترسی داره — یا خودش مالکه، یا به‌عنوان مدیر اضافه شده
type MySalonOption = {
  id: string;
  name: string;
  city: string;
  province: string;
  isOwner: boolean;
  isActive: boolean;
};

type StaffBooking = {
  id: string;
  date: string;
  startTime: string;
  customerName: string | null;
  customerPhone: string;
  services: ServiceItem[];
  bookingGroupId: string | null;
  status: Booking['status'];
};

// هم‌سبک با STATUS_LABELS صفحه‌ی «نوبت‌های من»
const STATUS_LABELS: Record<Booking['status'], { label: string; bgClassName: string; textClassName: string }> = {
  PENDING_PAYMENT: { label: 'در انتظار پرداخت مشتری', bgClassName: 'bg-amber-50', textClassName: 'text-amber-600' },
  CONFIRMED: { label: 'قطعی شده', bgClassName: 'bg-emerald-50', textClassName: 'text-emerald-600' },
  CANCELLED: { label: 'لغو شده', bgClassName: 'bg-zinc-100', textClassName: 'text-zinc-500' },
};

const toPersianDigits = (str: string) => str.replace(/[0-9]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);
const formatMoney = (amount: number) => amount.toLocaleString('fa-IR');

export default function MySalonPage() {
  const router = useRouter();

  // ── وضعیت سالن‌داری ──
  const [hasSalon, setHasSalon] = useState<boolean | null>(null);
  const [salonName, setSalonName] = useState('');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookingEnabled, setBookingEnabled] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);

  // ── سوییچر سالن — وقتی کاربر هم مالک یک سالنه، هم مدیر سالن(های) دیگه ──
  const [mySalons, setMySalons] = useState<MySalonOption[]>([]);
  const [isSalonSwitcherOpen, setIsSalonSwitcherOpen] = useState(false);
  const [isSwitchingSalon, setIsSwitchingSalon] = useState(false);

  // ── وضعیت پرسنل‌بودن ──
  const [staffOptions, setStaffOptions] = useState<StaffSalonOption[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [staffBookings, setStaffBookings] = useState<StaffBooking[]>([]);
  const [isLoadingStaffBookings, setIsLoadingStaffBookings] = useState(false);

  // ── مشترک ──
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'salon' | 'staff'>('salon');
  const [selectedDate, setSelectedDate] = useState<Date>(() => toDateOnlyAnchor(new Date()));
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const datePickerRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async () => {
    try {
      const [profileRes, staffRes] = await Promise.all([
        fetch('/api/user/profile'),
        fetch('/api/staff/my-salons'),
      ]);

      if (!profileRes.ok) {
        if (profileRes.status === 401) { router.push('/login'); return; }
      } else {
        const profileData = await profileRes.json();
        setMySalons(profileData.salons || []);
        if (profileData.salon) {
          setHasSalon(true);
          setSalonName(profileData.salon.name);
          setBookingEnabled(!!profileData.salon.bookingEnabled);
          const bookingsRes = await fetch('/api/booking');
          if (bookingsRes.ok) {
            const bookingsData = await bookingsRes.json();
            setBookings(bookingsData.bookings || []);
          }
        } else {
          setHasSalon(false);
        }
      }

      if (staffRes.ok) {
        const staffData = await staffRes.json();
        const salons: StaffSalonOption[] = staffData.salons ?? [];
        setStaffOptions(salons);
        if (salons.length > 0) setSelectedStaffId(salons[0].staffId);
      }
    } catch (error) {
      console.error('خطا در دریافت اطلاعات:', error);
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // تب پیش‌فرض: اگر فقط پرسنل است (سالن ندارد)، مستقیم برو سراغ برنامه‌ی پرسنلی
  useEffect(() => {
    if (hasSalon === false && staffOptions.length > 0) setActiveTab('staff');
  }, [hasSalon, staffOptions.length]);

  const fetchStaffBookings = useCallback(async () => {
    if (!selectedStaffId) { setStaffBookings([]); return; }
    setIsLoadingStaffBookings(true);
    try {
      const res = await fetch(`/api/staff/bookings?staffId=${selectedStaffId}`);
      if (res.ok) {
        const data = await res.json();
        setStaffBookings(data.bookings ?? []);
      }
    } finally {
      setIsLoadingStaffBookings(false);
    }
  }, [selectedStaffId]);

  useEffect(() => { fetchStaffBookings(); }, [fetchStaffBookings]);

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

  // سوییچ به یکی دیگر از سالن‌های در دسترس کاربر (مالکیت یا مدیریت)
  const handleSwitchSalon = async (salonId: string) => {
    if (mySalons.find((s) => s.id === salonId)?.isActive) {
      setIsSalonSwitcherOpen(false);
      return;
    }
    setIsSwitchingSalon(true);
    try {
      const res = await fetch('/api/user/active-salon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ salonId }),
      });
      if (res.ok) {
        setIsSalonSwitcherOpen(false);
        setIsLoading(true);
        await fetchData();
      } else {
        const data = await res.json();
        alert(data.error || 'خطا در تعویض سالن');
      }
    } catch {
      alert('خطای ارتباط با سرور');
    } finally {
      setIsSwitchingSalon(false);
    }
  };

  const openEditBookingModal = (booking: Booking) => {
    setEditingBooking(booking);
    setIsModalOpen(true);
  };
  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingBooking(null);
  };

  const handleCancel = async (id: string) => {
    if (!window.confirm('آیا از لغو این نوبت مطمئن هستید؟ بعد از لغو، این ساعت دوباره برای رزرو آزاد می‌شود.')) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/booking/${id}/cancel`, { method: 'POST' });
      if (res.ok) {
        setBookings((prev) => prev.filter((b) => b.id !== id));
      } else {
        const data = await res.json();
        alert(data.error || 'خطا در لغو نوبت');
      }
    } catch {
      alert('خطای ارتباط با سرور');
    } finally {
      setDeletingId(null);
    }
  };

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
    () => bookings.filter((b) => b.date.slice(0, 10) === selectedDateStr).sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [bookings, selectedDateStr]
  );

  const dayStaffBookings = useMemo(
    () => staffBookings.filter((b) => b.date.slice(0, 10) === selectedDateStr).sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [staffBookings, selectedDateStr]
  );

  // کارت نوبت — دقیقاً هم‌ساختار با کارت صفحه‌ی «نوبت‌های من»: بدون بوردر،
  // سایه‌ی نرم، ردیف اول اسم مشتری + قیمت کل، ردیف دوم ساعت/تماس/خدمات با
  // آیکون بنفش، بعد بوردر جداکننده و زیرش وضعیت + اکشن‌های ویرایش/لغو.
  const renderBookingCard = (booking: Booking) => {
  const statusInfo = STATUS_LABELS[booking.status];
  const bookingTotal = booking.services.reduce((sum, s) => sum + (s.price || 0), 0);

  return (
    <div key={booking.id} className="bg-white rounded-2xl p-4 shadow-[0_2px_14px_rgba(0,0,0,0.09)]">
      {/* ردیف ۱: اسم مشتری راست، شماره مشتری چپ */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <p className="text-[15px] font-bold text-zinc-900 truncate">
          {booking.customerName || 'بدون نام'}
        </p>

        <a
          href={`tel:${booking.customerPhone}`}
          className="flex items-center gap-1.5 min-w-0 active:opacity-60 shrink-0"
        >
          <Phone
            className="w-3.5 h-3.5 text-[#824c71] shrink-0"
            strokeWidth={1.75}
          />
          <span className="text-xs font-bold truncate" dir="ltr">
            {booking.customerPhone}
          </span>
        </a>
      </div>

      {/* ردیف ۲: ساعت + خدمت + پرسنل و درصد */}
      <div className="flex items-center gap-3 flex-wrap text-xs text-zinc-700 mb-4">
        <span className="flex items-center gap-1.5 shrink-0">
          <span className="w-2 h-2 rounded-full bg-[#824c71] shrink-0" />
          <span
            className="font-bold whitespace-nowrap"
            dir="ltr"
          >
            {toPersianDigits(booking.startTime)}
          </span>
        </span>

        {booking.services.map((s, idx) => (
          <div
            key={idx}
            className="flex items-center gap-3 flex-wrap min-w-0"
          >
            <span className="flex items-center gap-1.5 min-w-0">
              <Scissors
                className="w-3.5 h-3.5 text-[#824c71] shrink-0"
                strokeWidth={1.75}
              />
              <span className="font-bold truncate">
                {s.name}
              </span>
            </span>

            {s.staffName && (
              <span className="flex items-center gap-1.5 min-w-0">
                <UserIcon
                  className="w-3.5 h-3.5 text-[#824c71] shrink-0"
                  strokeWidth={1.75}
                />
                <span className="font-bold truncate">
                  {s.staffName}
                  {s.staffPercentage
                    ? ` (${toPersianDigits(String(s.staffPercentage))}٪)`
                    : ''}
                </span>
              </span>
            )}
          </div>
        ))}
      </div>

      {/* ردیف ۳ + ۴: بوردر، سپس وضعیت و قیمت راست / اکشن‌ها چپ */}
      <div className="border-t border-zinc-100 pt-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium shrink-0 ${statusInfo.bgClassName} ${statusInfo.textClassName}`}
          >
            {statusInfo.label}
          </span>

          {bookingTotal > 0 && (
            <span className="text-xs font-bold text-zinc-700 whitespace-nowrap">
              {formatMoney(bookingTotal)} تومان
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => openEditBookingModal(booking)}
            className="w-8 h-8 flex items-center justify-center rounded-full text-[#824c71] hover:bg-[#824c71]/10 transition-colors"
            title="ویرایش این نوبت"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => handleCancel(booking.id)}
            disabled={deletingId === booking.id}
            className="w-8 h-8 flex items-center justify-center rounded-full text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
            title="لغو این نوبت"
          >
            {deletingId === booking.id ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Trash2 className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

  // کارت برنامه‌ی پرسنلی — دقیقاً هم‌ساختار با کارت «سالن من»: ردیف ۱ اسم
  // مشتری + شماره تماس، ردیف ۲ ساعت + خدمت + پرسنل/درصد، بوردر، و زیرش
  // وضعیت + قیمت — بدون دکمه‌های ویرایش/لغو (پرسنل نمی‌تونه نوبت رو مدیریت کنه)
  const renderStaffBookingCard = (booking: StaffBooking) => {
    const statusInfo = STATUS_LABELS[booking.status];
    const bookingTotal = booking.services.reduce((sum, s) => sum + (s.price || 0), 0);

    return (
      <div key={booking.id} className="bg-white rounded-2xl p-4 shadow-[0_2px_14px_rgba(0,0,0,0.09)]">
        {/* ردیف ۱: اسم مشتری راست، شماره مشتری چپ */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <p className="text-[15px] font-bold text-zinc-900 truncate">
            {booking.customerName || 'بدون نام'}
          </p>

          <a
            href={`tel:${booking.customerPhone}`}
            className="flex items-center gap-1.5 min-w-0 active:opacity-60 shrink-0"
          >
            <Phone className="w-3.5 h-3.5 text-[#824c71] shrink-0" strokeWidth={1.75} />
            <span className="text-xs font-bold truncate" dir="ltr">{booking.customerPhone}</span>
          </a>
        </div>

        {/* ردیف ۲: ساعت + خدمت + پرسنل و درصد */}
        <div className="flex items-center gap-3 flex-wrap text-xs text-zinc-700 mb-4">
          <span className="flex items-center gap-1.5 shrink-0">
            <span className="w-2 h-2 rounded-full bg-[#824c71] shrink-0" />
            <span className="font-bold whitespace-nowrap" dir="ltr">{toPersianDigits(booking.startTime)}</span>
          </span>

          {booking.services.map((s, idx) => (
            <div key={idx} className="flex items-center gap-3 flex-wrap min-w-0">
              <span className="flex items-center gap-1.5 min-w-0">
                <Scissors className="w-3.5 h-3.5 text-[#824c71] shrink-0" strokeWidth={1.75} />
                <span className="font-bold truncate">{s.name}</span>
              </span>

              {s.staffName && (
                <span className="flex items-center gap-1.5 min-w-0">
                  <UserIcon className="w-3.5 h-3.5 text-[#824c71] shrink-0" strokeWidth={1.75} />
                  <span className="font-bold truncate">
                    {s.staffName}
                    {s.staffPercentage ? ` (${toPersianDigits(String(s.staffPercentage))}٪)` : ''}
                  </span>
                </span>
              )}
            </div>
          ))}
        </div>

        {/* بوردر جداکننده، زیرش وضعیت راست و قیمت چپ — بدون اکشن */}
        <div className="border-t border-zinc-100 pt-3 flex items-center justify-between gap-3">
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium shrink-0 ${statusInfo.bgClassName} ${statusInfo.textClassName}`}>
            {statusInfo.label}
          </span>

          {bookingTotal > 0 && (
            <span className="text-xs font-bold text-zinc-700 whitespace-nowrap">
              {formatMoney(bookingTotal)} تومان
            </span>
          )}
        </div>
      </div>
    );
  };

  type StaffShareRow = { name: string; amount: number };

  const dailySummary = useMemo(() => {
    let revenue = 0;
    let staffShareTotal = 0;
    const staffMap: Record<string, number> = {};

    dayBookings.filter((b) => b.status !== 'CANCELLED').forEach((booking) => {
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

    return { revenue, staffShareTotal, netProfit: revenue - staffShareTotal, staffBreakdown };
  }, [dayBookings]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 text-[#824c71] animate-spin mb-4" />
        <p className="text-zinc-500 font-medium text-sm">در حال دریافت اطلاعات...</p>
      </div>
    );
  }

  // نه سالن دارد، نه پرسنل جایی است
  if (hasSalon === false && staffOptions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center gap-4">
        <Store className="w-12 h-12 text-zinc-300" />
        <p className="text-zinc-600 font-medium">شما هنوز کسب‌وکاری ثبت نکرده‌اید.</p>
        <Link
          href="/profile/business"
          className="bg-[#824c71] text-white px-5 py-2.5 rounded-[10px] text-sm font-medium hover:bg-[#6e3f60] transition"
        >
          ثبت نام کسب‌وکار
        </Link>
      </div>
    );
  }

  const showTabs = hasSalon === true && staffOptions.length > 0;
  const effectiveTab: 'salon' | 'staff' = showTabs ? activeTab : (hasSalon ? 'salon' : 'staff');
  const currentStaffOption = staffOptions.find((s) => s.staffId === selectedStaffId);

  return (
    <div className="max-w-3xl mx-auto pt-8 pb-32 px-4 md:pt-10 md:px-0">
      {/* هدر */}
      {effectiveTab === 'salon' ? (
        <div className="flex items-center justify-between mb-7">
          <div className="min-w-0">
            <button
              type="button"
              onClick={() => setIsSalonSwitcherOpen(true)}
              className="flex items-center gap-1.5 max-w-full"
            >
              <h1 className="text-xl md:text-2xl font-bold text-zinc-900 truncate">{salonName}</h1>
              <ChevronDown className="w-5 h-5 text-zinc-900 shrink-0" />
            </button>
            <p className="text-zinc-500 text-xs md:text-sm mt-0.5">مدیریت نوبت‌های سالن</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link href="/my-salon/reports" aria-label="گزارش درآمد" className="w-10 h-10 flex items-center justify-center rounded-[10px] bg-[#824c71]/10 text-[#824c71] hover:bg-[#824c71]/15 transition-colors">
              <BarChart3 className="w-4.5 h-4.5" />
            </Link>
            <Link href="/profile/business/overview" aria-label="تنظیمات" className="w-10 h-10 flex items-center justify-center rounded-[10px] bg-[#824c71]/10 text-[#824c71] hover:bg-[#824c71]/15 transition-colors">
              <Settings className="w-4.5 h-4.5" />
            </Link>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2 mb-7">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-zinc-900">برنامه پرسنلی</h1>
            <p className="text-zinc-500 text-xs md:text-sm mt-0.5">نوبت‌هایی که برای شما به‌عنوان پرسنل ثبت شده است</p>
          </div>
          {hasSalon === false && (
            <Link
              href="/profile/business"
              className="flex items-center gap-1.5 shrink-0 bg-[#824c71] text-white pr-3 pl-1.5 py-1.5 rounded-full text-[11px] font-bold hover:bg-[#6e3f60] transition-colors"
              title="ثبت کسب‌وکار"
            >
              ثبت کسب‌وکار
              <span className="w-6 h-6 flex items-center justify-center rounded-full bg-white/20">
                <Plus className="w-3.5 h-3.5" />
              </span>
            </Link>
          )}
        </div>
      )}

      {/* دکمه‌ی نوبت‌دهی آنلاین */}
      {effectiveTab === 'salon' && (
        <Link
          href="/my-salon/booking-settings"
          className="w-full flex items-center gap-3 bg-[#824c71] px-4 py-3.5 rounded-xl mb-6 hover:bg-[#6e3f60] transition-colors"
        >
          <div className="w-10 h-10 rounded-[10px] bg-white/15 flex items-center justify-center text-white shrink-0">
            <CalendarClock className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white">نوبت‌دهی آنلاین</p>
            <p className="text-[11px] text-white/70 mt-0.5">
              {bookingEnabled ? 'نوبت‌دهی آنلاین برای مشتریان فعال است' : 'نوبت‌دهی آنلاین غیرفعال است'}
            </p>
          </div>
          <ChevronLeft className="w-4.5 h-4.5 text-white/70 shrink-0" />
        </Link>
      )}

      {/* انتخاب سالن + کارت پرسنل — فقط تب پرسنلی، وقتی چند سالن دارد */}
      {effectiveTab === 'staff' && (
        <>
          {staffOptions.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1 mb-5 -mx-1 px-1">
              {staffOptions.map((opt) => (
                <button
                  key={opt.staffId}
                  onClick={() => setSelectedStaffId(opt.staffId)}
                  className={`shrink-0 px-3.5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
                    selectedStaffId === opt.staffId ? 'bg-[#824c71] text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                  }`}
                >
                  {opt.salonName}
                </button>
              ))}
            </div>
          )}
          {currentStaffOption && (
            <div className="bg-[#824c71]/5 border border-[#824c71]/20 rounded-[10px] p-3.5 mb-5 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#824c71]/10 text-[#824c71] flex items-center justify-center text-xs font-bold shrink-0">
                {currentStaffOption.staffName.slice(0, 1)}
              </div>
              <div>
                <p className="text-sm font-bold text-zinc-800">{currentStaffOption.staffName}</p>
                <p className="text-[11px] text-zinc-500">پرسنل {currentStaffOption.salonName}</p>
              </div>
            </div>
          )}
        </>
      )}

      {/* ناوبری روز — مشترک، فلش‌ها بنفش کمرنگ برند */}
      <div className="flex items-center gap-2 mb-3 mt-1">
        <button onClick={goToNextDay} aria-label="روز بعد" className="w-11 h-11 flex items-center justify-center rounded-[10px] bg-[#824c71]/10 text-[#824c71] hover:bg-[#824c71]/15 transition shrink-0">
          <ChevronRight className="w-5 h-5" />
        </button>
        <div ref={datePickerRef} className="relative flex-1">
          <button
            type="button"
            onClick={() => setIsDatePickerOpen((o) => !o)}
            className="w-full h-11 flex items-center justify-center gap-2 rounded-[10px] bg-white border border-zinc-200 px-2"
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
        <button onClick={goToPrevDay} aria-label="روز قبل" className="w-11 h-11 flex items-center justify-center rounded-[10px] bg-[#824c71]/10 text-[#824c71] hover:bg-[#824c71]/15 transition shrink-0">
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

      {/* آمار روزانه — فقط تب سالن */}
      {effectiveTab === 'salon' && dayBookings.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mb-6">
          <div className="bg-white border border-zinc-100 rounded-[10px] p-3 shadow-sm shadow-zinc-200/50">
            <div className="flex items-center gap-1.5 mb-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-[11px] font-medium text-zinc-500">درآمد کل</span>
            </div>
            <p className="text-sm font-bold text-zinc-800 leading-tight">
              {formatMoney(dailySummary.revenue)}
              <span className="text-[10px] font-medium text-zinc-400 mr-1">تومان</span>
            </p>
          </div>

          <button type="button" onClick={() => setIsStaffModalOpen(true)} className="bg-white border border-zinc-100 rounded-[10px] p-3 shadow-sm shadow-zinc-200/50 text-right">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Users className="w-3.5 h-3.5 text-[#824c71]" />
              <span className="text-[11px] font-medium text-zinc-500">سهم پرسنل</span>
            </div>
            <p className="text-sm font-bold text-[#824c71] leading-tight underline underline-offset-2">
              {formatMoney(dailySummary.staffShareTotal)}
              <span className="text-[10px] font-medium text-zinc-400 mr-1">تومان</span>
            </p>
          </button>

          <div className="bg-white border border-zinc-100 rounded-[10px] p-3 shadow-sm shadow-zinc-200/50">
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

      {/* لیست نوبت‌ها */}
      <div className="mb-8 mt-4">
        <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
          <h2 className="text-sm font-bold text-zinc-800">
            {isToday ? 'نوبت‌های امروز' : 'نوبت‌های این روز'}{' '}
            {effectiveTab === 'salon'
              ? `(${dayBookings.length.toLocaleString('fa-IR')})`
              : `(${dayStaffBookings.length.toLocaleString('fa-IR')})`}
          </h2>

          {/* سوییچ سالن‌من / برنامه‌پرسنلی — فقط وقتی کاربر هم مالک سالن است هم جایی پرسنل است */}
          {showTabs && (
            <div className="inline-flex items-center gap-0.5 bg-zinc-100 rounded-full p-0.5 shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('salon')}
                title="سالن من"
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition-colors ${
                  activeTab === 'salon' ? 'bg-white text-[#824c71] shadow-sm' : 'text-zinc-500'
                }`}
              >
                <Store className="w-3 h-3" strokeWidth={2} />
                سالن من
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('staff')}
                title="برنامه پرسنلی"
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition-colors ${
                  activeTab === 'staff' ? 'bg-white text-[#824c71] shadow-sm' : 'text-zinc-500'
                }`}
              >
                <Users className="w-3 h-3" strokeWidth={2} />
                پرسنلی
              </button>
            </div>
          )}
        </div>

        {effectiveTab === 'salon' ? (
          dayBookings.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{dayBookings.map(renderBookingCard)}</div>
          ) : (
            <div className="text-center py-10 bg-zinc-50 rounded-[10px]">
              <p className="text-zinc-400 text-sm">نوبتی برای این روز ثبت نشده است.</p>
            </div>
          )
        ) : isLoadingStaffBookings ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-7 h-7 text-[#824c71] animate-spin" />
          </div>
        ) : dayStaffBookings.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{dayStaffBookings.map(renderStaffBookingCard)}</div>
        ) : (
          <div className="text-center py-10 bg-zinc-50 rounded-[10px]">
            <CalendarX className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
            <p className="text-zinc-400 text-sm">نوبتی برای این روز ثبت نشده است.</p>
          </div>
        )}
      </div>

      {effectiveTab === 'salon' && (
        <>
          <EditBookingModal isOpen={isModalOpen} onClose={handleModalClose} onSaved={fetchData} booking={editingBooking} />
          <StaffShareModal
            isOpen={isStaffModalOpen}
            onClose={() => setIsStaffModalOpen(false)}
            staffBreakdown={dailySummary.staffBreakdown}
            total={dailySummary.staffShareTotal}
            dayLabel={dayLabel}
          />
        </>
      )}

      {/* پاپ‌آپ سوییچ سالن */}
      {isSalonSwitcherOpen && (
        <div
          className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => !isSwitchingSalon && setIsSalonSwitcherOpen(false)}
        >
          <div
            className="w-full bg-white rounded-t-2xl p-4 pb-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-zinc-200 rounded-full mx-auto mb-3" />
            <h3 className="text-sm font-bold text-zinc-900 mb-3 px-1">سالن‌های من</h3>

            {isSwitchingSalon ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 text-[#824c71] animate-spin" />
              </div>
            ) : (
              <div className="space-y-1.5 max-h-[60vh] overflow-y-auto">
                {mySalons.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => handleSwitchSalon(s.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] text-right transition-colors ${
                      s.isActive ? 'bg-[#824c71]/8' : 'hover:bg-zinc-50'
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 ${
                      s.isActive ? 'bg-[#824c71] text-white' : 'bg-zinc-100 text-zinc-500'
                    }`}>
                      {s.isOwner ? <Store className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-bold truncate ${s.isActive ? 'text-[#824c71]' : 'text-zinc-800'}`}>
                        {s.name}
                      </p>
                      <p className="text-[11px] text-zinc-400 truncate">
                        {s.isOwner ? 'سالن شما' : 'مدیر سالن'} · {s.city}
                      </p>
                    </div>
                    {s.isActive && <Check className="w-4.5 h-4.5 text-[#824c71] shrink-0" />}
                  </button>
                ))}

                <Link
                  href="/profile/business"
                  onClick={() => setIsSalonSwitcherOpen(false)}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] text-right hover:bg-zinc-50 transition-colors mt-1 border-t border-zinc-100 pt-3.5"
                >
                  <div className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 bg-zinc-100 text-zinc-500">
                    <Plus className="w-4 h-4" />
                  </div>
                  <p className="text-sm font-bold text-zinc-700">ثبت‌نام کسب‌وکار جدید</p>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}