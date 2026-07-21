// app/(dashboard)/profile/support/new/page.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, Send } from 'lucide-react';

export default function NewSupportMessagePage() {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    const trimmed = message.trim();
    if (!trimmed) return;

    setIsLoading(true);
    try {
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed }),
      });

      if (res.ok) {
        router.push('/profile/support');
      } else {
        const err = await res.json();
        alert(err.error || 'خطا در ارسال پیام');
      }
    } catch (error) {
      console.error(error);
      alert('خطای شبکه در ارتباط با سرور');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-white">

      {/* هدر */}
      <div className="sticky top-0 z-10 bg-white border-b border-zinc-100 px-4 py-3.5 flex items-center gap-3">
        <Link
          href="/profile/support"
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-zinc-100 transition-colors shrink-0"
        >
          <ChevronRight className="w-5 h-5 text-zinc-600" />
        </Link>
        <h1 className="text-base font-bold text-zinc-900">پیام جدید</h1>
      </div>

      <div className="max-w-lg mx-auto w-full px-4 py-5 flex-1">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value.slice(0, 2000))}
          placeholder="سوال یا مشکلتون رو اینجا بنویسید..."
          rows={8}
          autoFocus
          className="w-full bg-white border border-zinc-200 rounded-xl px-4 py-3 text-[14px] resize-none focus:border-[#824c71] focus:ring-2 focus:ring-[#824c71]/15 outline-none transition-all"
        />
        <div className="flex items-center justify-between mt-3">
          <span className="text-[11px] text-zinc-400">{message.length}/۲۰۰۰</span>
          <button
            onClick={handleSend}
            disabled={isLoading || !message.trim()}
            className="bg-[#824c71] text-white px-5 py-2.5 rounded-xl shadow-sm shadow-[#824c71]/30 hover:bg-[#6d3f5e] hover:shadow-md hover:shadow-[#824c71]/40 transition-all active:scale-[0.98] disabled:opacity-40 disabled:shadow-none disabled:cursor-not-allowed flex items-center gap-2 text-[14px] font-semibold"
          >
            <Send className="w-4 h-4" />
            {isLoading ? 'در حال ارسال...' : 'ارسال پیام'}
          </button>
        </div>
      </div>
    </div>
  );
}