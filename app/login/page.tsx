//app/login/page.tsx
'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  
  // انتخاب بین فرم ورود و ثبت‌نام
  const [isLoginMode, setIsLoginMode] = useState(true);
  
  // استیت فیلدها
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    
    if (!email || !password) {
      setErrorMessage("لطفاً ایمیل و رمز عبور را وارد کنید.");
      return;
    }

    if (!isLoginMode && (!username || username.trim().length < 3)) {
      setErrorMessage("نام کاربری باید حداقل ۳ حرف باشد.");
      return;
    }

    setIsLoading(true);
    
    // انتخاب مسیر API بر اساس حالت فرم (ثبت نام یا ورود)
    // نکته: اگر اسم پوشه API را عوض نکردید، مسیر لاگین را به login-password تغییر دهید
    const endpoint = isLoginMode ? '/api/auth/login' : '/api/auth/register';
    
    const bodyData = isLoginMode 
      ? { email, password } 
      : { email, username, password };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData)
      });
      
      const data = await res.json();
      
      if (res.ok) {
        // ذخیره اطلاعات
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        document.cookie = `token=${data.token}; path=/; max-age=2592000`;
        
        router.push('/');
      } else {
        setErrorMessage(data.error || "خطایی رخ داده است.");
      }
    } catch (error) {
      setErrorMessage("خطای ارتباط با سرور");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    // استفاده از 100dvh برای حل مشکل نوار آدرس موبایل و تنظیم رنگ پس‌زمینه در موبایل و دسکتاپ
    <div className="min-h-[100dvh] bg-white sm:bg-zinc-50 flex flex-col items-center justify-center p-4 sm:p-6" dir="rtl">
      <div className="w-full max-w-[400px] bg-white p-6 sm:p-8 flex flex-col items-center sm:border sm:border-zinc-200 rounded-3xl sm:shadow-lg">
        
        <div className="mb-6 md:mb-8 flex items-center justify-center rounded-full">
          {/* کوچک‌تر شدن لوگو در موبایل */}
          <Image src="/logo.png" alt="لوگو" width={72} height={72} className="object-contain w-[64px] h-[64px] md:w-[72px] md:h-[72px]" />
        </div>

        <h1 className="text-lg md:text-xl font-extrabold text-zinc-900 mb-2">
          {isLoginMode ? 'ورود به حساب کاربری' : 'ثبت نام در سیستم'}
        </h1>
        
        <p className="text-[13px] md:text-sm text-zinc-500 mb-6 md:mb-8 text-center px-4">
          {isLoginMode ? 'برای ورود ایمیل و رمز عبور خود را وارد کنید' : 'یک حساب کاربری جدید برای خود بسازید'}
        </p>

        {errorMessage && (
          <div className="w-full bg-red-50 text-red-600 text-[13px] md:text-sm p-3 rounded-2xl mb-6 text-center border border-red-100 font-medium">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="w-full animate-in fade-in duration-300">
          
          <div className="w-full mb-4 md:mb-5">
            <label className="block text-[13px] font-semibold text-zinc-700 mb-1.5 pr-2">ایمیل</label>
            <input
              type="email"
              dir="ltr"
              placeholder="example@mail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              // اضافه شدن text-[16px] برای جلوگیری از زوم خودکار iOS
              className="w-full bg-zinc-50/50 hover:bg-zinc-50 focus:bg-white text-zinc-900 border border-zinc-200 rounded-2xl px-4 py-3.5 text-left focus:outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 placeholder-zinc-400 transition-all text-[16px] md:text-sm"
            />
          </div>

          {!isLoginMode && (
            <div className="w-full mb-4 md:mb-5">
              <label className="block text-[13px] font-semibold text-zinc-700 mb-1.5 pr-2">نام کاربری (انگلیسی)</label>
              <input
                type="text"
                dir="ltr"
                placeholder="مثال: mina_123"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                className="w-full bg-zinc-50/50 hover:bg-zinc-50 focus:bg-white text-zinc-900 border border-zinc-200 rounded-2xl px-4 py-3.5 text-left focus:outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 placeholder-zinc-400 transition-all text-[16px] md:text-sm"
              />
            </div>
          )}

          <div className="w-full mb-8">
            <label className="block text-[13px] font-semibold text-zinc-700 mb-1.5 pr-2">رمز عبور</label>
            {/* حل مشکل موقعیت آیکون با قرار دادن اینپوت و دکمه در یک رپر */}
            <div className="relative flex items-center">
              <input
                type={showPassword ? 'text' : 'password'}
                dir="ltr"
                placeholder="حداقل ۶ کاراکتر"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-zinc-50/50 hover:bg-zinc-50 focus:bg-white text-zinc-900 border border-zinc-200 rounded-2xl px-4 py-3.5 pr-12 text-left focus:outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 placeholder-zinc-400 transition-all text-[16px] md:text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-0 inset-y-0 px-4 flex items-center text-zinc-400 hover:text-zinc-700 transition-colors"
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a9.98 9.98 0 012.032-3.548M3 3l18 18" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.88 9.88a3 3 0 014.24 4.24" /></svg>
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            // استفاده از active:scale برای فیدبک لمسی و ارتفاع ثابت
            className="w-full h-[52px] bg-zinc-900 hover:bg-black active:scale-[0.98] disabled:bg-zinc-200 disabled:text-zinc-400 text-white rounded-2xl font-bold transition-all mb-6 flex justify-center items-center text-[15px]"
          >
            {isLoading ? (
              <span className="w-5 h-5 border-2 border-zinc-400 border-t-zinc-800 rounded-full animate-spin"></span>
            ) : (
              isLoginMode ? 'ورود به حساب' : 'ثبت نام'
            )}
          </button>
        </form>

        <div className="flex flex-col sm:flex-row items-center gap-1.5 text-[13px] md:text-sm">
          <span className="text-zinc-500">
            {isLoginMode ? 'حساب کاربری ندارید؟' : 'قبلاً ثبت نام کرده‌اید؟'}
          </span>
          <button
            type="button"
            onClick={() => {
              setIsLoginMode(!isLoginMode);
              setErrorMessage('');
              setEmail('');
              setPassword('');
              setUsername('');
            }}
            className="text-zinc-900 font-bold hover:underline py-1"
          >
            {isLoginMode ? 'ثبت نام کنید' : 'وارد شوید'}
          </button>
        </div>
        
      </div>
    </div>
  );
}
