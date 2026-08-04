// components/booking/BlockTimeModal.tsx
'use client';

import { useEffect, useState } from 'react';
import { X, Loader2, Ban, ChevronDown } from 'lucide-react';

type StaffMember = { id: string; name: string };

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  date: string; // "YYYY-MM-DD"
  dayLabel: string;
  prefillStartTime?: string;
};

export default function BlockTimeModal({ isOpen, onClose, onSaved, date, dayLabel, prefillStartTime }: Props) {
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [staffName, setStaffName] = useState('');
  const [reason, setReason] = useState('');
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setError('');
    setStartTime(prefillStartTime || '');
    setEndTime('');
    setStaffName('');
    setReason('');
    fetch('/api/staff')
      .then((res) => (res.ok ? res.json() : { staff: [] }))
      .then((data) => setStaffList(data.staff || []))
      .catch(() => setStaffList([]));
  }, [isOpen, prefillStartTime]);

  const handleSubmit = async () => {
    setError('');
    if (!startTime || !endTime || startTime >= endTime) {
      setError('لطفاً بازه‌ی زمانی معتبر وارد کنید (ساعت پایان باید بعد از شروع باشد)');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/salon/time-blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          startTime,
          endTime,
          staffName: staffName || undefined,
          reason: reason || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'خطا در ثبت مسدودی');
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
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl p-5 pb-8 sm:pb-5 animate-in slide-in-from-bottom-2"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-base font-bold text-zinc-900 flex items-center gap-2">
              <Ban className="w-4.5 h-4.5 text-red-500" /> مسدود کردن بازه‌ی زمانی
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">{dayLabel}</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-zinc-400 bg-zinc-50 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3.5">
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1.5">از ساعت</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full h-10 border border-zinc-200 rounded-lg px-2 text-sm text-center"
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1.5">تا ساعت</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full h-10 border border-zinc-200 rounded-lg px-2 text-sm text-center"
                dir="ltr"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1.5">مخصوص کدام پرسنل؟ (اختیاری)</label>
            <div className="relative">
              <select
                value={staffName}
                onChange={(e) => setStaffName(e.target.value)}
                className="w-full h-10 border border-zinc-200 rounded-lg px-3 text-sm appearance-none pl-7"
              >
                <option value="">کل سالن</option>
                {staffList.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1.5">دلیل (اختیاری)</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="مثلاً مرخصی، کار شخصی..."
              className="w-full h-10 border border-zinc-200 rounded-lg px-3 text-sm"
            />
          </div>

          {error && <p className="text-red-600 text-xs font-medium">{error}</p>}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full bg-red-500 hover:bg-red-600 text-white rounded-xl py-3 text-sm font-bold transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            مسدود کن
          </button>
        </div>
      </div>
    </div>
  );
}