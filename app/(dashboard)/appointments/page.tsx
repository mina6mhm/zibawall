// app/(dashboard)/appointments/page.tsx
'use client';

import { Suspense, useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Loader2, Scissors, User as UserIcon, CalendarX, CheckCircle2, XCircle,
} from 'lucide-react';
import { openPaymentUrl } from '@/lib/openPaymentUrl';
import { useOnBrowserReturn } from '@/lib/useBrowserReturn';

type AppointmentItem = {
  id: string;
  date: string;
  startTime: string;
  status: 'PENDING_PAYMENT' | 'CONFIRMED' | 'CANCELLED'; // ← هر آیتم status خودش رو داره
  services: { name: string; price?: number; staffName?: string }[];
};

type Appointment = {
  id: string;
  isGroup: boolean;
  status: 'PENDING_PAYMENT' | 'CONFIRMED' | 'CANCELLED';
  paymentStatus: 'PENDING' | 'SUCCESS' | 'FAILED';
  totalDeposit: number;
  appFee: number;
  totalAmount: number;
  salon: { id: string; name: string; imageUrl: string; address: string };
  items: AppointmentItem[];
};

// یک آیتم نوبت به‌همراه رزرو (گروه) پدرش — چون دکمه‌ی پرداخت و بقیه‌ی
// اطلاعات سالن از روی خودِ رزرو خونده می‌شه، نه فقط آیتم.
type FlatItem = { appt: Appointment; item: AppointmentItem };

type TabKey = 'upcoming' | 'past' | 'cancelled';

const STATUS_LABELS: Record<AppointmentItem['status'], { label: string; bgClassName: string; textClassName: string }> = {
  PENDING_PAYMENT: { label: 'در انتظار پرداخت', bgClassName: 'bg-amber-50', textClassName: 'text-amber-600' },
  CONFIRMED: { label: 'درخواست موفق', bgClassName: 'bg-emerald-50', textClassName: 'text-emerald-600' },
  CANCELLED: { label: 'لغو شده', bgClassName: 'bg-zinc-100', textClassName: 'text-zinc-500' },
};

const TABS: { key: TabKey; label: string }[] = [
  { key: 'upcoming', label: 'پیش رو' },
  { key: 'past', label: 'گذشته' },
  { key: 'cancelled', label: 'لغو شده' },
];

const toPersianDigits = (str: string) => str.replace(/[0-9]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);

// تاریخ+ساعت نوبت رو به یک Date واقعی تبدیل می‌کنه تا بشه با «الان» مقایسه کرد.
function getAppointmentDateTime(item: AppointmentItem): Date {
  const d = new Date(item.date);
  const [h, m] = item.startTime.split(':').map(Number);
  if (!Number.isNaN(h)) d.setHours(h, m || 0, 0, 0);
  return d;
}

function AppointmentsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('upcoming');

  const fetchAppointments = useCallback(async () => {
    try {
      const res = await fetch('/api/appointments');
      if (!res.ok) {
        if (res.status === 401) router.push('/login');
        return;
      }
      const data = await res.json();
      setAppointments(data.appointments || []);
    } catch (error) {
      console.error('خطا در دریافت نوبت‌ها:', error);
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // وقتی کاربر از مرورگرِ درگاه پرداخت (که روی اپ نیتیو جدا از خودِ اپ باز
  // می‌شود) برگشت، بدون نیاز به رفرش دستی یا لاگین دوباره، لیست نوبت‌ها را
  // به‌روزرسانی کن — سشنِ خودِ اپ در این مدت اصلاً از بین نرفته بود.
  useOnBrowserReturn(fetchAppointments);

  useEffect(() => {
    // «paymentResult» زمانی ست می‌شه که verify فهمیده کاربر همون‌جا (وب) لاگین
    // بوده و مستقیم به این صفحه برگشته؛ روی اپ نیتیو این مسیر طی نمی‌شه و
    // کاربر نتیجه رو توی /payment/result می‌بینه (به middleware.ts نگاه کنید).
    const result = searchParams.get('paymentResult');
    if (result === 'success') {
      setNotice({ type: 'success', text: 'پرداخت با موفقیت انجام شد و نوبت شما قطعی شد.' });
    } else if (result === 'slotTaken') {
      setNotice({
        type: 'error',
        text:
          'پرداخت شما انجام شد اما متأسفانه این ساعت هم‌زمان توسط شخص دیگری رزرو شده بود، پس این نوبت لغو شد. مبلغ پرداختی‌تان به‌زودی توسط پشتیبانی بازگردانده می‌شود؛ در صورت نیاز از طریق بخش پشتیبانی پیگیری کنید.',
      });
    } else if (result === 'failed') {
      setNotice({ type: 'error', text: 'پرداخت ناموفق بود. لطفاً دوباره تلاش کنید.' });
    }
  }, [searchParams]);

  const handlePay = async (appt: Appointment) => {
    setPayingId(appt.id);
    try {
      const url = appt.isGroup ? `/api/booking-group/${appt.id}/pay` : `/api/booking/${appt.id}/pay`;
      const res = await fetch(url, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'خطا در اتصال به درگاه پرداخت');
        return;
      }
      await openPaymentUrl(data.paymentUrl);
    } catch {
      alert('خطای ارتباط با سرور');
    } finally {
      setPayingId(null);
    }
  };

  // تاریخ به شکل عددی شمسی، مثلاً «۱۴۰۵/۰۶/۱۵» — ماه و روز همیشه دو رقمی
  const formatDate = (isoDate: string) => {
    const parts = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date(isoDate));
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
    return `${get('year')}/${get('month')}/${get('day')}`;
  };

  const formatMoney = (amount: number) => amount.toLocaleString('fa-IR');

  // همه‌ی آیتم‌ها رو صاف می‌کنیم و بر اساس وضعیت + تاریخ به سه دسته تقسیم می‌کنیم.
  const { upcoming, past, cancelled } = useMemo(() => {
    const flat: FlatItem[] = appointments.flatMap((appt) =>
      appt.items.map((item) => ({ appt, item }))
    );

    const now = new Date();
    const upcoming: FlatItem[] = [];
    const past: FlatItem[] = [];
    const cancelled: FlatItem[] = [];

    for (const f of flat) {
      if (f.item.status === 'CANCELLED') {
        cancelled.push(f);
      } else if (getAppointmentDateTime(f.item) >= now) {
        upcoming.push(f);
      } else {
        past.push(f);
      }
    }

    // آینده: نزدیک‌ترین اول. گذشته و لغو‌شده: جدیدترین اول.
    upcoming.sort((a, b) => getAppointmentDateTime(a.item).getTime() - getAppointmentDateTime(b.item).getTime());
    past.sort((a, b) => getAppointmentDateTime(b.item).getTime() - getAppointmentDateTime(a.item).getTime());
    cancelled.sort((a, b) => getAppointmentDateTime(b.item).getTime() - getAppointmentDateTime(a.item).getTime());

    return { upcoming, past, cancelled };
  }, [appointments]);

  const listByTab: Record<TabKey, FlatItem[]> = { upcoming, past, cancelled };
  const emptyTextByTab: Record<TabKey, string> = {
    upcoming: 'نوبت پیش‌روی برای شما ثبت نشده است.',
    past: 'هنوز نوبت گذشته‌ای ندارید.',
    cancelled: 'نوبت لغو‌شده‌ای ندارید.',
  };

  // یک کارتِ نوبت — ردیف ۱: اسم سالن (راست) و قیمت کل (چپ، فقط اگر ثبت
  // شده باشه)؛ ردیف ۲: برای هر خدمت — اسم خدمت + پرسنل (با آیکون) و همون
  // تاریخ+ساعت (با یک دایره‌ی رنگ برند) در همون ردیف؛ بعد یک بوردر؛ زیر
  // بوردر وضعیت نوبت (راست) و لینک «مشاهده سالن» با رنگ برند (چپ).
  const renderCard = ({ appt, item }: FlatItem) => {
    const statusInfo = STATUS_LABELS[item.status];
    const isCancelled = item.status === 'CANCELLED';
    const isPending = appt.status === 'PENDING_PAYMENT' && item.status !== 'CANCELLED';
    const itemTotal = item.services.reduce((sum, s) => sum + (s.price || 0), 0);

    return (
      <div
        key={item.id}
        className={`bg-white rounded-2xl p-4 shadow-[0_2px_14px_rgba(0,0,0,0.09)] ${isCancelled ? 'opacity-70' : ''}`}
      >
        {/* ردیف ۱: اسم سالن سمت راست، قیمت کل سمت چپ */}
        <div className="flex items-center justify-between gap-3 mb-3">
          <p className="text-[15px] font-bold text-zinc-900 truncate">{appt.salon.name}</p>
          {itemTotal > 0 && (
            <span className="text-sm font-bold text-zinc-900 shrink-0">{formatMoney(itemTotal)} تومان</span>
          )}
        </div>

        {/* ردیف ۲: خدمت + پرسنل (با آیکون) و تاریخ+ساعت، همه در یک ردیف */}
        <div className="flex flex-col gap-1.5 mb-3">
          {item.services.map((s, idx) => (
            <div key={idx} className="flex items-center gap-3 flex-wrap text-xs text-zinc-700">
              <span className="flex items-center gap-1.5 min-w-0">
                <Scissors className="w-3.5 h-3.5 text-[#824c71] shrink-0" strokeWidth={1.75} />
                <span className="font-bold truncate">{s.name}</span>
              </span>
              {s.staffName && (
                <span className="flex items-center gap-1.5 min-w-0">
                  <UserIcon className="w-3.5 h-3.5 text-[#824c71] shrink-0" strokeWidth={1.75} />
                  <span className="font-bold truncate">{s.staffName}</span>
                </span>
              )}
              <span className="flex items-center gap-1.5 text-zinc-500 shrink-0">
                <span className="w-2 h-2 rounded-full bg-[#824c71] shrink-0" />
                <span className="whitespace-nowrap">
                  {formatDate(item.date)} - <span dir="ltr">{toPersianDigits(item.startTime)}</span>
                </span>
              </span>
            </div>
          ))}
        </div>

        {/* بوردر جداکننده */}
        <div className="border-t border-zinc-100 pt-3 flex items-center justify-between">
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium ${statusInfo.bgClassName} ${statusInfo.textClassName}`}>
            {statusInfo.label}
          </span>
          <Link href={`/salon/${appt.salon.id}`} className="text-xs font-bold text-[#824c71] hover:text-[#6e3f60] transition-colors">
            مشاهده سالن
          </Link>
        </div>

        {/* دکمه پرداخت فقط وقتی کل گروه در انتظار پرداخته — نه برای آیتم‌های لغو‌شده */}
        {isPending && (
          <button
            onClick={() => handlePay(appt)}
            disabled={payingId === appt.id}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-[10px] bg-[#824c71] text-white text-xs font-bold hover:bg-[#6e3f60] transition disabled:opacity-60 mt-3"
          >
            {payingId === appt.id && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            پرداخت و ثبت قطعی نوبت
          </button>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 text-[#824c71] animate-spin mb-4" />
        <p className="text-zinc-500 font-medium text-sm">در حال دریافت نوبت‌ها...</p>
      </div>
    );
  }

  const currentList = listByTab[activeTab];

  return (
    <div className="flex flex-col min-h-screen bg-white pb-24">
      {/* هدر — دقیقاً هم‌سبک با هدر صفحه‌ی پروفایل */}
      <div className="bg-white px-4 pt-6 pb-5">
        <div className="max-w-lg mx-auto">
          <h1 className="text-base font-bold text-zinc-900">نوبت‌های من</h1>
          <p className="text-xs text-zinc-500 mt-1">نوبت‌هایی که برای شما ثبت شده است</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto w-full px-4 mt-1">
        {notice && (
          <div
            className={`flex items-center gap-2 rounded-[10px] p-3.5 mb-5 text-sm font-medium ${
              notice.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
            }`}
          >
            {notice.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
            {notice.text}
          </div>
        )}

        {appointments.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-[#824c71]/10 flex items-center justify-center text-[#824c71] mx-auto mb-4">
              <CalendarX className="w-8 h-8" strokeWidth={1.5} />
            </div>
            <p className="text-zinc-500 text-sm">هنوز نوبتی برای شما ثبت نشده است.</p>
          </div>
        ) : (
          <>
            {/* تب‌های نوبت‌های آینده / گذشته / لغو‌شده — دقیقاً وسط صفحه */}
            <div className="flex justify-center mb-7">
              <div className="inline-flex items-center gap-1 bg-zinc-100 rounded-full p-1">
                {TABS.map((tab) => {
                const count = listByTab[tab.key].length;
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-colors ${
                      isActive ? 'bg-[#824c71] text-white' : 'text-zinc-500'
                    }`}
                  >
                    {tab.label}
                    {count > 0 && (
                      <span className={isActive ? 'text-white/70' : 'text-zinc-400'}>
                        {toPersianDigits(String(count))}
                      </span>
                    )}
                  </button>
                );
              })}
              </div>
            </div>

            {currentList.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-full bg-[#824c71]/10 flex items-center justify-center text-[#824c71] mx-auto mb-4">
                  <CalendarX className="w-8 h-8" strokeWidth={1.5} />
                </div>
                <p className="text-zinc-500 text-sm">{emptyTextByTab[activeTab]}</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {currentList.map(renderCard)}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function AppointmentsPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 text-[#824c71] animate-spin" />
      </div>
    }>
      <AppointmentsContent />
    </Suspense>
  );
}