// app/(dashboard)/bookmarks/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarClock, Pin, MapPin, Star, Bookmark } from 'lucide-react';

const toPersianDigits = (str: string) => str.replace(/[0-9]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);
const formatRating = (num: number) => (Number.isInteger(num) ? String(num) : num.toFixed(1));

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
      <div className="aspect-[16/10] rounded-t-[20px] bg-zinc-100" />
      <div className="rounded-b-[20px] border border-t-0 border-zinc-200 px-4 pt-3.5 pb-4">
        <div className="h-4 w-2/3 rounded bg-zinc-100" />
        <div className="mt-2 h-3 w-1/2 rounded bg-zinc-100" />
        <div className="mt-4 h-10 rounded-full bg-zinc-100" />
      </div>
    </div>
  );
}

export default function BookmarksPage() {
  const router = useRouter();

  const [bookmarkedSalons, setBookmarkedSalons] = useState<any[]>([]);
  const [savedBookmarkIds, setSavedBookmarkIds] = useState<(number | string)[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showBookingAlert, setShowBookingAlert] = useState(false);

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
        if (!response.ok) throw new Error('خطا در دریافت اطلاعات سالن‌ها');
        const data = await response.json();
        if (data.salons) {
          setBookmarkedSalons(data.salons.filter((salon: any) => bookmarkIds.includes(salon.id)));
        }
      } catch (err) {
        console.error('Error fetching salons:', err);
        setError('اتصال به سرور برقرار نشد. اینترنت خود را بررسی کنید و دوباره تلاش کنید.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchBookmarkedSalons();
  }, []);

  const handleRemoveBookmark = (salonId: number | string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedIds = savedBookmarkIds.filter((id) => id !== salonId);
    localStorage.setItem('bookmarkedSalons', JSON.stringify(updatedIds));
    setSavedBookmarkIds(updatedIds);
    setBookmarkedSalons((prev) => prev.filter((salon) => salon.id !== salonId));
  };

  const handleBookingClick = (salon: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (salon.bookingEnabled) router.push(`/salon/${salon.id}/book`);
    else setShowBookingAlert(true);
  };

  return (
    <>
      <div className="max-w-3xl mx-auto min-h-screen bg-white pt-6 pb-32 px-2 md:pt-10">
        <div className="mb-6 px-0">
          <h1 className="text-[17px] md:text-xl font-extrabold text-zinc-900">نشان‌شده‌ها</h1>
          <p className="text-zinc-500 text-xs md:text-sm mt-0.5">سالن‌هایی که ذخیره کرده‌اید</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {isLoading ? (
            [1, 2, 3, 4].map((n) => <SalonSkeleton key={n} />)
          ) : error ? (
            <div className="col-span-full py-10 text-center">
              <p className="text-sm font-medium text-zinc-700 leading-6">{error}</p>
              <button onClick={() => window.location.reload()} className="mt-4 h-10 px-5 rounded-full bg-[#824c71] text-white text-sm font-bold">
                تلاش دوباره
              </button>
            </div>
          ) : bookmarkedSalons.length > 0 ? (
            bookmarkedSalons.map((salon) => {
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

              return (
                <article key={salon.id} onClick={() => router.push(`/salon/${salon.id}`)} className="group cursor-pointer active:scale-[0.995] transition-transform">
                  <div className="relative aspect-[16/10] overflow-hidden bg-zinc-100 rounded-t-[20px]">
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
                      onClick={(e) => handleRemoveBookmark(salon.id, e)}
                      aria-label="حذف از نشان‌ها"
                      aria-pressed={true}
                      className="absolute top-3 left-3 w-9 h-9 flex items-center justify-center rounded-full bg-white/95 shadow-sm active:scale-90 transition text-[#824c71]"
                    >
                      <BookmarkIcon isActive={true} className="w-[18px] h-[18px]" />
                    </button>

                    {averageRating && (
                      <span className="absolute bottom-3 right-3 flex items-center gap-1 bg-white/95 rounded-full px-2.5 py-1 shadow-sm">
                        <Star className="w-3.5 h-3.5 fill-yellow-500 text-yellow-500" strokeWidth={2} />
                        <span className="text-[12.5px] font-extrabold text-zinc-900">{toPersianDigits(averageRating)}</span>
                        <span className="text-[11px] text-zinc-500">({toPersianDigits(String(reviewsCount))})</span>
                      </span>
                    )}
                  </div>

                  <div className="rounded-b-[20px] border border-t-0 border-zinc-200 bg-white px-4 pt-3.5 pb-4">
                    <h3 className="font-extrabold text-zinc-900 text-[16px] leading-snug truncate">{salon.name}</h3>
                    <p className="flex items-center gap-1 mt-1 text-zinc-500 min-w-0">
                      <MapPin className="w-[14px] h-[14px] shrink-0" strokeWidth={2} />
                      <span className="text-[12.5px] truncate">{salon.address || 'آدرس ثبت نشده'}</span>
                    </p>

                    <div className="flex items-center gap-3 mt-3.5">
                      <div className="flex-1 min-w-0 flex items-center gap-1.5 overflow-hidden">
                        {salonTags.slice(0, 2).map((tag: string, idx: number) => (
                          <span key={idx} className="bg-[#f5ebf2] text-[#824c71] text-[11px] px-2.5 py-1 rounded-full font-medium whitespace-nowrap truncate max-w-[130px]">
                            {tag}
                          </span>
                        ))}
                        {salonTags.length > 2 && (
                          <span className="text-zinc-500 text-[11px] font-medium shrink-0">+{toPersianDigits(String(salonTags.length - 2))}</span>
                        )}
                      </div>

                      <button
                        onClick={(e) => handleBookingClick(salon, e)}
                        className="shrink-0 h-10 px-5 rounded-full bg-[#824c71] text-white text-[13px] font-bold active:scale-95 transition"
                      >
                        نوبت‌دهی
                      </button>
                    </div>
                  </div>
                </article>
              );
            })
          ) : (
            <div className="col-span-full py-16 flex flex-col items-center text-center">
              <span className="w-16 h-16 rounded-full bg-[#f5ebf2] text-[#824c71] flex items-center justify-center mb-4">
                <Bookmark className="w-7 h-7" strokeWidth={1.8} />
              </span>
              <h2 className="text-[15px] font-extrabold text-zinc-900">لیست نشان‌شده‌ها خالی است</h2>
              <p className="text-[13px] text-zinc-500 mt-1.5 leading-6">شما هنوز هیچ سالنی را ذخیره نکرده‌اید.</p>
              <button onClick={() => router.push('/')} className="mt-5 h-11 px-6 rounded-full bg-[#824c71] text-white text-sm font-bold active:scale-95 transition">
                مشاهده سالن‌ها
              </button>
            </div>
          )}
        </div>
      </div>

      <BookingDisabledAlert isOpen={showBookingAlert} onClose={() => setShowBookingAlert(false)} />
    </>
  );
}