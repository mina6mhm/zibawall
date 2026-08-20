// app/(dashboard)/appointments/page.tsx
'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Loader2, Calendar, Clock, Scissors, User as UserIcon, Store, CalendarX, CheckCircle2, XCircle,
} from 'lucide-react';

type AppointmentItem = {
  id: string;
  date: string;
  startTime: string;
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

const STATUS_LABELS: Record<Appointment['status'], { label: string; className: string }> = {
  PENDING_PAYMENT: { label: 'در انتظار پرداخت', className: 'bg-amber-50 text-amber-700' },
  CONFIRMED: { label: 'قطعی شده', className: 'bg-emerald-50 text-emerald-700' },
  CANCELLED: { label: 'لغو شده', className: 'bg-zinc-100 text-zinc-500' },
};

const toPersianDigits = (str: string) => str.replace(/[0-9]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);

function AppointmentsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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

  useEffect(() => {
    if (searchParams.get('paymentSuccess')) {
      setNotice({ type: 'success', text: 'پرداخت با موفقیت انجام شد و نوبت شما قطعی شد.' });
    } else if (searchParams.get('paymentFailed')) {
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
      window.location.href = data.paymentUrl;
    } catch {
      alert('خطای ارتباط با سرور');
    } finally {
      setPayingId(null);
    }
  };

  const formatDate = (isoDate: string) =>
    new Date(isoDate).toLocaleDateString('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' });

  const formatMoney = (amount: number) => amount.toLocaleString('fa-IR');

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 text-[#824c71] animate-spin mb-4" />
        <p className="text-zinc-500 font-medium text-sm">در حال دریافت نوبت‌ها...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto pt-8 pb-32 px-4 md:pt-10 md:px-0">
      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-zinc-900">نوبت‌های من</h1>
        <p className="text-zinc-500 text-xs md:text-sm mt-0.5">نوبت‌هایی که برای شما ثبت شده است</p>
      </div>

      {notice && (
        <div
          className={`flex items-center gap-2 rounded-xl p-3 mb-5 text-sm font-medium ${
            notice.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
          }`}
        >
          {notice.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
          {notice.text}
        </div>
      )}

      {appointments.length === 0 ? (
        <div className="text-center py-16 bg-zinc-50 rounded-2xl">
          <CalendarX className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
          <p className="text-zinc-400 text-sm">هنوز نوبتی برای شما ثبت نشده است.</p>
        </div>
      ) : (

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {appointments.flatMap((appt) => {
            const statusInfo = STATUS_LABELS[appt.status];

            return appt.items.map((it) => (
              <div key={it.id} className="bg-white border border-zinc-100 rounded-2xl p-4 shadow-sm shadow-zinc-200/50">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <Link
                    href={`/salon/${appt.salon.id}`}
                    className="flex items-center gap-2 text-zinc-800 hover:text-[#824c71] transition-colors"
                  >
                    <Store className="w-4 h-4 text-[#824c71] shrink-0" />
                    <span className="font-bold text-sm">{appt.salon.name}</span>
                  </Link>
                  <span className={`text-[11px] font-medium px-2.5 py-1 rounded-lg whitespace-nowrap ${statusInfo.className}`}>
                    {statusInfo.label}
                  </span>
                </div>

                <div className="bg-zinc-50 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 text-[12px] text-zinc-600 mb-2">
                    <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                    <span>{formatDate(it.date)}</span>
                    <span className="text-zinc-300">·</span>
                    <Clock className="w-3.5 h-3.5 text-zinc-400" />
                    <span dir="ltr">{toPersianDigits(it.startTime)}</span>
                  </div>

                  <div className="space-y-2">
                    {it.services.map((s, idx) => (
                      <div key={idx} className="bg-white rounded-lg border border-zinc-100 p-2.5">
                        <p className="text-[12.5px] font-bold text-zinc-800 mb-1.5">{s.name}</p>
                        <div className="flex flex-wrap gap-x-3 gap-y-1">
                          {s.price != null && (
                            <div className="flex items-center gap-1 text-[11px] text-zinc-500">
                              <span className="text-zinc-400">قیمت:</span>
                              <span className="font-medium text-zinc-700">{formatMoney(s.price)} تومان</span>
                            </div>
                          )}
                          {s.staffName && (
                            <div className="flex items-center gap-1 text-[11px] text-zinc-500">
                              <span className="text-zinc-400">پرسنل:</span>
                              <span className="font-medium text-zinc-700">{s.staffName}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {appt.status === 'PENDING_PAYMENT' && (
                  <button
                    onClick={() => handlePay(appt)}
                    disabled={payingId === appt.id}
                    className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#824c71] text-white text-xs font-bold hover:bg-[#6e3f60] transition disabled:opacity-60 mt-3"
                  >
                    {payingId === appt.id && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    پرداخت و ثبت قطعی نوبت
                  </button>
                )}
              </div>
            ));
          })}
        </div>
      )}
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