//components/business/CreateVisitModal.tsx
'use client';

import React, { useState } from 'react';
import { X, Plus, Trash2, Loader2 } from 'lucide-react';

type ServiceRow = { name: string; price: string; staffName: string; staffPercent: string };

export default function CreateVisitModal({
  isOpen,
  onClose,
  onCreated,
  userPhone,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  userPhone: string;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [visitDate, setVisitDate] = useState('');
  const [checkInTime, setCheckInTime] = useState('');
  const [checkOutTime, setCheckOutTime] = useState('');
  const [services, setServices] = useState<ServiceRow[]>([
    { name: '', price: '', staffName: '', staffPercent: '' },
  ]);

  if (!isOpen) return null;

  const addRow = () => setServices([...services, { name: '', price: '', staffName: '', staffPercent: '' }]);
  const removeRow = (i: number) => {
    if (services.length > 1) setServices(services.filter((_, idx) => idx !== i));
  };
  const updateRow = (i: number, field: keyof ServiceRow, value: string) => {
    const updated = [...services];
    updated[i] = { ...updated[i], [field]: value };
    setServices(updated);
  };

  const totalAmount = services.reduce((sum, s) => sum + (Number(s.price) || 0), 0);

  const resetForm = () => {
    setCustomerPhone('');
    setCustomerName('');
    setVisitDate('');
    setCheckInTime('');
    setCheckOutTime('');
    setServices([{ name: '', price: '', staffName: '', staffPercent: '' }]);
  };

  const handleSubmit = async () => {
    if (!customerPhone.trim() || !visitDate) {
      alert('شماره مشتری و تاریخ مراجعه الزامی است.');
      return;
    }
    const validServices = services.filter((s) => s.name.trim() && Number(s.price) > 0);
    if (validServices.length === 0) {
      alert('حداقل یک خدمت معتبر وارد کنید.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/visit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userPhone,
          customerPhone: customerPhone.trim(),
          customerName: customerName.trim() || undefined,
          visitDate,
          checkInTime: checkInTime || undefined,
          checkOutTime: checkOutTime || undefined,
          services: validServices.map((s) => ({
            name: s.name.trim(),
            price: Number(s.price),
            staffName: s.staffName.trim() || undefined,
            staffPercent: s.staffPercent ? Number(s.staffPercent) : 0,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'خطا در ثبت مراجعه');

      resetForm();
      onCreated();
      onClose();
    } catch (error: any) {
      alert(error.message || 'خطایی رخ داد.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 backdrop-blur-sm px-0 md:px-4">
      <div className="bg-white w-full md:max-w-lg md:rounded-3xl rounded-t-3xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white flex items-center justify-between px-5 py-4 border-b border-zinc-100">
          <h2 className="text-sm font-bold text-zinc-900">ثبت مراجعه جدید</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg bg-zinc-100 text-zinc-500 hover:bg-zinc-200 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1.5">شماره موبایل مشتری *</label>
              <input
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value.replace(/[^0-9]/g, ''))}
                dir="ltr"
                placeholder="09xxxxxxxxx"
                className="w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm text-left focus:border-[#824c71] focus:ring-2 focus:ring-[#824c71]/10 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1.5">نام مشتری</label>
              <input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm focus:border-[#824c71] focus:ring-2 focus:ring-[#824c71]/10 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1.5">تاریخ مراجعه *</label>
              <input
                type="date"
                value={visitDate}
                onChange={(e) => setVisitDate(e.target.value)}
                className="w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm focus:border-[#824c71] focus:ring-2 focus:ring-[#824c71]/10 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1.5">ساعت ورود</label>
              <input
                type="time"
                value={checkInTime}
                onChange={(e) => setCheckInTime(e.target.value)}
                className="w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm focus:border-[#824c71] focus:ring-2 focus:ring-[#824c71]/10 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1.5">ساعت خروج</label>
              <input
                type="time"
                value={checkOutTime}
                onChange={(e) => setCheckOutTime(e.target.value)}
                className="w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm focus:border-[#824c71] focus:ring-2 focus:ring-[#824c71]/10 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-2">خدمات انجام‌شده *</label>
            <div className="space-y-3">
              {services.map((s, i) => (
                <div key={i} className="border border-zinc-100 rounded-xl p-3 space-y-2 bg-zinc-50/50">
                  <div className="flex items-center gap-2">
                    <input
                      value={s.name}
                      onChange={(e) => updateRow(i, 'name', e.target.value)}
                      placeholder="نام خدمت (مثلاً میکاپ)"
                      className="flex-1 border border-zinc-200 rounded-lg px-3 py-2 text-sm bg-white focus:border-[#824c71] outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => removeRow(i)}
                      disabled={services.length === 1}
                      className="w-8 h-8 flex items-center justify-center rounded-lg bg-white text-zinc-400 hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-30 shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      value={s.price}
                      onChange={(e) => updateRow(i, 'price', e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="هزینه (تومان)"
                      dir="ltr"
                      className="border border-zinc-200 rounded-lg px-3 py-2 text-sm bg-white text-left focus:border-[#824c71] outline-none"
                    />
                    <input
                      value={s.staffName}
                      onChange={(e) => updateRow(i, 'staffName', e.target.value)}
                      placeholder="نام پرسنل"
                      className="border border-zinc-200 rounded-lg px-3 py-2 text-sm bg-white focus:border-[#824c71] outline-none"
                    />
                    <input
                      value={s.staffPercent}
                      onChange={(e) => updateRow(i, 'staffPercent', e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="درصد پرسنل"
                      dir="ltr"
                      className="border border-zinc-200 rounded-lg px-3 py-2 text-sm bg-white text-left focus:border-[#824c71] outline-none"
                    />
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addRow}
              className="mt-2.5 flex items-center gap-1.5 text-sm font-medium text-[#824c71] hover:text-[#6d3f5e] transition-colors"
            >
              <Plus className="w-4 h-4" /> افزودن خدمت دیگر
            </button>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-zinc-100">
            <span className="text-sm font-medium text-zinc-500">مبلغ کل</span>
            <span className="text-base font-bold text-[#824c71]">{totalAmount.toLocaleString('fa-IR')} تومان</span>
          </div>

          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full bg-[#824c71] text-white py-3 rounded-xl text-sm font-bold hover:bg-[#6d3f5e] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {isSubmitting ? 'در حال ثبت...' : 'ثبت مراجعه'}
          </button>
        </div>
      </div>
    </div>
  );
}