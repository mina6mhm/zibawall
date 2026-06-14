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

  const [timeLeft, setTimeLeft] = useState(120);
  const [isTimerActive, setIsTimerActive] = useState(false);

  const [otpValues, setOtpValues] = useState([
    '',
    '',
    '',
    '',
    ''
  ]);

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const mobileRegex = /^09\d{9}$/;
  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;

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

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, '0');

    const s = (seconds % 60)
      .toString()
      .padStart(2, '0');

    return `${m}:${s}`;
  };

  const handleRequestOTP = async () => {
    if (!mobileRegex.test(mobile)) {
      alert('شماره موبایل معتبر وارد کنید');
      return;
    }

    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          mobile
        })
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
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          mobile,
          code
        })
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

  const handleSetUsername = async () => {
    const value = username.trim();

    if (!usernameRegex.test(value)) {
      alert(
        'نام کاربری باید بین ۳ تا ۲۰ کاراکتر و فقط شامل حروف انگلیسی، اعداد و _ باشد'
      );
      return;
    }

    try {
      const res = await fetch(
        '/api/auth/update-username',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            username: value
          })
        }
      );

      const data = await res.json();

      if (!res.ok) {
        alert(
          data.error ||
            'خطا در ثبت نام کاربری'
        );
        return;
      }

      router.push('/');
      router.refresh();

    } catch {
      alert('خطای ارتباط با سرور');
    }
  };

  const handleOtpChange = (
    index: number,
    value: string
  ) => {
    if (!/^\d*$/.test(value)) return;

    const newOtpValues = [...otpValues];

    newOtpValues[index] =
      value.substring(value.length - 1);

    setOtpValues(newOtpValues);

    if (
      value &&
      index < otpValues.length - 1
    ) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
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
    <div
      className="min-h-[100dvh] bg-white flex flex-col items-center justify-center p-4"
      dir="rtl"
    >
      <div className="w-full max-w-[400px] bg-white p-8 flex flex-col items-center border border-zinc-200 rounded-3xl shadow-sm">

        <div className="mb-10 flex items-center justify-center p-4 rounded-full">
          <Image
            src="/logo.png"
            alt="لوگو"
            width={80}
            height={80}
            className="object-contain"
          />
        </div>

        {step === 'mobile' && (
          <div className="w-full flex flex-col items-center">

            <h1 className="text-xl font-bold text-zinc-900 mb-8">
              ثبت نام یا ورود
            </h1>

            <div className="w-full mb-8">
              <label className="block text-sm text-zinc-600 mb-2 pr-2">
                شماره موبایل
              </label>

              <input
                type="tel"
                dir="ltr"
                value={mobile}
                placeholder="09123456789"
                onChange={(e) =>
                  setMobile(e.target.value)
                }
                className="w-full bg-white text-zinc-900 border border-zinc-300 rounded-xl px-4 py-3 text-left focus:outline-none focus:border-zinc-900"
              />
            </div>

            <button
              onClick={handleRequestOTP}
              className="w-full bg-zinc-900 hover:bg-black text-white rounded-xl py-3 font-bold"
            >
              دریافت کد تایید
            </button>

          </div>
        )}

        {step === 'otp' && (
          <div className="w-full flex flex-col items-center">

            <h1 className="text-xl font-bold text-zinc-900 mb-4">
              احراز هویت شما
            </h1>

            <p className="text-sm text-zinc-600 mb-6 text-center">
              کد تایید به شماره
              {' '}
              <span
                dir="ltr"
                className="text-zinc-900"
              >
                {mobile}
              </span>
              {' '}
              ارسال شد
            </p>

            <div
              className="flex justify-center gap-3 mb-4 w-full"
              dir="ltr"
            >
              {otpValues.map((value, index) => (
                <input
                  key={index}
                  ref={(el) => {
                    otpRefs.current[index] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={value}
                  disabled={timeLeft === 0}
                  onChange={(e) =>
                    handleOtpChange(
                      index,
                      e.target.value
                    )
                  }
                  onKeyDown={(e) =>
                    handleOtpKeyDown(index, e)
                  }
                  className="w-12 h-12 text-center border border-zinc-300 rounded-xl"
                />
              ))}
            </div>

            <button
              onClick={() => {
                setStep('mobile');
                setIsTimerActive(false);
              }}
              className="text-sm mb-8"
            >
              ویرایش شماره موبایل
            </button>

            <div className="mb-6">
              {timeLeft > 0 ? (
                <span>
                  {formatTime(timeLeft)}
                </span>
              ) : (
                <button
                  onClick={handleRequestOTP}
                >
                  ارسال مجدد کد
                </button>
              )}
            </div>

            <button
              onClick={handleLoginWithOTP}
              disabled={
                timeLeft === 0 ||
                otpValues.join('').length < 5
              }
              className="w-full bg-zinc-900 text-white rounded-xl py-3 font-bold"
            >
              تایید
            </button>

          </div>
        )}

        {step === 'username' && (
          <div className="w-full flex flex-col items-center">

            <h1 className="text-xl font-bold text-zinc-900 mb-2">
              تکمیل ثبت نام
            </h1>

            <p className="text-sm text-zinc-600 mb-8 text-center">
              لطفاً یک نام کاربری انتخاب کنید
            </p>

            <div className="w-full mb-8">

              <label className="block text-sm text-zinc-600 mb-2 pr-2">
                نام کاربری
              </label>

              <input
                type="text"
                dir="ltr"
                value={username}
                placeholder="mina_123"
                onChange={(e) =>
                  setUsername(e.target.value)
                }
                className="w-full bg-white text-zinc-900 border border-zinc-300 rounded-xl px-4 py-3 text-left focus:outline-none focus:border-zinc-900"
              />
            </div>

            <button
              onClick={handleSetUsername}
              className="w-full bg-zinc-900 text-white rounded-xl py-3 font-bold"
            >
              ثبت و ورود
            </button>

          </div>
        )}

      </div>
    </div>
  );
}