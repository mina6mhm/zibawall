//app/(dashboard)/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CATEGORIES, CATEGORY_MAPPING } from '@/lib/data'; 
import RegionFilterModal from '@/components/RegionFilterModal';
import SearchBar from '@/components/SearchBar';
import { Home, Check, Sparkles, Eye, Gem, Scissors, Flower2, Zap, Crown, Palette, type LucideIcon } from 'lucide-react';

// --- نگاشت دقیق آیکون مینیمال بر اساس اسم واقعی هر دسته (از lib/data.ts) ---
const CATEGORY_ICON_MAP: Record<string, LucideIcon> = {
  'خدمات مو': Scissors,
  'خدمات ناخن': Gem,
  'خدمات ابرو و مژه': Eye,
  'خدمات پوست و زیبایی': Sparkles,
  'خدمات آرایش و میکاپ': Palette,
  'پکیج‌های عروس': Crown,
  'موزدایی و بدن': Zap,
  'خدمات ماساژ و اسپا': Flower2,
};

const getCategoryIcon = (category: string): LucideIcon => CATEGORY_ICON_MAP[category] || Sparkles;

// --- تابع پایه برای نرمال‌سازی حروف ---
const normalizeChars = (text: string) => {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/[آأإ]/g, 'ا')
    .replace(/[\u200B-\u200D\uFEFF\u200C]/g, '');
};

// --- تعریف گروه‌های مترادف ---
const SYNONYM_GROUPS = [
  ['سالن', 'مرکز', 'ارایشگاه', 'مجموعه', 'کلینیک', 'انستیتو', 'خانه', 'اسپا'],
  ['کراتین', 'کراتینه', 'احیا', 'پروتئین', 'بوتاکس'],
  ['رنگ', 'لایت', 'هایلایت', 'مش', 'امبره', 'بالیاژ'],
  ['شینیون', 'شنیون', 'بافت', 'براشینگ', 'استایل'],
  ['عروس', 'میکاپ', 'ارایش', 'محفلی', 'گریم', 'فرمالیته'],
  ['ناخن', 'کاشت', 'ترمیم', 'ژلیش', 'لمینت', 'مانیکور', 'پدیکور'],
  ['مژه', 'ابرو', 'اکستنشن', 'فیبروز', 'میکروبلیدینگ', 'لیفت', 'تاتو'],
  ['فیشیال', 'پاکسازی', 'پوست', 'میکرودرم', 'مزوتراپی'],
  ['اپیلاسیون', 'لیزر', 'موزدایی', 'وکس', 'اصلاح']
];

// --- تابع محاسبه اختلاف حروف (فاصله لون‌اشتاین) برای تشخیص غلط املایی ---
const getDistance = (a: string, b: string) => {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // جایگزینی (مثل س به ش)
          Math.min(matrix[i][j - 1] + 1, // درج (مثل مینا به مبینا)
          matrix[i - 1][j] + 1) // حذف
        );
      }
    }
  }
  return matrix[b.length][a.length];
};

// --- آپدیت تابع مترادف‌ها (پشتیبانی از غلط املایی) ---
const getSynonyms = (word: string): string[] => {
  for (const group of SYNONYM_GROUPS) {
    const normalizedGroup = group.map(normalizeChars);
    
    // بررسی تطابق دقیق یا داشتن حداکثر ۱-۲ غلط املایی
    const isMatch = normalizedGroup.some(w => {
      if (w === word) return true;
      if (word.length > 3) {
        const maxDist = word.length > 5 ? 2 : 1; // کلمات طولانی‌تر اجازه ۲ غلط دارند
        return getDistance(w, word) <= maxDist;
      }
      return false;
    });

    if (isMatch) return normalizedGroup;
  }
  return [word];
};

// --- تابع بررسی تطابق در متن با انعطاف‌پذیری ---
const isFuzzyMatch = (text: string, searchWord: string) => {
  if (!text) return false;
  const textNoSpace = text.replace(/\s+/g, '');
  const searchNoSpace = searchWord.replace(/\s+/g, '');
  
  // ۱. بررسی اینکه کلمه دقیقاً داخل متن باشد
  if (textNoSpace.includes(searchNoSpace)) return true;
  
  // ۲. بررسی حالت کلمه به کلمه برای خطای املایی
  if (searchNoSpace.length > 3) {
    const words = text.split(/\s+/);
    const maxDist = searchNoSpace.length > 5 ? 2 : 1;
    return words.some(w => getDistance(w, searchNoSpace) <= maxDist);
  }
  return false;
};

const BookmarkIcon = ({ isActive, className }: { isActive: boolean, className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} 
       stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
       fill={isActive ? "currentColor" : "none"} 
  >
    <path d="M6 4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v17.5l-6-4-6 4V4z" />
  </svg>
);

// --- فیلتر مخاطب سالن: وقتی هیچ‌کدام انتخاب نشده یعنی «همه» نمایش داده شود ---
type GenderFilter = 'ALL' | 'FEMALE' | 'MALE';

// --- دکمه‌ی تکی برای هر گزینه‌ی فیلتر مخاطب (تاگل: کلیک مجدد = غیرفعال کردن و نمایش همه) ---
function FilterPill({
  label,
  isActive,
  onClick,
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center px-3 py-2 rounded-full text-[13px] font-medium transition-all active:scale-95 ${
        isActive
          ? 'bg-[#824c71] text-white shadow-sm'
          : 'text-zinc-600 hover:text-zinc-900'
      }`}
    >
      {label}
    </button>
  );
}

export default function DashboardHomePage() {
  const router = useRouter();
  
  const [salons, setSalons] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [bookmarkedSalons, setBookmarkedSalons] = useState<(number|string)[]>([]);
  // دسته‌بندی انتخاب‌شده: وقتی خالی/null باشد یعنی «همه دسته‌ها» نمایش داده می‌شود
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [selectedProvince, setSelectedProvince] = useState<string>('تهران');
  const [selectedCity, setSelectedCity] = useState<string>('تهران');
  const [selectedNeighborhoods, setSelectedNeighborhoods] = useState<string[]>([]);
  
  const [isRegionModalOpen, setIsRegionModalOpen] = useState(false);

  // خدمات در منزل: یک چک‌باکس ساده (فعال/غیرفعال) - بدون حالت سه‌گانه
  const [homeServiceOnly, setHomeServiceOnly] = useState(false);

  // مخاطب سالن: فقط دو گزینه (بانوان / آقایون)؛ اگر هیچ‌کدام انتخاب نشود یعنی «همه»
  const [genderFilter, setGenderFilter] = useState<GenderFilter>('ALL');

  const toggleGender = (value: Exclude<GenderFilter, 'ALL'>) => {
    setGenderFilter((prev) => (prev === value ? 'ALL' : value));
  };

  const toggleCategory = (category: string) => {
    setSelectedCategory((prev) => (prev === category ? null : category));
  };

  const removeNeighborhood = (nhToRemove: string) => {
    setSelectedNeighborhoods((prev) => prev.filter((nh) => nh !== nhToRemove));
  };

  // دسته‌بندی‌ها بدون گزینه‌ی «همه» (اگر در دیتای اصلی وجود داشته باشد حذف می‌شود)
  const categoryList = CATEGORIES.filter((c: string) => c !== 'همه');

  useEffect(() => {
    const fetchSalonsData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/salon');
        if (!response.ok) {
          throw new Error('خطا در دریافت اطلاعات سالن‌ها');
        }
        
        const data = await response.json();
        
        if (data.salons) {
          setSalons(data.salons);
        }

        const savedBookmarks = localStorage.getItem('bookmarkedSalons');
        if (savedBookmarks) {
          setBookmarkedSalons(JSON.parse(savedBookmarks));
        }
      } catch (err) {
        console.error('Error fetching salons:', err);
        setError('مشکلی در برقراری ارتباط با سرور پیش آمد.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSalonsData();
  }, []);

  const handleBookmarkClick = async (salonId: number | string, e: React.MouseEvent) => {
    e.stopPropagation();
    const isBookmarked = bookmarkedSalons.includes(salonId);
    
    setBookmarkedSalons((prev) => {
      const newBookmarks = isBookmarked 
        ? prev.filter((id) => id !== salonId) 
        : [...prev, salonId];
      localStorage.setItem('bookmarkedSalons', JSON.stringify(newBookmarks));
      return newBookmarks;
    });
  };

  const isCurrentSalonBookmarked = (salonId: number | string) => bookmarkedSalons.includes(salonId);

  const filteredSalons = salons.filter((salon) => {
    const validTagsForCategory = selectedCategory ? (CATEGORY_MAPPING[selectedCategory] || []) : [];
    
    // تبدیل تگ‌ها به رشته (مدیریت آبجکت‌های Prisma)
    const salonTags = (salon.tags || []).map((t: any) => typeof t === 'object' && t !== null ? t.name : t);
    
    const matchesCategory = !selectedCategory || salonTags.some((tag: string) => validTagsForCategory.includes(tag));

    const matchesProvince = salon.province ? salon.province === selectedProvince : true;
    const matchesCity = salon.city ? salon.city === selectedCity : true;
    
    // پشتیبانی همزمان از اطلاعات ثبت شده با district (قدیمی) و neighborhoods (جدید)
    const salonNeighborhoods = Array.isArray(salon.neighborhoods) 
      ? salon.neighborhoods 
      : (salon.district ? [salon.district] : []);

    // بررسی تطابق محله با لحاظ کردن گزینه «همه محله‌ها»
    const matchesLocation =
      selectedProvince === 'تهران' && selectedCity === 'تهران' && selectedNeighborhoods.length > 0
        ? selectedNeighborhoods.includes('همه محله‌ها') || salonNeighborhoods.some((nh: string) => selectedNeighborhoods.includes(nh))
        : true;

    // فیلتر خدمات در منزل: وقتی چک‌باکس فعال است فقط سالن‌های دارای خدمات در منزل نشان داده شوند
    const matchesHomeService = !homeServiceOnly || !!salon.hasHomeService;

    // فیلتر مخاطب سالن (خانم‌ها / آقایون)؛ سالن‌های «هر دو» در هر دو حالت نمایش داده می‌شوند
    const matchesGender =
      genderFilter === 'ALL' ||
      salon.genderAudience === genderFilter ||
      salon.genderAudience === 'BOTH';

    if (!matchesCategory || !matchesProvince || !matchesCity || !matchesLocation || !matchesHomeService || !matchesGender) return false;
    
    if (!searchQuery.trim()) return true;

    const searchTerms = normalizeChars(searchQuery).split(/\s+/).filter(Boolean);
    
    // در اینجا فاصله‌ها را نگه می‌داریم تا کلمات قابل تشخیص باشند
    const normalizedName = normalizeChars(salon.name || '');
    const normalizedAddress = normalizeChars(salon.address || '');
    const normalizedTags = salonTags.map((tag: string) => normalizeChars(tag));

    // جستجوی متنی هوشمند با پشتیبانی از غلط‌های املایی
    return searchTerms.every((term) => {
      const synonyms = getSynonyms(term);
      
      return synonyms.some((syn) => {
        return (
          isFuzzyMatch(normalizedName, syn) ||
          isFuzzyMatch(normalizedAddress, syn) ||
          normalizedTags.some((tag: string) => isFuzzyMatch(tag, syn))
        );
      });
    });
  });

  const hasActiveExtraFilters = homeServiceOnly || genderFilter !== 'ALL';

  return (
    <>
      <div className="flex flex-col min-h-screen bg-white pb-24">
        {/* هدر */}
        <div className="sticky top-0 z-20 bg-white px-4 pt-3 md:pt-5 pb-2 md:pb-3">
          {/* انتخاب منطقه - دقیقاً مثل قبل، بالای سرچ‌باکس */}
          <div className="flex items-start mb-3 md:mb-5 w-full">
            <div className="flex flex-col gap-3 overflow-hidden w-full">
              <button 
                onClick={() => setIsRegionModalOpen(true)}
                className="flex items-center gap-1 w-fit text-zinc-800 hover:text-zinc-600 transition-colors"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <span className="font-bold text-sm">
                  {selectedProvince}، {selectedCity}
                </span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>

              {/* تگ‌های محله */}
              {selectedNeighborhoods.length > 0 && !selectedNeighborhoods.includes('همه محله‌ها') && (
                <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar w-full pb-1">
                  {selectedNeighborhoods.map((nh) => (
                    <span 
                      key={nh} 
                      className="flex items-center gap-1.5 bg-[#e3c9dc]/20 text-[#824c71] px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border border-[#d3aec8]"
                    >
                      {nh}
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          removeNeighborhood(nh);
                        }} 
                        className="hover:bg-rose-200 text-[#824c71] rounded-full p-0.5 transition-colors flex items-center justify-center"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
                        </svg>
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <SearchBar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />

          {/* خدمات در منزل (چک‌باکس ساده) + مخاطب سالن (بانوان / آقایون) */}
          <div className="flex items-center gap-2 mt-3">
            {/* چک‌باکس خدمات در منزل */}
            <button
              onClick={() => setHomeServiceOnly((prev) => !prev)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-full border text-[13px] font-medium transition-all active:scale-95 shrink-0 ${
                homeServiceOnly
                  ? 'border-[#824c71] bg-[#824c71]/5 text-[#824c71]'
                  : 'border-zinc-200 text-zinc-600 hover:border-zinc-300'
              }`}
            >
              <span
                className={`w-4 h-4 rounded-[5px] border-[1.5px] flex items-center justify-center shrink-0 transition-colors ${
                  homeServiceOnly ? 'bg-[#824c71] border-[#824c71]' : 'border-zinc-300'
                }`}
              >
                {homeServiceOnly && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
              </span>
              <Home className="w-3.5 h-3.5 shrink-0" strokeWidth={2.3} />
              خدمات در منزل
            </button>

            {/* مخاطب سالن: فقط دو گزینه */}
            <div className="flex items-center gap-0.5 bg-zinc-100 rounded-full p-1 flex-1">
              <FilterPill
                label="بانوان"
                isActive={genderFilter === 'FEMALE'}
                onClick={() => toggleGender('FEMALE')}
              />
              <FilterPill
                label="آقایون"
                isActive={genderFilter === 'MALE'}
                onClick={() => toggleGender('MALE')}
              />
            </div>
          </div>

          {hasActiveExtraFilters && (
            <div className="pt-2">
              <button
                onClick={() => {
                  setHomeServiceOnly(false);
                  setGenderFilter('ALL');
                }}
                className="text-[12.5px] font-medium text-zinc-400 hover:text-zinc-600 transition-colors"
              >
                پاک کردن فیلترها
              </button>
            </div>
          )}
        </div>

        {/* دسته‌بندی‌ها: عنوان + گرید دو ردیف چهارتایی با آیکون مینیمال، بدون گزینه‌ی «همه» */}
        <div className="px-4 mt-3 md:mt-4">
          <h2 className="text-base md:text-lg font-bold text-zinc-900 mb-3">دسته‌بندی خدمات</h2>
          <div className="grid grid-cols-4 gap-2.5">
            {categoryList.map((category: string, index: number) => {
              const CategoryIcon = getCategoryIcon(category);
              const isActive = selectedCategory === category;
              return (
                <button
                  key={index}
                  onClick={() => toggleCategory(category)}
                  className={`flex flex-col items-center justify-center gap-2.5 rounded-2xl border p-3 aspect-[4/5] transition-colors ${
                    isActive
                      ? 'border-[#824c71] bg-[#824c71]/5'
                      : 'border-zinc-100 bg-zinc-50/60 hover:bg-zinc-50'
                  }`}
                >
                  <span
                    className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                      isActive ? 'bg-[#824c71]/10' : 'bg-[#824c71]/[0.06]'
                    }`}
                  >
                    <CategoryIcon
                      className={`w-5 h-5 ${isActive ? 'text-[#824c71]' : 'text-[#824c71]/75'}`}
                      strokeWidth={1.75}
                    />
                  </span>
                  <span
                    className={`text-[11.5px] md:text-xs font-medium text-center leading-tight ${
                      isActive ? 'text-[#824c71]' : 'text-zinc-700'
                    }`}
                  >
                    {category}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* لیست سالن‌ها */}
        <div className="px-4 mt-4 md:mt-6">
          <h2 className="text-base md:text-lg font-bold text-zinc-900 mb-3 md:mb-4">
            {searchQuery ? `نتایج جستجو برای "${searchQuery}"` : (!selectedCategory ? 'سالن‌های پیشنهادی' : `سالن‌های دارای ${selectedCategory}`)}
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {isLoading ? (
              // اسکلتون‌های لودینگ
              [1, 2, 3, 4].map((n) => (
                <div key={n} className="bg-zinc-100 rounded-2xl h-40 animate-pulse"></div>
              ))
            ) : error ? (
              <div className="col-span-full py-8 text-center text-red-500 font-medium">{error}</div>
            ) : filteredSalons.length > 0 ? (
              filteredSalons.map((salon) => {
                const salonReviews = salon.reviews || [];
                const validReviews = salonReviews.filter((review: any) => review.rating && review.rating > 0);
                const totalVotes = validReviews.length;

                // تبدیل تگ‌ها برای رندر در لیست
                const salonTags = (salon.tags || []).map((t: any) => typeof t === 'object' && t !== null ? t.name : t);

                const averageRating = totalVotes > 0 
                  ? (validReviews.reduce((acc: number, review: any) => acc + review.rating, 0) / totalVotes).toFixed(1)
                  : salon.rating ? String(salon.rating) : null; 
                  
                return (
                  // --- شروع کارت (ارتفاع بر اساس محتوا، بدون افتادن دکمه بیرون از کارت) ---
                  <div 
                    key={salon.id}
                    onClick={() => router.push(`/salon/${salon.id}`)}
                    dir="ltr"
                    className="cursor-pointer bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_14px_rgba(0,0,0,0.1)] active:scale-[0.99] transition-all flex items-stretch group relative"
                  >
                    {/* تصویر سالن - سمت چپ (با ارتفاع کارت هم‌راستا می‌شود) */}
                    <div className="w-28 sm:w-32 self-stretch bg-zinc-200 relative overflow-hidden shrink-0">
                      {salon.imageUrl ? (
                        <img src={salon.imageUrl} alt={salon.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-zinc-400 bg-zinc-100 text-xs">بدون تصویر</div>
                      )}
                    </div>

                    {/* محتوا - سمت راست */}
                    <div dir="rtl" className="flex-1 min-w-0 p-3 flex flex-col">
                      
                      {/* ردیف بالا: نام (راست) / بوکمارک (چپ) */}
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-bold text-zinc-900 text-[15px] leading-tight truncate flex-1">{salon.name}</h3>

                        <button 
                          onClick={(e) => handleBookmarkClick(salon.id, e)}
                          className={`shrink-0 w-9 h-9 -mt-1.5 -ml-1.5 flex items-center justify-center rounded-full active:bg-zinc-100 transition-colors ${
                            isCurrentSalonBookmarked(salon.id) ? 'text-[#824c71]' : 'text-zinc-400'
                          }`}
                        >
                          <BookmarkIcon isActive={isCurrentSalonBookmarked(salon.id)} className="w-5 h-5" />
                        </button>
                      </div>

                      {/* آدرس */}
                      <div className="flex items-center gap-1 text-zinc-500 mt-1 min-w-0">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                          <circle cx="12" cy="10" r="3" />
                        </svg>
                        <span className="text-[12.5px] truncate">{salon.address || 'بدون آدرس'}</span>
                      </div>

                      {/* امتیاز */}
                      {averageRating && (
                        <div className="flex items-center gap-1 mt-1.5">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="#EAB308" stroke="#EAB308" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                          </svg>
                          <span className="font-bold text-[12.5px] text-zinc-900">{averageRating}</span>
                          <span className="text-[11px] text-zinc-500">
                            ({totalVotes > 0 ? totalVotes : salon.reviewsCount || 0} نظر)
                          </span>
                        </div>
                      )}

                      {/* تگ‌ها */}
                      {salonTags && salonTags.length > 0 && (
                        <div className="flex items-center gap-1 mt-2 overflow-hidden flex-nowrap">
                          {salonTags.slice(0, 2).map((tag: string, idx: number) => (
                            <span key={idx} className="bg-zinc-100 text-zinc-600 text-[11px] px-2 py-1 rounded-md font-medium whitespace-nowrap shrink-0">
                              {tag}
                            </span>
                          ))}
                          {salonTags.length > 2 && (
                            <span className="bg-zinc-100 text-zinc-500 text-[11px] px-2 py-1 rounded-md font-medium shrink-0">
                              +{salonTags.length - 2}
                            </span>
                          )}
                        </div>
                      )}

                      {/* دکمه تماس */}
                      <div className="flex mt-2.5">
                        {(salon.phone || (salon.phones && salon.phones.length > 0)) && (
                          <a 
                            href={`tel:${salon.phone || salon.phones[0]}`}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-[#824c71] text-white text-[13px] font-bold px-5 py-2 rounded-lg hover:bg-[#824c71]/90 active:scale-95 transition-all shadow-sm inline-flex items-center justify-center"
                          >
                            تماس
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                  // --- پایان کارت ---
                );
              })
            ) : (
              <div className="col-span-full py-8 text-center flex flex-col items-center justify-center">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-300 mb-3">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
                </svg>
                <p className="text-zinc-600 font-medium">نتیجه‌ای یافت نشد!</p>
                <p className="text-zinc-400 text-sm mt-1">لطفاً عبارت دیگری را جستجو کنید یا منطقه را تغییر دهید.</p>
                <button 
                  onClick={() => { 
                    setSearchQuery(''); 
                    setSelectedCategory(null); 
                    setSelectedProvince('تهران'); 
                    setSelectedCity('تهران'); 
                    setSelectedNeighborhoods([]); 
                    setHomeServiceOnly(false);
                    setGenderFilter('ALL');
                  }}
                  className="mt-4 text-[#824c71] font-medium text-sm hover:text-[#824c71]/80"
                >
                  پاک کردن فیلترها
                </button>
              </div>
            )}
          </div>
        </div>
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
              if (neighborhoods.includes('همه محله‌ها')) {
                return ['همه محله‌ها'];
              }
              const combined = [...prev, ...neighborhoods].filter((nh) => nh !== 'همه محله‌ها');
              return Array.from(new Set(combined)); 
            });
          }
        }} 
      />

    </>
  );
}
