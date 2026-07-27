//app/appointments/[id]/page.tsx
'use client';

import React, { useState, useEffect, useRef, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowRight, Loader2, Send, Calendar, Plus, Trash2, CheckCircle2, XCircle, X,
  MoreVertical, Reply, Image as ImageIcon, Mic, Check, CheckCheck,
} from 'lucide-react';
import DatePicker, { DateObject } from 'react-multi-date-picker';
import persian from 'react-date-object/calendars/persian';
import persian_fa from 'react-date-object/locales/persian_fa';

type AppointmentStatus = 'NEGOTIATING' | 'AWAITING_PAYMENT' | 'CONFIRMED' | 'CANCELLED';
type MessageType = 'TEXT' | 'IMAGE' | 'VOICE';
type ServiceItem = { name: string; price: number };
type Message = {
  id: string;
  message: string | null;
  type: MessageType;
  mediaUrl: string | null;
  duration: number | null;
  sender: 'CUSTOMER' | 'SALON';
  createdAt: string;
  seenAt: string | null;
  replyTo?: { id: string; message: string | null; type: MessageType; sender: 'CUSTOMER' | 'SALON' } | null;
};
type Appointment = {
  id: string;
  status: AppointmentStatus;
  visitDate: string | null;
  checkInTime: string | null;
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

const toEnglishDigits = (value: string) => {
  const persianDigits = '۰۱۲۳۴۵۶۷۸۹';
  const arabicDigits = '٠١٢٣٤٥٦٧٨٩';
  return value
    .split('')
    .map((ch) => {
      const p = persianDigits.indexOf(ch);
      if (p !== -1) return String(p);
      const a = arabicDigits.indexOf(ch);
      if (a !== -1) return String(a);
      return ch;
    })
    .join('');
};
const sanitizeDigits = (value: string) => toEnglishDigits(value).replace(/[^0-9]/g, '');

const STATUS_LABEL: Record<AppointmentStatus, { text: string; className: string }> = {
  NEGOTIATING: { text: 'در حال گفتگو', className: 'bg-amber-50 text-amber-600' },
  AWAITING_PAYMENT: { text: 'منتظر پرداخت', className: 'bg-blue-50 text-blue-600' },
  CONFIRMED: { text: 'تایید شده', className: 'bg-green-50 text-green-600' },
  CANCELLED: { text: 'لغو شده', className: 'bg-red-50 text-red-500' },
};

function buildSummaryLine(appointment: Appointment) {
  const parts: string[] = [];
  if (appointment.visitDate) parts.push(new Date(appointment.visitDate).toLocaleDateString('fa-IR'));
  if (appointment.checkInTime) parts.push(`ساعت ${appointment.checkInTime}`);
  const itemsText = appointment.services
    .map((s) => (s.price > 0 ? `${s.name} (${s.price.toLocaleString('fa-IR')} تومان)` : s.name))
    .join('، ');
  if (itemsText) parts.push(itemsText);
  return parts.join(' - ');
}

function replySnippet(m: { type: MessageType; message: string | null }) {
  if (m.type === 'IMAGE') return '📷 عکس';
  if (m.type === 'VOICE') return '🎙 پیام صوتی';
  return m.message || '';
}

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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteOptions, setShowDeleteOptions] = useState(false);
  const [isHiding, setIsHiding] = useState(false);

  const [replyTarget, setReplyTarget] = useState<Message | null>(null);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const [isFinalizing, setIsFinalizing] = useState(false);
  const [visitDateObj, setVisitDateObj] = useState<DateObject | null>(null);
  const [checkInTime, setCheckInTime] = useState('');
  const [services, setServices] = useState<ServiceRow[]>([emptyRow()]);
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

  useEffect(() => {
    if (!userPhone) return;
    const interval = setInterval(() => fetchAppointment(userPhone, true), 4000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userPhone]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [appointment?.messages.length]);

  const handleMessageInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessageText(e.target.value);
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 120) + 'px';
    }
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !userPhone) return;
    setIsSending(true);
    try {
      const res = await fetch(`/api/appointment/${id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userPhone,
          type: 'TEXT',
          message: messageText.trim(),
          replyToId: replyTarget?.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'خطا در ارسال پیام');
      setMessageText('');
      setReplyTarget(null);
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
      fetchAppointment(userPhone, true);
    } catch (error: any) {
      alert(error.message || 'خطایی رخ داد.');
    } finally {
      setIsSending(false);
    }
  };

  const handlePickImage = () => fileInputRef.current?.click();

  const handleImageSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !userPhone) return;
    setIsUploadingMedia(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('kind', 'image');
      const uploadRes = await fetch('/api/appointment/upload', { method: 'POST', body: formData });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.error || 'خطا در آپلود تصویر');

      const res = await fetch(`/api/appointment/${id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userPhone, type: 'IMAGE', mediaUrl: uploadData.url, replyToId: replyTarget?.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'خطا در ارسال تصویر');
      setReplyTarget(null);
      fetchAppointment(userPhone, true);
    } catch (error: any) {
      alert(error.message || 'خطایی رخ داد.');
    } finally {
      setIsUploadingMedia(false);
    }
  };

  const handleSendVoice = async (blob: Blob) => {
    if (!userPhone) return;
    setIsUploadingMedia(true);
    try {
      const formData = new FormData();
      formData.append('file', blob, 'voice.webm');
      formData.append('kind', 'voice');
      const uploadRes = await fetch('/api/appointment/upload', { method: 'POST', body: formData });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.error || 'خطا در آپلود صدا');

      const res = await fetch(`/api/appointment/${id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userPhone, type: 'VOICE', mediaUrl: uploadData.url, replyToId: replyTarget?.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'خطا در ارسال پیام صوتی');
      setReplyTarget(null);
      fetchAppointment(userPhone, true);
    } catch (error: any) {
      alert(error.message || 'خطایی رخ داد.');
    } finally {
      setIsUploadingMedia(false);
    }
  };

  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await handleSendVoice(blob);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch (error) {
      alert('دسترسی به میکروفون امکان‌پذیر نیست.');
    }
  };

  const handleStopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const handleHideChat = async (scope: 'me' | 'both') => {
    setIsHiding(true);
    try {
      const res = await fetch(`/api/appointment/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userPhone, action: 'hide', scope }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'خطا در حذف گفتگو');
      router.push('/chat');
    } catch (error: any) {
      alert(error.message || 'خطایی رخ داد.');
      setIsHiding(false);
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
    const validServices = services.filter((s) => s.name.trim());
    if (validServices.length === 0) {
      alert('حداقل یک آیتم معتبر وارد کنید.');
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
          services: validServices.map((s) => ({ name: s.name.trim(), price: sanitizeDigits(s.price) })),
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
      <div className="flex flex-col items-center justify-center h-dvh">
        <Loader2 className="w-8 h-8 text-[#824c71] animate-spin mb-3" />
        <p className="text-sm text-zinc-400">در حال دریافت اطلاعات...</p>
      </div>
    );
  }

  if (!appointment || !viewerRole) {
    return (
      <div className="flex flex-col items-center justify-center h-dvh">
        <p className="text-sm text-zinc-400">نوبت پیدا نشد.</p>
      </div>
    );
  }

  const isSalon = viewerRole === 'SALON';
  const statusInfo = STATUS_LABEL[appointment.status];
  const canChat = appointment.status !== 'CANCELLED';
  const headerTitle = isSalon ? (appointment.customer.name || appointment.customer.phone) : appointment.salon.name;
  const summaryLine = buildSummaryLine(appointment);

  return (
    <div className="flex flex-col h-dvh bg-white dir-rtl font-sans">
      {/* هدر ثابت بالا */}
      <div className="shrink-0 flex items-center justify-between px-4 py-3.5 border-b border-zinc-100">
        <button
          onClick={() => router.push('/chat')}
          className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-700 transition-colors"
        >
          <ArrowRight className="w-4 h-4" /> بازگشت
        </button>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-zinc-900">{headerTitle}</span>
          <span className={`text-[10px] px-2 py-1 rounded-full font-medium ${statusInfo.className}`}>{statusInfo.text}</span>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowMenu((v) => !v)}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-zinc-100 text-zinc-500 transition-colors"
          >
            <MoreVertical className="w-4.5 h-4.5" />
          </button>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute left-0 top-full mt-1 w-44 bg-white border border-zinc-100 rounded-xl shadow-lg py-1 z-20">
                <button
                  onClick={() => {
                    setShowMenu(false);
                    setShowDeleteOptions(true);
                  }}
                  className="w-full text-right px-3.5 py-2.5 text-xs font-medium text-red-500 hover:bg-red-50 flex items-center gap-2"
                >
                  <Trash2 className="w-3.5 h-3.5" /> حذف گفتگو
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* پنجره‌ی گزینه‌های حذف گفتگو */}
      {showDeleteOptions && (
        <div
          className="fixed inset-0 bg-black/40 z-30 flex items-end justify-center"
          onClick={() => setShowDeleteOptions(false)}
        >
          <div className="bg-white w-full max-w-lg rounded-t-2xl p-4 space-y-1.5" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm font-bold text-zinc-800 px-1 pb-2">حذف گفتگو</p>
            <button
              onClick={() => handleHideChat('me')}
              disabled={isHiding}
              className="w-full text-right px-3 py-3 rounded-xl text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 flex items-center justify-between"
            >
              حذف فقط برای من
              {isHiding && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            </button>
            <button
              onClick={() => handleHideChat('both')}
              disabled={isHiding}
              className="w-full text-right px-3 py-3 rounded-xl text-sm text-red-500 hover:bg-red-50 disabled:opacity-50 flex items-center justify-between"
            >
              حذف برای هر دو طرف
              {isHiding && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            </button>
            <button
              onClick={() => setShowDeleteOptions(false)}
              className="w-full text-center px-3 py-3 rounded-xl text-sm text-zinc-400 hover:bg-zinc-50"
            >
              انصراف
            </button>
          </div>
        </div>
      )}

      {/* محتوای قابل اسکرول */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {paymentResult === 'success' && (
          <div className="flex items-center gap-2 bg-green-50 text-green-700 rounded-xl p-3 text-xs font-medium">
            <CheckCircle2 className="w-4 h-4 shrink-0" /> پرداخت با موفقیت انجام شد؛ نوبت شما قطعی است.
          </div>
        )}
        {paymentResult === 'failed' && (
          <div className="flex items-center gap-2 bg-red-50 text-red-600 rounded-xl p-3 text-xs font-medium">
            <XCircle className="w-4 h-4 shrink-0" /> پرداخت ناموفق بود. می‌توانید دوباره تلاش کنید.
          </div>
        )}

        {summaryLine && (
          <div className="flex items-center gap-2 text-xs text-zinc-600 bg-zinc-50 rounded-xl px-3 py-2.5 overflow-x-auto whitespace-nowrap">
            <Calendar className="w-3.5 h-3.5 text-[#824c71] shrink-0" />
            {summaryLine}
          </div>
        )}

        {!isSalon && appointment.status === 'AWAITING_PAYMENT' && (
          <button
            onClick={handlePay}
            disabled={isPaying}
            className="w-full flex items-center justify-center gap-2 bg-[#824c71] text-white py-3 rounded-xl text-sm font-bold hover:bg-[#6d3f5e] transition-colors disabled:opacity-50"
          >
            {isPaying ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            ثبت نوبت
          </button>
        )}

        {isSalon && appointment.status !== 'CONFIRMED' && appointment.status !== 'CANCELLED' && !isFinalizing && (
          <button
            onClick={() => setIsFinalizing(true)}
            className="w-full flex items-center justify-center gap-2 bg-[#824c71] text-white py-3 rounded-xl text-sm font-bold hover:bg-[#6d3f5e] transition-colors"
          >
            ثبت جزئیات نوبت و ارسال برای پرداخت
          </button>
        )}

        {isFinalizing && (
          <div className="border border-zinc-200 rounded-2xl p-4 space-y-3 bg-zinc-50/60">
            <div className="grid grid-cols-2 gap-2">
              <div className="min-w-0">
                <label className="block text-xs font-medium text-zinc-500 mb-1.5">تاریخ نوبت *</label>
                <DatePicker
                  value={visitDateObj}
                  onChange={(date) => setVisitDateObj(date as DateObject)}
                  calendar={persian}
                  locale={persian_fa}
                  calendarPosition="bottom-right"
                  inputClass="w-full min-w-0 border border-zinc-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:border-[#824c71] outline-none"
                  containerClassName="w-full"
                  placeholder="انتخاب تاریخ"
                />
              </div>
              <div className="min-w-0">
                <label className="block text-xs font-medium text-zinc-500 mb-1.5">ساعت</label>
                <input
                  type="time"
                  value={checkInTime}
                  onChange={(e) => setCheckInTime(e.target.value)}
                  className="w-full min-w-0 border border-zinc-200 rounded-xl px-3 py-2.5 text-sm bg-white outline-none"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-medium text-zinc-500">آیتم‌ها *</label>
              {services.map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    value={s.name}
                    onChange={(e) => updateRow(i, 'name', e.target.value)}
                    placeholder="نام آیتم"
                    className="flex-1 border border-zinc-200 rounded-lg px-3 py-2 text-sm bg-white outline-none"
                  />
                  <input
                    value={s.price}
                    onChange={(e) => updateRow(i, 'price', sanitizeDigits(e.target.value))}
                    placeholder="قیمت (اختیاری)"
                    dir="ltr"
                    inputMode="numeric"
                    className="w-32 border border-zinc-200 rounded-lg px-3 py-2 text-sm bg-white text-left outline-none"
                  />
                  <button
                    onClick={() => removeRow(i)}
                    disabled={services.length === 1}
                    className="w-9 h-9 shrink-0 flex items-center justify-center rounded-lg bg-white border border-zinc-200 text-zinc-400 disabled:opacity-30"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              <button onClick={addRow} className="flex items-center gap-1.5 text-xs font-medium text-[#824c71]">
                <Plus className="w-3.5 h-3.5" /> افزودن آیتم
              </button>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handleSubmitFinalize}
                disabled={isSubmittingFinalize}
                className="flex-1 bg-[#824c71] text-white py-2.5 rounded-xl text-xs font-bold disabled:opacity-50"
              >
                {isSubmittingFinalize ? 'در حال ثبت...' : 'ثبت و ارسال لینک پرداخت'}
              </button>
              <button
                onClick={() => setIsFinalizing(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-zinc-500 bg-white border border-zinc-200"
              >
                انصراف
              </button>
            </div>
          </div>
        )}

        {appointment.messages.length === 0 ? (
          <p className="text-center text-xs text-zinc-400 py-10">هنوز پیامی رد و بدل نشده.</p>
        ) : (
          appointment.messages.map((m) => {
            const isMine = isSalon ? m.sender === 'SALON' : m.sender === 'CUSTOMER';
            return (
              <div key={m.id} className={`flex ${isMine ? 'justify-start' : 'justify-end'}`}>
                <div className="max-w-[75%] group relative">
                  {canChat && (
                    <button
                      onClick={() => setReplyTarget(m)}
                      className="absolute -top-2 -left-2 opacity-0 group-hover:opacity-100 w-6 h-6 rounded-full bg-white border border-zinc-200 flex items-center justify-center text-zinc-400 transition-opacity z-10"
                      title="پاسخ"
                    >
                      <Reply className="w-3 h-3" />
                    </button>
                  )}

                  {m.replyTo && (
                    <div
                      className={`mb-1 rounded-lg px-2.5 py-1.5 text-[11px] border-r-2 truncate ${
                        isMine ? 'bg-[#824c71]/5 border-[#824c71]/40 text-zinc-500' : 'bg-zinc-50 border-zinc-300 text-zinc-500'
                      }`}
                    >
                      {replySnippet(m.replyTo)}
                    </div>
                  )}

                  <div
                    className={`rounded-2xl px-3.5 py-2.5 text-sm break-words whitespace-pre-wrap ${
                      isMine ? 'bg-[#824c71]/10 text-[#6d3f5e] rounded-bl-sm' : 'bg-zinc-100 text-zinc-800 rounded-br-sm'
                    }`}
                  >
                    {m.type === 'IMAGE' && m.mediaUrl && (
                      <img src={m.mediaUrl} alt="عکس" className="rounded-lg max-w-full mb-1" />
                    )}
                    {m.type === 'VOICE' && m.mediaUrl && (
                      <audio controls src={m.mediaUrl} className="max-w-full" />
                    )}
                    {m.message && <div>{m.message}</div>}

                    <div className="flex items-center justify-end gap-1 mt-1">
                      <span className="text-[10px] text-zinc-400">
                        {new Date(m.createdAt).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {isMine &&
                        (m.seenAt ? (
                          <CheckCheck className="w-3.5 h-3.5 text-blue-400" />
                        ) : (
                          <Check className="w-3.5 h-3.5 text-zinc-400" />
                        ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* نوار ارسال پیام، ثابت پایین صفحه */}
      {canChat && (
        <div className="shrink-0 border-t border-zinc-100 bg-white">
          {replyTarget && (
            <div className="flex items-center justify-between px-4 py-2 bg-zinc-50 border-b border-zinc-100">
              <div className="text-xs text-zinc-500 truncate">پاسخ به: {replySnippet(replyTarget)}</div>
              <button onClick={() => setReplyTarget(null)} className="text-zinc-400 hover:text-zinc-600 shrink-0 ml-2">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          <div className="flex items-end gap-2 px-4 py-3">
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelected} />
            <button
              onClick={handlePickImage}
              disabled={isUploadingMedia || isRecording}
              className="w-10 h-10 shrink-0 flex items-center justify-center rounded-xl bg-zinc-50 text-zinc-500 disabled:opacity-50"
            >
              <ImageIcon className="w-4.5 h-4.5" />
            </button>

            <textarea
              ref={textareaRef}
              value={messageText}
              onChange={handleMessageInput}
              rows={1}
              placeholder="پیام خود را بنویسید..."
              disabled={isRecording}
              className="flex-1 resize-none border border-zinc-200 rounded-2xl px-3.5 py-2.5 text-sm outline-none focus:border-[#824c71] max-h-[120px] leading-6 disabled:opacity-50"
            />

            {messageText.trim() ? (
              <button
                onClick={handleSendMessage}
                disabled={isSending}
                className="w-11 h-11 shrink-0 flex items-center justify-center rounded-xl bg-[#824c71] text-white disabled:opacity-50"
              >
                {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            ) : (
              <button
                onClick={isRecording ? handleStopRecording : handleStartRecording}
                disabled={isUploadingMedia}
                className={`w-11 h-11 shrink-0 flex items-center justify-center rounded-xl text-white disabled:opacity-50 transition-colors ${
                  isRecording ? 'bg-red-500' : 'bg-[#824c71]'
                }`}
              >
                {isUploadingMedia ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mic className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}