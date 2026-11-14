// app/(dashboard)/my-salon/booking-settings/page.tsx
'use client';

import { useState, useEffect, useCallback, useMemo, Fragment, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronRight, Loader2, Store, CalendarClock, Plus, Trash2, PenLine, X, Check,
  ChevronDown, UsersRound, Timer, CalendarX2, TriangleAlert, Scissors, UserRound,
  CalendarCheck2, CalendarDays, Wallet, Power,
} from 'lucide-react';
import { DateObject } from 'react-multi-date-picker';
import PersianCalendar, { CalendarDayMarker } from '@/components/ui/PersianCalendar';
import persian from 'react-date-object/calendars/persian';
import persian_fa from 'react-date-object/locales/persian_fa';

// ─── Types ───────────────────────────────────────────────────────────────────

type BookingService = {
  id: string;
  name: string;
  durationMin: number;
  price: number;
  isActive: boolean;
};

type StaffMember = {
  id: string;
  name: string;
  phone: string | null;
  offDays: string[]; // روزهای ثابت هفته که همیشه تعطیله
  commissionPercent: number | null; // درصد پیش‌فرض پرسنل، اختیاری
  bookingServices: { bookingServiceId: string }[];
};

// یک بازه‌ی ساعتیِ تعطیل داخل یک روز — فقط همین بازه بسته میشه،
// بقیه‌ی همون روز طبق ساعت کاری عادی باز می‌مونه
type ClosedRange = { start: string; end: string };

type StaffOverride = {
  id: string;
  staffId: string;
  date: string; // "YYYY-MM-DD" میلادی
  isDayOff: boolean;
  start: string | null;
  end: string | null;
  note: string | null;
  closedRanges?: unknown; // JSON از دیتابیس — با parseClosedRangesClient پردازش میشه
};

// override دستی برای یک تاریخ خاص از خود سالن
type SalonOverride = {
  id: string;
  date: string; // "YYYY-MM-DD" میلادی
  isClosed: boolean;
  start: string | null;
  end: string | null;
  note: string | null;
  closedRanges?: unknown;
};

type DaySchedule = { open: boolean; start: string; end: string };
type WeeklySchedule = Record<string, DaySchedule>;

const WEEK_DAYS = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];

const DEFAULT_SCHEDULE: WeeklySchedule = Object.fromEntries(
  WEEK_DAYS.map((d) => [d, { open: d !== 'جمعه', start: '09:00', end: '20:00' }])
);

// ─── Helpers ─────────────────────────────────────────────────────────────────

// تبدیل ارقام انگلیسی به فارسی — فقط برای «نمایش»
const toPersianDigits = (str: string) =>
  str.replace(/[0-9]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);

const minToDuration = (min: number) => {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}:${String(m).padStart(2, '0')}`;
};

// تبدیل ورودی عددی: فارسی/عربی → انگلیسی، حذف غیر عدد
const toEnglishDigits = (str: string) =>
  str
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - '۰'.charCodeAt(0)))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - '٠'.charCodeAt(0)))
    .replace(/[^0-9]/g, '');

const formatPrice = (n: number) => n.toLocaleString('fa-IR');

const joinTime = (h: string, m: string) => {
  if (!h && !m) return '';
  return `${(h || '0').padStart(2, '0')}:${(m || '0').padStart(2, '0')}`;
};
const sanitizeHourTime = (val: string) => {
  let d = toEnglishDigits(val).slice(0, 2);
  if (d !== '' && Number(d) > 23) d = '23';
  return d;
};
const sanitizeMinuteTime = (val: string) => {
  let d = toEnglishDigits(val).slice(0, 2);
  if (d !== '' && Number(d) > 59) d = '59';
  return d;
};

// پارس امن مقدار JSON که از دیتابیس برمی‌گرده (closedRanges)
const parseClosedRangesClient = (raw: unknown): ClosedRange[] => {
  if (!Array.isArray(raw)) return [];
  const timeRe = /^\d{2}:\d{2}$/;
  return raw
    .filter(
      (r): r is ClosedRange =>
        !!r &&
        typeof r === 'object' &&
        typeof (r as any).start === 'string' &&
        typeof (r as any).end === 'string' &&
        timeRe.test((r as any).start) &&
        timeRe.test((r as any).end) &&
        (r as any).start < (r as any).end
    )
    .map((r) => ({ start: r.start, end: r.end }));
};

const formatClosedRangesSummary = (ranges: ClosedRange[]) =>
  ranges.map((r) => `${toPersianDigits(r.start)}-${toPersianDigits(r.end)}`).join('، ');

// نمایش مقدار خام در input: سه‌رقم سه‌رقم بدون تبدیل به فارسی
const displayNumber = (raw: string) => {
  if (!raw) return '';
  const n = Number(raw);
  if (isNaN(n)) return raw;
  return n.toLocaleString('en-US');
};

const toEnglishDigitsInText = (str: string) =>
  str
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - '۰'.charCodeAt(0)))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - '٠'.charCodeAt(0)));

// تلاش برای استخراج ساعت شروع/پایان از متن آزاد ثبت‌نام، مثل «۱۰ صبح تا ۸ شب»
function parseWorkingHoursToTimes(raw: string | null | undefined): { start: string; end: string } | null {
  if (!raw) return null;
  const text = toEnglishDigitsInText(raw);

  const matches = [...text.matchAll(/(\d{1,2})(?::(\d{2}))?\s*(صبح|ظهر|بعد\s?از\s?ظهر|عصر|شب)?/g)].filter(
    (m) => m[1] !== undefined
  );

  if (matches.length < 2) return null;

  const toParts = (m: RegExpMatchArray) => {
    let h = parseInt(m[1], 10);
    const minute = m[2] ? parseInt(m[2], 10) : 0;
    const period = m[3] || '';
    const isPm = period.includes('عصر') || period.includes('شب') || period.includes('بعد');
    const isNoon = period === 'ظهر';
    if ((isPm || isNoon) && h < 12) h += 12;
    if (h > 23) h = 23;
    return { h, minute };
  };

  const startInfo = toParts(matches[0]);
  const endInfo = toParts(matches[matches.length - 1]);

  const fmt = (h: number, m: number) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

  return { start: fmt(startInfo.h, startInfo.minute), end: fmt(endInfo.h, endInfo.minute) };
}

// ساخت برنامه‌ی هفتگی پیش‌فرض بر اساس اطلاعات ثبت‌نام اولیه‌ی سالن
function buildDefaultScheduleFromProfile(salon: {
  closedDays?: string[] | null;
  workingHours?: string | null;
}): WeeklySchedule {
  const closedDays = salon.closedDays ?? [];
  const parsedHours = parseWorkingHoursToTimes(salon.workingHours);

  return Object.fromEntries(
    WEEK_DAYS.map((d) => [
      d,
      {
        open: !closedDays.includes(d),
        start: parsedHours?.start ?? '09:00',
        end: parsedHours?.end ?? '20:00',
      },
    ])
  );
}

// ─── Shared styles & UI atoms ────────────────────────────────────────────────

const BRAND = '#824c71';
const ICON = { strokeWidth: 1.75 } as const;

const card = 'bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.05)]';
const inputCls =
  'w-full bg-zinc-50 rounded-xl px-3.5 py-3 text-sm outline-none border border-transparent transition focus:bg-white focus:border-[#824c71]/50 focus:ring-2 focus:ring-[#824c71]/10 placeholder:text-zinc-400';
const miniInputCls =
  'w-11 bg-zinc-50 rounded-lg px-1 py-2 text-xs text-center outline-none border border-transparent focus:bg-white focus:border-[#824c71]/50';
const primaryBtn =
  'w-full bg-[#824c71] hover:bg-[#6f3f61] active:scale-[0.99] transition text-white rounded-xl py-3 text-sm font-bold disabled:opacity-60 flex items-center justify-center gap-2';

// آیکن داخل یک دایره/مربع نرم رنگی
function IconBadge({
  children,
  tone = 'brand',
  size = 'md',
}: {
  children: ReactNode;
  tone?: 'brand' | 'neutral' | 'red' | 'amber';
  size?: 'sm' | 'md';
}) {
  const tones = {
    brand: 'bg-[#824c71]/10 text-[#824c71]',
    neutral: 'bg-zinc-100 text-zinc-500',
    red: 'bg-red-50 text-red-500',
    amber: 'bg-amber-50 text-amber-600',
  };
  const sizes = { sm: 'w-8 h-8 rounded-xl', md: 'w-10 h-10 rounded-2xl' };
  return (
    <span className={`${tones[tone]} ${sizes[size]} flex items-center justify-center shrink-0`}>
      {children}
    </span>
  );
}

function IconButton({
  onClick,
  tone = 'neutral',
  disabled,
  title,
  children,
}: {
  onClick: (e: React.MouseEvent) => void;
  tone?: 'neutral' | 'red' | 'green' | 'muted';
  disabled?: boolean;
  title?: string;
  children: ReactNode;
}) {
  const tones = {
    neutral: 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200',
    red: 'bg-red-50 text-red-500 hover:bg-red-100',
    green: 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100',
    muted: 'bg-zinc-100 text-zinc-400 hover:bg-zinc-200',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors disabled:opacity-40 ${tones[tone]}`}
    >
      {children}
    </button>
  );
}

function Switch({
  on,
  onClick,
  size = 'md',
}: {
  on: boolean;
  onClick: () => void;
  size?: 'sm' | 'md' | 'lg';
}) {
  const track = { sm: 'w-9 h-5', md: 'w-11 h-6', lg: 'w-14 h-7' }[size];
  const knob = {
    sm: `top-0.5 w-4 h-4 ${on ? 'right-0.5' : 'right-4'}`,
    md: `top-0.5 w-5 h-5 ${on ? 'right-0.5' : 'right-5'}`,
    lg: `top-1 w-5 h-5 ${on ? 'right-1' : 'right-8'}`,
  }[size];
  return (
    <button type="button" onClick={onClick} className="shrink-0">
      <div className={`relative ${track} rounded-full transition-colors duration-200 ${on ? 'bg-[#824c71]' : 'bg-zinc-200'}`}>
        <div className={`absolute ${knob} bg-white rounded-full shadow-sm transition-all duration-200`} />
      </div>
    </button>
  );
}

function EmptyState({ icon, title, hint }: { icon: ReactNode; title: string; hint?: string }) {
  return (
    <div className="text-center py-10 bg-white rounded-2xl mb-3">
      <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-zinc-100 text-zinc-400 flex items-center justify-center">
        {icon}
      </div>
      <p className="text-zinc-600 text-sm font-bold">{title}</p>
      {hint && <p className="text-zinc-400 text-xs mt-1">{hint}</p>}
    </div>
  );
}

function AddButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-[#824c71]/[0.07] text-[#824c71] text-sm font-bold hover:bg-[#824c71]/[0.12] transition-colors"
    >
      <Plus className="w-4 h-4" {...ICON} />
      {children}
    </button>
  );
}

function Field({ label, optional, children }: { label: string; optional?: boolean; children: ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-bold text-zinc-600 mb-1.5">
        {label}
        {optional && <span className="text-zinc-400 font-normal mr-1.5">اختیاری</span>}
      </label>
      {children}
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl p-4 pb-8 sm:pb-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-bold text-zinc-900">{title}</h3>
          <IconButton onClick={onClose}>
            <X className="w-4 h-4" {...ICON} />
          </IconButton>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Step bar ─────────────────────────────────────────────────────────────────
// جابه‌جایی بین مرحله‌ها آزاد است؛ نقطه‌ی زرد یعنی این مرحله هنوز ناقص است.

function TabBar({
  active,
  onChange,
  hasServices,
  hasStaff,
}: {
  active: number;
  onChange: (i: number) => void;
  hasServices: boolean;
  hasStaff: boolean;
}) {
  const steps: { label: string; ready?: boolean }[] = [
    { label: 'خدمات', ready: hasServices },
    { label: 'پرسنل', ready: hasStaff },
    { label: 'برنامه سالن' },
    { label: 'برنامه پرسنل' },
  ];

  return (
    <div className="mb-5 py-1">
      <div className="flex items-start">
        {steps.map((step, i) => {
          const isActive = active === i;
          const isDone = i < active;
          const needsAttention = step.ready === false;

          return (
            <Fragment key={step.label}>
              <button
                type="button"
                onClick={() => onChange(i)}
                className="flex flex-col items-center gap-1.5 shrink-0 group"
              >
                <span
                  className={`relative w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-bold transition-all ${
                    isActive
                      ? 'bg-[#824c71] text-white shadow-[0_4px_12px_rgba(130,76,113,0.35)]'
                      : isDone
                      ? 'bg-[#824c71]/10 text-[#824c71]'
                      : 'bg-zinc-100 text-zinc-400 group-hover:bg-zinc-200'
                  }`}
                >
                  {isDone ? <Check className="w-4 h-4" strokeWidth={2.5} /> : (i + 1).toLocaleString('fa-IR')}
                  {needsAttention && (
                    <span className="absolute -top-0.5 -left-0.5 w-2.5 h-2.5 rounded-full bg-amber-400 ring-2 ring-white" />
                  )}
                </span>
                <span
                  className={`text-[11px] font-bold whitespace-nowrap transition-colors ${
                    isActive ? 'text-[#824c71]' : isDone ? 'text-zinc-600' : 'text-zinc-400'
                  }`}
                >
                  {step.label}
                </span>
              </button>
              {i < steps.length - 1 && (
                <div
                  className={`flex-1 h-0.5 rounded-full mt-[17px] mx-1.5 transition-colors ${
                    i < active ? 'bg-[#824c71]/30' : 'bg-zinc-100'
                  }`}
                />
              )}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}

// ─── Service Form Modal ───────────────────────────────────────────────────────

type ServiceFormProps = {
  initial?: Partial<BookingService>;
  onSave: (data: Omit<BookingService, 'id' | 'isActive'>) => Promise<void>;
  onClose: () => void;
};

function ServiceFormModal({ initial, onSave, onClose }: ServiceFormProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [durHour, setDurHour] = useState(
    initial?.durationMin != null ? String(Math.floor(initial.durationMin / 60)) : '1'
  );
  const [durMin, setDurMin] = useState(
    initial?.durationMin != null ? String(initial.durationMin % 60).padStart(2, '0') : '00'
  );
  const [priceRaw, setPriceRaw] = useState(initial?.price ? String(initial.price) : '');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const sanitizeHour = (val: string) => toEnglishDigits(val).slice(0, 2);
  const sanitizeMinute = (val: string) => {
    let digits = toEnglishDigits(val).slice(0, 2);
    if (digits !== '' && Number(digits) > 59) digits = '59';
    return digits;
  };

  const handleSave = async () => {
    if (!name.trim()) return setErr('نام خدمات الزامی است');
    const dMin = (Number(durHour) || 0) * 60 + (Number(durMin) || 0);
    if (!dMin) return setErr('مدت زمان معتبر وارد کنید');
    const priceNum = priceRaw ? Number(priceRaw) : 0;
    setErr('');
    setSaving(true);
    try {
      await onSave({ name: name.trim(), durationMin: dMin, price: priceNum });
      onClose();
    } catch (e: any) {
      setErr(e.message || 'خطا در ذخیره');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={initial?.id ? 'ویرایش خدمات' : 'افزودن خدمات'} onClose={onClose}>
      <div className="space-y-4">
        <Field label="نام خدمات">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="مثلاً کاشت ناخن"
            className={inputCls}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Field label="مدت زمان">
              <div className="flex items-center gap-1.5">
                <input
                  value={durMin}
                  onChange={(e) => setDurMin(sanitizeMinute(e.target.value))}
                  placeholder="دقیقه"
                  dir="ltr"
                  inputMode="numeric"
                  className={`${inputCls} text-center !px-2`}
                />
                <span className="text-zinc-400 font-bold shrink-0">:</span>
                <input
                  value={durHour}
                  onChange={(e) => setDurHour(sanitizeHour(e.target.value))}
                  placeholder="ساعت"
                  dir="ltr"
                  inputMode="numeric"
                  className={`${inputCls} text-center !px-2`}
                />
              </div>
            </Field>
            <p className="text-[10px] text-zinc-400 mt-1">ساعت و دقیقه — مثلاً ۱ و ۳۰</p>
          </div>
          <Field label="قیمت (تومان)" optional>
            <input
              value={displayNumber(priceRaw)}
              onChange={(e) => setPriceRaw(toEnglishDigits(e.target.value))}
              placeholder="مثلاً 500,000"
              dir="ltr"
              inputMode="numeric"
              className={`${inputCls} text-left`}
            />
          </Field>
        </div>

        {err && <p className="text-red-500 text-xs font-medium">{err}</p>}

        <button onClick={handleSave} disabled={saving} className={primaryBtn}>
          {saving && <Loader2 className="w-4 h-4 animate-spin" {...ICON} />}
          {saving ? 'در حال ذخیره...' : 'ذخیره خدمات'}
        </button>
      </div>
    </Modal>
  );
}

// ─── Services Tab ─────────────────────────────────────────────────────────────

function ServicesTab({
  services,
  staff,
  onRefresh,
}: {
  services: BookingService[];
  staff: StaffMember[];
  onRefresh: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<BookingService | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // خدماتی که حداقل یک پرسنل انجامشون می‌ده — برای هشدار خدمات یتیم
  const servicesWithStaff = new Set<string>();
  staff.forEach((s) => (s.bookingServices ?? []).forEach((bs) => servicesWithStaff.add(bs.bookingServiceId)));

  const handleSave = async (data: Omit<BookingService, 'id' | 'isActive'>) => {
    const method = editing ? 'PUT' : 'POST';
    const url = editing ? `/api/booking-services/${editing.id}` : '/api/booking-services';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const d = await res.json();
      throw new Error(d.error || 'خطا در ذخیره');
    }
    onRefresh();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('حذف این خدمت؟')) return;
    setDeletingId(id);
    await fetch(`/api/booking-services/${id}`, { method: 'DELETE' });
    onRefresh();
    setDeletingId(null);
  };

  const handleToggleActive = async (s: BookingService) => {
    await fetch(`/api/booking-services/${s.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...s, isActive: !s.isActive }),
    });
    onRefresh();
  };

  return (
    <div>
      {services.length === 0 ? (
        <EmptyState
          icon={<Scissors className="w-6 h-6" {...ICON} />}
          title="هنوز خدمتی تعریف نشده"
          hint="خدمات سالن را با مدت زمان و قیمت وارد کنید"
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-3">
          {services.map((s) => (
            <div key={s.id} className={`${card} p-3.5 transition-opacity ${s.isActive ? '' : 'opacity-60'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <IconBadge tone={s.isActive ? 'brand' : 'neutral'}>
                    <Scissors className="w-[18px] h-[18px]" {...ICON} />
                  </IconBadge>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-zinc-900 truncate">{s.name}</p>
                      {!s.isActive && (
                        <span className="text-[10px] bg-zinc-200 text-zinc-500 px-1.5 py-0.5 rounded-full font-medium shrink-0">
                          غیرفعال
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5 text-[11.5px] mt-2">
                      <span className="inline-flex items-center gap-1 bg-zinc-100 text-zinc-600 rounded-full px-2.5 py-1">
                        <Timer className="w-3 h-3 text-zinc-400" {...ICON} />
                        {toPersianDigits(minToDuration(s.durationMin))}
                      </span>
                      {s.price > 0 && (
                        <span className="inline-flex items-center gap-1 bg-zinc-100 text-zinc-600 rounded-full px-2.5 py-1">
                          <Wallet className="w-3 h-3 text-zinc-400" {...ICON} />
                          {formatPrice(s.price)} تومان
                        </span>
                      )}
                    </div>
                    {s.isActive && !servicesWithStaff.has(s.id) && (
                      <p className="text-[11px] text-amber-600 bg-amber-50 rounded-full px-2.5 py-1 inline-flex items-center gap-1 mt-2">
                        <TriangleAlert className="w-3 h-3 shrink-0" {...ICON} />
                        هیچ پرسنلی این خدمت را انجام نمی‌دهد
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <IconButton
                    onClick={() => handleToggleActive(s)}
                    tone={s.isActive ? 'green' : 'muted'}
                    title={s.isActive ? 'غیرفعال کردن' : 'فعال کردن'}
                  >
                    <Power className="w-3.5 h-3.5" {...ICON} />
                  </IconButton>
                  <IconButton onClick={() => { setEditing(s); setShowForm(true); }}>
                    <PenLine className="w-3.5 h-3.5" {...ICON} />
                  </IconButton>
                  <IconButton onClick={() => handleDelete(s.id)} tone="red" disabled={deletingId === s.id}>
                    {deletingId === s.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" {...ICON} />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" {...ICON} />
                    )}
                  </IconButton>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <AddButton onClick={() => { setEditing(null); setShowForm(true); }}>افزودن خدمات جدید</AddButton>

      {showForm && (
        <ServiceFormModal
          initial={editing ?? undefined}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditing(null); }}
        />
      )}
    </div>
  );
}

// ─── Staff Form Modal ─────────────────────────────────────────────────────────

const mobileRegex = /^09\d{9}$/;

const toEnglishDigitsPhone = (str: string) =>
  str
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - '۰'.charCodeAt(0)))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - '٠'.charCodeAt(0)))
    .replace(/[^0-9]/g, '');

type StaffFormProps = {
  initial?: StaffMember;
  onSave: (data: { name: string; phone: string; commissionPercent: number | null }) => Promise<void>;
  onClose: () => void;
};

function StaffFormModal({ initial, onSave, onClose }: StaffFormProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [phone, setPhone] = useState(initial?.phone ?? '');
  const [commission, setCommission] = useState(
    initial?.commissionPercent != null ? String(initial.commissionPercent) : ''
  );
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const sanitizeCommission = (value: string) => {
    let digits = toEnglishDigitsPhone(value).slice(0, 3);
    if (digits !== '' && Number(digits) > 100) digits = '100';
    return digits;
  };

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) return setErr('نام پرسنل الزامی است');
    const cleanPhone = toEnglishDigitsPhone(phone);
    if (!mobileRegex.test(cleanPhone)) return setErr('شماره موبایل معتبر نیست');
    setErr('');
    setSaving(true);
    try {
      await onSave({
        name: trimmedName,
        phone: cleanPhone,
        commissionPercent: commission === '' ? null : Number(commission),
      });
      onClose();
    } catch (e: any) {
      setErr(e.message || 'خطا در ذخیره');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={initial ? 'ویرایش پرسنل' : 'افزودن پرسنل'} onClose={onClose}>
      <div className="space-y-4">
        <Field label="نام پرسنل">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="مثلاً سارا محمدی"
            className={inputCls}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="شماره موبایل">
            <input
              value={phone}
              onChange={(e) => setPhone(toEnglishDigitsPhone(e.target.value).slice(0, 11))}
              placeholder="۰۹۱۲۳۴۵۶۷۸۹"
              dir="ltr"
              inputMode="numeric"
              className={`${inputCls} text-left`}
            />
          </Field>
          <Field label="درصد پرسنل" optional>
            <div className="flex items-center bg-zinc-50 rounded-xl border border-transparent focus-within:bg-white focus-within:border-[#824c71]/50 focus-within:ring-2 focus-within:ring-[#824c71]/10">
              <input
                value={commission}
                onChange={(e) => setCommission(sanitizeCommission(e.target.value))}
                dir="ltr"
                inputMode="numeric"
                placeholder="مثلاً ۴۰"
                className="w-full px-3.5 py-3 text-sm bg-transparent outline-none border-0 placeholder:text-zinc-400"
              />
              <span className="text-zinc-400 text-xs pl-3 shrink-0">٪</span>
            </div>
          </Field>
        </div>

        <p className="text-[10.5px] text-zinc-400 -mt-2 leading-relaxed">
          این درصد موقع ثبت نوبت آنلاین خودکار برای این پرسنل ثبت می‌شه؛ برای یه نوبت خاص هم می‌تونی بعداً از صفحه‌ی «نوبت‌ها» تغییرش بدی.
        </p>

        {err && <p className="text-red-500 text-xs font-medium">{err}</p>}

        <button onClick={handleSave} disabled={saving} className={primaryBtn}>
          {saving && <Loader2 className="w-4 h-4 animate-spin" {...ICON} />}
          {saving ? 'در حال ذخیره...' : 'ذخیره پرسنل'}
        </button>
      </div>
    </Modal>
  );
}

// ─── Staff Tab ────────────────────────────────────────────────────────────────

function StaffTab({
  staff,
  services,
  onRefresh,
}: {
  staff: StaffMember[];
  services: BookingService[];
  onRefresh: () => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [deletingStaffId, setDeletingStaffId] = useState<string | null>(null);

  // افزودن/ویرایش پرسنل — هر دو از یک مودال
  const [showForm, setShowForm] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);

  const handleSaveStaff = async (data: { name: string; phone: string; commissionPercent: number | null }) => {
    const isEdit = !!editingStaff;
    const url = isEdit ? `/api/staff/${editingStaff!.id}` : '/api/staff';
    const method = isEdit ? 'PATCH' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const d = await res.json();
      throw new Error(d.error || 'خطا در ذخیره');
    }
    onRefresh();
  };

  const handleDeleteStaff = async (id: string) => {
    if (!confirm('حذف این پرسنل؟')) return;
    setDeletingStaffId(id);
    await fetch(`/api/staff?id=${id}`, { method: 'DELETE' });
    onRefresh();
    setDeletingStaffId(null);
  };

  const toggleService = async (staffId: string, serviceId: string, has: boolean) => {
    setSaving(staffId + serviceId);
    await fetch('/api/staff-services', {
      method: has ? 'DELETE' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ staffId, bookingServiceId: serviceId }),
    });
    onRefresh();
    setSaving(null);
  };

  if (services.length === 0) {
    return (
      <EmptyState
        icon={<Scissors className="w-6 h-6" {...ICON} />}
        title="ابتدا خدمات سالن را تعریف کنید"
        hint="بعد از تعریف خدمات، می‌توانید به هر پرسنل خدمات تخصیص دهید"
      />
    );
  }

  return (
    <div>
      {staff.length === 0 ? (
        <EmptyState
          icon={<UsersRound className="w-6 h-6" {...ICON} />}
          title="هنوز پرسنلی ثبت نشده"
          hint="پرسنل خود را از همین‌جا اضافه کنید"
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-3">
          {staff.map((s) => {
            const assignedIds = new Set((s.bookingServices ?? []).map((b) => b.bookingServiceId));
            const isOpen = expanded === s.id;

            return (
              <div key={s.id} className={`${card} overflow-hidden self-start`}>
                <div
                  role="button"
                  tabIndex={0}
                  className="w-full flex items-center justify-between gap-2 px-3.5 py-4 text-right cursor-pointer"
                  onClick={() => setExpanded(isOpen ? null : s.id)}
                  onKeyDown={(e) => { if (e.key === 'Enter') setExpanded(isOpen ? null : s.id); }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-10 h-10 rounded-full bg-[#824c71]/10 text-[#824c71] flex items-center justify-center text-sm font-bold shrink-0">
                      {s.name.slice(0, 1)}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-zinc-800 truncate">{s.name}</p>
                      {assignedIds.size === 0 ? (
                        <p className="text-[11px] text-amber-600 font-medium inline-flex items-center gap-1">
                          <TriangleAlert className="w-3 h-3 shrink-0" {...ICON} />
                          هیچ خدمتی تخصیص داده نشده
                        </p>
                      ) : (
                        <p className="text-[11px] text-zinc-400 flex items-center gap-1.5 truncate">
                          <span>{toPersianDigits(String(assignedIds.size))} خدمات تخصیص‌یافته</span>
                          {s.commissionPercent != null && (
                            <span className="text-[#824c71] font-medium">· {toPersianDigits(String(s.commissionPercent))}٪ سهم پرسنل</span>
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <IconButton onClick={(e) => { e.stopPropagation(); setEditingStaff(s); setShowForm(true); }}>
                      <PenLine className="w-3.5 h-3.5" {...ICON} />
                    </IconButton>
                    <IconButton
                      tone="red"
                      onClick={(e) => { e.stopPropagation(); handleDeleteStaff(s.id); }}
                      disabled={deletingStaffId === s.id}
                    >
                      {deletingStaffId === s.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" {...ICON} />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" {...ICON} />
                      )}
                    </IconButton>
                    <ChevronDown
                      className={`w-4 h-4 text-zinc-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                      {...ICON}
                    />
                  </div>
                </div>

                {isOpen && (
                  <div className="px-3.5 pb-3.5">
                    <p className="text-[11px] text-zinc-400 mb-2">خدمات این پرسنل:</p>
                    <div className="grid grid-cols-1 gap-1.5">
                      {services.map((svc) => {
                        const has = assignedIds.has(svc.id);
                        const isSaving = saving === s.id + svc.id;
                        return (
                          <button
                            key={svc.id}
                            onClick={() => toggleService(s.id, svc.id, has)}
                            disabled={isSaving || !svc.isActive}
                            className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-right transition-all disabled:opacity-40 ${
                              has ? 'bg-[#824c71]/[0.08] text-[#824c71]' : 'bg-zinc-50 text-zinc-600 hover:bg-zinc-100'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <span
                                className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                                  has ? 'bg-[#824c71] text-white' : 'bg-white ring-1 ring-zinc-300'
                                }`}
                              >
                                {has && <Check className="w-3 h-3" strokeWidth={3} />}
                              </span>
                              <span className="text-xs font-bold">{svc.name}</span>
                            </div>
                            <span className="text-[11px] text-zinc-400">{toPersianDigits(minToDuration(svc.durationMin))}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <AddButton onClick={() => { setEditingStaff(null); setShowForm(true); }}>افزودن پرسنل جدید</AddButton>

      {showForm && (
        <StaffFormModal
          initial={editingStaff ?? undefined}
          onSave={handleSaveStaff}
          onClose={() => { setShowForm(false); setEditingStaff(null); }}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ClosedRangesEditor — ویرایشگر «بازه‌های ساعتی تعطیل» داخل یک روز خاص.
// فقط بازه‌های انتخاب‌شده بسته می‌شوند و بقیه‌ی همان روز باز می‌ماند.
// هم برای سالن و هم برای پرسنل استفاده می‌شود.
// ═══════════════════════════════════════════════════════════════════════════

function ClosedRangesEditor({
  ranges,
  onChange,
}: {
  ranges: ClosedRange[];
  onChange: (ranges: ClosedRange[]) => void;
}) {
  const [startH, setStartH] = useState('');
  const [startM, setStartM] = useState('');
  const [endH, setEndH] = useState('');
  const [endM, setEndM] = useState('');
  const [error, setError] = useState('');

  const addRange = () => {
    const start = joinTime(startH, startM);
    const end = joinTime(endH, endM);
    if (!start || !end) {
      setError('ساعت شروع و پایان بازه را کامل وارد کنید');
      return;
    }
    if (start >= end) {
      setError('ساعت پایان باید بعد از ساعت شروع باشد');
      return;
    }
    setError('');
    onChange([...ranges, { start, end }].sort((a, b) => a.start.localeCompare(b.start)));
    setStartH(''); setStartM(''); setEndH(''); setEndM('');
  };

  const removeRange = (idx: number) => onChange(ranges.filter((_, i) => i !== idx));

  const timeInputs = (
    h: string, m: string,
    setH: (v: string) => void, setM: (v: string) => void
  ) => (
    <div className="flex items-center gap-1">
      <input
        value={m}
        onChange={(e) => setM(sanitizeMinuteTime(e.target.value))}
        placeholder="دقیقه" dir="ltr" inputMode="numeric"
        className={miniInputCls}
      />
      <span className="text-zinc-400 text-xs">:</span>
      <input
        value={h}
        onChange={(e) => setH(sanitizeHourTime(e.target.value))}
        placeholder="ساعت" dir="ltr" inputMode="numeric"
        className={miniInputCls}
      />
    </div>
  );

  return (
    <div className="mb-3 bg-white rounded-xl p-3">
      <p className="text-sm font-bold text-zinc-800">بستن یک بازه‌ی ساعتی خاص</p>
      <p className="text-[11px] text-zinc-400 mt-0.5 mb-3 leading-relaxed">
        فقط همین بازه‌ها بسته می‌شه؛ بقیه‌ی همین روز طبق ساعت کاری باز می‌مونه.
      </p>

      {ranges.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {ranges.map((r, idx) => (
            <span
              key={`${r.start}-${r.end}-${idx}`}
              className="flex items-center gap-1.5 bg-red-50 text-red-500 text-[11px] font-bold rounded-full pl-1 pr-2.5 py-1"
            >
              {toPersianDigits(r.start)} تا {toPersianDigits(r.end)}
              <button
                type="button"
                onClick={() => removeRange(idx)}
                className="w-4 h-4 flex items-center justify-center rounded-full bg-red-100 shrink-0"
              >
                <X className="w-2.5 h-2.5" strokeWidth={2.5} />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center gap-1.5 flex-wrap">
        {timeInputs(startH, startM, setStartH, setStartM)}
        <span className="text-zinc-400 text-[11px] shrink-0">تا</span>
        {timeInputs(endH, endM, setEndH, setEndM)}
        <button
          type="button"
          onClick={addRange}
          className="shrink-0 h-[34px] px-3 rounded-lg bg-[#824c71] text-white text-[11px] font-bold flex items-center gap-1"
        >
          <Plus className="w-3 h-3" strokeWidth={2.5} />
          افزودن
        </button>
      </div>
      {error && <p className="text-[10px] text-red-500 mt-1.5">{error}</p>}
    </div>
  );
}

// ─── Shared override UI (سالن و پرسنل) ───────────────────────────────────────

const formatPersianDate = (dateStr: string) =>
  toPersianDigits(
    new DateObject({ date: new Date(dateStr), calendar: persian, locale: persian_fa }).format('D MMMM YYYY')
  );

function OverrideLegend({ fullLabel, rangeLabel }: { fullLabel: string; rangeLabel: string }) {
  return (
    <div className="flex items-center gap-4 mb-4 px-1 text-[11px] text-zinc-500">
      <span className="flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
        {fullLabel}
      </span>
      <span className="flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-full bg-[#824c71]" />
        {rangeLabel}
      </span>
    </div>
  );
}

function OverrideDayEditor({
  dateStr,
  onClose,
  offTitle,
  offHint,
  isOff,
  onToggleOff,
  ranges,
  onRangesChange,
  note,
  onNoteChange,
  notePlaceholder,
  onSave,
  saving,
  onDelete,
  deleting,
}: {
  dateStr: string;
  onClose: () => void;
  offTitle: string;
  offHint: string;
  isOff: boolean;
  onToggleOff: () => void;
  ranges: ClosedRange[];
  onRangesChange: (r: ClosedRange[]) => void;
  note: string;
  onNoteChange: (v: string) => void;
  notePlaceholder: string;
  onSave: () => void;
  saving: boolean;
  onDelete?: () => void;
  deleting: boolean;
}) {
  return (
    <div className="bg-[#824c71]/[0.05] rounded-2xl p-3.5 mb-4">
      <div className="flex items-center justify-between mb-3.5">
        <p className="text-sm font-bold text-zinc-800">{formatPersianDate(dateStr)}</p>
        <IconButton onClick={onClose}>
          <X className="w-3.5 h-3.5" {...ICON} />
        </IconButton>
      </div>

      <div className="flex items-center justify-between mb-3 bg-white rounded-xl p-3">
        <div>
          <p className="text-sm font-bold text-zinc-800">{offTitle}</p>
          <p className="text-[11px] text-zinc-400 mt-0.5">{offHint}</p>
        </div>
        <Switch on={isOff} onClick={onToggleOff} />
      </div>

      {!isOff && <ClosedRangesEditor ranges={ranges} onChange={onRangesChange} />}

      <div className="mb-4">
        <label className="block text-xs font-bold text-zinc-500 mb-1.5">
          یادداشت <span className="font-normal text-zinc-400">اختیاری</span>
        </label>
        <input
          value={note}
          onChange={(e) => onNoteChange(e.target.value)}
          placeholder={notePlaceholder}
          className="w-full bg-white rounded-xl px-3.5 py-2.5 text-sm outline-none border border-transparent focus:border-[#824c71]/50 placeholder:text-zinc-400"
        />
      </div>

      <div className="flex gap-2">
        <button
          onClick={onSave}
          disabled={saving}
          className="flex-1 bg-[#824c71] text-white rounded-xl py-2.5 text-xs font-bold disabled:opacity-60 flex items-center justify-center gap-1.5"
        >
          {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" {...ICON} />}
          ذخیره
        </button>
        {onDelete && (
          <button
            onClick={onDelete}
            disabled={deleting}
            className="px-4 rounded-xl bg-red-50 text-red-500 text-xs font-bold disabled:opacity-50"
          >
            {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" {...ICON} /> : 'حذف'}
          </button>
        )}
      </div>
    </div>
  );
}

function OverrideList({
  title,
  emptyText,
  items,
  onOpen,
  onDelete,
}: {
  title: string;
  emptyText: string;
  items: { id: string; date: string; isOff: boolean; closedRanges?: unknown; note: string | null }[];
  onOpen: (date: string) => void;
  onDelete: (date: string) => void;
}) {
  return (
    <div>
      <p className="text-xs font-bold text-zinc-500 mb-2 px-1">{title}</p>
      {items.length === 0 ? (
        <div className="text-center py-7 bg-white rounded-2xl">
          <p className="text-zinc-400 text-xs">{emptyText}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((o) => {
            const closed = parseClosedRangesClient(o.closedRanges);
            return (
              <div key={o.id} className={`${card} flex items-center justify-between gap-2 px-3.5 py-3`}>
                <button onClick={() => onOpen(o.date)} className="flex-1 flex items-center gap-3 text-right">
                  <IconBadge size="sm" tone={o.isOff ? 'red' : 'brand'}>
                    {o.isOff ? (
                      <CalendarX2 className="w-4 h-4" {...ICON} />
                    ) : (
                      <CalendarClock className="w-4 h-4" {...ICON} />
                    )}
                  </IconBadge>
                  <div>
                    <p className="text-xs font-bold text-zinc-800">{formatPersianDate(o.date)}</p>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      {o.isOff
                        ? 'تعطیل کامل'
                        : closed.length > 0
                        ? `تعطیل: ${formatClosedRangesSummary(closed)}`
                        : 'بدون بازه‌ی بسته'}
                      {o.note ? ` · ${o.note}` : ''}
                    </p>
                  </div>
                </button>
                <IconButton tone="red" onClick={() => onDelete(o.date)}>
                  <Trash2 className="w-3.5 h-3.5" {...ICON} />
                </IconButton>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SectionHeader({
  icon,
  title,
  badge,
  badgeTone = 'neutral',
  hint,
}: {
  icon: ReactNode;
  title: string;
  badge: string;
  badgeTone?: 'neutral' | 'brand';
  hint: string;
}) {
  return (
    <div className="mb-3">
      <div className="flex items-center gap-2.5 mb-1.5">
        <IconBadge size="sm" tone={badgeTone === 'brand' ? 'brand' : 'neutral'}>
          {icon}
        </IconBadge>
        <p className="text-sm font-bold text-zinc-800">{title}</p>
        <span
          className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
            badgeTone === 'brand' ? 'bg-[#824c71]/10 text-[#824c71]' : 'bg-zinc-100 text-zinc-500'
          }`}
        >
          {badge}
        </span>
      </div>
      <p className="text-[11px] text-zinc-400 leading-relaxed">{hint}</p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// StaffScheduleTab (تب «برنامه پرسنل»)
// دو بخش کاملاً مجزا:
//   ۱) «روزهای ثابت تعطیل» (همیشگی) — فیلد offDays روی Staff
//      API: PATCH /api/staff/[id]  با body: { offDays: string[] }
//   ۲) «مرخصی / تغییر ساعت برای یک روز خاص» (موقت) — StaffScheduleOverride
//      API: POST/DELETE /api/staff-overrides
// ═══════════════════════════════════════════════════════════════════════════

function StaffScheduleTab({
  staff,
  onRefresh,
}: {
  staff: StaffMember[];
  onRefresh: () => void;
}) {
  const [selectedStaffId, setSelectedStaffId] = useState<string>(staff[0]?.id ?? '');

  // ── بخش ۱ ──
  const [savingOffDay, setSavingOffDay] = useState<string | null>(null);

  // ── بخش ۲ ──
  const [overrides, setOverrides] = useState<StaffOverride[]>([]);
  const [isLoadingOverrides, setIsLoadingOverrides] = useState(false);
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);
  const [editIsDayOff, setEditIsDayOff] = useState(false);
  const [editClosedRanges, setEditClosedRanges] = useState<ClosedRange[]>([]);
  const [editNote, setEditNote] = useState('');
  const [savingOverride, setSavingOverride] = useState(false);
  const [deletingOverride, setDeletingOverride] = useState(false);

  // ماهی که همین الان روی تقویم نمایش داده می‌شه
  const [viewedMonth, setViewedMonth] = useState<{ year: number; month: number }>(() => {
    const now = new DateObject({ calendar: persian, locale: persian_fa });
    return { year: now.year, month: now.month.number };
  });

  useEffect(() => {
    if (staff.length === 0) {
      setSelectedStaffId('');
      return;
    }
    if (!staff.some((s) => s.id === selectedStaffId)) {
      setSelectedStaffId(staff[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staff]);

  const currentStaff = staff.find((s) => s.id === selectedStaffId);

  const fetchOverrides = useCallback(async () => {
    if (!selectedStaffId) { setOverrides([]); return; }
    setIsLoadingOverrides(true);
    try {
      const res = await fetch(`/api/staff-overrides?staffId=${selectedStaffId}`);
      if (res.ok) {
        const data = await res.json();
        setOverrides(data.overrides ?? []);
      }
    } finally {
      setIsLoadingOverrides(false);
    }
  }, [selectedStaffId]);

  useEffect(() => {
    setSelectedDateStr(null);
    fetchOverrides();
  }, [fetchOverrides]);

  const overrideMap = useMemo(() => {
    const map: Record<string, StaffOverride> = {};
    overrides.forEach((o) => { map[o.date] = o; });
    return map;
  }, [overrides]);

  const sortedOverrides = useMemo(
    () => [...overrides].sort((a, b) => a.date.localeCompare(b.date)),
    [overrides]
  );

  // فقط مواردی که تاریخشون توی همون ماهیه که الان روی تقویم بازه
  const overridesInViewedMonth = useMemo(
    () =>
      sortedOverrides.filter((o) => {
        const d = new DateObject({ date: new Date(o.date), calendar: persian, locale: persian_fa });
        return d.year === viewedMonth.year && d.month.number === viewedMonth.month;
      }),
    [sortedOverrides, viewedMonth]
  );

  const calendarMarkers = useMemo(() => {
    const map: Record<string, CalendarDayMarker> = {};
    overrides.forEach((o) => {
      map[o.date] = o.isDayOff
        ? { className: 'bg-red-50 text-red-500', dotClassName: 'bg-red-400' }
        : { className: 'bg-[#824c71]/10 text-[#824c71]', dotClassName: 'bg-[#824c71]' };
    });
    return map;
  }, [overrides]);

  // ── اکشن بخش ۱ ──
  const toggleOffDay = async (day: string) => {
    if (!currentStaff) return;
    const current = currentStaff.offDays ?? [];
    const newOffDays = current.includes(day)
      ? current.filter((d) => d !== day)
      : [...current, day];

    setSavingOffDay(day);
    try {
      await fetch(`/api/staff/${selectedStaffId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offDays: newOffDays }),
      });
      onRefresh();
    } finally {
      setSavingOffDay(null);
    }
  };

  // ── اکشن بخش ۲ ──
  const openDay = (dateStr: string) => {
    setSelectedDateStr(dateStr);
    const existing = overrideMap[dateStr];
    setEditIsDayOff(existing?.isDayOff ?? false);
    setEditClosedRanges(parseClosedRangesClient(existing?.closedRanges));
    setEditNote(existing?.note ?? '');
  };

  const handleSaveOverride = async () => {
    if (!selectedDateStr || !selectedStaffId) return;
    setSavingOverride(true);
    try {
      await fetch('/api/staff-overrides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffId: selectedStaffId,
          date: selectedDateStr,
          isDayOff: editIsDayOff,
          start: null,
          end: null,
          closedRanges: editIsDayOff ? [] : editClosedRanges,
          note: editNote || null,
        }),
      });
      await fetchOverrides();
    } finally {
      setSavingOverride(false);
    }
  };

  const handleDeleteOverride = async (dateStr: string) => {
    if (!selectedStaffId) return;
    if (!confirm('این مورد حذف شود؟')) return;
    setDeletingOverride(true);
    try {
      await fetch('/api/staff-overrides', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staffId: selectedStaffId, date: dateStr }),
      });
      if (selectedDateStr === dateStr) setSelectedDateStr(null);
      await fetchOverrides();
    } finally {
      setDeletingOverride(false);
    }
  };

  if (staff.length === 0) {
    return (
      <EmptyState
        icon={<UsersRound className="w-6 h-6" {...ICON} />}
        title="ابتدا یک پرسنل ثبت کنید"
        hint="از تب «پرسنل» می‌توانید پرسنل اضافه کنید"
      />
    );
  }

  return (
    <div>
      {/* انتخاب پرسنل — مشترک بین هر دو بخش */}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-4">
        {staff.map((s) => (
          <button
            key={s.id}
            onClick={() => setSelectedStaffId(s.id)}
            className={`shrink-0 flex items-center gap-2 pl-4 pr-1.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
              selectedStaffId === s.id ? 'bg-[#824c71] text-white' : 'bg-white text-zinc-600'
            }`}
          >
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] ${
                selectedStaffId === s.id ? 'bg-white/20' : 'bg-zinc-100 text-zinc-500'
              }`}
            >
              {s.name.slice(0, 1)}
            </span>
            {s.name}
          </button>
        ))}
      </div>

      {currentStaff && (
        <>
          {/* بخش ۱ / ۲ — روزهای ثابت تعطیل (همیشگی) */}
          <div className={`${card} p-3.5 mb-3`}>
            <SectionHeader
              icon={<CalendarX2 className="w-4 h-4" {...ICON} />}
              title="روزهای ثابت تعطیل"
              badge="همیشگی"
              hint={`این روزها، ${currentStaff.name} هر هفته و برای همیشه تعطیل است — بدون نیاز به ثبت جداگانه.`}
            />
            <div className="flex flex-wrap gap-2">
              {WEEK_DAYS.map((day) => {
                const isOff = (currentStaff.offDays ?? []).includes(day);
                const isSaving = savingOffDay === day;
                return (
                  <button
                    key={day}
                    onClick={() => toggleOffDay(day)}
                    disabled={isSaving}
                    className={`px-3.5 py-2.5 rounded-full text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1.5 ${
                      isOff ? 'bg-red-50 text-red-600' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                    }`}
                  >
                    {isSaving && <Loader2 className="w-3 h-3 animate-spin" {...ICON} />}
                    {isOff && !isSaving && <X className="w-3 h-3" strokeWidth={2.5} />}
                    {day}
                  </button>
                );
              })}
            </div>

            {(currentStaff.offDays ?? []).length > 0 && (
              <p className="text-[11px] text-zinc-400 mt-3">
                {currentStaff.name} در روزهای{' '}
                <span className="text-red-500 font-bold">{(currentStaff.offDays ?? []).join('، ')}</span>{' '}
                همیشه تعطیل است
              </p>
            )}
          </div>

          {/* بخش ۲ / ۲ — مرخصی یا تغییر ساعت در یک روز خاص (موقت) */}
          <div className={`${card} p-3.5 mb-3`}>
            <SectionHeader
              icon={<CalendarClock className="w-4 h-4" {...ICON} />}
              title="مرخصی یا تغییر ساعت برای یک روز خاص"
              badge="موقت"
              badgeTone="brand"
              hint={`فقط همون تاریخی که از تقویم زیر انتخاب می‌کنید تغییر می‌کند؛ باقی روزها طبق برنامه‌ی معمول ${currentStaff.name} می‌ماند.`}
            />

            <div className="relative mb-3">
              {isLoadingOverrides && (
                <div className="absolute inset-0 bg-white/60 flex items-center justify-center rounded-xl z-10">
                  <Loader2 className="w-5 h-5 text-[#824c71] animate-spin" {...ICON} />
                </div>
              )}
              <PersianCalendar
                selectedDate={selectedDateStr}
                onSelectDate={(dateStr) => openDay(dateStr)}
                markers={calendarMarkers}
                onMonthChange={(year, month) => setViewedMonth({ year, month })}
              />
            </div>

            <OverrideLegend fullLabel="مرخصی کامل آن روز" rangeLabel="بازه‌ی ساعتی بسته در آن روز" />

            {selectedDateStr && (
              <OverrideDayEditor
                dateStr={selectedDateStr}
                onClose={() => setSelectedDateStr(null)}
                offTitle="مرخصی کامل"
                offHint="فقط همین یک روز کاری نیست"
                isOff={editIsDayOff}
                onToggleOff={() => setEditIsDayOff((p) => !p)}
                ranges={editClosedRanges}
                onRangesChange={setEditClosedRanges}
                note={editNote}
                onNoteChange={setEditNote}
                notePlaceholder="مثلاً: مرخصی استعلاجی"
                onSave={handleSaveOverride}
                saving={savingOverride}
                onDelete={overrideMap[selectedDateStr] ? () => handleDeleteOverride(selectedDateStr) : undefined}
                deleting={deletingOverride}
              />
            )}
          </div>

          <OverrideList
            title={`موارد موقت این ماه برای ${currentStaff.name}`}
            emptyText="در این ماه مرخصی یا بازه‌ی ساعتی خاصی ثبت نشده"
            items={overridesInViewedMonth.map((o) => ({
              id: o.id, date: o.date, isOff: o.isDayOff, closedRanges: o.closedRanges, note: o.note,
            }))}
            onOpen={openDay}
            onDelete={handleDeleteOverride}
          />
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SalonScheduleOverrideSection (تقویم ماهانه داخل تب «برنامه سالن»)
// مثل بخش ۲ از StaffScheduleTab ولی برای خود سالن.
// منبع داده: SalonScheduleOverride — API: POST/DELETE /api/salon-overrides
// ═══════════════════════════════════════════════════════════════════════════

function SalonScheduleOverrideSection() {
  const [overrides, setOverrides] = useState<SalonOverride[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);
  const [editIsClosed, setEditIsClosed] = useState(true);
  const [editClosedRanges, setEditClosedRanges] = useState<ClosedRange[]>([]);
  const [editNote, setEditNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [viewedMonth, setViewedMonth] = useState<{ year: number; month: number }>(() => {
    const now = new DateObject({ calendar: persian, locale: persian_fa });
    return { year: now.year, month: now.month.number };
  });

  const fetchOverrides = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/salon-overrides');
      if (res.ok) setOverrides((await res.json()).overrides ?? []);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchOverrides(); }, [fetchOverrides]);

  const overrideMap = useMemo(() => {
    const map: Record<string, SalonOverride> = {};
    overrides.forEach((o) => { map[o.date] = o; });
    return map;
  }, [overrides]);

  const sortedOverrides = useMemo(
    () => [...overrides].sort((a, b) => a.date.localeCompare(b.date)),
    [overrides]
  );

  const overridesInViewedMonth = useMemo(
    () =>
      sortedOverrides.filter((o) => {
        const d = new DateObject({ date: new Date(o.date), calendar: persian, locale: persian_fa });
        return d.year === viewedMonth.year && d.month.number === viewedMonth.month;
      }),
    [sortedOverrides, viewedMonth]
  );

  const calendarMarkers = useMemo(() => {
    const map: Record<string, CalendarDayMarker> = {};
    overrides.forEach((o) => {
      map[o.date] = o.isClosed
        ? { className: 'bg-red-50 text-red-500', dotClassName: 'bg-red-400' }
        : { className: 'bg-[#824c71]/10 text-[#824c71]', dotClassName: 'bg-[#824c71]' };
    });
    return map;
  }, [overrides]);

  const openDay = (dateStr: string) => {
    setSelectedDateStr(dateStr);
    const existing = overrideMap[dateStr];
    // برای تاریخ جدید پیش‌فرض «تعطیل نیست» است، تا با خاموش‌نکردن سوییچ
    // کل روز اشتباهی تعطیل نشود (مشابه بخش پرسنل)
    setEditIsClosed(existing?.isClosed ?? false);
    setEditClosedRanges(parseClosedRangesClient(existing?.closedRanges));
    setEditNote(existing?.note ?? '');
  };

  const handleSave = async () => {
    if (!selectedDateStr) return;
    setSaving(true);
    try {
      await fetch('/api/salon-overrides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDateStr,
          isClosed: editIsClosed,
          start: null,
          end: null,
          closedRanges: editIsClosed ? [] : editClosedRanges,
          note: editNote || null,
        }),
      });
      await fetchOverrides();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (dateStr: string) => {
    if (!confirm('این مورد حذف شود؟')) return;
    setDeleting(true);
    try {
      await fetch('/api/salon-overrides', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: dateStr }),
      });
      if (selectedDateStr === dateStr) setSelectedDateStr(null);
      await fetchOverrides();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="mt-3">
      <div className={`${card} p-3.5 mb-3`}>
        <SectionHeader
          icon={<CalendarX2 className="w-4 h-4" {...ICON} />}
          title="تعطیلی یا تغییر ساعت یک روز خاص"
          badge="موقت"
          badgeTone="brand"
          hint="فقط همون تاریخی که از تقویم زیر انتخاب می‌کنید تغییر می‌کند؛ باقی روزها طبق برنامه‌ی هفتگی بالا می‌ماند."
        />

        <div className="relative mb-3">
          {isLoading && (
            <div className="absolute inset-0 bg-white/60 flex items-center justify-center rounded-xl z-10">
              <Loader2 className="w-5 h-5 text-[#824c71] animate-spin" {...ICON} />
            </div>
          )}
          <PersianCalendar
            selectedDate={selectedDateStr}
            onSelectDate={(dateStr) => openDay(dateStr)}
            markers={calendarMarkers}
            onMonthChange={(year, month) => setViewedMonth({ year, month })}
          />
        </div>

        <OverrideLegend fullLabel="تعطیل کامل" rangeLabel="بازه‌ی ساعتی بسته" />

        {selectedDateStr && (
          <OverrideDayEditor
            dateStr={selectedDateStr}
            onClose={() => setSelectedDateStr(null)}
            offTitle="تعطیل کامل"
            offHint="سالن این روز اصلاً نوبت‌دهی ندارد"
            isOff={editIsClosed}
            onToggleOff={() => setEditIsClosed((p) => !p)}
            ranges={editClosedRanges}
            onRangesChange={setEditClosedRanges}
            note={editNote}
            onNoteChange={setEditNote}
            notePlaceholder="مثلاً: تعطیلی رسمی"
            onSave={handleSave}
            saving={saving}
            onDelete={overrideMap[selectedDateStr] ? () => handleDelete(selectedDateStr) : undefined}
            deleting={deleting}
          />
        )}
      </div>

      <OverrideList
        title="موارد موقت این ماه"
        emptyText="در این ماه تعطیلی یا بازه‌ی ساعتی خاصی ثبت نشده"
        items={overridesInViewedMonth.map((o) => ({
          id: o.id, date: o.date, isOff: o.isClosed, closedRanges: o.closedRanges, note: o.note,
        }))}
        onOpen={openDay}
        onDelete={handleDelete}
      />
    </div>
  );
}

// ─── Schedule Tab ─────────────────────────────────────────────────────────────

function ScheduleTab({
  schedule,
  grid,
  onSave,
}: {
  schedule: WeeklySchedule;
  grid: number;
  onSave: (s: WeeklySchedule, g: number) => Promise<void>;
}) {
  const [local, setLocal] = useState<WeeklySchedule>(() => ({ ...DEFAULT_SCHEDULE, ...schedule }));
  const [localGrid, setLocalGrid] = useState(grid);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const toggle = (day: string) =>
    setLocal((p) => ({ ...p, [day]: { ...p[day], open: !p[day].open } }));

  const setTime = (day: string, field: 'start' | 'end', val: string) =>
    setLocal((p) => ({ ...p, [day]: { ...p[day], [field]: val } }));

  const handleSave = async () => {
    setSaving(true);
    await onSave(local, localGrid);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const timeCls =
    'w-[72px] sm:w-20 bg-zinc-50 rounded-lg px-0.5 py-1.5 text-[11px] text-center outline-none border border-transparent focus:bg-white focus:border-[#824c71]/50';

  return (
    <div>
      {/* Grid */}
      <div className={`${card} p-3.5 mb-3`}>
        <div className="flex items-center gap-2.5 mb-3">
          <IconBadge size="sm">
            <Timer className="w-4 h-4" {...ICON} />
          </IconBadge>
          <p className="text-sm font-bold text-zinc-800">فاصله شروع نوبت‌ها</p>
        </div>
        <div className="flex gap-2">
          {[15, 30, 60].map((g) => (
            <button
              key={g}
              onClick={() => setLocalGrid(g)}
              className={`flex-1 py-2.5 rounded-full text-sm font-bold transition-all ${
                localGrid === g ? 'bg-[#824c71] text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              }`}
            >
              {toPersianDigits(String(g))} دقیقه
            </button>
          ))}
        </div>
        <p className="text-[11px] text-zinc-400 mt-2.5">
          مشتریان می‌توانند هر {toPersianDigits(String(localGrid))} دقیقه یک‌بار شروع نوبت را انتخاب کنند
        </p>
      </div>

      {/* Weekly */}
      <div className={`${card} overflow-hidden mb-3`}>
        <div className="flex items-center gap-2.5 px-3.5 pt-3.5 pb-2">
          <IconBadge size="sm">
            <CalendarDays className="w-4 h-4" {...ICON} />
          </IconBadge>
          <p className="text-sm font-bold text-zinc-800">برنامه هفتگی سالن</p>
        </div>
        {WEEK_DAYS.map((day, idx) => {
          const d = local[day] ?? { open: false, start: '09:00', end: '20:00' };
          return (
            <div
              key={day}
              className={`flex items-center justify-between gap-1.5 px-3.5 py-3 ${
                idx < WEEK_DAYS.length - 1 ? 'border-b border-zinc-50' : ''
              }`}
            >
              <div className="flex items-center gap-2.5 shrink-0">
                <Switch on={d.open} onClick={() => toggle(day)} size="sm" />
                <span className={`text-xs font-bold shrink-0 whitespace-nowrap ${d.open ? 'text-zinc-800' : 'text-zinc-400'}`}>
                  {day}
                </span>
              </div>

              {d.open ? (
                <div className="flex items-center gap-1 shrink-0 min-w-0">
                  <input
                    type="time"
                    dir="ltr"
                    value={d.start}
                    onChange={(e) => setTime(day, 'start', e.target.value)}
                    className={timeCls}
                  />
                  <span className="text-zinc-400 text-[10px] shrink-0">تا</span>
                  <input
                    type="time"
                    dir="ltr"
                    value={d.end}
                    onChange={(e) => setTime(day, 'end', e.target.value)}
                    className={timeCls}
                  />
                </div>
              ) : (
                <span className="text-xs text-zinc-400 shrink-0">تعطیل</span>
              )}
            </div>
          );
        })}
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className={`w-full rounded-xl py-3 text-sm font-bold transition-all flex items-center justify-center gap-2 ${
          saved ? 'bg-emerald-500 text-white' : 'bg-[#824c71] text-white disabled:opacity-60'
        }`}
      >
        {saving ? (
          <Loader2 className="w-4 h-4 animate-spin" {...ICON} />
        ) : saved ? (
          <Check className="w-4 h-4" strokeWidth={2.5} />
        ) : null}
        {saved ? 'ذخیره شد' : saving ? 'در حال ذخیره...' : 'ذخیره برنامه هفتگی'}
      </button>

      {/* تقویم ماهانه — تعطیلی یا تغییر ساعت یک روز خاص، مستقل از برنامه‌ی هفتگی بالا */}
      <SalonScheduleOverrideSection />
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function BookingSettingsPage() {
  const router = useRouter();

  const [hasSalon, setHasSalon] = useState<boolean | null>(null);
  const [salonName, setSalonName] = useState('');
  const [bookingEnabled, setBookingEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [services, setServices] = useState<BookingService[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [schedule, setSchedule] = useState<WeeklySchedule>(DEFAULT_SCHEDULE);
  const [grid, setGrid] = useState(30);

  const [tab, setTab] = useState(0);

  const fetchAll = useCallback(async () => {
    try {
      const profileRes = await fetch('/api/user/profile');
      if (!profileRes.ok) {
        if (profileRes.status === 401) router.push('/login');
        return;
      }
      const profileData = await profileRes.json();
      if (!profileData.salon) { setHasSalon(false); return; }

      setHasSalon(true);
      setSalonName(profileData.salon.name);
      setBookingEnabled(!!profileData.salon.bookingEnabled);

      const [svcRes, staffRes, schedRes] = await Promise.all([
        fetch('/api/booking-services'),
        fetch('/api/staff'),
        fetch('/api/salon/schedule'),
      ]);

      if (svcRes.ok) setServices((await svcRes.json()).services ?? []);
      if (staffRes.ok) setStaff((await staffRes.json()).staff ?? []);

      if (schedRes.ok) {
        const s = await schedRes.json();
        if (s.weeklySchedule) {
          // برنامه‌ی قبلاً ذخیره‌شده توسط خود سالن‌دار — دست نمی‌زنیم
          setSchedule(s.weeklySchedule);
        } else {
          // هنوز برنامه‌ای ذخیره نشده: پیش‌فرض رو از اطلاعات ثبت‌نام سالن می‌سازیم
          setSchedule(buildDefaultScheduleFromProfile(profileData.salon));
        }
        if (s.gridMinutes) setGrid(s.gridMinutes);
      } else {
        setSchedule(buildDefaultScheduleFromProfile(profileData.salon));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleToggle = async () => {
    const hasServices = services.some((s) => s.isActive);
    const hasStaff = staff.some((s) => (s.bookingServices ?? []).length > 0);

    if (!bookingEnabled && (!hasServices || !hasStaff)) {
      alert('برای فعال‌سازی ابتدا حداقل یک خدمت و یک پرسنل با خدمت تخصیص‌یافته تعریف کنید.');
      return;
    }

    setIsSaving(true);
    const newVal = !bookingEnabled;
    const res = await fetch('/api/salon/booking-settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingEnabled: newVal }),
    });
    if (res.ok) setBookingEnabled(newVal);
    setIsSaving(false);
  };

  const handleSaveSchedule = async (s: WeeklySchedule, g: number) => {
    await fetch('/api/salon/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weeklySchedule: s, gridMinutes: g }),
    });
    setSchedule(s);
    setGrid(g);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 text-[#824c71] animate-spin mb-4" {...ICON} />
        <p className="text-zinc-500 font-medium text-sm">در حال دریافت اطلاعات...</p>
      </div>
    );
  }

  if (hasSalon === false) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-2 text-center gap-4">
        <div className="w-16 h-16 rounded-3xl bg-zinc-100 text-zinc-400 flex items-center justify-center">
          <Store className="w-8 h-8" {...ICON} />
        </div>
        <p className="text-zinc-600 font-medium">شما هنوز کسب‌وکاری ثبت نکرده‌اید.</p>
        <Link href="/profile/business" className="bg-[#824c71] text-white px-5 py-2.5 rounded-xl text-sm font-bold">
          ثبت نام کسب‌وکار
        </Link>
      </div>
    );
  }

  const canEnable = services.some((s) => s.isActive) && staff.some((s) => (s.bookingServices ?? []).length > 0);

  // خدمات فعالی که به هیچ پرسنلی تخصیص داده نشده و پرسنل‌هایی که هیچ خدمتی ندارند — برای بنر بالای صفحه
  const servicesWithStaff = new Set<string>();
  staff.forEach((s) => (s.bookingServices ?? []).forEach((bs) => servicesWithStaff.add(bs.bookingServiceId)));
  const unlinkedServicesCount = services.filter((s) => s.isActive && !servicesWithStaff.has(s.id)).length;
  const unlinkedStaffCount = staff.filter((s) => (s.bookingServices ?? []).length === 0).length;

  return (
    <div className="max-w-2xl mx-auto pt-8 pb-32 px-2 md:pt-10 md:px-0">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <Link
          href="/my-salon"
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-[#824c71] text-white hover:bg-[#6f3f61] transition-colors shrink-0"
        >
          <ChevronRight className="w-5 h-5" strokeWidth={2.25} />
        </Link>
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-zinc-900">نوبت‌دهی آنلاین</h1>
          <p className="text-zinc-500 text-xs md:text-sm mt-0.5 flex items-center gap-1.5">
            <Store className="w-3.5 h-3.5 text-zinc-400" {...ICON} />
            {salonName}
          </p>
        </div>
      </div>

      {/* Toggle Card */}
      <div
        className={`rounded-2xl p-3.5 mb-4 flex items-center justify-between gap-4 transition-colors ${
          bookingEnabled ? 'bg-[#824c71]/[0.07]' : 'bg-white shadow-[0_1px_3px_rgba(0,0,0,0.05)]'
        }`}
      >
        <div className="flex items-center gap-3">
          <IconBadge tone={bookingEnabled ? 'brand' : 'neutral'}>
            {bookingEnabled ? (
              <CalendarCheck2 className="w-5 h-5" {...ICON} />
            ) : (
              <CalendarClock className="w-5 h-5" {...ICON} />
            )}
          </IconBadge>
          <div>
            <p className="text-sm font-bold text-zinc-900">وضعیت نوبت‌دهی</p>
            <p className="text-xs mt-0.5 text-zinc-500">
              {bookingEnabled
                ? 'فعال — مشتریان می‌توانند نوبت بگیرند'
                : canEnable
                ? 'آماده فعال‌سازی'
                : 'ابتدا خدمات و پرسنل را تنظیم کنید'}
            </p>
          </div>
        </div>
        <button onClick={handleToggle} disabled={isSaving} className="shrink-0 disabled:opacity-50">
          {isSaving ? (
            <Loader2 className="w-5 h-5 text-[#824c71] animate-spin" {...ICON} />
          ) : (
            <div className={`relative w-14 h-7 rounded-full transition-colors duration-300 ${bookingEnabled ? 'bg-[#824c71]' : 'bg-zinc-200'}`}>
              <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-sm transition-all duration-300 ${bookingEnabled ? 'right-1' : 'right-8'}`} />
            </div>
          )}
        </button>
      </div>

      {/* هشدار خلاصه — خدمات بدون پرسنل یا پرسنل بدون خدمت */}
      {(unlinkedServicesCount > 0 || unlinkedStaffCount > 0) && (
        <div className="flex items-start gap-3 bg-amber-50 rounded-2xl p-3.5 mb-5">
          <IconBadge size="sm" tone="amber">
            <TriangleAlert className="w-4 h-4" {...ICON} />
          </IconBadge>
          <div className="text-amber-700">
            <p className="text-xs font-bold mb-1">نیاز به تکمیل تنظیمات</p>
            <ul className="text-[11px] space-y-0.5 leading-relaxed">
              {unlinkedServicesCount > 0 && (
                <li>• {unlinkedServicesCount.toLocaleString('fa-IR')} خدمت هنوز به هیچ پرسنلی تخصیص داده نشده</li>
              )}
              {unlinkedStaffCount > 0 && (
                <li>• {unlinkedStaffCount.toLocaleString('fa-IR')} پرسنل هنوز هیچ خدمتی ندارد</li>
              )}
            </ul>
          </div>
        </div>
      )}

      {/* Steps */}
      <TabBar
        active={tab}
        onChange={setTab}
        hasServices={services.length > 0}
        hasStaff={staff.length > 0}
      />

      {tab === 0 && <ServicesTab services={services} staff={staff} onRefresh={fetchAll} />}
      {tab === 1 && <StaffTab staff={staff} services={services} onRefresh={fetchAll} />}
      {tab === 2 && <ScheduleTab schedule={schedule} grid={grid} onSave={handleSaveSchedule} />}
      {tab === 3 && <StaffScheduleTab staff={staff} onRefresh={fetchAll} />}
    </div>
  );
}