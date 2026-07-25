// app/(dashboard)/profile/business/overview/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Store, Eye, Edit, Trash2, ArrowRight, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function BusinessOverviewPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [salonData, setSalonData] = useState<any>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch('/api/user/profile');
        if (res.ok) {
          const data = await res.json();
          if (!data.salon) {
            router.push('/profile/business');
            return;
          }
          setSalonData(data.salon);
        } else if (res.status === 401) {
          router.push('/login');
        }
      } catch (error) {
        console.error('خطا در دریافت اطلاعات:', error);
      } finally {
        setIsFetching(false);
      }
    };
    fetchProfile();
  }, [router]);

  const handleDeleteBusiness = async () => {
    if (!window.confirm('آیا از حذف کامل کسب‌وکار خود مطمئن هستید؟')) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/salon?id=${salonData.id}`, { method: 'DELETE' });
      if (res.ok) {
        alert('کسب‌وکار شما با موفقیت حذف شد.');
        router.push('/profile');
      } else {
        const errorData = await res.json();
        alert(errorData.error || 'خطا در حذف');
      }
    } catch {
      alert('خطای شبکه');
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 text-[#824c71] animate-spin mb-4" />
        <p className="text-zinc-600 font-medium text-sm">در حال دریافت اطلاعات...</p>
      </div>
    );
  }

  if (!salonData) return null;

  return (
    <div className="flex flex-col min-h-screen bg-white pb-24">
      <div className="max-w-lg mx-auto w-full px-4 pt-6">
        <Link href="/profile" className="inline-flex items-center gap-1 text-sm text-zinc-500 mb-4">
          <ArrowRight className="w-4 h-4" /> بازگشت
        </Link>

        <h1 className="text-base font-bold text-zinc-900 mb-4">کسب‌وکار من</h1>

        <div className="bg-white border border-zinc-100 rounded-2xl p-4 space-y-4">
          <div className="flex items-center gap-3 p-3 bg-zinc-50 rounded-xl">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-zinc-200 shrink-0">
              <Store className="w-5 h-5 text-[#824c71]" strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="font-bold text-zinc-900 text-sm">{salonData.name}</h3>
              <p className="text-xs text-zinc-500 mt-0.5">{salonData.province}، {salonData.city}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Link
              href={`/salon/${salonData.id}`}
              className="flex flex-col items-center gap-1.5 bg-[#824c71] text-white rounded-xl py-3 text-xs font-medium hover:bg-[#6d3f5e] transition-colors"
            >
              <Eye className="w-4 h-4" /> مشاهده
            </Link>
            <Link
              href="/profile/business/edit"
              className="flex flex-col items-center gap-1.5 bg-zinc-100 text-zinc-700 rounded-xl py-3 text-xs font-medium hover:bg-zinc-200 transition-colors"
            >
              <Edit className="w-4 h-4" /> ویرایش
            </Link>
            <button
              onClick={handleDeleteBusiness}
              disabled={isLoading}
              className="flex flex-col items-center gap-1.5 bg-red-50 text-red-500 rounded-xl py-3 text-xs font-medium hover:bg-red-100 transition-colors"
            >
              <Trash2 className="w-4 h-4" /> حذف
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}