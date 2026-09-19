// app/(dashboard)/salon/[id]/book/page.tsx
'use client';

import { useState, useEffect, useRef, use, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight, ArrowLeft, Loader2, CalendarClock, Clock,
  Check, Plus, Trash2, CreditCard, User, Users,
  Hand, Footprints, Eye, Scissors, Sparkles, Palette, Crown, Zap, Flower2,
  type LucideIcon,
} from 'lucide-react';
import { DateObject } from 'react-multi-date-picker';
import PersianCalendar, { CalendarDayMarker } from '@/components/ui/PersianCalendar';
import persian from 'react-date-object/calendars/persian';
import persian_fa from 'react-date-object/locales/persian_fa';
import { toDateOnlyAnchor } from '@/lib/dateUtils';
import { BOOKING_APP_FEE } from '@/lib/constants';
import { openPaymentUrl } from '@/lib/openPaymentUrl';
import { useOnBrowserReturn } from '@/lib/useBrowserReturn';

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

// تایتل‌ها با لحن رسمی — نه محاوره‌ای
const STEP_TITLES: Record<Step, { title: string; sub: string }> = {
  service:  { title: 'انتخاب خدمات', sub: 'خدمت مورد نظر خود را انتخاب کنید' },
  staff:    { title: 'انتخاب پرسنل', sub: 'در صورت تمایل، پرسنل موردنظر را انتخاب کنید' },
  schedule: { title: 'انتخاب تاریخ و ساعت', sub: 'روز و ساعت نوبت خود را مشخص کنید' },
  confirm:  { title: 'تأیید نهایی', sub: 'نوبت‌های انتخابی را بررسی و پرداخت کنید' },
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
// نوار مرحله‌ای با رنگ برند — دایره‌ی شماره‌دار + خط رابط، بدون شدو.
// حالا در همه‌ی مراحل (از جمله تأیید نهایی) نمایش داده می‌شه.

const STEP_SHORT: Record<Step, string> = {
  service: 'خدمات', staff: 'پرسنل', schedule: 'زمان', confirm: 'تأیید',
};

function Breadcrumb({ currentIdx }: { currentIdx: number }) {
  return (
    <div className="flex items-start mb-7">
      {stepOrder.map((s, i) => {
        const isActive = i === currentIdx;
        const isDone = i < currentIdx;
        return (
          <div key={s} className={`flex items-center ${i < stepOrder.length - 1 ? 'flex-1' : ''}`}>
            <div className="flex flex-col items-center gap-1.5 shrink-0">
              <span
                className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 transition-colors ${
                  isActive
                    ? 'bg-[#824c71] text-white'
                    : isDone
                    ? 'bg-[#824c71]/10 text-[#824c71]'
                    : 'bg-zinc-100 text-zinc-400'
                }`}
              >
                {isDone ? <Check className="w-3.5 h-3.5" /> : toPersian(String(i + 1))}
              </span>
              <span
                className={`text-[10.5px] font-bold whitespace-nowrap ${
                  isActive ? 'text-[#824c71]' : isDone ? 'text-zinc-600' : 'text-zinc-400'
                }`}
              >
                {STEP_SHORT[s]}
              </span>
            </div>
            {i < stepOrder.length - 1 && (
              <div className={`flex-1 h-px mx-1.5 mb-4 transition-colors ${i < currentIdx ? 'bg-[#824c71]/25' : 'bg-zinc-100'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── کارت نوبتِ ثبت‌شده در سبد — تنها کارتی که شدو دارد، دقیقاً هم‌سبک با
// کارت صفحه‌ی «نوبت‌های من».
function CartItemCard({
  item,
  onRemove,
  onGoToConfirm,
}: {
  item: CartItem;
  onRemove: () => void;
  onGoToConfirm?: () => void;
}) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-[0_2px_14px_rgba(0,0,0,0.09)]">
      <div className="flex items-center justify-between gap-3 mb-4">
        <p className="text-[15px] font-bold text-zinc-900 truncate">{item.serviceName}</p>
        {item.price > 0 && (
          <span className="text-xs font-medium text-zinc-400 shrink-0">{toPersian(formatPrice(item.price))} تومان</span>
        )}
      </div>

      <div className="flex flex-col gap-1.5 mb-3">
        <div className="flex items-center gap-3 flex-wrap text-xs text-zinc-700">
          <span className="flex items-center gap-1.5 shrink-0">
            <span className="w-2 h-2 rounded-full bg-[#824c71] shrink-0" />
            <span className="font-bold whitespace-nowrap">
              {formatPersianDate(item.date)} - <span dir="ltr">{toPersian(item.startTime)}</span>
            </span>
          </span>
          <span className="flex items-center gap-1.5 min-w-0">
            <User className="w-3.5 h-3.5 text-[#824c71] shrink-0" strokeWidth={1.75} />
            <span className="font-bold truncate">{item.staffName}</span>
          </span>
        </div>
      </div>

      <div className="border-t border-zinc-100 pt-3 flex items-center justify-between">
        <span className="text-[11px] text-zinc-400 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {toPersian(formatDuration(item.durationMin))}
        </span>
        <div className="flex items-center gap-1">
          {onGoToConfirm && (
            <button
              onClick={onGoToConfirm}
              className="text-xs font-bold text-[#824c71] flex items-center gap-1 px-2 py-1"
            >
              تأیید و پرداخت
              <ArrowLeft className="w-3 h-3" />
            </button>
          )}
          <button
            onClick={onRemove}
            className="w-7 h-7 flex items-center justify-center rounded-full text-red-500 hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
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

  // true فقط وقتی که واقعاً کاربر رو به درگاه پرداخت فرستادیم؛ برای اینکه
  // بدونیم وقتی از مرورگرِ درگاه برگشت، باید به «نوبت‌های من» ببریمش تا
  // نتیجه‌ی پرداخت رو ببینه (بدون نیاز به لاگین دوباره — سشنِ اپ دست‌نخورده‌ست).
  const awaitingPaymentReturn = useRef(false);

  useOnBrowserReturn(() => {
    if (awaitingPaymentReturn.current) {
      awaitingPaymentReturn.current = false;
      router.push('/appointments');
    }
  });

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
    // اگه مشتری «تفاوتی ندارد» رو زده باشه، به‌جای همیشه اولین نفر لیست،
    // یکی از پرسنل‌های واقعاً آزاد توی همین اسلات رو رندوم انتخاب می‌کنیم
    // تا نوبت‌ها بین پرسنل به‌طور یکنواخت‌تر پخش بشه
    const randomAvailable = selectedSlot.availableStaff[
      Math.floor(Math.random() * selectedSlot.availableStaff.length)
    ];
    const staffId   = selectedStaffId ?? randomAvailable?.id ?? '';
    const staffName = selectedStaffId
      ? staffOptions.find((s) => s.id === selectedStaffId)?.name ?? ''
      : randomAvailable?.name ?? '—';
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
        awaitingPaymentReturn.current = true;
        await openPaymentUrl(payData.paymentUrl);
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
      <Loader2 className="w-6 h-6 text-[#824c71] animate-spin" />
    </div>
  );

  const { title, sub } = STEP_TITLES[step];

  return (
    <div className="min-h-screen bg-white" dir="rtl">
      <div className="max-w-md mx-auto px-5 pt-6 pb-32">

        {/* عنوان ثابت بالای صفحه — فاصله از بالای گوشی تا آیکون‌های استپ */}
        <p className="text-center text-xs font-bold text-zinc-400 mb-5">رزرو نوبت{salonName ? ` · ${salonName}` : ''}</p>

        {/* breadcrumb — همیشه نمایش داده می‌شه، از جمله مرحله‌ی تأیید نهایی */}
        <Breadcrumb currentIdx={currentIdx} />

        {/* عنوان مرحله */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-zinc-900">{title}</h1>
          <p className="text-xs text-zinc-400 mt-1">{sub}</p>
        </div>

        {/* ─── کارت نوبت‌های ثبت‌شده — در همه مراحل غیر از confirm ─── */}
        {cart.length > 0 && step !== 'confirm' && (
          <div className="mb-5 space-y-2.5">
            <p className="text-xs font-bold text-zinc-400 px-1">نوبت‌های ثبت‌شده</p>
            {cart.map((item, idx) => (
              <CartItemCard
                key={idx}
                item={item}
                onRemove={() => setCart((p) => p.filter((_, i) => i !== idx))}
                onGoToConfirm={() => setStep('confirm')}
              />
            ))}
          </div>
        )}

        {/* ─── مرحله ۱: خدمات — کارت‌ها به سبک دسته‌بندی صفحه‌ی اصلی، با آیکون تشخیصی ─── */}
        {step === 'service' && (
          <div className="space-y-2.5">
            {services.length === 0 ? (
              <p className="text-center text-zinc-400 text-sm py-16">خدماتی تعریف نشده</p>
            ) : services.map((svc) => {
              const Icon = getServiceIcon(svc.name);
              const isSelected = selectedService?.id === svc.id;
              return (
                <button
                  key={svc.id}
                  onClick={() => setSelectedService(svc)}
                  className={`w-full flex items-center gap-3.5 p-3.5 rounded-[10px] text-right transition-all active:scale-[0.99] ${
                    isSelected
                      ? 'bg-[#824c71]/[0.06] ring-1 ring-[#824c71]'
                      : 'bg-zinc-50 hover:bg-zinc-100'
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
                    <p className={`text-sm font-semibold ${isSelected ? 'text-[#824c71]' : 'text-zinc-900'}`}>
                      {svc.name}
                    </p>
                    <span className="text-[12px] text-zinc-400 flex items-center gap-1 mt-1">
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

        {/* ─── مرحله ۲: پرسنل — «تفاوتی ندارد» با آیکون گروه + جداکننده، نه بوردر خط‌چین ─── */}
        {step === 'staff' && selectedService && (
          <div>
            {isLoadingStaff ? (
              <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 text-[#824c71] animate-spin" /></div>
            ) : (
              <div className="space-y-2.5">
                {/* تفاوتی ندارد */}
                <button
                  onClick={() => setSelectedStaffId(null)}
                  className={`w-full flex items-center gap-3.5 p-3.5 rounded-[10px] text-right transition-all ${
                    selectedStaffId === null
                      ? 'bg-[#824c71]/[0.06] ring-1 ring-[#824c71]'
                      : 'bg-zinc-50 hover:bg-zinc-100'
                  }`}
                >
                  <span className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${
                    selectedStaffId === null ? 'bg-[#824c71]/15' : 'bg-zinc-200/70'
                  }`}>
                    <Users className={`w-5 h-5 ${selectedStaffId === null ? 'text-[#824c71]' : 'text-zinc-500'}`} strokeWidth={1.75} />
                  </span>
                  <p className={`flex-1 text-sm font-semibold text-right ${selectedStaffId === null ? 'text-[#824c71]' : 'text-zinc-900'}`}>
                    تفاوتی ندارد
                  </p>
                  {selectedStaffId === null && (
                    <span className="w-5 h-5 rounded-full bg-[#824c71] flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 text-white" />
                    </span>
                  )}
                </button>

                {staffOptions.length > 0 && (
                  <div className="flex items-center gap-2 py-1">
                    <div className="flex-1 h-px bg-zinc-100" />
                    <span className="text-[10px] text-zinc-400 shrink-0">یا انتخاب مستقیم</span>
                    <div className="flex-1 h-px bg-zinc-100" />
                  </div>
                )}

                {staffOptions.map((s) => {
                  const isSelected = selectedStaffId === s.id;
                  return (
                    <button
                      key={s.id}
                      onClick={() => setSelectedStaffId(s.id)}
                      className={`w-full flex items-center gap-3.5 p-3.5 rounded-[10px] text-right transition-all ${
                        isSelected
                          ? 'bg-[#824c71]/[0.06] ring-1 ring-[#824c71]'
                          : 'bg-zinc-50 hover:bg-zinc-100'
                      }`}
                    >
                      <span className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                        isSelected ? 'bg-[#824c71]/15 text-[#824c71]' : 'bg-[#824c71]/[0.08] text-[#824c71]/75'
                      }`}>
                        {s.name.slice(0, 1)}
                      </span>
                      <p className={`flex-1 text-sm font-semibold text-right ${isSelected ? 'text-[#824c71]' : 'text-zinc-900'}`}>
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
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">تاریخ</p>
            <PersianCalendar
              selectedDate={selectedDate}
              onSelectDate={(d) => { if (d !== selectedDate) setSelectedSlot(null); setSelectedDate(d); }}
              initialMonth={new DateObject({ calendar: persian, locale: persian_fa })}
              markers={closedMarkers}
            />

            {selectedDate && (
              <div className="mt-7">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">ساعت</p>
                  <span className="text-xs text-zinc-400">{formatPersianDate(selectedDate)}</span>
                </div>

                {isLoadingSlots ? (
                  <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 text-[#824c71] animate-spin" /></div>
                ) : slotsError ? (
                  <p className="text-center text-sm text-red-400 py-8">{slotsError}</p>
                ) : slots.length === 0 ? (
                  <div className="text-center py-10">
                    <p className="text-sm text-zinc-500 font-medium">ساعت آزادی در این روز وجود ندارد</p>
                    <p className="text-xs text-zinc-400 mt-1">تاریخ دیگری انتخاب کنید</p>
                  </div>
                ) : (
                  <>
                    {staffOptions.length > 1 && (
                      <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
                        <button
                          onClick={() => setSelectedStaffId(null)}
                          className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                            selectedStaffId === null
                              ? 'bg-[#824c71] text-white'
                              : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'
                          }`}
                        >
                          همه
                        </button>
                        {staffOptions.map((s) => (
                          <button
                            key={s.id}
                            onClick={() => setSelectedStaffId(s.id)}
                            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                              selectedStaffId === s.id
                                ? 'bg-[#824c71] text-white'
                                : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'
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
                          className={`py-2.5 rounded-[10px] text-sm font-medium transition-all ${
                            selectedSlot?.time === slot.time
                              ? 'bg-[#824c71] text-white'
                              : 'bg-zinc-50 text-zinc-700 hover:bg-zinc-100 hover:text-[#824c71]'
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
                <p className="text-zinc-400 text-sm">سبد رزرو خالی است</p>
                <button onClick={startNew} className="mt-4 text-sm text-[#824c71] font-bold underline underline-offset-2">
                  افزودن نوبت
                </button>
              </div>
            ) : (
              <>
                <div className="space-y-3 mb-6">
                  {cart.map((item, idx) => (
                    <CartItemCard
                      key={idx}
                      item={item}
                      onRemove={() => setCart((p) => p.filter((_, i) => i !== idx))}
                    />
                  ))}
                </div>

                <button
                  onClick={startNew}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-[10px] border-2 border-dashed border-zinc-200 text-sm text-zinc-500 font-medium hover:border-[#824c71]/40 hover:text-[#824c71] transition-all mb-6"
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
                  className="w-full bg-[#824c71] hover:bg-[#6d3f5e] text-white rounded-[10px] py-4 text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-60 transition-colors"
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

        {/* ─── نوار پایین: دکمه‌ی برگشت (آیکونی) + دکمه‌ی اصلی ادامه/افزودن ─── */}
        {step !== 'confirm' && (
          <div
            className="fixed bottom-0 left-0 right-0 bg-white border-t border-zinc-100 px-5 py-3.5 flex items-center gap-3"
            style={{ paddingBottom: 'calc(0.875rem + env(safe-area-inset-bottom, 0px))' }}
          >
            <button
              onClick={goBack}
              disabled={currentIdx === 0}
              aria-label="مرحله قبل"
              className={`w-12 h-12 shrink-0 flex items-center justify-center rounded-[10px] transition-colors ${
                currentIdx === 0
                  ? 'bg-zinc-50 text-zinc-300'
                  : 'bg-[#824c71]/10 text-[#824c71] hover:bg-[#824c71]/15'
              }`}
            >
              <ArrowRight className="w-5 h-5" />
            </button>

            {step === 'schedule' ? (
              <button
                onClick={addToCart}
                disabled={!selectedSlot}
                className="flex-1 h-12 rounded-[10px] bg-[#824c71] text-white text-sm font-bold flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:pointer-events-none hover:bg-[#6d3f5e] transition-colors"
              >
                افزودن و ادامه
                <ArrowLeft className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={goNext}
                disabled={!canGoNext}
                className="flex-1 h-12 rounded-[10px] bg-[#824c71] text-white text-sm font-bold flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:pointer-events-none hover:bg-[#6d3f5e] transition-colors"
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