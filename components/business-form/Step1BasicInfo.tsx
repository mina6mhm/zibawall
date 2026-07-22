// components/business-form/Step1BasicInfo.tsx
'use client';

import { Store, MapPin, Clock, Phone, FileText, Plus, Trash2, Map, CheckCircle2, ChevronDown, X } from 'lucide-react';
import { WEEK_DAYS } from './constants';

type Props = {
  name: string;
  onNameChange: (v: string) => void;

  workingHours: string;
  onWorkingHoursChange: (v: string) => void;

  description: string;
  onDescriptionChange: (v: string) => void;

  closedDays: string[];
  onToggleClosedDay: (day: string) => void;

  phones: string[];
  onAddPhone: () => void;
  onRemovePhone: (index: number) => void;
  onPhoneChange: (index: number, value: string) => void;

  selectedProvince: string;
  selectedCity: string;
  onOpenRegionModal: () => void;

  selectedNeighborhoods: string[];
  onRemoveNeighborhood: (nh: string) => void;

  address: string;
  onAddressChange: (v: string) => void;

  // موقعیت روی نقشه
  hasLocation: boolean;
  coordinates: [number, number] | null;
  onOpenMapModal: () => void;
};

export default function Step1BasicInfo({
  name, onNameChange,
  workingHours, onWorkingHoursChange,
  description, onDescriptionChange,
  closedDays, onToggleClosedDay,
  phones, onAddPhone, onRemovePhone, onPhoneChange,
  selectedProvince, selectedCity, onOpenRegionModal,
  selectedNeighborhoods, onRemoveNeighborhood,
  address, onAddressChange,
  hasLocation, coordinates, onOpenMapModal,
}: Props) {
  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in">
      <section className="space-y-4 md:space-y-6">
        <div className="flex items-center gap-2 border-b border-zinc-100 pb-2 md:pb-3">
          <Store className="text-zinc-700 w-5 h-5 md:w-6 md:h-6" />
          <h2 className="text-base md:text-lg font-semibold text-zinc-800">اطلاعات پایه سالن</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">

          <div className="space-y-1.5 md:space-y-2">
            <label className="block text-xs md:text-sm font-medium text-zinc-700">نام سالن زیبایی <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="مثال: سالن زیبایی گل‌ها"
              className="w-full px-3 py-2.5 md:px-4 md:py-3 text-sm md:text-base rounded-lg md:rounded-xl border border-zinc-200 focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300 outline-none transition-all"
            />
          </div>

          <div className="space-y-1.5 md:space-y-2">
            <label className="block text-xs md:text-sm font-medium text-zinc-700">ساعات کاری <span className="text-red-500">*</span></label>
            <div className="relative">
              <Clock className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 w-4 h-4 md:w-5 md:h-5" />
              <input
                type="text"
                value={workingHours}
                onChange={(e) => onWorkingHoursChange(e.target.value)}
                placeholder="مثال: ۱۰ صبح تا ۸ شب"
                className="w-full pr-9 pl-3 py-2.5 md:pr-10 md:pl-4 md:py-3 text-sm md:text-base rounded-lg md:rounded-xl border border-zinc-200 focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300 outline-none transition-all"
              />
            </div>
          </div>

          <div className="space-y-1.5 md:space-y-2 md:col-span-2">
            <label className="block text-xs md:text-sm font-medium text-zinc-700">توضیحات و معرفی سالن <span className="text-red-500">*</span></label>
            <div className="relative">
              <FileText className="absolute right-3 top-3 md:top-4 text-zinc-400 w-4 h-4 md:w-5 md:h-5" />
              <textarea
                rows={3}
                value={description}
                onChange={(e) => onDescriptionChange(e.target.value)}
                placeholder="توضیح مختصری درباره سابقه، خدمات ویژه و محیط سالن خود بنویسید..."
                className="w-full pr-9 pl-3 py-2.5 md:pr-10 md:pl-4 md:py-3 text-sm md:text-base rounded-lg md:rounded-xl border border-zinc-200 focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300 outline-none transition-all resize-none"
              ></textarea>
            </div>
          </div>

          <div className="space-y-2 md:space-y-3 md:col-span-2">
            <label className="block text-xs md:text-sm font-medium text-zinc-700">روزهای تعطیل در هفته</label>
            <div className="flex flex-wrap gap-1.5 md:gap-2">
              {WEEK_DAYS.map(day => (
                <button
                  key={day}
                  type="button"
                  onClick={() => onToggleClosedDay(day)}
                  className={`px-3 py-1.5 md:px-4 md:py-2 rounded-lg md:rounded-xl text-xs md:text-sm font-medium transition-colors ${
                    closedDays.includes(day)
                      ? 'bg-[#e3c9dc]/20 text-[#824c71] border border-[#824c71]/30'
                      : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50'
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2 md:space-y-3 md:col-span-2 mt-1 md:mt-2">
            <label className="block text-xs md:text-sm font-medium text-zinc-700">شماره تماس‌های سالن <span className="text-red-500">*</span></label>
            <div className="space-y-2 md:space-y-3">
              {phones.map((phone, index) => (
                <div key={index} className="flex gap-2">
                  <div className="relative flex-1">
                    <Phone className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 w-4 h-4 md:w-5 md:h-5" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => onPhoneChange(index, e.target.value)}
                      placeholder={`شماره تماس ${index + 1}`}
                      className="w-full pr-9 pl-3 py-2.5 md:pr-10 md:pl-4 md:py-3 text-sm md:text-base rounded-lg md:rounded-xl border border-zinc-200 focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300 outline-none transition-all text-left dir-ltr"
                    />
                  </div>
                  {phones.length > 1 && (
                    <button type="button" onClick={() => onRemovePhone(index)} className="p-2.5 md:p-3 text-red-500 bg-red-50 hover:bg-red-100 rounded-lg md:rounded-xl transition-colors">
                      <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button type="button" onClick={onAddPhone} className="text-xs md:text-sm font-medium text-[#824c71] flex items-center gap-1 md:gap-1.5 mt-1 md:mt-2 hover:text-[#6e3f60] transition-colors">
              <Plus className="w-4 h-4 md:w-5 md:h-5" /> افزودن شماره جدید
            </button>
          </div>
        </div>
      </section>

      <section className="space-y-4 md:space-y-6 mt-6 md:mt-8">
        <div className="flex items-center gap-2 border-b border-zinc-100 pb-2 md:pb-3">
          <MapPin className="text-zinc-700 w-5 h-5 md:w-6 md:h-6" />
          <h2 className="text-base md:text-lg font-semibold text-zinc-800">آدرس و موقعیت مکانی</h2>
        </div>

        <div className="space-y-2 md:space-y-3">
          <label className="block text-xs md:text-sm font-medium text-zinc-700">استان و شهر <span className="text-red-500">*</span></label>
          <button
            type="button"
            onClick={onOpenRegionModal}
            className="w-full px-3 py-2.5 md:px-4 md:py-3 text-sm md:text-base rounded-lg md:rounded-xl border border-zinc-200 text-right flex justify-between items-center hover:border-zinc-300 focus:ring-1 focus:ring-zinc-300 outline-none transition-all bg-white"
          >
            <span className={selectedProvince ? 'text-zinc-800 font-medium' : 'text-zinc-400'}>
              {selectedProvince && selectedCity ? `${selectedProvince} - ${selectedCity}` : 'انتخاب استان و شهر...'}
            </span>
            <ChevronDown className="text-zinc-400 w-4 h-4 md:w-5 md:h-5" />
          </button>

          {selectedProvince === 'تهران' && selectedCity === 'تهران' && selectedNeighborhoods.length > 0 && (
            <div className="flex flex-wrap gap-1.5 md:gap-2 mt-1.5 md:mt-2 p-2.5 md:p-3 bg-zinc-50 rounded-lg md:rounded-xl border border-zinc-100">
              <div className="w-full text-[10px] md:text-xs text-zinc-500 mb-0.5 md:mb-1">محله‌های انتخابی ({selectedNeighborhoods.length.toLocaleString('fa', { useGrouping: false })} از ۴)</div>
              {selectedNeighborhoods.map((nh) => (
                <span
                  key={nh}
                  className="flex items-center gap-1 md:gap-1.5 bg-[#e3c9dc]/20 text-[#824c71] px-2.5 py-1 md:px-3 md:py-1.5 rounded-full text-[10px] md:text-xs font-bold border border-[#e3c9dc]"
                >
                  {nh}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveNeighborhood(nh);
                    }}
                    className="hover:bg-[#e3c9dc]/40 text-[#824c71] rounded-full p-0.5 transition-colors"
                  >
                    <X className="w-3 h-3 md:w-3.5 md:h-3.5" strokeWidth={2.5} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-1.5 md:space-y-2">
          <label className="block text-xs md:text-sm font-medium text-zinc-700">آدرس دقیق <span className="text-red-500">*</span></label>
          <textarea
            rows={3}
            value={address}
            onChange={(e) => onAddressChange(e.target.value)}
            placeholder="خیابان اصلی، کوچه، پلاک، طبقه..."
            className="w-full px-3 py-2.5 md:px-4 md:py-3 text-sm md:text-base rounded-lg md:rounded-xl border border-zinc-200 focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300 outline-none transition-all resize-none"
          ></textarea>
        </div>

        {hasLocation && coordinates ? (
          <div className="w-full space-y-2 md:space-y-3 animate-fade-in mt-4 md:mt-6">
            <div className="w-full h-36 md:h-56 rounded-xl md:rounded-2xl border border-zinc-200 overflow-hidden relative shadow-sm pointer-events-none bg-zinc-100">
              <img
                src={`https://static-maps.yandex.ru/1.x/?ll=${coordinates[1]},${coordinates[0]}&z=15&l=map&size=600,250&pt=${coordinates[1]},${coordinates[0]},pm2rdm&lang=fa_IR`}
                alt="پیش‌نمایش نقشه"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex flex-row items-center justify-between px-1 pt-1">
              <div className="flex items-center gap-1.5 md:gap-2 text-green-600">
                <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5" />
                <span className="text-xs md:text-sm font-medium text-zinc-800">موقعیت سالن ثبت شد</span>
              </div>
              <button
                type="button"
                onClick={onOpenMapModal}
                className="text-[#824c71] text-[10px] md:text-sm font-medium hover:bg-[#e3c9dc]/20 px-2 py-1 md:px-3 md:py-1.5 rounded-lg transition-colors flex items-center gap-1"
              >
                <MapPin className="w-3.5 h-3.5 md:w-4 md:h-4" /> ویرایش موقعیت
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-zinc-50 border border-dashed border-zinc-300 rounded-xl md:rounded-2xl p-4 md:p-6 flex flex-col items-center justify-center text-center gap-2 md:gap-3 mt-3 md:mt-4">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-white text-zinc-400 rounded-full flex items-center justify-center shadow-sm mb-1 border border-zinc-200">
              <Map className="w-5 h-5 md:w-7 md:h-7" />
            </div>
            <div>
              <p className="text-xs md:text-sm font-medium text-zinc-800">موقعیت سالن را روی نقشه مشخص کنید</p>
            </div>
            <button
              type="button"
              onClick={onOpenMapModal}
              className="mt-1 md:mt-2 bg-white border border-zinc-200 shadow-sm px-4 py-2 md:px-5 md:py-2.5 rounded-lg md:rounded-xl text-zinc-700 text-xs md:text-sm font-medium hover:bg-zinc-100 flex items-center gap-1.5 md:gap-2"
            >
              <MapPin className="w-4 h-4 md:w-[18px] md:h-[18px] text-zinc-600" /> انتخاب از روی نقشه
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
