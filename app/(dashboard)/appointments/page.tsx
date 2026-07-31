// app/(dashboard)/appointments/page.tsx
'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Loader2, Calendar, Clock, Scissors, User as UserIcon, Store, CalendarX, CheckCircle2, XCircle,
} from 'lucide-react';

type AppointmentService = { name: string; price?: number; staffName?: string };

type Appointment = {
  id: string;
  date: string;
  startTime: string;
  services: AppointmentService[];
  depositAmount: number;
  appFee: number;
  totalAmount: number;
  status: 'PENDING_PAYMENT' | 'CONFIRMED' | 'CANCELLED';
  paymentStatus: 'PENDING' | 'SUCCESS' | 'FAILED';
  salon: { id: string; name: string; imageUrl: string; address: string };
};

const STATUS_LABELS: Record<Appointment['status'], { label: string; className: string }> = {
  PENDING_PAYMENT: { label: 'در انتظار پرداخت', className: 'bg-amber-50 text-amber-700' },
  CONFIRMED: { label: 'قطعی شده', className: 'bg-emerald-50 text-emerald-700' },
  CANCELLED: { label: 'لغو شده', className: 'bg-zinc-100 text-zinc-500' },
};

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

  const handlePay = async (id: string) => {
    setPayingId(id);
    try {
      const res = await fetch(`/api/booking/${id}/pay`, { method: 'POST' });
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
          {appointments.map((appt) => {
            const statusInfo = STATUS_LABELS[appt.status];
            const staffNames = Array.from(
              new Set(appt.services.filter((s) => s.staffName).map((s) => s.staffName as string))
            );

            return (
              <div key={appt.id} className="bg-white border border-zinc-100 rounded-2xl p-4 shadow-sm shadow-zinc-200/50">
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

                <div className="space-y-1.5 text-[13px] text-zinc-600 mb-3">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                    <span>{formatDate(appt.date)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-zinc-400" />
                    <span dir="ltr">{appt.startTime}</span>
                  </div>
                </div>

                <div className="bg-zinc-50 rounded-xl p-3 mb-3">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Scissors className="w-3.5 h-3.5 text-[#824c71]" />
                    <span className="text-xs font-bold text-zinc-700">خدمات</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {appt.services.map((s, idx) => (
                      <span key={idx} className="bg-white px-2 py-1 rounded-md text-[11px] text-zinc-600 border border-zinc-100">
                        {s.name}
                        {s.price ? ` · ${formatMoney(s.price)} تومان` : ''}
                      </span>
                    ))}
                  </div>
                  {staffNames.length > 0 && (
                    <div className="flex items-center gap-1.5 mt-2 text-[11px] text-zinc-500">
                      <UserIcon className="w-3 h-3" />
                      {staffNames.join('، ')}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between text-[12px] text-zinc-500 border-t border-zinc-100 pt-2.5 mb-3">
                  <span>بیعانه: {formatMoney(appt.depositAmount)} تومان</span>
                  <span>مبلغ قابل پرداخت: {formatMoney(appt.totalAmount)} تومان</span>
                </div>

                {appt.status === 'PENDING_PAYMENT' && (
                  <button
                    onClick={() => handlePay(appt.id)}
                    disabled={payingId === appt.id}
                    className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#824c71] text-white text-xs font-bold hover:bg-[#6e3f60] transition disabled:opacity-60"
                  >
                    {payingId === appt.id && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    پرداخت بیعانه و ثبت قطعی نوبت
                  </button>
                )}
              </div>
            );
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