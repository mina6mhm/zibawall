// components/DashboardLayout.tsx
'use client';

import React, { useState, useEffect } from 'react';
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

const AppointmentsIcon = ({ isActive, className }: { isActive: boolean, className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill={isActive ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="8" />
    <path d="M12 8v4l3 2" stroke={isActive ? "#fff" : "currentColor"} />
  </svg>
);

const MySalonIcon = ({ isActive, className }: { isActive: boolean, className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill={isActive ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 10.5L12 4l8 6.5V19a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1v-8.5z" />
  </svg>
);

const StaffScheduleIcon = ({ isActive, className }: { isActive: boolean, className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill={isActive ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="17" rx="2" />
    <path d="M3 9h18" stroke={isActive ? "#fff" : "currentColor"} />
    <path d="M8 2v4M16 2v4" stroke={isActive ? "#fff" : "currentColor"} />
  </svg>
);

const ProfileIcon = ({ isActive, className }: { isActive: boolean, className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill={isActive ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="7" r="3.5" />
    <rect x="5.5" y="15" width="13" height="5" rx="2.5" />
  </svg>
);

const baseNavItems = [
  { key: 'dashboard', name: 'پیشخوان', href: '/dashboard', icon: DashboardIcon },
  { key: 'bookmarks', name: 'نشان‌ها', href: '/bookmarks', icon: BookmarkIcon },
  { key: 'appointments', name: 'نوبت‌های من', href: '/appointments', icon: AppointmentsIcon },
  { key: 'my-salon', name: 'سالن من', href: '/my-salon', icon: MySalonIcon },
  { key: 'profile', name: 'پروفایل', href: '/profile', icon: ProfileIcon },
];

// آیتم منوی مخصوص پرسنل — فقط وقتی کاربر واقعاً در یک سالن پرسنل باشد به لیست اضافه می‌شود
const staffNavItem = {
  key: 'staff-schedule',
  name: 'برنامه پرسنلی',
  href: '/staff-schedule',
  icon: StaffScheduleIcon,
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isSalonPage = pathname?.startsWith('/salon/');

  const [isStaffSomewhere, setIsStaffSomewhere] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const checkStaffStatus = async () => {
      try {
        const res = await fetch('/api/staff/my-salons');
        if (!res.ok) return; // 401 یعنی لاگین نیست؛ فقط منوی پرسنل نمایش داده نمی‌شود
        const data = await res.json();
        if (!cancelled) {
          setIsStaffSomewhere(Array.isArray(data.salons) && data.salons.length > 0);
        }
      } catch {
        // خطای شبکه؛ صرفاً منوی پرسنل نشون داده نمیشه، بقیه‌ی اپ کار می‌کنه
      }
    };

    checkStaffStatus();
    return () => { cancelled = true; };
  }, []);

  // آیتم پرسنل درست بعد از «سالن من» اضافه می‌شود، فقط اگر کاربر پرسنل جایی باشد
  const navItems = isStaffSomewhere
    ? [
        ...baseNavItems.slice(0, 4),
        staffNavItem,
        ...baseNavItems.slice(4),
      ]
    : baseNavItems;

  return (
    <div className="flex h-screen bg-white text-zinc-900 dir-rtl font-sans selection:bg-zinc-200">
      <aside className="hidden md:flex flex-col w-64 bg-white border-l border-zinc-100 shadow-[0_0_40px_rgba(0,0,0,0.02)] z-20">
        <div className="p-8 pb-6">
          <h1 className="text-xl font-black tracking-tighter text-zinc-900">زیباوال</h1>
        </div>
        <nav className="flex-1 px-4 space-y-0.5 mt-2 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.key}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-colors duration-200 text-[13px] ${
                  isActive ? 'bg-zinc-50 text-[#824c71] font-semibold' : 'text-zinc-500 hover:text-[#824c71]'
                }`}
              >
                <item.icon className="w-[20px] h-[20px]" isActive={isActive} />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex-1 flex flex-col relative w-full overflow-hidden">
        <main className="flex-1 overflow-y-auto px-4 md:px-8 pb-[135px] md:pb-8">
          <div className="max-w-6xl mx-auto h-full">{children}</div>
        </main>
      </div>

      {!isSalonPage && (
        <nav
          className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-zinc-100 pt-1.5"
          style={{ paddingBottom: 'max(0.5rem, min(env(safe-area-inset-bottom), 1.25rem))' }}
        >
          <div className="flex items-center justify-between px-2 h-[64px]">
            {navItems.map((item) => {
              const isActive = pathname?.startsWith(item.href);
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className="flex flex-1 flex-col items-center justify-center h-full gap-1.5 transition-transform active:scale-95"
                >
                  <item.icon
                    className={`w-[22px] h-[22px] transition-colors duration-300 ${isActive ? 'text-[#824c71]' : 'text-zinc-400'}`}
                    isActive={isActive}
                  />
                  <span className={`text-[10px] tracking-tight transition-colors duration-300 ${isActive ? 'text-[#824c71] font-bold' : 'text-zinc-500 font-medium'}`}>
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