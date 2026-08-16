// app/layout.tsx
import localFont from 'next/font/local';
import './globals.css';
import { Metadata, Viewport } from 'next';
import SplashScreen from '@/components/SplashScreen';

const shabnam = localFont({
  src: [
    { path: './fonts/Shabnam/Shabnam.woff2', weight: '400', style: 'normal' },
    { path: './fonts/Shabnam/Shabnam-Bold.woff2', weight: '700', style: 'normal' }
  ],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'ZibaWall',
  description: 'description',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'ZibaWall',
  },
  icons: {
    apple: '/APP.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#ffffff',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fa" dir="rtl">
      <body className={`${shabnam.className} bg-white text-black antialiased`}>
        <SplashScreen>
          {children}
        </SplashScreen>
      </body>
    </html>
  );
}