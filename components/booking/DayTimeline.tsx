// components/booking/DayTimeline.tsx
'use client';

import { useMemo } from 'react';
import { Ban, Plus } from 'lucide-react';

export type TimelineBooking = {
  id: string;
  startTime: string; // "HH:MM"
  durationMinutes: number;
  title: string; // معمولاً نام مشتری
  subtitle?: string; // معمولاً خلاصه‌ی خدمات
  status: 'PENDING_PAYMENT' | 'CONFIRMED' | 'CANCELLED';
  source: 'ONLINE' | 'MANUAL';
};

export type TimelineBlock = {
  id: string;
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM"
  staffName?: string | null;
  reason?: string | null;
};

type Props = {
  openTime: string; // "10:00"
  closeTime: string; // "20:00"
  isDayOpen: boolean;
  bookings: TimelineBooking[];
  blocks: TimelineBlock[];
  onEmptySlotClick: (time: string) => void;
  onBookingClick: (booking: TimelineBooking) => void;
  onBlockClick: (block: TimelineBlock) => void;
};

const PX_PER_MINUTE = 1.4;
const GRID_STEP_MINUTES = 30;

function timeToMinutes(t: string) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
}
function minutesToTime(total: number) {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

const STATUS_STYLES: Record<TimelineBooking['status'], string> = {
  PENDING_PAYMENT: 'bg-amber-50 border-amber-300 text-amber-800',
  CONFIRMED: 'bg-emerald-50 border-emerald-300 text-emerald-800',
  CANCELLED: 'bg-zinc-100 border-zinc-300 text-zinc-400 line-through',
};

export default function DayTimeline({
  openTime,
  closeTime,
  isDayOpen,
  bookings,
  blocks,
  onEmptySlotClick,
  onBookingClick,
  onBlockClick,
}: Props) {
  const startMin = timeToMinutes(openTime);
  const endMin = timeToMinutes(closeTime);
  const totalMinutes = Math.max(endMin - startMin, GRID_STEP_MINUTES);

  const gridLines = useMemo(() => {
    const lines: number[] = [];
    for (let m = startMin; m <= endMin; m += GRID_STEP_MINUTES) lines.push(m);
    return lines;
  }, [startMin, endMin]);

  const activeBookings = bookings.filter((b) => b.status !== 'CANCELLED');

  if (!isDayOpen) {
    return (
      <div className="bg-zinc-50 border border-dashed border-zinc-200 rounded-2xl py-14 text-center">
        <p className="text-zinc-400 text-sm font-medium">طبق ساعات کاری تنظیم‌شده، سالن در این روز تعطیل است.</p>
      </div>
    );
  }

  return (
    <div className="relative bg-white border border-zinc-100 rounded-2xl shadow-sm shadow-zinc-200/50 overflow-hidden">
      <div className="relative" style={{ height: totalMinutes * PX_PER_MINUTE }}>
        {/* خطوط راهنمای ساعت */}
        {gridLines.map((m) => (
          <div
            key={`line-${m}`}
            className="absolute left-0 right-0 border-t border-zinc-100"
            style={{ top: (m - startMin) * PX_PER_MINUTE }}
          >
            <span className="text-[10px] text-zinc-400 font-medium px-2 -translate-y-1/2 inline-block bg-white relative z-[1]">
              {minutesToTime(m)}
            </span>
          </div>
        ))}

        {/* نواحی خالیِ قابل‌کلیک برای ثبت نوبت جدید */}
        {gridLines.slice(0, -1).map((m) => (
          <button
            key={`slot-${m}`}
            type="button"
            onClick={() => onEmptySlotClick(minutesToTime(m))}
            className="absolute right-14 left-2 group flex items-center justify-end"
            style={{ top: (m - startMin) * PX_PER_MINUTE, height: GRID_STEP_MINUTES * PX_PER_MINUTE }}
          >
            <span className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-[11px] font-medium text-[#824c71] bg-[#824c71]/[0.06] px-2.5 py-1 rounded-lg">
              <Plus className="w-3 h-3" /> ثبت نوبت در {minutesToTime(m)}
            </span>
          </button>
        ))}

        {/* بازه‌های مسدود شده توسط سالن‌دار */}
        {blocks.map((block) => {
          const s = timeToMinutes(block.startTime);
          const e = timeToMinutes(block.endTime);
          return (
            <button
              key={block.id}
              type="button"
              onClick={() => onBlockClick(block)}
              className="absolute right-14 left-2 bg-zinc-100 border border-dashed border-zinc-300 rounded-lg px-2.5 flex items-center gap-1.5 text-zinc-500 hover:bg-zinc-200/70 transition-colors z-[5]"
              style={{ top: (s - startMin) * PX_PER_MINUTE + 1, height: Math.max((e - s) * PX_PER_MINUTE - 2, 22) }}
            >
              <Ban className="w-3 h-3 shrink-0" />
              <span className="text-[11px] font-medium truncate">
                مسدود{block.staffName ? ` (${block.staffName})` : ' (کل سالن)'}
                {block.reason ? ` — ${block.reason}` : ''}
              </span>
            </button>
          );
        })}

        {/* نوبت‌ها */}
        {activeBookings.map((b) => {
          const s = timeToMinutes(b.startTime);
          return (
            <button
              key={b.id}
              type="button"
              onClick={() => onBookingClick(b)}
              className={`absolute right-14 left-2 rounded-lg border px-2.5 py-1.5 text-right shadow-sm z-10 overflow-hidden ${STATUS_STYLES[b.status]}`}
              style={{ top: (s - startMin) * PX_PER_MINUTE + 1, height: Math.max(b.durationMinutes * PX_PER_MINUTE - 2, 30) }}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-[11px] font-bold truncate">{b.title}</span>
                {b.source === 'ONLINE' && (
                  <span className="shrink-0 text-[9px] bg-white/70 px-1.5 py-0.5 rounded-full font-medium">آنلاین</span>
                )}
              </div>
              {b.subtitle && <p className="text-[10px] truncate opacity-80 mt-0.5">{b.subtitle}</p>}
            </button>
          );
        })}
      </div>
    </div>
  );
}