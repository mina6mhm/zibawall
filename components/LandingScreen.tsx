// components/LandingScreen.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Vazirmatn } from 'next/font/google';
import { Globe, Download, Store, Wallet, BellRing, Star } from 'lucide-react';
import IosInstallPrompt from '@/components/IosInstallPrompt';

// فونت نمایشی جدا از فونت بدنه (Shabnam)، فقط برای تیتر و لیبل‌ها — تضاد وزنی عمدی برای هویت بصری
const vazir = Vazirmatn({ subsets: ['arabic'], weight: '800', display: 'swap' });

const FEATURES = [
  {
    icon: Store,
    title: 'دایرکتوری سالن‌های زیبایی',
    desc: 'سالن‌های نزدیک خودت رو با یک جستجوی ساده پیدا کن، خدمات و قیمت‌ها رو ببین و مستقیم نوبت بگیر.',
    tone: { bg: 'bg-[#824c71]/8', text: 'text-[#824c71]' },
  },
  {
    icon: Wallet,
    title: 'حسابداری ساده‌ی سالن',
    desc: 'درآمد هر روز، سهم هر پرسنل و سود خالص سالن رو بدون دفتر و ماشین‌حساب، خودکار محاسبه کن.',
    tone: { bg: 'bg-[#C98B6E]/12', text: 'text-[#C98B6E]' },
  },
  {
    icon: BellRing,
    title: 'یادآوری نوبت مشتری‌ها',
    desc: '۲۴ ساعت قبل از هر نوبت، پیامک یادآوری خودکار برای مشتری ارسال می‌شه؛ دیگه کسی نوبتش یادش نمی‌ره.',
    tone: { bg: 'bg-[#4A2A3D]/8', text: 'text-[#4A2A3D]' },
  },
];

export default function LandingScreen() {
  const router = useRouter();
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  // کلیک روی «ورود به وب اپلیکیشن»: همیشه پرامپت راهنمای نصب نشون داده می‌شه
  const handleEnter = () => {
    setShowInstallPrompt(true);
  };

  // بعد از بستن پرامپت (کلیک روی «متوجه شدم»)، کاربر به صفحه‌ی ورود هدایت می‌شه
  const handleClosePrompt = () => {
    setShowInstallPrompt(false);
    router.push('/login');
  };

  return (
    <div className="min-h-[100dvh] bg-white" dir="rtl">
      {/* ناوبری: لوگو همیشه سمت چپ صفحه، مثل اپ‌های سوپراپ */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-zinc-100">
        <div dir="ltr" className="max-w-md mx-auto flex items-center gap-2 px-5 h-16">
          <Image src="/logoo.png" alt="زیباوال" width={30} height={30} className="object-contain w-[30px] h-[30px] rounded-lg" />
          <span className={`${vazir.className} text-[17px] text-zinc-900`}>زیباوال</span>
        </div>
      </header>

      <main className="max-w-md mx-auto px-5">
        {/* هیرو */}
        <section className="pt-8 pb-10 text-center motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-3 motion-safe:duration-700">
          <span className={`${vazir.className} inline-flex items-center gap-1.5 text-[11px] tracking-wide text-[#824c71] bg-[#824c71]/8 px-3 py-1.5 rounded-full mb-5`}>
            سوپراپلیکیشن زیبایی
          </span>

          <h1 className={`${vazir.className} text-[28px] leading-[1.35] text-zinc-900 mb-4`}>
            نوبتت رو بگیر،
            <br />
            سالنت رو بچرخون.
          </h1>

          <p className="text-[13.5px] text-zinc-500 leading-relaxed mb-8 px-2">
            زیباوال دایرکتوری سالن‌های زیبایی، رزرو نوبت آنلاین و حسابداری ساده رو
            برای مشتری‌ها و صاحب‌های سالن، توی یک اپلیکیشن جمع کرده.
          </p>

          {/* دکمه‌ها: در یک ردیف، دکمه‌ی اصلی پرتر و پهن‌تر */}
          <div className="flex items-center gap-3 mb-3">
            <button
              onClick={handleEnter}
              className="flex-[1.5] flex items-center justify-center gap-2 bg-[#824c71] hover:bg-[#6d3f5e] text-white rounded-xl py-3.5 text-[13px] font-bold transition-colors shadow-lg shadow-[#824c71]/20 active:scale-[0.98]"
            >
              <Globe className="w-4 h-4 shrink-0" />
              ورود به وب اپلیکیشن
            </button>

            <a
              href="#"
              className="flex-1 flex items-center justify-center gap-1.5 border border-zinc-200 text-zinc-700 rounded-xl py-3.5 text-[13px] font-bold hover:bg-zinc-50 transition-colors active:scale-[0.98]"
            >
              <Download className="w-4 h-4 shrink-0" />
              دانلود برنامه
            </a>
          </div>
        </section>

        {/* المان تصویری سیگنیچر: کارت پیش‌نمایش نوبت + برچسب‌های شناور امکانات */}
        <section className="relative h-[290px] mb-14 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-1000 motion-safe:delay-150">
          <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 h-[220px] rounded-full bg-gradient-to-br from-[#824c71]/25 via-[#C98B6E]/15 to-transparent blur-3xl" />

          {/* کارت مرکزی: پیش‌نمایش نوبت‌های امروز */}
          <div className="absolute inset-x-10 top-1/2 -translate-y-1/2 bg-white rounded-3xl border border-zinc-100 shadow-[0_25px_60px_-20px_rgba(130,76,113,0.35)] p-4 z-10">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[12px] font-bold text-zinc-800">نوبت‌های امروز</span>
              <span className="flex items-center gap-1 text-[11px] text-amber-600 font-bold">
                <Star className="w-3 h-3 fill-current" />
                ۴.۹
              </span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between bg-zinc-50 rounded-xl px-3 py-2">
                <span className="text-[11px] text-zinc-600">کراتین مو</span>
                <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">۱۶:۳۰</span>
              </div>
              <div className="flex items-center justify-between bg-zinc-50 rounded-xl px-3 py-2">
                <span className="text-[11px] text-zinc-600">میکاپ عروس</span>
                <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">۱۸:۰۰</span>
              </div>
            </div>
          </div>

          {/* برچسب شناور: دایرکتوری */}
          <div className="absolute top-3 right-2 z-20 flex items-center gap-1.5 bg-white rounded-xl border border-zinc-100 shadow-md px-3 py-2 motion-safe:animate-[float_5s_ease-in-out_infinite]">
            <span className="w-6 h-6 rounded-lg bg-[#824c71]/10 text-[#824c71] flex items-center justify-center shrink-0">
              <Store className="w-3.5 h-3.5" />
            </span>
            <span className="text-[10.5px] font-bold text-zinc-700 whitespace-nowrap">دایرکتوری سالن‌ها</span>
          </div>

          {/* برچسب شناور: حسابداری */}
          <div className="absolute top-8 left-1 z-20 flex items-center gap-1.5 bg-white rounded-xl border border-zinc-100 shadow-md px-3 py-2 motion-safe:animate-[float_6s_ease-in-out_infinite] motion-safe:[animation-delay:0.8s]">
            <span className="w-6 h-6 rounded-lg bg-[#C98B6E]/15 text-[#C98B6E] flex items-center justify-center shrink-0">
              <Wallet className="w-3.5 h-3.5" />
            </span>
            <span className="text-[10.5px] font-bold text-zinc-700 whitespace-nowrap">حسابداری ساده</span>
          </div>

          {/* برچسب شناور: یادآوری */}
          <div className="absolute bottom-4 right-6 z-20 flex items-center gap-1.5 bg-white rounded-xl border border-zinc-100 shadow-md px-3 py-2 motion-safe:animate-[float_5.5s_ease-in-out_infinite] motion-safe:[animation-delay:1.4s]">
            <span className="w-6 h-6 rounded-lg bg-[#4A2A3D]/8 text-[#4A2A3D] flex items-center justify-center shrink-0">
              <BellRing className="w-3.5 h-3.5" />
            </span>
            <span className="text-[10.5px] font-bold text-zinc-700 whitespace-nowrap">یادآوری نوبت</span>
          </div>
        </section>

        {/* امکانات */}
        <section className="pb-12">
          <span className={`${vazir.className} block text-center text-[11px] tracking-wide text-[#824c71] mb-2`}>
            امکانات زیباوال
          </span>
          <h2 className="text-center text-lg font-bold text-zinc-900 mb-8">
            یک اپلیکیشن، برای هر دو طرف رزرو
          </h2>

          <div className="space-y-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="flex items-start gap-3.5 bg-white border border-zinc-100 rounded-2xl p-4 shadow-sm shadow-zinc-200/40 hover:shadow-md hover:-translate-y-0.5 transition-all"
              >
                <span className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${f.tone.bg} ${f.tone.text}`}>
                  <f.icon className="w-5 h-5" strokeWidth={2} />
                </span>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-zinc-900 text-[13.5px] mb-1">{f.title}</h3>
                  <p className="text-[12px] text-zinc-500 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* نماد اعتماد + فوتر */}
        <footer className="pb-10 flex flex-col items-center gap-4">
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
              width={72}
              height={72}
            />
          </a>
          <p className="text-[11px] text-zinc-400">© زیباوال — تمام حقوق محفوظ است.</p>
        </footer>
      </main>

      <IosInstallPrompt isOpen={showInstallPrompt} onClose={handleClosePrompt} />

      <style jsx global>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
      `}</style>
    </div>
  );
}