// components/booking/NewBookingModal.tsx
'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Loader2, ChevronDown } from 'lucide-react';
import DatePicker, { DateObject } from 'react-multi-date-picker';
import persian from 'react-date-object/calendars/persian';
import persian_fa from 'react-date-object/locales/persian_fa';

type ServiceRow = {
  name: string;
  priceDigits: string;
  staffName: string;
  staffPercentageDigits: string;
};

type StaffMember = { id: string; name: string };

// شکل داده‌ای که برای ویرایش از صفحه‌ی سالن من پاس داده می‌شود
export type BookingToEdit = {
  id: string;
  customerName: string | null;
  customerPhone: string;
  date: string; // ISO
  startTime: string;
  services: { name: string; price?: number; staffName?: string; staffPercentage?: number }[];
  depositAmount: number;
};

type NewBookingModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  bookingToEdit?: BookingToEdit | null;
};

const emptyService = (): ServiceRow => ({ name: '', priceDigits: '', staffName: '', staffPercentageDigits: '' });

const toEnglishDigits = (str: string) =>
  str
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - '۰'.charCodeAt(0)))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - '٠'.charCodeAt(0)));

const toPersianDigits = (str: string) => str.replace(/[0-9]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);

const sanitizeDigitsOnly = (value: string) => toEnglishDigits(value).replace(/[^0-9]/g, '');

const formatPriceDisplay = (rawDigits: string) => {
  if (!rawDigits) return '';
  return Number(rawDigits).toLocaleString('fa-IR');
};

const pad2 = (value: string) => value.padStart(2, '0');

const boxClass =
  'w-full h-11 box-border flex items-center border border-zinc-200 rounded-xl bg-white focus-within:ring-1 focus-within:ring-[#824c71]/40 focus-within:border-[#824c71] overflow-hidden';
const boxSmallClass =
  'w-full h-10 box-border flex items-center border border-zinc-200 rounded-lg bg-white focus-within:ring-1 focus-within:ring-[#824c71]/40 focus-within:border-[#824c71] overflow-hidden';
const fillInputClass = 'w-full h-full bg-transparent outline-none border-0 px-3 text-sm';

export default function NewBookingModal({ isOpen, onClose, onSaved, bookingToEdit }: NewBookingModalProps) {
  const isEditMode = !!bookingToEdit;

  const [customerName, setCustomerName] = useState('');
  const [customerPhoneDigits, setCustomerPhoneDigits] = useState('');
  const [dateObj, setDateObj] = useState<DateObject | null>(null);
  const [startHourDigits, setStartHourDigits] = useState('');
  const [startMinuteDigits, setStartMinuteDigits] = useState('');
  const [depositDigits, setDepositDigits] = useState('');
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

  // پر کردن فرم با داده‌ی نوبت هنگام باز شدن در حالت ویرایش
  useEffect(() => {
    if (!isOpen) return;

    if (bookingToEdit) {
      setCustomerName(bookingToEdit.customerName || '');
      setCustomerPhoneDigits(bookingToEdit.customerPhone || '');
      setDateObj(new DateObject({ date: new Date(bookingToEdit.date), calendar: persian, locale: persian_fa }));

      const [h, m] = (bookingToEdit.startTime || '').split(':');
      setStartHourDigits(h || '');
      setStartMinuteDigits(m || '');

      setDepositDigits(bookingToEdit.depositAmount ? String(bookingToEdit.depositAmount) : '');
      setServices(
        bookingToEdit.services.length > 0
          ? bookingToEdit.services.map((s) => ({
              name: s.name,
              priceDigits: s.price ? String(s.price) : '',
              staffName: s.staffName || '',
              staffPercentageDigits: s.staffPercentage ? String(s.staffPercentage) : '',
            }))
          : [emptyService()]
      );
    } else {
      resetForm();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, bookingToEdit]);

  const resetForm = () => {
    setCustomerName('');
    setCustomerPhoneDigits('');
    setDateObj(null);
    setStartHourDigits('');
    setStartMinuteDigits('');
    setDepositDigits('');
    setServices([emptyService()]);
    setError('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handlePhoneChange = (value: string) => {
    setCustomerPhoneDigits(sanitizeDigitsOnly(value).slice(0, 11));
  };

  const handleDepositChange = (value: string) => {
    setDepositDigits(sanitizeDigitsOnly(value));
  };

  const handleHourChange = (value: string) => {
    let digits = sanitizeDigitsOnly(value).slice(0, 2);
    if (digits.length === 2 && Number(digits) > 23) digits = '23';
    setStartHourDigits(digits);
  };

  const handleMinuteChange = (value: string) => {
    let digits = sanitizeDigitsOnly(value).slice(0, 2);
    if (digits.length === 2 && Number(digits) > 59) digits = '59';
    setStartMinuteDigits(digits);
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
    setError('');

    const mobileRegex = /^09\d{9}$/;
    if (!mobileRegex.test(customerPhoneDigits)) {
      setError('شماره موبایل مشتری معتبر نیست (مثال: 09123456789)');
      return;
    }

    if (!dateObj || !startHourDigits || !startMinuteDigits) {
      setError('لطفاً تاریخ و ساعت نوبت را وارد کنید');
      return;
    }

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

      const gregorianDate = dateObj.toDate();
      const startTime = `${pad2(startHourDigits)}:${pad2(startMinuteDigits)}`;

      const payload = {
        customerName: customerName.trim() || undefined,
        customerPhone: customerPhoneDigits,
        date: gregorianDate.toISOString(),
        startTime,
        services: cleanedServices,
        depositAmount: depositDigits ? Number(depositDigits) : 0,
      };

      const res = isEditMode
        ? await fetch(`/api/booking?id=${bookingToEdit!.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch('/api/booking', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'خطا در ثبت نوبت');
        return;
      }

      resetForm();
      onSaved();
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
          <h3 className="text-base font-bold text-zinc-900">
            {isEditMode ? 'ویرایش نوبت' : 'ثبت نوبت جدید'}
          </h3>
          <button onClick={handleClose} className="p-1.5 text-zinc-400 bg-zinc-50 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* نام مشتری و شماره تماس، همیشه یک ردیف */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1.5">نام مشتری</label>
              <div className={boxClass}>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className={fillInputClass}
                  placeholder="اختیاری"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1.5">
                شماره موبایل <span className="text-red-500">*</span>
              </label>
              <div className={boxClass}>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={toPersianDigits(customerPhoneDigits)}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  className={fillInputClass}
                  placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                />
              </div>
            </div>
          </div>

          {/* تاریخ و ساعت، همیشه یک ردیف — ساعت به‌صورت تایپی (ساعت/دقیقه) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1.5">
                تاریخ نوبت <span className="text-red-500">*</span>
              </label>
              <div className={boxClass}>
                <DatePicker
                  value={dateObj}
                  onChange={(d) => setDateObj(d as DateObject)}
                  calendar={persian}
                  locale={persian_fa}
                  calendarPosition="bottom-right"
                  inputClass={`${fillInputClass} !h-full`}
                  containerClassName="w-full h-full block"
                  style={{ width: '100%', height: '100%' }}
                  placeholder="انتخاب تاریخ"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1.5">
                ساعت نوبت <span className="text-red-500">*</span>
              </label>
              <div className={`${boxClass} justify-center gap-1.5 px-2`} dir="ltr">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={2}
                  value={toPersianDigits(startHourDigits)}
                  onChange={(e) => handleHourChange(e.target.value)}
                  className="w-8 h-full bg-transparent outline-none border-0 text-sm text-center"
                  placeholder="۰۰"
                />
                <span className="text-zinc-400 font-bold text-sm">:</span>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={2}
                  value={toPersianDigits(startMinuteDigits)}
                  onChange={(e) => handleMinuteChange(e.target.value)}
                  className="w-8 h-full bg-transparent outline-none border-0 text-sm text-center"
                  placeholder="۰۰"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1.5">
              خدمات <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2.5">
              {services.map((service, index) => (
                <div key={index} className="relative border border-zinc-200 rounded-xl p-3 space-y-2.5 bg-zinc-50/40">
                  {services.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeServiceRow(index)}
                      className="absolute top-2.5 left-2.5 w-7 h-7 flex items-center justify-center rounded-lg bg-red-50 text-red-500 z-10"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {/* ردیف اول: نام خدمت + قیمت */}
                  <div className="pl-9 flex gap-2">
                    <div className="flex-1">
                      <label className="block text-[11px] font-medium text-zinc-500 mb-1">
                        نام خدمت {(index + 1).toLocaleString('fa-IR')}
                      </label>
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

                  {/* ردیف دوم: پرسنل + درصد پرسنل */}
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
                    <div className="w-24 shrink-0">
                      <label className="block text-[11px] font-medium text-zinc-500 mb-1">درصد پرسنل</label>
                      <div className={boxSmallClass}>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={toPersianDigits(service.staffPercentageDigits)}
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

          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1.5">مبلغ بیعانه (تومان)</label>
            <div className={boxClass}>
              <input
                type="text"
                inputMode="numeric"
                value={formatPriceDisplay(depositDigits)}
                onChange={(e) => handleDepositChange(e.target.value)}
                className={fillInputClass}
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
            {isSubmitting
              ? isEditMode ? 'در حال ذخیره...' : 'در حال ثبت...'
              : isEditMode ? 'ذخیره تغییرات' : 'ثبت نوبت'}
          </button>
        </div>
      </div>
    </div>
  );
}