// app/(dashboard)/salon/[id]/book/page.tsx
'use client';

import { useState, useEffect, use, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowRight, Loader2, CalendarClock, Clock, Check,
  ChevronLeft, ChevronRight, Plus, Trash2, CreditCard, User,
} from 'lucide-react';
import { DateObject } from 'react-multi-date-picker';
import PersianCalendar from '@/components/ui/PersianCalendar';
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
  date: string;        // "YYYY-MM-DD"
  startTime: string;   // "HH:MM"
  staffId: string;
  staffName: string;
};

type Step = 'service' | 'staff' | 'date' | 'time' | 'confirm';

const STEP_LABELS: Record<Step, string> = {
  service: 'انتخاب خدمات',
  staff:   'انتخاب پرسنل',
  date:    'انتخاب تاریخ',
  time:    'انتخاب ساعت',
  confirm: 'تأیید و پرداخت',
};

const formatPrice = (n: number) => n.toLocaleString('fa-IR');

const formatPersianDate = (dateStr: string) =>
  new DateObject({ date: new Date(dateStr), calendar: persian, locale: persian_fa })
    .format('D MMMM YYYY');

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function BookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: salonId } = use(params);
  const router = useRouter();

  const [salonName, setSalonName] = useState('');
  const [services, setServices] = useState<BookingService[]>([]);
  const [isLoadingSalon, setIsLoadingSalon] = useState(true);

  // جریان رزرو
  const [step, setStep] = useState<Step>('service');
  const [selectedService, setSelectedService] = useState<BookingService | null>(null);

  // پرسنل
  const [eligibleStaff, setEligibleStaff] = useState<StaffOption[]>([]);
  // null = بهترین (اتوماتیک)، string = آیدی پرسنل خاص
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);

  // تاریخ
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // ساعت
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);

  // سبد رزرو
  const [cart, setCart] = useState<CartItem[]>([]);

  // ثبت نهایی
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // ── بارگذاری اطلاعات سالن و خدمات ──────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const [salonRes, svcRes] = await Promise.all([
          fetch(`/api/salon/${salonId}`),
          fetch(`/api/booking-services/public?salonId=${salonId}`),
        ]);

        if (salonRes.ok) {
          const d = await salonRes.json();
          setSalonName(d.name);
          if (!d.bookingEnabled) {
            router.replace(`/salon/${salonId}`);
            return;
          }
        }
        if (svcRes.ok) {
          const d = await svcRes.json();
          setServices(d.services ?? []);
        }
      } finally {
        setIsLoadingSalon(false);
      }
    };
    load();
  }, [salonId, router]);

  // ── بارگذاری ساعت‌های آزاد ──────────────────────────────────────────────
  const loadSlots = useCallback(async () => {
    if (!selectedService || !selectedDate) return;
    setIsLoadingSlots(true);
    setSlots([]);
    setSelectedSlot(null);
    try {
      const params = new URLSearchParams({
        salonId,
        serviceId: selectedService.id,
        date: selectedDate,
        ...(selectedStaffId ? { staffId: selectedStaffId } : {}),
      });
      const res = await fetch(`/api/booking-online/available-slots?${params}`);
      if (res.ok) {
        const d = await res.json();
        setSlots(d.slots ?? []);
        setEligibleStaff(d.staff ?? []);
      }
    } finally {
      setIsLoadingSlots(false);
    }
  }, [salonId, selectedService, selectedDate, selectedStaffId]);

  useEffect(() => {
    if (step === 'time') loadSlots();
  }, [step, loadSlots]);

  // ── اکشن‌ها ─────────────────────────────────────────────────────────────
  const selectService = (svc: BookingService) => {
    setSelectedService(svc);
    setSelectedStaffId(null);
    setSelectedDate(null);
    setSelectedSlot(null);
    setStep('staff');
  };

  const selectStaff = (staffId: string | null) => {
    setSelectedStaffId(staffId);
    setSelectedDate(null);
    setSelectedSlot(null);
    setStep('date');
  };

  const selectDate = (dateStr: string) => {
    setSelectedDate(dateStr);
    setStep('time');
  };

  const selectSlot = (slot: TimeSlot) => {
    setSelectedSlot(slot);
  };

  const addToCart = () => {
    if (!selectedService || !selectedDate || !selectedSlot) return;

    // تعیین پرسنل نهایی
    const finalStaffId   = selectedStaffId ?? selectedSlot.availableStaff[0]?.id ?? '';
    const finalStaffName = selectedStaffId
      ? eligibleStaff.find((s) => s.id === selectedStaffId)?.name ?? ''
      : selectedSlot.availableStaff[0]?.name ?? 'انتخاب خودکار';

    const item: CartItem = {
      serviceId:    selectedService.id,
      serviceName:  selectedService.name,
      durationMin:  selectedService.durationMin,
      price:        selectedService.price,
      depositAmount: selectedService.depositAmount,
      date:         selectedDate,
      startTime:    selectedSlot.time,
      staffId:      finalStaffId,
      staffName:    finalStaffName,
    };

    setCart((prev) => [...prev, item]);

    // بازگشت به انتخاب خدمات برای رزرو بعدی
    setSelectedService(null);
    setSelectedStaffId(null);
    setSelectedDate(null);
    setSelectedSlot(null);
    setStep('service');
  };

  const removeFromCart = (idx: number) => {
    setCart((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (cart.length === 0) return;
    setIsSubmitting(true);
    setSubmitError('');

    try {
      const results = await Promise.all(
        cart.map((item) =>
          fetch('/api/booking-online/reserve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              salonId,
              serviceId: item.serviceId,
              staffId:   item.staffId || undefined,
              date:      item.date,
              startTime: item.startTime,
            }),
          }).then((r) => r.json())
        )
      );

      const failed = results.find((r) => r.error);
      if (failed) {
        setSubmitError(failed.error);
        return;
      }

      // اگه همه نوبت‌ها بیعانه دارن، بریم پرداخت
      const firstBookingId = results[0]?.booking?.id;
      if (firstBookingId && cart.some((c) => (c.depositAmount ?? 0) > 0)) {
        const payRes = await fetch(`/api/booking/${firstBookingId}/pay`, { method: 'POST' });
        const payData = await payRes.json();
        if (payData.paymentUrl) {
          window.location.href = payData.paymentUrl;
          return;
        }
      }

      // بدون بیعانه → مستقیم به صفحه نوبت‌ها
      router.push('/appointments?bookingSuccess=1');
    } catch {
      setSubmitError('خطای ارتباط با سرور');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── محاسبه جمع سبد ──────────────────────────────────────────────────────
  const totalDeposit = cart.reduce((acc, c) => acc + (c.depositAmount ?? 0), 0);
  const totalPrice   = cart.reduce((acc, c) => acc + c.price, 0);
  const appFee       = cart.length > 0 ? 20000 : 0;
  const totalPayable = totalDeposit + appFee;

  // ── Render ───────────────────────────────────────────────────────────────
  if (isLoadingSalon) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 text-[#824c71] animate-spin mb-4" />
        <p className="text-zinc-500 text-sm">در حال بارگذاری...</p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto pt-6 pb-32 px-4">
      {/* هدر */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href={`/salon/${salonId}`}
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-zinc-100 text-zinc-600 shrink-0"
        >
          <ArrowRight className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-lg font-bold text-zinc-900">نوبت‌دهی آنلاین</h1>
          <p className="text-xs text-zinc-500">{salonName}</p>
        </div>
      </div>

      {/* نوار مرحله‌ها */}
      <div className="flex items-center gap-1.5 mb-6 overflow-x-auto pb-1">
        {(['service', 'staff', 'date', 'time', 'confirm'] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-1.5 shrink-0">
            <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${
              step === s
                ? 'bg-[#824c71] text-white'
                : i < (['service', 'staff', 'date', 'time', 'confirm'] as Step[]).indexOf(step)
                ? 'bg-emerald-50 text-emerald-600'
                : 'bg-zinc-100 text-zinc-400'
            }`}>
              {STEP_LABELS[s]}
            </div>
            {i < 4 && <ChevronLeft className="w-3 h-3 text-zinc-300 shrink-0" />}
          </div>
        ))}
      </div>

      {/* ─── سبد رزرو (نمایش بالای صفحه اگه محتوا داشته باشه) ─── */}
      {cart.length > 0 && step !== 'confirm' && (
        <div className="bg-[#824c71]/5 border border-[#824c71]/20 rounded-2xl p-4 mb-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold text-zinc-700">سبد رزرو ({cart.length})</p>
            <button
              onClick={() => setStep('confirm')}
              className="text-[11px] font-bold text-[#824c71] bg-white border border-[#824c71]/30 px-2.5 py-1 rounded-lg"
            >
              تأیید و پرداخت
            </button>
          </div>
          <div className="space-y-2">
            {cart.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between gap-2 text-xs">
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-zinc-800">{item.serviceName}</span>
                  <span className="text-zinc-400 mr-1">·</span>
                  <span className="text-zinc-500">{formatPersianDate(item.date)} ساعت {item.startTime}</span>
                </div>
                <button onClick={() => removeFromCart(idx)} className="text-red-400 shrink-0">
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
          <p className="text-sm font-bold text-zinc-800 mb-4">چه خدماتی می‌خواهید؟</p>
          {services.length === 0 ? (
            <div className="text-center py-12 bg-zinc-50 rounded-2xl">
              <p className="text-zinc-400 text-sm">خدماتی برای نوبت‌دهی تعریف نشده</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {services.map((svc) => (
                <button
                  key={svc.id}
                  onClick={() => selectService(svc)}
                  className="w-full flex items-center justify-between gap-3 bg-white border border-zinc-100 rounded-2xl p-4 text-right hover:border-[#824c71]/30 hover:bg-[#824c71]/[0.02] transition-all active:scale-[0.99]"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-zinc-900">{svc.name}</p>
                    <div className="flex items-center gap-3 mt-1 text-[12px] text-zinc-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {Math.floor(svc.durationMin / 60) > 0 && `${Math.floor(svc.durationMin / 60)} ساعت`}
                        {svc.durationMin % 60 > 0 && ` ${svc.durationMin % 60} دقیقه`}
                      </span>
                      {svc.price > 0 && (
                        <span>{formatPrice(svc.price)} تومان</span>
                      )}
                    </div>
                    {svc.depositAmount != null && svc.depositAmount > 0 && (
                      <p className="text-[11px] text-[#824c71] mt-1">
                        بیعانه: {formatPrice(svc.depositAmount)} تومان
                      </p>
                    )}
                    {svc.depositAmount == null && (
                      <p className="text-[11px] text-emerald-600 mt-1">بدون بیعانه</p>
                    )}
                  </div>
                  <ChevronLeft className="w-4 h-4 text-zinc-300 shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── مرحله ۲: انتخاب پرسنل ─── */}
      {step === 'staff' && selectedService && (
        <div>
          <button onClick={() => setStep('service')} className="flex items-center gap-1.5 text-xs text-zinc-400 mb-4">
            <ArrowRight className="w-3.5 h-3.5" /> بازگشت
          </button>
          <p className="text-sm font-bold text-zinc-800 mb-1">
            {selectedService.name}
          </p>
          <p className="text-xs text-zinc-400 mb-4">توسط چه کسی؟</p>

          <div className="space-y-2.5">
            {/* گزینه بهترین */}
            <button
              onClick={() => selectStaff(null)}
              className={`w-full flex items-center gap-3 bg-white border rounded-2xl p-4 text-right transition-all ${
                selectedStaffId === null
                  ? 'border-[#824c71] bg-[#824c71]/5'
                  : 'border-zinc-100 hover:border-zinc-200'
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#824c71] to-[#6d3f5e] flex items-center justify-center shrink-0">
                <User className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 text-right">
                <p className="text-sm font-bold text-zinc-900">بهترین انتخاب</p>
                <p className="text-[11px] text-zinc-400 mt-0.5">اولین پرسنل آزاد انتخاب می‌شود</p>
              </div>
              {selectedStaffId === null && <Check className="w-4 h-4 text-[#824c71] shrink-0" />}
            </button>

            {/* گزینه‌های پرسنل خاص — اینجا فقط placeholder نمایش می‌دیم */}
            {/* لیست واقعی پرسنل بعد از انتخاب تاریخ مشخص می‌شه */}
            <p className="text-[11px] text-zinc-400 text-center py-2">
              یا پس از انتخاب تاریخ، پرسنل‌های آزاد نمایش داده می‌شوند
            </p>

            <button
              onClick={() => selectStaff(null)}
              className="w-full bg-[#824c71] text-white rounded-xl py-3 text-sm font-bold"
            >
              ادامه
            </button>
          </div>
        </div>
      )}

      {/* ─── مرحله ۳: انتخاب تاریخ ─── */}
      {step === 'date' && selectedService && (
        <div>
          <button onClick={() => setStep('staff')} className="flex items-center gap-1.5 text-xs text-zinc-400 mb-4">
            <ArrowRight className="w-3.5 h-3.5" /> بازگشت
          </button>
          <p className="text-sm font-bold text-zinc-800 mb-4">چه روزی؟</p>
          <PersianCalendar
            selectedDate={selectedDate}
            onSelectDate={(dateStr) => selectDate(dateStr)}
            initialMonth={new DateObject({ calendar: persian, locale: persian_fa })}
          />
          {selectedDate && (
            <button
              onClick={() => setStep('time')}
              className="w-full mt-4 bg-[#824c71] text-white rounded-xl py-3 text-sm font-bold"
            >
              مشاهده ساعت‌های آزاد
            </button>
          )}
        </div>
      )}

      {/* ─── مرحله ۴: انتخاب ساعت ─── */}
      {step === 'time' && selectedService && selectedDate && (
        <div>
          <button onClick={() => setStep('date')} className="flex items-center gap-1.5 text-xs text-zinc-400 mb-4">
            <ArrowRight className="w-3.5 h-3.5" /> بازگشت
          </button>
          <p className="text-sm font-bold text-zinc-800 mb-1">ساعت نوبت</p>
          <p className="text-xs text-zinc-400 mb-4">{formatPersianDate(selectedDate)}</p>

          {isLoadingSlots ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 text-[#824c71] animate-spin" />
            </div>
          ) : slots.length === 0 ? (
            <div className="text-center py-12 bg-zinc-50 rounded-2xl">
              <CalendarClock className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
              <p className="text-zinc-500 text-sm font-medium">ساعت آزادی در این روز وجود ندارد</p>
              <button
                onClick={() => setStep('date')}
                className="mt-3 text-[#824c71] text-xs font-medium underline"
              >
                تاریخ دیگری انتخاب کنید
              </button>
            </div>
          ) : (
            <>
              {/* اگه چند پرسنل داریم، گزینه انتخاب رو نشون بده */}
              {eligibleStaff.length > 1 && (
                <div className="mb-4">
                  <p className="text-xs font-medium text-zinc-500 mb-2">انتخاب پرسنل (اختیاری)</p>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    <button
                      onClick={() => { setSelectedStaffId(null); loadSlots(); }}
                      className={`shrink-0 px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${
                        selectedStaffId === null
                          ? 'bg-[#824c71] text-white border-[#824c71]'
                          : 'bg-white text-zinc-600 border-zinc-200'
                      }`}
                    >
                      بهترین انتخاب
                    </button>
                    {eligibleStaff.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => { setSelectedStaffId(s.id); loadSlots(); }}
                        className={`shrink-0 px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${
                          selectedStaffId === s.id
                            ? 'bg-[#824c71] text-white border-[#824c71]'
                            : 'bg-white text-zinc-600 border-zinc-200'
                        }`}
                      >
                        {s.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-2">
                {slots.map((slot) => (
                  <button
                    key={slot.time}
                    onClick={() => selectSlot(slot)}
                    className={`py-3 rounded-xl text-sm font-bold border transition-all ${
                      selectedSlot?.time === slot.time
                        ? 'bg-[#824c71] text-white border-[#824c71] shadow-sm shadow-[#824c71]/30'
                        : 'bg-white text-zinc-700 border-zinc-100 hover:border-zinc-200'
                    }`}
                    dir="ltr"
                  >
                    {slot.time}
                  </button>
                ))}
              </div>

              {selectedSlot && (
                <button
                  onClick={addToCart}
                  className="w-full mt-5 bg-[#824c71] text-white rounded-xl py-3.5 text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-[#824c71]/20"
                >
                  <Plus className="w-4 h-4" />
                  افزودن به سبد رزرو
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* ─── مرحله ۵: تأیید و پرداخت ─── */}
      {step === 'confirm' && (
        <div>
          <button onClick={() => setStep('service')} className="flex items-center gap-1.5 text-xs text-zinc-400 mb-4">
            <ArrowRight className="w-3.5 h-3.5" /> بازگشت
          </button>
          <p className="text-sm font-bold text-zinc-800 mb-4">تأیید نوبت‌ها</p>

          {cart.length === 0 ? (
            <div className="text-center py-12 bg-zinc-50 rounded-2xl">
              <p className="text-zinc-400 text-sm">سبد رزرو شما خالی است</p>
              <button
                onClick={() => setStep('service')}
                className="mt-3 text-[#824c71] text-xs font-medium underline"
              >
                افزودن نوبت
              </button>
            </div>
          ) : (
            <>
              <div className="space-y-3 mb-5">
                {cart.map((item, idx) => (
                  <div key={idx} className="bg-white border border-zinc-100 rounded-2xl p-4">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <p className="text-sm font-bold text-zinc-900">{item.serviceName}</p>
                      <button
                        onClick={() => removeFromCart(idx)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-50 text-red-400 shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="space-y-1 text-[12px] text-zinc-500">
                      <div className="flex items-center gap-2">
                        <CalendarClock className="w-3.5 h-3.5 text-zinc-400" />
                        <span>{formatPersianDate(item.date)} — ساعت {item.startTime}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-zinc-400" />
                        <span>{item.staffName}</span>
                      </div>
                    </div>
                    {item.depositAmount != null && item.depositAmount > 0 && (
                      <div className="mt-3 pt-3 border-t border-zinc-50 flex items-center justify-between text-[12px]">
                        <span className="text-zinc-500">بیعانه</span>
                        <span className="font-bold text-zinc-800">{formatPrice(item.depositAmount)} تومان</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <button
                onClick={() => setStep('service')}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-zinc-200 text-zinc-500 text-sm font-medium mb-5"
              >
                <Plus className="w-4 h-4" />
                افزودن نوبت دیگر
              </button>

              {/* خلاصه مالی */}
              <div className="bg-zinc-50 border border-zinc-100 rounded-2xl p-4 mb-5">
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
                  <div className="flex items-center justify-between pt-2 border-t border-zinc-200">
                    <span className="font-bold text-zinc-800">مبلغ قابل پرداخت</span>
                    <span className="font-bold text-[#824c71] text-base">{formatPrice(totalPayable)} تومان</span>
                  </div>
                </div>
              </div>

              {submitError && (
                <p className="text-red-500 text-xs font-medium mb-3 text-center">{submitError}</p>
              )}

              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full bg-[#824c71] text-white rounded-xl py-4 text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-[#824c71]/20 disabled:opacity-60"
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