// lib/useBrowserReturn.ts
//
// روی اپ‌های نیتیو، پرداخت با مرورگر سیستم (@capacitor/browser) باز می‌شود
// (به lib/openPaymentUrl.ts نگاه کنید). وقتی کاربر پرداخت را انجام داد و آن
// مرورگر را می‌بندد/برمی‌گردد، این هوک صدا زده می‌شود تا صفحه‌ی خودِ اپ
// (که سشنِ لاگینش دست‌نخورده باقی مانده) دیتای تازه بگیرد — بدون این‌که کاربر
// نیاز به لاگین دوباره داشته باشد.

import { useEffect, useRef } from 'react';

export function useOnBrowserReturn(onReturn: () => void) {
  const onReturnRef = useRef(onReturn);
  onReturnRef.current = onReturn;

  useEffect(() => {
    let removeListener: (() => void) | undefined;
    let cancelled = false;

    (async () => {
      const { Capacitor } = await import('@capacitor/core');
      if (!Capacitor.isNativePlatform()) return;

      const { Browser } = await import('@capacitor/browser');
      const handle = await Browser.addListener('browserFinished', () => {
        onReturnRef.current();
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
  }, []);
}
