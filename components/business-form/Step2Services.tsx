// components/business-form/Step2Services.tsx
'use client';

import { CheckCircle2, ChevronDown, ChevronUp, Plus, X } from 'lucide-react';
import { SERVICE_DETAILS } from './constants';

type Props = {
  categories: string[]; // لیست دسته‌بندی‌هایی که باید نمایش داده شوند
  selectedTags: string[];
  customServices: Record<string, string[]>;
  expandedCategories: string[];
  onToggleCategory: (category: string) => void;
  onToggleTag: (tag: string) => void;
  newTagInputs: Record<string, string>;
  onNewTagInputChange: (category: string, value: string) => void;
  onAddCustomTag: (category: string) => void;
  onRemoveCustomTag: (category: string, tag: string) => void;
};

export default function Step2Services({
  categories,
  selectedTags,
  customServices,
  expandedCategories,
  onToggleCategory,
  onToggleTag,
  newTagInputs,
  onNewTagInputChange,
  onAddCustomTag,
  onRemoveCustomTag,
}: Props) {
  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in">
      <div className="flex items-center justify-between border-b border-zinc-100 pb-2 md:pb-3">
        <div className="flex items-center gap-1.5 md:gap-2">
          <CheckCircle2 className="text-zinc-700 w-5 h-5 md:w-6 md:h-6" />
          <h2 className="text-base md:text-lg font-semibold text-zinc-800">خدمات قابل ارائه</h2>
        </div>
        <span className="text-[10px] md:text-xs text-[#824c71] bg-[#e3c9dc]/20 px-2 py-0.5 md:px-3 md:py-1 rounded-full font-medium">
          {selectedTags.length.toLocaleString('fa-IR')} خدمت انتخاب شده
        </span>
      </div>
      <p className="text-xs md:text-sm text-zinc-500 -mt-1 md:-mt-2">
        جزئیات خدماتی که در سالن شما ارائه می‌شود را با دقت انتخاب کنید تا مشتریان راحت‌تر شما را پیدا کنند.
      </p>

      <div className="space-y-3 md:space-y-4">
        {categories.map((category) => {
          const isExpanded = expandedCategories.includes(category);
          const defaultServices = SERVICE_DETAILS[category as keyof typeof SERVICE_DETAILS] || [];
          const categoryCustomServices = customServices[category] || [];
          const categoryServices = [...defaultServices, ...categoryCustomServices];
          const selectedCount = categoryServices.filter(s => selectedTags.includes(s)).length;

          return (
            <div key={category} className="border border-zinc-100 rounded-lg md:rounded-xl overflow-hidden bg-zinc-50/50">
              <button
                type="button"
                onClick={() => onToggleCategory(category)}
                className="w-full flex items-center justify-between p-3 md:p-4 bg-white hover:bg-zinc-50 transition-colors"
              >
                <div className="flex items-center gap-2 md:gap-3">
                  <span className="text-sm md:text-base font-medium text-zinc-800">{category}</span>
                  {selectedCount > 0 && (
                    <span className="text-[10px] md:text-xs bg-[#e3c9dc]/20 text-[#824c71] px-1.5 py-0.5 md:px-2 md:py-0.5 rounded-full font-medium">
                      {selectedCount.toLocaleString('fa-IR')} مورد
                    </span>
                  )}
                </div>
                {isExpanded ? (
                  <ChevronUp className="text-zinc-400 w-4 h-4 md:w-5 md:h-5" />
                ) : (
                  <ChevronDown className="text-zinc-400 w-4 h-4 md:w-5 md:h-5" />
                )}
              </button>

              {isExpanded && (
                <div className="p-3 md:p-4 border-t border-zinc-100 flex flex-col gap-3 md:gap-4">
                  <div className="flex flex-wrap gap-1.5 md:gap-2">
                    {categoryServices.map(service => {
                      const isDefault = defaultServices.includes(service as never);
                      const isSelected = selectedTags.includes(service);

                      if (isDefault) {
                        return (
                          <button
                            key={service}
                            type="button"
                            onClick={() => onToggleTag(service)}
                            className={`px-3 py-1.5 md:px-4 md:py-2 rounded-lg md:rounded-xl text-xs md:text-sm font-medium transition-all ${
                              isSelected
                                ? 'bg-[#e3c9dc]/20 border border-[#824c71]/30 text-[#824c71]'
                                : 'bg-white border border-zinc-200 text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50'
                            }`}
                          >
                            {service}
                          </button>
                        );
                      }
                      return (
                        <div
                          key={service}
                          className={`flex items-center gap-0.5 md:gap-1 pl-1.5 pr-3 py-1 md:pl-2 md:pr-4 md:py-1.5 rounded-lg md:rounded-xl text-xs md:text-sm font-medium transition-all border ${
                            isSelected
                              ? 'bg-amber-50 border-amber-300 text-amber-700 shadow-sm shadow-amber-100'
                              : 'bg-white border-dashed border-amber-300 text-amber-600 hover:bg-amber-50/50'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => onToggleTag(service)}
                            className="flex-1 text-right py-0.5"
                          >
                            {service}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onRemoveCustomTag(category, service);
                            }}
                            className={`p-1 rounded-full transition-colors ${
                              isSelected ? 'text-amber-500 hover:bg-amber-200' : 'text-amber-400 hover:bg-amber-100 hover:text-amber-600'
                            }`}
                            title="حذف کامل این خدمت"
                          >
                            <X className="w-3.5 h-3.5 md:w-4 md:h-4" strokeWidth={2.5} />
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex items-center gap-1.5 md:gap-2 mt-1 pt-2 md:pt-3 border-t border-zinc-100/60">
                    <input
                      type="text"
                      value={newTagInputs[category] || ''}
                      onChange={(e) => onNewTagInputChange(category, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          onAddCustomTag(category);
                        }
                      }}
                      placeholder={`افزودن خدمت جدید به ${category}...`}
                      className="flex-1 text-xs md:text-sm px-3 py-2 md:px-4 md:py-2.5 rounded-lg md:rounded-xl border border-zinc-200 focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300 outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => onAddCustomTag(category)}
                      className="px-2 py-2 md:px-3 md:py-2.5 bg-zinc-100 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-800 rounded-lg md:rounded-xl transition-colors flex items-center justify-center gap-1 font-medium text-xs md:text-sm whitespace-nowrap"
                    >
                      <Plus className="w-4 h-4 md:w-[18px] md:h-[18px]" /> افزودن
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
