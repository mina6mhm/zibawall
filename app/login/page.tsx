//app/login/page.tsx
'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { subscribeToWebPushSilently } from '@/lib/pushClient';

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // اگر کاربر از یک لینک محافظت‌شده (مثلاً نوبت‌دهی یک سالن) به لاگین هدایت شده،
  // بعد از ورود موفق باید به همون صفحه برگرده، نه همیشه به /dashboard
  const getRedirectTarget = () => {
    const next = searchParams.get('next');
    if (next && next.startsWith('/') && !next.startsWith('//')) {
      return next;
    }
    return '/dashboard';
  };

  const [step, setStep] = useState<'mobile' | 'otp' | 'username'>('mobile');

  const [mobile, setMobile] = useState('');
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');

  const [timeLeft, setTimeLeft] = useState(90);
  const [isTimerActive, setIsTimerActive] = useState(false);

  // کد تایید: یک input واقعی و یکپارچه (روی خانه‌های نمایشی قرار می‌گیرد).
  // کیبورد موبایل (iOS و اندروید) فقط برای یک فیلد کامل با autocomplete="one-time-code"
  // کد پیامک‌شده را بالای کیبورد پیشنهاد می‌دهد؛ با لمس آن، کل کد یک‌جا وارد می‌شود.
  const OTP_LENGTH = 5;
  const [otp, setOtp] = useState('');
  const [otpFocused, setOtpFocused] = useState(false);
  const [otpSession, setOtpSession] = useState(0); // با هر ارسال کد زیاد می‌شود تا WebOTP دوباره گوش دهد
  const otpInputRef = useRef<HTMLInputElement>(null);
  const submittedCodeRef = useRef('');

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

    setTimeout(() => otpInputRef.current?.focus(), 100);

    // WebOTP (اندروید/کروم): اگر پیامک به فرمت استاندارد برسد، کد بدون هیچ لمسی وارد می‌شود
    if (!('OTPCredential' in window)) return;
    const controller = new AbortController();
    navigator.credentials
      .get({
        otp: { transport: ['sms'] },
        signal: controller.signal,
      } as CredentialRequestOptions)
      .then((cred: any) => {
        if (cred?.code) {
          setOtp(toEnglishDigits(String(cred.code)).replace(/\D/g, '').slice(0, OTP_LENGTH));
        }
      })
      .catch(() => {});

    return () => controller.abort();
  }, [step, otpSession]);

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
      setTimeLeft(90);
      setIsTimerActive(true);
      setOtp('');
      submittedCodeRef.current = '';
      setOtpSession((n) => n + 1);
    } catch {
      alert('خطای ارتباط با سرور');
    }
  };

  const handleLoginWithOTP = async (codeArg?: string) => {
    const code = typeof codeArg === 'string' ? codeArg : otp;

    if (code.length !== OTP_LENGTH) {
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
        // کد غلط: پاک می‌کنیم تا کاربر دوباره بزند (و تایید خودکار دوباره کار کند)
        submittedCodeRef.current = '';
        setOtp('');
        setTimeout(() => otpInputRef.current?.focus(), 0);
        return;
      }

      if (data.isNewUser || !data.user?.username) {
        setStep('username');
      } else {
        // اجازه‌ی نوتیف مرورگر رو همینجا، بدون دکمه‌ی جدا، به‌صورت خودکار می‌گیریم.
        // عمداً await نمی‌کنیم و خطاش رو هم نادیده می‌گیریم تا ریدایرکت کند نشه.
        subscribeToWebPushSilently().catch(() => {});
        router.push(getRedirectTarget());
        router.refresh();
      }
    } catch {
      submittedCodeRef.current = '';
      alert('خطای ارتباط با سرور');
    }
  };

  // به‌محض کامل شدن کد (دستی، پیشنهاد کیبورد یا WebOTP) خودکار تایید می‌شود
  useEffect(() => {
    if (step !== 'otp' || otp.length !== OTP_LENGTH) return;
    if (submittedCodeRef.current === otp) return;
    submittedCodeRef.current = otp;
    handleLoginWithOTP(otp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp, step]);

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

      // اجازه‌ی نوتیف مرورگر رو همینجا، بدون دکمه‌ی جدا، به‌صورت خودکار می‌گیریم.
      subscribeToWebPushSilently().catch(() => {});
      router.push(getRedirectTarget());
      router.refresh();
    } catch {
      alert('خطای ارتباط با سرور');
    }
  };

  const handleOtpInput = (value: string) => {
    setOtp(toEnglishDigits(value).replace(/\D/g, '').slice(0, OTP_LENGTH));
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
              {Array.from({ length: OTP_LENGTH }).map((_, index) => {
                const active = otpFocused && timeLeft > 0 && index === Math.min(otp.length, OTP_LENGTH - 1);
                return (
                  <div
                    key={index}
                    aria-hidden="true"
                    className={`w-11 h-11 sm:w-12 sm:h-12 md:w-14 md:h-14 flex items-center justify-center text-lg sm:text-xl font-medium border rounded-xl transition-all ${
                      active ? 'border-[#824c71] ring-1 ring-[#824c71]' : 'border-zinc-300'
                    } ${timeLeft === 0 ? 'opacity-50 bg-zinc-50' : ''}`}
                  >
                    {otp[index] ?? ''}
                  </div>
                );
              })}
              {/* input واقعی: کل ردیف را می‌پوشاند، شفاف است و پیشنهاد کد پیامک را از کیبورد می‌گیرد */}
              <input
                ref={otpInputRef}
                type="text"
                name="otp"
                id="otp"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]*"
                maxLength={OTP_LENGTH}
                value={otp}
                disabled={timeLeft === 0}
                aria-label="کد تایید"
                onChange={(e) => handleOtpInput(e.target.value)}
                onFocus={() => setOtpFocused(true)}
                onBlur={() => setOtpFocused(false)}
                className="absolute inset-0 w-full h-full bg-transparent border-0 outline-none text-transparent caret-transparent selection:bg-transparent"
                style={{ fontSize: 16 }}
              />
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
              onClick={() => handleLoginWithOTP()}
              disabled={timeLeft === 0 || otp.length < OTP_LENGTH}
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