// app/(dashboard)/page.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CATEGORIES, CATEGORY_MAPPING } from '@/lib/data'; 
import RegionFilterModal from '@/components/RegionFilterModal';
import SearchBar from '@/components/SearchBar';

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

const getSynonyms = (word: string): string[] => {
  for (const group of SYNONYM_GROUPS) {
    const normalizedGroup = group.map(normalizeChars);
    if (normalizedGroup.includes(word)) {
      return normalizedGroup;
    }
  }
  return [word];
};

const BookmarkIcon = ({ isActive, className }: { isActive: boolean, className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} 
       stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
       fill={isActive ? "currentColor" : "none"} 
  >
    <path d="M6 4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v17.5l-6-4-6 4V4z" />
  </svg>
);

export default function DashboardHomePage() {
  const router = useRouter();
  
  const [salons, setSalons] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [bookmarkedSalons, setBookmarkedSalons] = useState<(number|string)[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('همه');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProvince, setSelectedProvince] = useState('تهران');
  const [selectedCity, setSelectedCity] = useState('تهران');
  const [isRegionModalOpen, setIsRegionModalOpen] = useState(false);

  useEffect(() => {
    const fetchSalonsData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // دریافت داده‌های واقعی از دیتابیس
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
    const validTagsForCategory = CATEGORY_MAPPING[selectedCategory] || [];
    const salonTags = salon.tags || [];
    const matchesCategory = selectedCategory === 'همه' || salonTags.some((tag: string) => validTagsForCategory.includes(tag));

    const matchesProvince = salon.province ? salon.province === selectedProvince : true;
    const matchesCity = salon.city ? salon.city === selectedCity : true;

    if (!matchesCategory || !matchesProvince || !matchesCity) return false;
    if (!searchQuery.trim()) return true;

    const searchTerms = normalizeChars(searchQuery).split(/\s+/).filter(Boolean);
    const normalizedName = normalizeChars(salon.name || '').replace(/\s+/g, '');
    const normalizedAddress = normalizeChars(salon.address || '').replace(/\s+/g, '');
    const normalizedTags = salonTags.map((tag: string) => normalizeChars(tag).replace(/\s+/g, ''));

    const matchesSearch = searchTerms.every(term => {
      const possibleWords = getSynonyms(term);
      return possibleWords.some(possibleWord => 
        normalizedName.includes(possibleWord) || 
        normalizedAddress.includes(possibleWord) || 
        normalizedTags.some((tag: string) => tag.includes(possibleWord))
      );
    });

    return matchesSearch;
  });

  return (
    <>
      <div className="flex flex-col min-h-screen bg-white pb-24">
                {/* هدر */}
        <div className="sticky top-0 z-20 bg-white px-4 pt-5 pb-3">
          <div className="flex justify-between items-center mb-5 w-full">
            {/* دکمه فیلتر منطقه (راست) */}
            <button 
              onClick={() => setIsRegionModalOpen(true)}
              className="flex items-center gap-1 text-zinc-800 hover:text-zinc-600 transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <span className="font-bold text-sm">{selectedProvince}، {selectedCity}</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>

            {/* لوگو سایت (چپ) */}
            <img 
              src="/logo.png" 
              alt="لوگو" 
              className="h-8 w-auto object-contain" 
            />
          </div>

          <SearchBar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
        </div>


        {/* دسته‌بندی‌ها */}
        <div className="px-4 mt-2">
          <div className="flex overflow-x-auto gap-2 pb-2 hide-scrollbar">
            {CATEGORIES.map((category, index) => (
              <button 
                key={index} 
                onClick={() => setSelectedCategory(category)}
                className={`whitespace-nowrap px-4 py-2 border rounded-full text-sm font-medium transition-colors ${
                  selectedCategory === category 
                    ? 'bg-zinc-900 text-white border-zinc-900' 
                    : 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* لیست سالن‌ها */}
        <div className="px-4 mt-6">
          <h2 className="text-lg font-bold text-zinc-900 mb-4">
            {searchQuery ? `نتایج جستجو برای "${searchQuery}"` : (selectedCategory === 'همه' ? 'سالن‌های پیشنهادی' : `سالن‌های دارای ${selectedCategory}`)}
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {isLoading ? (
              [1, 2, 3, 4].map((n) => (
                <div key={n} className="bg-zinc-100 rounded-[10px] h-[340px] animate-pulse"></div>
              ))
            ) : error ? (
              <div className="col-span-full py-8 text-center text-red-500 font-medium">{error}</div>
            ) : filteredSalons.length > 0 ? (
              filteredSalons.map((salon) => {
                // ==========================================================
// منطق محاسبه تعداد رای و میانگین مشابه صفحه جزئیات
// ==========================================================
const salonReviews = salon.reviews || [];

// فیلتر کردن نظراتی که امتیاز معتبر (بیشتر از صفر) دارند
const validReviews = salonReviews.filter((review: any) => review.rating && review.rating > 0);
const totalVotes = validReviews.length;

// محاسبه میانگین فقط بر اساس نظرات دارای امتیاز
const averageRating = totalVotes > 0 
  ? (validReviews.reduce((acc: number, review: any) => acc + review.rating, 0) / totalVotes).toFixed(1)
  : salon.rating ? String(salon.rating) : null; // استفاده از دیتای پشتیبان در صورت نبود کامنت
                  
                return (
                  <div 
                    key={salon.id}
                    onClick={() => router.push(`/salon/${salon.id}`)}
                    className="cursor-pointer bg-white rounded-[10px] border border-zinc-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col group relative"
                  >
                    <div className="h-44 w-full bg-zinc-200 relative overflow-hidden">
                      {salon.imageUrl ? (
                        <img src={salon.imageUrl} alt={salon.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-400 bg-zinc-100 text-sm">بدون تصویر</div>
                      )}
                      
                      <button 
                        onClick={(e) => handleBookmarkClick(salon.id, e)}
                        className={`absolute top-3 right-3 w-8 h-8 bg-white/90 backdrop-blur rounded-full flex items-center justify-center transition-colors shadow-sm z-10 ${
                          isCurrentSalonBookmarked(salon.id) ? 'text-black' : 'text-zinc-700'
                        }`}
                      >
                        <BookmarkIcon isActive={isCurrentSalonBookmarked(salon.id)} className="w-[18px] h-[18px]" />
                      </button>
                    </div>

                    <div className="p-4 flex flex-col flex-grow">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-zinc-900 text-base">{salon.name}</h3>
                        
                        {/* نمایش میانگین محاسبه شده و تعداد رای در کنار هم */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[11px] text-zinc-500 font-medium pt-0.5">
                            ({totalVotes > 0 ? totalVotes : salon.reviewsCount || 0} رای)
                          </span>
                          {averageRating && (
                            <div className="flex items-center gap-1 bg-amber-50/50 px-1.5 py-0.5 rounded-md">
                              <span className="font-bold text-sm text-zinc-900">{averageRating}</span>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="#EAB308" stroke="#EAB308" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                              </svg>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-zinc-500 mb-3">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                          <circle cx="12" cy="10" r="3" />
                        </svg>
                        <span className="text-xs">{salon.address || 'بدون آدرس'}</span>
                      </div>

                      {salon.tags && salon.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-4">
                          {salon.tags.slice(0, 3).map((tag: string, idx: number) => (
                            <span key={idx} className="bg-zinc-100/80 text-zinc-600 text-[11px] px-2.5 py-1 rounded-md font-medium">
                              {tag}
                            </span>
                          ))}
                          {salon.tags.length > 3 && (
                            <span className="bg-zinc-100/80 text-zinc-500 text-[11px] px-2 py-1 rounded-md font-medium">
                              +{salon.tags.length - 3}
                            </span>
                          )}
                        </div>
                      )}

                      <div className="border-t border-zinc-100 pt-3 flex items-center justify-between mt-auto">
                        
                        {(salon.phone || (salon.phones && salon.phones.length > 0)) && (
                          <a 
                            href={`tel:${salon.phone || salon.phones[0]}`}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-zinc-900 text-white text-sm font-bold px-6 py-2.5 rounded-[6px] hover:bg-black transition-colors shadow-sm inline-flex items-center justify-center"
                          >
                            تماس
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
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
                  onClick={() => { setSearchQuery(''); setSelectedCategory('همه'); setSelectedProvince('تهران'); setSelectedCity('تهران'); }}
                  className="mt-4 text-rose-600 font-medium text-sm hover:text-rose-700"
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
        onSelectLocation={(province: string, city: string) => {
          setSelectedProvince(province);
          setSelectedCity(city);
        }} 
      />
    </>
  );
}
