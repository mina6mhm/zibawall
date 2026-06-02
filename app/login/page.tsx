// app/login/page.tsx

'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();

  // اضافه شدن مرحله 'username'
  const [step, setStep] = useState<'mobile' | 'otp' | 'password' | 'username'>('mobile');
  const [mobile, setMobile] = useState('');
  
  // استیت یوزرنیم برای ثبت نام جدید
  const [username, setUsername] = useState('');

  // Password state + visibility toggle
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // استیت‌های مربوط به تایمر
  const [timeLeft, setTimeLeft] = useState(120);
  const [isTimerActive, setIsTimerActive] = useState(false);

  // استیت و Ref برای کادرهای OTP
  const [otpValues, setOtpValues] = useState(['', '', '', '', '']);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // منطق تایمر
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isTimerActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsTimerActive(false);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerActive, timeLeft]);

  // فرمت کردن زمان
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // ------------------------------------------------------------------
  // توابع ارتباط با بک‌اند (API)
  // ------------------------------------------------------------------

  const handleRequestOTP = async () => {
    if (!mobile || mobile.length < 10) {
      alert("لطفاً شماره موبایل معتبری وارد کنید.");
      return;
    }

    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setStep('otp');
        setTimeLeft(120);
        setIsTimerActive(true);
        setOtpValues(['', '', '', '', '']);
      } else {
        alert(data.error || "خطا در ارسال پیامک");
      }
    } catch (error) {
      alert("خطای ارتباط با سرور");
    }
  };

  const handleLoginWithOTP = async () => {
    const code = otpValues.join('');
    if (code.length < 5) return;

    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile, code })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        // ذخیره توکن 
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));

        // بررسی اینکه آیا کاربر جدید است یا یوزرنیم ندارد
        if (data.isNewUser || !data.user.username) {
          setStep('username'); // انتقال به مرحله انتخاب یوزرنیم
        } else {
          router.push('/'); // ورود موفق کاربر قدیمی
        }
      } else {
        alert(data.error || "کد اشتباه است");
      }
    } catch (error) {
      alert("خطای ارتباط با سرور");
    }
  };

  const handleLoginWithPassword = async () => {
    if (!mobile || mobile.length < 10 || !password || password.length < 4) {
      alert("لطفاً شماره موبایل و رمز عبور را به درستی وارد کنید.");
      return;
    }

    try {
      const res = await fetch('/api/auth/login-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile, password })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        router.push('/');
      } else {
        alert(data.error || "خطا در ورود");
      }
    } catch (error) {
      console.error(error);
      alert("خطای ارتباط با سرور");
    }
  };

  // تابع جدید برای ثبت یوزرنیم (برای کاربران جدید)
  const handleSetUsername = async () => {
    if (!username || username.trim().length < 3) {
      alert("نام کاربری باید حداقل ۳ کاراکتر باشد.");
      return;
    }

    // نکته: برای این درخواست چون کاربر احراز هویت شده (توکن دارد)، توکن را هم می‌فرستیم
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/auth/update-username', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ username })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        // آپدیت کردن اطلاعات کاربر در لوکال استوریج
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        user.username = username;
        localStorage.setItem('user', JSON.stringify(user));
        
        // انتقال به صفحه اصلی پس از تکمیل ثبت نام
        router.push('/');
      } else {
        alert(data.error || "این نام کاربری قبلاً گرفته شده است. لطفاً نام دیگری انتخاب کنید.");
      }
    } catch (error) {
      alert("خطای ارتباط با سرور");
    }
  };

  // ------------------------------------------------------------------
  // سایر توابع مدیریت UI و فرم‌ها
  // ------------------------------------------------------------------

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtpValues = [...otpValues];
    newOtpValues[index] = value.substring(value.length - 1);
    setOtpValues(newOtpValues);
    if (value && index < otpValues.length - 1) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!otpValues[index] && index > 0) {
        otpRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'Enter') {
      if (index < otpValues.length - 1) {
        otpRefs.current[index + 1]?.focus();
      }
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-[400px] bg-white p-8 flex flex-col items-center border border-zinc-200 rounded-3xl shadow-md">
        <div className="mb-10 flex items-center justify-center p-4 rounded-full">
          <Image src="/logo.png" alt="لوگو" width={80} height={80} className="object-contain" />
        </div>

        {/* ----------------- حالت ۱: دریافت شماره موبایل ----------------- */}
        {step === 'mobile' && (
           // کدهای قبلی حالت موبایل ...
          <div className="w-full flex flex-col items-center animate-in fade-in duration-300">
            <h1 className="text-xl font-bold text-zinc-900 mb-8">ثبت نام یا ورود</h1>

            <div className="w-full mb-8">
              <label className="block text-sm text-zinc-600 mb-2 pr-2">شماره موبایل</label>
              <input
                type="tel"
                dir="ltr"
                placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                className="w-full bg-white text-zinc-900 border border-zinc-300 rounded-xl px-4 py-3 text-left focus:outline-none focus:border-zinc-900 placeholder-zinc-400 transition-colors"
              />
            </div>

            <button
              onClick={handleRequestOTP}
              className="w-full bg-zinc-900 hover:bg-black text-white rounded-xl py-3 font-bold transition-colors mb-8"
            >
              دریافت کد تایید
            </button>

            <button
              onClick={() => setStep('password')}
              className="text-sm text-zinc-600 hover:text-zinc-900 transition-colors"
            >
              ورود با رمز عبور
            </button>
          </div>
        )}

        {/* ----------------- حالت ۲: تایید کد (OTP) ----------------- */}
        {step === 'otp' && (
          // کدهای قبلی حالت OTP ...
          <div className="w-full flex flex-col items-center animate-in fade-in duration-300">
            <h1 className="text-xl font-bold text-zinc-900 mb-4">احراز هویت شما</h1>

            <p className="text-sm text-zinc-600 mb-6 text-center">
              کد تایید به شماره <span dir="ltr" className="text-zinc-900">{mobile || '۰۹۱xxxxxxxx'}</span> ارسال شد
            </p>

            <div className="flex justify-center gap-3 mb-4 w-full" dir="ltr">
              {otpValues.map((value, index) => (
                <input
                  key={index}
                  ref={(el) => { otpRefs.current[index] = el; }}
                  type="text"
                  inputMode="numeric"
                  value={value}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(index, e)}
                  disabled={timeLeft === 0}
                  className="w-12 h-12 text-center text-xl font-bold bg-white text-zinc-900 border border-zinc-300 rounded-xl focus:outline-none focus:border-zinc-900 disabled:bg-zinc-100 disabled:text-zinc-500 transition-colors"
                />
              ))}
            </div>

            <button
              onClick={() => { setStep('mobile'); setIsTimerActive(false); }}
              className="text-sm text-zinc-900 font-medium mb-8 hover:text-zinc-700 transition-colors"
            >
              ویرایش شماره موبایل
            </button>

            <div className="mb-6 text-center">
              {timeLeft > 0 ? (
                <span className="text-sm text-zinc-600">
                  <span className="text-zinc-900 mx-1">{formatTime(timeLeft)}</span> تا ارسال مجدد کد
                </span>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <span className="text-sm text-red-500 font-medium">کد تایید منقضی شد!</span>
                  <button onClick={handleRequestOTP} className="text-sm text-zinc-900 hover:text-zinc-700 transition-colors">
                    ارسال مجدد کد
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={handleLoginWithOTP}
              disabled={timeLeft === 0 || otpValues.join('').length < otpValues.length}
              className="w-full bg-zinc-900 hover:bg-black disabled:bg-zinc-300 disabled:text-zinc-500 disabled:cursor-not-allowed text-white rounded-xl py-3 font-bold transition-colors mb-8"
            >
              تایید
            </button>
          </div>
        )}

        {/* ----------------- حالت ۳: انتخاب یوزرنیم (جدید) ----------------- */}
        {step === 'username' && (
          <div className="w-full flex flex-col items-center animate-in fade-in duration-300">
            <h1 className="text-xl font-bold text-zinc-900 mb-2">تکمیل ثبت نام</h1>
            <p className="text-sm text-zinc-600 mb-8 text-center">
              به سیستم خوش آمدید! لطفاً یک نام کاربری یکتا برای خود انتخاب کنید.
            </p>

            <div className="w-full mb-8">
              <label className="block text-sm text-zinc-600 mb-2 pr-2">نام کاربری (انگلیسی)</label>
              <input
                type="text"
                dir="ltr"
                placeholder="مثال: mina_123"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-white text-zinc-900 border border-zinc-300 rounded-xl px-4 py-3 text-left focus:outline-none focus:border-zinc-900 placeholder-zinc-400 transition-colors"
              />
            </div>

            <button
              onClick={handleSetUsername}
              className="w-full bg-zinc-900 hover:bg-black text-white rounded-xl py-3 font-bold transition-colors"
            >
              ثبت و ورود
            </button>
          </div>
        )}

        {/* ----------------- حالت ۴: ورود با رمز عبور ----------------- */}
        {step === 'password' && (
           // کدهای قبلی ورود با رمز عبور ...
           <div className="w-full flex flex-col items-center animate-in fade-in duration-300">
            <h1 className="text-xl font-bold text-zinc-900 mb-8">ورود با رمز عبور</h1>

            <div className="w-full mb-4">
              <label className="block text-sm text-zinc-600 mb-2 pr-2">شماره موبایل</label>
              <input
                type="tel"
                dir="ltr"
                placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                className="w-full bg-white text-zinc-900 border border-zinc-300 rounded-xl px-4 py-3 text-left focus:outline-none focus:border-zinc-900 placeholder-zinc-400 transition-colors"
              />
            </div>

            <div className="w-full mb-8 relative">
              <label className="block text-sm text-zinc-600 mb-2 pr-2">رمز عبور</label>
              <input
                type={showPassword ? 'text' : 'password'}
                dir="ltr"
                placeholder="رمز خود را وارد کنید"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white text-zinc-900 border border-zinc-300 rounded-xl px-4 py-3 pr-12 text-left focus:outline-none focus:border-zinc-900 placeholder-zinc-400 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute top-[44px] right-4 text-zinc-400 hover:text-zinc-700 transition-colors"
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a9.98 9.98 0 012.032-3.548M3 3l18 18" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.88 9.88a3 3 0 014.24 4.24" /></svg>
                )}
              </button>
            </div>

            <button
              onClick={handleLoginWithPassword}
              className="w-full bg-zinc-900 hover:bg-black text-white rounded-xl py-3 font-bold transition-colors mb-8"
            >
              ورود
            </button>

            <button
              onClick={() => setStep('mobile')}
              className="text-sm text-zinc-600 hover:text-zinc-900 transition-colors"
            >
              ورود با کد یکبار مصرف
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
