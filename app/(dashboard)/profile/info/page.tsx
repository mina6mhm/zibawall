// app/(dashboard)/profile/info/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { AtSign, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ProfileInfoPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [userData, setUserData] = useState({ name: '', phone: '', username: '' });

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
          });
        } else if (res.status === 401) {
          router.push('/login');
        }
      } catch (error) {
        console.error('خطا در دریافت اطلاعات:', error);
      }
    };
    fetchProfile();
  }, [router]);

  const handleSaveChanges = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: userData.name, username: userData.username })
      });
      if (res.ok) {
        alert('اطلاعات با موفقیت ذخیره شد!');
      } else {
        const errorData = await res.json();
        alert(errorData.error || 'خطا در ذخیره اطلاعات');
      }
    } catch (error) {
      alert('خطای شبکه در ارتباط با سرور');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-white pb-24">
      <div className="max-w-lg mx-auto w-full px-4 pt-6">
        <Link href="/profile" className="inline-flex items-center gap-1 text-sm text-zinc-500 mb-4">
          <ChevronRight className="w-4 h-4" /> بازگشت
        </Link>

        <h1 className="text-base font-bold text-zinc-900 mb-4">اطلاعات کاربری</h1>

        <div className="bg-white border border-zinc-100 rounded-2xl p-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1.5">شماره موبایل</label>
            <input
              value={userData.phone}
              disabled
              dir="ltr"
              className="w-full border border-zinc-100 bg-zinc-50 rounded-xl px-3.5 py-2.5 text-sm text-zinc-400 cursor-not-allowed text-left"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1.5">نام و نام خانوادگی</label>
            <input
              value={userData.name}
              onChange={(e) => setUserData({ ...userData, name: e.target.value })}
              className="w-full border border-zinc-200 rounded-xl px-3.5 py-2.5 text-sm focus:border-[#824c71] focus:ring-2 focus:ring-[#824c71]/10 outline-none transition-all"
              placeholder="نام خود را وارد کنید"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1.5">نام کاربری</label>
            <div className="relative">
              <AtSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                value={userData.username}
                onChange={(e) => setUserData({ ...userData, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                placeholder="username"
                dir="ltr"
                className="w-full border border-zinc-200 rounded-xl px-3.5 py-2.5 pl-10 text-sm text-left focus:border-[#824c71] focus:ring-2 focus:ring-[#824c71]/10 outline-none transition-all"
              />
            </div>
          </div>
          <button
            onClick={handleSaveChanges}
            disabled={isLoading}
            className="w-full bg-[#824c71] text-white py-2.5 rounded-xl text-sm font-medium hover:bg-[#6d3f5e] transition-colors disabled:opacity-50 mt-2"
          >
            {isLoading ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
          </button>
        </div>
      </div>
    </div>
  );
}