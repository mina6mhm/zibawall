// app/components/RegionFilterModal.tsx

"use client";

import { useState, useEffect } from "react";
import { X, ChevronLeft, Check, Search } from "lucide-react";

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

const ALL_NEIGHBORHOODS = "همه محله‌ها";
const TEHRAN = "تهران";

// --- کش سطح ماژول: لیست مکان‌ها داده‌ی ثابته؛ فقط یک‌بار برای هر کاربر دریافت می‌شه ---
// و اگر چند نمونه از مودال هم‌زمان باز بشن، یک درخواست مشترک می‌رن.
let locationsCache: LocationData[] | null = null;
let locationsPromise: Promise<LocationData[]> | null = null;

function loadLocations(): Promise<LocationData[]> {
  if (locationsCache) return Promise.resolve(locationsCache);
  if (!locationsPromise) {
    locationsPromise = fetch("/api/locations")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch");
        return res.json();
      })
      .then((data: LocationData[]) => {
        locationsCache = data;
        return data;
      })
      .catch((err) => {
        locationsPromise = null; // اجازه‌ی تلاش مجدد
        throw err;
      });
  }
  return locationsPromise;
}

// فعلاً فقط تهران محله دارد
function getCityDistricts(
  province: LocationData | null | undefined,
  city: CityData
): Record<string, string[]> | undefined {
  if (province?.name === TEHRAN && city.name === TEHRAN) {
    return city.districts || province.districts;
  }
  return undefined;
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
  const [locations, setLocations] = useState<LocationData[]>(locationsCache ?? []);
  const [loading, setLoading] = useState(!locationsCache);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const [step, setStep] = useState<"province" | "city" | "neighborhood">("province");
  const [activeProvince, setActiveProvince] = useState<LocationData | null>(null);
  const [activeCity, setActiveCity] = useState<CityData | null>(null);

  const [selectedNeighborhoods, setSelectedNeighborhoods] = useState<string[]>(
    initialNeighborhoods
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [limitMessage, setLimitMessage] = useState("");

  // دریافت لیست مکان‌ها فقط وقتی مودال واقعاً باز می‌شود (قبلاً با mount شدن، حتی بسته، درخواست می‌رفت)
  useEffect(() => {
    if (!isOpen || locations.length > 0) return;
    let cancelled = false;
    setLoading(true);
    setLoadError(false);

    loadLocations()
      .then((data) => {
        if (!cancelled) setLocations(data);
      })
      .catch((error) => {
        console.error("Error loading locations:", error);
        if (!cancelled) setLoadError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, locations.length, reloadKey]);

  const initialNeighborhoodsStr = JSON.stringify(initialNeighborhoods);

  // همگام‌سازی state با مقدار اولیه هر بار که مودال باز می‌شود
  useEffect(() => {
    if (!isOpen) return;
    setSelectedNeighborhoods(JSON.parse(initialNeighborhoodsStr));
    setSearchQuery("");
    setLimitMessage("");

    if (initialProvince && initialCity && locations.length > 0) {
      const currentProvince = locations.find((p) => p.name === initialProvince);
      const currentCity = currentProvince?.cities?.find((c) => c.name === initialCity);

      if (currentProvince && currentCity) {
        setActiveProvince(currentProvince);
        const cityDistricts = getCityDistricts(currentProvince, currentCity);

        if (cityDistricts && Object.keys(cityDistricts).length > 0) {
          setActiveCity({ ...currentCity, districts: cityDistricts });
          setStep("neighborhood");
        } else {
          setActiveCity(currentCity);
          setStep("city");
        }
      }
    }
  }, [isOpen, initialNeighborhoodsStr, initialProvince, initialCity, locations]);

  // قفل اسکرول صفحه‌ی پشت مودال
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  // پیام محدودیت تعداد محله خودش محو می‌شود
  useEffect(() => {
    if (!limitMessage) return;
    const t = setTimeout(() => setLimitMessage(""), 2500);
    return () => clearTimeout(t);
  }, [limitMessage]);

  if (!isOpen) return null;

  const handleProvinceSelect = (province: LocationData) => {
    setActiveProvince(province);
    setSearchQuery("");
    setStep("city");
  };

  const handleCitySelect = (city: CityData) => {
    const cityDistricts = getCityDistricts(activeProvince, city);

    if (cityDistricts && Object.keys(cityDistricts).length > 0) {
      setActiveCity({ ...city, districts: cityDistricts });
      setSearchQuery("");
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

  // نکته: قبلاً alert() داخل updater تابع setState بود؛ در StrictMode دوبار اجرا می‌شد.
  // حالا منطق بیرون از updater است و به‌جای alert یک پیام داخل مودال نشان داده می‌شود.
  const toggleNeighborhood = (neighborhood: string) => {
    if (neighborhood === ALL_NEIGHBORHOODS) {
      setSelectedNeighborhoods([ALL_NEIGHBORHOODS]);
      return;
    }

    const withoutAll = selectedNeighborhoods.filter((n) => n !== ALL_NEIGHBORHOODS);

    if (withoutAll.includes(neighborhood)) {
      setSelectedNeighborhoods(withoutAll.filter((n) => n !== neighborhood));
      return;
    }

    if (maxNeighborhoods && withoutAll.length >= maxNeighborhoods) {
      setSelectedNeighborhoods(withoutAll);
      setLimitMessage(
        `شما حداکثر می‌توانید ${maxNeighborhoods.toLocaleString("fa")} محله انتخاب کنید.`
      );
      return;
    }

    setSelectedNeighborhoods([...withoutAll, neighborhood]);
  };

  const handleConfirmSelection = () => {
    if (activeProvince && activeCity) {
      onSelectLocation(activeProvince.name, activeCity.name, selectedNeighborhoods);
      resetModal();
    }
  };

  const resetModal = () => {
    setStep("province");
    setActiveProvince(null);
    setActiveCity(null);
    setSelectedNeighborhoods([]);
    setSearchQuery("");
    setLimitMessage("");
    onClose();
  };

  const handleBack = () => {
    setSearchQuery("");
    setLimitMessage("");
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
      return <div className="p-8 text-center text-zinc-500">در حال بارگذاری...</div>;
    }

    if (loadError) {
      return (
        <div className="p-8 text-center">
          <p className="text-zinc-500 text-sm mb-4">دریافت لیست مکان‌ها با خطا مواجه شد.</p>
          <button
            type="button"
            onClick={() => setReloadKey((k) => k + 1)}
            className="px-5 py-2.5 rounded-xl bg-[#824c71] text-white text-sm font-bold"
          >
            تلاش دوباره
          </button>
        </div>
      );
    }

    if (step === "province") {
      const filteredProvinces = locations.filter((prov) => prov.name.includes(searchQuery));

      return (
        <ul className="flex flex-col px-5">
          {filteredProvinces.length > 0 ? (
            filteredProvinces.map((prov) => (
              <li
                key={prov.id}
                className="flex justify-between items-center py-4 border-b border-zinc-100 last:border-0 cursor-pointer hover:bg-zinc-50 transition-colors"
                onClick={() => handleProvinceSelect(prov)}
              >
                <span className="text-zinc-800 text-[15px]">{prov.name}</span>
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
      const filteredCities = (activeProvince.cities || []).filter((city) =>
        city.name.includes(searchQuery)
      );

      return (
        <ul className="flex flex-col px-5">
          {filteredCities.length > 0 ? (
            filteredCities.map((city) => (
              <li
                key={city.id}
                className="flex justify-between items-center py-4 border-b border-zinc-100 last:border-0 cursor-pointer hover:bg-zinc-50 transition-colors"
                onClick={() => handleCitySelect(city)}
              >
                <span className="text-zinc-800 text-[15px]">{city.name}</span>
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
        : [ALL_NEIGHBORHOODS, ...allNeighborhoods];

      const filteredNeighborhoods = displayNeighborhoods.filter((nh) =>
        nh.includes(searchQuery)
      );

      return (
        <div className="flex flex-col px-5">
          {filteredNeighborhoods.length > 0 ? (
            filteredNeighborhoods.map((nh: string, index: number) => {
              const isSelected = selectedNeighborhoods.includes(nh);

              return (
                <button
                  type="button"
                  key={`${nh}-${index}`}
                  onClick={() => toggleNeighborhood(nh)}
                  className="flex w-full items-center justify-between py-4 border-b border-zinc-100 last:border-0 cursor-pointer hover:bg-zinc-50 transition-colors"
                >
                  <span
                    className={`text-[15px] md:text-sm text-right transition-colors ${
                      isSelected ? "text-[#824c71] font-medium" : "text-zinc-700"
                    }`}
                  >
                    {nh}
                  </span>

                  <div
                    className={`w-5 h-5 rounded-[4px] border flex items-center justify-center shrink-0 transition-colors ${
                      isSelected ? "bg-[#824c71] border-[#824c71]" : "border-zinc-300"
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                  </div>
                </button>
              );
            })
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
        className="bg-white w-full h-[85vh] md:h-auto md:max-h-[85vh] md:max-w-lg rounded-t-[24px] md:rounded-2xl shadow-xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-full md:zoom-in-95 duration-300"
      >
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

        {!loading && !loadError && (
          <div className="px-5 pb-4 border-b border-zinc-100 bg-white shrink-0">
            <div className="relative flex items-center">
              <Search className="absolute right-3.5 w-5 h-5 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  step === "province"
                    ? "جستجوی استان..."
                    : step === "city"
                    ? "جستجوی شهر..."
                    : "جستجوی محله..."
                }
                className="w-full bg-white text-zinc-800 rounded-lg py-3.5 pr-11 pl-10 text-[15px] md:text-sm placeholder:text-zinc-400 focus:outline-none border border-zinc-300 focus:border-zinc-400 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
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
            {limitMessage && (
              <p className="text-center text-xs font-medium text-red-500 mb-2.5">{limitMessage}</p>
            )}
            <button
              type="button"
              onClick={handleConfirmSelection}
              disabled={selectedNeighborhoods.length === 0}
              className="w-full bg-[#824c71] hover:bg-[#824c71]/80 text-white py-4 md:py-3.5 rounded-xl text-[15px] md:text-base font-bold transition-colors flex justify-center items-center gap-2 disabled:bg-[#e3c9dc] disabled:cursor-not-allowed"
            >
              <span>تایید انتخاب</span>
              {selectedNeighborhoods.length > 0 &&
                !selectedNeighborhoods.includes(ALL_NEIGHBORHOODS) && (
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