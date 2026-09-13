// app/(dashboard)/profile/page.tsx
'use client';
 
import React, { useState, useEffect } from 'react';
import { User, Phone, LogOut, Store, MessageCircle, ShieldCheck, ChevronLeft, AtSign, Bell, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type PushState = 'checking' | 'unsupported' | 'denied' | 'subscribed' | 'not-subscribed';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
 
export default function ProfilePage() {
  const router = useRouter();
  const [userData, setUserData] = useState({ name: '', phone: '', username: '', role: '' });
  const [salonData, setSalonData] = useState<any>(null);

  // ── وضعیت نوتیف مرورگر — یه سوییچ ساده، بدون رفتن به صفحه‌ی جدید ──
  const [pushState, setPushState] = useState<PushState>('checking');
  const [pushBusy, setPushBusy] = useState(false);
 
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch('/api/user/profile');
        if (res.ok) {
          const data = await res.json();
          setUserData({
            name: data.name || '',
            phone: data.phone || '',
            username: data.username || '',
            role: data.role || 'USER'
          });
          setSalonData(data.salon);
        } else if (res.status === 401) {
          router.push('/login');
        }
      } catch (error) {
        console.error('خطا در دریافت اطلاعات:', error);
      }
    };
    fetchProfile();
  }, [router]);

  useEffect(() => {
    const checkPush = async () => {
      if (
        typeof window === 'undefined' ||
        !('serviceWorker' in navigator) ||
        !('PushManager' in window) ||
        !('Notification' in window)
      ) {
        setPushState('unsupported');
        return;
      }
      if (Notification.permission === 'denied') {
        setPushState('denied');
        return;
      }
      try {
        const registration = await navigator.serviceWorker.getRegistration('/sw.js');
        const existingSub = registration ? await registration.pushManager.getSubscription() : null;
        setPushState(existingSub ? 'subscribed' : 'not-subscribed');
      } catch {
        setPushState('not-subscribed');
      }
    };
    checkPush();
  }, []);
 
  const handleLogout = async () => {
    if (!window.confirm('آیا می‌خواهید از حساب خود خارج شوید؟')) return;
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {}
    router.push('/login');
    router.refresh();
  };

  const handleEnablePush = async () => {
    setPushBusy(true);
    try {
      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) { setPushBusy(false); return; }

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setPushState(permission === 'denied' ? 'denied' : 'not-subscribed');
        setPushBusy(false);
        return;
      }

      const registration = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
      }

      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: subscription.toJSON() }),
      });

      setPushState(res.ok ? 'subscribed' : 'not-subscribed');
    } catch (err) {
      console.error('خطا در فعال‌سازی نوتیف:', err);
    } finally {
      setPushBusy(false);
    }
  };

  const handleDisablePush = async () => {
    setPushBusy(true);
    try {
      const registration = await navigator.serviceWorker.getRegistration('/sw.js');
      const subscription = registration ? await registration.pushManager.getSubscription() : null;
      if (subscription) {
        const endpoint = subscription.endpoint;
        await subscription.unsubscribe();
        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint }),
        }).catch(() => {});
      }
      setPushState('not-subscribed');
    } catch (err) {
      console.error('خطا در غیرفعال‌سازی نوتیف:', err);
    } finally {
      setPushBusy(false);
    }
  };

  const handleTogglePush = () => {
    if (pushBusy || pushState === 'checking' || pushState === 'unsupported') return;
    if (pushState === 'denied') {
      alert('دسترسی اعلان‌ها برای این سایت مسدود شده. برای فعال کردنش باید از تنظیمات مرورگرت اجازه بدی.');
      return;
    }
    if (pushState === 'subscribed') {
      handleDisablePush();
    } else {
      handleEnablePush();
    }
  };
 
  const menuItems = [
    {
      key: 'info',
      label: 'اطلاعات کاربری',
      desc: 'مشاهده و ویرایش اطلاعات حساب',
      icon: User,
      href: '/profile/info',
    },
    {
      key: 'business',
      label: salonData ? 'کسب‌وکار من' : 'ثبت کسب‌وکار',
      desc: 'مدیریت کسب‌وکار و آگهی‌ها',
      icon: Store,
      href: salonData ? '/profile/business/overview' : '/profile/business',
    },
    {
      key: 'support',
      label: 'پشتیبانی',
      desc: 'ارتباط با تیم پشتیبانی',
      icon: MessageCircle,
      href: '/profile/support',
    },
  ];

  const pushIsOn = pushState === 'subscribed';
 
  return (
    <div className="flex flex-col min-h-screen bg-white pb-24">
 
      {/* هدر */}
      <div className="bg-white px-4 pt-6 pb-5">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-3.5">
            <div className="w-16 h-16 rounded-full bg-[#824c71]/10 flex items-center justify-center text-[#824c71] shrink-0">
              <User className="w-8 h-8" strokeWidth={1.5} />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-bold text-zinc-900 truncate">{userData.name || 'کاربر عزیز'}</h1>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap text-xs text-zinc-500">
                {userData.phone && (
                  <span className="flex items-center gap-1" dir="ltr">
                    <Phone className="w-3 h-3" />{userData.phone}
                  </span>
                )}
                {userData.phone && userData.username && (
                  <span className="text-zinc-300">|</span>
                )}
                {userData.username && (
                  <span className="flex items-center gap-1">
                    <AtSign className="w-3 h-3" />{userData.username}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
 
      {/* منو */}
      <div className="max-w-lg mx-auto w-full px-4 mt-1">

        {userData.role === 'ADMIN' && (
          <Link
            href="/admin"
            className="flex items-center gap-3 bg-[#824c71] px-4 py-3.5 rounded-2xl mb-3"
          >
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center text-white shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white">پنل مدیریت</p>
              <p className="text-[11px] text-white/70 mt-0.5">مدیریت حساب، کسب‌وکار و پشتیبانی</p>
            </div>
            <ChevronLeft className="w-4.5 h-4.5 text-white/70 shrink-0" />
          </Link>
        )}

        <div className="divide-y divide-zinc-100">
          {/* اطلاعات کاربری */}
          <Link
            href={menuItems[0].href}
            className="flex items-center gap-3 py-3.5 hover:bg-zinc-50 transition-colors"
          >
            <User className="w-5 h-5 text-[#824c71] shrink-0" strokeWidth={1.75} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-zinc-800">{menuItems[0].label}</p>
              <p className="text-[11px] text-zinc-400 mt-0.5">{menuItems[0].desc}</p>
            </div>
            <ChevronLeft className="w-4.5 h-4.5 text-zinc-300 shrink-0" />
          </Link>

          {/* کسب‌وکار من */}
          <Link
            href={menuItems[1].href}
            className="flex items-center gap-3 py-3.5 hover:bg-zinc-50 transition-colors"
          >
            <Store className="w-5 h-5 text-[#824c71] shrink-0" strokeWidth={1.75} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-zinc-800">{menuItems[1].label}</p>
              <p className="text-[11px] text-zinc-400 mt-0.5">{menuItems[1].desc}</p>
            </div>
            <ChevronLeft className="w-4.5 h-4.5 text-zinc-300 shrink-0" />
          </Link>

          {/* اعلان‌ها — آیکون راست، سوییچ چپ، بدون رفتن به صفحه‌ی جدید */}
          {pushState !== 'unsupported' && (
            <button
              type="button"
              onClick={handleTogglePush}
              disabled={pushBusy || pushState === 'checking'}
              className="w-full flex items-center gap-3 py-3.5 hover:bg-zinc-50 transition-colors text-right disabled:opacity-60"
            >
              <Bell className="w-5 h-5 text-[#824c71] shrink-0" strokeWidth={1.75} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-zinc-800">اعلان‌ها</p>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  {pushState === 'denied'
                    ? 'مسدود شده — از تنظیمات مرورگر فعالش کن'
                    : pushIsOn
                    ? 'اعلان‌ها فعاله'
                    : 'اعلان‌ها غیرفعاله'}
                </p>
              </div>
              {pushBusy ? (
                <Loader2 className="w-5 h-5 text-zinc-300 shrink-0 animate-spin" />
              ) : (
                <span
                  dir="ltr"
                  className="relative w-11 h-6 rounded-full shrink-0 transition-colors duration-200"
                  style={{ backgroundColor: pushIsOn ? '#824c71' : '#e4e4e7' }}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform duration-200 ${
                      pushIsOn ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </span>
              )}
            </button>
          )}

          {/* پشتیبانی */}
          <Link
            href={menuItems[2].href}
            className="flex items-center gap-3 py-3.5 hover:bg-zinc-50 transition-colors"
          >
            <MessageCircle className="w-5 h-5 text-[#824c71] shrink-0" strokeWidth={1.75} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-zinc-800">{menuItems[2].label}</p>
              <p className="text-[11px] text-zinc-400 mt-0.5">{menuItems[2].desc}</p>
            </div>
            <ChevronLeft className="w-4.5 h-4.5 text-zinc-300 shrink-0" />
          </Link>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 py-3.5 hover:bg-zinc-50 transition-colors text-right"
          >
            <LogOut className="w-5 h-5 text-[#824c71] shrink-0" strokeWidth={1.75} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-zinc-800">خروج از حساب کاربری</p>
              <p className="text-[11px] text-zinc-400 mt-0.5">خروج از حساب کاربری فعلی</p>
            </div>
            <ChevronLeft className="w-4.5 h-4.5 text-zinc-300 shrink-0" />
          </button>
        </div>
      </div>
    </div>
  );
}