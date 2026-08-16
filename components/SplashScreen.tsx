// components/SplashScreen.tsx
'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

// مدت زمانی که اسپلش نمایش داده می‌شود (میلی‌ثانیه) — بعد از این مدت با فید محو می‌شود
const SPLASH_DURATION = 1800;
const FADE_DURATION = 350;

export default function SplashScreen({ children }: { children: React.ReactNode }) {
  // isVisible: آیا کامپوننت اسپلش هنوز توی DOM هست (بعد از فید کامل، حذف می‌شه)
  const [isVisible, setIsVisible] = useState(true);
  // isFadingOut: مرحله‌ی شروع محو شدن (برای اجرای ترنزیشن opacity)
  const [isFadingOut, setIsFadingOut] = useState(false);
  // بنر هشدار VPN، جدا از خودِ اسپلش قابل بسته شدنه
  const [isBannerVisible, setIsBannerVisible] = useState(true);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setIsFadingOut(true), SPLASH_DURATION);
    const removeTimer = setTimeout(() => setIsVisible(false), SPLASH_DURATION + FADE_DURATION);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  return (
    <>
      {children}

      {isVisible && (
        <div
          className="fixed inset-0 z-[9999] flex flex-col bg-white transition-opacity ease-out"
          style={{
            opacity: isFadingOut ? 0 : 1,
            transitionDuration: `${FADE_DURATION}ms`,
          }}
          dir="rtl"
        >
          {/* بنر هشدار VPN */}
          {isBannerVisible && (
            <div className="mx-4 mt-4 sm:mx-6 sm:mt-6">
              <div className="flex items-center justify-between gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-3">
                <button
                  onClick={() => setIsBannerVisible(false)}
                  className="w-6 h-6 flex items-center justify-center rounded-full text-zinc-400 hover:bg-black/5 transition-colors shrink-0"
                  aria-label="بستن"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6 6 18" /><path d="m6 6 12 12" />
                  </svg>
                </button>

                <p className="flex-1 text-center text-[13px] sm:text-sm font-medium text-amber-900 leading-relaxed">
                  برای تجربه‌ی بهتر، فیلترشکن (VPN) خود را خاموش کنید
                </p>

                <span className="w-5 h-5 rounded-full bg-amber-400 text-white flex items-center justify-center text-[11px] font-bold shrink-0">
                  !
                </span>
              </div>
            </div>
          )}

          {/* لوگو و نام اپ، وسط صفحه */}
          <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6">
            <div className="w-20 h-20 sm:w-24 sm:h-24 relative">
              <Image
                src="/logoo.png"
                alt="زیباوال"
                fill
                sizes="96px"
                className="object-contain"
                priority
              />
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-zinc-900">زیباوال</h1>
          </div>

          {/* نشانگر بارگذاری — سه نقطه‌ی متحرک */}
          <div className="flex items-center justify-center gap-1.5 pb-10 sm:pb-14">
            <span className="w-2 h-2 rounded-full bg-[#824c71] animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-2 h-2 rounded-full bg-[#824c71] animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-2 h-2 rounded-full bg-[#824c71] animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      )}
    </>
  );
}