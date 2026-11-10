// components/booking/EditBookingModal.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Loader2, ChevronDown, Lock } from 'lucide-react';

type ServiceRow = {
  name: string;
  priceDigits: string;
  staffName: string;
  staffPercentageDigits: string;
};

type StaffMember = { id: string; name: string };

export type BookingToEdit = {
  id: string;
  customerName: string | null;
  customerPhone: string;
  date: string; // ISO
  startTime: string;
  services: { name: string; price?: number; staffName?: string; staffPercentage?: number }[];
};

type EditBookingModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  booking: BookingToEdit | null;
};

// کش سطح ماژول برای لیست پرسنل: با هر بار باز شدن مودال درخواست جدید نمی‌رود.
// TTL کوتاه دارد تا اگر پرسنل جدید اضافه شد، بعد از چند دقیقه خودش تازه شود.
const STAFF_CACHE_TTL = 2 * 60 * 1000;
let staffCache: { data: StaffMember[]; at: number } | null = null;

const emptyService = (): ServiceRow => ({ name: '', priceDigits: '', staffName: '', staffPercentageDigits: '' });
const toPersianDigits = (str: string) => str.replace(/[0-9]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);
const toEnglishDigits = (str: string) =>
  str
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - '۰'.charCodeAt(0)))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - '٠'.charCodeAt(0)));

const sanitizeDigitsOnly = (value: string) => toEnglishDigits(value).replace(/[^0-9]/g, '');

const formatPriceDisplay = (rawDigits: string) => {
  if (!rawDigits) return '';
  return Number(rawDigits).toLocaleString('fa-IR');
};

const boxSmallClass =
  'w-full h-10 box-border flex items-center border border-zinc-200 rounded-lg bg-white focus-within:ring-1 focus-within:ring-[#824c71]/40 focus-within:border-[#824c71] overflow-hidden';
const fillInputClass = 'w-full h-full bg-transparent outline-none border-0 px-3 text-sm';

export default function EditBookingModal({ isOpen, onClose, onSaved, booking }: EditBookingModalProps) {
  const [service, setService] = useState<ServiceRow>(emptyService());
  const [staffList, setStaffList] = useState<StaffMember[]>(staffCache?.data ?? []);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // state برای نمایش (disable دکمه) است، ولی ref جلوی دابل‌تپ سریع را همان لحظه می‌گیرد
  // (setState آسنکرون است و دو کلیک پشت‌سرهم ممکن است هر دو از گارد رد شوند)
  const submittingRef = useRef(false);

  // لیست پرسنل؛ از کش استفاده می‌کند و با بسته شدن مودال درخواست لغو می‌شود
  useEffect(() => {
    if (!isOpen) return;

    if (staffCache && Date.now() - staffCache.at < STAFF_CACHE_TTL) {
      setStaffList(staffCache.data);
      return;
    }

    const controller = new AbortController();
    fetch('/api/staff', { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        const list: StaffMember[] = data.staff || [];
        staffCache = { data: list, at: Date.now() };
        setStaffList(list);
      })
      .catch(() => {
        // خطا یا لغو: لیست قبلی (اگر بود) می‌ماند
      });
    return () => controller.abort();
  }, [isOpen]);

  // فقط وقتی «نوبتِ دیگری» انتخاب شد (id عوض شد) فرم ریست می‌شود.
  // اگر والد لیست را دوباره fetch کند و reference آبجکت booking عوض شود،
  // تغییراتی که کاربر وسط ویرایش زده نمی‌پرد.
  useEffect(() => {
    if (!isOpen || !booking) return;
    const s = booking.services[0];
    setService(
      s
        ? {
            name: s.name,
            // مقدار ۰ هم معتبر است؛ فقط null/undefined خالی حساب می‌شود
            priceDigits: s.price != null ? String(s.price) : '',
            staffName: s.staffName || '',
            staffPercentageDigits: s.staffPercentage != null ? String(s.staffPercentage) : '',
          }
        : emptyService()
    );
    setError('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, booking?.id]);

  const handleClose = () => {
    setError('');
    onClose();
  };

  const updateService = (field: keyof ServiceRow, value: string) => {
    setService((prev) => ({ ...prev, [field]: value }));
  };

  const handleServicePriceChange = (value: string) => {
    updateService('priceDigits', sanitizeDigitsOnly(value));
  };

  const handleServicePercentageChange = (value: string) => {
    let digits = sanitizeDigitsOnly(value).slice(0, 3);
    if (digits !== '' && Number(digits) > 100) digits = '100';
    updateService('staffPercentageDigits', digits);
  };

  const handleSubmit = async () => {
    if (!booking || submittingRef.current) return;
    setError('');

    const name = service.name.trim();
    if (!name) {
      setError('نام خدمت را وارد کنید');
      return;
    }

    const cleanedService = {
      name,
      price: service.priceDigits !== '' ? Number(service.priceDigits) : undefined,
      staffName: service.staffName.trim() || undefined,
      staffPercentage:
        service.staffPercentageDigits !== '' ? Number(service.staffPercentageDigits) : undefined,
    };

    // بقیه‌ی خدمات نوبت دست‌نخورده همراه ارسال می‌شوند تا حذف نشوند
    const otherServices = booking.services.slice(1);

    submittingRef.current = true;
    setIsSubmitting(true);

    try {
      const payload = {
        customerName: booking.customerName ?? undefined,
        customerPhone: booking.customerPhone,
        date: booking.date,
        startTime: booking.startTime,
        services: [cleanedService, ...otherServices],
      };

      const res = await fetch(`/api/booking?id=${encodeURIComponent(booking.id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error || 'خطا در ذخیره تغییرات');
        return;
      }

      onSaved();
      onClose();
    } catch {
      setError('خطای ارتباط با سرور');
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !booking) return null;

  // منطقه‌ی زمانی ثابت: بدون آن، کاربری که ساعت گوشی‌اش منطقه‌ی دیگری است ممکنه تاریخ یک روز جابه‌جا ببیند
  const formatDate = (isoDate: string) =>
    new Date(isoDate).toLocaleDateString('fa-IR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'Asia/Tehran',
    });

  // اگر پرسنل ثبت‌شده در نوبت دیگر در لیست نیست (حذف/تغییر نام شده)، باید همچنان به‌عنوان گزینه نمایش داده شود
  const currentStaffMissing =
    service.staffName !== '' && !staffList.some((s) => s.name === service.staffName);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4"
      onClick={handleClose}
    >
      <div
        className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl p-5 pb-8 sm:pb-5 max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-2"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-base font-bold text-zinc-900">ویرایش نوبت</h3>
          <button type="button" onClick={handleClose} className="p-1.5 text-zinc-400 bg-zinc-50 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* اطلاعات ثابت نوبت — فقط نمایش */}
          <div className="bg-zinc-50 border border-zinc-100 rounded-xl p-3.5">
            <div className="flex items-center gap-1.5 mb-2.5 text-zinc-400">
              <Lock className="w-3.5 h-3.5" />
              <span className="text-[11px] font-medium">اطلاعات رزرو</span>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-[13px]">
              <div>
                <p className="text-[11px] text-zinc-400 mb-0.5">مشتری</p>
                <p className="font-medium text-zinc-800">{booking.customerName || 'بدون نام'}</p>
              </div>
              <div>
                <p className="text-[11px] text-zinc-400 mb-0.5">شماره تماس</p>
                <p className="font-medium text-zinc-800" dir="ltr">{booking.customerPhone}</p>
              </div>
              <div>
                <p className="text-[11px] text-zinc-400 mb-0.5">تاریخ</p>
                <p className="font-medium text-zinc-800">{formatDate(booking.date)}</p>
              </div>
              <div>
                <p className="text-[11px] text-zinc-400 mb-0.5">ساعت</p>
                <p className="font-medium text-zinc-800" dir="ltr">{booking.startTime}</p>
              </div>
            </div>
          </div>

          {/* خدمات — تنها بخش قابل ویرایش */}
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1.5">
              خدمات <span className="text-red-500">*</span>
            </label>
            <div className="border border-zinc-200 rounded-xl p-3 space-y-2.5 bg-zinc-50/40">
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-[11px] font-medium text-zinc-500 mb-1">نام خدمت</label>
                  <div className={boxSmallClass}>
                    <input
                      type="text"
                      value={service.name}
                      onChange={(e) => updateService('name', e.target.value)}
                      className={fillInputClass}
                      placeholder="مثلاً کراتین مو"
                    />
                  </div>
                </div>
                <div className="w-28 shrink-0">
                  <label className="block text-[11px] font-medium text-zinc-500 mb-1">قیمت</label>
                  <div className={boxSmallClass}>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={formatPriceDisplay(service.priceDigits)}
                      onChange={(e) => handleServicePriceChange(e.target.value)}
                      className={fillInputClass}
                      placeholder="۰"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-[11px] font-medium text-zinc-500 mb-1">اسم پرسنل</label>
                  <div className={`${boxSmallClass} relative`}>
                    <select
                      value={service.staffName}
                      onChange={(e) => updateService('staffName', e.target.value)}
                      className={`${fillInputClass} appearance-none pl-7`}
                    >
                      <option value="">بدون پرسنل مشخص</option>
                      {currentStaffMissing && <option value={service.staffName}>{service.staffName}</option>}
                      {staffList.map((s) => (
                        <option key={s.id} value={s.name}>{s.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
                <div className="w-28 shrink-0">
                  <label className="block text-[11px] font-medium text-zinc-500 mb-1">درصد پرسنل</label>
                  <div className={boxSmallClass}>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={toPersianDigits(service.staffPercentageDigits)}
                      onChange={(e) => handleServicePercentageChange(e.target.value)}
                      className={`${fillInputClass} pl-1`}
                      placeholder="۰"
                    />
                    <span className="text-zinc-400 text-xs pl-2 shrink-0">٪</span>
                  </div>
                </div>
              </div>

              {booking.services.length > 1 && (
                <p className="text-[11px] text-zinc-400">
                  این نوبت {(booking.services.length - 1).toLocaleString('fa-IR')} خدمت دیگر هم دارد که بدون تغییر باقی می‌ماند.
                </p>
              )}
            </div>
          </div>

          {error && <p className="text-red-600 text-xs font-medium">{error}</p>}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full bg-[#824c71] hover:bg-[#6d3f5e] text-white rounded-xl py-3 text-sm font-bold transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {isSubmitting ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
          </button>
        </div>
      </div>
    </div>
  );
}