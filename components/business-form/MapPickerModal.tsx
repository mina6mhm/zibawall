// components/business-form/MapPickerModal.tsx
'use client';

import dynamic from 'next/dynamic';
import { CheckCircle2, X } from 'lucide-react';

const MapPicker = dynamic(() => import('@/components/MapPicker'), {
  ssr: false,
  loading: () => <div className="w-full h-full flex items-center justify-center bg-zinc-100 text-zinc-500">در حال بارگذاری نقشه...</div>
});

type Props = {
  isOpen: boolean;
  position: [number, number];
  onPositionChange: (pos: [number, number]) => void;
  onClose: () => void;
  onConfirm: () => void;
  helperText?: string;
};

export default function MapPickerModal({
  isOpen,
  position,
  onPositionChange,
  onClose,
  onConfirm,
  helperText = 'لطفا روی نقشه کلیک کنید تا نشانگر در محل دقیق کسب‌وکار شما قرار بگیرد.',
}: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col h-[75vh] md:h-[85vh]">
        <div className="p-4 border-b border-zinc-100 flex justify-between items-center bg-white z-10">
          <h3 className="font-semibold text-zinc-800">انتخاب موقعیت روی نقشه</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 transition-colors bg-zinc-100 hover:bg-zinc-200 p-2 rounded-full">
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 relative bg-zinc-100 w-full h-full z-0">
          <MapPicker position={position} setPosition={onPositionChange} />
        </div>
        <div className="p-4 bg-white border-t border-zinc-100 flex justify-between items-center gap-3 z-10 relative">
          <span className="text-sm text-zinc-500 hidden md:inline-block">{helperText}</span>
          <div className="flex gap-3 w-full md:w-auto">
            <button onClick={onClose} className="flex-1 md:flex-none px-4 py-2 rounded-[8px] text-xs text-zinc-600 font-medium hover:bg-zinc-100 transition-colors">
              انصراف
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 md:flex-none px-4 py-2 rounded-[8px] text-xs bg-[#824c71] text-white font-medium hover:bg-[#6e3f60] transition-colors shadow-md shadow-[#e3c9dc]/40 flex items-center justify-center gap-2"
            >
              <CheckCircle2 size={20} /> تایید موقعیت
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
