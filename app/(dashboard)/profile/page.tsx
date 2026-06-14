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
        // دریافت اطلاعات کاربر فقط با اتکا به کوکی httpOnly
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
          // اگر توکن نامعتبر یا منقضی بود
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
        // درخواست به بک‌اند برای پاک‌کردن کوکی httpOnly
        await fetch('/api/auth/logout', { method: 'POST' });
      } catch (error) {
        console.error('Logout failed:', error);
      }
      
      router.push('/login'); 
      router.refresh();
    }
  };

  const hasBusiness = !!salonData;
  const inputBaseClasses = "w-full border border-zinc-200 bg-zinc-50/50 rounded-xl md:rounded-2xl px-3 md:px-4 py-2.5 md:py-3 text-sm md:text-base focus:bg-white focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100 outline-none transition-all";

  return (
    <div className="flex flex-col min-h-screen bg-white pb-24">
      {/* --- هدر پروفایل --- */}
      <div className="bg-white border-b border-zinc-100 px-4 py-6 md:py-10">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center gap-4 md:gap-5">
          <div className="w-16 h-16 md:w-24 md:h-24 bg-zinc-50 rounded-full flex items-center justify-center text-zinc-400 border border-zinc-100 shrink-0">
            <User className="w-8 h-8 md:w-10 md:h-10" strokeWidth={1.5} />
          </div>
          <div className="text-center md:text-right flex-1">
            <h1 className="text-lg md:text-2xl font-bold text-zinc-900 mb-2 md:mb-3">{userData.name || 'کاربر عزیز'}</h1>
            <div className="flex flex-wrap items-center gap-2 justify-center md:justify-start">
              {userData.username && (
                <span className="text-rose-600 text-[11px] md:text-sm font-medium dir-ltr inline-flex items-center gap-1.5 bg-rose-50 px-2 md:px-2.5 py-1 md:py-1.5 rounded-lg md:rounded-xl border border-rose-100/50">
                  <AtSign className="w-3.5 h-3.5 md:w-4 md:h-4" /> {userData.username}
                </span>
              )}
              {userData.phone && (
                <span className="text-zinc-500 text-[11px] md:text-sm dir-ltr flex items-center gap-1.5 bg-zinc-50 px-2 md:px-2.5 py-1 md:py-1.5 rounded-lg md:rounded-xl border border-zinc-100">
                  <Phone className="w-3.5 h-3.5 md:w-4 md:h-4" /> {userData.phone}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto w-full px-4 mt-4 md:mt-10 flex flex-col md:flex-row gap-4 md:gap-8">
        
        {/* --- سایدبار --- */}
        <div className="w-full md:w-64 shrink-0">
          <div className="grid grid-cols-2 md:flex md:flex-col p-1.5 gap-1.5 bg-zinc-100/70 rounded-xl md:rounded-2xl">
            <button 
              onClick={() => setActiveTab('info')} 
              className={`flex items-center justify-center md:justify-start gap-1.5 md:gap-2.5 px-2 md:px-4 py-2.5 md:py-3 rounded-lg md:rounded-xl transition-all text-xs md:text-base font-medium ${
                activeTab === 'info' 
                  ? 'bg-white text-zinc-900 shadow-sm' 
                  : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-200/50'
              }`}
            >
              <User className="w-4 h-4 md:w-5 md:h-5 shrink-0" /> اطلاعات کاربری
            </button>
            
            <button 
              onClick={() => setActiveTab('business')} 
              className={`flex items-center justify-center md:justify-start gap-1.5 md:gap-2.5 px-2 md:px-4 py-2.5 md:py-3 rounded-lg md:rounded-xl transition-all text-xs md:text-base font-medium ${
                activeTab === 'business' 
                  ? 'bg-white text-zinc-900 shadow-sm' 
                  : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-200/50'
              }`}
            >
              <Store className="w-4 h-4 md:w-5 md:h-5 shrink-0" /> {hasBusiness ? 'کسب‌وکار من' : 'ثبت کسب‌وکار'}
            </button>
          </div>
        </div>

        {/* --- محتوا --- */}
        <div className="flex-1 bg-white rounded-2xl md:rounded-3xl p-4 md:p-8 border border-zinc-100/80 shadow-sm md:shadow-none">
          
          {/* تب اطلاعات */}
          {activeTab === 'info' && (
            <div className="space-y-5 md:space-y-8 animate-in fade-in duration-300">
              <h2 className="text-lg md:text-xl font-bold text-zinc-800 mb-2 md:mb-4">اطلاعات شخصی</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                
                <div>
                  <label className="block text-xs md:text-sm font-medium mb-1.5 md:mb-2 text-zinc-700">شماره موبایل</label>
                  <input 
                    value={userData.phone} 
                    disabled 
                    className="w-full border border-zinc-100 bg-zinc-50 rounded-xl md:rounded-2xl px-3 md:px-4 py-2.5 md:py-3 dir-ltr text-left text-xs md:text-sm text-zinc-400 cursor-not-allowed" 
                    placeholder="09123456789"
                  />
                  <p className="text-[10px] md:text-xs text-zinc-400 mt-1 md:mt-1.5 pr-1">شماره موبایل حساب کاربری قابل تغییر نیست</p>
                </div>

                <div>
                  <label className="block text-xs md:text-sm font-medium mb-1.5 md:mb-2 text-zinc-700">نام و نام خانوادگی</label>
                  <input 
                    value={userData.name} 
                    onChange={(e) => setUserData({...userData, name: e.target.value})} 
                    className={inputBaseClasses}
                    placeholder="نام خود را وارد کنید"
                  />
                </div>

                <div>
                  <label className="block text-xs md:text-sm font-medium mb-1.5 md:mb-2 text-zinc-700">نام کاربری</label>
                  <div className="relative">
                    <span className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 text-zinc-400">
                      <AtSign className="w-4 h-4 md:w-[18px] md:h-[18px]" />
                    </span>
                    <input 
                      value={userData.username} 
                      onChange={(e) => setUserData({...userData, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '')})} 
                      placeholder="username"
                      className={`${inputBaseClasses} pl-9 md:pl-11 dir-ltr text-left`}
                    />
                  </div>
                  <p className="text-[10px] md:text-xs text-zinc-400 mt-1 md:mt-1.5 pr-1">فقط انگلیسی، اعداد و خط‌تیره (_)</p>
                </div>
              </div>
              
              {/* --- دکمه‌های فرم --- */}
              <div className="pt-4 md:pt-6 border-t border-zinc-100 flex flex-col md:flex-row items-center justify-between gap-3 md:gap-4 mt-2">
                <button 
                  onClick={handleSaveChanges} 
                  disabled={isLoading} 
                  className="bg-zinc-900 text-white px-6 md:px-8 py-2.5 md:py-3.5 rounded-xl md:rounded-2xl w-full md:w-auto hover:bg-black transition-all active:scale-[0.98] text-sm md:text-base font-medium order-1 md:order-2"
                >
                  {isLoading ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
                </button>

                <button 
                  onClick={handleLogout}
                  className="text-rose-600 hover:bg-rose-50 px-4 md:px-6 py-2.5 md:py-3.5 rounded-xl md:rounded-2xl w-full md:w-auto transition-all flex items-center justify-center gap-1.5 md:gap-2 text-sm md:text-base font-medium order-2 md:order-1"
                >
                  <LogOut className="w-4 h-4 md:w-5 md:h-5" /> خروج از حساب
                </button>
              </div>
            </div>
          )}

          {/* تب کسب و کار */}
          {activeTab === 'business' && (
            <div className="animate-in fade-in duration-300">
              {hasBusiness ? (
                <div className="space-y-4 md:space-y-6">
                  <h2 className="text-lg md:text-xl font-bold text-zinc-800">مدیریت کسب‌وکار من</h2>
                  
                  <div className="bg-zinc-50/50 border border-zinc-100/80 rounded-xl md:rounded-2xl p-3 md:p-4 flex flex-row items-center gap-3 md:gap-4 transition-all hover:border-zinc-200">
                    <div className="w-12 h-12 md:w-14 md:h-14 bg-white rounded-lg md:rounded-xl flex items-center justify-center border border-zinc-100 shrink-0">
                      <Store className="w-6 h-6 md:w-7 md:h-7 text-rose-500" strokeWidth={1.5} />
                    </div>
                    <div className="flex-1 text-right">
                      <h3 className="text-base md:text-lg font-bold text-zinc-900 mb-0.5 md:mb-1">{salonData.name}</h3> 
                      <p className="text-[11px] md:text-xs text-zinc-500 inline-flex items-center">
                         {salonData.province}، {salonData.city}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 md:gap-3 pt-2 md:pt-4">
                    <Link 
                      href={`/salon/${salonData.id || salonData._id}`} 
                      className="flex justify-center items-center gap-2 bg-zinc-900 text-white px-3 lg:px-4 py-2.5 md:py-3.5 rounded-xl md:rounded-2xl hover:bg-black transition-all font-medium active:scale-[0.98] text-sm lg:text-base whitespace-nowrap"
                    >
                      <Eye className="w-4 h-4 md:w-5 md:h-5 shrink-0" /> مشاهده سالن
                    </Link>

                    <Link 
                      href="/profile/business/edit" 
                      className="flex justify-center items-center gap-2 bg-white border border-zinc-200 text-zinc-700 px-3 lg:px-4 py-2.5 md:py-3.5 rounded-xl md:rounded-2xl hover:bg-zinc-50 hover:border-zinc-300 transition-all font-medium active:scale-[0.98] text-sm lg:text-base whitespace-nowrap"
                    >
                      <Edit className="w-4 h-4 md:w-5 md:h-5 shrink-0" /> ویرایش اطلاعات
                    </Link>

                    <button 
                      onClick={handleDeleteBusiness}
                      disabled={isLoading}
                      className="flex justify-center items-center gap-2 bg-rose-50/50 text-rose-600 border border-rose-100 px-3 lg:px-4 py-2.5 md:py-3.5 rounded-xl md:rounded-2xl hover:bg-rose-100/80 hover:border-rose-200 transition-all font-medium active:scale-[0.98] text-sm lg:text-base whitespace-nowrap"
                    >
                      <Trash2 className="w-4 h-4 md:w-5 md:h-5 shrink-0" /> {isLoading ? 'کمی صبر...' : 'حذف کسب‌وکار'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 md:py-16">
                  <div className="w-16 h-16 md:w-24 md:h-24 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6 border border-rose-100/50">
                    <Store className="w-8 h-8 md:w-10 md:h-10 text-rose-500" strokeWidth={1.5} />
                  </div>
                  <h2 className="text-lg md:text-2xl font-bold mb-2 md:mb-3 text-zinc-800">مدیر سالن زیبایی هستید؟</h2>
                  <p className="text-xs md:text-sm text-zinc-500 mb-6 md:mb-8 max-w-md mx-auto leading-relaxed px-4 md:px-0">
                    کسب‌وکار خود را به صورت کاملاً رایگان ثبت کنید تا هزاران مشتری جدید از سراسر کشور شما را پیدا کنند.
                  </p>
                  <Link 
                    href="/profile/business" 
                    className="bg-rose-500 text-white px-6 md:px-8 py-3 md:py-4 rounded-xl md:rounded-2xl inline-flex items-center gap-2 hover:bg-rose-600 transition-all active:scale-[0.98] text-sm md:text-base font-medium"
                  >
                    <Sparkles className="w-4 h-4 md:w-5 md:h-5" /> شروع ثبت‌نام کسب‌وکار
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
