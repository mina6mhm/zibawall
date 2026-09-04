// app/payment/result/page.tsx
//
// این صفحه، مقصد نهاییِ برگشت از درگاه زرین‌پال است (به‌جای صفحات محافظت‌شده‌ای
// مثل /appointments یا /profile/business/overview).
//
// چرا؟ روی اندروید/iOS، پرداخت با مرورگر سیستم (Capacitor Browser / Custom Tab)
// باز می‌شود، نه داخل WebView خودِ اپ — چون درگاه‌ها WebViewِ Capacitor را
// بلاک می‌کنند (به lib/openPaymentUrl.ts نگاه کنید). این یعنی کوکی «token»یِ
// اپ (که کاربر با آن لاگین بود) در حافظه‌ی آن مرورگرِ سیستم اصلاً وجود ندارد.
// اگر مقصدِ verify یک صفحه‌ی محافظت‌شده باشد، میدل‌ور کاربر را به /login
// می‌فرستد و کاربر باید دوباره شماره و کد تایید بزند — درحالی‌که سشنِ خودِ اپ
// هیچ‌وقت از بین نرفته، فقط در مرورگرِ دیگری بازش کرده بودیم.
//
// برای همین این صفحه کاملاً عمومی است (نیازی به لاگین ندارد) و فقط از روی
// query string نتیجه را نمایش می‌دهد؛ کاربر باید با دکمه‌ی برگشت مرورگر (یا
// بستن Custom Tab) به همان اپِ لاگین‌شده برگردد — جایی که با کمکِ لیسنرِ
// browserFinished (نگاه کنید به lib/useBrowserReturn.ts)، لیستِ نوبت‌ها/وضعیتِ
// پین خودکار به‌روزرسانی می‌شود.

'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

type ResultKind = 'success' | 'slotTaken' | 'failed';

const CONTENT: Record<
  ResultKind,
  { icon: typeof CheckCircle2; iconClass: string; title: string; text: string }
> = {
  success: {
    icon: CheckCircle2,
    iconClass: 'text-emerald-500 bg-emerald-50',
    title: 'پرداخت با موفقیت انجام شد',
    text: 'حالا می‌تونید به اپلیکیشن برگردید؛ نتیجه به‌صورت خودکار نمایش داده می‌شود.',
  },
  slotTaken: {
    icon: AlertTriangle,
    iconClass: 'text-amber-500 bg-amber-50',
    text:
      'پرداخت شما انجام شد، اما متأسفانه این ساعت هم‌زمان توسط شخص دیگری رزرو شده بود و نوبت لغو شد. مبلغ پرداختی‌تان به‌زودی بازگردانده می‌شود؛ در صورت نیاز از بخش پشتیبانی پیگیری کنید.',
    title: 'این نوبت دیگر در دسترس نبود',
  },
  failed: {
    icon: XCircle,
    iconClass: 'text-red-500 bg-red-50',
    title: 'پرداخت ناموفق بود',
    text: 'می‌تونید به اپلیکیشن برگردید و دوباره تلاش کنید.',
  },
};

function PaymentResultContent() {
  const searchParams = useSearchParams();

  const status = searchParams.get('status');
  const kind: ResultKind =
    status === 'success' ? 'success' : status === 'slotTaken' ? 'slotTaken' : 'failed';

  const { icon: Icon, iconClass, title, text } = CONTENT[kind];

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-6">
      <div className="max-w-sm w-full text-center">
        <div className={`w-16 h-16 rounded-full mx-auto mb-5 flex items-center justify-center ${iconClass}`}>
          <Icon className="w-8 h-8" />
        </div>
        <h1 className="text-lg font-bold text-zinc-900 mb-2">{title}</h1>
        <p className="text-sm text-zinc-500 leading-6 mb-8">{text}</p>

        <p className="text-xs text-zinc-400 mb-3">
          این صفحه در مرورگرِ درگاه پرداخت باز شده — برای دیدن جزئیات به اپلیکیشن زیباوال برگردید.
        </p>

        {/* برای حالتی که کاربر این صفحه را مستقیم در مرورگر معمولی (نه داخل اپ) باز کرده */}
        <Link
          href="/appointments"
          className="inline-block text-sm font-semibold text-[#824c71] underline underline-offset-4"
        >
          مشاهده نوبت‌ها در وب‌سایت
        </Link>
      </div>
    </div>
  );
}

export default function PaymentResultPage() {
  return (
    <Suspense fallback={null}>
      <PaymentResultContent />
    </Suspense>
  );
}
