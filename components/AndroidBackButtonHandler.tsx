// components/AndroidBackButtonHandler.tsx
//
// روی اندروید، دکمه‌ی بازگشتِ نوار پایین سیستم به‌صورت پیش‌فرض توسط Capacitor
// مدیریت نمی‌شود؛ اگر لیسنری برای رویداد «backButton» ثبت نشده باشد،
// Capacitor مستقیماً اپ را می‌بندد (حتی اگر کاربر چند صفحه داخل اپ جلو رفته
// باشد). این کامپوننت با استفاده از پلاگین @capacitor/app یک لیسنر ثبت
// می‌کند که:
//   ۱) اگر تاریخچه‌ی ناوبری قابل‌برگشت باشد -> یک صفحه به عقب برمی‌گردد
//   ۲) اگر در مسیر اصلی (خانه/لاگین) باشیم -> اپ کمینه (minimize) می‌شود
//      (نه بسته/kill، دقیقاً رفتار استاندارد اندروید)
//
// این کامپوننت چیزی رندر نمی‌کند و فقط باید یک‌بار، بالای درخت اپ
// (مثلاً در app/layout.tsx) mount شود.

'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';

// یک ref ساده که همیشه آخرین مقدار را نگه می‌دارد، بدون اینکه باعث
// re-subscribe شدنِ افکت اصلی شود.
function useLatest<T>(value: T) {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}

// مسیرهایی که در آن‌ها دکمه‌ی بازگشت باید اپ را کمینه کند نه اینکه کاربر را
// جایی خارج از این صفحات ببرد یا اپ را کامل ببندد.
const ROOT_ROUTES = new Set(['/', '/login', '/dashboard']);

export default function AndroidBackButtonHandler() {
  const router = useRouter();
  const pathname = usePathname();

  // چون لیسنر یک‌بار ثبت می‌شود ولی pathname عوض می‌شود، مقدار فعلی را
  // در یک ref نگه می‌داریم تا لیسنر همیشه به آخرین مسیر دسترسی داشته باشد.
  const pathnameRef = useLatest(pathname);

  useEffect(() => {
    let removeListener: (() => void) | undefined;
    let cancelled = false;

    (async () => {
      const { Capacitor } = await import('@capacitor/core');
      if (!Capacitor.isNativePlatform()) return;

      const { App } = await import('@capacitor/app');

      const handle = await App.addListener('backButton', ({ canGoBack }) => {
        const currentPath = pathnameRef.current;

        if (canGoBack && !ROOT_ROUTES.has(currentPath)) {
          router.back();
          return;
        }

        if (!ROOT_ROUTES.has(currentPath)) {
          // اگر تاریخچه خالی بود ولی در یکی از صفحات داخلی هستیم (مثلاً
          // اپ تازه با دیپ‌لینک باز شده)، به‌جای بستن اپ به خانه برگرد.
          router.push('/dashboard');
          return;
        }

        // در صفحه‌ی اصلی هستیم: اپ را کامل نبند، فقط کمینه کن (رفتار عادی
        // اندروید هنگام زدن دکمه‌ی بازگشت در صفحه‌ی خانه‌ی یک اپ).
        App.minimizeApp();
      });

      if (cancelled) {
        handle.remove();
      } else {
        removeListener = () => handle.remove();
      }
    })();

    return () => {
      cancelled = true;
      removeListener?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}