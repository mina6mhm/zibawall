// components/ui/PersianCalendar.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
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
  // هر بار ماهِ در حال نمایش عوض بشه صدا زده می‌شه — برای فیلتر کردن لیست‌ها بر اساس ماهِ جاری تقویم
  onMonthChange?: (year: number, month: number) => void;
};

const WEEKDAY_LABELS = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];

const PERSIAN_MONTHS = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند',
];

const YEARS_PER_PAGE = 12;

type Cell = { dayNumber: number | null; dateStr: string | null; dateObject: DateObject | null };

// حالت نمایش هدر/بدنه
type ViewMode = 'calendar' | 'month' | 'year';

const getTodayStr = () => toDateOnlyAnchor(new Date()).toISOString().slice(0, 10);

export default function PersianCalendar({
  selectedDate,
  onSelectDate,
  markers = {},
  initialMonth,
  className = '',
  onMonthChange,
}: PersianCalendarProps) {
  const [viewMonth, setViewMonth] = useState<DateObject>(
    () => initialMonth ?? new DateObject({ calendar: persian, locale: persian_fa })
  );

  // هر بار ماهِ نمایش داده شده عوض بشه، به والد اطلاع می‌دیم
  useEffect(() => {
    onMonthChange?.(viewMonth.year, viewMonth.month.number);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMonth.year, viewMonth.month.number]);

  const [mode, setMode] = useState<ViewMode>('calendar');
  const [pickerYear, setPickerYear] = useState<number>(() => viewMonth.year);
  const [yearRangeStart, setYearRangeStart] = useState<number>(
    () => viewMonth.year - Math.floor(YEARS_PER_PAGE / 2)
  );

  // «امروز» قبلاً فقط یک‌بار محاسبه می‌شد؛ اگر اپ شب باز می‌ماند (PWA / اپ کاپاسیتور در پس‌زمینه)
  // صبح روز بعد هنوز روز قبل را «امروز» نشان می‌داد. حالا با برگشتن به اپ به‌روز می‌شود.
  const [todayStr, setTodayStr] = useState<string>(getTodayStr);
  useEffect(() => {
    const refresh = () => setTodayStr(getTodayStr());
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, []);

  const isCurrentMonth = useMemo(() => {
    const now = new DateObject({ calendar: persian, locale: persian_fa });
    return viewMonth.month.number === now.month.number && viewMonth.year === now.year;
    // todayStr برای محاسبه‌ی دوباره بعد از تغییر روز
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMonth, todayStr]);

  // --- ناوبری تقویم اصلی ---
  const goToPrevMonth = () => setViewMonth((p) => new DateObject(p).subtract(1, 'month'));
  const goToNextMonth = () => setViewMonth((p) => new DateObject(p).add(1, 'month'));
  const goToToday = () => setViewMonth(new DateObject({ calendar: persian, locale: persian_fa }));

  const openMonthPicker = () => {
    setPickerYear(viewMonth.year);
    setMode('month');
  };
  const openYearPicker = () => {
    setYearRangeStart(viewMonth.year - Math.floor(YEARS_PER_PAGE / 2));
    setMode('year');
  };

  const selectYear = (year: number) => {
    setPickerYear(year);
    setMode('month');
  };

  const selectMonth = (monthNumber: number) => {
    setViewMonth(new DateObject({ calendar: persian, locale: persian_fa, year: pickerYear, month: monthNumber, day: 1 }));
    setMode('calendar');
  };

  const handleNext = () => {
    if (mode === 'calendar') goToNextMonth();
    else if (mode === 'month') setPickerYear((y) => y + 1);
    else setYearRangeStart((y) => y + YEARS_PER_PAGE);
  };
  const handlePrev = () => {
    if (mode === 'calendar') goToPrevMonth();
    else if (mode === 'month') setPickerYear((y) => y - 1);
    else setYearRangeStart((y) => y - YEARS_PER_PAGE);
  };

  const weeks = useMemo(() => {
    const firstDay = new DateObject(viewMonth).set('day', 1);
    // آفست نسبت به شنبه (شروع هفته‌ی فارسی)
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

  const yearsInRange = useMemo(
    () => Array.from({ length: YEARS_PER_PAGE }, (_, i) => yearRangeStart + i),
    [yearRangeStart]
  );

  // نکته: همه‌ی دکمه‌ها type="button" دارند؛ بدون آن، اگر تقویم داخل <form> قرار بگیرد
  // هر کلیک روی ماه/سال/روز فرم را submit می‌کند.
  return (
    <div className={`bg-white border border-zinc-100 rounded-2xl p-4 relative ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={handleNext}
          aria-label="بعدی"
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-zinc-100 text-zinc-600 hover:bg-zinc-200 transition-colors shrink-0"
        >
          <ChevronRight className="w-[18px] h-[18px]" />
        </button>

        {mode === 'calendar' && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={openMonthPicker}
              className={`text-sm font-bold transition-colors px-2 py-1 rounded-lg hover:bg-zinc-50 ${isCurrentMonth ? 'text-zinc-800' : 'text-[#824c71]'}`}
            >
              {viewMonth.month.name}
            </button>
            <button
              type="button"
              onClick={openYearPicker}
              className={`text-sm font-bold transition-colors px-2 py-1 rounded-lg hover:bg-zinc-50 ${isCurrentMonth ? 'text-zinc-800' : 'text-[#824c71]'}`}
            >
              {viewMonth.year.toLocaleString('fa-IR')}
            </button>
          </div>
        )}

        {mode === 'month' && (
          <button
            type="button"
            onClick={openYearPicker}
            className="text-sm font-bold text-[#824c71] px-2 py-1 rounded-lg hover:bg-zinc-50 transition-colors"
          >
            {pickerYear.toLocaleString('fa-IR')}
          </button>
        )}

        {mode === 'year' && (
          <span className="text-sm font-bold text-zinc-800 px-2 py-1">
            {yearRangeStart.toLocaleString('fa-IR')} - {(yearRangeStart + YEARS_PER_PAGE - 1).toLocaleString('fa-IR')}
          </span>
        )}

        <button
          type="button"
          onClick={handlePrev}
          aria-label="قبلی"
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-zinc-100 text-zinc-600 hover:bg-zinc-200 transition-colors shrink-0"
        >
          <ChevronLeft className="w-[18px] h-[18px]" />
        </button>
      </div>

      {mode === 'calendar' && !isCurrentMonth && (
        <div className="flex justify-center mb-3 -mt-1">
          <button type="button" onClick={goToToday} className="text-[11px] font-medium text-[#824c71] underline underline-offset-2">
            بازگشت به امروز
          </button>
        </div>
      )}

      {mode === 'month' && (
        <div>
          <div className="grid grid-cols-3 gap-2 mb-1">
            {PERSIAN_MONTHS.map((label, idx) => {
              const monthNumber = idx + 1;
              const isActive = pickerYear === viewMonth.year && monthNumber === viewMonth.month.number;
              return (
                <button
                  type="button"
                  key={label}
                  onClick={() => selectMonth(monthNumber)}
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
            type="button"
            onClick={() => setMode('calendar')}
            className="w-full mt-3 py-2 rounded-xl text-xs font-medium text-zinc-500 hover:bg-zinc-50 transition-colors"
          >
            بازگشت به تقویم
          </button>
        </div>
      )}

      {mode === 'year' && (
        <div>
          <div className="grid grid-cols-3 gap-2 mb-1">
            {yearsInRange.map((year) => {
              const isActive = year === viewMonth.year;
              return (
                <button
                  type="button"
                  key={year}
                  onClick={() => selectYear(year)}
                  className={`py-2.5 rounded-xl text-xs font-bold transition-colors ${
                    isActive
                      ? 'bg-[#824c71] text-white'
                      : 'bg-zinc-50 text-zinc-600 hover:bg-zinc-100'
                  }`}
                >
                  {year.toLocaleString('fa-IR')}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setMode('calendar')}
            className="w-full mt-3 py-2 rounded-xl text-xs font-medium text-zinc-500 hover:bg-zinc-50 transition-colors"
          >
            بازگشت به تقویم
          </button>
        </div>
      )}

      {mode === 'calendar' && (
        <>
          <div className="grid grid-cols-7 mb-1">
            {WEEKDAY_LABELS.map((label, i) => (
              <div key={i} className="text-center text-[11px] font-bold text-zinc-400 py-1">
                {label}
              </div>
            ))}
          </div>

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
                      type="button"
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