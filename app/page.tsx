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
  let redirected = false;
  const timeout = setTimeout(() => setChecking(false), 2000); // fail-safe

  try {
    if (Capacitor.isNativePlatform() || isStandaloneMode()) {
      redirected = true;
      window.location.replace('/login'); // ناوبری سخت به‌جای router.replace
      return;
    }
  } catch (err) {
    console.error('خطا در تشخیص پلتفرم:', err);
  }

  if (!redirected) setChecking(false);
  return () => clearTimeout(timeout);
}, [router]);

  // تا وقتی چک انجام نشده چیزی رندر نکن تا لندینگ برای یک لحظه فلش نزنه
  if (checking) return null;

  return <LandingScreen />;
}