// app/(dashboard)/salon/[id]/book/page.tsx
'use client';

import { useState, useEffect, use, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowRight, ArrowLeft, Loader2, CalendarClock, Clock,
  Check, Plus, Trash2, CreditCard, User,
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
  staff:    { title: 'توسط چه کسی؟', sub: 'اختیاری — می‌توانید رد کنید' },
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

// ─── Breadcrumb ───────────────────────────────────────────────────────────────

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
              ? 'bg-[#824c71]/8 text-[#824c71] font-bold'
              : i < currentIdx
              ? 'text-zinc-400'
              : 'text-zinc-300'
          }`}>
            {i < currentIdx
              ? <Check className="w-3 h-3 text-[#824c71]/60 shrink-0" />
              : <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] shrink-0 ${
                  i === currentIdx ? 'bg-[#824c71] text-white' : 'bg-zinc-100 text-zinc-400'
                }`}>{toPersian(String(i + 1))}</span>
            }
            {STEP_SHORT[s]}
          </div>
          {i < stepOrder.length - 1 && (
            <div className={`w-4 h-px ${i < currentIdx ? 'bg-[#824c71]/20' : 'bg-zinc-100'}`} />
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
        fetch(`/api/salon/schedule?salonId=${salonId}`),
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
        if (d.weeklySchedule) {
          const closed = Object.entries(d.weeklySchedule)
            .filter(([, v]: [string, any]) => !v.open)
            .map(([day]) => day);
          setClosedWeekDays(closed);
        }
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
    setIsSubmitting(true); setSubmitError('');
    try {
      const results = await Promise.all(
        cart.map((item) => fetch('/api/booking-online/reserve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ salonId, serviceId: item.serviceId, staffId: item.staffId || undefined, date: item.date, startTime: item.startTime }),
        }).then((r) => r.json()))
      );
      const failed = results.find((r) => r.error);
      if (failed) { setSubmitError(failed.error); return; }
      router.push('/appointments?bookingSuccess=1');
    } catch { setSubmitError('خطای ارتباط با سرور'); }
    finally { setIsSubmitting(false); }
  };

  const appFee       = cart.length > 0 ? 20000 : 0;
  const totalPayable = appFee;
  const closedMarkers = useMemo(() => buildClosedDayMarkers(closedWeekDays), [closedWeekDays]);

  // ── Render ───────────────────────────────────────────────────────────────
  if (isLoadingSalon) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <Loader2 className="w-6 h-6 text-zinc-300 animate-spin" />
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
            className="flex items-center gap-1 text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
            بازگشت
          </Link>
        </div>

        {/* breadcrumb */}
        {step !== 'confirm' && <Breadcrumb step={step} currentIdx={currentIdx} />}

        {/* عنوان مرحله */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-zinc-900">{title}</h1>
          <p className="text-xs text-zinc-400 mt-1">{sub}</p>
        </div>

        {/* ─── کارت نوبت‌های ثبت‌شده — در همه مراحل غیر از confirm ─── */}
        {cart.length > 0 && step !== 'confirm' && (
          <div className="mb-5 space-y-2">
            <p className="text-xs font-bold text-zinc-400 px-1">نوبت‌های ثبت‌شده</p>
            {cart.map((item, idx) => (
              <div key={idx} className="bg-zinc-50 border border-zinc-100 rounded-2xl p-4">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <p className="text-sm font-bold text-zinc-900">{item.serviceName}</p>
                    <p className="text-[11px] text-zinc-400 mt-0.5 flex items-center gap-1">
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
                  <span className="flex items-center gap-1 bg-white rounded-lg px-2.5 py-1.5 border border-zinc-100 text-[11px] text-zinc-500">
                    <CalendarClock className="w-3.5 h-3.5 text-[#824c71]/60" />
                    {formatPersianDate(item.date)} — {toPersian(item.startTime)}
                  </span>
                  <span className="flex items-center gap-1 bg-white rounded-lg px-2.5 py-1.5 border border-zinc-100 text-[11px] text-zinc-500">
                    <User className="w-3.5 h-3.5 text-zinc-300" />
                    {item.staffName}
                  </span>
                </div>
                <div className="mt-3 pt-3 border-t border-zinc-100 flex justify-end">
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

        {/* ─── مرحله ۱: خدمات ─── */}
        {step === 'service' && (
          <div className="space-y-2">
            {services.length === 0 ? (
              <p className="text-center text-zinc-400 text-sm py-16">خدماتی تعریف نشده</p>
            ) : services.map((svc) => (
              <button
                key={svc.id}
                onClick={() => setSelectedService(svc)}
                className={`w-full flex items-center justify-between gap-4 p-4 rounded-2xl border text-right transition-all active:scale-[0.99] ${
                  selectedService?.id === svc.id
                    ? 'border-[#824c71]/40 bg-[#824c71]/5'
                    : 'border-zinc-100 hover:border-zinc-200 bg-white'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-zinc-900">{svc.name}</p>
                  <span className="text-[12px] text-zinc-400 flex items-center gap-1 mt-1">
                    <Clock className="w-3 h-3" />
                    {toPersian(formatDuration(svc.durationMin))}
                  </span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {svc.price > 0 && (
                    <span className="text-sm font-bold text-[#824c71]">
                      {toPersian(formatPrice(svc.price))} تومان
                    </span>
                  )}
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                    selectedService?.id === svc.id ? 'bg-[#824c71] border-[#824c71]' : 'border-zinc-200'
                  }`}>
                    {selectedService?.id === svc.id && <Check className="w-3 h-3 text-white" />}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* ─── مرحله ۲: پرسنل ─── */}
        {step === 'staff' && selectedService && (
          <div>
            {/* خلاصه خدمت */}
            {isLoadingStaff ? (
              <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 text-zinc-300 animate-spin" /></div>
            ) : (
              <div className="space-y-2">
                {/* تفاوتی ندارد */}
                <button
                  onClick={() => setSelectedStaffId(null)}
                  className={`w-full flex items-center gap-3 p-4 rounded-2xl border text-right transition-all ${
                    selectedStaffId === null
                      ? 'border-[#824c71]/40 bg-[#824c71]/5'
                      : 'border-zinc-100 hover:border-zinc-200 bg-white'
                  }`}
                >
                  <div className="w-9 h-9 rounded-full bg-zinc-100 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-zinc-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-zinc-800">تفاوتی ندارد</p>
                    <p className="text-[11px] text-zinc-400 mt-0.5">اولین پرسنل آزاد انتخاب می‌شود</p>
                  </div>
                  {selectedStaffId === null && <Check className="w-4 h-4 text-[#824c71] shrink-0" />}
                </button>

                {staffOptions.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedStaffId(s.id)}
                    className={`w-full flex items-center gap-3 p-4 rounded-2xl border text-right transition-all ${
                      selectedStaffId === s.id
                        ? 'border-[#824c71]/40 bg-[#824c71]/5'
                        : 'border-zinc-100 hover:border-zinc-200 bg-white'
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                      selectedStaffId === s.id ? 'bg-[#824c71]/10 text-[#824c71]' : 'bg-zinc-100 text-zinc-500'
                    }`}>
                      {s.name.slice(0, 1)}
                    </div>
                    <p className="flex-1 text-sm font-semibold text-zinc-800 text-right">{s.name}</p>
                    {selectedStaffId === s.id && <Check className="w-4 h-4 text-[#824c71] shrink-0" />}
                  </button>
                ))}

              </div>
            )}
          </div>
        )}

        {/* ─── مرحله ۳: تاریخ + ساعت ─── */}
        {step === 'schedule' && selectedService && (
          <div>
            {/* تقویم */}
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">تاریخ</p>
            <PersianCalendar
              selectedDate={selectedDate}
              onSelectDate={(d) => { if (d !== selectedDate) setSelectedSlot(null); setSelectedDate(d); }}
              initialMonth={new DateObject({ calendar: persian, locale: persian_fa })}
              markers={closedMarkers}
            />

            {/* ساعت‌ها */}
            {selectedDate && (
              <div className="mt-7">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">ساعت</p>
                  <span className="text-xs text-zinc-400">{formatPersianDate(selectedDate)}</span>
                </div>

                {isLoadingSlots ? (
                  <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 text-zinc-300 animate-spin" /></div>
                ) : slotsError ? (
                  <p className="text-center text-sm text-red-400 py-8">{slotsError}</p>
                ) : slots.length === 0 ? (
                  <div className="text-center py-10">
                    <p className="text-sm text-zinc-500 font-medium">ساعت آزادی در این روز وجود ندارد</p>
                    <p className="text-xs text-zinc-400 mt-1">تاریخ دیگری انتخاب کنید</p>
                  </div>
                ) : (
                  <>
                    {/* انتخاب پرسنل از روی اسلات‌ها */}
                    {staffOptions.length > 1 && (
                      <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
                        <button
                          onClick={() => setSelectedStaffId(null)}
                          className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                            selectedStaffId === null
                              ? 'border-[#824c71] bg-[#824c71] text-white'
                              : 'border-zinc-200 text-zinc-500 hover:border-zinc-300'
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
                                : 'border-zinc-200 text-zinc-500 hover:border-zinc-300'
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
                              : 'bg-white text-zinc-700 border-zinc-100 hover:border-[#824c71]/20 hover:text-[#824c71]'
                          }`}
                          dir="ltr"
                        >
                          {toPersian(slot.time)}
                        </button>
                      ))}
                    </div>

                    {selectedSlot && (
                      <div className="h-6" /> // فضا برای دکمه پایین صفحه
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
                <button onClick={startNew} className="mt-4 text-sm text-zinc-700 underline underline-offset-2">
                  افزودن نوبت
                </button>
              </div>
            ) : (
              <>
                {/* کارت‌های نوبت */}
                <div className="space-y-3 mb-6">
                  {cart.map((item, idx) => (
                    <div key={idx} className="bg-zinc-50 rounded-2xl p-4 border border-zinc-100">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div>
                          <p className="text-sm font-bold text-zinc-900">{item.serviceName}</p>
                          <p className="text-xs text-zinc-400 mt-0.5 flex items-center gap-1">
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
                        <span className="flex items-center gap-1 text-[11px] text-zinc-500 bg-white rounded-lg px-2.5 py-1.5 border border-zinc-100">
                          <CalendarClock className="w-3.5 h-3.5 text-[#824c71]/60" />
                          {formatPersianDate(item.date)} — {toPersian(item.startTime)}
                        </span>
                        <span className="flex items-center gap-1 text-[11px] text-zinc-500 bg-white rounded-lg px-2.5 py-1.5 border border-zinc-100">
                          <User className="w-3.5 h-3.5 text-zinc-300" />
                          {item.staffName}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* افزودن نوبت دیگر */}
                <button
                  onClick={startNew}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-dashed border-zinc-200 text-sm text-zinc-400 hover:text-zinc-600 hover:border-zinc-300 transition-all mb-6"
                >
                  <Plus className="w-4 h-4" />
                  افزودن نوبت دیگر
                </button>

                {/* خلاصه مالی */}
                <div className="border border-zinc-100 rounded-2xl p-4 mb-6">
                  <div className="flex justify-between text-sm mb-3">
                    <span className="text-zinc-400">کارمزد پلتفرم</span>
                    <span className="text-zinc-700">{formatPrice(appFee)} تومان</span>
                  </div>
                  <div className="flex justify-between text-base font-bold pt-3 border-t border-zinc-100">
                    <span className="text-zinc-900">مبلغ قابل پرداخت</span>
                    <span className="text-zinc-900">{formatPrice(totalPayable)} تومان</span>
                  </div>
                </div>

                {submitError && (
                  <p className="text-center text-xs text-red-400 mb-4">{submitError}</p>
                )}

                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="w-full bg-[#824c71] text-white rounded-2xl py-4 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
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

        {/* ناوبری قبل/ادامه — پایین صفحه */}
        {step !== 'confirm' && (
          <div
            className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md px-5 py-3.5 flex items-center justify-between"
            style={{ paddingBottom: 'calc(0.875rem + env(safe-area-inset-bottom, 0px))' }}
          >
            {/* قبلی */}
            <button
              onClick={goBack}
              disabled={currentIdx === 0}
              className={`flex items-center gap-1.5 text-sm font-medium transition-colors px-3 py-2 rounded-xl ${
                currentIdx === 0
                  ? 'text-zinc-200 pointer-events-none'
                  : 'text-zinc-600 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200'
              }`}
            >
              <ArrowRight className="w-4 h-4" />
              قبلی
            </button>

            {/* ادامه */}
            {step === 'schedule' ? (
              // در مرحله schedule، ادامه = افزودن به سبد
              <button
                onClick={addToCart}
                disabled={!selectedSlot}
                className={`flex items-center gap-1.5 text-sm font-bold px-5 py-2.5 rounded-xl transition-all ${
                  selectedSlot
                    ? 'bg-[#824c71] text-white'
                    : 'bg-zinc-100 text-zinc-300 pointer-events-none'
                }`}
              >
                ادامه
                <ArrowLeft className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={goNext}
                disabled={!canGoNext}
                className={`flex items-center gap-1.5 text-sm font-bold px-5 py-2.5 rounded-xl transition-all ${
                  canGoNext
                    ? 'bg-[#824c71] text-white'
                    : 'bg-zinc-100 text-zinc-300 pointer-events-none'
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