// components/booking/CategoryFormModal.tsx
'use client';

import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';

type CategoryToEdit = { id: string; title: string; depositAmount: number } | null;

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  categoryToEdit?: CategoryToEdit;
};

const sanitizeDigits = (v: string) => v.replace(/[^0-9]/g, '');

export default function CategoryFormModal({ isOpen, onClose, onSaved, categoryToEdit }: Props) {
  const [title, setTitle] = useState('');
  const [depositDigits, setDepositDigits] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setError('');
    setTitle(categoryToEdit?.title || '');
    setDepositDigits(categoryToEdit?.depositAmount ? String(categoryToEdit.depositAmount) : '');
  }, [isOpen, categoryToEdit]);

  const handleSubmit = async () => {
    setError('');
    if (!title.trim()) {
      setError('عنوان دسته‌بندی را وارد کنید');
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = {
        title: title.trim(),
        depositAmount: depositDigits ? Number(depositDigits) : 0,
        ...(categoryToEdit ? { id: categoryToEdit.id } : {}),
      };
      const res = await fetch('/api/salon/booking-categories', {
        method: categoryToEdit ? 'PUT' : 'POST',
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
    <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl p-5 pb-8 sm:pb-5 animate-in slide-in-from-bottom-2" onClick={(e) => e.stopPropagation()} dir="rtl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-base font-bold text-zinc-900">{categoryToEdit ? 'ویرایش دسته‌بندی' : 'دسته‌بندی جدید'}</h3>
          <button onClick={onClose} className="p-1.5 text-zinc-400 bg-zinc-50 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3.5">
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1.5">عنوان دسته‌بندی</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثلاً خدمات ناخن"
              className="w-full h-11 border border-zinc-200 rounded-xl px-3 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1.5">بیعانه‌ی این دسته (تومان)</label>
            <input
              type="text"
              inputMode="numeric"
              value={depositDigits}
              onChange={(e) => setDepositDigits(sanitizeDigits(e.target.value))}
              placeholder="مثلاً ۱۰۰۰۰۰"
              className="w-full h-11 border border-zinc-200 rounded-xl px-3 text-sm"
              dir="ltr"
            />
            <p className="text-[11px] text-zinc-400 mt-1">مشتری هنگام رزرو آنلاین این مبلغ را به‌عنوان بیعانه پرداخت می‌کند.</p>
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