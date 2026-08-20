// components/booking/EditBookingModal.tsx
'use client';

import { useState, useEffect } from 'react';
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

const formatMoney = (n: number) => n.toLocaleString('fa-IR');

const boxSmallClass =
  'w-full h-10 box-border flex items-center border border-zinc-200 rounded-lg bg-white focus-within:ring-1 focus-within:ring-[#824c71]/40 focus-within:border-[#824c71] overflow-hidden';
const fillInputClass = 'w-full h-full bg-transparent outline-none border-0 px-3 text-sm';

export default function EditBookingModal({ isOpen, onClose, onSaved, booking }: EditBookingModalProps) {
  const [service, setService] = useState<ServiceRow>(emptyService());
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

  useEffect(() => {
    if (!isOpen || !booking) return;
    const s = booking.services[0];
    setService(
      s
        ? {
            name: s.name,
            priceDigits: s.price ? String(s.price) : '',
            staffName: s.staffName || '',
            staffPercentageDigits: s.staffPercentage ? String(s.staffPercentage) : '',
          }
        : emptyService()
    );
    setError('');
  }, [isOpen, booking]);

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
    if (!booking) return;
    setError('');

    const name = service.name.trim();
    if (!name) {
      setError('نام خدمت را وارد کنید');
      return;
    }

    const cleanedService = {
      name,
      price: service.priceDigits ? Number(service.priceDigits) : undefined,
      staffName: service.staffName.trim() || undefined,
      staffPercentage: service.staffPercentageDigits ? Number(service.staffPercentageDigits) : undefined,
    };

    try {
      setIsSubmitting(true);

      const payload = {
        customerName: booking.customerName ?? undefined,
        customerPhone: booking.customerPhone,
        date: booking.date,
        startTime: booking.startTime,
        services: [cleanedService],
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