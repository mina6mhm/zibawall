// components/business/StartAppointmentButton.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MessageCircle, Loader2 } from 'lucide-react';

export default function StartAppointmentButton({
  salonId,
  className,
}: {
  salonId: string;
  className?: string;
}) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    setIsLoading(true);
    try {
      const meRes = await fetch('/api/auth/me');
      if (!meRes.ok) {
        router.push('/login');
        return;
      }
      const user = await meRes.json();
      if (!user.phone) {
        alert('برای ثبت نوبت آنلاین باید با شماره موبایل وارد شده باشید.');
        return;
      }

      const res = await fetch('/api/appointment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerPhone: user.phone, salonId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'خطا در شروع نوبت‌دهی');

      router.push(`/appointments/${data.appointment.id}`);
    } catch (error: any) {
      alert(error.message || 'خطایی رخ داد.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className={
        className ||
        'w-full bg-[#824c71]/10 hover:bg-[#824c71]/15 text-[#824c71] font-medium py-3 rounded-xl text-center transition flex items-center justify-center gap-2 disabled:opacity-60'
      }
    >
      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />}
      {isLoading ? 'در حال آماده‌سازی...' : 'ثبت نوبت آنلاین'}
    </button>
  );
}