import localFont from 'next/font/local';
import './globals.css';
import IosInstallPrompt from "@/components/IosInstallPrompt";
import { Metadata, Viewport } from 'next'; // اضافه کردن این ایمپورت‌ها

const shabnam = localFont({
  src: [
    { path: './fonts/Shabnam/Shabnam.woff2', weight: '400', style: 'normal' },
    { path: './fonts/Shabnam/Shabnam-Bold.woff2', weight: '700', style: 'normal' }
  ],
  display: 'swap',
});

// اضافه کردن تنظیمات PWA و اپل
export const metadata: Metadata = {
  title: 'zibaWall',
  description: 'description',
  manifest: '/manifest.json', // مسیر مانیفست
  appleWebApp: {
    capable: true, // این خط باعث می‌شود تمام‌صفحه و بدون نوار آدرس باز شود
    statusBarStyle: 'default',
    title: 'zibaWall',
  },
  icons: {
    apple: '/APP.png', // آیکونی که روی صفحه گوشی قرار می‌گیرد
  },
};

// تنظیم رنگ نوار بالای گوشی (اختیاری)
export const viewport: Viewport = {
  themeColor: '#ffffff',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fa" dir="rtl">
      <body className={`${shabnam.className} bg-white text-black antialiased`}>
        {children}
        
        {/* کامپوننت راهنمای نصب PWA فقط برای آیفون */}
        <IosInstallPrompt />
      </body>
    </html>
  );
}
