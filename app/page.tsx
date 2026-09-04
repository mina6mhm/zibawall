// app/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Capacitor } from '@capacitor/core';
import LandingScreen from '@/components/LandingScreen';

const isStandaloneMode = () => {
  if (typeof window === 'undefined') return false;
  return (
    // @ts-ignore
    ('standalone' in window.navigator && window.navigator.standalone) ||
    window.matchMedia('(display-mode: standalone)').matches
  );
};

export default function RootPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // اگه داخل اپ اندروید/iOS (Capacitor) هستیم، یا کاربر اپ رو به‌صورت PWA
    // نصب کرده و standalone بازش کرده، لندینگ اصلاً دیده نشه — مستقیم بره صفحه‌ی ورود
    // (میدل‌ور خودش اگه توکن معتبر باشه، از /login به /dashboard هدایت می‌کنه)
    // این چک تو try/catch گذاشته شده چون اگه isNativePlatform به هر دلیلی خطا بده،
    // نباید صفحه برای همیشه سفید بمونه (checking هیچ‌وقت false نشه)
    try {
      if (Capacitor.isNativePlatform() || isStandaloneMode()) {
        router.replace('/login');
        return;
      }
    } catch (err) {
      console.error('خطا در تشخیص پلتفرم:', err);
    }
    setChecking(false);
  }, [router]);

  // تا وقتی چک انجام نشده چیزی رندر نکن تا لندینگ برای یک لحظه فلش نزنه
  if (checking) return null;

  return <LandingScreen />;
}