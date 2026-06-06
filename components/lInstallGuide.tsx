//components/lInstallGuide.tsx

"use client";

import React, { useState, useEffect } from 'react';
// import Image from 'next/image'; // اگر می‌خواهید از Image کامپوننت Next.js استفاده کنید

// مسیر لوگوی شما در پوشه public
const ZibawalLogoSrc = '/logo.png';

const InstallGuide: React.FC = () => {
  // چک کردن localStorage برای جلوگیری از نمایش مجدد راهنما
  const [isGuideVisible, setIsGuideVisible] = useState(true);

  useEffect(() => {
    // این کد فقط در سمت کلاینت اجرا می‌شود
    if (typeof window !== 'undefined') {
      const guideWasClosed = localStorage.getItem('zibawalInstallGuideClosed') === 'true';
      setIsGuideVisible(!guideWasClosed);
    }
  }, []);

  const handleCloseGuide = () => {
    setIsGuideVisible(false);
    // ذخیره وضعیت بسته شدن راهنما در localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('zibawalInstallGuideClosed', 'true');
    }
  };

  if (!isGuideVisible) {
    return null; // اگر راهنما بسته شد، هیچ چیزی نمایش نده
  }

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={handleCloseGuide} // بستن با کلیک خارج از کادر
    >
      <div
        onClick={(e) => e.stopPropagation()} // جلوگیری از بسته شدن با کلیک روی محتوا
        className="bg-white w-full max-w-sm rounded-2xl shadow-xl overflow-hidden flex flex-col items-center p-6"
      >
        {/* لوگوی زیباوال */}
        <div className="mb-4">
          <img
            src={ZibawalLogoSrc} // استفاده از تگ img برای فایل‌های public
            alt="زیباوال لوگو"
            width={80}
            height={80}
            className="object-contain"
          />
          {/* اگر از next/image استفاده می‌کنید، کد زیر را جایگزین img کنید:
          <Image
            src={ZibawalLogoSrc} // برای Image، مسیر معمولا به صورت string هست
            alt="زیباوال لوگو"
            width={80}
            height={80}
            className="object-contain"
          />
          */}
        </div>

        {/* عنوان صفحه */}
        <h2 className="text-xl font-bold text-zinc-900 mb-4 text-center">
          نصب نسخه وب اپلیکیشن زیباوال
        </h2>

        {/* دستورالعمل‌ها */}
        <ol className="list-decimal list-inside space-y-3 text-zinc-700 text-sm leading-relaxed text-right">
          <li>
            <span className="font-medium">در نوار پایین مرورگر،</span> دکمه
            <span className="inline-flex items-center px-2 py-1 bg-zinc-100 rounded-md mx-1 text-xs font-mono border border-zinc-200">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-4 h-4 mr-1"
              >
                <path
                  fillRule="evenodd"
                  d="M5.25 3.75a3 3 0 00-3 3v10.5a3 3 0 003 3h10.5a3 3 0 003-3V6.75a3 3 0 00-3-3H7.5a1.75 1.75 0 00-1.01.375L4.75 7.115a1.75 1.75 0 00-1.01.375L2.75 8.086a1.75 1.75 0 00-.525 1.169v5.915a1.75 1.75 0 00.525 1.169l1.99 1.99a1.75 1.75 0 001.01.375H21a3 3 0 003-3V6.75a3 3 0 00-3-3H7.5zM17.25 9a.75.75 0 00-1.5 0v2.25H13.5a.75.75 0 000 1.5h2.25V15a.75.75 0 001.5 0v-2.25H18a.75.75 0 000-1.5h-2.25V9z"
                  clipRule="evenodd"
                />
              </svg>
              اشتراک‌گذاری
            </span>
            را انتخاب کنید.
          </li>
          <li>
            <span className="font-medium">در منوی باز شده،</span> به پایین اسکرول کنید و گزینه
            <span className="inline-flex items-center px-2 py-1 bg-zinc-100 rounded-md mx-1 text-xs font-mono border border-zinc-200">
              Add to Home Screen
            </span>
            را انتخاب کنید.
          </li>
          <li>
            <span className="font-medium">در بالای صفحه،</span> دکمه
            <span className="inline-flex items-center px-2 py-1 bg-rose-600 text-white rounded-md mx-1 text-xs font-semibold">
              Add
            </span>
            را انتخاب کنید.
          </li>
        </ol>

        {/* دکمه تایید */}
        <button
          onClick={handleCloseGuide}
          className="mt-6 w-full bg-rose-600 hover:bg-rose-700 text-white py-2.5 rounded-xl text-base font-bold transition-colors"
        >
          متوجه شدم
        </button>
      </div>
    </div>
  );
};

export default InstallGuide;
