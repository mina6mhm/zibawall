// lib/pushClient.ts
// نسخه‌ی سایلنت و خودکار «فعال‌سازی نوتیف مرورگر» — برخلاف کارت ادمین که با
// کلیک کاربر روی دکمه اجرا می‌شه، این تابع مستقیم بعد از ثبت‌نام/ورود موفق
// صدا زده می‌شه و اگه اجازه داده نشه یا خطا بده، کاملاً بی‌صدا شکست می‌خوره
// و جلوی هیچ جریانی (مثل ریدایرکت بعد از لاگین) رو نمی‌گیره.

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

export async function subscribeToWebPushSilently(): Promise<boolean> {
  try {
    if (
      typeof window === 'undefined' ||
      !('serviceWorker' in navigator) ||
      !('PushManager' in window) ||
      !('Notification' in window)
    ) {
      return false;
    }

    // اگه قبلاً مسدود شده یا قبلاً subscribe شده، دوباره مزاحم کاربر نشو
    if (Notification.permission === 'denied') {
      return false;
    }

    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicKey) {
      return false;
    }

    const registration = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        return false;
      }

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

    return res.ok;
  } catch (err) {
    console.error('خطا در فعال‌سازی خودکار نوتیف مرورگر:', err);
    return false;
  }
}