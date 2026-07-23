//app/(dashboard)/profile/business/edit/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, ArrowLeft, CheckCircle2, Save, Loader2 } from 'lucide-react';

import RegionFilterModal from '@/components/RegionFilterModal';
import { SERVICE_DETAILS, toggleGenderAudience, type GenderAudience } from '@/components/business-form/constants';
import { validateAndCompress } from '@/components/business-form/imageUtils';
import Step1BasicInfo from '@/components/business-form/Step1BasicInfo';
import Step2Services from '@/components/business-form/Step2Services';
import Step3Socials, { type Socials } from '@/components/business-form/Step3Socials';
import Step4Images from '@/components/business-form/Step4Images';
import MapPickerModal from '@/components/business-form/MapPickerModal';

export default function BusinessEditPage() {
  const router = useRouter();
  const [userPlan, setUserPlan] = useState<'normal' | 'advanced'>('normal');
  const [maxPortfolios, setMaxPortfolios] = useState<number>(10);

  const [step, setStep] = useState(1);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [locationSelected, setLocationSelected] = useState<boolean>(false);
  const [expandedCategories, setExpandedCategories] = useState<string[]>(Object.keys(SERVICE_DETAILS));
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [isRegionModalOpen, setIsRegionModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [name, setName] = useState('');
  const [workingHours, setWorkingHours] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [phones, setPhones] = useState<string[]>(['']);
  const [closedDays, setClosedDays] = useState<string[]>([]);
  const [hasHomeService, setHasHomeService] = useState<boolean>(false);
  const [genderAudience, setGenderAudience] = useState<GenderAudience | null>(null);

  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [newTagInputs, setNewTagInputs] = useState<Record<string, string>>({});
  const [customServices, setCustomServices] = useState<Record<string, string[]>>({});

  const [selectedProvince, setSelectedProvince] = useState<string>('');
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [selectedNeighborhoods, setSelectedNeighborhoods] = useState<string[]>([]);
  const [coordinates, setCoordinates] = useState<[number, number] | null>(null);
  const [tempCoordinates, setTempCoordinates] = useState<[number, number] | null>(null);

  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [existingCover, setExistingCover] = useState<string | null>(null);

  const [portfolios, setPortfolios] = useState<File[]>([]);
  const [existingPortfolios, setExistingPortfolios] = useState<string[]>([]);

  const [socials, setSocials] = useState<Socials>({
    instagram: '', whatsapp: '', telegram: '', rubika: '', bale: '', website: ''
  });

  // تابع حدس دسته‌بندی تگ‌های اختصاصی از روی کلمات
  const guessCategory = (tag: string) => {
    const lowerTag = tag.toLowerCase();
    if (/(مو|شینیون|رنگ|کراتین|بافت|لایت|مش|براشینگ|اکستنشن مو)/.test(lowerTag)) return 'خدمات مو';
    if (/(ناخن|پدیکور|مانیکور|ژل|لمینت|طراحی)/.test(lowerTag)) return 'خدمات ناخن';
    if (/(مژه|ابرو|فیبروز|میکروبلیدینگ|تاتو|هاشور|لیفت)/.test(lowerTag)) return 'خدمات ابرو و مژه';
    if (/(پوست|فیشیال|پاکسازی|میکرودرم|مزوتراپی|جوش|لک)/.test(lowerTag)) return 'خدمات پوست و زیبایی';
    if (/(میکاپ|آرایش|گریم|کانتورینگ|خودآرایی)/.test(lowerTag)) return 'خدمات آرایش و میکاپ';
    if (/(عروس|فرمالیته|نامزدی|عقد)/.test(lowerTag)) return 'پکیج‌های عروس';
    if (/(لیزر|اپیلاسیون|وکس|بند|موزدایی)/.test(lowerTag)) return 'موزدایی و بدن';
    if (/(ماساژ|اسپا)/.test(lowerTag)) return 'خدمات ماساژ و اسپا';
    return 'سایر خدمات';
  };

  useEffect(() => {
    const fetchSalonData = async () => {
      try {
        const meRes = await fetch('/api/auth/me');
        if (!meRes.ok) {
          router.push('/login');
          return;
        }
        const user = await meRes.json();
        const res = await fetch(`/api/salon?userPhone=${user.phone}`);
        if (res.ok) {
          const data = await res.json();
          const salon = data.salon || data;

          if (salon) {
            setName(salon.name || '');
            setWorkingHours(salon.workingHours || '');
            setDescription(salon.description || '');
            setAddress(salon.address || '');
            setPhones(salon.phones && salon.phones.length > 0 ? salon.phones : ['']);
            setClosedDays(salon.closedDays || []);
            setHasHomeService(!!salon.hasHomeService);
            setGenderAudience(salon.genderAudience || 'BOTH');

            if (salon.tags && salon.tags.length > 0) {
              const extractedNames = salon.tags.map((t: any) => typeof t === 'string' ? t : t.name);
              setSelectedTags(extractedNames);

              const allDefaultTags = Object.values(SERVICE_DETAILS).flat();
              const loadedCustomsMap: Record<string, string[]> = {};
              const categoriesToExpand = new Set<string>();

              salon.tags.forEach((tagItem: any) => {
                const tagName = typeof tagItem === 'string' ? tagItem : tagItem.name;
                const tagCategory = typeof tagItem === 'string' ? guessCategory(tagItem) : tagItem.category;

                if (!allDefaultTags.includes(tagName)) {
                  if (!loadedCustomsMap[tagCategory]) loadedCustomsMap[tagCategory] = [];
                  if (!loadedCustomsMap[tagCategory].includes(tagName)) {
                    loadedCustomsMap[tagCategory].push(tagName);
                  }
                  categoriesToExpand.add(tagCategory);
                }
              });

              if (Object.keys(loadedCustomsMap).length > 0) {
                setCustomServices(loadedCustomsMap);
                setExpandedCategories(prev => Array.from(new Set([...prev, ...Array.from(categoriesToExpand)])));
              }
            } else {
              setSelectedTags([]);
            }

            setSelectedProvince(salon.province || '');
            setSelectedCity(salon.city || '');
            if (salon.neighborhoods && Array.isArray(salon.neighborhoods)) {
              setSelectedNeighborhoods(salon.neighborhoods);
            } else if (salon.district) {
              setSelectedNeighborhoods([salon.district]);
            }
            if (salon.coordinates) {
              setCoordinates(salon.coordinates);
            }
            if ((salon.province && salon.city) || salon.coordinates) {
              setLocationSelected(true);
            }
            if (salon.socials) {
              setSocials({
                instagram: salon.socials.instagram || '',
                whatsapp: salon.socials.whatsapp || '',
                telegram: salon.socials.telegram || '',
                rubika: salon.socials.rubika || '',
                bale: salon.socials.bale || '',
                website: salon.socials.website || ''
              });
            }
            if (salon.imageUrl) setExistingCover(salon.imageUrl);
            if (salon.portfolios && Array.isArray(salon.portfolios)) {
              setExistingPortfolios(salon.portfolios);
            }
            if (salon.planId === 'monthly-advanced') {
              setMaxPortfolios(30);
            } else {
              setMaxPortfolios(10);
            }
          } else {
            router.push('/profile/business');
          }
        }
      } catch (error) {
        console.error('Error fetching salon data:', error);
      } finally {
        setIsLoadingData(false);
      }
    };
    fetchSalonData();
  }, [router]);

  const handleAddPhone = () => setPhones([...phones, '']);
  const handleRemovePhone = (index: number) => {
    if (phones.length > 1) setPhones(phones.filter((_, i) => i !== index));
  };
  const handlePhoneChange = (index: number, value: string) => {
    const newPhones = [...phones];
    newPhones[index] = value;
    setPhones(newPhones);
  };

  const handleAddCustomTag = (category: string) => {
    const tag = newTagInputs[category]?.trim();
    if (!tag) return;

    if (!selectedTags.includes(tag)) {
      setSelectedTags(prev => [...prev, tag]);
      setCustomServices(prev => ({
        ...prev,
        [category]: [...(prev[category] || []), tag]
      }));
    }
    setNewTagInputs(prev => ({ ...prev, [category]: '' }));
  };

  const handleRemoveCustomTag = (category: string, tagToRemove: string) => {
    setCustomServices(prev => ({
      ...prev,
      [category]: (prev[category] || []).filter(t => t !== tagToRemove)
    }));
    setSelectedTags(prev => prev.filter(t => t !== tagToRemove));
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]);
  };

  const toggleClosedDay = (day: string) => {
    setClosedDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  };

  const removeNeighborhood = (nhToRemove: string) => {
    setSelectedNeighborhoods((prev) => prev.filter((nh) => nh !== nhToRemove));
  };

  // تیک زدن/برداشتن یکی از دو گزینه‌ی مخاطب سالن (بانوان/آقایون) - هر دو با هم هم قابل انتخابند
  const handleToggleGenderAudience = (value: 'FEMALE' | 'MALE') => {
    setGenderAudience(prev => toggleGenderAudience(prev, value));
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = await validateAndCompress(e.target.files[0]);
      if (file) {
        setCoverImage(file);
        setExistingCover(null);
      }
    }
  };

  const removeCoverImage = () => {
    setCoverImage(null);
    setExistingCover(null);
  };

  const handlePortfoliosUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      const currentTotal = existingPortfolios.length + portfolios.length;
      const availableSlots = maxPortfolios - currentTotal;
      const sliced = filesArray.slice(0, availableSlots);
      const compressed = (
        await Promise.all(sliced.map(f => validateAndCompress(f)))
      ).filter(Boolean) as File[];
      if (compressed.length > 0) setPortfolios(prev => [...prev, ...compressed]);
    }
  };

  const removePortfolio = (index: number) => {
    setPortfolios(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingPortfolio = (index: number) => {
    setExistingPortfolios(prev => prev.filter((_, i) => i !== index));
  };

  const nextStep = () => setStep(prev => Math.min(prev + 1, 4));
  const prevStep = () => setStep(prev => Math.max(prev - 1, 1));

  const handleLocationSelect = (province: string, city: string, neighborhoods: string[] = []) => {
    setSelectedProvince(province);
    setSelectedCity(city);
    setSelectedNeighborhoods(neighborhoods);
  };

  const openMapModal = () => {
    setTempCoordinates(coordinates || [35.6997, 51.3380]);
    setIsMapModalOpen(true);
  };

  const confirmMapPosition = () => {
    if (tempCoordinates) setCoordinates(tempCoordinates);
    setLocationSelected(true);
    setIsMapModalOpen(false);
  };

  const handleSubmit = async () => {
    if (!name || !selectedProvince || !selectedCity || !address || !workingHours) {
      alert('لطفاً تمام فیلدهای ستاره‌دار در مرحله اول را پر کنید.');
      return;
    }

    if (!genderAudience) {
      alert('لطفاً مشخص کنید سالن شما مخصوص بانوان، آقایون یا هر دو است.');
      return;
    }

    if (!coverImage && !existingCover) {
      alert('لطفا یک عکس به عنوان کاور اصلی انتخاب کنید.');
      return;
    }

    try {
      setIsSubmitting(true);
      const meRes = await fetch('/api/auth/me');
      if (!meRes.ok) {
        alert('لطفا ابتدا وارد حساب کاربری خود شوید.');
        router.push('/login');
        return;
      }
      const user = await meRes.json();
      let newCoverUrl = '';
      let newPortfolioUrls: string[] = [];

      if (coverImage) {
        const coverFormData = new FormData();
        coverFormData.append('file', coverImage);
        const coverRes = await fetch('/api/upload', { method: 'POST', body: coverFormData });
        if (!coverRes.ok) throw new Error('خطا در آپلود عکس کاور');
        const coverData = await coverRes.json();
        newCoverUrl = coverData.urls[0];
      }

      if (portfolios.length > 0) {
        const portfolioFormData = new FormData();
        portfolios.forEach(file => portfolioFormData.append('file', file));
        const portfolioRes = await fetch('/api/upload', { method: 'POST', body: portfolioFormData });
        if (!portfolioRes.ok) throw new Error('خطا در آپلود نمونه‌کارها');
        const portfolioData = await portfolioRes.json();
        newPortfolioUrls = portfolioData.urls;
      }

      const finalCoverUrl = newCoverUrl || existingCover || '';
      const finalPortfolios = [...existingPortfolios, ...newPortfolioUrls];

      const formattedTags = selectedTags.map(tagName => {
        for (const [cat, services] of Object.entries(SERVICE_DETAILS)) {
          if ((services as readonly string[]).includes(tagName)) {
            return { name: tagName, category: cat };
          }
        }
        for (const [cat, customTags] of Object.entries(customServices)) {
          if (customTags.includes(tagName)) {
            return { name: tagName, category: cat };
          }
        }
        return { name: tagName, category: 'سایر خدمات' };
      });

      const payload = {
        userPhone: user.phone,
        name, workingHours, description, address, phones, closedDays,
        hasHomeService, genderAudience,
        tags: formattedTags, province: selectedProvince, city: selectedCity,
        neighborhoods: selectedProvince === 'تهران' && selectedCity === 'تهران' ? selectedNeighborhoods : [],
        coordinates, imageUrl: finalCoverUrl, portfolios: finalPortfolios, socials
      };

      const salonRes = await fetch('/api/salon', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!salonRes.ok) {
        const errorData = await salonRes.json();
        throw new Error(errorData.error || 'خطا در ویرایش اطلاعات سالن');
      }

      alert('اطلاعات کسب‌وکار با موفقیت ویرایش شد!');
      router.push('/profile');

    } catch (error: any) {
      console.error('Error submitting form:', error);
      alert(error.message || 'خطایی رخ داد. لطفا دوباره تلاش کنید.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-12 h-12 text-[#824c71] animate-spin mb-4" />
        <p className="text-zinc-600 font-medium">در حال دریافت اطلاعات کسب‌وکار...</p>
      </div>
    );
  }

  // استخراج تمام دسته‌بندی‌ها (ترکیب دسته‌های پیش‌فرض و دسته‌های جدید احتمالی مثل "سایر خدمات")
  const allCategories = Array.from(new Set([...Object.keys(SERVICE_DETAILS), ...Object.keys(customServices)]));

  return (
    <div className="max-w-4xl mx-auto pt-8 pb-28 px-4 md:py-12 md:px-0 animate-fade-in">

      <div className="flex items-center gap-4 mb-8">
        <Link href="/profile" className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
          <ArrowRight className="text-zinc-600" size={24} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">ویرایش کسب‌وکار</h1>
          <p className="text-zinc-500 text-sm mt-1">مرحله {step.toLocaleString('fa-IR')} از ۴</p>
        </div>
      </div>

      <div className="mb-8 flex items-center justify-between relative px-4">
        <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-zinc-200 -z-10 transform -translate-y-1/2 rounded-full"></div>
        {[
          { id: 1, title: 'اطلاعات پایه' },
          { id: 2, title: 'خدمات' },
          { id: 3, title: 'ارتباطات' },
          { id: 4, title: 'تصاویر' }
        ].map((item) => (
          <div key={item.id} className="flex flex-col items-center gap-2 bg-white px-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${
              step >= item.id ? 'bg-[#824c71] text-white' : 'bg-zinc-100 text-zinc-500 border border-zinc-200'
            }`}>
              {step > item.id ? <CheckCircle2 size={20} /> : item.id.toLocaleString('fa-IR')}
            </div>
            <span className={`text-xs md:text-sm font-medium ${step >= item.id ? 'text-[#824c71]' : 'text-zinc-400'}`}>
              {item.title}
            </span>
          </div>
        ))}
      </div>

      {step === 1 && (
        <Step1BasicInfo
          name={name} onNameChange={setName}
          workingHours={workingHours} onWorkingHoursChange={setWorkingHours}
          description={description} onDescriptionChange={setDescription}
          closedDays={closedDays} onToggleClosedDay={toggleClosedDay}
          hasHomeService={hasHomeService} onHasHomeServiceChange={setHasHomeService}
          genderAudience={genderAudience} onToggleGenderAudience={handleToggleGenderAudience}
          phones={phones} onAddPhone={handleAddPhone} onRemovePhone={handleRemovePhone} onPhoneChange={handlePhoneChange}
          selectedProvince={selectedProvince} selectedCity={selectedCity} onOpenRegionModal={() => setIsRegionModalOpen(true)}
          selectedNeighborhoods={selectedNeighborhoods} onRemoveNeighborhood={removeNeighborhood}
          address={address} onAddressChange={setAddress}
          hasLocation={!!(coordinates && coordinates[0] !== 0 && coordinates[1] !== 0)}
          coordinates={coordinates}
          onOpenMapModal={openMapModal}
        />
      )}

      {step === 2 && (
        <Step2Services
          categories={allCategories}
          selectedTags={selectedTags}
          customServices={customServices}
          expandedCategories={expandedCategories}
          onToggleCategory={toggleCategory}
          onToggleTag={toggleTag}
          newTagInputs={newTagInputs}
          onNewTagInputChange={(category, value) => setNewTagInputs(prev => ({ ...prev, [category]: value }))}
          onAddCustomTag={handleAddCustomTag}
          onRemoveCustomTag={handleRemoveCustomTag}
        />
      )}

      {step === 3 && (
        <Step3Socials
          socials={socials}
          onSocialChange={(key, value) => setSocials(prev => ({ ...prev, [key]: value }))}
        />
      )}

      {step === 4 && (
        <Step4Images
          coverImage={coverImage}
          existingCoverUrl={existingCover}
          onCoverUpload={handleCoverUpload}
          onRemoveCover={removeCoverImage}
          portfolios={portfolios}
          existingPortfolios={existingPortfolios}
          onPortfoliosUpload={handlePortfoliosUpload}
          onRemovePortfolio={removePortfolio}
          onRemoveExistingPortfolio={removeExistingPortfolio}
          maxPortfolios={maxPortfolios}
        />
      )}

      {/* دکمه‌های ناوبری */}
      <div className="mt-8 md:mt-10 pt-4 md:pt-6 border-t border-zinc-100 flex items-center justify-between">
        {step > 1 ? (
          <button type="button" onClick={prevStep} className="flex items-center gap-1.5 md:gap-2 px-4 py-2.5 md:px-6 md:py-3 rounded-lg md:rounded-xl font-medium text-sm md:text-base text-zinc-600 hover:bg-zinc-100 transition">
            <ArrowRight className="w-4 h-4 md:w-5 md:h-5" /> مرحله قبل
          </button>
        ) : <div></div>}

        {step < 4 ? (
          <button type="button" onClick={nextStep} className="flex items-center gap-1.5 md:gap-2 bg-[#824c71] text-white px-5 py-2.5 md:px-8 md:py-3 rounded-lg md:rounded-xl font-medium text-sm md:text-base hover:bg-[#6e3f60] transition">
            مرحله بعد <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex items-center gap-1.5 md:gap-2 bg-[#824c71] text-white px-5 py-2.5 md:px-8 md:py-3 rounded-lg md:rounded-xl font-medium text-sm md:text-base hover:bg-[#6e3f60] transition disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" /> : <Save className="w-4 h-4 md:w-5 md:h-5" />}
            {isSubmitting ? 'در حال بروزرسانی...' : 'ویرایش و ذخیره'}
          </button>
        )}
      </div>

      <RegionFilterModal
        isOpen={isRegionModalOpen}
        onClose={() => setIsRegionModalOpen(false)}
        onSelectLocation={handleLocationSelect}
        initialProvince={selectedProvince}
        initialCity={selectedCity}
        initialNeighborhoods={selectedNeighborhoods}
        maxNeighborhoods={4}
      />

      <MapPickerModal
        isOpen={isMapModalOpen}
        position={tempCoordinates || coordinates || [35.6892, 51.3890]}
        onPositionChange={setTempCoordinates}
        onClose={() => setIsMapModalOpen(false)}
        onConfirm={confirmMapPosition}
        helperText="لطفا نقشه را جابجا کنید تا نشانگر روی لوکیشن شما قرار بگیرد."
      />
    </div>
  );
}