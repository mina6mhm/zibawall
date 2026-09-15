// app/(dashboard)/bookmarks/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarClock } from 'lucide-react';

// کامپوننت آیکون بوک‌مارک
const BookmarkIcon = ({
  isActive,
  className,
}: {
  isActive: boolean;
  className?: string;
}) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    fill={isActive ? 'currentColor' : 'none'}
  >
    <path d="M6 4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v17.5l-6-4-6 4V4z" />
  </svg>
);

// Alert نوبت‌دهی، دقیقاً مشابه داشبورد
function BookingDisabledAlert({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm px-5"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center mb-4 mx-auto">
          <CalendarClock className="w-6 h-6 text-amber-500" />
        </div>

        <h3 className="text-base font-bold text-zinc-900 text-center mb-2">
          نوبت‌دهی آنلاین فعال نیست
        </h3>

        <p className="text-sm text-zinc-500 text-center leading-relaxed mb-5">
          این سالن هنوز سیستم نوبت‌دهی آنلاین را فعال نکرده است. برای رزرو وقت با سالن تماس بگیرید.
        </p>

        <button
          onClick={onClose}
          className="w-full bg-[#824c71] hover:bg-[#6e3f60] text-white rounded-[10px] py-3 text-sm font-bold"
        >
          متوجه شدم
        </button>
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

  // فقط برای رفتار دکمه نوبت‌دهی
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

        if (!response.ok) {
          throw new Error('خطا در دریافت اطلاعات سالن‌ها');
        }

        const data = await response.json();

        if (data.salons) {
          const filtered = data.salons.filter((salon: any) =>
            bookmarkIds.includes(salon.id)
          );

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

  const handleRemoveBookmark = (
    salonId: number | string,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();

    const updatedIds = savedBookmarkIds.filter((id) => id !== salonId);

    localStorage.setItem('bookmarkedSalons', JSON.stringify(updatedIds));

    setSavedBookmarkIds(updatedIds);

    setBookmarkedSalons((prev) =>
      prev.filter((salon) => salon.id !== salonId)
    );
  };

  // رفتار دکمه نوبت‌دهی، مشابه داشبورد
  const handleBookingClick = (
    salon: any,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();

    if (salon.bookingEnabled) {
      router.push(`/salon/${salon.id}/book`);
    } else {
      setShowBookingAlert(true);
    }
  };

  return (
    <>
      <div className="max-w-3xl mx-auto pt-8 pb-32 px-4 md:pt-10 md:px-0">

        {/* عنوان صفحه */}
        <div className="mb-7">
          <h1 className="text-xl md:text-2xl font-bold text-zinc-900">
            نشان‌شده‌ها
          </h1>

          <p className="text-zinc-500 text-xs md:text-sm mt-0.5">
            سالن‌هایی که ذخیره کرده‌اید
          </p>
        </div>

        {/* لیست کارت‌ها */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {isLoading ? (

            /* Loading */
            [1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="bg-zinc-100 rounded-2xl h-44 animate-pulse"
              />
            ))

          ) : error ? (

            /* Error */
            <div className="col-span-full py-8 text-center text-red-500 font-medium">
              {error}
            </div>

          ) : bookmarkedSalons.length > 0 ? (

            bookmarkedSalons.map((salon) => {

              const salonReviews = salon.reviews || [];

              const validReviews = salonReviews.filter(
                (review: any) => review.rating && review.rating > 0
              );

              const totalVotes = validReviews.length;

              const averageRating =
                totalVotes > 0
                  ? (
                      validReviews.reduce(
                        (acc: number, review: any) =>
                          acc + review.rating,
                        0
                      ) / totalVotes
                    ).toFixed(1)
                  : salon.rating
                    ? String(salon.rating)
                    : null;

              const salonTags = (salon.tags || []).map(
                (t: any) =>
                  typeof t === 'object' && t !== null
                    ? t.name
                    : t
              );

              return (
                <div
                  key={salon.id}
                  onClick={() => router.push(`/salon/${salon.id}`)}
                  dir="ltr"
                  className="h-44 cursor-pointer bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_14px_rgba(0,0,0,0.1)] active:scale-[0.99] transition-all flex items-stretch group relative"
                >

                  {/* تصویر سالن */}
                  <div className="w-28 sm:w-32 h-full bg-zinc-200 relative overflow-hidden shrink-0">
                    {salon.imageUrl ? (
                      <img
                        src={salon.imageUrl}
                        alt={salon.name}
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-zinc-400 bg-zinc-100 text-xs">
                        بدون تصویر
                      </div>
                    )}
                  </div>

                  {/* محتوای کارت */}
                  <div
                    dir="rtl"
                    className="flex-1 min-w-0 h-full p-3 flex flex-col overflow-hidden"
                  >

                    {/* محتوای اصلی */}
                    <div className="flex-1 min-h-0 overflow-hidden">

                      {/* نام سالن + بوکمارک */}
                      <div className="flex items-start justify-between gap-2">

                        <h3 className="font-bold text-zinc-900 text-[15px] leading-tight truncate flex-1">
                          {salon.name}
                        </h3>

                        <button
                          onClick={(e) =>
                            handleRemoveBookmark(salon.id, e)
                          }
                          className="shrink-0 w-9 h-9 -mt-1.5 -ml-1.5 flex items-center justify-center rounded-full active:bg-zinc-100 transition-colors text-[#824c71]"
                        >
                          <BookmarkIcon
                            isActive={true}
                            className="w-5 h-5"
                          />
                        </button>

                      </div>

                      {/* آدرس */}
                      <div className="flex items-center gap-1 text-zinc-500 mt-1 min-w-0">
                        <svg
                          width="13"
                          height="13"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="shrink-0"
                        >
                          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                          <circle cx="12" cy="10" r="3" />
                        </svg>

                        <span className="text-[12.5px] truncate">
                          {salon.address || 'بدون آدرس'}
                        </span>
                      </div>

                      {/* امتیاز */}
                      {averageRating && (
                        <div className="flex items-center gap-1 mt-1.5">
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="#EAB308"
                            stroke="#EAB308"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                          </svg>

                          <span className="font-bold text-[12.5px] text-zinc-900">
                            {averageRating}
                          </span>

                          <span className="text-[11px] text-zinc-500">
                            (
                            {totalVotes > 0
                              ? totalVotes
                              : salon.reviewsCount || 0}{' '}
                            نظر)
                          </span>
                        </div>
                      )}

                      {/* تگ‌ها */}
                      {salonTags && salonTags.length > 0 && (
                        <div className="flex items-center gap-1 mt-2 overflow-hidden flex-nowrap">

                          {salonTags
                            .slice(0, 2)
                            .map(
                              (
                                tag: string,
                                idx: number
                              ) => (
                                <span
                                  key={idx}
                                  className="bg-zinc-100 text-zinc-600 text-[11px] px-2 py-1 rounded-md font-medium whitespace-nowrap shrink-0"
                                >
                                  {tag}
                                </span>
                              )
                            )}

                          {salonTags.length > 2 && (
                            <span className="bg-zinc-100 text-zinc-500 text-[11px] px-2 py-1 rounded-md font-medium shrink-0">
                              +{salonTags.length - 2}
                            </span>
                          )}

                        </div>
                      )}

                    </div>

                    {/* دکمه نوبت‌دهی - دقیقاً مشابه داشبورد */}
                    <div className="flex mt-2 shrink-0">
                      <button
                        onClick={(e) =>
                          handleBookingClick(salon, e)
                        }
                        className="flex items-center justify-center gap-1.5 bg-[#824c71] text-white text-[13px] font-bold px-4 py-2 rounded-lg hover:bg-[#824c71]/90 active:scale-95 transition-all shadow-sm"
                      >
                        نوبت‌دهی
                      </button>
                    </div>

                  </div>
                </div>
              );
            })

          ) : (

            /* لیست خالی */
            <div className="col-span-full py-16 md:py-20 text-center flex flex-col items-center justify-center">

              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-12 h-12 md:w-16 md:h-16 text-zinc-300 mb-3 md:mb-4"
              >
                <path d="M6 4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v17.5l-6-4-6 4V4z" />
              </svg>

              <h2 className="text-[15px] md:text-lg font-bold text-zinc-700 mb-1.5 md:mb-2">
                لیست نشان‌شده‌ها خالی است
              </h2>

              <p className="text-[13px] md:text-sm text-zinc-500 mb-5 md:mb-6">
                شما هنوز هیچ سالنی را ذخیره نکرده‌اید.
              </p>

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

      {/* Alert نوبت‌دهی */}
      <BookingDisabledAlert
        isOpen={showBookingAlert}
        onClose={() => setShowBookingAlert(false)}
      />
    </>
  );
}