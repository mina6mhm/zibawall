// app/(dashboard)/salon/[id]/book/page.tsx
'use client';

import { useState, useEffect, use, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowRight, ArrowLeft, Loader2, CalendarClock, Clock,
  Check, Plus, Trash2, CreditCard, User,
  Hand, Footprints, Eye, Scissors, Sparkles, Palette, Crown, Zap, Flower2,
  type LucideIcon,
} from 'lucide-react';
import { DateObject } from 'react-multi-date-picker';
import PersianCalendar, { CalendarDayMarker } from '@/components/ui/PersianCalendar';
import persian from 'react-date-object/calendars/persian';
import persian_fa from 'react-date-object/locales/persian_fa';
import { toDateOnlyAnchor } from '@/lib/dateUtils';
import { BOOKING_APP_FEE } from '@/lib/constants';

// ─── Types ───────────────────────────────────────────────────────────────────

type BookingService = {
  id: string;
  name: string;
  durationMin: number;
  price: number;
};

type StaffOption = { id: string; name: string };

type TimeSlot = {
  time: string;
  availableStaff: StaffOption[];
};

type CartItem = {
  serviceId: string;
  serviceName: string;
  durationMin: number;
  price: number;
  date: string;
  startTime: string;
  staffId: string;
  staffName: string;
};

type Step = 'service' | 'staff' | 'schedule' | 'confirm';

const stepOrder: Step[] = ['service', 'staff', 'schedule', 'confirm'];

const STEP_TITLES: Record<Step, { title: string; sub: string }> = {
  service:  { title: 'چه خدماتی می‌خواهید؟', sub: 'یک مورد انتخاب کنید' },
  staff:    { title: 'توسط چه کسی؟', sub: 'اختیاری، می‌توانید تفاوتی ندارد را انتخاب کنید' },
  schedule: { title: 'چه زمانی؟', sub: 'تاریخ و ساعت را انتخاب کنید' },
  confirm:  { title: 'تأیید نهایی', sub: 'نوبت‌های انتخابی را بررسی کنید' },
};

const formatPrice = (n: number) => n.toLocaleString('fa-IR');
const toPersian = (s: string) => s.replace(/[0-9]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[+d]);

const formatPersianDate = (dateStr: string) =>
  new DateObject({ date: new Date(dateStr), calendar: persian, locale: persian_fa })
    .format('D MMMM YYYY');

const formatDuration = (min: number) => {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return [h > 0 && `${h} ساعت`, m > 0 && `${m} دقیقه`].filter(Boolean).join(' ');
};

const GREGORIAN_TO_PERSIAN_DAY: Record<number, string> = {
  6: 'شنبه', 0: 'یکشنبه', 1: 'دوشنبه',
  2: 'سه‌شنبه', 3: 'چهارشنبه', 4: 'پنجشنبه', 5: 'جمعه',
};

function buildClosedDayMarkers(closedDays: string[]): Record<string, CalendarDayMarker> {
  if (!closedDays.length) return {};
  const markers: Record<string, CalendarDayMarker> = {};
  const today = toDateOnlyAnchor(new Date());
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() + i);
    const name = GREGORIAN_TO_PERSIAN_DAY[d.getUTCDay()];
    if (closedDays.includes(name))
      markers[d.toISOString().slice(0, 10)] = { className: 'bg-red-50 text-red-400 pointer-events-none' };
  }
  return markers;
}

// روزهای تعطیل اختصاصی (override سالن) — تاریخ‌های دقیق میلادی
function buildClosedDateMarkers(closedDates: string[]): Record<string, CalendarDayMarker> {
  if (!closedDates.length) return {};
  const markers: Record<string, CalendarDayMarker> = {};
  closedDates.forEach((d) => {
    markers[d] = { className: 'bg-red-50 text-red-400 pointer-events-none' };
  });
  return markers;
}

// ─── تشخیص آیکون خدمت بر اساس کلمات کلیدی در اسم آن ────────────────────────
// همون منطقی که دسته‌بندی‌های صفحه‌ی اصلی دارن، اینجا روی تک‌تک خدمات اعمال می‌شه

const SERVICE_ICON_RULES: { keywords: string[]; icon: LucideIcon }[] = [
  { keywords: ['پا', 'پدیکور'], icon: Footprints },
  { keywords: ['ناخن', 'دست', 'مانیکور', 'کاشت ناخن', 'ژلیش'], icon: Hand },
  { keywords: ['ابرو', 'مژه', 'میکروبلیدینگ', 'لیفت مژه'], icon: Eye },
  { keywords: ['عروس', 'فرمالیته'], icon: Crown },
  { keywords: ['میکاپ', 'آرایش', 'گریم'], icon: Palette },
  { keywords: ['اپیلاسیون', 'لیزر', 'موزدایی', 'وکس', 'اصلاح'], icon: Zap },
  { keywords: ['ماساژ', 'اسپا'], icon: Flower2 },
  { keywords: ['پوست', 'فیشیال', 'پاکسازی', 'میکرودرم', 'مزوتراپی'], icon: Sparkles },
  { keywords: ['مو', 'کراتین', 'رنگ', 'شینیون', 'شنیون', 'بافت', 'براشینگ', 'کوتاهی', 'احیا'], icon: Scissors },
];

function getServiceIcon(name: string): LucideIcon {
  const normalized = name.toLowerCase();
  for (const rule of SERVICE_ICON_RULES) {
    if (rule.keywords.some((kw) => normalized.includes(kw))) return rule.icon;
  }
  return Sparkles;
}

// ─── Breadcrumb ───────────────────────────────────────────────────────────────
// چیدمانِ راهنمای مرحله‌ها خنثی (خاکستری/تیره) نگه داشته شده — رنگ بنفش برای
// عناصر محتوایی (آیکون خدمت، کارت انتخابی، قیمت) ذخیره می‌شه، نه ناوبری بالای صفحه

const STEP_SHORT: Record<Step, string> = {
  service: 'خدمات', staff: 'پرسنل', schedule: 'زمان', confirm: 'تأیید',
};

function Breadcrumb({ step, currentIdx }: { step: Step; currentIdx: number }) {
  return (
    <div className="flex items-center gap-1.5 mb-7">
      {stepOrder.map((s, i) => (
        <div key={s} className="flex items-center gap-1.5">
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] transition-all ${
            i === currentIdx
              ? 'bg-stone-900/5 text-stone-900 font-bold'
              : i < currentIdx
              ? 'text-stone-400'
              : 'text-stone-300'
          }`}>
            {i < currentIdx
              ? <Check className="w-3 h-3 text-stone-400 shrink-0" />
              : <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] shrink-0 ${
                  i === currentIdx ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-400'
                }`}>{toPersian(String(i + 1))}</span>
            }
            {STEP_SHORT[s]}
          </div>
          {i < stepOrder.length - 1 && (
            <div className={`w-4 h-px ${i < currentIdx ? 'bg-stone-300' : 'bg-stone-100'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function BookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: salonId } = use(params);
  const router = useRouter();

  const [salonName, setSalonName] = useState('');
  const [services, setServices] = useState<BookingService[]>([]);
  const [isLoadingSalon, setIsLoadingSalon] = useState(true);
  const [closedWeekDays, setClosedWeekDays] = useState<string[]>([]); // روزهایی که open:false هستن در weeklySchedule
  const [closedDates, setClosedDates] = useState<string[]>([]); // تاریخ‌های خاص تعطیل (override سالن)

  const [step, setStep] = useState<Step>('service');
  const [selectedService, setSelectedService] = useState<BookingService | null>(null);

  const [staffOptions, setStaffOptions] = useState<StaffOption[]>([]);
  const [isLoadingStaff, setIsLoadingStaff] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [slotsError, setSlotsError] = useState('');
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const currentIdx = stepOrder.indexOf(step);

  // ── بارگذاری ────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const [salonRes, svcRes, schedRes] = await Promise.all([
        fetch(`/api/salon/${salonId}`),
        fetch(`/api/booking-services/public?salonId=${salonId}`),
        fetch(`/api/salon/schedule/public?salonId=${salonId}`),
      ]);
      if (salonRes.ok) {
        const d = await salonRes.json();
        setSalonName(d.name);
        if (!d.bookingEnabled) { router.replace(`/salon/${salonId}`); return; }
      }
      if (svcRes.ok) {
        const svcs = (await svcRes.json()).services ?? [];
        setServices(svcs);
        if (svcs.length > 0) setSelectedService(svcs[0]);
      }
      if (schedRes.ok) {
        const d = await schedRes.json();
        setClosedWeekDays(d.closedDays ?? []);
        setClosedDates(d.closedDates ?? []);
      }
      setIsLoadingSalon(false);
    })();
  }, [salonId, router]);

  const loadStaff = useCallback(async () => {
    if (!selectedService) return;
    setIsLoadingStaff(true);
    const res = await fetch(`/api/booking-online/eligible-staff?salonId=${salonId}&serviceId=${selectedService.id}`);
    if (res.ok) setStaffOptions((await res.json()).staff ?? []);
    setIsLoadingStaff(false);
  }, [salonId, selectedService]);

  useEffect(() => { if (step === 'staff') loadStaff(); }, [step, loadStaff]);

  const loadSlots = useCallback(async () => {
    if (!selectedService || !selectedDate) return;
    setIsLoadingSlots(true); setSlotsError(''); setSlots([]); setSelectedSlot(null);
    const qs = new URLSearchParams({
      salonId, serviceId: selectedService.id, date: selectedDate,
      ...(selectedStaffId ? { staffId: selectedStaffId } : {}),
    });
    const res = await fetch(`/api/booking-online/available-slots?${qs}`);
    if (res.ok) setSlots((await res.json()).slots ?? []);
    else setSlotsError('خطا در دریافت ساعت‌ها');
    setIsLoadingSlots(false);
  }, [salonId, selectedService, selectedDate, selectedStaffId]);

  useEffect(() => { if (step === 'schedule' && selectedDate) loadSlots(); }, [step, selectedDate, loadSlots]);
  useEffect(() => { if (step === 'schedule' && selectedDate) loadSlots(); }, [selectedStaffId]); // eslint-disable-line

  // ── ناوبری ──────────────────────────────────────────────────────────────
  const canGoNext = useMemo(() => {
    if (step === 'service')  return !!selectedService;
    if (step === 'staff')    return true;
    if (step === 'schedule') return !!selectedSlot;
    return false;
  }, [step, selectedService, selectedSlot]);

  const goBack = () => {
    const prev = stepOrder[currentIdx - 1];
    if (!prev) return;
    if (prev === 'service') { setSelectedService(null); setSelectedStaffId(null); setSelectedDate(null); setSlots([]); setSelectedSlot(null); }
    else if (prev === 'staff') { setSelectedDate(null); setSlots([]); setSelectedSlot(null); }
    else if (prev === 'schedule') { setSelectedSlot(null); }
    setStep(prev);
  };

  const goNext = () => {
    if (!canGoNext) return;
    setStep(stepOrder[currentIdx + 1]);
  };

  const startNew = () => {
    setSelectedService(null); setSelectedStaffId(null);
    setSelectedDate(null); setSlots([]); setSelectedSlot(null);
    setStep('service');
  };

  const addToCart = () => {
    if (!selectedService || !selectedDate || !selectedSlot) return;
    const staffId   = selectedStaffId ?? selectedSlot.availableStaff[0]?.id ?? '';
    const staffName = selectedStaffId
      ? staffOptions.find((s) => s.id === selectedStaffId)?.name ?? ''
      : selectedSlot.availableStaff[0]?.name ?? '—';
    setCart((p) => [...p, {
      serviceId: selectedService.id, serviceName: selectedService.name,
      durationMin: selectedService.durationMin, price: selectedService.price,
      date: selectedDate, startTime: selectedSlot.time, staffId, staffName,
    }]);
    startNew();
    setStep('confirm');
  };

  const handleSubmit = async () => {
    if (!cart.length) return;
    setIsSubmitting(true);
    setSubmitError('');

    try {
      const reserveRes = await fetch('/api/booking-online/reserve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          salonId,
          items: cart.map((item) => ({
            serviceId: item.serviceId,
            staffId: item.staffId || undefined,
            date: item.date,
            startTime: item.startTime,
          })),
        }),
      });

      const reserveData = await reserveRes.json();

      if (!reserveRes.ok) {
        setSubmitError(reserveData.error || 'خطا در ثبت نوبت');
        return;
      }

      const groupId = reserveData.group?.id;
      if (!groupId) {
        setSubmitError('خطا در ثبت نوبت');
        return;
      }

      const payRes = await fetch(`/api/booking-group/${groupId}/pay`, { method: 'POST' });
      const payData = await payRes.json();

      // فقط وقتی paymentUrl واقعاً برگشته باشه به درگاه می‌ریم.
      // هر حالت دیگه (چه ۴۰۰ چه ۵۰۰ چه پاسخ ناقص) یعنی پرداخت شروع نشده —
      // هیچ‌وقت نباید اینو معادل موفقیت در نظر بگیریم، چون status نوبت
      // همچنان PENDING_PAYMENT می‌مونه و باید کاربر واقعاً پرداخت کنه.
      if (payRes.ok && payData.paymentUrl) {
        window.location.href = payData.paymentUrl;
        return;
      }

      setSubmitError(
        payData.error ||
          'اتصال به درگاه پرداخت با خطا مواجه شد. نوبت شما به‌صورت موقت رزرو شده — لطفاً دوباره تلاش کنید یا از صفحه «نوبت‌های من» پرداخت را کامل کنید.'
      );
    } catch {
      setSubmitError('خطای ارتباط با سرور');
    } finally {
      setIsSubmitting(false);
    }
  };

  const appFee       = cart.length > 0 ? BOOKING_APP_FEE : 0;
  const totalPayable = appFee;
  const closedMarkers = useMemo(() => ({
    ...buildClosedDayMarkers(closedWeekDays),
    ...buildClosedDateMarkers(closedDates),
  }), [closedWeekDays, closedDates]);

  // ── Render ───────────────────────────────────────────────────────────────
  if (isLoadingSalon) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <Loader2 className="w-6 h-6 text-stone-300 animate-spin" />
    </div>
  );

  const { title, sub } = STEP_TITLES[step];

  return (
    <div className="min-h-screen bg-white" dir="rtl">
      <div className="max-w-md mx-auto px-5 pt-6 pb-36">

        {/* هدر */}
        <div className="flex items-center mb-6">
          <Link
            href={`/salon/${salonId}`}
            className="flex items-center gap-1 text-sm font-medium text-stone-600 hover:text-stone-900 transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
            بازگشت
          </Link>
        </div>

        {/* breadcrumb */}
        {step !== 'confirm' && <Breadcrumb step={step} currentIdx={currentIdx} />}

        {/* عنوان مرحله */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-stone-900">{title}</h1>
          <p className="text-xs text-stone-400 mt-1">{sub}</p>
        </div>

        {/* ─── کارت نوبت‌های ثبت‌شده — در همه مراحل غیر از confirm ─── */}
        {cart.length > 0 && step !== 'confirm' && (
          <div className="mb-5 space-y-2">
            <p className="text-xs font-bold text-stone-400 px-1">نوبت‌های ثبت‌شده</p>
            {cart.map((item, idx) => (
              <div key={idx} className="bg-stone-50 border border-stone-100 rounded-2xl p-4">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <p className="text-sm font-bold text-stone-900">{item.serviceName}</p>
                    <p className="text-[11px] text-stone-400 mt-0.5 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {toPersian(formatDuration(item.durationMin))}
                    </p>
                  </div>
                  <button
                    onClick={() => setCart((p) => p.filter((_, i) => i !== idx))}
                    className="p-1 text-red-300 hover:text-red-500 transition-colors shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="flex items-center gap-1 bg-white rounded-lg px-2.5 py-1.5 border border-stone-100 text-[11px] text-stone-500">
                    <CalendarClock className="w-3.5 h-3.5 text-[#824c71]/60" />
                    {formatPersianDate(item.date)} — {toPersian(item.startTime)}
                  </span>
                  <span className="flex items-center gap-1 bg-white rounded-lg px-2.5 py-1.5 border border-stone-100 text-[11px] text-stone-500">
                    <User className="w-3.5 h-3.5 text-stone-300" />
                    {item.staffName}
                  </span>
                </div>
                <div className="mt-3 pt-3 border-t border-stone-100 flex justify-end">
                  <button
                    onClick={() => setStep('confirm')}
                    className="text-xs font-bold text-[#824c71] flex items-center gap-1"
                  >
                    تأیید و پرداخت
                    <ArrowLeft className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ─── مرحله ۱: خدمات — کارت‌ها به سبک دسته‌بندی صفحه‌ی اصلی، با آیکون تشخیصی ─── */}
        {step === 'service' && (
          <div className="space-y-2.5">
            {services.length === 0 ? (
              <p className="text-center text-stone-400 text-sm py-16">خدماتی تعریف نشده</p>
            ) : services.map((svc) => {
              const Icon = getServiceIcon(svc.name);
              const isSelected = selectedService?.id === svc.id;
              return (
                <button
                  key={svc.id}
                  onClick={() => setSelectedService(svc)}
                  className={`w-full flex items-center gap-3.5 p-3.5 rounded-2xl border text-right transition-all active:scale-[0.99] ${
                    isSelected
                      ? 'border-[#824c71] bg-[#824c71]/[0.06]'
                      : 'border-stone-100 bg-white hover:bg-stone-50'
                  }`}
                >
                  <span
                    className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                      isSelected ? 'bg-[#824c71]/15' : 'bg-[#824c71]/[0.08]'
                    }`}
                  >
                    <Icon
                      className={`w-5 h-5 ${isSelected ? 'text-[#824c71]' : 'text-[#824c71]/75'}`}
                      strokeWidth={1.75}
                    />
                  </span>

                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${isSelected ? 'text-[#824c71]' : 'text-stone-900'}`}>
                      {svc.name}
                    </p>
                    <span className="text-[12px] text-stone-400 flex items-center gap-1 mt-1">
                      <Clock className="w-3 h-3" />
                      {toPersian(formatDuration(svc.durationMin))}
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    {svc.price > 0 && (
                      <span className="text-sm font-bold text-[#824c71]">
                        {toPersian(formatPrice(svc.price))} تومان
                      </span>
                    )}
                    {isSelected && (
                      <span className="w-5 h-5 rounded-full bg-[#824c71] flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 text-white" />
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* ─── مرحله ۲: پرسنل — همون سبک کارت ─── */}
        {step === 'staff' && selectedService && (
          <div>
            {isLoadingStaff ? (
              <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 text-stone-300 animate-spin" /></div>
            ) : (
              <div className="space-y-2.5">
                {/* تفاوتی ندارد */}
                <button
                  onClick={() => setSelectedStaffId(null)}
                  className={`w-full flex items-center gap-3.5 p-3.5 rounded-2xl border text-right transition-all ${
                    selectedStaffId === null
                      ? 'border-[#824c71] bg-[#824c71]/[0.06]'
                      : 'border-stone-100 bg-white hover:bg-stone-50'
                  }`}
                >
                  <span className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${
                    selectedStaffId === null ? 'bg-[#824c71]/15' : 'bg-[#824c71]/[0.08]'
                  }`}>
                    <User className={`w-5 h-5 ${selectedStaffId === null ? 'text-[#824c71]' : 'text-[#824c71]/75'}`} strokeWidth={1.75} />
                  </span>
                  <div className="flex-1">
                    <p className={`text-sm font-semibold ${selectedStaffId === null ? 'text-[#824c71]' : 'text-stone-900'}`}>تفاوتی ندارد</p>
                    <p className="text-[11px] text-stone-400 mt-0.5">اولین پرسنل آزاد انتخاب می‌شود</p>
                  </div>
                  {selectedStaffId === null && (
                    <span className="w-5 h-5 rounded-full bg-[#824c71] flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 text-white" />
                    </span>
                  )}
                </button>

                {staffOptions.map((s) => {
                  const isSelected = selectedStaffId === s.id;
                  return (
                    <button
                      key={s.id}
                      onClick={() => setSelectedStaffId(s.id)}
                      className={`w-full flex items-center gap-3.5 p-3.5 rounded-2xl border text-right transition-all ${
                        isSelected
                          ? 'border-[#824c71] bg-[#824c71]/[0.06]'
                          : 'border-stone-100 bg-white hover:bg-stone-50'
                      }`}
                    >
                      <span className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                        isSelected ? 'bg-[#824c71]/15 text-[#824c71]' : 'bg-[#824c71]/[0.08] text-[#824c71]/75'
                      }`}>
                        {s.name.slice(0, 1)}
                      </span>
                      <p className={`flex-1 text-sm font-semibold text-right ${isSelected ? 'text-[#824c71]' : 'text-stone-900'}`}>
                        {s.name}
                      </p>
                      {isSelected && (
                        <span className="w-5 h-5 rounded-full bg-[#824c71] flex items-center justify-center shrink-0">
                          <Check className="w-3 h-3 text-white" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ─── مرحله ۳: تاریخ + ساعت ─── */}
        {step === 'schedule' && selectedService && (
          <div>
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">تاریخ</p>
            <PersianCalendar
              selectedDate={selectedDate}
              onSelectDate={(d) => { if (d !== selectedDate) setSelectedSlot(null); setSelectedDate(d); }}
              initialMonth={new DateObject({ calendar: persian, locale: persian_fa })}
              markers={closedMarkers}
            />

            {selectedDate && (
              <div className="mt-7">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">ساعت</p>
                  <span className="text-xs text-stone-400">{formatPersianDate(selectedDate)}</span>
                </div>

                {isLoadingSlots ? (
                  <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 text-stone-300 animate-spin" /></div>
                ) : slotsError ? (
                  <p className="text-center text-sm text-red-400 py-8">{slotsError}</p>
                ) : slots.length === 0 ? (
                  <div className="text-center py-10">
                    <p className="text-sm text-stone-500 font-medium">ساعت آزادی در این روز وجود ندارد</p>
                    <p className="text-xs text-stone-400 mt-1">تاریخ دیگری انتخاب کنید</p>
                  </div>
                ) : (
                  <>
                    {staffOptions.length > 1 && (
                      <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
                        <button
                          onClick={() => setSelectedStaffId(null)}
                          className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                            selectedStaffId === null
                              ? 'border-[#824c71] bg-[#824c71] text-white'
                              : 'border-stone-200 text-stone-500 hover:border-stone-300'
                          }`}
                        >
                          همه
                        </button>
                        {staffOptions.map((s) => (
                          <button
                            key={s.id}
                            onClick={() => setSelectedStaffId(s.id)}
                            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                              selectedStaffId === s.id
                                ? 'border-[#824c71] bg-[#824c71] text-white'
                                : 'border-stone-200 text-stone-500 hover:border-stone-300'
                            }`}
                          >
                            {s.name}
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="grid grid-cols-4 gap-2">
                      {slots.map((slot) => (
                        <button
                          key={slot.time}
                          onClick={() => setSelectedSlot(selectedSlot?.time === slot.time ? null : slot)}
                          className={`py-2.5 rounded-xl text-sm font-medium border transition-all ${
                            selectedSlot?.time === slot.time
                              ? 'bg-[#824c71] text-white border-[#824c71]'
                              : 'bg-white text-stone-700 border-stone-100 hover:border-[#824c71]/20 hover:text-[#824c71]'
                          }`}
                          dir="ltr"
                        >
                          {toPersian(slot.time)}
                        </button>
                      ))}
                    </div>

                    {selectedSlot && (
                      <div className="h-6" />
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* ─── مرحله ۴: تأیید ─── */}
        {step === 'confirm' && (
          <div>
            {cart.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-stone-400 text-sm">سبد رزرو خالی است</p>
                <button onClick={startNew} className="mt-4 text-sm text-stone-700 underline underline-offset-2">
                  افزودن نوبت
                </button>
              </div>
            ) : (
              <>
                <div className="space-y-3 mb-6">
                  {cart.map((item, idx) => (
                    <div key={idx} className="bg-stone-50 rounded-2xl p-4 border border-stone-100">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div>
                          <p className="text-sm font-bold text-stone-900">{item.serviceName}</p>
                          <p className="text-xs text-stone-400 mt-0.5 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {toPersian(formatDuration(item.durationMin))}
                          </p>
                        </div>
                        <button
                          onClick={() => setCart((p) => p.filter((_, i) => i !== idx))}
                          className="p-1.5 text-red-300 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="flex items-center gap-1 text-[11px] text-stone-500 bg-white rounded-lg px-2.5 py-1.5 border border-stone-100">
                          <CalendarClock className="w-3.5 h-3.5 text-[#824c71]/60" />
                          {formatPersianDate(item.date)} — {toPersian(item.startTime)}
                        </span>
                        <span className="flex items-center gap-1 text-[11px] text-stone-500 bg-white rounded-lg px-2.5 py-1.5 border border-stone-100">
                          <User className="w-3.5 h-3.5 text-stone-300" />
                          {item.staffName}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={startNew}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-dashed border-stone-200 text-sm text-stone-400 hover:text-stone-600 hover:border-stone-300 transition-all mb-6"
                >
                  <Plus className="w-4 h-4" />
                  افزودن نوبت دیگر
                </button>

                {submitError && (
                  <p className="text-center text-xs text-red-400 mb-4">{submitError}</p>
                )}

                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="w-full bg-[#824c71] hover:bg-[#6d3f5e] text-white rounded-2xl py-4 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60 transition-colors"
                >
                  {isSubmitting
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> در حال ثبت...</>
                    : <><CreditCard className="w-4 h-4" />پرداخت و ثبت نوبت</>
                  }
                </button>
              </>
            )}
          </div>
        )}

        {/* ناوبری قبل/ادامه — پایین صفحه، بدون بک‌گراند، فقط نوشته با رنگ مشکی */}
        {step !== 'confirm' && (
          <div
            className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md px-5 py-3.5 flex items-center justify-between"
            style={{ paddingBottom: 'calc(0.875rem + env(safe-area-inset-bottom, 0px))' }}
          >
            <button
              onClick={goBack}
              disabled={currentIdx === 0}
              className={`flex items-center gap-1.5 text-sm font-medium transition-colors px-3 py-2 ${
                currentIdx === 0
                  ? 'text-stone-300 pointer-events-none'
                  : 'text-black hover:opacity-70'
              }`}
            >
              <ArrowRight className="w-4 h-4" />
              قبلی
            </button>

            {step === 'schedule' ? (
              <button
                onClick={addToCart}
                disabled={!selectedSlot}
                className={`flex items-center gap-1.5 text-sm font-bold px-3 py-2 transition-colors ${
                  selectedSlot
                    ? 'text-black hover:opacity-70'
                    : 'text-stone-300 pointer-events-none'
                }`}
              >
                ادامه
                <ArrowLeft className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={goNext}
                disabled={!canGoNext}
                className={`flex items-center gap-1.5 text-sm font-bold px-3 py-2 transition-colors ${
                  canGoNext
                    ? 'text-black hover:opacity-70'
                    : 'text-stone-300 pointer-events-none'
                }`}
              >
                ادامه
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

      </div>
    </div>
  );
}