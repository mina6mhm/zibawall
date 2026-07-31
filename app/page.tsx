// app/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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
    // اگه کاربر قبلاً اپ رو نصب کرده و از حالت standalone باز کرده،
    // دیگه هیچ‌وقت لندینگ رو نبینه و مستقیم بره صفحه‌ی ورود
    // (میدل‌ور خودش اگه توکن معتبر باشه، از /login به /dashboard هدایت می‌کنه)
    if (isStandaloneMode()) {
      router.replace('/login');
      return;
    }
    setChecking(false);
  }, [router]);

  // تا وقتی چک standalone انجام نشده چیزی رندر نکن تا لندینگ برای یک لحظه فلش نزنه
  if (checking) return null;

  return <LandingScreen />;
}