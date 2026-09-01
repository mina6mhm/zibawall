// components/admin/PushNotificationSetup.tsx
// کارت فعال‌سازی نوتیف مرورگر (Web Push) برای ادمین‌ها — جایگزین/مکمل ربات تلگرام،
// چون خود اپ مستقیم و بدون واسطه (و بدون محدودیت فیلترشکن) نوتیف می‌فرسته.
'use client';

import React, { useEffect, useState } from 'react';
import { Bell, BellRing, BellOff, Loader2 } from 'lucide-react';

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

export default function PushNotificationSetup() {
  const [state, setState] = useState<PushState>('checking');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const check = async () => {
      if (
        typeof window === 'undefined' ||
        !('serviceWorker' in navigator) ||
        !('PushManager' in window) ||
        !('Notification' in window)
      ) {
        setState('unsupported');
        return;
      }

      if (Notification.permission === 'denied') {
        setState('denied');
        return;
      }

      try {
        const registration = await navigator.serviceWorker.getRegistration('/sw.js');
        const existingSub = registration ? await registration.pushManager.getSubscription() : null;
        setState(existingSub ? 'subscribed' : 'not-subscribed');
      } catch {
        setState('not-subscribed');
      }
    };
    check();
  }, []);

  const handleEnable = async () => {
    setError('');
    setBusy(true);
    try {
      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) {
        setError('کلید VAPID روی سرور تنظیم نشده — با توسعه‌دهنده هماهنگ کن.');
        setBusy(false);
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setState(permission === 'denied' ? 'denied' : 'not-subscribed');
        setBusy(false);
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

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'خطا در ثبت نوتیف');
      }

      setState('subscribed');
    } catch (err: any) {
      console.error('خطا در فعال‌سازی نوتیف:', err);
      setError('فعال‌سازی نوتیف با خطا مواجه شد. دوباره امتحان کن.');
    } finally {
      setBusy(false);
    }
  };

  const handleDisable = async () => {
    setError('');
    setBusy(true);
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

      setState('not-subscribed');
    } catch (err) {
      console.error('خطا در غیرفعال‌سازی نوتیف:', err);
      setError('غیرفعال‌سازی نوتیف با خطا مواجه شد.');
    } finally {
      setBusy(false);
    }
  };

  if (state === 'checking' || state === 'unsupported') {
    return null;
  }

  return (
    <div className="bg-white border border-zinc-100 rounded-2xl px-4 py-4 mb-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
              state === 'subscribed' ? 'bg-emerald-50' : 'bg-zinc-50'
            }`}
          >
            {state === 'subscribed' ? (
              <BellRing className="w-5 h-5 text-emerald-600" strokeWidth={1.5} />
            ) : state === 'denied' ? (
              <BellOff className="w-5 h-5 text-red-500" strokeWidth={1.5} />
            ) : (
              <Bell className="w-5 h-5 text-[#824c71]" strokeWidth={1.5} />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-zinc-900">نوتیف مرورگر</p>
            <p className="text-xs text-zinc-400 mt-0.5">
              {state === 'subscribed' && 'فعاله — با ثبت سالن جدید نوتیف می‌گیری'}
              {state === 'not-subscribed' && 'با ثبت سالن جدید، مستقیم از خود اپ نوتیف بگیر'}
              {state === 'denied' && 'دسترسی نوتیف مسدوده — از تنظیمات مرورگر بازش کن'}
            </p>
          </div>
        </div>

        {state === 'not-subscribed' && (
          <button
            onClick={handleEnable}
            disabled={busy}
            className="shrink-0 px-3.5 py-2 rounded-xl bg-[#824c71] text-white text-xs font-bold disabled:opacity-60 flex items-center gap-1.5"
          >
            {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            فعال‌سازی
          </button>
        )}

        {state === 'subscribed' && (
          <button
            onClick={handleDisable}
            disabled={busy}
            className="shrink-0 px-3.5 py-2 rounded-xl bg-zinc-100 text-zinc-600 text-xs font-bold disabled:opacity-60 flex items-center gap-1.5"
          >
            {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            غیرفعال‌سازی
          </button>
        )}
      </div>

      {error && <p className="text-xs text-red-500 mt-2.5">{error}</p>}
    </div>
  );
}
