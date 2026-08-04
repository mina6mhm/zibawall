// components/booking/StaffShareModal.tsx
'use client';

import { X, Users } from 'lucide-react';

type StaffShareRow = { name: string; amount: number };

type StaffShareModalProps = {
  isOpen: boolean;
  onClose: () => void;
  staffBreakdown: StaffShareRow[];
  total: number;
  dayLabel: string;
};

export default function StaffShareModal({ isOpen, onClose, staffBreakdown, total, dayLabel }: StaffShareModalProps) {
  if (!isOpen) return null;

  const formatMoney = (amount: number) => amount.toLocaleString('fa-IR');

  return (
    <div
      className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl p-5 pb-8 sm:pb-5 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-base font-bold text-zinc-900">سهم پرسنل</h3>
            <p className="text-xs text-zinc-400 mt-0.5">{dayLabel}</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-zinc-400 bg-zinc-50 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        {staffBreakdown.length === 0 ? (
          <div className="text-center py-10 bg-zinc-50 rounded-2xl">
            <Users className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
            <p className="text-zinc-400 text-sm">برای این روز سهمی ثبت نشده است.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {staffBreakdown.map((row) => (
              <div
                key={row.name}
                className="flex items-center justify-between bg-zinc-50 rounded-xl p-3 border border-zinc-100"
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-[#824c71]/10 text-[#824c71] flex items-center justify-center text-xs font-bold shrink-0">
                    {row.name.slice(0, 1)}
                  </div>
                  <span className="text-sm font-medium text-zinc-700">{row.name}</span>
                </div>
                <span className="text-sm font-bold text-zinc-800">{formatMoney(row.amount)} تومان</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between border-t border-zinc-100 mt-4 pt-3.5">
          <span className="text-xs font-bold text-zinc-500">جمع کل سهم پرسنل</span>
          <span className="text-sm font-bold text-[#824c71]">{formatMoney(total)} تومان</span>
        </div>
      </div>
    </div>
  );
}
