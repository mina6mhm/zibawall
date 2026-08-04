// components/booking/ServiceItemFormModal.tsx
'use client';

import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';

type ItemToEdit = { id: string; name: string; durationMinutes: number; price: number | null } | null;

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  categoryId: string;
  itemToEdit?: ItemToEdit;
};

const sanitizeDigits = (v: string) => v.replace(/[^0-9]/g, '');

export default function ServiceItemFormModal({ isOpen, onClose, onSaved, categoryId, itemToEdit }: Props) {
  const [name, setName] = useState('');
  const [durationDigits, setDurationDigits] = useState('');
  const [priceDigits, setPriceDigits] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setError('');
    setName(itemToEdit?.name || '');
    setDurationDigits(itemToEdit?.durationMinutes ? String(itemToEdit.durationMinutes) : '');
    setPriceDigits(itemToEdit?.price ? String(itemToEdit.price) : '');
  }, [isOpen, itemToEdit]);

  const handleSubmit = async () => {
    setError('');
    if (!name.trim()) return setError('نام خدمت را وارد کنید');
    if (!durationDigits || Number(durationDigits) <= 0) return setError('مدت‌زمان باید بزرگ‌تر از صفر باشد');

    setIsSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        durationMinutes: Number(durationDigits),
        price: priceDigits ? Number(priceDigits) : undefined,
        ...(itemToEdit ? { id: itemToEdit.id } : { categoryId }),
      };
      const res = await fetch('/api/salon/service-items', {
        method: itemToEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'خطا در ذخیره‌سازی');
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl p-5 pb-8 sm:pb-5 animate-in slide-in-from-bottom-2" onClick={(e) => e.stopPropagation()} dir="rtl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-base font-bold text-zinc-900">{itemToEdit ? 'ویرایش خدمت' : 'خدمت جدید'}</h3>
          <button onClick={onClose} className="p-1.5 text-zinc-400 bg-zinc-50 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3.5">
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1.5">نام خدمت</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثلاً کاشت ناخن"
              className="w-full h-11 border border-zinc-200 rounded-xl px-3 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1.5">مدت‌زمان (دقیقه)</label>
              <input
                type="text"
                inputMode="numeric"
                value={durationDigits}
                onChange={(e) => setDurationDigits(sanitizeDigits(e.target.value))}
                placeholder="مثلاً ۱۲۰"
                className="w-full h-11 border border-zinc-200 rounded-xl px-3 text-sm"
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1.5">قیمت (اختیاری)</label>
              <input
                type="text"
                inputMode="numeric"
                value={priceDigits}
                onChange={(e) => setPriceDigits(sanitizeDigits(e.target.value))}
                placeholder="تومان"
                className="w-full h-11 border border-zinc-200 rounded-xl px-3 text-sm"
                dir="ltr"
              />
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
            ذخیره
          </button>
        </div>
      </div>
    </div>
  );
}