// components/business/ManualBookingModal.tsx
'use client';

import React, { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import DatePicker, { DateObject } from 'react-multi-date-picker';
import persian from 'react-date-object/calendars/persian';
import persian_fa from 'react-date-object/locales/persian_fa';

type BookingService = { id: string; name: string; durationMinutes: number; price: number | null };
type BookingCategory = { id: string; name: string; services: BookingService[] };
type StaffMember = { id: string; name: string; categories: { id: string; name: string }[] };

const toEnglishDigits = (value: string) => {
  const p = '۰۱۲۳۴۵۶۷۸۹';
  const a = '٠١٢٣٤٥٦٧٨٩';
  return value.split('').map((ch) => {
    const pi = p.indexOf(ch);
    if (pi !== -1) return String(pi);
    const ai = a.indexOf(ch);
    if (ai !== -1) return String(ai);
    return ch;
  }).join('');
};
const sanitizeDigits = (v: string) => toEnglishDigits(v).replace(/[^0-9]/g, '');

export default function ManualBookingModal({
  isOpen,
  onClose,
  onCreated,
  userPhone,
  categories,
  staffList,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  userPhone: string;
  categories: BookingCategory[];
  staffList: StaffMember[];
}) {
  const [mode, setMode] = useState<'MANUAL' | 'BLOCKED'>('MANUAL');
  const [categoryId, setCategoryId] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [staffId, setStaffId] = useState('');
  const [dateObj, setDateObj] = useState<DateObject | null>(null);
  const [startTime, setStartTime] = useState('');
  const [customDuration, setCustomDuration] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const selectedCategory = categories.find((c) => c.id === categoryId);
  const selectedService = selectedCategory?.services.find((s) => s.id === serviceId);
  const availableStaff = categoryId ? staffList.filter((s) => s.categories.some((c) => c.id === categoryId)) : staffList;

  const reset = () => {
    setMode('MANUAL');
    setCategoryId('');
    setServiceId('');
    setStaffId('');
    setDateObj(null);
    setStartTime('');
    setCustomDuration('');
    setCustomerName('');
    setCustomerPhone('');
  };

  const handleSubmit = async () => {
    if (!dateObj || !startTime) {
      alert('تاریخ و ساعت شروع الزامی است.');
      return;
    }
    const duration = mode === 'BLOCKED' ? Number(sanitizeDigits(customDuration)) : selectedService?.durationMinutes;
    if (!duration || duration <= 0) {
      alert(mode === 'BLOCKED' ? 'مدت‌زمان مسدودسازی را وارد کنید.' : 'یک ریزخدمت انتخاب کنید.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userPhone,
          source: mode,
          staffId: staffId || undefined,
          categoryId: mode === 'MANUAL' ? categoryId || undefined : undefined,
          serviceId: mode === 'MANUAL' ? serviceId || undefined : undefined,
          categoryName: selectedCategory?.name,
          serviceName: selectedService?.name,
          durationMinutes: duration,
          price: selectedService?.price || undefined,
          date: dateObj.toDate().toISOString(),
          startTime,
          customerName: mode === 'MANUAL' ? customerName.trim() || undefined : undefined,
          customerPhone: mode === 'MANUAL' ? sanitizeDigits(customerPhone) || undefined : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'خطا در ثبت نوبت');

      reset();
      onCreated();
      onClose();
    } catch (error: any) {
      alert(error.message || 'خطایی رخ داد.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/40 backdrop-blur-sm px-0 md:px-4">
      <div className="bg-white w-full md:max-w-lg md:rounded-3xl rounded-t-3xl max-h-[85vh] flex flex-col">
        <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-zinc-100">
          <h2 className="text-sm font-bold text-zinc-900">ثبت نوبت دستی / مسدودسازی زمان</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg bg-zinc-100 text-zinc-500">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto p-5 space-y-4">
          <div className="flex items-center gap-1.5 bg-zinc-50 rounded-xl p-1.5">
            <button
              onClick={() => setMode('MANUAL')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors ${mode === 'MANUAL' ? 'bg-white text-[#824c71] shadow-sm' : 'text-zinc-500'}`}
            >
              ثبت نوبت دستی
            </button>
            <button
              onClick={() => setMode('BLOCKED')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors ${mode === 'BLOCKED' ? 'bg-white text-[#824c71] shadow-sm' : 'text-zinc-500'}`}
            >
              مسدودسازی زمان
            </button>
          </div>

          {mode === 'MANUAL' && (
            <>
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1.5">دسته خدمت</label>
                <select
                  value={categoryId}
                  onChange={(e) => { setCategoryId(e.target.value); setServiceId(''); }}
                  className="w-full border border-zinc-200 rounded-xl px-3.5 py-2.5 text-sm outline-none"
                >
                  <option value="">انتخاب کنید</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              {selectedCategory && (
                <div>
                  <label className="block text-xs font-medium text-zinc-500 mb-1.5">ریزخدمت</label>
                  <select
                    value={serviceId}
                    onChange={(e) => setServiceId(e.target.value)}
                    className="w-full border border-zinc-200 rounded-xl px-3.5 py-2.5 text-sm outline-none"
                  >
                    <option value="">انتخاب کنید</option>
                    {selectedCategory.services.map((s) => (
                      <option key={s.id} value={s.id}>{s.name} ({s.durationMinutes} دقیقه)</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="نام مشتری (اختیاری)"
                  className="border border-zinc-200 rounded-xl px-3.5 py-2.5 text-sm outline-none"
                />
                <input
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(sanitizeDigits(e.target.value))}
                  placeholder="شماره مشتری (اختیاری)"
                  dir="ltr"
                  inputMode="numeric"
                  className="border border-zinc-200 rounded-xl px-3.5 py-2.5 text-sm text-left outline-none"
                />
              </div>
            </>
          )}

          {mode === 'BLOCKED' && (
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1.5">مدت‌زمان مسدودسازی (دقیقه) *</label>
              <input
                value={customDuration}
                onChange={(e) => setCustomDuration(sanitizeDigits(e.target.value))}
                placeholder="مثلاً 60"
                dir="ltr"
                inputMode="numeric"
                className="w-full border border-zinc-200 rounded-xl px-3.5 py-2.5 text-sm text-left outline-none"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1.5">پرسنل (اختیاری)</label>
            <select
              value={staffId}
              onChange={(e) => setStaffId(e.target.value)}
              className="w-full border border-zinc-200 rounded-xl px-3.5 py-2.5 text-sm outline-none"
            >
              <option value="">بدون پرسنل خاص</option>
              {availableStaff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1.5">تاریخ *</label>
              <DatePicker
                value={dateObj}
                onChange={(d) => setDateObj(d as DateObject)}
                calendar={persian}
                locale={persian_fa}
                calendarPosition="bottom-right"
                inputClass="w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm outline-none"
                containerClassName="w-full"
                placeholder="انتخاب تاریخ"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1.5">ساعت شروع *</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm outline-none"
              />
            </div>
          </div>
        </div>

        <div className="shrink-0 p-5 pt-3 border-t border-zinc-100">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full bg-[#824c71] text-white py-3 rounded-2xl text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {isSubmitting ? 'در حال ثبت...' : 'ثبت'}
          </button>
        </div>
      </div>
    </div>
  );
}