//components/RegionFilterModal.tsx
'use client';
import { useState, useEffect } from 'react';

// ۱. تعریف تایپ دیتا
interface LocationData {
  id: string;
  name: string;
  cities?: { id: string; name: string }[];
}

// ۲. تعریف تایپ پراپ‌های ورودی
interface RegionFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCity?: string;
  selectedRegion?: string;
  // تغییر: حالا استان و شهر را برمی‌گردانیم
  onSelectLocation?: (province: string, city: string) => void;
}

export default function RegionFilterModal({ 
  isOpen, 
  onClose, 
  selectedCity, 
  selectedRegion, 
  onSelectLocation 
}: RegionFilterModalProps) {
  
  const [locations, setLocations] = useState<LocationData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  // استیت برای مدیریت استانی که کاربر روی آن کلیک کرده تا شهرهایش را ببیند
  const [activeProvince, setActiveProvince] = useState<LocationData | null>(null);

  useEffect(() => {
    if (isOpen && locations.length === 0) {
      setIsLoading(true);
      fetch('/api/locations')
        .then((res) => res.json())
        .then((data: LocationData[]) => {
          setLocations(data);
          setIsLoading(false);
        })
        .catch((err) => {
          console.error("خطا:", err);
          setIsLoading(false);
        });
    }
  }, [isOpen, locations.length]);

  // وقتی مودال بسته می‌شود، به مرحله انتخاب استان برگردیم
  useEffect(() => {
    if (!isOpen) {
      setActiveProvince(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCitySelect = (cityName: string) => {
    if (onSelectLocation && activeProvince) {
      // تغییر مهم: اینجا نام استان و سپس نام شهر را پاس می‌دهیم
      onSelectLocation(activeProvince.name, cityName); 
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[80vh]">
        
        {/* هدر مودال */}
        <div className="p-4 border-b flex justify-between items-center bg-zinc-50">
          <h2 className="font-bold text-zinc-800">
            {activeProvince ? `انتخاب شهر در ${activeProvince.name}` : 'انتخاب استان'}
          </h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-800 p-1">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        
        {/* محتوای مودال */}
        <div className="p-4 overflow-y-auto flex-grow hide-scrollbar">
          {isLoading ? (
            <div className="flex justify-center items-center py-10">
              <p className="text-zinc-500 text-sm">در حال بارگذاری شهرها...</p>
            </div>
          ) : activeProvince ? (
            // مرحله دوم: نمایش شهرهای استان انتخاب شده
            <div>
              <button 
                onClick={() => setActiveProvince(null)}
                className="mb-4 text-sm text-rose-600 flex items-center gap-1 hover:text-rose-700"
              >
                &rarr; بازگشت به لیست استان‌ها
              </button>
              <ul className="space-y-2">
                {activeProvince.cities?.map((city) => (
                  <li key={city.id}>
                    <button
                      onClick={() => handleCitySelect(city.name)}
                      className="w-full text-right px-4 py-3 rounded-lg hover:bg-zinc-100 transition-colors text-zinc-700 font-medium"
                    >
                      {city.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            // مرحله اول: نمایش لیست استان‌ها
            <ul className="space-y-2">
              {locations.map((province) => (
                <li key={province.id}>
                  <button
                    onClick={() => setActiveProvince(province)}
                    className="w-full flex justify-between items-center px-4 py-3 rounded-lg hover:bg-zinc-100 transition-colors text-zinc-700 font-medium"
                  >
                    <span>{province.name}</span>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400">
                      <path d="M15 18l-6-6 6-6"/>
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

      </div>
    </div>
  );
}
