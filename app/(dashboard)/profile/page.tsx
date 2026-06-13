'use client';

import React, { useState, useEffect } from 'react';
import { User, Mail, LogOut, Store, Sparkles, Eye, EyeOff, Edit, AtSign, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'info' | 'settings' | 'business'>('info');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const [userData, setUserData] = useState({ name: '', email: '', username: '' });
  const [newPassword, setNewPassword] = useState('');
  const [salonData, setSalonData] = useState<any>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        setUserData({ 
          name: parsedUser.name || '', 
          email: parsedUser.email || '',
          username: parsedUser.username || ''
        });
        
        try {
          // دریافت اطلاعات بر اساس ایمیل از API
          const res = await fetch(`/api/user/profile?email=${parsedUser.email}`);
          if (res.ok) {
            const data = await res.json();
            setUserData({ 
              name: data.name || '', 
              email: data.email || '',
              username: data.username || ''
            });
            setSalonData(data.salon);
          }
        } catch (error) {
          console.error('خطا در دریافت اطلاعات:', error);
        }
      }
    };
    fetchProfile();
  }, []);

  const handleSaveChanges = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: userData.name,
          email: userData.email,
          username: userData.username,
          newPassword: newPassword ? newPassword : undefined
        })
      });

      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('user', JSON.stringify(data.user || { ...userData }));
        alert('اطلاعات با موفقیت ذخیره شد!');
        setNewPassword('');
      } else {
        const errorData = await res.json();
        alert(errorData.error || 'خطا در ذخیره اطلاعات (شاید این ایمیل یا نام کاربری قبلا ثبت شده باشد)');
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

  const handleLogout = () => {
    const isConfirmed = window.confirm('آیا مطمئن هستید که می‌خواهید از حساب خود خارج شوید؟');
    if (isConfirmed) {
      localStorage.removeItem('user');
      localStorage.removeItem('token'); 
      document.cookie = "token=; path=/; max-age=0"; 
      window.location.href = '/login'; 
    }
  };

  const hasBusiness = !!salonData;
  const inputBaseClasses = "w-full border border-zinc-200 bg-zinc-50/50 rounded-2xl px-4 py-3 focus:bg-white focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100 outline-none transition-all";

  return (
    <div className="flex flex-col min-h-screen bg-white pb-24">
      {/* --- هدر پروفایل --- */}
      <div className="bg-white border-b border-zinc-100 px-4 py-8 md:py-10">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center gap-5">
          <div className="w-24 h-24 bg-zinc-50 rounded-full flex items-center justify-center text-zinc-400 border border-zinc-100 shrink-0">
            <User size={36} strokeWidth={1.5} />
          </div>
          <div className="text-center md:text-right flex-1">
            <h1 className="text-xl md:text-2xl font-bold text-zinc-900 mb-3">{userData.name || 'کاربر عزیز'}</h1>
            <div className="flex flex-row items-center gap-2 justify-center md:justify-start">
              {userData.username && (
                <span className="text-rose-600 text-xs md:text-sm font-medium dir-ltr inline-flex items-center gap-1.5 bg-rose-50 px-2.5 py-1.5 rounded-xl border border-rose-100/50">
                  <AtSign size={14} /> {userData.username}
                </span>
              )}
              {userData.email && (
                <span className="text-zinc-500 text-xs md:text-sm dir-ltr flex items-center gap-1.5 bg-zinc-50 px-2.5 py-1.5 rounded-xl border border-zinc-100">
                  <Mail size={14} /> {userData.email}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto w-full px-4 mt-6 md:mt-10 flex flex-col md:flex-row gap-6 md:gap-8">
        
        {/* --- سایدبار --- */}
        <div className="w-full md:w-64 shrink-0">
          <div className="flex flex-row md:flex-col p-1.5 gap-1.5 bg-zinc-100/70 rounded-2xl">
            <button 
              onClick={() => setActiveTab('info')} 
              className={`flex-1 flex items-center justify-center md:justify-start gap-2.5 px-4 py-3 rounded-xl transition-all text-sm md:text-base font-medium ${
                activeTab === 'info' 
                  ? 'bg-white text-zinc-900 shadow-sm' 
                  : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-200/50'
              }`}
            >
              <User size={18} /> اطلاعات کاربری
            </button>
            
            <button 
              onClick={() => setActiveTab('business')} 
              className={`flex-1 flex items-center justify-center md:justify-start gap-2.5 px-4 py-3 rounded-xl transition-all text-sm md:text-base font-medium ${
                activeTab === 'business' 
                  ? 'bg-white text-zinc-900 shadow-sm' 
                  : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-200/50'
              }`}
            >
              <Store size={18} /> {hasBusiness ? 'کسب‌وکار من' : 'ثبت کسب‌وکار'}
            </button>
          </div>
        </div>

        {/* --- محتوا --- */}
        <div className="flex-1 bg-white rounded-3xl p-5 md:p-8 border border-zinc-100/80">
          
          {/* تب اطلاعات */}
          {activeTab === 'info' && (
            <div className="space-y-6 md:space-y-8 animate-in fade-in duration-300">
              <h2 className="text-xl font-bold text-zinc-800">اطلاعات شخصی</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
                
                <div>
                  <label className="block text-sm font-medium mb-2 text-zinc-700">ایمیل</label>
                  <input 
                    value={userData.email} 
                    disabled 
                    className="w-full border border-zinc-100 bg-zinc-50 rounded-2xl px-4 py-3 dir-ltr text-right text-zinc-400 cursor-not-allowed" 
                    placeholder="example@email.com"
                  />
                  <p className="text-xs text-zinc-400 mt-1.5 pr-1">ایمیل حساب کاربری قابل تغییر نیست</p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-zinc-700">نام و نام خانوادگی</label>
                  <input 
                    value={userData.name} 
                    onChange={(e) => setUserData({...userData, name: e.target.value})} 
                    className={inputBaseClasses}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-zinc-700">نام کاربری</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400">
                      <AtSign size={16} />
                    </span>
                    <input 
                      value={userData.username} 
                      onChange={(e) => setUserData({...userData, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '')})} 
                      placeholder="username"
                      className={`${inputBaseClasses} pl-11 dir-ltr text-left`}
                    />
                  </div>
                  <p className="text-xs text-zinc-400 mt-1.5 pr-1">فقط انگلیسی، اعداد و خط‌تیره (_)</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2 text-zinc-700">رمز عبور جدید (اختیاری)</label>
                  <div className="relative">
                    <input 
                      type={showPassword ? "text" : "password"} 
                      value={newPassword} 
                      onChange={(e) => setNewPassword(e.target.value)} 
                      placeholder="برای تغییر رمز عبور وارد کنید" 
                      className={`${inputBaseClasses} pr-11 dir-ltr text-left`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 focus:outline-none transition-colors"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              </div>
              
              {/* --- دکمه‌های فرم --- */}
              <div className="pt-4 border-t border-zinc-100 flex flex-col md:flex-row items-center justify-between gap-4">
                <button 
                  onClick={handleSaveChanges} 
                  disabled={isLoading} 
                  className="bg-zinc-900 text-white px-8 py-3.5 rounded-2xl w-full md:w-auto hover:bg-black transition-all active:scale-[0.98] font-medium"
                >
                  {isLoading ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
                </button>

                <button 
                  onClick={handleLogout}
                  className="text-rose-600 hover:bg-rose-50 px-6 py-3.5 rounded-2xl w-full md:w-auto transition-all flex items-center justify-center gap-2 font-medium"
                >
                  <LogOut size={18} /> خروج از حساب
                </button>
              </div>
            </div>
          )}

          {/* تب کسب و کار (تغییری نکرده است) */}
          {activeTab === 'business' && (
            <div className="animate-in fade-in duration-300">
              {hasBusiness ? (
                <div className="space-y-6">
                  <h2 className="text-xl font-bold text-zinc-800">مدیریت کسب‌وکار من</h2>
                  
                  <div className="bg-zinc-50/50 border border-zinc-100/80 rounded-2xl p-4 flex flex-row items-center gap-4 transition-all hover:border-zinc-200">
                    <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center border border-zinc-100 shrink-0">
                      <Store size={24} strokeWidth={1.5} className="text-rose-500" />
                    </div>
                    <div className="flex-1 text-right">
                      <h3 className="text-lg font-bold text-zinc-900 mb-1">{salonData.name}</h3> 
                      <p className="text-xs text-zinc-500 inline-flex items-center">
                         {salonData.province}، {salonData.city}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4">
                    <Link 
                      href={`/salon/${salonData.id || salonData._id}`} 
                      className="flex justify-center items-center gap-2 bg-zinc-900 text-white px-2 lg:px-4 py-3.5 rounded-2xl hover:bg-black transition-all font-medium active:scale-[0.98] text-sm lg:text-base whitespace-nowrap"
                    >
                      <Eye size={18} className="shrink-0" /> مشاهده سالن
                    </Link>

                    <Link 
                      href="/profile/business/edit" 
                      className="flex justify-center items-center gap-2 bg-white border border-zinc-200 text-zinc-700 px-2 lg:px-4 py-3.5 rounded-2xl hover:bg-zinc-50 hover:border-zinc-300 transition-all font-medium active:scale-[0.98] text-sm lg:text-base whitespace-nowrap"
                    >
                      <Edit size={18} className="shrink-0" /> ویرایش اطلاعات
                    </Link>

                    <button 
                      onClick={handleDeleteBusiness}
                      disabled={isLoading}
                      className="flex justify-center items-center gap-2 bg-rose-50/50 text-rose-600 border border-rose-100 px-2 lg:px-4 py-3.5 rounded-2xl hover:bg-rose-100/80 hover:border-rose-200 transition-all font-medium active:scale-[0.98] text-sm lg:text-base whitespace-nowrap"
                    >
                      <Trash2 size={18} className="shrink-0" /> {isLoading ? 'کمی صبر...' : 'حذف کسب‌وکار'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 md:py-16">
                  <div className="w-24 h-24 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-rose-100/50">
                    <Store size={40} strokeWidth={1.5} className="text-rose-500" />
                  </div>
                  <h2 className="text-2xl font-bold mb-3 text-zinc-800">مدیر سالن زیبایی هستید؟</h2>
                  <p className="text-zinc-500 mb-8 max-w-md mx-auto leading-relaxed">
                    کسب‌وکار خود را به صورت کاملاً رایگان ثبت کنید تا هزاران مشتری جدید از سراسر کشور شما را پیدا کنند.
                  </p>
                  <Link 
                    href="/profile/business" 
                    className="bg-rose-500 text-white px-8 py-4 rounded-2xl inline-flex items-center gap-2 hover:bg-rose-600 transition-all active:scale-[0.98] font-medium"
                  >
                    <Sparkles size={20} /> شروع ثبت‌نام کسب‌وکار
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
