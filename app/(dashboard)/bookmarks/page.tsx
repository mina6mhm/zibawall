// app/(dashboard)/bookmarks/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// کامپوننت آیکون بوک‌مارک (مشابه قبل)
const BookmarkIcon = ({ isActive, className }: { isActive: boolean, className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} 
       stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
       fill={isActive ? "currentColor" : "none"} 
  >
    <path d="M6 4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v17.5l-6-4-6 4V4z" />
  </svg>
);

export default function BookmarksPage() {
  const router = useRouter();
  
  const [bookmarkedSalons, setBookmarkedSalons] = useState<any[]>([]);
  const [savedBookmarkIds, setSavedBookmarkIds] = useState<(number | string)[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBookmarkedSalons = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const savedBookmarksStr = localStorage.getItem('bookmarkedSalons');
        const bookmarkIds = savedBookmarksStr ? JSON.parse(savedBookmarksStr) : [];
        setSavedBookmarkIds(bookmarkIds);

        if (bookmarkIds.length === 0) {
          setBookmarkedSalons([]);
          setIsLoading(false);
          return;
        }

        const response = await fetch('/api/salon');
        if (!response.ok) {
          throw new Error('خطا در دریافت اطلاعات سالن‌ها');
        }
        
        const data = await response.json();
        
        if (data.salons) {
          const filtered = data.salons.filter((salon: any) => bookmarkIds.includes(salon.id));
          setBookmarkedSalons(filtered);
        }
      } catch (err) {
        console.error('Error fetching salons:', err);
        setError('مشکلی در دریافت اطلاعات پیش آمد.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchBookmarkedSalons();
  }, []);

  const handleRemoveBookmark = (salonId: number | string, e: React.MouseEvent) => {
    e.stopPropagation(); // جلوگیری از فعال شدن کلیک روی کارت
    
    const updatedIds = savedBookmarkIds.filter((id) => id !== salonId);
    localStorage.setItem('bookmarkedSalons', JSON.stringify(updatedIds));
    setSavedBookmarkIds(updatedIds);
    setBookmarkedSalons((prev) => prev.filter((salon) => salon.id !== salonId));
  };

  return (
    <div className="flex flex-col min-h-screen bg-white pb-24">
      <div className="sticky top-0 z-20 bg-white px-4 pt-4 pb-3 md:pt-5 md:pb-4 border-b border-zinc-100">
        <div className="flex justify-between items-center w-full">
          <h1 className="text-lg md:text-xl font-bold text-zinc-900">نشان‌شده‌ها</h1>
        </div>
      </div>

      <div className="px-4 mt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {isLoading ? (
            // placeholder برای زمان بارگذاری (مشابه صفحه اصلی)
            [1, 2, 3, 4].map((n) => (
              <div key={n} className="bg-zinc-100 rounded-[10px] h-[300px] sm:h-[340px] animate-pulse"></div>
            ))
          ) : error ? (
            <div className="col-span-full py-8 text-center text-red-500 font-medium">{error}</div>
          ) : bookmarkedSalons.length > 0 ? (
            bookmarkedSalons.map((salon) => {
              const salonReviews = salon.reviews || [];
              const validReviews = salonReviews.filter((review: any) => review.rating && review.rating > 0);
              const totalVotes = validReviews.length;
              const averageRating = totalVotes > 0 
                ? (validReviews.reduce((acc: number, review: any) => acc + review.rating, 0) / totalVotes).toFixed(1)
                : salon.rating ? String(salon.rating) : null;
              const salonTags = (salon.tags || []).map((t: any) => typeof t === 'object' && t !== null ? t.name : t);

              return (
                // --- شروع تغییرات ظاهری کارت برای هماهنگی با صفحه اصلی ---
                <div 
  key={salon.id}
  onClick={() => router.push(`/salon/${salon.id}`)}
  className="cursor-pointer bg-white rounded-[10px] border border-zinc-200 overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)] transition-shadow flex flex-col group relative"
>
  <div className="h-24 sm:h-36 w-full bg-zinc-200 relative overflow-hidden"> 
    {salon.imageUrl ? (
      <img src={salon.imageUrl} alt={salon.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
    ) : (
      <div className="w-full h-full flex items-center justify-center text-zinc-400 bg-zinc-100 text-sm">بدون تصویر</div>
    )}
    
    <button 
      onClick={(e) => handleRemoveBookmark(salon.id, e)}
      className="absolute top-2 right-2 w-7 h-7 bg-white/90 backdrop-blur rounded-full flex items-center justify-center transition-colors shadow-sm z-10 text-[#824c71]"
    >
      <BookmarkIcon isActive={true} className="w-[15px] h-[15px]" />
    </button>
  </div>

  <div className="p-2.5 sm:p-4 flex flex-col flex-grow"> 
    <div className="flex justify-between items-start mb-1"> 
      <h3 className="font-bold text-zinc-900 text-sm">{salon.name}</h3>
      
      <div className="flex items-center gap-1 shrink-0">
        <span className="text-[10px] text-zinc-500 font-medium pt-0.5">
          ({totalVotes > 0 ? totalVotes : salon.reviewsCount || 0})
        </span>
        {averageRating && (
          <div className="flex items-center gap-0.5 px-1 py-0.5 rounded-md">
            <span className="font-bold text-xs text-zinc-900">{averageRating}</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="#EAB308" stroke="#EAB308" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </div>
        )}
      </div>
    </div>

    <div className="flex items-center gap-1 text-zinc-500 mb-1.5"> 
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
      <span className="text-[11px]">{salon.address || 'بدون آدرس'}</span>
    </div>

    {salonTags && salonTags.length > 0 && (
      <div className="flex flex-wrap gap-1 mb-2"> 
        {salonTags.slice(0, 3).map((tag: string, idx: number) => (
          <span key={idx} className="bg-zinc-100/80 text-zinc-600 text-[10px] px-2 py-0.5 rounded-md font-medium">
            {tag}
          </span>
        ))}
        {salonTags.length > 3 && (
          <span className="bg-zinc-100/80 text-zinc-500 text-[10px] px-2 py-0.5 rounded-md font-medium">
            +{salonTags.length - 3}
          </span>
        )}
      </div>
    )}

    <div className="border-t border-zinc-100 pt-2 flex items-center justify-between mt-auto"> 
      {(salon.phone || (salon.phones && salon.phones.length > 0)) && (
        <a 
          href={`tel:${salon.phone || salon.phones[0]}`}
          onClick={(e) => e.stopPropagation()}
          className="bg-[#824c71] text-white text-xs font-bold px-4 py-1.5 rounded-[6px] hover:bg-[#824c71]/80 transition-colors shadow-sm inline-flex items-center justify-center" 
        >
          تماس
        </a>
      )}
    </div>
  </div>
</div>
                // --- پایان تغییرات ظاهری کارت ---
              );
            })
          ) : (
            // پیام برای زمانی که لیست بوک‌مارک خالی است (مشابه صفحه اصلی)
            <div className="col-span-full py-16 md:py-20 text-center flex flex-col items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="w-12 h-12 md:w-16 md:h-16 text-zinc-300 mb-3 md:mb-4">
                <path d="M6 4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v17.5l-6-4-6 4V4z" />
              </svg>
              <h2 className="text-[15px] md:text-lg font-bold text-zinc-700 mb-1.5 md:mb-2">لیست نشان‌شده‌ها خالی است</h2>
              <p className="text-[13px] md:text-sm text-zinc-500 mb-5 md:mb-6">شما هنوز هیچ سالنی را ذخیره نکرده‌اید.</p>
              <button 
                onClick={() => router.push('/')}
                className="bg-[#824c71] text-white px-6 py-3 md:py-2.5 rounded-full text-[13px] md:text-sm font-bold hover:bg-[#824c71]/80 transition-colors active:scale-[0.98]"
              >
                مشاهده سالن‌ها
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
