// app/(dashboard)/profile/business/overview/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Store, Eye, Edit, Trash2, ArrowRight, Loader2, MapPin, ChevronLeft } from 'lucide-react';
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
    if (!window.confirm('آیا از حذف کامل کسب‌وکار خود مطمئن هستید؟ این عمل غیرقابل بازگشت است.')) return;
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
      <div className="flex flex-col items-center justify-center min-h-[60vh] bg-white">
        <Loader2 className="w-10 h-10 text-[#824c71] animate-spin mb-4" />
        <p className="text-zinc-500 font-medium text-sm">در حال دریافت اطلاعات...</p>
      </div>
    );
  }

  if (!salonData) return null;

  const actions = [
    {
      key: 'view',
      label: 'مشاهده صفحه عمومی',
      description: 'همان چیزی که مشتری‌ها می‌بینند',
      icon: Eye,
      href: `/salon/${salonData.id}`,
      variant: 'primary' as const,
    },
    {
      key: 'edit',
      label: 'ویرایش اطلاعات',
      description: 'خدمات، تصاویر و مشخصات سالن',
      icon: Edit,
      href: '/profile/business/edit',
      variant: 'default' as const,
    },
    {
      key: 'delete',
      label: 'حذف کسب‌وکار',
      description: 'این عمل غیرقابل بازگشت است',
      icon: Trash2,
      onClick: handleDeleteBusiness,
      variant: 'danger' as const,
    },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-white pb-24">
      <div className="max-w-lg mx-auto w-full px-4 pt-6">

        <Link href="/profile" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-700 transition-colors mb-5">
          <ArrowRight className="w-4 h-4" /> بازگشت
        </Link>

        {/* کارت سالن */}
        <div className="bg-gradient-to-br from-[#824c71] to-[#6d3f5e] rounded-3xl p-5 shadow-lg shadow-[#824c71]/20 mb-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/15 backdrop-blur rounded-2xl flex items-center justify-center shrink-0 border border-white/20">
              <Store className="w-6 h-6 text-white" strokeWidth={1.5} />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-white font-bold text-base truncate">{salonData.name}</h1>
              <p className="text-white/70 text-xs flex items-center gap-1 mt-1">
                <MapPin className="w-3 h-3" />
                {salonData.province}، {salonData.city}
              </p>
            </div>
          </div>
        </div>

        {/* اکشن‌ها */}
        <div className="space-y-2.5">
          {actions.map((action) => {
            const Icon = action.icon;

            const iconBox = (
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  action.variant === 'primary'
                    ? 'bg-[#824c71]/10 text-[#824c71]'
                    : action.variant === 'danger'
                    ? 'bg-red-50 text-red-500'
                    : 'bg-zinc-100 text-zinc-600'
                }`}
              >
                <Icon className="w-4.5 h-4.5" strokeWidth={1.75} />
              </div>
            );

            const textBlock = (
              <div className="flex-1 min-w-0 text-right">
                <p className={`text-sm font-bold ${action.variant === 'danger' ? 'text-red-600' : 'text-zinc-900'}`}>
                  {action.label}
                </p>
                <p className={`text-xs mt-0.5 truncate ${action.variant === 'danger' ? 'text-red-400' : 'text-zinc-400'}`}>
                  {action.description}
                </p>
              </div>
            );

            const baseClass = `group w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl bg-white border transition-all text-right ${
              action.variant === 'danger'
                ? 'border-zinc-100 hover:border-red-200 hover:bg-red-50/50'
                : 'border-zinc-100 hover:border-zinc-200 hover:shadow-sm'
            }`;

            if (action.href) {
              return (
                <Link key={action.key} href={action.href} className={baseClass}>
                  {iconBox}
                  {textBlock}
                  <ChevronLeft className="w-4 h-4 text-zinc-300 group-hover:-translate-x-0.5 transition-transform shrink-0" />
                </Link>
              );
            }

            return (
              <button
                key={action.key}
                onClick={action.onClick}
                disabled={isLoading}
                className={`${baseClass} disabled:opacity-50`}
              >
                {iconBox}
                {textBlock}
                {isLoading ? (
                  <Loader2 className="w-4 h-4 text-red-400 animate-spin shrink-0" />
                ) : (
                  <ChevronLeft className="w-4 h-4 text-red-200 group-hover:-translate-x-0.5 transition-transform shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}