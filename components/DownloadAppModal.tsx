// components/DownloadAppModal.tsx
'use client';

import Image from 'next/image';
import { X } from 'lucide-react';

type DownloadAppModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function DownloadAppModal({ isOpen, onClose }: DownloadAppModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      dir="rtl"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl p-6 pb-8 sm:pb-6 animate-in slide-in-from-bottom-2"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-base font-bold text-zinc-900">دانلود اپلیکیشن زیباوال</h3>
          <button onClick={onClose} className="p-1.5 text-zinc-400 bg-zinc-50 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {/* گزینه‌ی اول: دانلود مستقیم فایل نصب — لینک زیر رو با آدرس واقعی فایل APK جایگزین کن */}
          <a
            href="/downloads/zibawall.apk"
            className="flex items-center gap-3 p-4 rounded-xl border border-zinc-200 hover:bg-zinc-50 transition-colors"
          >
            <span className="w-11 h-11 rounded-xl bg-[#824c71]/10 flex items-center justify-center shrink-0">
              {/* آیکون اندروید — فایل /public/android.png رو اضافه کن */}
              <Image src="/android.png" alt="اندروید" width={22} height={22} className="object-contain" />
            </span>
            <div className="text-right">
              <p className="font-bold text-sm text-zinc-900">دانلود مستقیم</p>
              <p className="text-[11.5px] text-zinc-500 mt-0.5">فایل نصب اندروید مستقیم روی گوشی</p>
            </div>
          </a>

          {/* گزینه‌ی دوم: کافه‌بازار — لینک زیر رو با آدرس واقعی صفحه‌ی اپ توی بازار جایگزین کن */}
          <a
            href="https://cafebazaar.ir/app/ir.zibawall.app"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-4 rounded-xl border border-zinc-200 hover:bg-zinc-50 transition-colors"
          >
            <span className="w-11 h-11 rounded-xl bg-[#C98B6E]/12 flex items-center justify-center shrink-0">
              {/* آیکون کافه‌بازار — فایل /public/cafebazaar.png رو اضافه کن */}
              <Image src="/cafebazaar.png" alt="کافه‌بازار" width={23} height={23} className="object-contain" />
            </span>
            <div className="text-right">
              <p className="font-bold text-sm text-zinc-900">دانلود از کافه‌بازار</p>
              <p className="text-[11.5px] text-zinc-500 mt-0.5">نصب و دریافت آپدیت از کافه‌بازار</p>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
}