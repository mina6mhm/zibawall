// components/support/SupportBell.tsx
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell } from 'lucide-react';

const POLL_INTERVAL = 60_000;      // فاصله‌ی پایه‌ی پول
const MAX_BACKOFF = 5 * 60_000;    // سقف فاصله هنگام خطای متوالی
const FETCH_TIMEOUT = 10_000;      // اگر درخواست معلق ماند، لغو و دوباره زمان‌بندی می‌شود

export default function SupportBell({ href = '/profile/support' }: { href?: string }) {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let controller: AbortController | null = null;
    let stopped = false;      // unmount شده
    let authBlocked = false;  // کاربر لاگین نیست؛ با برگشتن به اپ دوباره امتحان می‌شود
    let failures = 0;

    const schedule = () => {
      if (stopped || authBlocked) return;
      // backoff نمایی هنگام خطا + jitter تا هزاران کاربر هم‌زمان درخواست نزنند
      const base = Math.min(POLL_INTERVAL * 2 ** failures, MAX_BACKOFF);
      const delay = base * (0.8 + Math.random() * 0.4);
      timer = setTimeout(tick, delay);
    };

    const tick = async () => {
      if (stopped) return;
      // وقتی تب/اپ در پس‌زمینه است پول نمی‌کنیم؛ با برگشتن، visibilitychange دوباره شروع می‌کند
      if (document.visibilityState !== 'visible') return;

      const ctrl = new AbortController();
      controller = ctrl;
      let timedOut = false;
      // بدون تایم‌اوت، روی اینترنت ضعیف یک درخواست معلق کل زنجیره‌ی پول را برای همیشه می‌ایستاند
      const timeoutId = setTimeout(() => {
        timedOut = true;
        ctrl.abort();
      }, FETCH_TIMEOUT);

      try {
        const res = await fetch('/api/support/mine', {
          signal: ctrl.signal,
          cache: 'no-store',
        });

        if (res.status === 401 || res.status === 403) {
          // کاربر لاگین نیست؛ پول بی‌فایده است (با برگشتن به اپ دوباره امتحان می‌شود)
          authBlocked = true;
          return;
        }

        if (res.ok) {
          const data = await res.json();
          setUnreadCount(Number(data.unreadCount) || 0);
          failures = 0;
        } else {
          failures += 1;
        }
      } catch (error) {
        // لغو عمدی (پس‌زمینه رفتن/unmount) -> زمان‌بندی نمی‌کنیم؛ تایم‌اوت -> خطا حساب می‌شود
        if ((error as Error)?.name === 'AbortError' && !timedOut) return;
        failures += 1;
      } finally {
        clearTimeout(timeoutId);
      }
      schedule();
    };

    const onVisibilityChange = () => {
      if (timer) clearTimeout(timer);
      if (document.visibilityState === 'visible') {
        // اگر درخواست قبلی هنوز در جریان بود، لغوش می‌کنیم تا دو زنجیره‌ی پول هم‌زمان نداشته باشیم
        controller?.abort();
        authBlocked = false;
        tick();
      } else {
        controller?.abort();
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    tick();

    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      controller?.abort();
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  return (
    <Link
      href={href}
      className="relative w-10 h-10 flex items-center justify-center rounded-full bg-zinc-100 text-[#824c71] hover:bg-zinc-200 transition-all shrink-0"
      aria-label="پیام‌های پشتیبانی"
    >
      <Bell className="w-5 h-5" strokeWidth={1.5} />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 h-[18px] min-w-[18px] px-1 bg-[#824c71] text-white text-[10px] font-medium rounded-full flex items-center justify-center border-2 border-white">
          {unreadCount > 9 ? '۹+' : unreadCount.toLocaleString('fa-IR')}
        </span>
      )}
    </Link>
  );
}