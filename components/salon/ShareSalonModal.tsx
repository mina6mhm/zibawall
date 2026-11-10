// components/salon/ShareSalonModal.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { X, Copy, Check, Download, Share2, Loader2 } from "lucide-react";
import QRCode from "qrcode";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  salonName: string;
};

const QR_COLORS = { dark: "#1c1c1c", light: "#ffffffff" };

export default function ShareSalonModal({ isOpen, onClose, url, salonName }: Props) {
  // فقط پیش‌نمایش SVG موقع باز شدن ساخته می‌شود (سبک)
  const [qrSvg, setQrSvg] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isOpen || !url) return;

    let cancelled = false; // جلوگیری از اعمال نتیجه‌ی قدیمی اگر url عوض شد/مودال بسته شد
    setCopied(false);

    QRCode.toString(url, { type: "svg", margin: 1, color: QR_COLORS })
      .then((svg) => {
        if (!cancelled) setQrSvg(svg);
      })
      .catch(() => {
        if (!cancelled) setQrSvg("");
      });

    setCanNativeShare(typeof navigator !== "undefined" && !!navigator.share);

    return () => {
      cancelled = true;
    };
  }, [isOpen, url]);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  if (!isOpen) return null;

  const markCopied = () => {
    setCopied(true);
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      markCopied();
    } catch {
      // fallback برای وب‌ویو/مرورگرهایی که clipboard API ندارند یا HTTPS نیستند
      try {
        const ta = document.createElement("textarea");
        ta.value = url;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand("copy");
        ta.remove();
        if (ok) markCopied();
      } catch {}
    }
  };

  // PNG پرکیفیت فقط وقتی کاربر دانلود می‌زند ساخته می‌شود (قبلاً با هر بار باز شدن مودال، ۱۰۲۴ پیکسلی ساخته می‌شد)
  const handleDownload = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    try {
      const dataUrl = await QRCode.toDataURL(url, { width: 1024, margin: 2, color: QR_COLORS });
      const bytes = Uint8Array.from(atob(dataUrl.split(",")[1]), (c) => c.charCodeAt(0));
      const blob = new Blob([bytes], { type: "image/png" });

      const safeName = (salonName || "salon").replace(/[\\/:*?"<>|\s]+/g, "-");
      const fileName = `qr-${safeName}.png`;

      // روی موبایل/وب‌ویو، لینک دانلود معمولاً کار نمی‌کند؛ اگر اشتراک فایل پشتیبانی شود از آن استفاده می‌کنیم
      const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      if (isMobile && typeof File !== "undefined") {
        const file = new File([blob], fileName, { type: "image/png" });
        if (navigator.canShare?.({ files: [file] })) {
          try {
            await navigator.share({ files: [file], title: salonName });
            return;
          } catch (err) {
            if ((err as Error)?.name === "AbortError") return; // کاربر لغو کرد
          }
        }
      }

      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch {
      // خطا در ساخت QR؛ بی‌صدا رد می‌شویم
    } finally {
      setIsDownloading(false);
    }
  };

  const handleNativeShare = async () => {
    try {
      await navigator.share({
        title: salonName,
        text: `رزرو آنلاین در ${salonName}`,
        url,
      });
    } catch {}
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm px-0 sm:px-5"
      dir="rtl"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-sm sm:rounded-2xl rounded-t-3xl p-6 shadow-xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 left-4 p-1.5 rounded-full text-zinc-400 hover:bg-zinc-100"
          aria-label="بستن"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-base font-bold text-zinc-900 text-center mb-1">
          اشتراک‌گذاری صفحه‌ی سالن
        </h3>

        {/* پیش‌نمایش QR (SVG تولیدشده توسط کتابخانه از روی url) */}
        <div className="flex justify-center mb-5">
          <div
            className="w-48 h-48 p-2 bg-white border border-zinc-100 rounded-2xl flex items-center justify-center [&>svg]:w-full [&>svg]:h-full"
            dangerouslySetInnerHTML={{ __html: qrSvg }}
          />
        </div>

        {/* لینک */}
        <div className="flex items-center gap-2 bg-zinc-50 rounded-xl px-3 py-2.5 mb-4">
          <span className="flex-1 text-xs text-zinc-600 truncate" dir="ltr">
            {url}
          </span>
          <button
            type="button"
            onClick={handleCopy}
            className="shrink-0 flex items-center gap-1 text-xs font-semibold text-[#824c71]"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5" /> کپی شد
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" /> کپی
              </>
            )}
          </button>
        </div>

        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={handleDownload}
            disabled={!qrSvg || isDownloading}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-zinc-100 text-zinc-700 text-sm font-medium disabled:opacity-50"
          >
            {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            دانلود QR
          </button>

          {canNativeShare && (
            <button
              type="button"
              onClick={handleNativeShare}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#824c71] text-white text-sm font-medium"
            >
              <Share2 className="w-4 h-4" />
              اشتراک‌گذاری
            </button>
          )}
        </div>
      </div>
    </div>
  );
}