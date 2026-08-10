// app/(dashboard)/salon/[id]/book/page.tsx
'use client';

import { useState, useEffect, use, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowRight, ArrowLeft, Loader2, CalendarClock, Clock, Check,
  ChevronLeft, Plus, Trash2, CreditCard, User, Shuffle, Scissors,
  CalendarX, AlertCircle, Wallet,
} from 'lucide-react';
import { DateObject } from 'react-multi-date-picker';
import PersianCalendar, { CalendarDayMarker } from '@/components/ui/PersianCalendar';
import persian from 'react-date-object/calendars/persian';
import persian_fa from 'react-date-object/locales/persian_fa';
import { toDateOnlyAnchor } from '@/lib/dateUtils';

// ─── Types ───────────────────────────────────────────────────────────────────

type BookingService = {
  id: string;
  name: string;
  durationMin: number;
  price: number;
  depositAmount: number | null;
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
  depositAmount: number | null;
  date: string;
  startTime: string;
  staffId: string;
  staffName: string;
};

type Step = 'service' | 'staff' | 'schedule' | 'confirm';

const STEP_LABELS: Record<Step, string> = {
  service:  'انتخاب خدمات',
  staff:    'انتخاب پرسنل',
  schedule: 'تاریخ و ساعت',
  confirm:  'تأیید و پرداخت',
};

const STEP_ICONS: Record<Step, React.ElementType> = {
  service: Scissors,
  staff: User,
  schedule: CalendarClock,
  confirm: CreditCard,
};

const stepOrder: Step[] = ['service', 'staff', 'schedule', 'confirm'];

const formatPrice = (n: number) => n.toLocaleString('fa-IR');
const toPersianDigits = (str: string) => str.replace(/[0-9]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);

const formatPersianDate = (dateStr: string) =>
  new DateObject({ date: new Date(dateStr), calendar: persian, locale: persian_fa })
    .format('D MMMM YYYY');

const formatDuration = (durationMin: number) => {
  const h = Math.floor(durationMin / 60);
  const m = durationMin % 60;
  return `${h > 0 ? `${h} ساعت ` : ''}${m > 0 ? `${m} دقیقه` : ''}`.trim();
};

const GREGORIAN_TO_PERSIAN_DAY: Record<number, string> = {
  6: 'شنبه', 0: 'یکشنبه', 1: 'دوشنبه',
  2: 'سه‌شنبه', 3: 'چهارشنبه', 4: 'پنجشنبه', 5: 'جمعه',
};

function buildClosedDayMarkers(closedDays: string[]): Record<string, CalendarDayMarker> {
  if (closedDays.length === 0) return {};
  const markers: Record<string, CalendarDayMarker> = {};
  const today = toDateOnlyAnchor(new Date());
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() + i);
    const name = GREGORIAN_TO_PERSIAN_DAY[d.getUTCDay()];
    if (closedDays.includes(name)) {
      markers[d.toISOString().slice(0, 10)] = { className: 'bg-red-50 text-red-400' };
    }
  }
  return markers;
}

// ─── Nav Bar ─────────────────────────────────────────────────────────────────

function StepNav({
  step,
  canGoBack,
  canGoNext,
  onBack,
  onNext,
}: {
  step: Step;
  canGoBack: boolean;
  canGoNext: boolean;
  onBack: () => void;
  onNext: () => void;
}) {
  const currentIdx = stepOrder.indexOf(step);

  return (
    <div className="flex items-center justify-between mb-6">
      {/* دکمه قبلی */}
      <button
        onClick={onBack}
        disabled={!canGoBack}
        className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all ${
          canGoBack
            ? 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 active:scale-95'
            : 'opacity-0 pointer-events-none'
        }`}
      >
        <ArrowRight className="w-4 h-4" />
        قبلی
      </button>

      {/* نشانگر مرحله */}
      <div className="flex items-center gap-1.5">
        {stepOrder.map((s, i) => (
          <div
            key={s}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === currentIdx
                ? 'w-7 bg-[#824c71]'
                : i < currentIdx
                ? 'w-3 bg-[#824c71]/50'
                : 'w-3 bg-zinc-200'
            }`}
          />
        ))}
      </div>

      {/* دکمه بعدی */}
      <button
        onClick={onNext}
        disabled={!canGoNext}
        className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all ${
          canGoNext
            ? 'bg-[#824c71] text-white hover:bg-[#6d3f5e] active:scale-95 shadow-sm shadow-[#824c71]/25'
            : 'opacity-0 pointer-events-none'
        }`}
      >
        بعدی
        <ArrowLeft className="w-4 h-4" />
      </button>
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
  const [loadServicesError, setLoadServicesError] = useState('');
  const [closedDays, setClosedDays] = useState<string[]>([]);

  const [step, setStep] = useState<Step>('service');
  const [selectedService, setSelectedService] = useState<BookingService | null>(null);

  const [staffOptions, setStaffOptions] = useState<StaffOption[]>([]);
  const [isLoadingStaffOptions, setIsLoadingStaffOptions] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [slotsError, setSlotsError] = useState('');
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // ── بارگذاری سالن ───────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const salonRes = await fetch(`/api/salon/${salonId}`);
        if (salonRes.ok) {
          const d = await salonRes.json();
          setSalonName(d.name);
          if (!d.bookingEnabled) { router.replace(`/salon/${salonId}`); return; }
        }

        const scheduleRes = await fetch(`/api/salon/schedule/public?salonId=${salonId}`);
        if (scheduleRes.ok) {
          const s = await scheduleRes.json();
          setClosedDays(s.closedDays ?? []);
        }

        const svcRes = await fetch(`/api/booking-services/public?salonId=${salonId}`);
        if (svcRes.ok) {
          const d = await svcRes.json();
          setServices(d.services ?? []);
        } else {
          setLoadServicesError('خطا در دریافت خدمات');
        }
      } catch {
        setLoadServicesError('خطای ارتباط با سرور');
      } finally {
        setIsLoadingSalon(false);
      }
    };
    load();
  }, [salonId, router]);

  // ── بارگذاری پرسنل ──────────────────────────────────────────────────────
  const loadStaffOptions = useCallback(async () => {
    if (!selectedService) return;
    setIsLoadingStaffOptions(true);
    try {
      const res = await fetch(
        `/api/booking-online/eligible-staff?salonId=${salonId}&serviceId=${selectedService.id}`
      );
      if (res.ok) setStaffOptions((await res.json()).staff ?? []);
    } finally {
      setIsLoadingStaffOptions(false);
    }
  }, [salonId, selectedService]);

  useEffect(() => {
    if (step === 'staff') loadStaffOptions();
  }, [step, loadStaffOptions]);

  // ── بارگذاری اسلات‌ها ───────────────────────────────────────────────────
  const loadSlots = useCallback(async () => {
    if (!selectedService || !selectedDate) return;
    setIsLoadingSlots(true);
    setSlotsError('');
    setSlots([]);
    setSelectedSlot(null);
    try {
      const qs = new URLSearchParams({
        salonId,
        serviceId: selectedService.id,
        date: selectedDate,
        ...(selectedStaffId ? { staffId: selectedStaffId } : {}),
      });
      const res = await fetch(`/api/booking-online/available-slots?${qs}`);
      if (res.ok) setSlots((await res.json()).slots ?? []);
      else setSlotsError('خطا در دریافت ساعت‌های آزاد');
    } catch {
      setSlotsError('خطای ارتباط با سرور');
    } finally {
      setIsLoadingSlots(false);
    }
  }, [salonId, selectedService, selectedDate, selectedStaffId]);

  useEffect(() => {
    if (step === 'schedule' && selectedDate) loadSlots();
  }, [step, selectedDate, loadSlots]);

  // وقتی پرسنل تغییر می‌کند و در مرحله schedule هستیم، اسلات‌ها reload می‌شن
  useEffect(() => {
    if (step === 'schedule' && selectedDate) loadSlots();
  }, [selectedStaffId]); // eslint-disable-line

  // ── منطق ناوبری قبل/بعد ─────────────────────────────────────────────────
  const currentIdx = stepOrder.indexOf(step);

  // آیا می‌توان به مرحله بعد رفت؟
  const canGoNext = useMemo(() => {
    if (step === 'service') return !!selectedService;
    if (step === 'staff')   return true; // انتخاب پرسنل همیشه اختیاریه
    if (step === 'schedule') return !!selectedSlot;
    return false; // در confirm دکمه بعدی نداریم
  }, [step, selectedService, selectedSlot]);

  const canGoBack = currentIdx > 0;

  const goBack = () => {
    const prev = stepOrder[currentIdx - 1];
    if (!prev) return;

    // reset کردن state های مرحله‌های بعدی از جایی که برمی‌گردیم
    if (prev === 'service') {
      // برمی‌گردیم به انتخاب خدمات → همه چیز reset
      setSelectedService(null);
      setSelectedStaffId(null);
      setSelectedDate(null);
      setSlots([]);
      setSelectedSlot(null);
    } else if (prev === 'staff') {
      // برمی‌گردیم به انتخاب پرسنل → تاریخ و ساعت reset
      setSelectedDate(null);
      setSlots([]);
      setSelectedSlot(null);
    } else if (prev === 'schedule') {
      // برمی‌گردیم به تاریخ/ساعت → فقط اسلات انتخابی reset
      setSelectedSlot(null);
    }

    setStep(prev);
  };

  const goNext = () => {
    const next = stepOrder[currentIdx + 1];
    if (!next || !canGoNext) return;
    setStep(next);
  };

  // ── اکشن‌های انتخاب ─────────────────────────────────────────────────────
  const startNewBookingFlow = () => {
    setSelectedService(null);
    setSelectedStaffId(null);
    setSelectedDate(null);
    setSlots([]);
    setSelectedSlot(null);
    setStep('service');
  };

  const selectService = (svc: BookingService) => {
    setSelectedService(svc);
    setSelectedStaffId(null);
    setSelectedDate(null);
    setSlots([]);
    setSelectedSlot(null);
    setStep('staff');
  };

  const selectDate = (dateStr: string) => {
    // اگه تاریخ عوض شد، اسلات قبلی reset
    if (dateStr !== selectedDate) {
      setSelectedSlot(null);
    }
    setSelectedDate(dateStr);
  };

  const addToCart = () => {
    if (!selectedService || !selectedDate || !selectedSlot) return;

    const finalStaffId   = selectedStaffId ?? selectedSlot.availableStaff[0]?.id ?? '';
    const finalStaffName = selectedStaffId
      ? staffOptions.find((s) => s.id === selectedStaffId)?.name ?? ''
      : selectedSlot.availableStaff[0]?.name ?? 'انتخاب خودکار';

    setCart((prev) => [
      ...prev,
      {
        serviceId:     selectedService.id,
        serviceName:   selectedService.name,
        durationMin:   selectedService.durationMin,
        price:         selectedService.price,
        depositAmount: selectedService.depositAmount,
        date:          selectedDate,
        startTime:     selectedSlot.time,
        staffId:       finalStaffId,
        staffName:     finalStaffName,
      },
    ]);

    // بعد از افزودن به سبد → صفحه تأیید
    startNewBookingFlow();
    setStep('confirm');
  };

  const removeFromCart = (idx: number) => {
    setCart((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (cart.length === 0) return;
    setIsSubmitting(true);
    setSubmitError('');
    try {
      const res = await fetch('/api/booking-online/reserve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          salonId,
          items: cart.map((item) => ({
            serviceId: item.serviceId,
            staffId:   item.staffId || undefined,
            date:      item.date,
            startTime: item.startTime,
          })),
        }),
      });
      const data = await res.json();

      if (!res.ok) { setSubmitError(data.error || 'خطا در ثبت نوبت'); return; }

      const groupId = data.group?.id;
      const totalAmount = data.group?.totalAmount ?? 0;

      if (groupId && totalAmount > 0) {
        const payRes = await fetch(`/api/booking-group/${groupId}/pay`, { method: 'POST' });
        const payData = await payRes.json();
        if (payData.paymentUrl) { window.location.href = payData.paymentUrl; return; }
        setSubmitError(payData.error || 'خطا در اتصال به درگاه پرداخت');
        return;
      }

      router.push('/appointments?bookingSuccess=1');
    } catch {
      setSubmitError('خطای ارتباط با سرور');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── محاسبه ──────────────────────────────────────────────────────────────
  const totalDeposit = cart.reduce((acc, c) => acc + (c.depositAmount ?? 0), 0);
  const appFee       = cart.length > 0 ? 20000 : 0;
  const totalPayable = totalDeposit + appFee;
  const closedDayMarkers = useMemo(() => buildClosedDayMarkers(closedDays), [closedDays]);

  // ── Render ───────────────────────────────────────────────────────────────
  if (isLoadingSalon) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 text-[#824c71] animate-spin mb-4" />
      </div>
    );
  }

  const StepIcon = STEP_ICONS[step];

  return (
    <div className="max-w-lg mx-auto pt-6 pb-32 px-4">
      {/* هدر */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href={`/salon/${salonId}`}
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-zinc-200 text-zinc-600 shrink-0 shadow-sm shadow-zinc-200/60 hover:bg-zinc-50 transition-colors"
        >
          <ArrowRight className="w-4 h-4" />
        </Link>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#824c71] to-[#6d3f5e] flex items-center justify-center shrink-0 shadow-md shadow-[#824c71]/25">
            <CalendarClock className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-zinc-900 truncate">نوبت‌دهی آنلاین</h1>
            <p className="text-xs text-zinc-500 truncate">{salonName}</p>
          </div>
        </div>
      </div>

      {/* ناوبری قبل/بعد + نشانگر مرحله */}
      {step !== 'confirm' && (
        <StepNav
          step={step}
          canGoBack={canGoBack && step !== 'service'}
          canGoNext={canGoNext && step !== 'schedule'}
          onBack={goBack}
          onNext={goNext}
        />
      )}

      {/* عنوان مرحله */}
      <div className="flex items-center gap-2.5 mb-5">
        <div className="w-8 h-8 rounded-lg bg-[#824c71]/10 flex items-center justify-center shrink-0">
          <StepIcon className="w-4 h-4 text-[#824c71]" />
        </div>
        <p className="text-sm font-bold text-zinc-800">{STEP_LABELS[step]}</p>
      </div>

      {/* سبد رزرو — بالای صفحه در مراحل غیر confirm */}
      {cart.length > 0 && step !== 'confirm' && (
        <div className="bg-white border border-[#824c71]/25 rounded-2xl p-4 mb-5 shadow-sm shadow-[#824c71]/10">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-[#824c71] text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                {cart.length.toLocaleString('fa-IR')}
              </div>
              <p className="text-xs font-bold text-zinc-700">سبد رزرو</p>
            </div>
            <button
              onClick={() => setStep('confirm')}
              className="text-[11px] font-bold text-white bg-[#824c71] px-3 py-1.5 rounded-lg hover:bg-[#6d3f5e] transition-colors"
            >
              تأیید و پرداخت
            </button>
          </div>
          <div className="space-y-2">
            {cart.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between gap-2 text-xs bg-zinc-50 rounded-xl px-3 py-2.5">
                <div className="flex-1 min-w-0">
                  <span className="font-bold text-zinc-800">{item.serviceName}</span>
                  <span className="text-zinc-400 mr-1">·</span>
                  <span className="text-zinc-500">
                    {formatPersianDate(item.date)} ساعت {toPersianDigits(item.startTime)}
                  </span>
                </div>
                <button onClick={() => removeFromCart(idx)} className="w-6 h-6 rounded-lg bg-red-50 text-red-400 flex items-center justify-center shrink-0 hover:bg-red-100 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── مرحله ۱: انتخاب خدمات ─── */}
      {step === 'service' && (
        <div>
          {loadServicesError ? (
            <div className="text-center py-14 bg-red-50 rounded-2xl border border-red-100">
              <AlertCircle className="w-8 h-8 text-red-300 mx-auto mb-2.5" />
              <p className="text-red-500 text-sm font-medium">{loadServicesError}</p>
            </div>
          ) : services.length === 0 ? (
            <div className="text-center py-14 bg-zinc-50 rounded-2xl border border-zinc-100">
              <Scissors className="w-8 h-8 text-zinc-300 mx-auto mb-2.5" />
              <p className="text-zinc-500 text-sm font-medium">خدماتی برای نوبت‌دهی تعریف نشده</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {services.map((svc) => {
                const isSelected = selectedService?.id === svc.id;
                return (
                  <button
                    key={svc.id}
                    onClick={() => selectService(svc)}
                    className={`w-full flex items-center gap-3.5 bg-white border rounded-2xl p-4 text-right transition-all active:scale-[0.99] ${
                      isSelected
                        ? 'border-[#824c71] shadow-md shadow-[#824c71]/10'
                        : 'border-zinc-100 shadow-sm shadow-zinc-200/50 hover:border-zinc-200 hover:shadow-md hover:shadow-zinc-200/60'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                      isSelected ? 'bg-[#824c71] text-white' : 'bg-[#824c71]/10 text-[#824c71]'
                    }`}>
                      <Scissors className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-zinc-900">{svc.name}</p>
                        {isSelected && <Check className="w-4 h-4 text-[#824c71] shrink-0" />}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-[12px] text-zinc-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDuration(svc.durationMin)}
                        </span>
                        {svc.price > 0 && <span className="font-medium text-zinc-600">{formatPrice(svc.price)} تومان</span>}
                      </div>
                      {svc.depositAmount != null && svc.depositAmount > 0 ? (
                        <p className="text-[11px] text-[#824c71] mt-1.5 font-bold bg-[#824c71]/5 inline-block px-2 py-0.5 rounded-md">
                          بیعانه: {formatPrice(svc.depositAmount)} تومان
                        </p>
                      ) : (
                        <p className="text-[11px] text-emerald-600 mt-1.5 font-bold bg-emerald-50 inline-block px-2 py-0.5 rounded-md">بدون بیعانه</p>
                      )}
                    </div>
                    <ChevronLeft className="w-4 h-4 text-zinc-300 shrink-0" />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── مرحله ۲: انتخاب پرسنل ─── */}
      {step === 'staff' && selectedService && (
        <div>
          {/* خلاصه خدمت انتخابی */}
          <div className="bg-[#824c71]/[0.04] border border-[#824c71]/15 rounded-2xl p-3.5 mb-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-sm shadow-zinc-200/60">
              <Scissors className="w-4.5 h-4.5 text-[#824c71]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-zinc-900">{selectedService.name}</p>
              <p className="text-[11px] text-zinc-400 mt-0.5">{formatDuration(selectedService.durationMin)}</p>
            </div>
            {selectedService.price > 0 && (
              <span className="text-xs font-bold text-[#824c71] shrink-0">{formatPrice(selectedService.price)} تومان</span>
            )}
          </div>

          {isLoadingStaffOptions ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-7 h-7 text-[#824c71] animate-spin" />
            </div>
          ) : (
            <div className="space-y-2.5">
              {/* گزینه تفاوتی ندارد */}
              <button
                onClick={() => setSelectedStaffId(null)}
                className={`w-full flex items-center gap-3 bg-white border rounded-2xl p-4 text-right transition-all ${
                  selectedStaffId === null
                    ? 'border-[#824c71] shadow-md shadow-[#824c71]/10'
                    : 'border-zinc-100 shadow-sm shadow-zinc-200/50 hover:border-zinc-200'
                }`}
              >
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#824c71] to-[#6d3f5e] flex items-center justify-center shrink-0 shadow-sm shadow-[#824c71]/20">
                  <Shuffle className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 text-right">
                  <p className="text-sm font-bold text-zinc-900">تفاوتی ندارد</p>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    ساعت‌های آزاد همه‌ی پرسنل نمایش داده می‌شود
                  </p>
                </div>
                {selectedStaffId === null && <Check className="w-4 h-4 text-[#824c71] shrink-0" />}
              </button>

              {staffOptions.map((s) => {
                const isSelected = selectedStaffId === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => setSelectedStaffId(s.id)}
                    className={`w-full flex items-center gap-3 bg-white border rounded-2xl p-4 text-right transition-all ${
                      isSelected
                        ? 'border-[#824c71] shadow-md shadow-[#824c71]/10'
                        : 'border-zinc-100 shadow-sm shadow-zinc-200/50 hover:border-zinc-200'
                    }`}
                  >
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition-colors ${
                      isSelected ? 'bg-[#824c71] text-white' : 'bg-[#824c71]/10 text-[#824c71]'
                    }`}>
                      {s.name.slice(0, 1)}
                    </div>
                    <div className="flex-1 text-right">
                      <p className="text-sm font-bold text-zinc-900">{s.name}</p>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-[#824c71] shrink-0" />}
                  </button>
                );
              })}

              {staffOptions.length === 0 && (
                <div className="text-center py-6 bg-zinc-50 rounded-2xl border border-zinc-100">
                  <p className="text-xs text-zinc-400">
                    پرسنل مشخصی ثبت نشده — با «تفاوتی ندارد» ادامه دهید
                  </p>
                </div>
              )}

              {/* دکمه ادامه در پایین مرحله پرسنل */}
              <button
                onClick={goNext}
                className="w-full bg-[#824c71] text-white rounded-xl py-3.5 text-sm font-bold mt-2 hover:bg-[#6d3f5e] transition-colors shadow-sm shadow-[#824c71]/25"
              >
                ادامه
              </button>
            </div>
          )}
        </div>
      )}

      {/* ─── مرحله ۳: تاریخ + ساعت ─── */}
      {step === 'schedule' && selectedService && (
        <div>
          {/* خلاصه انتخاب‌های قبلی */}
          <div className="bg-[#824c71]/[0.04] border border-[#824c71]/15 rounded-2xl p-3.5 mb-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-sm shadow-zinc-200/60">
              <Scissors className="w-4.5 h-4.5 text-[#824c71]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-zinc-900">{selectedService.name}</p>
              <p className="text-[11px] text-zinc-400 mt-0.5 flex items-center gap-1">
                <User className="w-3 h-3" />
                {selectedStaffId
                  ? staffOptions.find((s) => s.id === selectedStaffId)?.name
                  : 'تفاوتی ندارد'}
              </p>
            </div>
            {selectedService.price > 0 && (
              <span className="text-xs font-bold text-[#824c71] shrink-0">{formatPrice(selectedService.price)} تومان</span>
            )}
          </div>

          {/* تقویم */}
          <div className="bg-white border border-zinc-100 rounded-2xl p-3.5 shadow-sm shadow-zinc-200/50">
            <p className="text-sm font-bold text-zinc-800 mb-3">چه روزی؟</p>
            <PersianCalendar
              selectedDate={selectedDate}
              onSelectDate={selectDate}
              initialMonth={new DateObject({ calendar: persian, locale: persian_fa })}
              markers={closedDayMarkers}
            />
          </div>

          {closedDays.length > 0 && (
            <div className="flex items-center gap-1.5 mt-3 px-1 text-[11px] text-zinc-500">
              <span className="w-3 h-3 rounded-md bg-red-50 border border-red-200" />
              روزهای تعطیل سالن
            </div>
          )}

          {/* ساعت‌های آزاد */}
          {selectedDate && (
            <div className="mt-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-bold text-zinc-800">ساعت‌های آزاد</p>
                <span className="text-xs text-zinc-500 bg-zinc-100 px-2.5 py-1 rounded-lg font-medium">{formatPersianDate(selectedDate)}</span>
              </div>

              {isLoadingSlots ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-7 h-7 text-[#824c71] animate-spin" />
                </div>
              ) : slotsError ? (
                <div className="text-center py-10 bg-red-50 rounded-2xl border border-red-100">
                  <AlertCircle className="w-7 h-7 text-red-300 mx-auto mb-2" />
                  <p className="text-red-500 text-sm font-medium">{slotsError}</p>
                </div>
              ) : slots.length === 0 ? (
                <div className="text-center py-10 bg-zinc-50 rounded-2xl border border-zinc-100">
                  <CalendarX className="w-7 h-7 text-zinc-300 mx-auto mb-2" />
                  <p className="text-zinc-500 text-sm font-medium">ساعت آزادی در این روز وجود ندارد</p>
                  <p className="text-zinc-400 text-xs mt-1">تاریخ دیگری انتخاب کنید</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-2.5">
                    {slots.map((slot) => {
                      const isSelected = selectedSlot?.time === slot.time;
                      return (
                        <button
                          key={slot.time}
                          onClick={() => setSelectedSlot(slot)}
                          className={`py-3 rounded-xl text-sm font-bold border transition-all ${
                            isSelected
                              ? 'bg-[#824c71] text-white border-[#824c71] shadow-md shadow-[#824c71]/25'
                              : 'bg-white text-zinc-700 border-zinc-100 shadow-sm shadow-zinc-200/40 hover:border-[#824c71]/30 hover:bg-[#824c71]/[0.03]'
                          }`}
                        >
                          {toPersianDigits(slot.time)}
                        </button>
                      );
                    })}
                  </div>

                  {selectedSlot && (
                    <button
                      onClick={addToCart}
                      className="w-full mt-5 bg-[#824c71] text-white rounded-xl py-3.5 text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-[#824c71]/25 hover:bg-[#6d3f5e] transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      افزودن به سبد رزرو
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─── مرحله ۴: تأیید و پرداخت ─── */}
      {step === 'confirm' && (
        <div>
          {cart.length === 0 ? (
            <div className="text-center py-14 bg-zinc-50 rounded-2xl border border-zinc-100">
              <CalendarX className="w-8 h-8 text-zinc-300 mx-auto mb-2.5" />
              <p className="text-zinc-400 text-sm font-medium">سبد رزرو خالی است</p>
              <button
                onClick={startNewBookingFlow}
                className="mt-3 text-[#824c71] text-xs font-bold underline underline-offset-2"
              >
                افزودن نوبت
              </button>
            </div>
          ) : (
            <>
              <div className="space-y-3 mb-5">
                {cart.map((item, idx) => (
                  <div key={idx} className="bg-white border border-zinc-100 rounded-2xl p-4 shadow-sm shadow-zinc-200/50">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-[#824c71]/10 flex items-center justify-center shrink-0">
                        <Scissors className="w-4.5 h-4.5 text-[#824c71]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-zinc-900">{item.serviceName}</p>
                        <p className="text-[11px] text-zinc-400 mt-0.5 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDuration(item.durationMin)}
                        </p>
                      </div>
                      <button
                        onClick={() => removeFromCart(idx)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-50 text-red-400 shrink-0 hover:bg-red-100 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="space-y-1.5 text-[12px] text-zinc-500 bg-zinc-50 rounded-xl p-2.5">
                      <div className="flex items-center gap-2">
                        <CalendarClock className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        <span>
                          {formatPersianDate(item.date)} — ساعت {toPersianDigits(item.startTime)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        <span>{item.staffName}</span>
                      </div>
                    </div>

                    {item.depositAmount != null && item.depositAmount > 0 && (
                      <div className="mt-3 pt-3 border-t border-zinc-100 flex items-center justify-between text-[12px]">
                        <span className="text-zinc-500">بیعانه</span>
                        <span className="font-bold text-[#824c71]">{formatPrice(item.depositAmount)} تومان</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <button
                onClick={startNewBookingFlow}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-zinc-200 text-zinc-500 text-sm font-bold mb-5 hover:border-[#824c71]/30 hover:text-[#824c71] hover:bg-[#824c71]/[0.02] transition-colors"
              >
                <Plus className="w-4 h-4" />
                افزودن نوبت دیگر
              </button>

              {/* خلاصه مالی */}
              <div className="bg-white border border-zinc-100 rounded-2xl p-4 mb-5 shadow-sm shadow-zinc-200/50">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg bg-[#824c71]/10 flex items-center justify-center shrink-0">
                    <Wallet className="w-3.5 h-3.5 text-[#824c71]" />
                  </div>
                  <p className="text-xs font-bold text-zinc-700">خلاصه پرداخت</p>
                </div>
                <div className="space-y-2 text-[13px]">
                  {totalDeposit > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500">جمع بیعانه‌ها</span>
                      <span className="font-medium text-zinc-800">{formatPrice(totalDeposit)} تومان</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">هزینه خدمات پلتفرم</span>
                    <span className="font-medium text-zinc-800">{formatPrice(appFee)} تومان</span>
                  </div>
                  <div className="flex items-center justify-between pt-2.5 border-t border-zinc-100">
                    <span className="font-bold text-zinc-800">مبلغ قابل پرداخت</span>
                    <span className="font-bold text-[#824c71] text-base">{formatPrice(totalPayable)} تومان</span>
                  </div>
                </div>
              </div>

              {submitError && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-3.5 py-2.5 mb-4">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <p className="text-red-500 text-xs font-medium">{submitError}</p>
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full bg-[#824c71] text-white rounded-xl py-4 text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-[#824c71]/25 hover:bg-[#6d3f5e] transition-colors disabled:opacity-60"
              >
                {isSubmitting
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> در حال ثبت...</>
                  : totalPayable > 0
                  ? <><CreditCard className="w-4 h-4" /> پرداخت و ثبت نوبت</>
                  : <><Check className="w-4 h-4" /> ثبت نوبت</>
                }
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}