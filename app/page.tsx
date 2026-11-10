// app/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import LandingScreen from '@/components/LandingScreen';

const isStandaloneMode = () => {
  if (typeof window === 'undefined') return false;
  return (
    (window.navigator as any).standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches
  );
};

export default function RootPage() {
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let shouldRedirect = false;

    try {
      shouldRedirect = Capacitor.isNativePlatform() || isStandaloneMode();
    } catch (err) {
      console.error('خطا در تشخیص پلتفرم:', err);
    }

    if (!shouldRedirect) {
      setChecking(false);
      return;
    }

    // ناوبری سخت به‌جای router.replace
    window.location.replace('/login');

    // فقط اگر به هر دلیلی ناوبری انجام نشد، لندینگ را نشان بده تا کاربر روی صفحه‌ی خالی گیر نکند
    const failSafe = setTimeout(() => setChecking(false), 5000);
    return () => clearTimeout(failSafe);
  }, []);

  // لندینگ همیشه در HTML سمت سرور وجود دارد (برای سئو و سرعت نمایش)،
  // ولی تا وقتی چک پلتفرم انجام نشده مخفی می‌ماند تا برای کاربر اپ فلش نزند.
  return (
    <div className={checking ? 'contents invisible' : 'contents'}>
      <LandingScreen />
    </div>
  );
}