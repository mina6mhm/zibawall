//app/(dashboard)/dashboard/page.tsx
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { CATEGORIES, CATEGORY_MAPPING } from '@/lib/data';
import RegionFilterModal from '@/components/RegionFilterModal';
import {
  Home, Pin, SlidersHorizontal, X, CalendarClock, Search, MapPin, ChevronDown, Star,
  Scissors, Hand, Eye, Droplets, Palette, Gem, Feather, Flower2, Sparkles, SearchX,
} from 'lucide-react';

const SCROLL_STORAGE_KEY = 'dashboardScrollPosition';
const BRAND = '#824c71';

// ---------- دسته‌ها ----------
type IconType = React.ComponentType<{ className?: string; strokeWidth?: number }>;

const CATEGORY_ICON_MAP: Record<string, IconType> = {
  'خدمات مو': Scissors,
  'خدمات ناخن': Hand,
  'خدمات ابرو و مژه': Eye,
  'خدمات پوست و زیبایی': Droplets,
  'خدمات آرایش و میکاپ': Palette,
  'پکیج‌های عروس': Gem,
  'موزدایی و بدن': Feather,
  'خدمات ماساژ و اسپا': Flower2,
};

const CATEGORY_DISPLAY_LABEL: Record<string, string> = {
  'خدمات مو': 'مو',
  'خدمات ناخن': 'ناخن',
  'خدمات ابرو و مژه': 'ابرو و مژه',
  'خدمات پوست و زیبایی': 'پوست',
  'خدمات آرایش و میکاپ': 'میکاپ',
  'پکیج‌های عروس': 'عروس',
  'موزدایی و بدن': 'موزدایی',
  'خدمات ماساژ و اسپا': 'ماساژ و اسپا',
};

const getCategoryIcon = (c: string): IconType => CATEGORY_ICON_MAP[c] || Sparkles;
const getCategoryLabel = (c: string) => CATEGORY_DISPLAY_LABEL[c] || c;

// ---------- ابزارهای متن و جستجو ----------
const toPersianDigits = (str: string) => str.replace(/[0-9]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);
const formatRating = (num: number) => (Number.isInteger(num) ? String(num) : num.toFixed(1));

const normalizeChars = (text: string) => {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/[آأإ]/g, 'ا')
    .replace(/[\u200B-\u200D\uFEFF\u200C]/g, '');
};

const SYNONYM_GROUPS = [
  ['سالن', 'مرکز', 'ارایشگاه', 'مجموعه', 'کلینیک', 'انستیتو', 'خانه', 'اسپا'],
  ['کراتین', 'کراتینه', 'احیا', 'پروتئین', 'بوتاکس'],
  ['رنگ', 'لایت', 'هایلایت', 'مش', 'امبره', 'بالیاژ'],
  ['شینیون', 'شنیون', 'بافت', 'براشینگ', 'استایل'],
  ['عروس', 'میکاپ', 'ارایش', 'محفلی', 'گریم', 'فرمالیته'],
  ['ناخن', 'کاشت', 'ترمیم', 'ژلیش', 'لمینت', 'مانیکور', 'پدیکور'],
  ['مژه', 'ابرو', 'اکستنشن', 'فیبروز', 'میکروبلیدینگ', 'لیفت', 'تاتو'],
  ['فیشیال', 'پاکسازی', 'پوست', 'میکرودرم', 'مزوتراپی'],
  ['اپیلاسیون', 'لیزر', 'موزدایی', 'وکس', 'اصلاح'],
];

const getDistance = (a: string, b: string) => {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const m: number[][] = [];
  for (let i = 0; i <= b.length; i++) m[i] = [i];
  for (let j = 0; j <= a.length; j++) m[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      m[i][j] =
        b.charAt(i - 1) === a.charAt(j - 1)
          ? m[i - 1][j - 1]
          : Math.min(m[i - 1][j - 1] + 1, m[i][j - 1] + 1, m[i - 1][j] + 1);
    }
  }
  return m[b.length][a.length];
};

const getSynonyms = (word: string): string[] => {
  for (const group of SYNONYM_GROUPS) {
    const normalizedGroup = group.map(normalizeChars);
    const isMatch = normalizedGroup.some((w) => {
      if (w === word) return true;
      if (word.length > 3) return getDistance(w, word) <= (word.length > 5 ? 2 : 1);
      return false;
    });
    if (isMatch) return normalizedGroup;
  }
  return [word];
};

const isFuzzyMatch = (text: string, searchWord: string) => {
  if (!text) return false;
  const textNoSpace = text.replace(/\s+/g, '');
  const searchNoSpace = searchWord.replace(/\s+/g, '');
  if (textNoSpace.includes(searchNoSpace)) return true;
  if (searchNoSpace.length > 3) {
    const maxDist = searchNoSpace.length > 5 ? 2 : 1;
    return text.split(/\s+/).some((w) => getDistance(w, searchNoSpace) <= maxDist);
  }
  return false;
};

// ---------- اجزای کوچک ----------
const BookmarkIcon = ({ isActive, className }: { isActive: boolean; className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    fill={isActive ? 'currentColor' : 'none'}
  >
    <path d="M6 4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v17.5l-6-4-6 4V4z" />
  </svg>
);

type GenderFilter = 'ALL' | 'FEMALE' | 'MALE';

const GENDER_OPTIONS: { value: GenderFilter; label: string }[] = [
  { value: 'ALL', label: 'همه' },
  { value: 'FEMALE', label: 'بانوان' },
  { value: 'MALE', label: 'آقایان' },
];

function FiltersSheet({
  isOpen, onClose, homeServiceOnly, onToggleHomeService, genderFilter, onSetGender, onClear, resultCount,
}: {
  isOpen: boolean;
  onClose: () => void;
  homeServiceOnly: boolean;
  onToggleHomeService: () => void;
  genderFilter: GenderFilter;
  onSetGender: (v: GenderFilter) => void;
  onClear: () => void;
  resultCount: number;
}) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-zinc-900/40" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-t-[28px] px-5 pt-3 pb-6 shadow-2xl">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-zinc-200" />
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-[17px] font-extrabold text-zinc-900">فیلترها</h3>
          <button
            onClick={onClose}
            aria-label="بستن"
            className="w-9 h-9 flex items-center justify-center rounded-full bg-zinc-100 text-zinc-500 active:scale-95 transition"
          >
            <X className="w-4 h-4" strokeWidth={2.4} />
          </button>
        </div>

        <p className="text-[13px] font-bold text-zinc-900 mb-2.5">مخاطب</p>
        <div className="flex bg-zinc-100 rounded-2xl p-1 mb-5" role="radiogroup">
          {GENDER_OPTIONS.map((o) => {
            const active = genderFilter === o.value;
            return (
              <button
                key={o.value}
                role="radio"
                aria-checked={active}
                onClick={() => onSetGender(o.value)}
                className={`flex-1 h-10 rounded-xl text-[13px] font-bold transition-all ${
                  active ? 'bg-white text-[#824c71] shadow-sm' : 'text-zinc-500'
                }`}
              >
                {o.label}
              </button>
            );
          })}
        </div>

        <button
          onClick={onToggleHomeService}
          role="switch"
          aria-checked={homeServiceOnly}
          className="w-full flex items-center gap-3 rounded-2xl border border-zinc-200 p-3.5 text-right active:scale-[0.99] transition"
        >
          <span className="w-10 h-10 rounded-xl bg-[#824c71]/10 text-[#824c71] flex items-center justify-center shrink-0">
            <Home className="w-5 h-5" strokeWidth={2.1} />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-[14px] font-bold text-zinc-900">خدمات در منزل</span>
            <span className="block text-[12px] text-zinc-500 mt-0.5">فقط سالن‌هایی که به محل شما می‌آیند</span>
          </span>
          <span
            dir="ltr"
            className={`relative w-11 h-6 rounded-full shrink-0 transition-colors ${homeServiceOnly ? 'bg-[#824c71]' : 'bg-zinc-300'}`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                homeServiceOnly ? 'translate-x-5' : ''
              }`}
            />
          </span>
        </button>

        <div className="flex gap-2.5 mt-6">
          <button
            onClick={onClear}
            className="h-12 px-5 rounded-2xl border border-zinc-200 text-[14px] font-bold text-zinc-700 active:scale-95 transition"
          >
            پاک کردن
          </button>
          <button
            onClick={onClose}
            className="flex-1 h-12 rounded-2xl bg-[#824c71] text-white text-[14px] font-bold shadow-[0_8px_18px_-8px_#824c71] active:scale-[0.98] transition"
          >
            نمایش {toPersianDigits(String(resultCount))} سالن
          </button>
        </div>
      </div>
    </div>
  );
}

function BookingDisabledAlert({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-zinc-900/40 px-4 pb-4" onClick={onClose}>
      <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center mb-4 mx-auto">
          <CalendarClock className="w-6 h-6 text-amber-500" />
        </div>
        <h3 className="text-base font-extrabold text-zinc-900 text-center mb-2">نوبت‌دهی آنلاین فعال نیست</h3>
        <p className="text-[13px] text-zinc-500 text-center leading-6 mb-5">
          این سالن هنوز نوبت‌دهی آنلاین را فعال نکرده است. برای رزرو وقت، مستقیم با سالن تماس بگیرید.
        </p>
        <button onClick={onClose} className="w-full h-12 bg-[#824c71] text-white rounded-2xl text-sm font-bold active:scale-[0.98] transition">
          متوجه شدم
        </button>
      </div>
    </div>
  );
}

function SalonSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="aspect-[16/10] rounded-[22px] bg-zinc-100" />
      <div className="mt-3 h-4 w-2/3 rounded bg-zinc-100" />
      <div className="mt-2 h-3 w-1/2 rounded bg-zinc-100" />
      <div className="mt-4 h-10 rounded-full bg-zinc-100" />
    </div>
  );
}

// ---------- صفحه ----------
export default function DashboardHomePage() {
  const router = useRouter();

  const [salons, setSalons] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [bookmarkedSalons, setBookmarkedSalons] = useState<(number | string)[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedProvince, setSelectedProvince] = useState<string>('تهران');
  const [selectedCity, setSelectedCity] = useState<string>('تهران');
  const [selectedNeighborhoods, setSelectedNeighborhoods] = useState<string[]>([]);

  const [isRegionModalOpen, setIsRegionModalOpen] = useState(false);
  const [isFiltersModalOpen, setIsFiltersModalOpen] = useState(false);
  const [homeServiceOnly, setHomeServiceOnly] = useState(false);
  const [genderFilter, setGenderFilter] = useState<GenderFilter>('ALL');
  const [showBookingAlert, setShowBookingAlert] = useState(false);
  const [showVpnWarning, setShowVpnWarning] = useState(false);

  useEffect(() => {
    let hideTimer: ReturnType<typeof setTimeout>;
    const checkIpLocation = async () => {
      try {
        const res = await fetch('https://ipwho.is/');
        if (!res.ok) return;
        const data = await res.json();
        if (data?.success !== false && data?.country_code && data.country_code !== 'IR') {
          setShowVpnWarning(true);
          hideTimer = setTimeout(() => setShowVpnWarning(false), 6000);
        }
      } catch {
        // بی‌سروصدا رد می‌شود
      }
    };
    checkIpLocation();
    return () => clearTimeout(hideTimer);
  }, []);

  const toggleCategory = (category: string) =>
    setSelectedCategories((prev) => (prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]));

  const removeNeighborhood = (nh: string) => setSelectedNeighborhoods((prev) => prev.filter((x) => x !== nh));

  const categoryList = CATEGORIES.filter((c: string) => c !== 'همه');

  useEffect(() => {
    const fetchSalonsData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/salon');
        if (!response.ok) throw new Error('خطا در دریافت اطلاعات سالن‌ها');
        const data = await response.json();
        if (data.salons) setSalons(data.salons);
        const savedBookmarks = localStorage.getItem('bookmarkedSalons');
        if (savedBookmarks) setBookmarkedSalons(JSON.parse(savedBookmarks));
      } catch (err) {
        console.error('Error fetching salons:', err);
        setError('اتصال به سرور برقرار نشد. اینترنت خود را بررسی کنید و دوباره تلاش کنید.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchSalonsData();
  }, []);

  // بازگرداندن موقعیت اسکرول بعد از برگشت از صفحه‌ی سالن
  useEffect(() => {
    if (isLoading) return;
    const savedScroll = sessionStorage.getItem(SCROLL_STORAGE_KEY);
    if (!savedScroll) return;

    const targetY = parseInt(savedScroll, 10);
    sessionStorage.removeItem(SCROLL_STORAGE_KEY);

    let attempts = 0;
    const maxAttempts = 40;
    let timeoutId: ReturnType<typeof setTimeout>;

    const tryScroll = () => {
      attempts++;
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (maxScroll >= targetY || attempts >= maxAttempts) {
        window.scrollTo(0, targetY);
      } else {
        timeoutId = setTimeout(tryScroll, 50);
      }
    };
    tryScroll();
    return () => clearTimeout(timeoutId);
  }, [isLoading]);

  const handleBookmarkClick = (salonId: number | string, e: React.MouseEvent) => {
    e.stopPropagation();
    const isBookmarked = bookmarkedSalons.includes(salonId);
    setBookmarkedSalons((prev) => {
      const next = isBookmarked ? prev.filter((id) => id !== salonId) : [...prev, salonId];
      localStorage.setItem('bookmarkedSalons', JSON.stringify(next));
      return next;
    });
  };

  const isBookmarked = (salonId: number | string) => bookmarkedSalons.includes(salonId);

  const handleBookingClick = (salon: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (salon.bookingEnabled) router.push(`/salon/${salon.id}/book`);
    else setShowBookingAlert(true);
  };

  const handleSalonCardClick = (salonId: number | string) => {
    sessionStorage.setItem(SCROLL_STORAGE_KEY, String(window.scrollY));
    router.push(`/salon/${salonId}`);
  };

  const filteredSalons = useMemo(
    () =>
      salons.filter((salon) => {
        const salonTags = (salon.tags || []).map((t: any) => (typeof t === 'object' && t !== null ? t.name : t));

        const matchesCategory =
          selectedCategories.length === 0 ||
          selectedCategories.every((cat) => {
            const valid = CATEGORY_MAPPING[cat] || [];
            return salonTags.some((tag: string) => valid.includes(tag));
          });

        const matchesProvince = salon.province ? salon.province === selectedProvince : true;
        const matchesCity = salon.city ? salon.city === selectedCity : true;

        const salonNeighborhoods = Array.isArray(salon.neighborhoods)
          ? salon.neighborhoods
          : salon.district
          ? [salon.district]
          : [];

        const matchesLocation =
          selectedProvince === 'تهران' && selectedCity === 'تهران' && selectedNeighborhoods.length > 0
            ? selectedNeighborhoods.includes('همه محله‌ها') ||
              salonNeighborhoods.some((nh: string) => selectedNeighborhoods.includes(nh))
            : true;

        const matchesHomeService = !homeServiceOnly || !!salon.hasHomeService;
        const matchesGender =
          genderFilter === 'ALL' || salon.genderAudience === genderFilter || salon.genderAudience === 'BOTH';

        if (!matchesCategory || !matchesProvince || !matchesCity || !matchesLocation || !matchesHomeService || !matchesGender)
          return false;

        if (!searchQuery.trim()) return true;

        const searchTerms = normalizeChars(searchQuery).split(/\s+/).filter(Boolean);
        const normalizedName = normalizeChars(salon.name || '');
        const normalizedAddress = normalizeChars(salon.address || '');
        const normalizedTags = salonTags.map((tag: string) => normalizeChars(tag));

        return searchTerms.every((term) =>
          getSynonyms(term).some(
            (syn) =>
              isFuzzyMatch(normalizedName, syn) ||
              isFuzzyMatch(normalizedAddress, syn) ||
              normalizedTags.some((tag: string) => isFuzzyMatch(tag, syn))
          )
        );
      }),
    [salons, selectedCategories, selectedProvince, selectedCity, selectedNeighborhoods, homeServiceOnly, genderFilter, searchQuery]
  );

  const extraFilterCount = (homeServiceOnly ? 1 : 0) + (genderFilter !== 'ALL' ? 1 : 0);
  const hasActiveExtraFilters = extraFilterCount > 0;
  const showNeighborhoodChips = selectedNeighborhoods.length > 0 && !selectedNeighborhoods.includes('همه محله‌ها');

  const resetAll = () => {
    setSearchQuery('');
    setSelectedCategories([]);
    setSelectedProvince('تهران');
    setSelectedCity('تهران');
    setSelectedNeighborhoods([]);
    setHomeServiceOnly(false);
    setGenderFilter('ALL');
  };

  return (
    <>
      <div className="flex flex-col min-h-screen bg-white pb-28">
        {showVpnWarning && (
          <div role="status" className="mx-4 mt-3 flex items-center justify-between gap-3 rounded-2xl bg-amber-50 px-4 py-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="shrink-0 w-5 h-5 rounded-full bg-amber-400 text-white flex items-center justify-center text-[11px] font-bold">!</span>
              <p className="text-[13px] font-medium text-zinc-800 leading-snug">برای تجربه بهتر، فیلترشکن خود را خاموش کنید.</p>
            </div>
            <button onClick={() => setShowVpnWarning(false)} aria-label="بستن هشدار" className="shrink-0 text-zinc-400 hover:text-zinc-600">
              <X className="w-4 h-4" strokeWidth={2.3} />
            </button>
          </div>
        )}

        {/* هدر چسبان */}
        <header className="sticky top-0 z-20 bg-white px-4 pt-4 pb-3">
          <button
            onClick={() => setIsRegionModalOpen(true)}
            className="group flex items-center gap-2.5 mb-3.5 text-right"
            aria-label="تغییر منطقه"
          >
            <span className="w-10 h-10 rounded-full bg-[#824c71]/10 text-[#824c71] flex items-center justify-center">
              <MapPin className="w-5 h-5" strokeWidth={2.2} />
            </span>
            <span className="flex flex-col leading-tight">
              <span className="text-[11px] text-zinc-500">منطقه‌ی شما</span>
              <span className="flex items-center gap-1 text-[15px] font-extrabold text-zinc-900">
                {selectedProvince}، {selectedCity}
                <ChevronDown className="w-4 h-4 text-zinc-400 group-active:translate-y-0.5 transition-transform" strokeWidth={2.4} />
              </span>
            </span>
          </button>

          <div className="flex items-center gap-2.5">
            <label className="flex-1 min-w-0 flex items-center gap-2.5 h-12 px-4 rounded-2xl bg-zinc-50 border border-zinc-200 transition focus-within:bg-white focus-within:border-[#824c71]/50 focus-within:ring-4 focus-within:ring-[#824c71]/10">
              <Search className="w-[18px] h-[18px] text-zinc-400 shrink-0" strokeWidth={2.2} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="جستجوی سالن، خدمات یا آدرس"
                className="bg-transparent outline-none text-sm w-full text-zinc-900 placeholder:text-zinc-400"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} aria-label="پاک کردن جستجو" className="shrink-0 w-5 h-5 rounded-full bg-zinc-300 text-white flex items-center justify-center">
                  <X className="w-3 h-3" strokeWidth={3} />
                </button>
              )}
            </label>

            <button
              onClick={() => setIsFiltersModalOpen(true)}
              aria-label="فیلترها"
              className={`relative shrink-0 w-12 h-12 flex items-center justify-center rounded-2xl border transition active:scale-95 ${
                hasActiveExtraFilters
                  ? 'bg-[#824c71] border-[#824c71] text-white'
                  : 'bg-white border-zinc-200 text-zinc-700'
              }`}
            >
              <SlidersHorizontal className="w-[18px] h-[18px]" strokeWidth={2.2} />
              {hasActiveExtraFilters && (
                <span className="absolute -top-1.5 -left-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-white text-[#824c71] border border-[#824c71] text-[10px] font-extrabold flex items-center justify-center">
                  {toPersianDigits(String(extraFilterCount))}
                </span>
              )}
            </button>
          </div>

          {showNeighborhoodChips && (
            <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar mt-3">
              {selectedNeighborhoods.map((nh) => (
                <span key={nh} className="flex items-center gap-1 bg-[#824c71]/10 text-[#824c71] pl-1.5 pr-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap">
                  {nh}
                  <button onClick={() => removeNeighborhood(nh)} aria-label={`حذف ${nh}`} className="w-4 h-4 rounded-full hover:bg-[#824c71]/15 flex items-center justify-center">
                    <X className="w-3 h-3" strokeWidth={2.8} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </header>

        {/* دسته‌بندی‌ها */}
        <section className="mt-2">
          <div className="flex items-center justify-between px-4 mb-3">
            <h2 className="text-[17px] font-extrabold text-zinc-900">دسته‌بندی خدمات</h2>
            {selectedCategories.length > 0 && (
              <button onClick={() => setSelectedCategories([])} className="text-xs font-bold text-[#824c71]">
                حذف انتخاب‌ها
              </button>
            )}
          </div>
          <div className="flex gap-3 overflow-x-auto hide-scrollbar px-4 pb-1">
            {categoryList.map((category: string) => {
              const Icon = getCategoryIcon(category);
              const isActive = selectedCategories.includes(category);
              return (
                <button
                  key={category}
                  onClick={() => toggleCategory(category)}
                  aria-pressed={isActive}
                  className="shrink-0 w-[68px] flex flex-col items-center gap-2 active:scale-95 transition-transform"
                >
                  <span
                    className={`w-[60px] h-[60px] rounded-full flex items-center justify-center transition-all duration-200 ${
                      isActive
                        ? 'bg-[#824c71] text-white shadow-[0_10px_20px_-8px_#824c71]'
                        : 'bg-[#f7eff4] text-[#824c71]'
                    }`}
                  >
                    <Icon className="w-[26px] h-[26px]" strokeWidth={1.8} />
                  </span>
                  <span className={`text-[11.5px] leading-tight text-center ${isActive ? 'font-extrabold text-[#824c71]' : 'font-medium text-zinc-600'}`}>
                    {getCategoryLabel(category)}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* لیست سالن‌ها */}
        <section className="px-4 mt-7">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-[17px] font-extrabold text-zinc-900 truncate">
              {searchQuery ? `نتایج «${searchQuery}»` : 'سالن‌های پیشنهادی'}
            </h2>
            {!isLoading && !error && (
              <span className="text-xs text-zinc-500 shrink-0 mr-3">{toPersianDigits(String(filteredSalons.length))} سالن</span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-7">
            {isLoading ? (
              [1, 2, 3, 4].map((n) => <SalonSkeleton key={n} />)
            ) : error ? (
              <div className="col-span-full py-10 text-center">
                <p className="text-sm font-medium text-zinc-700 leading-6">{error}</p>
                <button onClick={() => window.location.reload()} className="mt-4 h-10 px-5 rounded-full bg-[#824c71] text-white text-sm font-bold">
                  تلاش دوباره
                </button>
              </div>
            ) : filteredSalons.length > 0 ? (
              filteredSalons.map((salon) => {
                const validReviews = (salon.reviews || []).filter((r: any) => r.rating && r.rating > 0);
                const totalVotes = validReviews.length;
                const salonTags = (salon.tags || []).map((t: any) => (typeof t === 'object' && t !== null ? t.name : t));

                const avgRatingNum =
                  totalVotes > 0
                    ? validReviews.reduce((acc: number, r: any) => acc + r.rating, 0) / totalVotes
                    : typeof salon.rating === 'number' && salon.rating > 0
                    ? salon.rating
                    : null;

                const averageRating = avgRatingNum !== null ? formatRating(avgRatingNum) : null;
                const reviewsCount = totalVotes > 0 ? totalVotes : salon.reviewsCount || 0;
                const isPinned = !!salon.pinnedUntil && new Date(salon.pinnedUntil) > new Date();
                const saved = isBookmarked(salon.id);

                return (
                  <article key={salon.id} onClick={() => handleSalonCardClick(salon.id)} className="group cursor-pointer">
                    <div className="relative aspect-[16/10] rounded-[22px] overflow-hidden bg-zinc-100">
                      {salon.imageUrl ? (
                        <img
                          src={salon.imageUrl}
                          alt={salon.name}
                          loading="lazy"
                          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-zinc-400 text-xs">بدون تصویر</div>
                      )}
                      <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/25 to-transparent pointer-events-none" />

                      {isPinned && (
                        <span className="absolute top-3 right-3 flex items-center gap-1 bg-white/95 text-amber-600 rounded-full pl-2.5 pr-2 py-1 text-[11px] font-bold shadow-sm">
                          <Pin className="w-3 h-3 fill-amber-500" strokeWidth={2} />
                          ویژه
                        </span>
                      )}

                      <button
                        onClick={(e) => handleBookmarkClick(salon.id, e)}
                        aria-label={saved ? 'حذف از نشان‌ها' : 'افزودن به نشان‌ها'}
                        aria-pressed={saved}
                        className={`absolute top-3 left-3 w-9 h-9 flex items-center justify-center rounded-full bg-white/95 shadow-sm active:scale-90 transition ${
                          saved ? 'text-[#824c71]' : 'text-zinc-600'
                        }`}
                      >
                        <BookmarkIcon isActive={saved} className="w-[18px] h-[18px]" />
                      </button>

                      {averageRating && (
                        <span className="absolute bottom-3 right-3 flex items-center gap-1 bg-white/95 rounded-full px-2.5 py-1 shadow-sm">
                          <Star className="w-3.5 h-3.5 fill-yellow-500 text-yellow-500" strokeWidth={2} />
                          <span className="text-[12.5px] font-extrabold text-zinc-900">{toPersianDigits(averageRating)}</span>
                          <span className="text-[11px] text-zinc-500">({toPersianDigits(String(reviewsCount))})</span>
                        </span>
                      )}
                    </div>

                    <div className="px-1 pt-3">
                      <h3 className="font-extrabold text-zinc-900 text-[16px] leading-snug truncate">{salon.name}</h3>
                      <p className="flex items-center gap-1 mt-1 text-zinc-500 min-w-0">
                        <MapPin className="w-[14px] h-[14px] shrink-0" strokeWidth={2} />
                        <span className="text-[12.5px] truncate">{salon.address || 'آدرس ثبت نشده'}</span>
                      </p>

                      <div className="flex items-center gap-3 mt-3.5">
                        <div className="flex-1 min-w-0 flex items-center gap-1.5 overflow-hidden">
                          {salonTags.slice(0, 2).map((tag: string, idx: number) => (
                            <span key={idx} className="bg-[#f7eff4] text-[#824c71] text-[11px] px-2.5 py-1 rounded-full font-medium whitespace-nowrap truncate max-w-[130px]">
                              {tag}
                            </span>
                          ))}
                          {salonTags.length > 2 && (
                            <span className="text-zinc-500 text-[11px] font-medium shrink-0">+{toPersianDigits(String(salonTags.length - 2))}</span>
                          )}
                        </div>

                        <button
                          onClick={(e) => handleBookingClick(salon, e)}
                          className={`shrink-0 h-10 px-5 rounded-full text-[13px] font-bold active:scale-95 transition ${
                            salon.bookingEnabled
                              ? 'bg-[#824c71] text-white shadow-[0_8px_16px_-8px_#824c71]'
                              : 'border border-zinc-300 text-zinc-500'
                          }`}
                        >
                          نوبت‌دهی
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="col-span-full py-12 flex flex-col items-center text-center">
                <span className="w-16 h-16 rounded-full bg-[#f7eff4] text-[#824c71] flex items-center justify-center mb-4">
                  <SearchX className="w-7 h-7" strokeWidth={1.8} />
                </span>
                <p className="text-[15px] font-extrabold text-zinc-900">سالنی با این مشخصات پیدا نشد</p>
                <p className="text-[13px] text-zinc-500 mt-1.5 leading-6">عبارت جستجو را تغییر دهید یا فیلترها و منطقه را بازنشانی کنید.</p>
                <button onClick={resetAll} className="mt-5 h-11 px-6 rounded-full bg-[#824c71] text-white text-sm font-bold active:scale-95 transition">
                  پاک کردن فیلترها
                </button>
              </div>
            )}
          </div>
        </section>
      </div>

      <RegionFilterModal
        isOpen={isRegionModalOpen}
        onClose={() => setIsRegionModalOpen(false)}
        initialProvince={selectedProvince}
        initialCity={selectedCity}
        initialNeighborhoods={selectedNeighborhoods}
        onSelectLocation={(province: string, city: string, neighborhoods: string[]) => {
          if (province !== selectedProvince || city !== selectedCity) {
            setSelectedProvince(province);
            setSelectedCity(city);
            setSelectedNeighborhoods(neighborhoods);
          } else {
            setSelectedProvince(province);
            setSelectedCity(city);
            setSelectedNeighborhoods((prev) => {
              if (neighborhoods.includes('همه محله‌ها')) return ['همه محله‌ها'];
              const combined = [...prev, ...neighborhoods].filter((nh) => nh !== 'همه محله‌ها');
              return Array.from(new Set(combined));
            });
          }
        }}
      />

      <FiltersSheet
        isOpen={isFiltersModalOpen}
        onClose={() => setIsFiltersModalOpen(false)}
        homeServiceOnly={homeServiceOnly}
        onToggleHomeService={() => setHomeServiceOnly((p) => !p)}
        genderFilter={genderFilter}
        onSetGender={setGenderFilter}
        onClear={() => {
          setHomeServiceOnly(false);
          setGenderFilter('ALL');
        }}
        resultCount={filteredSalons.length}
      />

      <BookingDisabledAlert isOpen={showBookingAlert} onClose={() => setShowBookingAlert(false)} />
    </>
  );
}