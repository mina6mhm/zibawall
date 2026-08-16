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
  // بنر هشدار VPN — پیش‌فرض مخفی؛ فقط وقتی فیلترشکن روشن تشخیص داده بشه ظاهر می‌شه
  const [isBannerVisible, setIsBannerVisible] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setIsFadingOut(true), SPLASH_DURATION);
    const removeTimer = setTimeout(() => setIsVisible(false), SPLASH_DURATION + FADE_DURATION);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  // نوار وضعیت بالای گوشی (status bar) رنگش رو از تگ theme-color می‌گیره، نه از
  // پس‌زمینه‌ی داخل صفحه — پس تا وقتی اسپلش نمایشه این تگ رو موقتاً بنفش می‌کنیم
  // و بعد از پایان اسپلش به رنگ عادی اپ (سفید) برش می‌گردونیم
  useEffect(() => {
    let meta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'theme-color');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', isVisible ? '#824c71' : '#ffffff');
  }, [isVisible]);

  // تشخیص روشن بودن فیلترشکن: IP کاربر رو می‌گیریم — اگه کشور خارج از ایران بود
  // یعنی احتمالاً از طریق VPN وصل شده، پس بنر هشدار رو نشون می‌دیم
  useEffect(() => {
    let cancelled = false;
    fetch('https://ipapi.co/json/')
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data?.country_code && data.country_code !== 'IR') {
          setIsBannerVisible(true);
        }
      })
      .catch(() => {
        // در صورت خطا (مثلاً عدم دسترسی به سرویس) بنر همون مخفی می‌مونه
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      {children}

      {isVisible && (
        <div
          className="fixed inset-0 z-[9999] flex flex-col bg-[#824c71] transition-opacity ease-out"
          style={{
            opacity: isFadingOut ? 0 : 1,
            transitionDuration: `${FADE_DURATION}ms`,
          }}
          dir="rtl"
        >
          {/* بنر هشدار VPN — فقط وقتی فیلترشکن روشن تشخیص داده بشه */}
          {isBannerVisible && (
            <div className="mx-4 mt-4 sm:mx-6 sm:mt-6">
              <div className="flex items-center justify-between gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-3">
                <span className="w-5 h-5 rounded-full bg-amber-400 text-white flex items-center justify-center text-[11px] font-bold shrink-0">
                  !
                </span>

                <p className="flex-1 text-center text-[13px] sm:text-sm font-medium text-amber-900 leading-relaxed">
                  برای تجربه‌ی بهتر، فیلترشکن (VPN) خود را خاموش کنید
                </p>

                <button
                  onClick={() => setIsBannerVisible(false)}
                  className="w-6 h-6 flex items-center justify-center rounded-full text-zinc-400 hover:bg-black/5 transition-colors shrink-0"
                  aria-label="بستن"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6 6 18" /><path d="m6 6 12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* لوگو، بزرگ و سفید، وسط صفحه */}
          <div className="flex-1 flex flex-col items-center justify-center px-6">
            <div className="w-36 h-36 sm:w-44 sm:h-44 relative">
              <Image
                src="/logoo.png"
                alt="زیباوال"
                fill
                sizes="176px"
                className="object-contain brightness-0 invert"
                priority
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}