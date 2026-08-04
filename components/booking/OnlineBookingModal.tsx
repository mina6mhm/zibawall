// components/booking/OnlineBookingModal.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Loader2, ChevronRight, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';
import DatePicker, { DateObject } from 'react-multi-date-picker';
import persian from 'react-date-object/calendars/persian';
import persian_fa from 'react-date-object/locales/persian_fa';
import { toDateOnlyAnchor } from '@/lib/dateUtils';

type ServiceItemRow = { id: string; name: string; durationMinutes: number; price: number | null };
type CategoryRow = { id: string; title: string; depositAmount: number; services: ServiceItemRow[] };

type Step = 'categories' | 'services' | 'datetime' | 'summary';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  salonId: string;
  onBooked: () => void;
};

const sanitizeDigits = (v: string) => v.replace(/[^0-9]/g, '');

export default function OnlineBookingModal({ isOpen, onClose, salonId, onBooked }: Props) {
  const [step, setStep] = useState<Step>('categories');
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [categories, setCategories] = useState<CategoryRow[]>([]);

  const [selectedCategory, setSelectedCategory] = useState<CategoryRow | null>(null);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);

  const [dateObj, setDateObj] = useState<DateObject>(() => new DateObject({ calendar: persian, locale: persian_fa }));
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [slots, setSlots] = useState<string[]>([]);
  const [dayIsOpen, setDayIsOpen] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  const [customerName, setCustomerName] = useState('');
  const [customerPhoneDigits, setCustomerPhoneDigits] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const resetAll = useCallback(() => {
    setStep('categories');
    setSelectedCategory(null);
    setSelectedItemIds([]);
    setDateObj(new DateObject({ calendar: persian, locale: persian_fa }));
    setSlots([]);
    setSelectedSlot(null);
    setCustomerName('');
    setCustomerPhoneDigits('');
    setError('');
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    resetAll();
    setIsLoadingCategories(true);
    fetch(`/api/salon/${salonId}/booking-categories`)
      .then((res) => res.json())
      .then((data) => setCategories((data.categories || []).filter((c: CategoryRow) => c.services.length > 0)))
      .catch(() => setCategories([]))
      .finally(() => setIsLoadingCategories(false));
  }, [isOpen, salonId, resetAll]);

  const totalDuration = selectedCategory
    ? selectedCategory.services.filter((s) => selectedItemIds.includes(s.id)).reduce((sum, s) => sum + s.durationMinutes, 0)
    : 0;

  const totalPrice = selectedCategory
    ? selectedCategory.services.filter((s) => selectedItemIds.includes(s.id)).reduce((sum, s) => sum + (s.price || 0), 0)
    : 0;

  const dateStr = toDateOnlyAnchor(dateObj.toDate()).toISOString().slice(0, 10);

  const fetchSlots = useCallback(() => {
    if (totalDuration <= 0) return;
    setIsLoadingSlots(true);
    setSelectedSlot(null);
    fetch(`/api/salon/${salonId}/availability?date=${dateStr}&duration=${totalDuration}`)
      .then((res) => res.json())
      .then((data) => {
        setDayIsOpen(data.isOpen);
        setSlots(data.slots || []);
      })
      .catch(() => {
        setDayIsOpen(true);
        setSlots([]);
      })
      .finally(() => setIsLoadingSlots(false));
  }, [salonId, dateStr, totalDuration]);

  useEffect(() => {
    if (step === 'datetime') fetchSlots();
  }, [step, fetchSlots]);

  const toggleItem = (id: string) => {
    setSelectedItemIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const handleSubmit = async () => {
    setError('');
    if (!customerPhoneDigits || !/^09\d{9}$/.test(customerPhoneDigits)) {
      setError('شماره موبایل معتبر نیست (مثال: 09123456789)');
      return;
    }
    if (!selectedSlot) {
      setError('ساعت نوبت انتخاب نشده است');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/salon/${salonId}/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: dateStr,
          startTime: selectedSlot,
          serviceItemIds: selectedItemIds,
          customerName: customerName.trim() || undefined,
          customerPhone: customerPhoneDigits,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'خطا در ثبت نوبت');
        if (res.status === 409) {
          // بازه دیگر خالی نیست — برگرد به انتخاب زمان و لیست رو تازه کن
          setStep('datetime');
          fetchSlots();
        }
        return;
      }
      onBooked();
      onClose();
    } catch {
      setError('خطای ارتباط با سرور');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const formatMoney = (n: number) => n.toLocaleString('fa-IR');

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4" onClick={onClose}>
      <div
        className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl p-5 pb-8 sm:pb-5 max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-2"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        <div className="flex justify-between items-center mb-5">
          <div className="flex items-center gap-2">
            {step !== 'categories' && (
              <button
                onClick={() => {
                  if (step === 'services') setStep('categories');
                  else if (step === 'datetime') setStep('services');
                  else if (step === 'summary') setStep('datetime');
                  setError('');
                }}
                className="p-1.5 text-zinc-400 bg-zinc-50 rounded-full"
              >
                <ChevronRight className="w-4.5 h-4.5" />
              </button>
            )}
            <h3 className="text-base font-bold text-zinc-900">
              {step === 'categories' && 'انتخاب دسته‌بندی'}
              {step === 'services' && selectedCategory?.title}
              {step === 'datetime' && 'انتخاب روز و ساعت'}
              {step === 'summary' && 'تکمیل رزرو'}
            </h3>
          </div>
          <button onClick={onClose} className="p-1.5 text-zinc-400 bg-zinc-50 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* مرحله ۱: انتخاب دسته‌بندی */}
        {step === 'categories' && (
          <div className="space-y-2.5">
            {isLoadingCategories ? (
              <div className="flex justify-center py-10">
                <Loader2 className="w-6 h-6 text-[#824c71] animate-spin" />
              </div>
            ) : categories.length === 0 ? (
              <p className="text-zinc-400 text-sm text-center py-10">فعلاً امکان رزرو آنلاین برای این سالن فراهم نیست.</p>
            ) : (
              categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setSelectedCategory(cat);
                    setSelectedItemIds([]);
                    setStep('services');
                  }}
                  className="w-full flex items-center justify-between bg-zinc-50 hover:bg-zinc-100 rounded-xl p-4 text-right transition-colors"
                >
                  <div>
                    <p className="text-sm font-bold text-zinc-800">{cat.title}</p>
                    <p className="text-[11px] text-zinc-400 mt-1">{cat.services.length.toLocaleString('fa-IR')} خدمت</p>
                  </div>
                  <ChevronRight className="w-4.5 h-4.5 text-zinc-400 rotate-180" />
                </button>
              ))
            )}
          </div>
        )}

        {/* مرحله ۲: انتخاب خدمات */}
        {step === 'services' && selectedCategory && (
          <div>
            <div className="space-y-2 mb-5">
              {selectedCategory.services.map((item) => {
                const checked = selectedItemIds.includes(item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => toggleItem(item.id)}
                    className={`w-full flex items-center justify-between rounded-xl p-3.5 border text-right transition-colors ${
                      checked ? 'border-[#824c71] bg-[#824c71]/[0.05]' : 'border-zinc-200 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${checked ? 'bg-[#824c71] border-[#824c71]' : 'border-zinc-300'}`}>
                        {checked && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-zinc-800">{item.name}</p>
                        <p className="text-[11px] text-zinc-400 mt-0.5 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {item.durationMinutes.toLocaleString('fa-IR')} دقیقه
                          {item.price ? ` · ${formatMoney(item.price)} تومان` : ''}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              disabled={selectedItemIds.length === 0}
              onClick={() => setStep('datetime')}
              className="w-full bg-[#824c71] hover:bg-[#6d3f5e] text-white rounded-xl py-3 text-sm font-bold transition-colors disabled:opacity-40"
            >
              {selectedItemIds.length > 0
                ? `ادامه (مجموع ${totalDuration.toLocaleString('fa-IR')} دقیقه)`
                : 'حداقل یک خدمت انتخاب کنید'}
            </button>
          </div>
        )}

        {/* مرحله ۳: انتخاب روز و ساعت */}
        {step === 'datetime' && (
          <div>
            <div className="mb-4">
              <DatePicker
                value={dateObj}
                onChange={(d) => d && setDateObj(d as DateObject)}
                calendar={persian}
                locale={persian_fa}
                calendarPosition="bottom-center"
                containerClassName="w-full"
                render={(_value, openCalendar) => (
                  <button
                    type="button"
                    onClick={openCalendar}
                    className="w-full h-11 flex items-center justify-center gap-2 rounded-xl bg-zinc-50 border border-zinc-200 px-2"
                  >
                    <span className="text-sm font-bold text-zinc-800">
                      {dateObj.format('D MMMM YYYY')}
                    </span>
                  </button>
                )}
              />
            </div>

            {isLoadingSlots ? (
              <div className="flex justify-center py-10">
                <Loader2 className="w-6 h-6 text-[#824c71] animate-spin" />
              </div>
            ) : !dayIsOpen ? (
              <p className="text-zinc-400 text-sm text-center py-10">سالن در این روز تعطیل است.</p>
            ) : slots.length === 0 ? (
              <p className="text-zinc-400 text-sm text-center py-10">برای این روز ساعت خالی‌ای وجود ندارد.</p>
            ) : (
              <div className="grid grid-cols-4 gap-2 mb-5">
                {slots.map((slot) => (
                  <button
                    key={slot}
                    onClick={() => setSelectedSlot(slot)}
                    className={`h-10 rounded-lg text-xs font-bold transition-colors ${
                      selectedSlot === slot ? 'bg-[#824c71] text-white' : 'bg-zinc-50 text-zinc-700 hover:bg-zinc-100'
                    }`}
                    dir="ltr"
                  >
                    {slot}
                  </button>
                ))}
              </div>
            )}

            <button
              type="button"
              disabled={!selectedSlot}
              onClick={() => setStep('summary')}
              className="w-full bg-[#824c71] hover:bg-[#6d3f5e] text-white rounded-xl py-3 text-sm font-bold transition-colors disabled:opacity-40"
            >
              ادامه
            </button>
          </div>
        )}

        {/* مرحله ۴: خلاصه سفارش + اطلاعات تماس */}
        {step === 'summary' && selectedCategory && (
          <div className="space-y-4">
            <div className="bg-zinc-50 rounded-xl p-4 space-y-2">
              {selectedCategory.services
                .filter((s) => selectedItemIds.includes(s.id))
                .map((s) => (
                  <div key={s.id} className="flex items-center justify-between text-sm">
                    <span className="text-zinc-700">{s.name}</span>
                    <span className="text-zinc-500 text-xs">
                      {s.durationMinutes.toLocaleString('fa-IR')} دقیقه{s.price ? ` · ${formatMoney(s.price)} تومان` : ''}
                    </span>
                  </div>
                ))}
              <div className="border-t border-zinc-200 pt-2 mt-2 flex items-center justify-between text-xs text-zinc-500">
                <span>تاریخ و ساعت</span>
                <span dir="ltr" className="font-bold text-zinc-700">
                  {dateObj.format('D MMMM')} — {selectedSlot}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1.5">نام شما (اختیاری)</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full h-11 border border-zinc-200 rounded-xl px-3 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1.5">شماره موبایل</label>
              <input
                type="tel"
                inputMode="numeric"
                value={customerPhoneDigits}
                onChange={(e) => setCustomerPhoneDigits(sanitizeDigits(e.target.value).slice(0, 11))}
                placeholder="09123456789"
                className="w-full h-11 border border-zinc-200 rounded-xl px-3 text-sm"
                dir="ltr"
              />
            </div>

            <div className="bg-[#824c71]/[0.06] rounded-xl p-3.5 text-xs text-zinc-600 leading-relaxed">
              مبلغ بیعانه‌ی این رزرو <span className="font-bold text-[#824c71]">{formatMoney(selectedCategory.depositAmount)} تومان</span> است که به‌همراه هزینه‌ی خدمات پلتفرم (۲۰,۰۰۰ تومان) هم‌اکنون پرداخت می‌شود.
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 rounded-xl p-3 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-red-600 text-xs font-medium leading-relaxed">{error}</p>
              </div>
            )}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full bg-[#824c71] hover:bg-[#6d3f5e] text-white rounded-xl py-3.5 text-sm font-bold transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              ثبت نوبت و پرداخت بیعانه
            </button>
          </div>
        )}
      </div>
    </div>
  );
}