// app/(dashboard)/chat/page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, User, Store, MessageCircle, Image as ImageIcon, Mic } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type AppointmentStatus = 'NEGOTIATING' | 'AWAITING_PAYMENT' | 'CONFIRMED' | 'CANCELLED';
type LastMessage = { message: string | null; type: 'TEXT' | 'IMAGE' | 'VOICE'; createdAt: string };

type ChatItem = {
  id: string;
  status: AppointmentStatus;
  updatedAt: string;
  seenByCustomer: boolean;
  seenBySalon: boolean;
  messages: LastMessage[];
  salon?: { name: string };
  customer?: { name: string | null; phone: string | null };
};

type TabKey = 'mine' | 'salon';

const STATUS_LABEL: Record<AppointmentStatus, { text: string; className: string }> = {
  NEGOTIATING: { text: 'در حال گفتگو', className: 'text-amber-600' },
  AWAITING_PAYMENT: { text: 'منتظر پرداخت', className: 'text-blue-600' },
  CONFIRMED: { text: 'تایید شده', className: 'text-green-600' },
  CANCELLED: { text: 'لغو شده', className: 'text-red-500' },
};

function lastMessagePreview(m?: LastMessage) {
  if (!m) return 'هنوز پیامی ارسال نشده';
  if (m.type === 'IMAGE') return '📷 عکس';
  if (m.type === 'VOICE') return '🎙 پیام صوتی';
  return m.message || '';
}

function lastMessageIcon(m?: LastMessage) {
  if (!m) return null;
  if (m.type === 'IMAGE') return <ImageIcon className="w-3 h-3 shrink-0" />;
  if (m.type === 'VOICE') return <Mic className="w-3 h-3 shrink-0" />;
  return null;
}

export default function ChatListPage() {
  const router = useRouter();
  const [hasSalon, setHasSalon] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('mine');
  const [mine, setMine] = useState<ChatItem[]>([]);
  const [salonSide, setSalonSide] = useState<ChatItem[]>([]);
  const [isFetching, setIsFetching] = useState(true);

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

  const list = activeTab === 'mine' ? mine : salonSide;

  return (
    <div className="flex flex-col min-h-screen bg-white pb-32">
      <div className="max-w-lg mx-auto w-full">
        <h1 className="text-base font-bold text-zinc-900 px-4 pt-6 mb-5">چت</h1>

        {hasSalon && (
          <div className="flex items-center gap-1.5 bg-zinc-50 rounded-2xl p-1.5 mb-2 mx-4">
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
          <div className="divide-y divide-zinc-100 border-t border-zinc-100">
            {list.map((item) => {
              const title =
                activeTab === 'salon'
                  ? item.customer?.name || item.customer?.phone || 'مشتری'
                  : item.salon?.name || 'سالن';
              const status = STATUS_LABEL[item.status];
              const lastMsg = item.messages?.[0];
              const isUnread = activeTab === 'salon' ? !item.seenBySalon : !item.seenByCustomer;

              return (
                <Link
                  key={item.id}
                  href={`/appointments/${item.id}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 transition-colors"
                >
                  <div className="w-11 h-11 shrink-0 rounded-full bg-[#824c71]/10 text-[#824c71] flex items-center justify-center font-bold text-sm">
                    {title?.charAt(0) || '؟'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-sm truncate ${isUnread ? 'font-bold text-zinc-900' : 'font-medium text-zinc-700'}`}>
                        {title}
                      </span>
                      <span className="text-[10px] text-zinc-400 shrink-0">
                        {new Date(item.updatedAt).toLocaleDateString('fa-IR', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <span
                        className={`flex items-center gap-1 text-xs truncate ${
                          isUnread ? 'text-zinc-700 font-medium' : 'text-zinc-400'
                        }`}
                      >
                        {lastMessageIcon(lastMsg)}
                        {lastMessagePreview(lastMsg)}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isUnread && <span className="w-2 h-2 rounded-full bg-[#824c71]" />}
                        <span className={`text-[10px] font-medium ${status.className}`}>{status.text}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}