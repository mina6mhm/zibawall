// components/booking/NewBookingModal.tsx
'use client';

import { useState } from 'react';
import { X, Plus, Trash2, Loader2 } from 'lucide-react';

type ServiceRow = {
  name: string;
  price: string; // به‌صورت رشته نگه داشته میشه تا ورودی فرم راحت‌تر مدیریت بشه
};

type NewBookingModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
};

export default function NewBookingModal({ isOpen, onClose, onCreated }: NewBookingModalProps) {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [staffName, setStaffName] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [services, setServices] = useState<ServiceRow[]>([{ name: '', price: '' }]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const toEnglishDigits = (str: string) =>
    str
      .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - '۰'.charCodeAt(0)))
      .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - '٠'.charCodeAt(0)));

  const resetForm = () => {
    setCustomerName('');
    setCustomerPhone('');
    setDate('');
    setStartTime('');
    setStaffName('');
    setDepositAmount('');
    setServices([{ name: '', price: '' }]);
    setError('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleServiceChange = (index: number, field: 'name' | 'price', value: string) => {
    setServices((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addServiceRow = () => setServices((prev) => [...prev, { name: '', price: '' }]);

  const removeServiceRow = (index: number) => {
    setServices((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  };

  const handleSubmit = async () => {
    setError('');

    const normalizedPhone = toEnglishDigits(customerPhone.trim());
    const mobileRegex = /^09\d{9}$/;

    if (!mobileRegex.test(normalizedPhone)) {
      setError('شماره موبایل مشتری معتبر نیست (مثال: 09123456789)');
      return;
    }

    if (!date || !startTime) {
      setError('لطفاً تاریخ و ساعت نوبت را وارد کنید');
      return;
    }

    const cleanedServices = services
      .map((s) => ({
        name: s.name.trim(),
        price: s.price.trim() ? Number(toEnglishDigits(s.price.trim())) : undefined,
      }))
      .filter((s) => s.name !== '');

    if (cleanedServices.length === 0) {
      setError('حداقل یک خدمت را وارد کنید');
      return;
    }

    try {
      setIsSubmitting(true);

      const res = await fetch('/api/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: customerName.trim() || undefined,
          customerPhone: normalizedPhone,
          date,
          startTime,
          services: cleanedServices,
          staffName: staffName.trim() || undefined,
          depositAmount: depositAmount.trim() ? Number(toEnglishDigits(depositAmount.trim())) : 0,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'خطا در ثبت نوبت');
        return;
      }

      resetForm();
      onCreated();
      onClose();
    } catch {
      setError('خطای ارتباط با سرور');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

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
          <h3 className="text-base font-bold text-zinc-900">ثبت نوبت جدید</h3>
          <button onClick={handleClose} className="p-1.5 text-zinc-400 bg-zinc-50 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* نام و شماره مشتری */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1.5">نام مشتری</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#824c71]/40 focus:border-[#824c71]"
                placeholder="اختیاری"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1.5">
                شماره موبایل مشتری <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                dir="ltr"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm text-left focus:outline-none focus:ring-1 focus:ring-[#824c71]/40 focus:border-[#824c71]"
                placeholder="09123456789"
              />
            </div>
          </div>

          {/* تاریخ و ساعت */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1.5">
                تاریخ نوبت <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#824c71]/40 focus:border-[#824c71]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1.5">
                ساعت نوبت <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#824c71]/40 focus:border-[#824c71]"
              />
            </div>
          </div>

          {/* خدمات */}
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1.5">
              خدمات <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2">
              {services.map((service, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={service.name}
                    onChange={(e) => handleServiceChange(index, 'name', e.target.value)}
                    className="flex-1 border border-zinc-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#824c71]/40 focus:border-[#824c71]"
                    placeholder="نام خدمت (مثلاً کراتین مو)"
                  />
                  <input
                    type="text"
                    inputMode="numeric"
                    value={service.price}
                    onChange={(e) => handleServiceChange(index, 'price', e.target.value)}
                    className="w-28 border border-zinc-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#824c71]/40 focus:border-[#824c71]"
                    placeholder="قیمت (اختیاری)"
                  />
                  {services.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeServiceRow(index)}
                      className="shrink-0 w-9 h-9 flex items-center justify-center rounded-xl bg-red-50 text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addServiceRow}
              className="mt-2 flex items-center gap-1.5 text-xs font-medium text-[#824c71]"
            >
              <Plus className="w-3.5 h-3.5" /> افزودن خدمت دیگر
            </button>
          </div>

          {/* پرسنل و بیعانه */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1.5">اسم پرسنل</label>
              <input
                type="text"
                value={staffName}
                onChange={(e) => setStaffName(e.target.value)}
                className="w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#824c71]/40 focus:border-[#824c71]"
                placeholder="اختیاری"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1.5">
                مبلغ بیعانه (تومان)
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                className="w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#824c71]/40 focus:border-[#824c71]"
                placeholder="اگر بیعانه نمی‌خواهید خالی بگذارید"
              />
            </div>
          </div>

          <p className="text-[11px] text-zinc-400 bg-zinc-50 rounded-lg p-2.5 leading-relaxed">
            علاوه بر بیعانه، مبلغ ۲۰,۰۰۰ تومان به‌عنوان هزینه‌ی خدمات پلتفرم به مبلغ نهایی قابل پرداخت توسط مشتری اضافه می‌شود.
          </p>

          {error && <p className="text-red-600 text-xs font-medium">{error}</p>}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full bg-[#824c71] hover:bg-[#6d3f5e] text-white rounded-xl py-3 text-sm font-bold transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {isSubmitting ? 'در حال ثبت...' : 'ثبت نوبت'}
          </button>
        </div>
      </div>
    </div>
  );
}