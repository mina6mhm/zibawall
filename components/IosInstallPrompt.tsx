"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Share, PlusSquare } from "lucide-react";

export default function IosInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const isIos = () => {
      const userAgent = window.navigator.userAgent.toLowerCase();
      return /iphone|ipad|ipod/.test(userAgent);
    };

    const isStandalone = () => {
      return (
        // @ts-ignore
        ('standalone' in window.navigator && window.navigator.standalone) ||
        window.matchMedia('(display-mode: standalone)').matches
      );
    };

    const hasDismissed = localStorage.getItem("iosInstallPromptDismissed");

    if (isIos() && !isStandalone() && !hasDismissed) {
      setShowPrompt(true);
    }
  }, []);

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem("iosInstallPromptDismissed", "true");
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" dir="rtl">
      <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl relative animate-in fade-in zoom-in duration-300">
        
        {/* لوگو */}
<div className="flex justify-center mb-4">
  <div className="w-16 h-16 flex items-center justify-center bg-zinc-50 rounded-full shadow-sm border border-zinc-100 overflow-hidden">
    <Image 
      src="/PWA.png" 
      alt="Logo" 
      width={64} 
      height={64} 
      className="object-cover w-full h-full"
    />
  </div>
</div>
        <h3 className="text-center text-lg font-bold text-gray-800 mb-6">
          نصب نسخهٔ وب اپلیکیشن
        </h3>

        {/* باکس توضیحات */}
        <div className="border border-dashed border-gray-300 rounded-xl p-5 mb-6 space-y-6 text-sm text-gray-700 leading-relaxed">
          
          <div className="flex items-start gap-3">
            <span className="font-bold shrink-0">۱-</span>
            <p className="leading-7">
              در نوار پایین گوشی، دکمهٔ 
              <span className="inline-flex items-center justify-center w-7 h-7 bg-gray-100 rounded-md mx-1 align-middle">
                <Share className="w-4 h-4 text-blue-500" />
              </span> 
              را انتخاب کنید.
            </p>
          </div>

          <div className="flex items-start gap-3">
            <span className="font-bold shrink-0">۲-</span>
            <p className="leading-7">
              منوی باز شده را به بالا اسکرول کنید و دکمهٔ 
              <span className="inline-flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-md mx-1 font-medium whitespace-nowrap align-middle">
                Add to Home Screen <PlusSquare className="w-4 h-4 inline" />
              </span> 
              را انتخاب کنید.
            </p>
          </div>

          <div className="flex items-start gap-3">
            <span className="font-bold shrink-0">۳-</span>
            <p className="leading-7">
              در بالای صفحه، دکمهٔ 
              <span className="inline-flex items-center justify-center bg-gray-100 px-3 py-1 rounded-md mx-1 font-medium align-middle">
                Add
              </span> 
              را انتخاب کنید.
            </p>
          </div>

        </div>

        {/* دکمه تایید */}
        <button
          onClick={handleDismiss}
          className="w-full py-3 rounded-xl border-2 border-zinc-900 text-zinc-900 font-bold text-base hover:bg-zinc-100 transition-colors"
        >
          متوجه شدم
        </button>
      </div>
    </div>
  );
}
