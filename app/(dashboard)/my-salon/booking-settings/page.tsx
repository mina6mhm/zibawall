// app/(dashboard)/my-salon/booking-settings/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, Loader2, Store, CalendarClock, Settings2 } from 'lucide-react';

export default function BookingSettingsPage() {
  const router = useRouter();

  const [hasSalon, setHasSalon] = useState<boolean | null>(null);
  const [salonName, setSalonName] = useState('');
  const [bookingEnabled, setBookingEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/user/profile');
      if (!res.ok) {
        if (res.status === 401) router.push('/login');
        return;
      }
      const data = await res.json();
      if (!data.salon) {
        setHasSalon(false);
        return;
      }
      setHasSalon(true);
      setSalonName(data.salon.name);
      setBookingEnabled(!!data.salon.bookingEnabled);
    } catch (error) {
      console.error('خطا در دریافت اطلاعات:', error);
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleToggle = async () => {
    setIsSaving(true);
    const newValue = !bookingEnabled;
    try {
      const res = await fetch('/api/salon/booking-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingEnabled: newValue }),
      });
      if (res.ok) {
        setBookingEnabled(newValue);
      } else {
        const data = await res.json();
        alert(data.error || 'خطا در ذخیره تنظیمات');
      }
    } catch {
      alert('خطای ارتباط با سرور');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 text-[#824c71] animate-spin mb-4" />
        <p className="text-zinc-500 font-medium text-sm">در حال دریافت اطلاعات...</p>
      </div>
    );
  }

  if (hasSalon === false) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center gap-4">
        <Store className="w-12 h-12 text-zinc-300" />
        <p className="text-zinc-600 font-medium">شما هنوز کسب‌وکاری ثبت نکرده‌اید.</p>
        <Link
          href="/profile/business"
          className="bg-[#824c71] text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-[#6e3f60] transition"
        >
          ثبت نام کسب‌وکار
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto pt-8 pb-32 px-4 md:pt-10 md:px-0">
      <div className="flex items-center gap-3 mb-7">
        <Link
          href="/my-salon"
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-zinc-100 text-zinc-600 hover:bg-zinc-200 transition-colors shrink-0"
        >
          <ArrowRight className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-zinc-900">تنظیمات نوبت‌دهی آنلاین</h1>
          <p className="text-zinc-500 text-xs md:text-sm mt-0.5">{salonName}</p>
        </div>
      </div>

      {/* کارت وضعیت فعال/غیرفعال */}
      <div className="bg-white border border-zinc-100 rounded-2xl p-5 shadow-sm shadow-zinc-200/50 mb-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${bookingEnabled ? 'bg-[#824c71]/10 text-[#824c71]' : 'bg-zinc-100 text-zinc-400'}`}>
              <CalendarClock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-zinc-900">نوبت‌دهی آنلاین</p>
              <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">
                {bookingEnabled
                  ? 'مشتریان می‌توانند از صفحه سالن شما نوبت بگیرند.'
                  : 'در حال حاضر غیرفعال است. مشتریان نمی‌توانند نوبت آنلاین بگیرند.'}
              </p>
            </div>
          </div>
          
<button
  onClick={handleToggle}
  disabled={isSaving}
  className="shrink-0 disabled:opacity-50"
  aria-label={bookingEnabled ? 'غیرفعال کردن نوبت‌دهی' : 'فعال کردن نوبت‌دهی'}
>
  {isSaving ? (
    <Loader2 className="w-5 h-5 text-[#824c71] animate-spin" />
  ) : (
    <div className={`relative w-14 h-7 rounded-full transition-colors duration-300 ${
      bookingEnabled ? 'bg-[#824c71]' : 'bg-zinc-200'
    }`}>
      <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-sm transition-all duration-300 ${
        bookingEnabled ? 'right-1' : 'right-8'
      }`} />
    </div>
  )}
</button>
        </div>

        {bookingEnabled && (
          <div className="mt-4 pt-4 border-t border-zinc-100">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span className="text-xs font-medium text-emerald-600">نوبت‌دهی آنلاین فعال است</span>
            </div>
          </div>
        )}
      </div>

      {/* بخش تنظیمات بیشتر — فعلاً placeholder */}
      <div className="bg-zinc-50 border border-zinc-100 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Settings2 className="w-4 h-4 text-zinc-400" />
          <span className="text-sm font-bold text-zinc-600">تنظیمات بیشتر</span>
        </div>
        <p className="text-xs text-zinc-400 leading-relaxed">
          به زودی امکاناتی مثل تعریف ساعت‌های خالی، مدیریت ظرفیت، و تأیید خودکار نوبت‌ها اضافه می‌شود.
        </p>
      </div>
    </div>
  );
}