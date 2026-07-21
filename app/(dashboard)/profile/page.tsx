// app/(dashboard)/profile/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { User, Phone, LogOut, Store, Sparkles, Eye, Edit, AtSign, Trash2, MessageCircle, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import SupportPanel from '@/components/support/SupportPanel';

export default function ProfilePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'info' | 'business' | 'support'>('info');
  const [isLoading, setIsLoading] = useState(false);
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

  const handleDeleteBusiness = async () => {
    if (!window.confirm('آیا از حذف کامل کسب‌وکار خود مطمئن هستید؟')) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/salon?id=${salonData.id}`, { method: 'DELETE' });
      if (res.ok) {
        alert('کسب‌وکار شما با موفقیت حذف شد.');
        setSalonData(null);
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

  const handleLogout = async () => {
    if (!window.confirm('آیا می‌خواهید از حساب خود خارج شوید؟')) return;
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {}
    router.push('/login');
    router.refresh();
  };

  const tabs = [
    { key: 'info', label: 'اطلاعات', icon: User },
    { key: 'business', label: salonData ? 'کسب‌وکار' : 'ثبت کسب‌وکار', icon: Store },
    { key: 'support', label: 'پشتیبانی', icon: MessageCircle },
  ] as const;

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

          {/* لینک ادمین */}
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

      {/* تب‌ها */}
      <div className="bg-white border-b border-zinc-100 px-4 mt-0.5">
        <div className="max-w-lg mx-auto flex">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === key
                  ? 'border-[#824c71] text-[#824c71]'
                  : 'border-transparent text-zinc-400'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* محتوا */}
      <div className="max-w-lg mx-auto w-full px-4 mt-4">

        {/* تب اطلاعات */}
        {activeTab === 'info' && (
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
                onChange={(e) => setUserData({...userData, name: e.target.value})}
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
                  onChange={(e) => setUserData({...userData, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '')})}
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
        )}

        {/* تب کسب‌وکار */}
        {activeTab === 'business' && (
          <div className="bg-white border border-zinc-100 rounded-2xl p-4">
            {salonData ? (
              <div className="space-y-4">
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
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-zinc-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Store className="w-8 h-8 text-[#824c71]" strokeWidth={1.5} />
                </div>
                <h2 className="text-base font-bold mb-2 text-zinc-800">مدیر سالن زیبایی هستید؟</h2>
                <p className="text-sm text-[#824c71] mb-6 leading-relaxed">کسب‌وکار خود را رایگان ثبت کنید</p>
                <Link
                  href="/profile/business"
                  className="bg-[#824c71] text-white px-6 py-2.5 rounded-xl inline-flex items-center gap-2 text-sm font-medium hover:bg-[#6d3f5e] transition-colors"
                >
                  <Sparkles className="w-4 h-4" /> شروع ثبت‌نام کسب‌وکار
                </Link>
              </div>
            )}
          </div>
        )}

        {/* تب پشتیبانی */}
        {activeTab === 'support' && <SupportPanel />}
      </div>
    </div>
  );
}