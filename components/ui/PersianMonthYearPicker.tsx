// components/ui/PersianMonthYearPicker.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronRight, ChevronLeft, CalendarDays } from 'lucide-react';
import { DateObject } from 'react-multi-date-picker';
import persian from 'react-date-object/calendars/persian';
import persian_fa from 'react-date-object/locales/persian_fa';

const PERSIAN_MONTHS = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند',
];

const YEARS_PER_PAGE = 12;

type PersianMonthYearPickerProps = {
  value: DateObject; // ماه/سال جاری (تقویم شمسی)
  onChange: (d: DateObject) => void;
  className?: string;
};

// دکمه‌ی نمایش ماه/سال جاری که با کلیک، پنل انتخاب رو به‌صورت پاپ‌آور باز می‌کنه
export default function PersianMonthYearPicker({ value, onChange, className = '' }: PersianMonthYearPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const label = `${value.month.name} ${value.year.toLocaleString('fa-IR')}`;

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        className="w-full h-11 flex items-center justify-center gap-2 rounded-xl bg-white border border-zinc-200 px-2"
      >
        <CalendarDays className="w-4 h-4 text-[#824c71] shrink-0" />
        <span className="text-xs sm:text-sm font-bold text-zinc-800 truncate">{label}</span>
      </button>

      {isOpen && (
        <PickerPanel
          initialYear={value.year}
          initialMonth={value.month.number}
          onSelect={(year, month) => {
            onChange(new DateObject({ calendar: persian, locale: persian_fa, year, month, day: 1 }));
            setIsOpen(false);
          }}
        />
      )}
    </div>
  );
}

function PickerPanel({
  initialYear,
  initialMonth,
  onSelect,
}: {
  initialYear: number;
  initialMonth: number;
  onSelect: (year: number, month: number) => void;
}) {
  // حالت پنل: انتخاب ماه یا انتخاب سال
  const [mode, setMode] = useState<'month' | 'year'>('month');
  const [pickerYear, setPickerYear] = useState(initialYear);
  const [yearRangeStart, setYearRangeStart] = useState(initialYear - Math.floor(YEARS_PER_PAGE / 2));

  const yearsInRange = Array.from({ length: YEARS_PER_PAGE }, (_, i) => yearRangeStart + i);

  // یک ردیف فلش که بسته به حالت، سال یا بازه‌ی سال‌ها رو جابه‌جا می‌کنه
  const handleNext = () => {
    if (mode === 'month') setPickerYear((y) => y + 1);
    else setYearRangeStart((y) => y + YEARS_PER_PAGE);
  };
  const handlePrev = () => {
    if (mode === 'month') setPickerYear((y) => y - 1);
    else setYearRangeStart((y) => y - YEARS_PER_PAGE);
  };

  return (
    <div className="absolute z-50 top-full mt-2 left-1/2 -translate-x-1/2 w-72 bg-white border border-zinc-100 rounded-2xl shadow-lg shadow-zinc-200/60 p-4">
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={handleNext}
          aria-label="بعدی"
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-zinc-100 text-zinc-600 hover:bg-zinc-200 transition-colors shrink-0"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {mode === 'month' ? (
          <button
            onClick={() => {
              setYearRangeStart(pickerYear - Math.floor(YEARS_PER_PAGE / 2));
              setMode('year');
            }}
            className="text-sm font-bold text-[#824c71] px-2 py-1 rounded-lg hover:bg-zinc-50 transition-colors"
          >
            {pickerYear.toLocaleString('fa-IR')}
          </button>
        ) : (
          <span className="text-sm font-bold text-zinc-800 px-2 py-1">
            {yearRangeStart.toLocaleString('fa-IR')} - {(yearRangeStart + YEARS_PER_PAGE - 1).toLocaleString('fa-IR')}
          </span>
        )}

        <button
          onClick={handlePrev}
          aria-label="قبلی"
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-zinc-100 text-zinc-600 hover:bg-zinc-200 transition-colors shrink-0"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {mode === 'month' ? (
        <div className="grid grid-cols-3 gap-2">
          {PERSIAN_MONTHS.map((monthLabel, idx) => {
            const monthNumber = idx + 1;
            const isActive = pickerYear === initialYear && monthNumber === initialMonth;
            return (
              <button
                key={monthLabel}
                onClick={() => onSelect(pickerYear, monthNumber)}
                className={`py-2.5 rounded-xl text-xs font-bold transition-colors ${
                  isActive ? 'bg-[#824c71] text-white' : 'bg-zinc-50 text-zinc-600 hover:bg-zinc-100'
                }`}
              >
                {monthLabel}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {yearsInRange.map((year) => {
            const isActive = year === initialYear;
            return (
              <button
                key={year}
                onClick={() => {
                  setPickerYear(year);
                  setMode('month');
                }}
                className={`py-2.5 rounded-xl text-xs font-bold transition-colors ${
                  isActive ? 'bg-[#824c71] text-white' : 'bg-zinc-50 text-zinc-600 hover:bg-zinc-100'
                }`}
              >
                {year.toLocaleString('fa-IR')}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}