// components/booking/EditBookingModal.tsx
'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Loader2, ChevronDown, Lock } from 'lucide-react';

type ServiceRow = {
  name: string;
  priceDigits: string;
  staffName: string;
  staffPercentageDigits: string;
};

type StaffMember = { id: string; name: string };

// اطلاعات نوبتی که قراره ویرایش بشه — همه‌شون از قبل توسط سیستم نوبت‌دهی آنلاین ثبت شده
// و در این مدال قابل تغییر نیستن، به‌جز آرایه‌ی services
export type BookingToEdit = {
  id: string;
  customerName: string | null;
  customerPhone: string;
  date: string; // ISO
  startTime: string;
  services: { name: string; price?: number; staffName?: string; staffPercentage?: number }[];
  depositAmount: number;
  totalAmount: number;
  paymentStatus: 'PENDING' | 'SUCCESS' | 'FAILED';
};

type EditBookingModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  booking: BookingToEdit | null;
};

const emptyService = (): ServiceRow => ({ name: '', priceDigits: '', staffName: '', staffPercentageDigits: '' });

const toEnglishDigits = (str: string) =>
  str
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - '۰'.charCodeAt(0)))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - '٠'.charCodeAt(0)));

const sanitizeDigitsOnly = (value: string) => toEnglishDigits(value).replace(/[^0-9]/g, '');

const formatPriceDisplay = (rawDigits: string) => {
  if (!rawDigits) return '';
  return Number(rawDigits).toLocaleString('fa-IR');
};

const formatMoney = (n: number) => n.toLocaleString('fa-IR');

const boxSmallClass =
  'w-full h-10 box-border flex items-center border border-zinc-200 rounded-lg bg-white focus-within:ring-1 focus-within:ring-[#824c71]/40 focus-within:border-[#824c71] overflow-hidden';
const fillInputClass = 'w-full h-full bg-transparent outline-none border-0 px-3 text-sm';

export default function EditBookingModal({ isOpen, onClose, onSaved, booking }: EditBookingModalProps) {
  const [services, setServices] = useState<ServiceRow[]>([emptyService()]);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    fetch('/api/staff')
      .then((res) => (res.ok ? res.json() : { staff: [] }))
      .then((data) => setStaffList(data.staff || []))
      .catch(() => setStaffList([]));
  }, [isOpen]);

  // پر کردن ردیف‌های خدمات از روی نوبت انتخاب‌شده هر بار که مدال باز می‌شود
  useEffect(() => {
    if (!isOpen || !booking) return;
    setServices(
      booking.services.length > 0
        ? booking.services.map((s) => ({
            name: s.name,
            priceDigits: s.price ? String(s.price) : '',
            staffName: s.staffName || '',
            staffPercentageDigits: s.staffPercentage ? String(s.staffPercentage) : '',
          }))
        : [emptyService()]
    );
    setError('');
  }, [isOpen, booking]);

  const handleClose = () => {
    setError('');
    onClose();
  };

  const updateService = (index: number, field: keyof ServiceRow, value: string) => {
    setServices((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleServicePriceChange = (index: number, value: string) => {
    updateService(index, 'priceDigits', sanitizeDigitsOnly(value));
  };

  const handleServicePercentageChange = (index: number, value: string) => {
    let digits = sanitizeDigitsOnly(value).slice(0, 3);
    if (digits !== '' && Number(digits) > 100) digits = '100';
    updateService(index, 'staffPercentageDigits', digits);
  };

  const addServiceRow = () => setServices((prev) => [...prev, emptyService()]);

  const removeServiceRow = (index: number) => {
    setServices((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  };

  const handleSubmit = async () => {
    if (!booking) return;
    setError('');

    const cleanedServices = services
      .map((s) => ({
        name: s.name.trim(),
        price: s.priceDigits ? Number(s.priceDigits) : undefined,
        staffName: s.staffName.trim() || undefined,
        staffPercentage: s.staffPercentageDigits ? Number(s.staffPercentageDigits) : undefined,
      }))
      .filter((s) => s.name !== '');

    if (cleanedServices.length === 0) {
      setError('حداقل یک خدمت را وارد کنید');
      return;
    }

    try {
      setIsSubmitting(true);

      // فقط خدمات ویرایش می‌شه — مشتری، تاریخ، ساعت و بیعانه دقیقاً همونی می‌مونه
      // که هنگام رزرو آنلاین ثبت شده و اینجا دست‌کاری نمی‌شه
      const payload = {
        customerName: booking.customerName ?? undefined,
        customerPhone: booking.customerPhone,
        date: booking.date,
        startTime: booking.startTime,
        services: cleanedServices,
        depositAmount: booking.depositAmount,
      };

      const res = await fetch(`/api/booking?id=${booking.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'خطا در ذخیره تغییرات');
        return;
      }

      onSaved();
      onClose();
    } catch {
      setError('خطای ارتباط با سرور');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !booking) return null;

  const formatDate = (isoDate: string) =>
    new Date(isoDate).toLocaleDateString('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' });

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
          <button onClick={handleClose} className="p-1.5 text-zinc-400 bg-zinc-50 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* اطلاعات ثابت نوبت — فقط نمایش، از رزرو آنلاین اومده و اینجا قابل تغییر نیست */}
          <div className="bg-zinc-50 border border-zinc-100 rounded-xl p-3.5">
            <div className="flex items-center gap-1.5 mb-2.5 text-zinc-400">
              <Lock className="w-3.5 h-3.5" />
              <span className="text-[11px] font-medium">اطلاعات ثبت‌شده هنگام رزرو — غیرقابل ویرایش</span>
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
              <div className="col-span-2 pt-2 border-t border-zinc-100 flex items-center justify-between">
                <span className="text-[11px] text-zinc-400">بیعانه</span>
                <span className="font-bold text-zinc-800 flex items-center gap-1.5">
                  {formatMoney(booking.depositAmount)} تومان
                  {booking.paymentStatus === 'SUCCESS' && (
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md">
                      پرداخت‌شده
                    </span>
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* خدمات — تنها بخش قابل ویرایش */}
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1.5">
              خدمات <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2.5">
              {services.map((service, index) => (
                <div key={index} className="border border-zinc-200 rounded-xl p-3 space-y-2.5 bg-zinc-50/40">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-zinc-500">
                      خدمت {(index + 1).toLocaleString('fa-IR')}
                    </span>
                    {services.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeServiceRow(index)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-50 text-red-500"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="block text-[11px] font-medium text-zinc-500 mb-1">نام خدمت</label>
                      <div className={boxSmallClass}>
                        <input
                          type="text"
                          value={service.name}
                          onChange={(e) => updateService(index, 'name', e.target.value)}
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
                          onChange={(e) => handleServicePriceChange(index, e.target.value)}
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
                          onChange={(e) => updateService(index, 'staffName', e.target.value)}
                          className={`${fillInputClass} appearance-none pl-7`}
                        >
                          <option value="">بدون پرسنل مشخص</option>
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
                          value={service.staffPercentageDigits}
                          onChange={(e) => handleServicePercentageChange(index, e.target.value)}
                          className={`${fillInputClass} pl-1`}
                          placeholder="۰"
                        />
                        <span className="text-zinc-400 text-xs pl-2 shrink-0">٪</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addServiceRow}
              className="mt-2.5 flex items-center gap-1.5 text-xs font-medium text-[#824c71]"
            >
              <Plus className="w-3.5 h-3.5" /> افزودن خدمت دیگر
            </button>
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