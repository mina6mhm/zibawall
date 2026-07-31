// components/LandingScreen.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Globe, Download } from 'lucide-react';
import IosInstallPrompt from '@/components/IosInstallPrompt';

export default function LandingScreen() {
  const router = useRouter();
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  // کلیک روی «ورود به وب اپ»: همیشه پرامپت راهنمای نصب نشون داده می‌شه
  const handleEnter = () => {
    setShowInstallPrompt(true);
  };

  // بعد از بستن پرامپت (کلیک روی «متوجه شدم»)، کاربر به صفحه‌ی ورود هدایت می‌شه
  const handleClosePrompt = () => {
    setShowInstallPrompt(false);
    router.push('/login');
  };

  return (
    <div className="min-h-[100dvh] bg-white flex flex-col items-center justify-center px-6 py-10" dir="rtl">
      <div className="w-full max-w-sm flex flex-col items-center text-center">

        <div className="mb-6">
          <Image src="/logoo.png" alt="زیباوال" width={88} height={88} className="object-contain w-20 h-20" />
        </div>

        <h1 className="text-2xl font-bold text-zinc-900 mb-2">زیباوال</h1>
        <p className="text-sm text-zinc-500 mb-10 leading-relaxed">
          پیدا کردن و رزرو نوبت سالن‌های زیبایی، فقط با یک کلیک
        </p>

        <div className="w-full flex flex-col gap-3 mb-10">
          <button
            onClick={handleEnter}
            className="w-full flex items-center justify-center gap-2 bg-[#824c71] hover:bg-[#6d3f5e] text-white rounded-xl py-3.5 text-sm font-bold transition-colors"
          >
            <Globe className="w-4 h-4" />
            ورود به وب اپ
          </button>

          <a
            href="#"
            className="w-full flex items-center justify-center gap-2 border border-zinc-200 text-zinc-700 rounded-xl py-3.5 text-sm font-bold hover:bg-zinc-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            دانلود برنامه
          </a>
        </div>

        <a
          referrerPolicy="origin"
          target="_blank"
          rel="noopener noreferrer"
          href="https://trustseal.enamad.ir/?id=766989&Code=dKa0KrJeIxKzLfJrk1wwDHgiyLJCKHyf"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            referrerPolicy="origin"
            src="https://trustseal.enamad.ir/logo.aspx?id=766989&Code=dKa0KrJeIxKzLfJrk1wwDHgiyLJCKHyf"
            alt="نماد اعتماد الکترونیکی"
            style={{ cursor: 'pointer' }}
            width={80}
            height={80}
          />
        </a>
      </div>

      <IosInstallPrompt isOpen={showInstallPrompt} onClose={handleClosePrompt} />
    </div>
  );
}