// components/SplashScreen.tsx
'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

// مدت زمانی که اسپلش نمایش داده می‌شود (میلی‌ثانیه) — بعد از این مدت با فید محو می‌شود
const SPLASH_DURATION = 1800;
const FADE_DURATION = 350;

// --- تنظیمات تشخیص VPN ---
const VPN_CHECK_URL = 'https://ipapi.co/json/';
const VPN_CACHE_KEY = 'zw:vpn-check';
// اگر VPN تشخیص داده نشد، نتیجه را مدت طولانی کش می‌کنیم (جلوگیری از فشار روی سرویس ثالث)
const VPN_CACHE_TTL_CLEAN = 6 * 60 * 60 * 1000;
// اگر VPN تشخیص داده شد، کش کوتاه است تا بعد از خاموش کردن فیلترشکن بنر زود برطرف شود
const VPN_CACHE_TTL_VPN = 60 * 1000;
const VPN_FETCH_TIMEOUT = 3000;
const VPN_BANNER_DISMISSED_KEY = 'zw:vpn-banner-dismissed';
const VPN_BANNER_AUTOHIDE = 8000;

function readVpnCache(): boolean | null {
  try {
    const raw = localStorage.getItem(VPN_CACHE_KEY);
    if (!raw) return null;
    const { vpn, at } = JSON.parse(raw);
    if (typeof vpn !== 'boolean' || typeof at !== 'number') return null;
    const ttl = vpn ? VPN_CACHE_TTL_VPN : VPN_CACHE_TTL_CLEAN;
    return Date.now() - at < ttl ? vpn : null;
  } catch {
    return null;
  }
}

function writeVpnCache(vpn: boolean) {
  try {
    localStorage.setItem(VPN_CACHE_KEY, JSON.stringify({ vpn, at: Date.now() }));
  } catch {}
}

function wasBannerDismissed() {
  try {
    return sessionStorage.getItem(VPN_BANNER_DISMISSED_KEY) === '1';
  } catch {
    return false;
  }
}

export default function SplashScreen({ children }: { children: React.ReactNode }) {
  const [isVisible, setIsVisible] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [isBannerVisible, setIsBannerVisible] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setIsFadingOut(true), SPLASH_DURATION);
    const removeTimer = setTimeout(() => setIsVisible(false), SPLASH_DURATION + FADE_DURATION);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  // رنگ status bar از تگ theme-color گرفته می‌شود
  useEffect(() => {
    let meta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'theme-color');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', isVisible ? '#824c71' : '#ffffff');
  }, [isVisible]);

  // تشخیص VPN:
  // - نتیجه کش می‌شود (هر بازکردن اپ یک درخواست به سرویس ثالث نمی‌رود)
  // - تایم‌اوت دارد (اگر سرویس کند/بلاک بود، اپ معطل نمی‌ماند)
  // - بنر جدا از اسپلش است، چون درخواست معمولاً بعد از ۱.۸ ثانیه تموم می‌شد و بنر هیچ‌وقت دیده نمی‌شد
  useEffect(() => {
    if (wasBannerDismissed()) return;

    const cached = readVpnCache();
    if (cached !== null) {
      if (cached) setIsBannerVisible(true);
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), VPN_FETCH_TIMEOUT);

    fetch(VPN_CHECK_URL, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error('bad status');
        return res.json();
      })
      .then((data) => {
        if (!data?.country_code) return; // مثلاً rate limit شده؛ چیزی کش نمی‌کنیم
        const vpn = data.country_code !== 'IR';
        writeVpnCache(vpn);
        if (vpn) setIsBannerVisible(true);
      })
      .catch(() => {
        // خطا/تایم‌اوت: بنر مخفی می‌ماند
      })
      .finally(() => clearTimeout(timeout));

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, []);

  const dismissBanner = () => {
    setIsBannerVisible(false);
    try {
      sessionStorage.setItem(VPN_BANNER_DISMISSED_KEY, '1');
    } catch {}
  };

  // بنر خودش بعد از چند ثانیه بسته می‌شود
  useEffect(() => {
    if (!isBannerVisible) return;
    const t = setTimeout(() => setIsBannerVisible(false), VPN_BANNER_AUTOHIDE);
    return () => clearTimeout(t);
  }, [isBannerVisible]);

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

      {/* بنر هشدار VPN — روی اسپلش و بعد از آن نمایش داده می‌شود */}
      {isBannerVisible && (
        <div
          className="fixed inset-x-0 z-[10000] px-4 sm:px-6"
          style={{ top: 'max(1rem, env(safe-area-inset-top))' }}
          dir="rtl"
        >
          <div className="flex items-center justify-between gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-3 shadow-sm">
            <span className="w-5 h-5 rounded-full bg-amber-400 text-white flex items-center justify-center text-[11px] font-bold shrink-0">
              !
            </span>

            <p className="flex-1 text-center text-[13px] sm:text-sm font-medium text-amber-900 leading-relaxed">
              برای تجربه‌ی بهتر، فیلترشکن (VPN) خود را خاموش کنید
            </p>

            <button
              type="button"
              onClick={dismissBanner}
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
    </>
  );
}