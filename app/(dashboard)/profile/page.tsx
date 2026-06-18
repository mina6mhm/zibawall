'use client';

import React, { useState, useEffect } from 'react';
import { User, Phone, LogOut, Store, Sparkles, Eye, Edit, AtSign, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'info' | 'settings' | 'business'>('info');
  const [isLoading, setIsLoading] = useState(false);
  
  const [userData, setUserData] = useState({ name: '', phone: '', username: '' });
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
            username: data.username || ''
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
        body: JSON.stringify({
          name: userData.name,
          username: userData.username,
        })
      });

      if (res.ok) {
        alert('اطلاعات با موفقیت ذخیره شد!');
      } else {
        const errorData = await res.json();
        alert(errorData.error || 'خطا در ذخیره اطلاعات (شاید این نام کاربری قبلا ثبت شده باشد)');
      }
    } catch (error) {
      console.error(error);
      alert('خطای شبکه در ارتباط با سرور');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteBusiness = async () => {
    const isConfirmed = window.confirm('آیا از حذف کامل کسب‌وکار خود مطمئن هستید؟ این عملیات غیرقابل بازگشت است.');
    
    if (!isConfirmed) return;

    setIsLoading(true);
    try {
      const res = await fetch(`/api/salon?id=${salonData.id || salonData._id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        alert('کسب‌وکار شما با موفقیت حذف شد.');
        setSalonData(null); 
      } else {
        const text = await res.text();
        try {
          const errorData = text ? JSON.parse(text) : {};
          alert(errorData.error || `خطا در حذف کسب‌وکار (کد: ${res.status})`);
        } catch (e) {
          alert(`خطای ناشناخته در حذف کسب‌وکار (کد: ${res.status})`);
        }
      }
    } catch (error) {
      console.error('خطا در حذف:', error);
      alert('خطای شبکه در ارتباط با سرور');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    const isConfirmed = window.confirm('آیا مطمئن هستید که می‌خواهید از حساب خود خارج شوید؟');
    if (isConfirmed) {
      localStorage.removeItem('user');
      
      try {
        await fetch('/api/auth/logout', { method: 'POST' });
      } catch (error) {
        console.error('Logout failed:', error);
      }
      
      router.push('/login'); 
      router.refresh();
    }
  };

  const hasBusiness = !!salonData;
  const inputBaseClasses =
    "w-full border border-zinc-200 bg-zinc-50/50 rounded-xl md:rounded-2xl px-3 md:px-4 py-2.5 md:py-3 text-sm md:text-base focus:bg-white focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100 outline-none transition-all";

  return (
    <div className="flex flex-col min-h-screen bg-white pb-24">
      
      {/* HEADER */}
      <div className="bg-white border-b border-zinc-100 px-4 py-4 md:py-10">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center gap-3 md:gap-5">
          
          <div className="w-16 h-16 md:w-24 md:h-24 bg-zinc-50 rounded-full flex items-center justify-center text-zinc-400 border border-zinc-100">
            <User className="w-8 h-8 md:w-10 md:h-10" strokeWidth={1.5} />
          </div>

          <div className="text-center md:text-right flex-1">
            <h1 className="text-lg md:text-2xl font-bold text-zinc-900 mb-2">
              {userData.name || 'کاربر عزیز'}
            </h1>

            <div className="flex flex-wrap items-center gap-2 justify-center md:justify-start">
              
              {userData.username && (
                <span className="text-rose-600 text-xs md:text-sm font-medium dir-ltr flex items-center gap-1 bg-rose-50 px-2 py-1 rounded-lg">
                  <AtSign className="w-3.5 h-3.5" /> {userData.username}
                </span>
              )}

              {userData.phone && (
                <span className="text-zinc-600 text-xs md:text-sm dir-ltr flex items-center gap-1 bg-zinc-50 px-2 py-1 rounded-lg">
                  <Phone className="w-3.5 h-3.5" /> {userData.phone}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* BODY */}
      <div className="max-w-4xl mx-auto w-full md:px-4 md:mt-10 flex flex-col md:flex-row md:gap-8">

        {/* TABS */}
        <div className="w-full md:w-64">
          <div className="flex flex-row md:flex-col border-b md:border-none md:p-1 md:bg-zinc-100/60 md:rounded-2xl">

            <button
              onClick={() => setActiveTab('info')}
              className={`flex-1 md:flex-none flex items-center justify-center md:justify-start gap-2 py-3 md:px-4 md:py-3 text-sm md:text-base font-medium ${
                activeTab === 'info'
                  ? 'text-zinc-900 md:bg-white'
                  : 'text-zinc-500'
              }`}
            >
              <User className="w-4 h-4 md:w-5 md:h-5" />
              اطلاعات
            </button>

            <button
              onClick={() => setActiveTab('business')}
              className={`flex-1 md:flex-none flex items-center justify-center md:justify-start gap-2 py-3 md:px-4 md:py-3 text-sm md:text-base font-medium ${
                activeTab === 'business'
                  ? 'text-zinc-900 md:bg-white'
                  : 'text-zinc-500'
              }`}
            >
              <Store className="w-4 h-4 md:w-5 md:h-5" />
              کسب‌وکار
            </button>

          </div>
        </div>

        {/* CONTENT */}
        <div className="flex-1 md:rounded-3xl p-4 md:p-8 md:border md:border-zinc-100 md:shadow-sm">

          {/* INFO TAB */}
          {activeTab === 'info' && (
            <div className="space-y-5 md:space-y-8">

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">

                <div>
                  <label className="text-xs md:text-sm mb-1 block">شماره موبایل</label>
                  <input
                    value={userData.phone}
                    disabled
                    className="w-full bg-zinc-50 text-xs md:text-base px-3 py-2.5 rounded-xl text-zinc-400"
                  />
                </div>

                <div>
                  <label className="text-xs md:text-sm mb-1 block">نام</label>
                  <input
                    value={userData.name}
                    onChange={(e) => setUserData({ ...userData, name: e.target.value })}
                    className={inputBaseClasses}
                  />
                </div>

                <div>
                  <label className="text-xs md:text-sm mb-1 block">نام کاربری</label>
                  <input
                    value={userData.username}
                    onChange={(e) =>
                      setUserData({
                        ...userData,
                        username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '')
                      })
                    }
                    className={inputBaseClasses}
                  />
                </div>

              </div>

              <div className="flex flex-col md:flex-row gap-3 pt-6">

                <button
                  onClick={handleSaveChanges}
                  disabled={isLoading}
                  className="bg-zinc-900 text-white w-full md:w-auto px-4 md:px-6 py-3 rounded-xl text-sm md:text-base"
                >
                  ذخیره
                </button>

                <button
                  onClick={handleLogout}
                  className="text-rose-600 bg-rose-50 w-full md:w-auto px-4 md:px-6 py-3 rounded-xl text-sm md:text-base"
                >
                  خروج
                </button>

              </div>
            </div>
          )}

          {/* BUSINESS TAB */}
          {activeTab === 'business' && (
            <div className="space-y-5">

              {hasBusiness ? (
                <div className="space-y-4">

                  <div className="p-4 bg-zinc-50 rounded-2xl flex items-center gap-3">
                    <Store className="w-6 h-6 text-rose-500" />
                    <div>
                      <div className="font-bold text-sm md:text-base">{salonData.name}</div>
                      <div className="text-xs md:text-sm text-zinc-500">
                        {salonData.province}، {salonData.city}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3">

                    <Link
                      href={`/salon/${salonData.id || salonData._id}`}
                      className="bg-zinc-900 text-white py-3 rounded-xl text-sm md:text-base text-center"
                    >
                      مشاهده
                    </Link>

                    <Link
                      href="/profile/business/edit"
                      className="border py-3 rounded-xl text-sm md:text-base text-center"
                    >
                      ویرایش
                    </Link>

                    <button
                      onClick={handleDeleteBusiness}
                      className="bg-rose-50 text-rose-600 py-3 rounded-xl text-sm md:text-base"
                    >
                      حذف
                    </button>

                  </div>

                </div>
              ) : (
                <div className="text-center py-10">
                  <Store className="w-14 h-14 text-rose-500 mx-auto mb-3" />
                  <p className="text-sm md:text-base text-zinc-500 mb-4">
                    هنوز کسب‌وکار ثبت نکردی
                  </p>
                  <Link
                    href="/profile/business"
                    className="bg-rose-500 text-white px-5 py-3 rounded-xl text-sm md:text-base"
                  >
                    ثبت کسب‌وکار
                  </Link>
                </div>
              )}

            </div>
          )}

        </div>
      </div>
    </div>
  );
}