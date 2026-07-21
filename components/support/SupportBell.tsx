// components/support/SupportBell.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';

export default function SupportBell({ onClick }: { onClick: () => void }) {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const res = await fetch('/api/support/mine');
        if (res.ok) {
          const data = await res.json();
          setUnreadCount(data.unreadCount);
        }
      } catch (error) {
        console.error('خطا در دریافت اعلان‌ها:', error);
      }
    };

    fetchUnread();
    const interval = setInterval(fetchUnread, 30000); // هر ۳۰ ثانیه
    return () => clearInterval(interval);
  }, []);

  return (
    <button
      onClick={onClick}
      className="relative w-10 h-10 flex items-center justify-center rounded-full bg-[#e3c9dc]/20 text-[#824c71] hover:bg-[#e3c9dc]/40 transition-all shrink-0"
      aria-label="پیام‌های پشتیبانی"
    >
      <Bell className="w-5 h-5" strokeWidth={1.5} />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 w-4.5 h-4.5 min-w-[18px] px-1 bg-[#824c71] text-white text-[10px] font-medium rounded-full flex items-center justify-center border-2 border-white">
          {unreadCount > 9 ? '۹+' : unreadCount}
        </span>
      )}
    </button>
  );
}