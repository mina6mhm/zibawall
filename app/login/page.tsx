//app/login/page.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();

  const [step, setStep] = useState<'mobile' | 'otp' | 'username'>('mobile');

  const [mobile, setMobile] = useState('');
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');

  const [timeLeft, setTimeLeft] = useState(120);
  const [isTimerActive, setIsTimerActive] = useState(false);

  const [otpValues, setOtpValues] = useState(['', '', '', '', '']);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const hiddenInputRef = useRef<HTMLInputElement>(null);

  const mobileRegex = /^09\d{9}$/;
  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;

  // تبدیل اعداد فارسی و عربی به انگلیسی
  const toEnglishDigits = (str: string) => {
    return str
      .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - '۰'.charCodeAt(0)))
      .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - '٠'.charCodeAt(0)));
  };

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

  useEffect(() => {
    if (step !== 'otp') return;

    setTimeout(() => hiddenInputRef.current?.focus(), 100);

    const controller = new AbortController();

    if ('OTPCredential' in window) {
      navigator.credentials
        .get({
          otp: { transport: ['sms'] },
          signal: controller.signal,
        } as CredentialRequestOptions)
        .then((otp: any) => {
          if (otp?.code) {
            const digits = toEnglishDigits(otp.code).slice(0, 5).split('');
            setOtpValues(digits);
          }
        })
        .catch(() => {});
    }

    return () => {
      controller.abort();
    };
  }, [step]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleRequestOTP = async () => {
  // اگه بدون صفر وارد شد، صفر اضافه کن
  let normalizedMobile = mobile.trim();
  if (normalizedMobile.startsWith('9') && normalizedMobile.length === 10) {
    normalizedMobile = '0' + normalizedMobile;
  }
  
  if (!mobileRegex.test(normalizedMobile)) {
    alert('شماره موبایل معتبر وارد کنید');
    return;
  }

  setMobile(normalizedMobile); // آپدیت state با شماره normalize شده
  
  try {
    const res = await fetch('/api/auth/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile: normalizedMobile })
    });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || 'خطا در ارسال کد');
        return;
      }

      setStep('otp');
      setTimeLeft(120);
      setIsTimerActive(true);
      setOtpValues(['', '', '', '', '']);
    } catch {
      alert('خطای ارتباط با سرور');
    }
  };

  const handleLoginWithOTP = async () => {
    const code = otpValues.join('');

    if (code.length !== 5) {
      alert('کد تایید را کامل وارد کنید');
      return;
    }

    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile, code })
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || 'کد وارد شده اشتباه است');
        return;
      }

      if (data.isNewUser || !data.user?.username) {
        setStep('username');
      } else {
        router.push('/');
        router.refresh();
      }
    } catch {
      alert('خطای ارتباط با سرور');
    }
  };

  const handleCompleteProfile = async () => {
    const userVal = username.trim();
    const nameVal = name.trim();

    if (!nameVal) {
      alert('لطفاً نام و نام خانوادگی خود را وارد کنید');
      return;
    }

    if (!usernameRegex.test(userVal)) {
      alert('نام کاربری باید بین ۳ تا ۲۰ کاراکتر و فقط شامل حروف انگلیسی، اعداد و _ باشد');
      return;
    }

    try {
      const res = await fetch('/api/auth/update-username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: userVal,
          name: nameVal
        })
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || 'خطا در ثبت اطلاعات');
        return;
      }

      router.push('/');
      router.refresh();
    } catch {
      alert('خطای ارتباط با سرور');
    }
  };

  const handleHiddenInput = (value: string) => {
    const englishValue = toEnglishDigits(value);
    const digits = englishValue.replace(/\D/g, '').slice(0, 5).split('');
    if (digits.length > 0) {
      const filled = [...digits, '', '', '', ''].slice(0, 5);
      setOtpValues(filled);
      const lastIndex = Math.min(digits.length - 1, 4);
      setTimeout(() => otpRefs.current[lastIndex]?.focus(), 0);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    const englishValue = toEnglishDigits(value);
    if (!/^\d?$/.test(englishValue)) return;

    const newOtpValues = [...otpValues];
    newOtpValues[index] = englishValue;
    setOtpValues(newOtpValues);

    if (englishValue && index < otpValues.length - 1) {
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

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData?.getData('text') ?? '';
    const englishPasted = toEnglishDigits(pasted);
    const digits = englishPasted.replace(/\D/g, '').slice(0, 5).split('');
    if (digits.length > 0) {
      const filled = [...digits, '', '', '', ''].slice(0, 5);
      setOtpValues(filled);
      const lastIndex = Math.min(digits.length, 4);
      setTimeout(() => otpRefs.current[lastIndex]?.focus(), 0);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-white sm:bg-white flex flex-col items-center justify-center p-4 sm:p-6" dir="rtl">
      <div className="w-full max-w-[400px] bg-white p-6 sm:p-8 flex flex-col items-center sm:border border-zinc-200 rounded-2xl sm:rounded-3xl sm:shadow-sm">
        
        <div className="mb-8 sm:mb-10 flex items-center justify-center p-2 rounded-full">
          <Image 
            src="/logoo.png" 
            alt="لوگو" 
            width={80} 
            height={80} 
            className="object-contain w-16 h-16 sm:w-20 sm:h-20"
          />
        </div>

        {step === 'mobile' && (
          <div className="w-full flex flex-col items-center animate-fade-in">
            <h1 className="text-lg sm:text-xl font-bold text-zinc-900 mb-6 sm:mb-8">ثبت نام یا ورود</h1>
            
            <div className="w-full mb-6 sm:mb-8">
              <label className="block text-xs sm:text-sm font-medium text-zinc-600 mb-1.5 sm:mb-2 pr-1 sm:pr-2">
                شماره موبایل
              </label>
              <input
                type="tel"
                dir="ltr"
                value={mobile}
                placeholder="09123456789"
                onChange={(e) => setMobile(toEnglishDigits(e.target.value))}
                className="w-full bg-white text-zinc-900 border border-zinc-300 rounded-xl px-3 py-2.5 sm:px-4 sm:py-3 text-sm sm:text-base text-left focus:outline-none focus:border-[#824c71] focus:ring-1 focus:ring-[#824c71] transition-all"
              />
            </div>
            
            <button
              onClick={handleRequestOTP}
              className="w-full bg-[#824c71] hover:bg-[#6d3f5e] text-white rounded-xl py-2.5 sm:py-3 text-sm sm:text-base font-bold transition-colors"
            >
              دریافت کد تایید
            </button>
          </div>
        )}

        {step === 'otp' && (
          <div className="w-full flex flex-col items-center animate-fade-in">
            <h1 className="text-lg sm:text-xl font-bold text-zinc-900 mb-2 sm:mb-4">احراز هویت شما</h1>
            <p className="text-xs sm:text-sm text-zinc-600 mb-6 sm:mb-8 text-center leading-relaxed">
              کد تایید به شماره <span dir="ltr" className="text-zinc-900 font-medium">{mobile}</span> ارسال شد
            </p>

            <div className="relative flex justify-center gap-2 sm:gap-3 mb-4 w-full" dir="ltr">
              <input
                ref={hiddenInputRef}
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={5}
                defaultValue=""
                onChange={(e) => {
                  handleHiddenInput(e.target.value);
                  e.target.value = '';
                }}
                onPaste={handleOtpPaste}
                style={{ position: 'absolute', opacity: 0.01, width: 1, height: 1, top: 0, left: 0 }}
              />
              {otpValues.map((value, index) => (
                <input
                  key={index}
                  ref={(el) => { otpRefs.current[index] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  autoComplete="one-time-code"
                  value={value}
                  disabled={timeLeft === 0}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(index, e)}
                  onPaste={handleOtpPaste}
                  className="w-11 h-11 sm:w-12 sm:h-12 md:w-14 md:h-14 text-lg sm:text-xl font-medium text-center border border-zinc-300 rounded-xl focus:border-[#824c71] focus:ring-1 focus:ring-[#824c71] outline-none transition-all disabled:opacity-50 disabled:bg-zinc-50"
                />
              ))}
            </div>

            <button
              onClick={() => {
                setStep('mobile');
                setIsTimerActive(false);
              }}
              className="text-xs sm:text-sm text-zinc-500 hover:text-zinc-800 mb-6 sm:mb-8 transition-colors font-medium"
            >
              ویرایش شماره موبایل
            </button>

            <div className="mb-6 sm:mb-8">
              {timeLeft > 0 ? (
                <span className="text-xs sm:text-sm font-medium text-zinc-500 flex items-center gap-1">
                  ارسال مجدد کد تا <span className="text-zinc-800" dir="ltr">{formatTime(timeLeft)}</span>
                </span>
              ) : (
                <button 
                  onClick={handleRequestOTP}
                  className="text-xs sm:text-sm font-bold text-[#824c71] hover:text-[#6d3f5e] transition-colors"
                >
                  ارسال مجدد کد
                </button>
              )}
            </div>

            <button
              onClick={handleLoginWithOTP}
              disabled={timeLeft === 0 || otpValues.join('').length < 5}
              className="w-full bg-[#824c71] hover:bg-[#6d3f5e] text-white rounded-xl py-2.5 sm:py-3 text-sm sm:text-base font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              تایید
            </button>
          </div>
        )}

        {step === 'username' && (
          <div className="w-full flex flex-col items-center animate-fade-in">
            <h1 className="text-lg sm:text-xl font-bold text-zinc-900 mb-2">تکمیل ثبت نام</h1>
            <p className="text-xs sm:text-sm text-zinc-500 mb-6 sm:mb-8 text-center">لطفاً اطلاعات زیر را تکمیل کنید</p>

            <div className="w-full mb-4 sm:mb-5">
              <label className="block text-xs sm:text-sm font-medium text-zinc-600 mb-1.5 sm:mb-2 pr-1 sm:pr-2">
                نام و نام خانوادگی
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-white text-zinc-900 border border-zinc-300 rounded-xl px-3 py-2.5 sm:px-4 sm:py-3 text-sm sm:text-base focus:outline-none focus:border-[#824c71] focus:ring-1 focus:ring-[#824c71] transition-all"
              />
            </div>

            <div className="w-full mb-8 sm:mb-10">
              <label className="block text-xs sm:text-sm font-medium text-zinc-600 mb-1.5 sm:mb-2 pr-1 sm:pr-2">
                نام کاربری
              </label>
              <input
                type="text"
                dir="ltr"
                value={username}
                placeholder="example_1234"
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-white text-zinc-900 border border-zinc-300 rounded-xl px-3 py-2.5 sm:px-4 sm:py-3 text-sm sm:text-base text-left focus:outline-none focus:border-[#824c71] focus:ring-1 focus:ring-[#824c71] transition-all"
              />
            </div>

            <button
              onClick={handleCompleteProfile}
              className="w-full bg-[#824c71] hover:bg-[#6d3f5e] text-white rounded-xl py-2.5 sm:py-3 text-sm sm:text-base font-bold transition-colors"
            >
              ثبت و ورود
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
