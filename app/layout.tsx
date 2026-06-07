// app/layout.tsx
import localFont from 'next/font/local';
import './globals.css';
import IosInstallPrompt from "@/components/IosInstallPrompt";

const shabnam = localFont({
  src: [
    { path: './fonts/Shabnam/Shabnam.woff2', weight: '400', style: 'normal' },
    { path: './fonts/Shabnam/Shabnam-Bold.woff2', weight: '700', style: 'normal' }
  ],
  display: 'swap',
});

export const metadata = {
  title: 'zibawall',
  description: 'description',
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
