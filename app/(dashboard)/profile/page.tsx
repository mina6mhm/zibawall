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
  const inputBaseClasses = "w-full border border-zinc-200 bg-zinc-50/50 rounded-xl md:rounded-2xl px-4 py-3 text-[15px] md:text-base focus:bg-white focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100 outline-none transition-all";

  return (
    <div className="flex flex-col min-h-screen bg-white pb-24">
      {/* --- هدر پروفایل --- */}
      <div className="bg-white border-b border-zinc-100 px-4 py-6 md:py-10">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center gap-4 md:gap-5">
          <div className="w-20 h-20 md:w-24 md:h-24 bg-zinc-50 rounded-full flex items-center justify-center text-zinc-400 border border-zinc-100 shrink-0">
            <User className="w-10 h-10 md:w-10 md:h-10" strokeWidth={1.5} />
          </div>
          <div className="text-center md:text-right flex-1">
            <h1 className="text-xl md:text-2xl font-bold text-zinc-900 mb-2.5 md:mb-3">{userData.name || 'کاربر عزیز'}</h1>
            <div className="flex flex-wrap items-center gap-2 justify-center md:justify-start">
              {userData.username && (
                <span className="text-rose-600 text-[13px] md:text-sm font-medium dir-ltr inline-flex items-center gap-1.5 bg-rose-50 px-2.5 py-1.5 rounded-lg md:rounded-xl border border-rose-100/50">
                  <AtSign className="w-4 h-4" /> {userData.username}
                </span>
              )}
              {userData.phone && (
                <span className="text-zinc-600 text-[13px] md:text-sm dir-ltr flex items-center gap-1.5 bg-zinc-50 px-2.5 py-1.5 rounded-lg md:rounded-xl border border-zinc-100">
                  <Phone className="w-4 h-4" /> {userData.phone}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto w-full md:px-4 md:mt-10 flex flex-col md:flex-row md:gap-8">
        
        {/* --- منوی تب‌ها --- */}
        <div className="w-full md:w-64 shrink-0">
          {/* ظاهر تب‌ها در دسکتاپ (کارت کناری) و موبایل (تب‌های زیرخط‌دار نیتیو) */}
          <div className="flex flex-row md:flex-col border-b border-zinc-100 md:border-none w-full md:p-1.5 md:gap-1.5 md:bg-zinc-100/70 md:rounded-2xl">
            <button 
              onClick={() => setActiveTab('info')} 
              className={`flex-1 md:flex-none flex items-center justify-center md:justify-start gap-2 py-4 md:px-4 md:py-3 md:rounded-xl transition-all text-[15px] md:text-base font-medium relative ${
                activeTab === 'info' 
                  ? 'text-zinc-900 md:bg-white md:shadow-sm' 
                  : 'text-zinc-500 hover:text-zinc-800 md:hover:bg-zinc-200/50'
              }`}
            >
              <User className="w-5 h-5 shrink-0" /> اطلاعات کاربری
              {/* خط زیرین فقط برای موبایل */}
              {activeTab === 'info' && (
                <span className="absolute bottom-0 left-0 w-full h-[2px] bg-zinc-900 md:hidden"></span>
              )}
            </button>
            
            <button 
              onClick={() => setActiveTab('business')} 
              className={`flex-1 md:flex-none flex items-center justify-center md:justify-start gap-2 py-4 md:px-4 md:py-3 md:rounded-xl transition-all text-[15px] md:text-base font-medium relative ${
                activeTab === 'business' 
                  ? 'text-zinc-900 md:bg-white md:shadow-sm' 
                  : 'text-zinc-500 hover:text-zinc-800 md:hover:bg-zinc-200/50'
              }`}
            >
              <Store className="w-5 h-5 shrink-0" /> {hasBusiness ? 'کسب‌وکار من' : 'ثبت کسب‌وکار'}
              {activeTab === 'business' && (
                <span className="absolute bottom-0 left-0 w-full h-[2px] bg-zinc-900 md:hidden"></span>
              )}
            </button>
          </div>
        </div>

        {/* --- محتوا --- */}
        <div className="flex-1 bg-white md:rounded-3xl p-5 md:p-8 md:border md:border-zinc-100/80 md:shadow-sm">
          
          {/* تب اطلاعات */}
          {activeTab === 'info' && (
            <div className="space-y-6 md:space-y-8 animate-in fade-in duration-300">
              <h2 className="hidden md:block text-xl font-bold text-zinc-800 mb-4">اطلاعات شخصی</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
                
                <div>
                  <label className="block text-[13px] md:text-sm font-medium mb-2 text-zinc-700 pr-1">شماره موبایل</label>
                  <input 
                    value={userData.phone} 
                    disabled 
                    className="w-full border border-zinc-100 bg-zinc-50/80 rounded-xl md:rounded-2xl px-4 py-3 dir-ltr text-left text-[15px] text-zinc-400 cursor-not-allowed" 
                    placeholder="09123456789"
                  />
                  <p className="text-[11px] md:text-xs text-zinc-400 mt-2 pr-1">شماره موبایل حساب کاربری قابل تغییر نیست</p>
                </div>

                <div>
                  <label className="block text-[13px] md:text-sm font-medium mb-2 text-zinc-700 pr-1">نام و نام خانوادگی</label>
                  <input 
                    value={userData.name} 
                    onChange={(e) => setUserData({...userData, name: e.target.value})} 
                    className={inputBaseClasses}
                    placeholder="نام خود را وارد کنید"
                  />
                </div>

                <div>
                  <label className="block text-[13px] md:text-sm font-medium mb-2 text-zinc-700 pr-1">نام کاربری</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400">
                      <AtSign className="w-[18px] h-[18px]" />
                    </span>
                    <input 
                      value={userData.username} 
                      onChange={(e) => setUserData({...userData, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '')})} 
                      placeholder="username"
                      className={`${inputBaseClasses} pl-11 dir-ltr text-left`}
                    />
                  </div>
                  <p className="text-[11px] md:text-xs text-zinc-400 mt-2 pr-1">فقط انگلیسی، اعداد و خط‌تیره (_)</p>
                </div>
              </div>
              
              {/* --- دکمه‌های فرم --- */}
              <div className="pt-8 md:pt-6 border-t border-zinc-100 flex flex-col md:flex-row items-center justify-between gap-3 mt-4">
                <button 
                  onClick={handleSaveChanges} 
                  disabled={isLoading} 
                  className="bg-zinc-900 text-white px-6 md:px-8 py-3.5 rounded-xl md:rounded-2xl w-full md:w-auto hover:bg-black transition-all active:scale-[0.98] text-[15px] md:text-base font-medium order-1 md:order-2"
                >
                  {isLoading ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
                </button>

                <button 
                  onClick={handleLogout}
                  className="text-rose-600 bg-rose-50/50 md:bg-transparent hover:bg-rose-50 px-6 py-3.5 rounded-xl md:rounded-2xl w-full md:w-auto transition-all flex items-center justify-center gap-2 text-[15px] md:text-base font-medium order-2 md:order-1"
                >
                  <LogOut className="w-5 h-5" /> خروج از حساب
                </button>
              </div>
            </div>
          )}

          {/* تب کسب و کار */}
          {activeTab === 'business' && (
            <div className="animate-in fade-in duration-300">
              {hasBusiness ? (
                <div className="space-y-6">
                  <h2 className="hidden md:block text-xl font-bold text-zinc-800">مدیریت کسب‌وکار من</h2>
                  
                  <div className="bg-zinc-50 border border-zinc-100/80 rounded-2xl p-4 md:p-5 flex flex-row items-center gap-4">
                    <div className="w-14 h-14 md:w-16 md:h-16 bg-white rounded-xl flex items-center justify-center border border-zinc-100 shrink-0 shadow-sm">
                      <Store className="w-7 h-7 md:w-8 md:h-8 text-rose-500" strokeWidth={1.5} />
                    </div>
                    <div className="flex-1 text-right">
                      <h3 className="text-lg md:text-xl font-bold text-zinc-900 mb-1">{salonData.name}</h3> 
                      <p className="text-[13px] md:text-sm text-zinc-500">
                         {salonData.province}، {salonData.city}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                    <Link 
                      href={`/salon/${salonData.id || salonData._id}`} 
                      className="flex justify-center items-center gap-2 bg-zinc-900 text-white px-4 py-3.5 rounded-xl md:rounded-2xl hover:bg-black transition-all font-medium active:scale-[0.98] text-[15px] md:text-base"
                    >
                      <Eye className="w-5 h-5 shrink-0" /> مشاهده سالن
                    </Link>

                    <Link 
                      href="/profile/business/edit" 
                      className="flex justify-center items-center gap-2 bg-white border border-zinc-200 text-zinc-700 px-4 py-3.5 rounded-xl md:rounded-2xl hover:bg-zinc-50 transition-all font-medium active:scale-[0.98] text-[15px] md:text-base"
                    >
                      <Edit className="w-5 h-5 shrink-0" /> ویرایش اطلاعات
                    </Link>

                    <button 
                      onClick={handleDeleteBusiness}
                      disabled={isLoading}
                      className="flex justify-center items-center gap-2 bg-rose-50/80 text-rose-600 border border-rose-100 px-4 py-3.5 rounded-xl md:rounded-2xl hover:bg-rose-100 transition-all font-medium active:scale-[0.98] text-[15px] md:text-base"
                    >
                      <Trash2 className="w-5 h-5 shrink-0" /> {isLoading ? 'کمی صبر...' : 'حذف کسب‌وکار'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 md:py-16">
                  <div className="w-20 h-20 md:w-24 md:h-24 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-5 md:mb-6 border border-rose-100/50">
                    <Store className="w-10 h-10 text-rose-500" strokeWidth={1.5} />
                  </div>
                  <h2 className="text-xl md:text-2xl font-bold mb-3 text-zinc-800">مدیر سالن زیبایی هستید؟</h2>
                  <p className="text-[14px] md:text-[15px] text-zinc-500 mb-8 max-w-md mx-auto leading-relaxed">
                    کسب‌وکار خود را به صورت کاملاً رایگان ثبت کنید تا هزاران مشتری جدید از سراسر کشور شما را پیدا کنند.
                  </p>
                  <Link 
                    href="/profile/business" 
                    className="bg-rose-500 text-white w-full md:w-auto px-8 py-3.5 rounded-xl md:rounded-2xl flex justify-center items-center gap-2 hover:bg-rose-600 transition-all active:scale-[0.98] text-[15px] md:text-base font-medium"
                  >
                    <Sparkles className="w-5 h-5" /> شروع ثبت‌نام کسب‌وکار
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
