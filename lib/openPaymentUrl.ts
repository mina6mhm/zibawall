// lib/openPaymentUrl.ts
//
// روی وب و iOS، window.location.href مستقیم داخل همون WebView به درگاه
// می‌ره و مشکلی نداره. روی اندروید اما WebView جاسازی‌شده‌ی Capacitor
// گاهی توسط درگاه‌های پرداخت (مثل زرین‌پال) بلاک/نادیده گرفته می‌شه،
// چون به‌عنوان یه WebView شناسایی می‌شه نه یه مرورگر واقعی.
// برای همین، روی اندروید (و به‌طور کلی هر پلتفرم native) لینک درگاه رو
// با مرورگر سیستم (Chrome Custom Tab) باز می‌کنیم که این محدودیت رو نداره.

export async function openPaymentUrl(paymentUrl: string) {
  const { Capacitor } = await import('@capacitor/core');

  if (Capacitor.isNativePlatform()) {
    const { Browser } = await import('@capacitor/browser');
    await Browser.open({ url: paymentUrl });
    return;
  }

  window.location.href = paymentUrl;
}