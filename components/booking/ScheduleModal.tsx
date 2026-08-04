// components/booking/ScheduleModal.tsx
'use client';

import { useEffect, useState } from 'react';
import { X, Loader2, Clock } from 'lucide-react';

type DayRow = { dayOfWeek: number; label: string; isOpen: boolean; openTime: string; closeTime: string };

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
};

export default function ScheduleModal({ isOpen, onClose, onSaved }: Props) {
  const [days, setDays] = useState<DayRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setError('');
    setIsLoading(true);
    fetch('/api/salon/schedule')
      .then((res) => res.json())
      .then((data) => setDays(data.days || []))
      .catch(() => setError('خطا در دریافت ساعات کاری'))
      .finally(() => setIsLoading(false));
  }, [isOpen]);

  const updateDay = (index: number, patch: Partial<DayRow>) => {
    setDays((prev) => prev.map((d, i) => (i === index ? { ...d, ...patch } : d)));
  };

  const handleSave = async () => {
    setError('');
    setIsSaving(true);
    try {
      const res = await fetch('/api/salon/schedule', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'خطا در ذخیره ساعات کاری');
        return;
      }
      onSaved();
      onClose();
    } catch {
      setError('خطای ارتباط با سرور');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 pb-8 sm:pb-5 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom-2"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-base font-bold text-zinc-900 flex items-center gap-2">
            <Clock className="w-4.5 h-4.5 text-[#824c71]" /> ساعات کاری هفتگی
          </h3>
          <button onClick={onClose} className="p-1.5 text-zinc-400 bg-zinc-50 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-6 h-6 text-[#824c71] animate-spin" />
          </div>
        ) : (
          <div className="space-y-2.5">
            {days.map((day, index) => (
              <div key={day.dayOfWeek} className="flex items-center gap-2 bg-zinc-50 rounded-xl p-2.5">
                <button
                  type="button"
                  onClick={() => updateDay(index, { isOpen: !day.isOpen })}
                  className={`w-16 shrink-0 text-[11px] font-bold py-2 rounded-lg transition-colors ${
                    day.isOpen ? 'bg-[#824c71] text-white' : 'bg-zinc-200 text-zinc-500'
                  }`}
                >
                  {day.isOpen ? 'باز' : 'تعطیل'}
                </button>
                <span className="w-14 shrink-0 text-xs font-medium text-zinc-700">{day.label}</span>
                <input
                  type="time"
                  value={day.openTime}
                  disabled={!day.isOpen}
                  onChange={(e) => updateDay(index, { openTime: e.target.value })}
                  className="flex-1 h-9 border border-zinc-200 rounded-lg px-2 text-xs text-center disabled:opacity-40 disabled:bg-zinc-100"
                  dir="ltr"
                />
                <span className="text-zinc-400 text-xs shrink-0">تا</span>
                <input
                  type="time"
                  value={day.closeTime}
                  disabled={!day.isOpen}
                  onChange={(e) => updateDay(index, { closeTime: e.target.value })}
                  className="flex-1 h-9 border border-zinc-200 rounded-lg px-2 text-xs text-center disabled:opacity-40 disabled:bg-zinc-100"
                  dir="ltr"
                />
              </div>
            ))}
          </div>
        )}

        {error && <p className="text-red-600 text-xs font-medium mt-3">{error}</p>}

        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving || isLoading}
          className="w-full mt-5 bg-[#824c71] hover:bg-[#6d3f5e] text-white rounded-xl py-3 text-sm font-bold transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
          ذخیره ساعات کاری
        </button>
      </div>
    </div>
  );
}