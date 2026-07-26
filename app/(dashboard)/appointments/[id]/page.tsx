//app/(dashboard)/appointments/[id]/page.tsx
'use client';

import React, { useState, useEffect, useRef, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowRight, Loader2, Send, Calendar, Clock, Plus, Trash2, CheckCircle2, XCircle, Wallet,
} from 'lucide-react';
import DatePicker, { DateObject } from 'react-multi-date-picker';
import persian from 'react-date-object/calendars/persian';
import persian_fa from 'react-date-object/locales/persian_fa';

type AppointmentStatus = 'NEGOTIATING' | 'AWAITING_PAYMENT' | 'CONFIRMED' | 'CANCELLED';
type ServiceItem = { name: string; price: number };
type Message = { id: string; message: string; sender: 'CUSTOMER' | 'SALON'; createdAt: string };
type Appointment = {
  id: string;
  status: AppointmentStatus;
  visitDate: string | null;
  checkInTime: string | null;
  checkOutTime: string | null;
  services: ServiceItem[];
  totalAmount: number;
  depositAmount: number;
  depositStatus: 'PENDING' | 'SUCCESS' | 'FAILED';
  salon: { id: string; name: string; imageUrl: string };
  customer: { name: string | null; phone: string | null };
  messages: Message[];
};

type ServiceRow = { name: string; price: string };
const emptyRow = (): ServiceRow => ({ name: '', price: '' });

const STATUS_LABEL: Record<AppointmentStatus, { text: string; className: string }> = {
  NEGOTIATING: { text: 'در حال گفتگو', className: 'bg-amber-50 text-amber-600' },
  AWAITING_PAYMENT: { text: 'منتظر پرداخت', className: 'bg-blue-50 text-blue-600' },
  CONFIRMED: { text: 'تایید شده', className: 'bg-green-50 text-green-600' },
  CANCELLED: { text: 'لغو شده', className: 'bg-red-50 text-red-500' },
};

export default function AppointmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const paymentResult = searchParams.get('payment');

  const [userPhone, setUserPhone] = useState('');
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [viewerRole, setViewerRole] = useState<'CUSTOMER' | 'SALON' | null>(null);
  const [isFetching, setIsFetching] = useState(true);

  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [isFinalizing, setIsFinalizing] = useState(false);
  const [visitDateObj, setVisitDateObj] = useState<DateObject | null>(null);
  const [checkInTime, setCheckInTime] = useState('');
  const [checkOutTime, setCheckOutTime] = useState('');
  const [services, setServices] = useState<ServiceRow[]>([emptyRow()]);
  const [depositAmount, setDepositAmount] = useState('30000');
  const [isSubmittingFinalize, setIsSubmittingFinalize] = useState(false);
  const [isPaying, setIsPaying] = useState(false);

  const fetchAppointment = async (phone: string, silent = false) => {
    if (!silent) setIsFetching(true);
    try {
      const res = await fetch(`/api/appointment/${id}?userPhone=${phone}`);
      if (res.ok) {
        const data = await res.json();
        setAppointment(data.appointment);
        setViewerRole(data.viewerRole);
      }
    } catch (error) {
      console.error('خطا در دریافت نوبت:', error);
    } finally {
      if (!silent) setIsFetching(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      const meRes = await fetch('/api/auth/me');
      if (!meRes.ok) {
        router.push('/login');
        return;
      }
      const user = await meRes.json();
      setUserPhone(user.phone);
      await fetchAppointment(user.phone);
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, router]);

  // به‌روزرسانی دوره‌ای برای دریافت پیام‌های جدید طرف مقابل
  useEffect(() => {
    if (!userPhone) return;
    const interval = setInterval(() => fetchAppointment(userPhone, true), 4000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userPhone]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [appointment?.messages.length]);

  const handleSendMessage = async () => {
    if (!messageText.trim() || !userPhone) return;
    setIsSending(true);
    try {
      const res = await fetch(`/api/appointment/${id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userPhone, message: messageText.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'خطا در ارسال پیام');
      setMessageText('');
      fetchAppointment(userPhone, true);
    } catch (error: any) {
      alert(error.message || 'خطایی رخ داد.');
    } finally {
      setIsSending(false);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('آیا از لغو این نوبت مطمئن هستید؟')) return;
    try {
      const res = await fetch(`/api/appointment/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userPhone, action: 'cancel' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'خطا در لغو نوبت');
      fetchAppointment(userPhone);
    } catch (error: any) {
      alert(error.message || 'خطایی رخ داد.');
    }
  };

  const addRow = () => setServices([...services, emptyRow()]);
  const removeRow = (i: number) => {
    if (services.length > 1) setServices(services.filter((_, idx) => idx !== i));
  };
  const updateRow = (i: number, field: keyof ServiceRow, value: string) => {
    const updated = [...services];
    updated[i] = { ...updated[i], [field]: value };
    setServices(updated);
  };

  const handleSubmitFinalize = async () => {
    if (!visitDateObj) {
      alert('تاریخ نوبت الزامی است.');
      return;
    }
    const validServices = services.filter((s) => s.name.trim() && Number(s.price) > 0);
    if (validServices.length === 0) {
      alert('حداقل یک خدمت معتبر وارد کنید.');
      return;
    }

    setIsSubmittingFinalize(true);
    try {
      const gregorianDate = visitDateObj.toDate();
      const res = await fetch(`/api/appointment/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userPhone,
          action: 'finalize',
          visitDate: gregorianDate.toISOString(),
          checkInTime: checkInTime || undefined,
          checkOutTime: checkOutTime || undefined,
          services: validServices.map((s) => ({ name: s.name.trim(), price: Number(s.price) })),
          depositAmount: Number(depositAmount) || 30000,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'خطا در ثبت جزئیات نوبت');
      setIsFinalizing(false);
      fetchAppointment(userPhone);
    } catch (error: any) {
      alert(error.message || 'خطایی رخ داد.');
    } finally {
      setIsSubmittingFinalize(false);
    }
  };

  const handlePay = async () => {
    setIsPaying(true);
    try {
      const res = await fetch(`/api/appointment/${id}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userPhone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'خطا در اتصال به درگاه پرداخت');
      window.location.href = data.paymentUrl;
    } catch (error: any) {
      alert(error.message || 'خطایی رخ داد.');
      setIsPaying(false);
    }
  };

  if (isFetching) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-[#824c71] animate-spin mb-3" />
        <p className="text-sm text-zinc-400">در حال دریافت اطلاعات...</p>
      </div>
    );
  }

  if (!appointment || !viewerRole) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <p className="text-sm text-zinc-400">نوبت پیدا نشد.</p>
      </div>
    );
  }

  const isSalon = viewerRole === 'SALON';
  const statusInfo = STATUS_LABEL[appointment.status];
  const canChat = appointment.status !== 'CANCELLED';
  const headerTitle = isSalon ? (appointment.customer.name || appointment.customer.phone) : appointment.salon.name;

  return (
    <div className="flex flex-col h-screen bg-white">
      <div className="max-w-lg mx-auto w-full flex flex-col h-full px-4">
        {/* هدر */}
        <div className="shrink-0 flex items-center justify-between pt-6 pb-4 border-b border-zinc-100">
          <button
            onClick={() => router.push('/appointments')}
            className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-700 transition-colors"
          >
            <ArrowRight className="w-4 h-4" /> بازگشت
          </button>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-zinc-900">{headerTitle}</span>
            <span className={`text-[10px] px-2 py-1 rounded-full font-medium ${statusInfo.className}`}>{statusInfo.text}</span>
          </div>
        </div>

        {/* بنر نتیجه پرداخت (بعد از برگشت از زرین‌پال) */}
        {paymentResult === 'success' && (
          <div className="shrink-0 mt-3 flex items-center gap-2 bg-green-50 text-green-700 rounded-xl p-3 text-xs font-medium">
            <CheckCircle2 className="w-4 h-4" /> پرداخت با موفقیت انجام شد؛ نوبت شما قطعی است.
          </div>
        )}
        {paymentResult === 'failed' && (
          <div className="shrink-0 mt-3 flex items-center gap-2 bg-red-50 text-red-600 rounded-xl p-3 text-xs font-medium">
            <XCircle className="w-4 h-4" /> پرداخت ناموفق بود. می‌توانید دوباره تلاش کنید.
          </div>
        )}

        {/* خلاصه نوبت (وقتی جزئیات ثبت شده) */}
        {appointment.visitDate && (
          <div className="shrink-0 mt-3 border border-zinc-100 rounded-2xl p-4">
            <div className="flex items-center gap-3 text-xs text-zinc-500 mb-2">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> {new Date(appointment.visitDate).toLocaleDateString('fa-IR')}
              </span>
              {appointment.checkInTime && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> {appointment.checkInTime} - {appointment.checkOutTime || '—'}
                </span>
              )}
            </div>
            <div className="space-y-1.5 mb-2">
              {appointment.services.map((s, i) => (
                <div key={i} className="flex items-center justify-between text-xs bg-zinc-50 rounded-lg px-3 py-2">
                  <span className="text-zinc-600">{s.name}</span>
                  <span className="font-medium text-zinc-800">{s.price.toLocaleString('fa-IR')} ت</span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-zinc-100 text-xs">
              <span className="text-zinc-500">مبلغ کل خدمات</span>
              <span className="font-bold text-[#824c71]">{appointment.totalAmount.toLocaleString('fa-IR')} تومان</span>
            </div>
          </div>
        )}

        {/* دکمه پرداخت برای مشتری */}
        {!isSalon && appointment.status === 'AWAITING_PAYMENT' && (
          <button
            onClick={handlePay}
            disabled={isPaying}
            className="shrink-0 mt-3 w-full flex items-center justify-center gap-2 bg-[#824c71] text-white py-3 rounded-xl text-sm font-bold hover:bg-[#6d3f5e] transition-colors disabled:opacity-50"
          >
            {isPaying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
            پرداخت بیعانه {appointment.depositAmount.toLocaleString('fa-IR')} تومان
          </button>
        )}

        {/* دکمه ثبت جزئیات برای سالن‌دار */}
        {isSalon && appointment.status !== 'CONFIRMED' && appointment.status !== 'CANCELLED' && !isFinalizing && (
          <button
            onClick={() => setIsFinalizing(true)}
            className="shrink-0 mt-3 w-full flex items-center justify-center gap-2 bg-[#824c71] text-white py-3 rounded-xl text-sm font-bold hover:bg-[#6d3f5e] transition-colors"
          >
            ثبت جزئیات نوبت و ارسال برای پرداخت
          </button>
        )}

        {/* فرم نهایی‌سازی (سالن‌دار) */}
        {isFinalizing && (
          <div className="shrink-0 mt-3 border border-zinc-200 rounded-2xl p-4 space-y-3 bg-zinc-50/60">
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1.5">تاریخ نوبت *</label>
              <DatePicker
                value={visitDateObj}
                onChange={(date) => setVisitDateObj(date as DateObject)}
                calendar={persian}
                locale={persian_fa}
                calendarPosition="bottom-right"
                inputClass="w-full border border-zinc-200 rounded-xl px-3.5 py-2.5 text-sm bg-white focus:border-[#824c71] outline-none"
                containerClassName="w-full"
                placeholder="انتخاب تاریخ"
              />
            </div>
            <div className="flex items-center gap-2 border border-zinc-200 rounded-xl px-3.5 py-2 bg-white">
              <input type="time" value={checkInTime} onChange={(e) => setCheckInTime(e.target.value)} className="flex-1 text-sm outline-none bg-transparent" />
              <span className="text-zinc-300 text-xs shrink-0">تا</span>
              <input type="time" value={checkOutTime} onChange={(e) => setCheckOutTime(e.target.value)} className="flex-1 text-sm outline-none bg-transparent" />
            </div>

            <div className="space-y-2">
              {services.map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    value={s.name}
                    onChange={(e) => updateRow(i, 'name', e.target.value)}
                    placeholder="نام خدمت"
                    className="flex-1 border border-zinc-200 rounded-lg px-3 py-2 text-sm bg-white outline-none"
                  />
                  <input
                    value={s.price}
                    onChange={(e) => updateRow(i, 'price', e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="قیمت"
                    dir="ltr"
                    inputMode="numeric"
                    className="w-28 border border-zinc-200 rounded-lg px-3 py-2 text-sm bg-white text-left outline-none"
                  />
                  <button onClick={() => removeRow(i)} disabled={services.length === 1} className="w-9 h-9 shrink-0 flex items-center justify-center rounded-lg bg-white border border-zinc-200 text-zinc-400 disabled:opacity-30">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              <button onClick={addRow} className="flex items-center gap-1.5 text-xs font-medium text-[#824c71]">
                <Plus className="w-3.5 h-3.5" /> افزودن خدمت
              </button>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1.5">مبلغ بیعانه (تومان)</label>
              <input
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value.replace(/[^0-9]/g, ''))}
                dir="ltr"
                inputMode="numeric"
                className="w-full border border-zinc-200 rounded-xl px-3.5 py-2.5 text-sm bg-white outline-none"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handleSubmitFinalize}
                disabled={isSubmittingFinalize}
                className="flex-1 bg-[#824c71] text-white py-2.5 rounded-xl text-xs font-bold disabled:opacity-50"
              >
                {isSubmittingFinalize ? 'در حال ثبت...' : 'ثبت و ارسال لینک پرداخت'}
              </button>
              <button onClick={() => setIsFinalizing(false)} className="px-4 py-2.5 rounded-xl text-xs font-bold text-zinc-500 bg-white border border-zinc-200">
                انصراف
              </button>
            </div>
          </div>
        )}

        {/* پیام‌ها */}
        <div className="flex-1 overflow-y-auto py-4 space-y-2.5">
          {appointment.messages.length === 0 ? (
            <p className="text-center text-xs text-zinc-400 py-10">هنوز پیامی رد و بدل نشده. گفتگو رو شروع کنید.</p>
          ) : (
            appointment.messages.map((m) => {
              const isMine = isSalon ? m.sender === 'SALON' : m.sender === 'CUSTOMER';
              return (
                <div key={m.id} className={`flex ${isMine ? 'justify-start' : 'justify-end'}`}>
                  <div
                    className={`max-w-[75%] rounded-2xl px-3.5 py-2.5 text-sm ${
                      isMine ? 'bg-[#824c71] text-white rounded-bl-sm' : 'bg-zinc-100 text-zinc-800 rounded-br-sm'
                    }`}
                  >
                    {m.message}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* اینپوت ارسال پیام */}
        {canChat && (
          <div className="shrink-0 flex items-center gap-2 pb-6 pt-2 border-t border-zinc-100">
            <input
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="پیام خود را بنویسید..."
              className="flex-1 border border-zinc-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-[#824c71]"
            />
            <button
              onClick={handleSendMessage}
              disabled={isSending || !messageText.trim()}
              className="w-11 h-11 shrink-0 flex items-center justify-center rounded-xl bg-[#824c71] text-white disabled:opacity-50"
            >
              {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        )}

        {appointment.status !== 'CANCELLED' && appointment.status !== 'CONFIRMED' && (
          <button onClick={handleCancel} className="shrink-0 mb-4 text-xs font-medium text-red-500 text-center">
            لغو این نوبت
          </button>
        )}
      </div>
    </div>
  );
}
