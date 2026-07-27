// app/appointments/new/page.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, Send, Loader2 } from 'lucide-react';

export default function NewAppointmentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const salonId = searchParams.get('salonId');

  const [userPhone, setUserPhone] = useState('');
  const [salonName, setSalonName] = useState('');
  const [isChecking, setIsChecking] = useState(true);
  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const init = async () => {
      if (!salonId) {
        router.push('/');
        return;
      }

      const meRes = await fetch('/api/auth/me');
      if (!meRes.ok) {
        router.push('/login');
        return;
      }
      const user = await meRes.json();
      setUserPhone(user.phone);

      // اگه از قبل گفتگوی بازی (با پیام) با همین سالن وجود داشته باشه، مستقیم بریم همونجا
      const listRes = await fetch(`/api/appointment?scope=customer&userPhone=${user.phone}`);
      if (listRes.ok) {
        const data = await listRes.json();
        const existing = (data.appointments || []).find(
          (a: any) => a.salon?.id === salonId && a.status !== 'CANCELLED'
        );
        if (existing) {
          router.replace(`/appointments/${existing.id}`);
          return;
        }
      }

      // نام سالن رو برای هدر بگیریم
      const salonRes = await fetch(`/api/salon/${salonId}`);
      if (salonRes.ok) {
        const salonData = await salonRes.json();
        setSalonName(salonData.name || 'سالن');
      }

      setIsChecking(false);
    };
    init();
  }, [salonId, router]);

  const handleMessageInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessageText(e.target.value);
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 120) + 'px';
    }
  };

  const handleSend = async () => {
    if (!messageText.trim() || !salonId) return;
    setIsSending(true);
    try {
      const res = await fetch('/api/appointment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerPhone: userPhone, salonId, firstMessage: messageText.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'خطا در شروع گفتگو');
      router.replace(`/appointments/${data.appointment.id}`);
    } catch (error: any) {
      alert(error.message || 'خطایی رخ داد.');
    } finally {
      setIsSending(false);
    }
  };

  if (isChecking) {
    return (
      <div className="flex flex-col items-center justify-center h-dvh">
        <Loader2 className="w-8 h-8 text-[#824c71] animate-spin mb-3" />
        <p className="text-sm text-zinc-400">در حال آماده‌سازی...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-dvh bg-white dir-rtl font-sans">
      <div className="shrink-0 flex items-center gap-3 px-4 py-3.5 border-b border-zinc-100">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-700 transition-colors"
        >
          <ArrowRight className="w-4 h-4" />
        </button>
        <span className="text-sm font-bold text-zinc-900">{salonName}</span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 flex items-center justify-center">
        <p className="text-sm text-zinc-400 text-center leading-relaxed">
          برای شروع نوبت‌دهی، پیام خود را برای «{salonName}» بنویسید.
          <br />
          نوبت شما تنها پس از ارسال این پیام ثبت می‌شود.
        </p>
      </div>

      <div className="shrink-0 flex items-end gap-2 px-4 py-3 border-t border-zinc-100 bg-white">
        <textarea
          ref={textareaRef}
          value={messageText}
          onChange={handleMessageInput}
          rows={1}
          placeholder="پیام خود را بنویسید..."
          className="flex-1 resize-none border border-zinc-200 rounded-2xl px-3.5 py-2.5 text-sm outline-none focus:border-[#824c71] max-h-[120px] leading-6"
        />
        <button
          onClick={handleSend}
          disabled={isSending || !messageText.trim()}
          className="w-11 h-11 shrink-0 flex items-center justify-center rounded-xl bg-[#824c71] text-white disabled:opacity-50"
        >
          {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}