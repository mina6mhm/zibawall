// components/LandingScreen.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Vazirmatn } from 'next/font/google';
import {
  Globe, Download, Store, Wallet, BellRing, Star, Menu, X,
  Search, CalendarCheck, ChevronDown,
} from 'lucide-react';
import IosInstallPrompt from '@/components/IosInstallPrompt';
import DownloadAppModal from '@/components/DownloadAppModal';

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

const STEPS = [
  {
    number: '۰۱',
    icon: Search,
    title: 'جستجو کن',
    desc: 'سالن‌های نزدیکت رو با فیلتر دسته‌بندی، منطقه و خدمات پیدا کن.',
  },
  {
    number: '۰۲',
    icon: CalendarCheck,
    title: 'نوبت بگیر',
    desc: 'روز و ساعت مناسب رو انتخاب کن و در صورت نیاز بیعانه رو پرداخت کن.',
  },
  {
    number: '۰۳',
    icon: BellRing,
    title: 'یادآوری بگیر و برو',
    desc: 'یک روز قبل پیامک یادآوری می‌گیری؛ فقط سر وقت سر سالن حاضر شو.',
  },
];

const FAQS = [
  {
    q: 'زیباوال چطور کار می‌کنه؟',
    a: 'سالن مورد نظرت رو جستجو می‌کنی، خدمات و قیمت‌ها رو می‌بینی و مستقیم از داخل اپ نوبت می‌گیری.',
  },
  {
    q: 'برای رزرو نوبت باید پول واریز کنم؟',
    a: 'بعضی سالن‌ها بیعانه می‌خوان تا نوبتت قطعی بشه؛ مبلغ دقیق همیشه قبل از پرداخت بهت نشون داده می‌شه.',
  },
  {
    q: 'اگه صاحب سالن باشم چیکار می‌تونم بکنم؟',
    a: 'می‌تونی سالنت رو ثبت کنی، نوبت‌های مشتری‌ها رو مدیریت کنی و حسابداری روزانه‌ی سالن — درآمد، سهم پرسنل و سود خالص — رو خودکار ببینی.',
  },
  {
    q: 'یادآوری نوبت چطور ارسال می‌شه؟',
    a: '۲۴ ساعت قبل از هر نوبت، یک پیامک یادآوری خودکار برای مشتری ارسال می‌شه؛ بدون نیاز به کار دستی.',
  },
  {
    q: 'استفاده از زیباوال هزینه داره؟',
    a: 'برای مشتری‌ها جستجو و رزرو نوبت رایگانه. صاحب‌های سالن هم برای فعال‌سازی امکانات مدیریتی می‌تونن پلن مناسب خودشون رو انتخاب کنن.',
  },
];

export default function LandingScreen() {
  const router = useRouter();
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // کلیک روی «ورود به وب اپلیکیشن»: همیشه پرامپت راهنمای نصب نشون داده می‌شه (دست‌نخورده)
  const handleEnter = () => {
    setShowInstallPrompt(true);
  };

  // بعد از بستن پرامپت (کلیک روی «متوجه شدم»)، کاربر به صفحه‌ی ورود هدایت می‌شه (دست‌نخورده)
  const handleClosePrompt = () => {
    setShowInstallPrompt(false);
    router.push('/login');
  };

  return (
    <div className="min-h-[100dvh] bg-white" dir="rtl">
      {/* ناوبری: موبایل = همبرگری (با آیتم وبلاگ) | دسکتاپ = لینک مستقیم وبلاگ، بدون همبرگری */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-zinc-100">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-5 md:px-10 h-16">
          {/* گروه راست: منو */}
          <div className="relative flex items-center gap-3">
            {/* همبرگری فقط موبایل */}
            <button
              onClick={() => setIsMenuOpen((prev) => !prev)}
              aria-label="منو"
              className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg text-zinc-700 hover:bg-zinc-100 transition-colors"
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {/* لینک مستقیم فقط دسکتاپ */}
            <Link
              href="/blog"
              className="hidden md:inline-block text-[13px] font-bold text-zinc-700 hover:text-[#824c71] transition-colors"
            >
              وبلاگ
            </Link>

            {isMenuOpen && (
              <>
                <div className="fixed inset-0 z-40 md:hidden" onClick={() => setIsMenuOpen(false)} />
                <div className="absolute top-full right-0 mt-2 z-50 bg-white border border-zinc-100 rounded-xl shadow-lg py-1.5 min-w-[140px] md:hidden">
                  <Link
                    href="/blog"
                    onClick={() => setIsMenuOpen(false)}
                    className="block px-4 py-2.5 text-[13px] font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
                  >
                    وبلاگ
                  </Link>
                </div>
              </>
            )}
          </div>

          {/* گروه چپ: لوگو */}
          <Image
            src="/logo.png"
            alt="زیباوال"
            width={38}
            height={38}
            className="object-contain w-9 h-9"
          />
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-5 md:px-10">
        {/* هیرو: موبایل تک‌ستونه و وسط‌چین، دسکتاپ دو ستونه */}
        <section className="pt-8 pb-10 md:pt-16 md:pb-24 md:grid md:grid-cols-2 md:items-center md:gap-16">
          <div className="text-center md:text-right motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-3 motion-safe:duration-700">
            <h1 className={`${vazir.className} text-[28px] md:text-[40px] leading-[1.35] text-zinc-900 mb-4`}>
              نوبتت رو بگیر،
              <br />
              سالنت رو بچرخون.
            </h1>

            <p className="text-[13.5px] md:text-[15px] text-zinc-500 leading-relaxed mb-8 px-2 md:px-0 max-w-md mx-auto md:mx-0">
              زیباوال دایرکتوری سالن‌های زیبایی، رزرو نوبت آنلاین و حسابداری ساده رو
              برای مشتری‌ها و صاحب‌های سالن، توی یک اپلیکیشن جمع کرده.
            </p>

            {/* دکمه‌ها: در یک ردیف، دکمه‌ی اصلی پرتر و پهن‌تر — منطق ورود دست‌نخورده */}
            <div className="flex items-center gap-3 max-w-sm mx-auto md:mx-0">
              <button
                onClick={handleEnter}
                className="flex-[1.5] flex items-center justify-center gap-2 bg-[#824c71] hover:bg-[#6d3f5e] text-white rounded-xl py-3.5 text-[13px] font-bold transition-colors shadow-lg shadow-[#824c71]/20 active:scale-[0.98]"
              >
                <Globe className="w-4 h-4 shrink-0" />
                ورود به وب اپلیکیشن
              </button>

              <button
                type="button"
                onClick={() => setShowDownloadModal(true)}
                className="flex-1 flex items-center justify-center gap-1.5 border border-zinc-200 text-zinc-700 rounded-xl py-3.5 text-[13px] font-bold hover:bg-zinc-50 transition-colors active:scale-[0.98]"
              >
                <Download className="w-4 h-4 shrink-0" />
                دانلود برنامه
              </button>
            </div>
          </div>

          {/* المان تصویری سیگنیچر: کارت پیش‌نمایش نوبت + برچسب‌های شناور امکانات */}
          <section className="relative h-[300px] md:h-[420px] max-w-sm md:max-w-md mx-auto mt-14 md:mt-0 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-1000 motion-safe:delay-150">
            <div className="absolute inset-x-6 md:inset-x-10 top-1/2 -translate-y-1/2 h-[220px] md:h-[280px] rounded-full bg-gradient-to-br from-[#824c71]/25 via-[#C98B6E]/15 to-transparent blur-3xl" />

            {/* کارت مرکزی: پیش‌نمایش نوبت‌های امروز */}
            <div className="absolute inset-x-8 md:inset-x-14 top-1/2 -translate-y-1/2 bg-white rounded-3xl border border-zinc-100 shadow-[0_25px_60px_-20px_rgba(130,76,113,0.35)] p-4 md:p-5 z-10">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[12px] md:text-[13px] font-bold text-zinc-800">نوبت‌های امروز</span>
                <span className="flex items-center gap-1 text-[11px] md:text-xs text-amber-600 font-bold">
                  <Star className="w-3 h-3 fill-current" />
                  ۴.۹
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between bg-zinc-50 rounded-xl px-3 py-2">
                  <span className="text-[11px] md:text-xs text-zinc-600">کراتین مو</span>
                  <span className="text-[11px] md:text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">۱۶:۳۰</span>
                </div>
                <div className="flex items-center justify-between bg-zinc-50 rounded-xl px-3 py-2">
                  <span className="text-[11px] md:text-xs text-zinc-600">میکاپ عروس</span>
                  <span className="text-[11px] md:text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">۱۸:۰۰</span>
                </div>
              </div>
            </div>

            {/* برچسب شناور: دایرکتوری */}
            <div className="absolute top-0 right-0 md:right-2 z-20 flex items-center gap-1.5 bg-white rounded-xl border border-zinc-100 shadow-md px-3 py-2 motion-safe:animate-[float_5s_ease-in-out_infinite]">
              <span className="w-6 h-6 rounded-lg bg-[#824c71]/10 text-[#824c71] flex items-center justify-center shrink-0">
                <Store className="w-3.5 h-3.5" />
              </span>
              <span className="text-[10.5px] font-bold text-zinc-700 whitespace-nowrap">دایرکتوری سالن‌ها</span>
            </div>

            {/* برچسب شناور: حسابداری */}
            <div className="absolute top-16 md:top-20 left-0 z-20 flex items-center gap-1.5 bg-white rounded-xl border border-zinc-100 shadow-md px-3 py-2 motion-safe:animate-[float_6s_ease-in-out_infinite] motion-safe:[animation-delay:0.8s]">
              <span className="w-6 h-6 rounded-lg bg-[#C98B6E]/15 text-[#C98B6E] flex items-center justify-center shrink-0">
                <Wallet className="w-3.5 h-3.5" />
              </span>
              <span className="text-[10.5px] font-bold text-zinc-700 whitespace-nowrap">حسابداری ساده</span>
            </div>

            {/* برچسب شناور: یادآوری */}
            <div className="absolute bottom-0 right-10 md:right-16 z-20 flex items-center gap-1.5 bg-white rounded-xl border border-zinc-100 shadow-md px-3 py-2 motion-safe:animate-[float_5.5s_ease-in-out_infinite] motion-safe:[animation-delay:1.4s]">
              <span className="w-6 h-6 rounded-lg bg-[#4A2A3D]/8 text-[#4A2A3D] flex items-center justify-center shrink-0">
                <BellRing className="w-3.5 h-3.5" />
              </span>
              <span className="text-[10.5px] font-bold text-zinc-700 whitespace-nowrap">یادآوری نوبت</span>
            </div>
          </section>
        </section>

        {/* امکانات */}
        <section className="pb-16 md:pb-24">
          <span className={`${vazir.className} block text-center text-[11px] tracking-wide text-[#824c71] mb-2`}>
            امکانات زیباوال
          </span>
          <h2 className="text-center text-lg md:text-2xl font-bold text-zinc-900 mb-8 md:mb-10">
            یک اپلیکیشن، برای هر دو طرف رزرو
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-5">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="flex items-start gap-3.5 md:flex-col md:items-start bg-white border border-zinc-100 rounded-2xl p-4 md:p-5 shadow-sm shadow-zinc-200/40 hover:shadow-md hover:-translate-y-0.5 transition-all"
              >
                <span className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${f.tone.bg} ${f.tone.text} md:mb-4`}>
                  <f.icon className="w-5 h-5" strokeWidth={2} />
                </span>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-zinc-900 text-[13.5px] md:text-[15px] mb-1">{f.title}</h3>
                  <p className="text-[12px] md:text-[13px] text-zinc-500 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* چطور کار می‌کنه (فرآیند واقعی و ترتیبی؛ شماره‌گذاری اینجا موجه است) */}
        <section className="pb-16 md:pb-24">
          <span className={`${vazir.className} block text-center text-[11px] tracking-wide text-[#824c71] mb-2`}>
            مسیر رزرو
          </span>
          <h2 className="text-center text-lg md:text-2xl font-bold text-zinc-900 mb-10 md:mb-12">
            سه قدم تا نوبت بعدیت
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6 relative">
            {STEPS.map((step) => (
              <div key={step.number} className="flex flex-col items-center text-center md:items-start md:text-right">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-11 h-11 rounded-xl bg-[#824c71]/8 text-[#824c71] flex items-center justify-center shrink-0">
                    <step.icon className="w-5 h-5" strokeWidth={2} />
                  </span>
                  <span className={`${vazir.className} text-xl text-zinc-200`}>{step.number}</span>
                </div>
                <h3 className="font-bold text-zinc-900 text-[14px] mb-1.5">{step.title}</h3>
                <p className="text-[12.5px] text-zinc-500 leading-relaxed max-w-[220px]">{step.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* پرسش و پاسخ */}
        <section className="pb-16 md:pb-24">
          <span className={`${vazir.className} block text-center text-[11px] tracking-wide text-[#824c71] mb-2`}>
            پرسش‌های پرتکرار
          </span>
          <h2 className="text-center text-lg md:text-2xl font-bold text-zinc-900 mb-8 md:mb-10">
            هر چیزی که لازمه بدونی
          </h2>

          <div className="max-w-2xl mx-auto space-y-2.5">
            {FAQS.map((item, index) => {
              const isOpen = openFaq === index;
              return (
                <div
                  key={item.q}
                  className="border border-zinc-100 rounded-2xl overflow-hidden bg-white"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    className="w-full flex items-center justify-between gap-3 px-4 md:px-5 py-4 text-right"
                  >
                    <span className="font-bold text-zinc-800 text-[13.5px] md:text-sm">{item.q}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-zinc-400 shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-4 md:px-5 pb-4 -mt-1">
                      <p className="text-[12.5px] md:text-[13px] text-zinc-500 leading-relaxed">{item.a}</p>
                    </div>
                  )}
                </div>
              );
            })}
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
      <DownloadAppModal isOpen={showDownloadModal} onClose={() => setShowDownloadModal(false)} />

      <style jsx global>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
      `}</style>
    </div>
  );
}