// app/RegionFilterModal.tsx

"use client";

import { useState, useEffect } from "react";
import { X, ChevronLeft, Check, Search } from "lucide-react"; // آیکون Search اضافه شد

interface CityData {
  id: string;
  name: string;
  districts?: Record<string, string[]>;
}

interface LocationData {
  id: string;
  name: string;
  cities?: CityData[];
  districts?: Record<string, string[]>;
}

interface RegionFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectLocation: (
    province: string,
    city: string,
    neighborhoods: string[]
  ) => void;
  initialProvince?: string;        
  initialCity?: string;            
  initialNeighborhoods?: string[]; 
  maxNeighborhoods?: number;
}

export default function RegionFilterModal({
  isOpen,
  onClose,
  onSelectLocation,
  initialProvince,
  initialCity,
  initialNeighborhoods = [],
  maxNeighborhoods,
}: RegionFilterModalProps) {
  const [locations, setLocations] = useState<LocationData[]>([]);
  const [loading, setLoading] = useState(true);

  const [step, setStep] = useState<"province" | "city" | "neighborhood">(
    "province"
  );
  const [activeProvince, setActiveProvince] = useState<LocationData | null>(
    null
  );
  const [activeCity, setActiveCity] = useState<CityData | null>(null);

  const [selectedNeighborhoods, setSelectedNeighborhoods] = useState<string[]>(
    initialNeighborhoods
  );

  // اضافه شدن استیت برای مدیریت عبارت جستجو
  const [searchQuery, setSearchQuery] = useState("");

  // واکشی اطلاعات شهرها و استان‌ها
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const response = await fetch("/api/locations");
        if (!response.ok) throw new Error("Failed to fetch");
        const data = await response.json();
        setLocations(data);

        if (initialProvince && initialCity) {
          const currentProvince = data.find((p: LocationData) => p.name === initialProvince);
          if (currentProvince) {
            setActiveProvince(currentProvince);
            const currentCity = currentProvince.cities?.find((c: CityData) => c.name === initialCity);
            if (currentCity) {
              let cityDistricts = currentCity.districts;
              if (currentProvince.name === 'تهران' && currentCity.name === 'تهران') {
                cityDistricts = currentCity.districts || currentProvince.districts;
              } else {
                cityDistricts = undefined; 
              }

              if (cityDistricts && Object.keys(cityDistricts).length > 0) {
                setActiveCity({ ...currentCity, districts: cityDistricts });
                setStep("neighborhood");
              } else {
                setStep("city");
              }
            } else {
              setStep("city");
            }
          }
        }
      } catch (error) {
        console.error("Error loading locations:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLocations();
  }, [initialProvince, initialCity]);

  const initialNeighborhoodsStr = JSON.stringify(initialNeighborhoods);

  // آپدیت مودال در زمان باز شدن
  useEffect(() => {
    if (isOpen) {
      setSelectedNeighborhoods(JSON.parse(initialNeighborhoodsStr));
      setSearchQuery(""); // ریست کردن جستجو هنگام باز شدن مدال

      if (initialProvince && initialCity && locations.length > 0) {
        const currentProvince = locations.find((p) => p.name === initialProvince);
        const currentCity = currentProvince?.cities?.find((c) => c.name === initialCity);

        if (currentProvince && currentCity) {
          setActiveProvince(currentProvince);
          
          let cityDistricts = currentCity.districts;
          if (currentProvince.name === 'تهران' && currentCity.name === 'تهران') {
            cityDistricts = currentCity.districts || currentProvince.districts;
          } else {
            cityDistricts = undefined;
          }

          if (cityDistricts && Object.keys(cityDistricts).length > 0) {
            setActiveCity({ ...currentCity, districts: cityDistricts });
            setStep("neighborhood");
          } else {
            setActiveCity(currentCity);
            setStep("city");
          }
        }
      }
    }
  }, [isOpen, initialNeighborhoodsStr, initialProvince, initialCity, locations]);

  if (!isOpen) return null;

  const handleProvinceSelect = (province: LocationData) => {
    setActiveProvince(province);
    setSearchQuery(""); // ریست کردن جستجو با تغییر مرحله
    setStep("city");
  };

  const handleCitySelect = (city: CityData) => {
    let cityDistricts = city.districts;
    if (activeProvince?.name === 'تهران' && city.name === 'تهران') {
      cityDistricts = city.districts || activeProvince?.districts;
    } else {
      cityDistricts = undefined; 
    }

    if (cityDistricts && Object.keys(cityDistricts).length > 0) {
      setActiveCity({ ...city, districts: cityDistricts });
      setSearchQuery(""); // ریست کردن جستجو با تغییر مرحله
      setStep("neighborhood");
      
      if (city.name === initialCity) {
        setSelectedNeighborhoods([...initialNeighborhoods]);
      } else {
        setSelectedNeighborhoods([]);
      }
    } else {
      onSelectLocation(activeProvince!.name, city.name, []);
      resetModal();
    }
  };

  const toggleNeighborhood = (neighborhood: string) => {
    setSelectedNeighborhoods((prev) => {
      if (neighborhood === 'همه محله‌ها') {
        return ['همه محله‌ها'];
      }

      const withoutAll = prev.filter(n => n !== 'همه محله‌ها');
      const isSelected = withoutAll.includes(neighborhood);
      
      if (isSelected) {
        return withoutAll.filter((n) => n !== neighborhood);
      } else {
        if (maxNeighborhoods && withoutAll.length >= maxNeighborhoods) {
          alert(`شما حداکثر می‌توانید ${maxNeighborhoods} محله انتخاب کنید.`);
          return withoutAll;
        }
        return [...withoutAll, neighborhood];
      }
    });
  };

  const handleConfirmSelection = () => {
    if (activeProvince && activeCity) {
      onSelectLocation(
        activeProvince.name,
        activeCity.name,
        selectedNeighborhoods
      );
      resetModal();
    }
  };

  const resetModal = () => {
    setStep("province");
    setActiveProvince(null);
    setActiveCity(null);
    setSelectedNeighborhoods([]);
    setSearchQuery("");
    onClose();
  };

  const handleBack = () => {
    setSearchQuery(""); // ریست کردن جستجو هنگام بازگشت
    if (step === "neighborhood") {
      setStep("city");
      return;
    }
    if (step === "city") {
      setStep("province");
      setActiveProvince(null);
      setActiveCity(null);
      return;
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="p-8 text-center text-zinc-500">
          در حال بارگذاری...
        </div>
      );
    }

    if (step === "province") {
      // اعمال فیلتر جستجو روی استان‌ها
      const filteredProvinces = locations.filter(prov => 
        prov.name.includes(searchQuery)
      );

      return (
        <ul className="p-4 space-y-2">
          {filteredProvinces.length > 0 ? (
            filteredProvinces.map((prov) => (
              <li
                key={prov.id}
                className="flex justify-between items-center p-3.5 bg-zinc-50 hover:bg-rose-50 rounded-xl cursor-pointer border border-transparent hover:border-rose-100 transition-colors"
                onClick={() => handleProvinceSelect(prov)}
              >
                <span className="text-zinc-800 font-medium">{prov.name}</span>
                <ChevronLeft className="w-5 h-5 text-zinc-400" />
              </li>
            ))
          ) : (
            <div className="text-center py-6 text-zinc-400 text-sm">استانی یافت نشد.</div>
          )}
        </ul>
      );
    }

    if (step === "city" && activeProvince) {
      // اعمال فیلتر جستجو روی شهرها
      const filteredCities = (activeProvince.cities || []).filter(city => 
        city.name.includes(searchQuery)
      );

      return (
        <ul className="p-4 space-y-2">
          {filteredCities.length > 0 ? (
            filteredCities.map((city) => (
              <li
                key={city.id}
                className="flex justify-between items-center p-3.5 bg-zinc-50 hover:bg-rose-50 rounded-xl cursor-pointer border border-transparent hover:border-rose-100 transition-colors"
                onClick={() => handleCitySelect(city)}
              >
                <span className="text-zinc-800 font-medium">{city.name}</span>
                <ChevronLeft className="w-5 h-5 text-zinc-400" />
              </li>
            ))
          ) : (
             <div className="text-center py-6 text-zinc-400 text-sm">شهری یافت نشد.</div>
          )}
        </ul>
      );
    }

    if (step === "neighborhood" && activeCity?.districts) {
      const allNeighborhoods = Array.from(
        new Set(Object.values(activeCity.districts).flat())
      ).sort((a, b) => a.localeCompare(b, "fa"));

      const displayNeighborhoods = maxNeighborhoods 
        ? allNeighborhoods 
        : ["همه محله‌ها", ...allNeighborhoods];

      // اعمال فیلتر جستجو روی محله‌ها
      const filteredNeighborhoods = displayNeighborhoods.filter(nh => 
        nh.includes(searchQuery)
      );

      return (
        <div className="p-4">
          {filteredNeighborhoods.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {filteredNeighborhoods.map((nh: string, index: number) => {
                const isSelected = selectedNeighborhoods.includes(nh);

                return (
                  <button
                    type="button"
                    key={`${nh}-${index}`}
                    onClick={() => toggleNeighborhood(nh)}
                    className={`flex w-full text-right items-center gap-3 p-3.5 md:p-3 rounded-xl cursor-pointer border transition-colors ${
                      isSelected
                        ? "border-rose-500 bg-rose-50/50"
                        : "border-zinc-200 hover:bg-zinc-50"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                        isSelected
                          ? "bg-rose-500 border-rose-500"
                          : "border-zinc-300"
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                    </div>

                    <span
                      className={`text-[15px] md:text-sm ${
                        isSelected
                          ? "text-rose-700 font-semibold"
                          : "text-zinc-700"
                      }`}
                    >
                      {nh}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6 text-zinc-400 text-sm">محله‌ای یافت نشد.</div>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-[9999] flex items-end md:items-center justify-center bg-zinc-900/40 md:bg-black/60 md:p-4 backdrop-blur-sm transition-all"
      onClick={resetModal}
    >
      <div
        onClick={(e) => e.stopPropagation()} 
        // استایل‌ها برای داشتن حالت Bottom Sheet استاندارد در موبایل
        className="bg-white w-full h-[85vh] md:h-auto md:max-h-[85vh] md:max-w-lg rounded-t-[24px] md:rounded-2xl shadow-xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-full md:zoom-in-95 duration-300"
      >
        {/* خط تزئینی بالای Bottom sheet مخصوص موبایل */}
        <div className="w-full flex justify-center pt-3 pb-1 md:hidden bg-white">
          <div className="w-12 h-1.5 bg-zinc-200 rounded-full"></div>
        </div>

        <div className="flex items-center justify-between px-5 pt-2 pb-4 md:p-5 shrink-0 bg-white z-10">
          <div className="flex items-center gap-2">
            {step !== "province" && (
              <button
                type="button"
                onClick={handleBack}
                className="p-1.5 hover:bg-zinc-100 rounded-full transition-colors ml-1"
              >
                <ChevronLeft className="w-6 h-6 md:w-5 md:h-5 rotate-180 text-zinc-700" />
              </button>
            )}
            <h2 className="text-[17px] md:text-lg font-bold text-zinc-900">
              {step === "province"
                ? "انتخاب استان"
                : step === "city"
                ? `شهرهای ${activeProvince?.name || ""}`
                : `محله‌های ${activeCity?.name || ""}`}
            </h2>
          </div>
          <button
            type="button"
            onClick={resetModal}
            className="p-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* فیلد جستجو (Sticky) */}
        {!loading && (
          <div className="px-5 pb-4 border-b border-zinc-100 bg-white shrink-0">
            <div className="relative flex items-center">
              <Search className="absolute right-3.5 w-5 h-5 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  step === "province" ? "جستجوی استان..." : 
                  step === "city" ? "جستجوی شهر..." : "جستجوی محله..."
                }
                className="w-full bg-zinc-100 text-zinc-800 rounded-xl py-3.5 pr-11 pl-10 text-[15px] md:text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:bg-white border border-transparent focus:border-rose-500/50 transition-all"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery("")}
                  className="absolute left-3 p-1 rounded-full text-zinc-400 hover:text-zinc-600 hover:bg-zinc-200"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-y-auto hide-scrollbar bg-white">
          {renderContent()}
        </div>

        {step === "neighborhood" && (
          <div className="shrink-0 z-20 bg-white border-t border-zinc-100 p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
            <button
              type="button"
              onClick={handleConfirmSelection}
              disabled={selectedNeighborhoods.length === 0}
              className="w-full bg-rose-600 hover:bg-rose-700 text-white py-4 md:py-3.5 rounded-xl text-[15px] md:text-base font-bold transition-colors flex justify-center items-center gap-2 disabled:bg-rose-300 disabled:cursor-not-allowed"
            >
              <span>تایید انتخاب</span>
              {selectedNeighborhoods.length > 0 && !selectedNeighborhoods.includes('همه محله‌ها') && (
                <span className="bg-white/20 px-2 py-0.5 rounded-md text-[13px] md:text-sm">
                  {selectedNeighborhoods.length.toLocaleString("fa")} محله
                </span>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
