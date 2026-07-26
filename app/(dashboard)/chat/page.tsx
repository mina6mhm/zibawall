// app/(dashboard)/chat/page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, User, Store, MessageCircle, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type AppointmentStatus = 'NEGOTIATING' | 'AWAITING_PAYMENT' | 'CONFIRMED' | 'CANCELLED';

type ChatItem = {
  id: string;
  status: AppointmentStatus;
  updatedAt: string;
  salon?: { name: string };
  customer?: { name: string | null; phone: string | null };
};

type TabKey = 'mine' | 'salon';

const STATUS_LABEL: Record<AppointmentStatus, { text: string; className: string }> = {
  NEGOTIATING: { text: 'در حال گفتگو', className: 'bg-amber-50 text-amber-600' },
  AWAITING_PAYMENT: { text: 'منتظر پرداخت', className: 'bg-blue-50 text-blue-600' },
  CONFIRMED: { text: 'تایید شده', className: 'bg-green-50 text-green-600' },
  CANCELLED: { text: 'لغو شده', className: 'bg-red-50 text-red-500' },
};

export default function ChatListPage() {
  const router = useRouter();
  const [userPhone, setUserPhone] = useState('');
  const [hasSalon, setHasSalon] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('mine');
  const [mine, setMine] = useState<ChatItem[]>([]);
  const [salonSide, setSalonSide] = useState<ChatItem[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [hidingId, setHidingId] = useState<string | null>(null);

  const fetchMine = useCallback(async (phone: string) => {
    const res = await fetch(`/api/appointment?scope=customer&userPhone=${phone}`);
    if (res.ok) {
      const data = await res.json();
      setMine(data.appointments || []);
    }
  }, []);

  const fetchSalonSide = useCallback(async (phone: string) => {
    const res = await fetch(`/api/appointment?scope=salon&userPhone=${phone}`);
    if (res.ok) {
      const data = await res.json();
      setSalonSide(data.appointments || []);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      const meRes = await fetch('/api/auth/me');
      if (!meRes.ok) {
        router.push('/login');
        return;
      }
      const user = await meRes.json();
      setUserPhone(user.phone);

      const profileRes = await fetch('/api/user/profile');
      let ownsSalon = false;
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        ownsSalon = !!profileData.salon;
        setHasSalon(ownsSalon);
      }

      await fetchMine(user.phone);
      if (ownsSalon) await fetchSalonSide(user.phone);
      setIsFetching(false);
    };
    init();
  }, [router, fetchMine, fetchSalonSide]);

  const handleHide = async (chatId: string, isSalonTab: boolean) => {
    if (!window.confirm('این گفتگو فقط برای شما حذف می‌شود. ادامه می‌دهید؟')) return;
    setHidingId(chatId);
    try {
      const res = await fetch(`/api/appointment/${chatId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userPhone, action: 'hide' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'خطا در حذف گفتگو');
      if (isSalonTab) {
        setSalonSide((prev) => prev.filter((c) => c.id !== chatId));
      } else {
        setMine((prev) => prev.filter((c) => c.id !== chatId));
      }
    } catch (error: any) {
      alert(error.message || 'خطایی رخ داد.');
    } finally {
      setHidingId(null);
    }
  };

  const list = activeTab === 'mine' ? mine : salonSide;

  return (
    <div className="flex flex-col min-h-screen bg-white pb-32">
      <div className="max-w-lg mx-auto w-full px-4 pt-6">
        <h1 className="text-base font-bold text-zinc-900 mb-5">چت</h1>

        {hasSalon && (
          <div className="flex items-center gap-1.5 bg-zinc-50 rounded-2xl p-1.5 mb-5">
            <button
              onClick={() => setActiveTab('mine')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-colors ${
                activeTab === 'mine' ? 'bg-white text-[#824c71] shadow-sm' : 'text-zinc-500'
              }`}
            >
              <User className="w-3.5 h-3.5" /> گفتگوهای من
            </button>
            <button
              onClick={() => setActiveTab('salon')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-colors ${
                activeTab === 'salon' ? 'bg-white text-[#824c71] shadow-sm' : 'text-zinc-500'
              }`}
            >
              <Store className="w-3.5 h-3.5" /> گفتگوهای سالن
            </button>
          </div>
        )}

        {isFetching ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-[#824c71] animate-spin mb-3" />
            <p className="text-sm text-zinc-400">در حال دریافت اطلاعات...</p>
          </div>
        ) : list.length === 0 ? (
          <div className="text-center py-16">
            <MessageCircle className="w-10 h-10 text-zinc-200 mx-auto mb-3" />
            <p className="text-sm text-zinc-400">هنوز گفتگویی وجود ندارد.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {list.map((item) => {
              const title =
                activeTab === 'salon'
                  ? item.customer?.name || item.customer?.phone || 'مشتری'
                  : item.salon?.name || 'سالن';
              const status = STATUS_LABEL[item.status];
              return (
                <div
                  key={item.id}
                  className="flex items-center gap-2 border border-zinc-100 rounded-2xl p-3.5 hover:border-zinc-200 transition-colors"
                >
                  <Link href={`/appointments/${item.id}`} className="flex-1 min-w-0 flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-zinc-900 truncate">{title}</span>
                    <span className={`text-[10px] px-2 py-1 rounded-full font-medium shrink-0 ${status.className}`}>
                      {status.text}
                    </span>
                  </Link>
                  <button
                    onClick={() => handleHide(item.id, activeTab === 'salon')}
                    disabled={hidingId === item.id}
                    className="w-8 h-8 shrink-0 flex items-center justify-center rounded-lg bg-zinc-50 text-zinc-400 hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-50"
                    title="حذف گفتگو"
                  >
                    {hidingId === item.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}