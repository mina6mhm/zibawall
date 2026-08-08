// components/ui/PersianCalendar.tsx
'use client';

import { useState, useMemo } from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { DateObject } from 'react-multi-date-picker';
import persian from 'react-date-object/calendars/persian';
import persian_fa from 'react-date-object/locales/persian_fa';
import { toDateOnlyAnchor } from '@/lib/dateUtils';

export type CalendarDayMarker = {
  className?: string;      // کلاس تیلویند برای پس‌زمینه/رنگ روز
  dotClassName?: string;   // رنگ نقطه‌ی کوچیک زیر عدد روز
};

type PersianCalendarProps = {
  selectedDate?: string | null; // "YYYY-MM-DD" میلادی
  onSelectDate: (dateStr: string, dateObject: DateObject) => void;
  markers?: Record<string, CalendarDayMarker>; // key: "YYYY-MM-DD" میلادی
  initialMonth?: DateObject;
  className?: string;
};

const WEEKDAY_LABELS = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];

const PERSIAN_MONTHS = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند',
];

type Cell = { dayNumber: number | null; dateStr: string | null; dateObject: DateObject | null };

export default function PersianCalendar({
  selectedDate,
  onSelectDate,
  markers = {},
  initialMonth,
  className = '',
}: PersianCalendarProps) {
  const [viewMonth, setViewMonth] = useState<DateObject>(
    () => initialMonth ?? new DateObject({ calendar: persian, locale: persian_fa })
  );

  // پنل انتخاب سریع ماه/سال
  const [showPicker, setShowPicker] = useState(false);
  const [pickerYear, setPickerYear] = useState<number>(() => viewMonth.year);

  const todayStr = useMemo(() => toDateOnlyAnchor(new Date()).toISOString().slice(0, 10), []);

  const monthLabel = `${viewMonth.month.name} ${viewMonth.year.toLocaleString('fa-IR')}`;

  const goToPrevMonth = () => setViewMonth((p) => new DateObject(p).subtract(1, 'month'));
  const goToNextMonth = () => setViewMonth((p) => new DateObject(p).add(1, 'month'));
  const goToToday = () => setViewMonth(new DateObject({ calendar: persian, locale: persian_fa }));

  const isCurrentMonth = useMemo(() => {
    const now = new DateObject({ calendar: persian, locale: persian_fa });
    return viewMonth.month.number === now.month.number && viewMonth.year === now.year;
  }, [viewMonth]);

  const openPicker = () => {
    setPickerYear(viewMonth.year);
    setShowPicker(true);
  };

  const selectMonthFromPicker = (monthNumber: number) => {
    setViewMonth(new DateObject({ calendar: persian, locale: persian_fa, year: pickerYear, month: monthNumber, day: 1 }));
    setShowPicker(false);
  };

  const weeks = useMemo(() => {
    const firstDay = new DateObject(viewMonth).set('day', 1);
    // آفست نسبت به شنبه (شروع هفته‌ی فارسی) — بدون تکیه بر رفتار داخلی کتابخونه
    const offset = (firstDay.toDate().getDay() + 1) % 7;
    const length = viewMonth.month.length;

    const cells: Cell[] = [];
    for (let i = 0; i < offset; i++) cells.push({ dayNumber: null, dateStr: null, dateObject: null });

    for (let i = 0; i < length; i++) {
      const d = new DateObject(firstDay).add(i, 'day');
      const dateStr = toDateOnlyAnchor(d.toDate()).toISOString().slice(0, 10);
      cells.push({ dayNumber: i + 1, dateStr, dateObject: d });
    }

    const rows: Cell[][] = [];
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
    const lastRow = rows[rows.length - 1];
    while (lastRow.length < 7) lastRow.push({ dayNumber: null, dateStr: null, dateObject: null });

    return rows;
  }, [viewMonth]);

  return (
    <div className={`bg-white border border-zinc-100 rounded-2xl p-4 relative ${className}`}>
      {/* هدر: ماه/سال + ناوبری */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={goToNextMonth}
          aria-label="ماه بعد"
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-zinc-100 text-zinc-600 hover:bg-zinc-200 transition-colors shrink-0"
        >
          <ChevronRight className="w-4.5 h-4.5" />
        </button>

        <button
          onClick={openPicker}
          className={`text-sm font-bold transition-colors px-2 py-1 rounded-lg hover:bg-zinc-50 ${isCurrentMonth ? 'text-zinc-800' : 'text-[#824c71]'}`}
        >
          {monthLabel}
        </button>

        <button
          onClick={goToPrevMonth}
          aria-label="ماه قبل"
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-zinc-100 text-zinc-600 hover:bg-zinc-200 transition-colors shrink-0"
        >
          <ChevronLeft className="w-4.5 h-4.5" />
        </button>
      </div>

      {!isCurrentMonth && !showPicker && (
        <div className="flex justify-center mb-3 -mt-1">
          <button onClick={goToToday} className="text-[11px] font-medium text-[#824c71] underline underline-offset-2">
            بازگشت به امروز
          </button>
        </div>
      )}

      {showPicker ? (
        // پنل انتخاب سریع سال + ماه
        <div>
          <div className="flex items-center justify-between mb-4 px-1">
            <button
              onClick={() => setPickerYear((y) => y + 1)}
              aria-label="سال بعد"
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-zinc-100 text-zinc-600 hover:bg-zinc-200 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <span className="text-sm font-bold text-zinc-800">{pickerYear.toLocaleString('fa-IR')}</span>

            <button
              onClick={() => setPickerYear((y) => y - 1)}
              aria-label="سال قبل"
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-zinc-100 text-zinc-600 hover:bg-zinc-200 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-1">
            {PERSIAN_MONTHS.map((label, idx) => {
              const monthNumber = idx + 1;
              const isActive = pickerYear === viewMonth.year && monthNumber === viewMonth.month.number;
              return (
                <button
                  key={label}
                  onClick={() => selectMonthFromPicker(monthNumber)}
                  className={`py-2.5 rounded-xl text-xs font-bold transition-colors ${
                    isActive
                      ? 'bg-[#824c71] text-white'
                      : 'bg-zinc-50 text-zinc-600 hover:bg-zinc-100'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setShowPicker(false)}
            className="w-full mt-3 py-2 rounded-xl text-xs font-medium text-zinc-500 hover:bg-zinc-50 transition-colors"
          >
            بازگشت به تقویم
          </button>
        </div>
      ) : (
        <>
          {/* هدر روزهای هفته */}
          <div className="grid grid-cols-7 mb-1">
            {WEEKDAY_LABELS.map((label, i) => (
              <div key={i} className="text-center text-[11px] font-bold text-zinc-400 py-1">
                {label}
              </div>
            ))}
          </div>

          {/* شبکه‌ی روزها */}
          <div className="flex flex-col gap-1.5">
            {weeks.map((week, wi) => (
              <div key={wi} className="grid grid-cols-7 gap-1.5">
                {week.map((cell, ci) => {
                  if (cell.dayNumber === null || !cell.dateStr) {
                    return <div key={ci} className="aspect-square" />;
                  }

                  const isSelected = cell.dateStr === selectedDate;
                  const isToday = cell.dateStr === todayStr;
                  const marker = markers[cell.dateStr];

                  return (
                    <button
                      key={ci}
                      onClick={() => onSelectDate(cell.dateStr!, cell.dateObject!)}
                      className={`relative aspect-square rounded-xl flex items-center justify-center text-[13px] font-medium transition-all
                        ${isSelected
                          ? 'bg-[#824c71] text-white font-bold shadow-sm shadow-[#824c71]/30'
                          : marker?.className
                            ? `${marker.className} font-bold`
                            : 'text-zinc-700 hover:bg-zinc-50'
                        }
                        ${isToday && !isSelected ? 'ring-1 ring-[#824c71]/50' : ''}
                      `}
                    >
                      {cell.dayNumber.toLocaleString('fa-IR')}
                      {marker?.dotClassName && !isSelected && (
                        <span className={`absolute bottom-1 w-1 h-1 rounded-full ${marker.dotClassName}`} />
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}