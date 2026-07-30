// app/(dashboard)/my-salon/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Plus, Loader2, Calendar, Clock, Phone, User as UserIcon,
  Scissors, Trash2, Store, Settings,
} from 'lucide-react';
import NewBookingModal from '@/components/booking/NewBookingModal';

type ServiceItem = { name: string; price?: number };

type Booking = {
  id: string;
  customerName: string | null;
  customerPhone: string;
  date: string;
  startTime: string;
  services: ServiceItem[];
  staffName: string | null;
  depositAmount: number;
  appFee: number;
  totalAmount: number;
  status: 'PENDING_PAYMENT' | 'CONFIRMED' | 'CANCELLED';
  paymentStatus: 'PENDING' | 'SUCCESS' | 'FAILED';
};

const STATUS_LABELS: Record<Booking['status'], { label: string; className: string }> = {
  PENDING_PAYMENT: { label: 'در انتظار پرداخت مشتری', className: 'bg-amber-50 text-amber-700' },
  CONFIRMED: { label: 'قطعی شده', className: 'bg-emerald-50 text-emerald-700' },
  CANCELLED: { label: 'لغو شده', className: 'bg-zinc-100 text-zinc-500' },
};

export default function MySalonPage() {
  const router = useRouter();

  const [hasSalon, setHasSalon] = useState<boolean | null>(null);
  const [salonName, setSalonName] = useState('');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const profileRes = await fetch('/api/user/profile');
      if (!profileRes.ok) {
        if (profileRes.status === 401) router.push('/login');
        return;
      }
      const profileData = await profileRes.json();

      if (!profileData.salon) {
        setHasSalon(false);
        return;
      }

      setHasSalon(true);
      setSalonName(profileData.salon.name);

      const bookingsRes = await fetch('/api/booking');
      if (bookingsRes.ok) {
        const bookingsData = await bookingsRes.json();
        setBookings(bookingsData.bookings || []);
      }
    } catch (error) {
      console.error('خطا در دریافت اطلاعات:', error);
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = async (id: string) => {
    if (!window.confirm('آیا از حذف این نوبت مطمئن هستید؟')) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/booking?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setBookings((prev) => prev.filter((b) => b.id !== id));
      } else {
        const data = await res.json();
        alert(data.error || 'خطا در حذف نوبت');
      }
    } catch {
      alert('خطای ارتباط با سرور');
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (isoDate: string) =>
    new Date(isoDate).toLocaleDateString('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' });

  const formatMoney = (amount: number) => amount.toLocaleString('fa-IR');

  const todayStr = new Date().toISOString().slice(0, 10);

  const upcomingBookings = bookings
    .filter((b) => b.status !== 'CANCELLED' && b.date.slice(0, 10) >= todayStr)
    .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));

  const pastBookings = bookings
    .filter((b) => b.status === 'CANCELLED' || b.date.slice(0, 10) < todayStr)
    .sort((a, b) => (b.date + b.startTime).localeCompare(a.date + a.startTime));

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 text-[#824c71] animate-spin mb-4" />
        <p className="text-zinc-500 font-medium text-sm">در حال دریافت اطلاعات...</p>
      </div>
    );
  }

  if (hasSalon === false) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center gap-4">
        <Store className="w-12 h-12 text-zinc-300" />
        <p className="text-zinc-600 font-medium">شما هنوز کسب‌وکاری ثبت نکرده‌اید.</p>
        <Link
          href="/profile/business"
          className="bg-[#824c71] text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-[#6e3f60] transition"
        >
          ثبت کسب‌وکار
        </Link>
      </div>
    );
  }

  const renderBookingCard = (booking: Booking) => {
    const statusInfo = STATUS_LABELS[booking.status];
    return (
      <div key={booking.id} className="bg-white border border-zinc-100 rounded-2xl p-4 shadow-sm shadow-zinc-200/50">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 text-zinc-800">
            <UserIcon className="w-4 h-4 text-[#824c71]" />
            <span className="font-bold text-sm">{booking.customerName || 'بدون نام'}</span>
          </div>
          <span className={`text-[11px] font-medium px-2.5 py-1 rounded-lg whitespace-nowrap ${statusInfo.className}`}>
            {statusInfo.label}
          </span>
        </div>

        <div className="space-y-1.5 text-[13px] text-zinc-600 mb-3">
          <div className="flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5 text-zinc-400" />
            <span dir="ltr">{booking.customerPhone}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-zinc-400" />
            <span>{formatDate(booking.date)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-zinc-400" />
            <span dir="ltr">{booking.startTime}</span>
          </div>
          {booking.staffName && (
            <div className="flex items-center gap-1.5">
              <UserIcon className="w-3.5 h-3.5 text-zinc-400" />
              <span>پرسنل: {booking.staffName}</span>
            </div>
          )}
        </div>

        <div className="bg-zinc-50 rounded-xl p-3 mb-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Scissors className="w-3.5 h-3.5 text-[#824c71]" />
            <span className="text-xs font-bold text-zinc-700">خدمات</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {booking.services.map((s, idx) => (
              <span key={idx} className="bg-white px-2 py-1 rounded-md text-[11px] text-zinc-600 border border-zinc-100">
                {s.name}
                {s.price ? ` · ${formatMoney(s.price)} تومان` : ''}
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between text-[12px] text-zinc-500 border-t border-zinc-100 pt-2.5">
          <span>بیعانه: {formatMoney(booking.depositAmount)} تومان</span>
          <span>مبلغ کل: {formatMoney(booking.totalAmount)} تومان</span>
        </div>

        {booking.status !== 'CONFIRMED' && (
          <button
            onClick={() => handleDelete(booking.id)}
            disabled={deletingId === booking.id}
            className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-red-50 text-red-600 text-xs font-medium hover:bg-red-100 transition disabled:opacity-50"
          >
            {deletingId === booking.id ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Trash2 className="w-3.5 h-3.5" />
            )}
            حذف نوبت
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-3xl mx-auto pt-6 pb-32 px-4 md:pt-8 md:px-0">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-zinc-900">{salonName}</h1>
          <p className="text-zinc-500 text-xs md:text-sm mt-0.5">مدیریت نوبت‌های سالن</p>
        </div>
        <Link
          href="/profile/business/overview"
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-zinc-100 text-zinc-600 hover:bg-zinc-200 transition-colors shrink-0"
        >
          <Settings className="w-4.5 h-4.5" />
        </Link>
      </div>

      <button
        onClick={() => setIsModalOpen(true)}
        className="w-full flex items-center justify-center gap-2 bg-[#824c71] hover:bg-[#6e3f60] text-white py-3.5 rounded-xl font-medium text-sm transition-colors shadow-lg shadow-[#e3c9dc]/40 mb-6"
      >
        <Plus className="w-4.5 h-4.5" />
        ثبت نوبت جدید
      </button>

      <div className="mb-8">
        <h2 className="text-sm font-bold text-zinc-800 mb-3">
          نوبت‌های پیش‌رو {upcomingBookings.length > 0 && `(${upcomingBookings.length.toLocaleString('fa-IR')})`}
        </h2>
        {upcomingBookings.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {upcomingBookings.map(renderBookingCard)}
          </div>
        ) : (
          <div className="text-center py-10 bg-zinc-50 rounded-2xl">
            <p className="text-zinc-400 text-sm">هنوز نوبتی ثبت نشده است.</p>
          </div>
        )}
      </div>

      {pastBookings.length > 0 && (
        <div>
          <h2 className="text-sm font-bold text-zinc-800 mb-3">نوبت‌های گذشته / لغو شده</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 opacity-70">
            {pastBookings.map(renderBookingCard)}
          </div>
        </div>
      )}

      <NewBookingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={fetchData}
      />
    </div>
  );
}