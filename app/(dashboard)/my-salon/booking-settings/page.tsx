// app/(dashboard)/my-salon/booking-settings/page.tsx
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowRight, Loader2, Store, CalendarClock, Settings2,
  Plus, Trash2, Pencil, X, Check, ChevronDown, Users, Clock, CalendarOff,
} from 'lucide-react';
import { DateObject } from 'react-multi-date-picker';
import PersianCalendar, { CalendarDayMarker } from '@/components/ui/PersianCalendar';
import persian from 'react-date-object/calendars/persian';
import persian_fa from 'react-date-object/locales/persian_fa';
import { toDateOnlyAnchor } from '@/lib/dateUtils';

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

type StaffOverride = {
  id: string;
  staffId: string;
  date: string; // "YYYY-MM-DD" میلادی
  isDayOff: boolean;
  start: string | null;
  end: string | null;
  note: string | null;
};

// override دستی برای یک تاریخ خاص از خود سالن
type SalonOverride = {
  id: string;
  date: string; // "YYYY-MM-DD" میلادی
  isClosed: boolean;
  start: string | null;
  end: string | null;
  note: string | null;
};

type DaySchedule = { open: boolean; start: string; end: string };
type WeeklySchedule = Record<string, DaySchedule>;

const WEEK_DAYS = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];

const DEFAULT_SCHEDULE: WeeklySchedule = Object.fromEntries(
  WEEK_DAYS.map((d) => [d, { open: d !== 'جمعه', start: '09:00', end: '20:00' }])
);

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

// نمایش با جداکننده سه‌رقمی فارسی
const formatPrice = (n: number) => n.toLocaleString('fa-IR');

// جدا کردن "HH:MM" به ساعت/دقیقه برای دو کادر جدا (نیتیو input[type=time] در موبایل
// گاهی به‌درستی جمع نمی‌شه و باعث می‌شه کادرهای شروع/پایان به هم بچسبن)
const splitTime = (v: string) => {
  const [h = '', m = ''] = (v || '').split(':');
  return { h, m };
};
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

// نمایش مقدار خام در input: سه‌رقم سه‌رقم بدون تبدیل به فارسی
const displayNumber = (raw: string) => {
  if (!raw) return '';
  const n = Number(raw);
  if (isNaN(n)) return raw;
  return n.toLocaleString('en-US');
};

// تبدیل ارقام فارسی/عربی به انگلیسی در کل متن (بدون حذف بقیه کاراکترها)
const toEnglishDigitsInText = (str: string) =>
  str
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - '۰'.charCodeAt(0)))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - '٠'.charCodeAt(0)));

// تلاش برای استخراج ساعت شروع/پایان از متن آزاد ثبت‌نام، مثل «۱۰ صبح تا ۸ شب»
// اگر نتواند تشخیص دهد null برمی‌گرداند تا مقدار پیش‌فرض ۹ تا ۲۰ جایگزین شود
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

// ساخت برنامه‌ی هفتگی پیش‌فرض بر اساس اطلاعات همان ثبت‌نام اولیه‌ی سالن
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

// ─── Sub-components ──────────────────────────────────────────────────────────

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
  const tabs = ['خدمات', 'پرسنل', 'برنامه سالن', 'برنامه پرسنل'];
  return (
    <div className="flex bg-zinc-100 rounded-xl p-1 mb-6 gap-1">
      {tabs.map((t, i) => (
        <button
          key={t}
          onClick={() => onChange(i)}
          className={`flex-1 py-2 rounded-lg text-[11px] font-bold transition-all ${
            active === i
              ? 'bg-white text-[#824c71] shadow-sm'
              : 'text-zinc-500 hover:text-zinc-700'
          }`}
        >
          {t}
        </button>
      ))}
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

  const handlePriceChange = (val: string) => setPriceRaw(toEnglishDigits(val));
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
    setErr('');
    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        durationMin: dMin,
        price: priceRaw ? Number(priceRaw) : 0,
      });
      onClose();
    } catch (e: any) {
      setErr(e.message || 'خطا در ذخیره');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm sm:p-4" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 pb-8 sm:pb-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-bold text-zinc-900">
            {initial?.id ? 'ویرایش خدمات' : 'افزودن خدمات'}
          </h3>
          <button onClick={onClose} className="p-1.5 text-zinc-400 bg-zinc-50 rounded-full">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1.5">
              نام خدمات <span className="text-red-500">*</span>
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثلاً کاشت ناخن"
              className="w-full border border-zinc-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#824c71] focus:ring-1 focus:ring-[#824c71]/20"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1.5">
                مدت زمان <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  value={durMin}
                  onChange={(e) => setDurMin(sanitizeMinute(e.target.value))}
                  placeholder="دقیقه"
                  dir="ltr"
                  inputMode="numeric"
                  className="w-full border border-zinc-200 rounded-xl px-2 py-2.5 text-sm text-center focus:outline-none focus:border-[#824c71] focus:ring-1 focus:ring-[#824c71]/20"
                />
                <span className="text-zinc-400 font-bold shrink-0">:</span>
                <input
                  value={durHour}
                  onChange={(e) => setDurHour(sanitizeHour(e.target.value))}
                  placeholder="ساعت"
                  dir="ltr"
                  inputMode="numeric"
                  className="w-full border border-zinc-200 rounded-xl px-2 py-2.5 text-sm text-center focus:outline-none focus:border-[#824c71] focus:ring-1 focus:ring-[#824c71]/20"
                />
              </div>
              <p className="text-[10px] text-zinc-400 mt-1">ساعت و دقیقه — مثلاً ۱ و ۳۰</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1.5">
                قیمت (تومان)
                <span className="text-zinc-400 font-normal mr-1">اختیاری</span>
              </label>
              <input
                value={displayNumber(priceRaw)}
                onChange={(e) => handlePriceChange(e.target.value)}
                placeholder="مثلاً 500,000"
                dir="ltr"
                inputMode="numeric"
                className="w-full border border-zinc-200 rounded-xl px-3.5 py-2.5 text-sm text-left focus:outline-none focus:border-[#824c71] focus:ring-1 focus:ring-[#824c71]/20"
              />
            </div>
          </div>

          {err && <p className="text-red-500 text-xs font-medium">{err}</p>}

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-[#824c71] text-white rounded-xl py-3 text-sm font-bold disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? 'در حال ذخیره...' : 'ذخیره خدمات'}
          </button>
        </div>
      </div>
    </div>
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
    const url = editing
      ? `/api/booking-services/${editing.id}`
      : '/api/booking-services';
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
        <div className="text-center py-12 bg-zinc-50 rounded-2xl mb-4">
          <Clock className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
          <p className="text-zinc-500 text-sm font-medium">هنوز خدمتی تعریف نشده</p>
          <p className="text-zinc-400 text-xs mt-1">خدمات سالن را با مدت زمان و قیمت وارد کنید</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          {services.map((s) => (
            <div
              key={s.id}
              className={`border rounded-2xl p-4 transition-all ${
                s.isActive ? 'bg-white border-zinc-100' : 'bg-zinc-50 border-zinc-100 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-bold text-zinc-900 truncate">{s.name}</p>
                    {!s.isActive && (
                      <span className="text-[10px] bg-zinc-200 text-zinc-500 px-1.5 py-0.5 rounded-md font-medium shrink-0">
                        غیرفعال
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[12px] text-zinc-500 mb-1">
                    <span>⏱ {minToDuration(s.durationMin)}</span>
                    {s.price > 0 && <span>💰 {formatPrice(s.price)} تومان</span>}
                  </div>
                  {s.isActive && !servicesWithStaff.has(s.id) && (
                    <p className="text-[11px] text-amber-600 bg-amber-50 rounded-lg px-2 py-1 inline-flex items-center gap-1 mt-0.5">
                      ⚠️ هیچ پرسنلی این خدمت را انجام نمی‌دهد
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handleToggleActive(s)}
                    className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                      s.isActive
                        ? 'bg-emerald-50 text-emerald-600'
                        : 'bg-zinc-100 text-zinc-400'
                    }`}
                    title={s.isActive ? 'غیرفعال کردن' : 'فعال کردن'}
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => { setEditing(s); setShowForm(true); }}
                    className="w-7 h-7 rounded-lg bg-zinc-100 text-zinc-500 flex items-center justify-center"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(s.id)}
                    disabled={deletingId === s.id}
                    className="w-7 h-7 rounded-lg bg-red-50 text-red-500 flex items-center justify-center disabled:opacity-40"
                  >
                    {deletingId === s.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={() => { setEditing(null); setShowForm(true); }}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-zinc-200 text-zinc-500 text-sm font-medium hover:border-[#824c71]/40 hover:text-[#824c71] transition-colors"
      >
        <Plus className="w-4 h-4" />
        افزودن خدمات جدید
      </button>

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
    <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm sm:p-4" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 pb-8 sm:pb-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-bold text-zinc-900">
            {initial ? 'ویرایش پرسنل' : 'افزودن پرسنل'}
          </h3>
          <button onClick={onClose} className="p-1.5 text-zinc-400 bg-zinc-50 rounded-full">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1.5">
              نام پرسنل <span className="text-red-500">*</span>
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثلاً سارا محمدی"
              className="w-full border border-zinc-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#824c71] focus:ring-1 focus:ring-[#824c71]/20"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1.5">
                شماره موبایل <span className="text-red-500">*</span>
              </label>
              <input
                value={phone}
                onChange={(e) => setPhone(toEnglishDigitsPhone(e.target.value).slice(0, 11))}
                placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                dir="ltr"
                inputMode="numeric"
                className="w-full border border-zinc-200 rounded-xl px-3.5 py-2.5 text-sm text-left focus:outline-none focus:border-[#824c71] focus:ring-1 focus:ring-[#824c71]/20"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1.5">
                درصد پرسنل <span className="text-zinc-400 font-normal">(اختیاری)</span>
              </label>
              <div className="flex items-center border border-zinc-200 rounded-xl overflow-hidden focus-within:border-[#824c71] focus-within:ring-1 focus-within:ring-[#824c71]/20">
                <input
                  value={commission}
                  onChange={(e) => setCommission(sanitizeCommission(e.target.value))}
                  dir="ltr"
                  inputMode="numeric"
                  placeholder="مثلاً ۴۰"
                  className="w-full px-3.5 py-2.5 text-sm bg-transparent outline-none border-0"
                />
                <span className="text-zinc-400 text-xs pl-3 shrink-0">٪</span>
              </div>
            </div>
          </div>

          <p className="text-[10.5px] text-zinc-400 -mt-2 leading-relaxed">
            این درصد موقع ثبت نوبت آنلاین خودکار برای این پرسنل ثبت می‌شه؛ برای یه نوبت خاص هم می‌تونی بعداً از صفحه‌ی «نوبت‌ها» تغییرش بدی.
          </p>

          {err && <p className="text-red-500 text-xs font-medium">{err}</p>}

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-[#824c71] text-white rounded-xl py-3 text-sm font-bold disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? 'در حال ذخیره...' : 'ذخیره پرسنل'}
          </button>
        </div>
      </div>
    </div>
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

  // افزودن/ویرایش پرسنل — هر دو از یک مودال، مثل مودال خدمات
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
      <div className="text-center py-12 bg-zinc-50 rounded-2xl">
        <p className="text-zinc-500 text-sm font-medium">ابتدا خدمات سالن را تعریف کنید</p>
        <p className="text-zinc-400 text-xs mt-1">بعد از تعریف خدمات، می‌توانید به هر پرسنل خدمات تخصیص دهید</p>
      </div>
    );
  }

  return (
    <div>
      {staff.length === 0 ? (
        <div className="text-center py-10 bg-zinc-50 rounded-2xl mb-4">
          <Users className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
          <p className="text-zinc-500 text-sm font-medium">هنوز پرسنلی ثبت نشده</p>
          <p className="text-zinc-400 text-xs mt-1">پرسنل خود را از همین‌جا اضافه کنید</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          {staff.map((s) => {
            const assignedIds = new Set((s.bookingServices ?? []).map((b) => b.bookingServiceId));
            const isOpen = expanded === s.id;

            return (
              <div key={s.id} className="border border-zinc-100 rounded-2xl overflow-hidden bg-white self-start">
                <button
                  className="w-full flex items-center justify-between px-4 py-3.5 text-right"
                  onClick={() => setExpanded(isOpen ? null : s.id)}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-[#824c71]/10 text-[#824c71] flex items-center justify-center text-xs font-bold shrink-0">
                      {s.name.slice(0, 1)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-zinc-800 truncate">{s.name}</p>
                      {assignedIds.size === 0 ? (
                        <p className="text-[11px] text-amber-600 font-medium">⚠️ هیچ خدمتی تخصیص داده نشده</p>
                      ) : (
                        <p className="text-[11px] text-zinc-400 flex items-center gap-1.5 truncate">
                          <span>{assignedIds.size} خدمات تخصیص‌یافته</span>
                          {s.commissionPercent != null && (
                            <span className="text-[#824c71] font-medium">· {s.commissionPercent}٪ سهم پرسنل</span>
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditingStaff(s); setShowForm(true); }}
                      className="w-7 h-7 flex items-center justify-center rounded-lg bg-zinc-100 text-zinc-500"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteStaff(s.id); }}
                      disabled={deletingStaffId === s.id}
                      className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-50 text-red-400 disabled:opacity-40"
                    >
                      {deletingStaffId === s.id
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                    <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </div>
                </button>

                {isOpen && (
                  <div className="px-4 pb-4 border-t border-zinc-50">
                    <p className="text-[11px] text-zinc-400 mt-3 mb-2">خدمات این پرسنل:</p>
                    <div className="grid grid-cols-1 gap-1.5">
                      {services.map((svc) => {
                        const has = assignedIds.has(svc.id);
                        const isSaving = saving === s.id + svc.id;
                        return (
                          <button
                            key={svc.id}
                            onClick={() => toggleService(s.id, svc.id, has)}
                            disabled={isSaving || !svc.isActive}
                            className={`flex items-center justify-between px-3 py-2.5 rounded-xl border text-right transition-all disabled:opacity-40 ${
                              has
                                ? 'border-[#824c71]/30 bg-[#824c71]/5 text-[#824c71]'
                                : 'border-zinc-100 bg-zinc-50 text-zinc-600 hover:border-zinc-200'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                                has ? 'bg-[#824c71] border-[#824c71]' : 'border-zinc-300'
                              }`}>
                                {has && <Check className="w-2.5 h-2.5 text-white" />}
                              </div>
                              <span className="text-xs font-medium">{svc.name}</span>
                            </div>
                            <span className="text-[11px] text-zinc-400">{minToDuration(svc.durationMin)}</span>
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

      <button
        onClick={() => { setEditingStaff(null); setShowForm(true); }}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-zinc-200 text-zinc-500 text-sm font-medium hover:border-[#824c71]/40 hover:text-[#824c71] transition-colors"
      >
        <Plus className="w-4 h-4" />
        افزودن پرسنل جدید
      </button>

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
// StaffScheduleTab (تب «برنامه پرسنل»)
// این تابع دقیقاً دو بخش کاملاً مجزا دارد — هر دو با هم، هیچکدام حذف نشده:
//
//   بخش شماره ۱ — «روزهای ثابت تعطیل» (همیشگی)
//     منبع داده: فیلد offDays روی خود Staff (مثلاً همیشه جمعه‌ها تعطیل)
//     API: PATCH /api/staff/[id]  با body: { offDays: string[] }
//
//   بخش شماره ۲ — «مرخصی / تغییر ساعت برای یک روز خاص» (موقت)
//     منبع داده: جدول StaffScheduleOverride (فقط همون یک تاریخ خاص)
//     API: POST/DELETE /api/staff-overrides
//
// این دو بخش به هم ربطی ندارند و مستقل از هم کار می‌کنند.
// ═══════════════════════════════════════════════════════════════════════════

function StaffScheduleTab({
  staff,
  onRefresh,
}: {
  staff: StaffMember[];
  onRefresh: () => void;
}) {
  const [selectedStaffId, setSelectedStaffId] = useState<string>(staff[0]?.id ?? '');

  // ── state مربوط به بخش ۱ (روزهای ثابت تعطیل) ──
  const [savingOffDay, setSavingOffDay] = useState<string | null>(null);

  // ── state مربوط به بخش ۲ (تقویم / override تاریخ خاص) ──
  const [overrides, setOverrides] = useState<StaffOverride[]>([]);
  const [isLoadingOverrides, setIsLoadingOverrides] = useState(false);
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);
  const [editIsDayOff, setEditIsDayOff] = useState(false);
  const [editStartH, setEditStartH] = useState('');
  const [editStartM, setEditStartM] = useState('');
  const [editEndH, setEditEndH] = useState('');
  const [editEndM, setEditEndM] = useState('');
  const [editNote, setEditNote] = useState('');
  const [savingOverride, setSavingOverride] = useState(false);
  const [deletingOverride, setDeletingOverride] = useState(false);

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

  const calendarMarkers = useMemo(() => {
    const map: Record<string, CalendarDayMarker> = {};
    overrides.forEach((o) => {
      map[o.date] = o.isDayOff
        ? { className: 'bg-red-50 text-red-500', dotClassName: 'bg-red-400' }
        : { className: 'bg-[#824c71]/10 text-[#824c71]', dotClassName: 'bg-[#824c71]' };
    });
    return map;
  }, [overrides]);

  // ── اکشن بخش ۱: تعطیلی ثابت هفتگی ──
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

  // ── اکشن بخش ۲: override تاریخ خاص ──
  const openDay = (dateStr: string) => {
    setSelectedDateStr(dateStr);
    const existing = overrideMap[dateStr];
    setEditIsDayOff(existing?.isDayOff ?? false);
    const s = splitTime(existing?.start ?? '');
    const e = splitTime(existing?.end ?? '');
    setEditStartH(s.h);
    setEditStartM(s.m);
    setEditEndH(e.h);
    setEditEndM(e.m);
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
          start: editIsDayOff ? null : joinTime(editStartH, editStartM) || null,
          end: editIsDayOff ? null : joinTime(editEndH, editEndM) || null,
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

  const formatPersianDate = (dateStr: string) =>
    new DateObject({ date: new Date(dateStr), calendar: persian, locale: persian_fa }).format('D MMMM YYYY');

  if (staff.length === 0) {
    return (
      <div className="text-center py-12 bg-zinc-50 rounded-2xl">
        <Users className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
        <p className="text-zinc-500 text-sm font-medium">ابتدا یک پرسنل ثبت کنید</p>
        <p className="text-zinc-400 text-xs mt-1">از تب «پرسنل» می‌توانید پرسنل اضافه کنید</p>
      </div>
    );
  }

  return (
    <div>
      {/* انتخاب پرسنل — مشترک بین هر دو بخش */}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-5 -mx-1 px-1">
        {staff.map((s) => (
          <button
            key={s.id}
            onClick={() => setSelectedStaffId(s.id)}
            className={`shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
              selectedStaffId === s.id
                ? 'bg-[#824c71] text-white'
                : 'bg-zinc-100 text-zinc-600'
            }`}
          >
            {s.name}
          </button>
        ))}
      </div>

      {currentStaff && (
        <>
          {/* ┌─────────────────────────────────────────────────────────────┐
              │  بخش ۱ / ۲ — روزهای ثابت تعطیل (همیشگی)                     │
              └─────────────────────────────────────────────────────────────┘ */}
          <div className="bg-white border border-zinc-100 rounded-2xl p-4 mb-3">
            <div className="flex items-center gap-2 mb-1">
              <CalendarOff className="w-4 h-4 text-zinc-400" />
              <p className="text-sm font-bold text-zinc-800">روزهای ثابت تعطیل</p>
              <span className="text-[10px] bg-zinc-100 text-zinc-500 px-1.5 py-0.5 rounded-md font-medium">
                همیشگی
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 mb-4 leading-relaxed">
              این روزها، {currentStaff.name} هر هفته و برای همیشه تعطیل است — بدون نیاز به ثبت جداگانه.
            </p>
            <div className="flex flex-wrap gap-2">
              {WEEK_DAYS.map((day) => {
                const isOff = (currentStaff.offDays ?? []).includes(day);
                const isSaving = savingOffDay === day;
                return (
                  <button
                    key={day}
                    onClick={() => toggleOffDay(day)}
                    disabled={isSaving}
                    className={`px-3.5 py-2.5 rounded-xl text-xs font-bold border transition-all disabled:opacity-50 flex items-center gap-1.5 ${
                      isOff
                        ? 'bg-red-50 border-red-200 text-red-600'
                        : 'bg-zinc-50 border-zinc-100 text-zinc-600 hover:border-zinc-200'
                    }`}
                  >
                    {isSaving && <Loader2 className="w-3 h-3 animate-spin" />}
                    {isOff && !isSaving && <span>✕</span>}
                    {day}
                  </button>
                );
              })}
            </div>

            {(currentStaff.offDays ?? []).length > 0 && (
              <div className="mt-3 pt-3 border-t border-zinc-50">
                <p className="text-[11px] text-zinc-400">
                  {currentStaff.name} در روزهای{' '}
                  <span className="text-red-500 font-medium">
                    {(currentStaff.offDays ?? []).join('، ')}
                  </span>{' '}
                  همیشه تعطیل است
                </p>
              </div>
            )}
          </div>

          {/* ┌─────────────────────────────────────────────────────────────┐
              │  بخش ۲ / ۲ — مرخصی یا تغییر ساعت در یک روز خاص (موقت)       │
              └─────────────────────────────────────────────────────────────┘ */}
          <div className="mb-2 px-1">
            <div className="flex items-center gap-2 mb-1">
              <CalendarClock className="w-4 h-4 text-zinc-400" />
              <p className="text-sm font-bold text-zinc-800">مرخصی یا تغییر ساعت برای یک روز خاص</p>
              <span className="text-[10px] bg-[#824c71]/10 text-[#824c71] px-1.5 py-0.5 rounded-md font-medium">
                موقت
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 mb-3 leading-relaxed">
              فقط همون تاریخی که از تقویم زیر انتخاب می‌کنید تغییر می‌کند؛ باقی روزها طبق برنامه‌ی معمول {currentStaff.name} می‌ماند.
            </p>
          </div>

          <div className="relative mb-3">
            {isLoadingOverrides && (
              <div className="absolute inset-0 bg-white/60 flex items-center justify-center rounded-2xl z-10">
                <Loader2 className="w-5 h-5 text-[#824c71] animate-spin" />
              </div>
            )}
            <PersianCalendar
              selectedDate={selectedDateStr}
              onSelectDate={(dateStr) => openDay(dateStr)}
              markers={calendarMarkers}
            />
          </div>

          <div className="flex items-center gap-4 mb-5 px-1 text-[11px] text-zinc-500">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-red-50 border border-red-200" />
              مرخصی کامل آن روز
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-[#824c71]/10 border border-[#824c71]/25" />
              ساعت اختصاصی آن روز
            </span>
          </div>

          {/* ادیتور روز انتخاب‌شده — همینجا، بدون مدال */}
          {selectedDateStr && (
            <div className="border border-[#824c71]/20 bg-[#824c71]/[0.03] rounded-2xl p-4 mb-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-bold text-zinc-800">{formatPersianDate(selectedDateStr)}</p>
                <button onClick={() => setSelectedDateStr(null)} className="p-1 text-zinc-400 bg-white rounded-full">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center justify-between mb-3.5 bg-white border border-zinc-100 rounded-xl p-3">
                <div>
                  <p className="text-sm font-medium text-zinc-800">مرخصی کامل</p>
                  <p className="text-[11px] text-zinc-400 mt-0.5">فقط همین یک روز کاری نیست</p>
                </div>
                <button onClick={() => setEditIsDayOff((p) => !p)}>
                  <div className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${editIsDayOff ? 'bg-[#824c71]' : 'bg-zinc-200'}`}>
                    <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-200 ${editIsDayOff ? 'right-0.5' : 'right-5'}`} />
                  </div>
                </button>
              </div>

              {!editIsDayOff && (
                <div className="grid grid-cols-2 gap-3 mb-3.5">
                  <div className="min-w-0">
                    <label className="block text-xs font-medium text-zinc-500 mb-1">شروع</label>
                    <div className="flex items-center gap-1.5">
                      <input
                        value={editStartM}
                        onChange={(e) => setEditStartM(sanitizeMinuteTime(e.target.value))}
                        placeholder="دقیقه"
                        dir="ltr"
                        inputMode="numeric"
                        className="w-full min-w-0 border border-zinc-300 rounded-lg px-2 py-2 text-sm bg-zinc-50 text-center focus:outline-none focus:border-[#824c71] focus:bg-white"
                      />
                      <span className="text-zinc-400 font-bold shrink-0">:</span>
                      <input
                        value={editStartH}
                        onChange={(e) => setEditStartH(sanitizeHourTime(e.target.value))}
                        placeholder="ساعت"
                        dir="ltr"
                        inputMode="numeric"
                        className="w-full min-w-0 border border-zinc-300 rounded-lg px-2 py-2 text-sm bg-zinc-50 text-center focus:outline-none focus:border-[#824c71] focus:bg-white"
                      />
                    </div>
                  </div>
                  <div className="min-w-0">
                    <label className="block text-xs font-medium text-zinc-500 mb-1">پایان</label>
                    <div className="flex items-center gap-1.5">
                      <input
                        value={editEndM}
                        onChange={(e) => setEditEndM(sanitizeMinuteTime(e.target.value))}
                        placeholder="دقیقه"
                        dir="ltr"
                        inputMode="numeric"
                        className="w-full min-w-0 border border-zinc-300 rounded-lg px-2 py-2 text-sm bg-zinc-50 text-center focus:outline-none focus:border-[#824c71] focus:bg-white"
                      />
                      <span className="text-zinc-400 font-bold shrink-0">:</span>
                      <input
                        value={editEndH}
                        onChange={(e) => setEditEndH(sanitizeHourTime(e.target.value))}
                        placeholder="ساعت"
                        dir="ltr"
                        inputMode="numeric"
                        className="w-full min-w-0 border border-zinc-300 rounded-lg px-2 py-2 text-sm bg-zinc-50 text-center focus:outline-none focus:border-[#824c71] focus:bg-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="mb-4">
                <label className="block text-xs font-medium text-zinc-500 mb-1">یادداشت (اختیاری)</label>
                <input
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  placeholder="مثلاً: مرخصی استعلاجی"
                  className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#824c71]"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleSaveOverride}
                  disabled={savingOverride}
                  className="flex-1 bg-[#824c71] text-white rounded-xl py-2.5 text-xs font-bold disabled:opacity-60 flex items-center justify-center gap-1.5"
                >
                  {savingOverride && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  ذخیره
                </button>
                {overrideMap[selectedDateStr] && (
                  <button
                    onClick={() => handleDeleteOverride(selectedDateStr)}
                    disabled={deletingOverride}
                    className="px-4 rounded-xl bg-red-50 text-red-500 text-xs font-bold disabled:opacity-50"
                  >
                    {deletingOverride ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'حذف'}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* لیست موارد موقت ثبت‌شده — برای دسترسی و ویرایش سریع */}
          <div>
            <p className="text-xs font-bold text-zinc-500 mb-2 px-1">موارد موقت ثبت‌شده برای این پرسنل</p>
            {sortedOverrides.length === 0 ? (
              <div className="text-center py-8 bg-zinc-50 rounded-2xl">
                <p className="text-zinc-400 text-xs">هنوز مرخصی یا تغییر ساعتی برای یک تاریخ خاص ثبت نشده</p>
              </div>
            ) : (
              <div className="space-y-2">
                {sortedOverrides.map((o) => (
                  <div
                    key={o.id}
                    className="w-full flex items-center justify-between gap-2 bg-white border border-zinc-100 rounded-xl px-3.5 py-3"
                  >
                    <button
                      onClick={() => openDay(o.date)}
                      className="flex-1 flex items-center gap-2.5 text-right"
                    >
                      <div className={`w-2 h-2 rounded-full shrink-0 ${o.isDayOff ? 'bg-red-400' : 'bg-[#824c71]'}`} />
                      <div>
                        <p className="text-xs font-bold text-zinc-800">{formatPersianDate(o.date)}</p>
                        <p className="text-[11px] text-zinc-400 mt-0.5">
                          {o.isDayOff ? 'مرخصی کامل' : `ساعت ${o.start ?? '—'} تا ${o.end ?? '—'}`}
                          {o.note ? ` · ${o.note}` : ''}
                        </p>
                      </div>
                    </button>
                    <button
                      onClick={() => handleDeleteOverride(o.date)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-50 text-red-400 shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SalonScheduleOverrideSection (بخش تقویم ماهانه داخل تب «برنامه سالن»)
// این بخش شبیه بخش ۲ از StaffScheduleTab است ولی برای خودِ سالن — بدون نیاز
// به انتخاب پرسنل. اگر سالن‌دار روی یک روز خاص از ماه کلیک کند، می‌تواند فقط
// همان روز را تعطیل کند یا ساعت کاری‌اش را تغییر دهد — مستقل از برنامه هفتگی.
// منبع داده: جدول SalonScheduleOverride — API: POST/DELETE /api/salon-overrides
// ═══════════════════════════════════════════════════════════════════════════

function SalonScheduleOverrideSection() {
  const [overrides, setOverrides] = useState<SalonOverride[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);
  const [editIsClosed, setEditIsClosed] = useState(true);
  const [editStartH, setEditStartH] = useState('');
  const [editStartM, setEditStartM] = useState('');
  const [editEndH, setEditEndH] = useState('');
  const [editEndM, setEditEndM] = useState('');
  const [editNote, setEditNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

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
    // برای یک تاریخ جدید که هنوز override نداره، پیش‌فرض باید «تعطیل نیست» باشه
    // (مشابه بخش پرسنل)، وگرنه سالن‌دار که فقط می‌خواد ساعت اختصاصی ثبت کنه
    // ممکنه فراموش کنه سوییچ «تعطیل کامل» رو خاموش کنه و کل روز اشتباهی تعطیل بشه
    setEditIsClosed(existing?.isClosed ?? false);
    const s = splitTime(existing?.start ?? '');
    const e = splitTime(existing?.end ?? '');
    setEditStartH(s.h);
    setEditStartM(s.m);
    setEditEndH(e.h);
    setEditEndM(e.m);
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
          start: editIsClosed ? null : joinTime(editStartH, editStartM) || null,
          end: editIsClosed ? null : joinTime(editEndH, editEndM) || null,
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

  const formatPersianDate = (dateStr: string) =>
    new DateObject({ date: new Date(dateStr), calendar: persian, locale: persian_fa }).format('D MMMM YYYY');

  return (
    <div className="mt-6">
      <div className="mb-3 px-1">
        <div className="flex items-center gap-2 mb-1">
          <CalendarOff className="w-4 h-4 text-zinc-400" />
          <p className="text-sm font-bold text-zinc-800">تعطیلی یا تغییر ساعت یک روز خاص</p>
          <span className="text-[10px] bg-[#824c71]/10 text-[#824c71] px-1.5 py-0.5 rounded-md font-medium">
            موقت
          </span>
        </div>
        <p className="text-[11px] text-zinc-400 leading-relaxed">
          فقط همون تاریخی که از تقویم زیر انتخاب می‌کنید تغییر می‌کند؛ باقی روزها طبق برنامه‌ی هفتگی بالا می‌ماند.
        </p>
      </div>

      <div className="relative mb-3">
        {isLoading && (
          <div className="absolute inset-0 bg-white/60 flex items-center justify-center rounded-2xl z-10">
            <Loader2 className="w-5 h-5 text-[#824c71] animate-spin" />
          </div>
        )}
        <PersianCalendar
          selectedDate={selectedDateStr}
          onSelectDate={(dateStr) => openDay(dateStr)}
          markers={calendarMarkers}
        />
      </div>

      <div className="flex items-center gap-4 mb-5 px-1 text-[11px] text-zinc-500">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-md bg-red-50 border border-red-200" />
          تعطیل کامل
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-md bg-[#824c71]/10 border border-[#824c71]/25" />
          ساعت اختصاصی
        </span>
      </div>

      {selectedDateStr && (
        <div className="border border-[#824c71]/20 bg-[#824c71]/[0.03] rounded-2xl p-4 mb-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold text-zinc-800">{formatPersianDate(selectedDateStr)}</p>
            <button onClick={() => setSelectedDateStr(null)} className="p-1 text-zinc-400 bg-white rounded-full">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center justify-between mb-3.5 bg-white border border-zinc-100 rounded-xl p-3">
            <div>
              <p className="text-sm font-medium text-zinc-800">تعطیل کامل</p>
              <p className="text-[11px] text-zinc-400 mt-0.5">سالن این روز اصلاً نوبت‌دهی ندارد</p>
            </div>
            <button onClick={() => setEditIsClosed((p) => !p)}>
              <div className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${editIsClosed ? 'bg-[#824c71]' : 'bg-zinc-200'}`}>
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-200 ${editIsClosed ? 'right-0.5' : 'right-5'}`} />
              </div>
            </button>
          </div>

          {!editIsClosed && (
            <div className="grid grid-cols-2 gap-3 mb-3.5">
              <div className="min-w-0">
                <label className="block text-xs font-medium text-zinc-500 mb-1">شروع</label>
                <div className="flex items-center gap-1.5">
                  <input
                    value={editStartM}
                    onChange={(e) => setEditStartM(sanitizeMinuteTime(e.target.value))}
                    placeholder="دقیقه"
                    dir="ltr"
                    inputMode="numeric"
                    className="w-full min-w-0 border border-zinc-300 rounded-lg px-2 py-2 text-sm bg-zinc-50 text-center focus:outline-none focus:border-[#824c71] focus:bg-white"
                  />
                  <span className="text-zinc-400 font-bold shrink-0">:</span>
                  <input
                    value={editStartH}
                    onChange={(e) => setEditStartH(sanitizeHourTime(e.target.value))}
                    placeholder="ساعت"
                    dir="ltr"
                    inputMode="numeric"
                    className="w-full min-w-0 border border-zinc-300 rounded-lg px-2 py-2 text-sm bg-zinc-50 text-center focus:outline-none focus:border-[#824c71] focus:bg-white"
                  />
                </div>
              </div>
              <div className="min-w-0">
                <label className="block text-xs font-medium text-zinc-500 mb-1">پایان</label>
                <div className="flex items-center gap-1.5">
                  <input
                    value={editEndM}
                    onChange={(e) => setEditEndM(sanitizeMinuteTime(e.target.value))}
                    placeholder="دقیقه"
                    dir="ltr"
                    inputMode="numeric"
                    className="w-full min-w-0 border border-zinc-300 rounded-lg px-2 py-2 text-sm bg-zinc-50 text-center focus:outline-none focus:border-[#824c71] focus:bg-white"
                  />
                  <span className="text-zinc-400 font-bold shrink-0">:</span>
                  <input
                    value={editEndH}
                    onChange={(e) => setEditEndH(sanitizeHourTime(e.target.value))}
                    placeholder="ساعت"
                    dir="ltr"
                    inputMode="numeric"
                    className="w-full min-w-0 border border-zinc-300 rounded-lg px-2 py-2 text-sm bg-zinc-50 text-center focus:outline-none focus:border-[#824c71] focus:bg-white"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="mb-4">
            <label className="block text-xs font-medium text-zinc-500 mb-1">یادداشت (اختیاری)</label>
            <input
              value={editNote}
              onChange={(e) => setEditNote(e.target.value)}
              placeholder="مثلاً: تعطیلی رسمی"
              className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#824c71]"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-[#824c71] text-white rounded-xl py-2.5 text-xs font-bold disabled:opacity-60 flex items-center justify-center gap-1.5"
            >
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              ذخیره
            </button>
            {overrideMap[selectedDateStr] && (
              <button
                onClick={() => handleDelete(selectedDateStr)}
                disabled={deleting}
                className="px-4 rounded-xl bg-red-50 text-red-500 text-xs font-bold disabled:opacity-50"
              >
                {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'حذف'}
              </button>
            )}
          </div>
        </div>
      )}

      <div>
        <p className="text-xs font-bold text-zinc-500 mb-2 px-1">موارد موقت ثبت‌شده</p>
        {sortedOverrides.length === 0 ? (
          <div className="text-center py-8 bg-zinc-50 rounded-2xl">
            <p className="text-zinc-400 text-xs">هنوز تعطیلی یا تغییر ساعتی برای یک تاریخ خاص ثبت نشده</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sortedOverrides.map((o) => (
              <div key={o.id} className="w-full flex items-center justify-between gap-2 bg-white border border-zinc-100 rounded-xl px-3.5 py-3">
                <button onClick={() => openDay(o.date)} className="flex-1 flex items-center gap-2.5 text-right">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${o.isClosed ? 'bg-red-400' : 'bg-[#824c71]'}`} />
                  <div>
                    <p className="text-xs font-bold text-zinc-800">{formatPersianDate(o.date)}</p>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      {o.isClosed ? 'تعطیل کامل' : `ساعت ${o.start ?? '—'} تا ${o.end ?? '—'}`}
                      {o.note ? ` · ${o.note}` : ''}
                    </p>
                  </div>
                </button>
                <button onClick={() => handleDelete(o.date)} className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-50 text-red-400 shrink-0">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
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

  return (
    <div>
      {/* Grid */}
      <div className="bg-white border border-zinc-100 rounded-2xl p-4 mb-4">
        <p className="text-sm font-bold text-zinc-800 mb-3">فاصله شروع نوبت‌ها</p>
        <div className="flex gap-2">
          {[15, 30, 60].map((g) => (
            <button
              key={g}
              onClick={() => setLocalGrid(g)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                localGrid === g
                  ? 'bg-[#824c71] text-white border-[#824c71]'
                  : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300'
              }`}
            >
              {g} دقیقه
            </button>
          ))}
        </div>
        <p className="text-[11px] text-zinc-400 mt-2">
          مشتریان می‌توانند هر {localGrid} دقیقه یک‌بار شروع نوبت را انتخاب کنند
        </p>
      </div>

      {/* Weekly */}
      <div className="bg-white border border-zinc-100 rounded-2xl overflow-hidden mb-4">
        <p className="text-sm font-bold text-zinc-800 px-4 pt-4 pb-3 border-b border-zinc-50">برنامه هفتگی سالن</p>
        {WEEK_DAYS.map((day, idx) => {
          const d = local[day] ?? { open: false, start: '09:00', end: '20:00' };
          return (
            <div
              key={day}
              className={`flex items-center gap-3 px-4 py-3 ${idx < WEEK_DAYS.length - 1 ? 'border-b border-zinc-50' : ''}`}
            >
              <button onClick={() => toggle(day)}>
                <div className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${d.open ? 'bg-[#824c71]' : 'bg-zinc-200'}`}>
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-200 ${d.open ? 'right-0.5' : 'right-5'}`} />
                </div>
              </button>

              <span className={`w-14 text-xs font-bold shrink-0 ${d.open ? 'text-zinc-800' : 'text-zinc-400'}`}>
                {day}
              </span>

              {d.open ? (
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="time"
                    dir="ltr"
                    value={d.start}
                    onChange={(e) => setTime(day, 'start', e.target.value)}
                    className="flex-1 border border-zinc-200 rounded-lg px-2 py-1.5 text-xs text-center focus:outline-none focus:border-[#824c71]"
                  />
                  <span className="text-zinc-400 text-xs shrink-0">تا</span>
                  <input
                    type="time"
                    dir="ltr"
                    value={d.end}
                    onChange={(e) => setTime(day, 'end', e.target.value)}
                    className="flex-1 border border-zinc-200 rounded-lg px-2 py-1.5 text-xs text-center focus:outline-none focus:border-[#824c71]"
                  />
                </div>
              ) : (
                <span className="text-xs text-zinc-400 flex-1">تعطیل</span>
              )}
            </div>
          );
        })}
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className={`w-full rounded-xl py-3 text-sm font-bold transition-all flex items-center justify-center gap-2 ${
          saved
            ? 'bg-emerald-500 text-white'
            : 'bg-[#824c71] text-white disabled:opacity-60'
        }`}
      >
        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
        {saved ? '✓ ذخیره شد' : saving ? 'در حال ذخیره...' : 'ذخیره برنامه هفتگی'}
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
        <Loader2 className="w-10 h-10 text-[#824c71] animate-spin mb-4" />
        <p className="text-zinc-500 font-medium text-sm">در حال دریافت اطلاعات...</p>
      </div>
    );
  }

  if (hasSalon === false) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center gap-4">
        <Store className="w-12 h-12 text-zinc-300" />
        <p className="text-zinc-600 font-medium">شما هنوز کسب‌وکاری ثبت نکرده‌اید.</p>
        <Link href="/profile/business" className="bg-[#824c71] text-white px-5 py-2.5 rounded-xl text-sm font-medium">
          ثبت نام کسب‌وکار
        </Link>
      </div>
    );
  }

  const canEnable = services.some((s) => s.isActive) && staff.some((s) => (s.bookingServices ?? []).length > 0);

  // خدمات فعالی که به هیچ پرسنلی تخصیص داده نشده و پرسنل‌هایی که هیچ خدمتی ندارند —
  // برای بنر خلاصه‌ی بالای صفحه
  const servicesWithStaff = new Set<string>();
  staff.forEach((s) => (s.bookingServices ?? []).forEach((bs) => servicesWithStaff.add(bs.bookingServiceId)));
  const unlinkedServicesCount = services.filter((s) => s.isActive && !servicesWithStaff.has(s.id)).length;
  const unlinkedStaffCount = staff.filter((s) => (s.bookingServices ?? []).length === 0).length;

  return (
    <div className="max-w-2xl mx-auto pt-8 pb-32 px-4 md:pt-10 md:px-0">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/my-salon" className="w-10 h-10 flex items-center justify-center rounded-xl bg-zinc-100 text-zinc-600 hover:bg-zinc-200 transition-colors shrink-0">
          <ArrowRight className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-zinc-900">نوبت‌دهی آنلاین</h1>
          <p className="text-zinc-500 text-xs md:text-sm mt-0.5">{salonName}</p>
        </div>
      </div>

      {/* Toggle Card */}
      <div className={`border rounded-2xl p-4 mb-6 flex items-center justify-between gap-4 transition-colors ${
        bookingEnabled ? 'bg-[#824c71]/5 border-[#824c71]/20' : 'bg-white border-zinc-100'
      }`}>
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${bookingEnabled ? 'bg-[#824c71]/15 text-[#824c71]' : 'bg-zinc-100 text-zinc-400'}`}>
            <CalendarClock className="w-5 h-5" />
          </div>
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
        <button
          onClick={handleToggle}
          disabled={isSaving}
          className="shrink-0 disabled:opacity-50"
        >
          {isSaving ? (
            <Loader2 className="w-5 h-5 text-[#824c71] animate-spin" />
          ) : (
            <div className={`relative w-14 h-7 rounded-full transition-colors duration-300 ${bookingEnabled ? 'bg-[#824c71]' : 'bg-zinc-200'}`}>
              <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-sm transition-all duration-300 ${bookingEnabled ? 'right-1' : 'right-8'}`} />
            </div>
          )}
        </button>
      </div>

      {/* هشدار خلاصه — خدمات بدون پرسنل یا پرسنل بدون خدمت */}
      {(unlinkedServicesCount > 0 || unlinkedStaffCount > 0) && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 mb-6 text-amber-700">
          <p className="text-xs font-bold mb-1">⚠️ نیاز به تکمیل تنظیمات</p>
          <ul className="text-[11px] space-y-0.5 leading-relaxed">
            {unlinkedServicesCount > 0 && (
              <li>• {unlinkedServicesCount.toLocaleString('fa-IR')} خدمت هنوز به هیچ پرسنلی تخصیص داده نشده</li>
            )}
            {unlinkedStaffCount > 0 && (
              <li>• {unlinkedStaffCount.toLocaleString('fa-IR')} پرسنل هنوز هیچ خدمتی ندارد</li>
            )}
          </ul>
        </div>
      )}

      {/* Tabs */}
      <TabBar
        active={tab}
        onChange={setTab}
        hasServices={services.length > 0}
        hasStaff={staff.length > 0}
      />

      {tab === 0 && (
        <ServicesTab services={services} staff={staff} onRefresh={fetchAll} />
      )}
      {tab === 1 && (
        <StaffTab staff={staff} services={services} onRefresh={fetchAll} />
      )}
      {tab === 2 && (
        <ScheduleTab schedule={schedule} grid={grid} onSave={handleSaveSchedule} />
      )}
      {tab === 3 && (
        <StaffScheduleTab staff={staff} onRefresh={fetchAll} />
      )}
    </div>
  );
}