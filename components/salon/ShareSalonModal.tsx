// components/salon/ShareSalonModal.tsx
"use client";

import { useEffect, useState } from "react";
import { X, Copy, Check, Download, Share2 } from "lucide-react";
import QRCode from "qrcode";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  salonName: string;
};

export default function ShareSalonModal({ isOpen, onClose, url, salonName }: Props) {
  // پیش‌نمایش SVG برای نمایش داخل مودال (شفاف و همیشه واضح، مستقل از سایز صفحه)
  const [qrSvg, setQrSvg] = useState<string>("");
  // نسخه‌ی PNG با رزولوشن بالا، مخصوص دانلود/چاپ (برای وضوح روی چاپ فیزیکی)
  const [qrPngUrl, setQrPngUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);

  useEffect(() => {
    if (!isOpen || !url) return;

    setCopied(false);

    QRCode.toString(url, {
      type: "svg",
      margin: 1,
      color: { dark: "#1c1c1c", light: "#ffffffff" },
    }).then(setQrSvg).catch(() => setQrSvg(""));

    // 1024px تضمین می‌کنه که حتی روی چاپ فیزیکی (استیکر، بروشور و...) کاملاً واضح بمونه
    QRCode.toDataURL(url, {
      width: 1024,
      margin: 2,
      color: { dark: "#1c1c1c", light: "#ffffffff" },
    }).then(setQrPngUrl).catch(() => setQrPngUrl(""));

    setCanNativeShare(typeof navigator !== "undefined" && !!navigator.share);
  }, [isOpen, url]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleDownload = () => {
    if (!qrPngUrl) return;
    const a = document.createElement("a");
    a.href = qrPngUrl;
    a.download = `qr-${salonName || "salon"}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
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
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-sm sm:rounded-2xl rounded-t-3xl p-6 shadow-xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 left-4 p-1.5 rounded-full text-zinc-400 hover:bg-zinc-100"
          aria-label="بستن"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-base font-bold text-zinc-900 text-center mb-1">
          اشتراک‌گذاری صفحه‌ی سالن
        </h3>

        {/* پیش‌نمایش QR */}
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
            onClick={handleDownload}
            disabled={!qrPngUrl}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-zinc-100 text-zinc-700 text-sm font-medium disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            دانلود QR
          </button>

          {canNativeShare && (
            <button
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