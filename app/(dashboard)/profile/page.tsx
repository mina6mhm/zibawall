// app/(dashboard)/profile/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { User, Phone, LogOut, Store, MessageCircle, ShieldCheck, ChevronLeft, Wallet, AtSign } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const router = useRouter();
  const [userData, setUserData] = useState({ name: '', phone: '', username: '', role: '' });
  const [salonData, setSalonData] = useState<any>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch('/api/user/profile');
        if (res.ok) {
          const data = await res.json();
          setUserData({
            name: data.name || '',
            phone: data.phone || '',
            username: data.username || '',
            role: data.role || 'USER'
          });
          setSalonData(data.salon);
        } else if (res.status === 401) {
          router.push('/login');
        }
      } catch (error) {
        console.error('خطا در دریافت اطلاعات:', error);
      }
    };
    fetchProfile();
  }, [router]);

  const handleLogout = async () => {
    if (!window.confirm('آیا می‌خواهید از حساب خود خارج شوید؟')) return;
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {}
    router.push('/login');
    router.refresh();
  };

  const menuItems = [
    {
      key: 'info',
      label: 'اطلاعات کاربری',
      icon: User,
      href: '/profile/info',
    },
    {
  key: 'business',
  label: salonData ? 'کسب‌وکار من' : 'ثبت کسب‌وکار',
  icon: Store,
  href: salonData ? '/profile/business/overview' : '/profile/business',
},
    {
      key: 'support',
      label: 'پشتیبانی',
      icon: MessageCircle,
      href: '/profile/support',
    },
    ...(salonData
      ? [
          {
            key: 'accounting',
            label: 'حسابداری',
            icon: Wallet,
            href: '/profile/accounting',
          },
        ]
      : []),
  ];

  return (
    <div className="flex flex-col min-h-screen bg-white pb-24">

      {/* هدر */}
      <div className="bg-white px-4 pt-6 pb-4">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-zinc-100 rounded-2xl flex items-center justify-center text-[#824c71] shrink-0">
              <User className="w-7 h-7" strokeWidth={1.5} />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-bold text-zinc-900 truncate">{userData.name || 'کاربر عزیز'}</h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {userData.username && (
                  <span className="text-zinc-500 text-xs font-medium flex items-center gap-1">
                    <AtSign className="w-3 h-3" />{userData.username}
                  </span>
                )}
                {userData.phone && (
                  <span className="text-zinc-400 text-xs flex items-center gap-1" dir="ltr">
                    <Phone className="w-3 h-3" />{userData.phone}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-zinc-100 text-zinc-500 hover:bg-zinc-200 transition-colors shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          {userData.role === 'ADMIN' && (
            <Link
              href="/admin/support"
              className="mt-4 flex items-center gap-2 bg-[#824c71] text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-[#6d3f5e] transition-colors"
            >
              <ShieldCheck className="w-4 h-4" />
              پنل مدیریت پشتیبانی
            </Link>
          )}
        </div>
      </div>

      {/* منوی ردیفی: همه به صفحه جدید میرن */}
      <div className="max-w-lg mx-auto w-full px-4 mt-1 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.key}
              href={item.href}
              className="flex items-center justify-between gap-2 bg-white border border-zinc-100 px-4 py-3 rounded-xl text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
            >
              <span className="flex items-center gap-2">
                <Icon className="w-4 h-4 text-[#824c71]" />
                {item.label}
              </span>
              <ChevronLeft className="w-4 h-4 text-zinc-400" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}