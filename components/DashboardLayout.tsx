// components/DashboardLayout.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const DashboardIcon = ({ isActive, className }: { isActive: boolean, className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill={isActive ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="4" width="6" height="6" rx="1.5" />
    <rect x="14" y="4" width="6" height="6" rx="1.5" />
    <rect x="4" y="14" width="6" height="6" rx="1.5" />
    <rect x="14" y="14" width="6" height="6" rx="1.5" />
  </svg>
);

const BookmarkIcon = ({ isActive, className }: { isActive: boolean, className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill={isActive ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v17.5l-6-4-6 4V4z" />
  </svg>
);

const ProfileIcon = ({ isActive, className }: { isActive: boolean, className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill={isActive ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="7" r="3.5" />
    <rect x="5.5" y="15" width="13" height="5" rx="2.5" />
  </svg>
);

const navItems = [
  { name: 'پیشخوان', href: '/', icon: DashboardIcon },
  { name: 'نشان‌ها', href: '/bookmarks', icon: BookmarkIcon },
  { name: 'پروفایل', href: '/profile', icon: ProfileIcon },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isSalonPage = pathname?.startsWith('/salon/');

  return (
    <div className="flex h-screen bg-white text-zinc-900 dir-rtl font-sans selection:bg-zinc-200">
      {/* دسکتاپ سایدبار */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-l border-zinc-100 shadow-[0_0_40px_rgba(0,0,0,0.02)] z-20">
        <div className="p-8 pb-6">
          <h1 className="text-xl font-black tracking-tighter text-zinc-900">
            زیباوال
          </h1>
        </div>
        <nav className="flex-1 px-4 space-y-0.5 mt-2 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = item.href === '/' ? pathname === '/' : pathname?.startsWith(item.href);
            return (
              <Link 
                key={item.name} 
                href={item.href}
                className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-colors duration-200 text-[13px] ${
                  isActive ? 'bg-zinc-50 text-[#4a2545] font-semibold' : 'text-zinc-500 hover:text-[#4a2545]'
                }`}
              >
                <item.icon className="w-[20px] h-[20px]" isActive={isActive} />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* محتوای اصلی */}
      <div className="flex-1 flex flex-col relative w-full overflow-hidden">
        <main className="flex-1 overflow-y-auto px-4 md:px-8 pb-[135px] md:pb-8">
          <div className="max-w-6xl mx-auto h-full">
            {children}
          </div>
        </main>
      </div>

      {/* نَوبار موبایل - در صفحه سالن نمایش داده نمیشه */}
      {!isSalonPage && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-zinc-100 pb-6 pt-1">
          <div className="flex items-center justify-between px-2 h-[64px]">
            {navItems.map((item) => {
              const isActive = item.href === '/' ? pathname === '/' : pathname?.startsWith(item.href);
              return (
                <Link 
                  key={item.name} 
                  href={item.href}
                  className="flex flex-1 flex-col items-center justify-center h-full gap-1.5 transition-transform active:scale-95"
                >
                  <item.icon 
                    className={`w-[24px] h-[24px] transition-colors duration-300 ${isActive ? 'text-[#4a2545]' : 'text-zinc-400'}`} 
                    isActive={isActive} 
                  />
                  <span className={`text-[11px] tracking-tight transition-colors duration-300 ${isActive ? 'text-[#4a2545] font-bold' : 'text-zinc-500 font-medium'}`}>
                    {item.name}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}