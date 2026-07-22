// components/business-form/Step4Images.tsx
'use client';

import { ImagePlus, ImageIcon, Trash2, UploadCloud } from 'lucide-react';
import type { ReactNode } from 'react';

type Props = {
  // کاور اصلی
  coverImage: File | null;
  existingCoverUrl?: string | null; // فقط در صفحه ویرایش استفاده می‌شود
  onCoverUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveCover: () => void;

  // نمونه کارها
  portfolios: File[];
  existingPortfolios?: string[]; // فقط در صفحه ویرایش استفاده می‌شود
  onPortfoliosUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemovePortfolio: (index: number) => void;
  onRemoveExistingPortfolio?: (index: number) => void;

  maxPortfolios: number;

  // متن اختیاری زیر بخش نمونه‌کارها (مثلاً توضیح سقف آپلود در صفحه ثبت اولیه)
  portfolioFootnote?: ReactNode;
};

export default function Step4Images({
  coverImage,
  existingCoverUrl,
  onCoverUpload,
  onRemoveCover,
  portfolios,
  existingPortfolios = [],
  onPortfoliosUpload,
  onRemovePortfolio,
  onRemoveExistingPortfolio,
  maxPortfolios,
  portfolioFootnote,
}: Props) {
  const totalPortfoliosCount = existingPortfolios.length + portfolios.length;
  const hasCover = !!coverImage || !!existingCoverUrl;

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in">
      <div className="flex items-center gap-2 border-b border-zinc-100 pb-2 md:pb-3">
        <ImagePlus className="text-zinc-700 w-5 h-5 md:w-6 md:h-6" />
        <h2 className="text-base md:text-lg font-semibold text-zinc-800">تصاویر سالن</h2>
      </div>

      {/* عکس کاور اصلی */}
      <div className="space-y-3 md:space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm md:text-base font-medium text-zinc-800">عکس کاور اصلی <span className="text-red-500">*</span></h3>
          <span className="text-[10px] md:text-xs text-zinc-500">برای نمایش در صفحه اصلی سالن</span>
        </div>

        {!hasCover ? (
          <label className="cursor-pointer bg-zinc-50 border-2 border-dashed border-zinc-300 rounded-xl md:rounded-2xl p-5 md:p-8 flex flex-col items-center justify-center text-center gap-2 md:gap-3 hover:bg-zinc-100 transition-colors">
            <div className="w-10 h-10 md:w-14 md:h-14 bg-white text-[#824c71] rounded-full flex items-center justify-center shadow-sm mb-1 md:mb-2 border border-zinc-200">
              <ImageIcon className="w-5 h-5 md:w-7 md:h-7" />
            </div>
            <h3 className="text-sm md:text-base font-medium text-zinc-800">برای آپلود کاور اصلی کلیک کنید</h3>
            <p className="text-xs md:text-sm text-zinc-500">فرمت‌های مجاز: JPG, PNG, WEBP</p>
            <input type="file" accept="image/*" className="hidden" onChange={onCoverUpload} />
          </label>
        ) : (
          <div className="relative max-w-lg">
            <div className="rounded-lg md:rounded-xl overflow-hidden aspect-video border border-zinc-200 shadow-sm">
              <img
                src={coverImage ? URL.createObjectURL(coverImage) : existingCoverUrl!}
                alt="کاور اصلی"
                className="w-full h-full object-cover"
              />
            </div>
            <button
              type="button"
              onClick={onRemoveCover}
              className="absolute top-3 left-3 w-10 h-10 rounded-full bg-white text-zinc-800 flex items-center justify-center shadow-lg active:scale-95 transition"
            >
              <Trash2 size={20} />
            </button>
          </div>
        )}
      </div>

      {/* نمونه کارها */}
      <div className="space-y-3 md:space-y-4 pt-4 border-t border-zinc-100">
        <div className="flex items-center justify-between">
          <h3 className="text-sm md:text-base font-medium text-zinc-800">نمونه کارها (اختیاری)</h3>
          <span className="text-[10px] md:text-xs bg-zinc-100 text-zinc-600 px-2.5 py-1 md:px-3 md:py-1 rounded-full font-medium">
            {totalPortfoliosCount.toLocaleString('fa-IR')} از {maxPortfolios.toLocaleString('fa-IR')}
          </span>
        </div>
        <p className="text-xs md:text-sm text-zinc-500 -mt-1 md:-mt-2">
          تصاویر باکیفیت از کارهای خود قرار دهید تا مشتریان بیشتری جذب کنید.
        </p>

        {totalPortfoliosCount < maxPortfolios && (
          <label className="cursor-pointer bg-zinc-50 border-2 border-dashed border-zinc-300 rounded-xl md:rounded-2xl p-5 md:p-8 flex flex-col items-center justify-center text-center gap-2 md:gap-3 hover:bg-zinc-100 transition-colors">
            <div className="w-10 h-10 md:w-14 md:h-14 bg-white text-[#824c71] rounded-full flex items-center justify-center shadow-sm mb-1 md:mb-2 border border-zinc-200">
              <UploadCloud className="w-5 h-5 md:w-7 md:h-7" />
            </div>
            <h3 className="text-sm md:text-base font-medium text-zinc-800">برای آپلود نمونه کارها کلیک کنید</h3>
            <p className="text-xs md:text-sm text-zinc-500">انتخاب همزمان چند عکس امکان‌پذیر است</p>
            <input type="file" multiple accept="image/*" className="hidden" onChange={onPortfoliosUpload} />
          </label>
        )}

        {portfolioFootnote}

        {totalPortfoliosCount > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4 mt-4 md:mt-6">
            {existingPortfolios.map((url, index) => (
              <div key={`existing-${index}`} className="relative rounded-lg md:rounded-xl overflow-hidden aspect-square border border-zinc-200 shadow-sm">
                <img src={url} alt="نمونه کار قبلی" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => onRemoveExistingPortfolio?.(index)}
                  className="absolute top-2 left-2 w-8 h-8 rounded-full bg-white text-zinc-800 flex items-center justify-center shadow-lg active:scale-95 transition"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}

            {portfolios.map((file, index) => (
              <div key={`new-${index}`} className="relative rounded-lg md:rounded-xl overflow-hidden aspect-square border border-zinc-200 shadow-sm">
                {existingPortfolios.length > 0 && (
                  <div className="absolute top-1.5 right-1.5 bg-emerald-500 text-white text-[9px] px-1.5 py-0.5 rounded-full z-10">جدید</div>
                )}
                <img src={URL.createObjectURL(file)} alt="نمونه کار جدید" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => onRemovePortfolio(index)}
                  className="absolute top-2 left-2 w-8 h-8 rounded-full bg-white text-zinc-800 flex items-center justify-center shadow-lg active:scale-95 transition z-20"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
