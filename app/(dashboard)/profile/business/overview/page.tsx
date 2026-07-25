// app/(dashboard)/profile/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { User, Phone, LogOut, Store, MessageCircle, ShieldCheck, ChevronLeft, Wallet, AtSign, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const router = useRouter();
  const [userData, setUserData] = useState({ name: '', phone: '', username: '', role: '' });
  const [salonData, setSalonData] = useState<any>(null);
  const [isFetching, setIsFetching] = useState(true);

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
      } finally {
        setIsFetching(false);
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
      description: 'نام، نام کاربری و شماره تماس',
      icon: User,
      href: '/profile/info',
    },
    {
      key: 'business',
      label: salonData ? 'کسب‌وکار من' : 'ثبت کسب‌وکار',
      description: salonData ? 'مشاهده، ویرایش و مدیریت سالن' : 'کسب‌وکار خود را رایگان ثبت کنید',
      icon: salonData ? Store : Sparkles,
      href: salonData ? '/profile/business/overview' : '/profile/business',
      highlight: !salonData,
    },
    {
      key: 'support',
      label: 'پشتیبانی',
      description: 'ارتباط با تیم پشتیبانی زیباوال',
      icon: MessageCircle,
      href: '/profile/support',
    },
    ...(salonData
      ? [
          {
            key: 'accounting',
            label: 'حسابداری',
            description: 'گزارش تراکنش‌ها و درآمد سالن',
            icon: Wallet,
            href: '/profile/accounting',
          },
        ]
      : []),
  ];

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 pb-24">

      {/* هدر */}
      <div className="bg-white px-4 pt-8 pb-6 rounded-b-3xl shadow-sm shadow-zinc-100">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-[#824c71] to-[#6d3f5e] rounded-2xl flex items-center justify-center text-white shrink-0 shadow-md shadow-[#824c71]/25">
              <User className="w-7 h-7" strokeWidth={1.5} />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold text-zinc-900 truncate">
                {isFetching ? 'در حال بارگذاری...' : (userData.name || 'کاربر عزیز')}
              </h1>
              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
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
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-zinc-100 text-zinc-500 hover:bg-red-50 hover:text-red-500 transition-colors shrink-0"
              title="خروج از حساب"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          {userData.role === 'ADMIN' && (
            <Link
              href="/admin/support"
              className="mt-5 flex items-center gap-2 bg-[#824c71] text-white px-4 py-3 rounded-xl text-sm font-medium hover:bg-[#6d3f5e] transition-colors shadow-sm shadow-[#824c71]/20"
            >
              <ShieldCheck className="w-4 h-4" />
              پنل مدیریت پشتیبانی
            </Link>
          )}
        </div>
      </div>

      {/* منو */}
      <div className="max-w-lg mx-auto w-full px-4 mt-5 space-y-3">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.key}
              href={item.href}
              className={`group flex items-center gap-3.5 px-4 py-4 rounded-2xl transition-all ${
                item.highlight
                  ? 'bg-[#824c71]/5 border border-[#824c71]/15 hover:bg-[#824c71]/10'
                  : 'bg-white border border-zinc-100 hover:border-zinc-200 hover:shadow-sm'
              }`}
            >
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                  item.highlight ? 'bg-[#824c71] text-white' : 'bg-zinc-100 text-[#824c71]'
                }`}
              >
                <Icon className="w-5 h-5" strokeWidth={1.5} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-zinc-900">{item.label}</p>
                <p className="text-xs text-zinc-400 mt-0.5 truncate">{item.description}</p>
              </div>
              <ChevronLeft className="w-4 h-4 text-zinc-300 group-hover:-translate-x-0.5 group-hover:text-zinc-400 transition-all shrink-0" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}