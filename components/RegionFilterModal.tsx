"use client";

import { useState, useEffect } from "react";
import { X, ChevronLeft, Check } from "lucide-react";

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
  initialProvince?: string;        // 👈 نام پراپ اصلاح شد
  initialCity?: string;            // 👈 نام پراپ اصلاح شد
  initialNeighborhoods?: string[]; // 👈 نام پراپ اصلاح شد
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
      // بازیابی محله‌های انتخاب شده قبلی
      setSelectedNeighborhoods(JSON.parse(initialNeighborhoodsStr));

      // تنظیم مجدد استان و شهر به مقادیر اولیه پاس داده شده
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
      setStep("neighborhood");
      
      // اگر شهری که کلیک کرده، همون شهرِ اولیه است محله‌ها را نگه دار
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
    onClose();
  };

  const handleBack = () => {
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
      return (
        <ul className="p-4 space-y-2">
          {locations.map((prov) => (
            <li
              key={prov.id}
              className="flex justify-between items-center p-3.5 bg-zinc-50 hover:bg-rose-50 rounded-xl cursor-pointer border border-transparent hover:border-rose-100 transition-colors"
              onClick={() => handleProvinceSelect(prov)}
            >
              <span className="text-zinc-800 font-medium">{prov.name}</span>
              <ChevronLeft className="w-5 h-5 text-zinc-400" />
            </li>
          ))}
        </ul>
      );
    }

    if (step === "city" && activeProvince) {
      return (
        <ul className="p-4 space-y-2">
          {(activeProvince.cities || []).map((city) => (
            <li
              key={city.id}
              className="flex justify-between items-center p-3.5 bg-zinc-50 hover:bg-rose-50 rounded-xl cursor-pointer border border-transparent hover:border-rose-100 transition-colors"
              onClick={() => handleCitySelect(city)}
            >
              <span className="text-zinc-800 font-medium">{city.name}</span>
              <ChevronLeft className="w-5 h-5 text-zinc-400" />
            </li>
          ))}
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

      return (
        <div className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {displayNeighborhoods.map((nh: string, index: number) => {
              const isSelected = selectedNeighborhoods.includes(nh);

              return (
                <button
                  type="button"
                  key={`${nh}-${index}`}
                  onClick={() => toggleNeighborhood(nh)}
                  className={`flex w-full text-right items-center gap-3 p-3 rounded-xl cursor-pointer border transition-colors ${
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
                    className={`text-sm ${
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
        </div>
      );
    }

    return null;
  };

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-[9999] flex items-end md:items-center justify-center bg-black/60 md:p-4 backdrop-blur-sm"
      onClick={resetModal}
    >
      <div
        onClick={(e) => e.stopPropagation()} 
        className="bg-white w-full max-h-[calc(100dvh-1rem)] md:h-auto md:max-h-[85vh] md:max-w-lg rounded-t-2xl md:rounded-2xl shadow-xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 md:zoom-in-95 duration-200"
      >
        <div className="flex items-center justify-between p-4 md:p-5 border-b border-zinc-100 shrink-0 bg-white z-10">
          <div className="flex items-center gap-2">
            {step !== "province" && (
              <button
                type="button"
                onClick={handleBack}
                className="p-1.5 hover:bg-zinc-100 rounded-full transition-colors"
              >
                <ChevronLeft className="w-5 h-5 rotate-180 text-zinc-600" />
              </button>
            )}
            <h2 className="text-lg font-bold text-zinc-900">
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
            className="p-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto hide-scrollbar">
          {renderContent()}
        </div>

        {step === "neighborhood" && (
          <div className="shrink-0 z-20 bg-white border-t border-zinc-100 shadow-[0_-4px_15px_-5px_rgba(0,0,0,0.08)] p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
            <button
              type="button"
              onClick={handleConfirmSelection}
              disabled={selectedNeighborhoods.length === 0}
              className="w-full bg-rose-600 hover:bg-rose-700 text-white py-3.5 rounded-xl text-base font-bold transition-colors flex justify-center items-center gap-2 disabled:bg-rose-300 disabled:cursor-not-allowed"
            >
              <span>تایید انتخاب</span>
              {selectedNeighborhoods.length > 0 && !selectedNeighborhoods.includes('همه محله‌ها') && (
                <span className="bg-white/20 px-2 py-0.5 rounded-md text-sm">
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
