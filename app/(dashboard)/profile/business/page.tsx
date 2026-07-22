// app/(dashboard)/profile/business/page.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react';

import RegionFilterModal from '@/components/RegionFilterModal';
import { SERVICE_DETAILS } from '@/components/business-form/constants';
import { validateAndCompress } from '@/components/business-form/imageUtils';
import Step1BasicInfo from '@/components/business-form/Step1BasicInfo';
import Step2Services from '@/components/business-form/Step2Services';
import Step3Socials, { type Socials } from '@/components/business-form/Step3Socials';
import Step4Images from '@/components/business-form/Step4Images';
import MapPickerModal from '@/components/business-form/MapPickerModal';

export default function BusinessRegistrationPage() {
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [locationSelected, setLocationSelected] = useState<boolean>(false);
  const [expandedCategories, setExpandedCategories] = useState<string[]>(Object.keys(SERVICE_DETAILS));
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [isRegionModalOpen, setIsRegionModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // استیت انتخاب پلن (فعلاً همیشه advanced ارسال می‌شود، مرحله انتخاب پلن موقتا غیرفعال است)
  const [selectedPlanId] = useState<string>('monthly-advanced');

  const maxPortfolios = 10; // سقف پیش‌فرض برای همه در مرحله ساخت کسب‌وکار

  const [name, setName] = useState('');
  const [workingHours, setWorkingHours] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');

  const [customServices, setCustomServices] = useState<Record<string, string[]>>({});
  const [newTagInputs, setNewTagInputs] = useState<Record<string, string>>({});

  const [coordinates, setCoordinates] = useState<[number, number]>([35.6997, 51.3380]); // پیش‌فرض: تهران
  const [tempCoordinates, setTempCoordinates] = useState<[number, number]>([35.6997, 51.3380]);

  const [phones, setPhones] = useState<string[]>(['']);
  const [closedDays, setClosedDays] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedProvince, setSelectedProvince] = useState<string>('');
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [selectedNeighborhoods, setSelectedNeighborhoods] = useState<string[]>([]);

  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [portfolios, setPortfolios] = useState<File[]>([]);

  const [socials, setSocials] = useState<Socials>({
    instagram: '', whatsapp: '', telegram: '', rubika: '', bale: '', website: ''
  });

  const handleAddPhone = () => setPhones([...phones, '']);
  const handleRemovePhone = (index: number) => {
    if (phones.length > 1) {
      setPhones(phones.filter((_, i) => i !== index));
    }
  };
  const handlePhoneChange = (index: number, value: string) => {
    const newPhones = [...phones];
    newPhones[index] = value;
    setPhones(newPhones);
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const handleAddCustomTag = (category: string) => {
    const tag = newTagInputs[category]?.trim();
    if (!tag) return;

    setCustomServices(prev => ({
      ...prev,
      [category]: [...(prev[category] || []), tag]
    }));

    if (!selectedTags.includes(tag)) {
      setSelectedTags(prev => [...prev, tag]);
    }

    setNewTagInputs(prev => ({ ...prev, [category]: '' }));
  };

  const handleRemoveCustomTag = (category: string, tagToRemove: string) => {
    setCustomServices(prev => ({
      ...prev,
      [category]: prev[category]?.filter(tag => tag !== tagToRemove) || []
    }));

    if (selectedTags.includes(tagToRemove)) {
      setSelectedTags(prev => prev.filter(t => t !== tagToRemove));
    }
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]);
  };

  const toggleClosedDay = (day: string) => {
    setClosedDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = await validateAndCompress(e.target.files[0]);
      if (file) setCoverImage(file);
    }
  };

  const removeCoverImage = () => setCoverImage(null);

  const handlePortfoliosUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      const availableSlots = maxPortfolios - portfolios.length;
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

  const nextStep = () => {
    if (step === 1) {
      const hasValidPhone = phones.some(phone => phone.trim() !== '');

      if (
        !name.trim() ||
        !workingHours.trim() ||
        !description.trim() ||
        !selectedProvince ||
        !selectedCity ||
        !address.trim() ||
        !hasValidPhone
      ) {
        alert('لطفاً تمامی کادرهای ستاره‌دار را پر کنید تا بتوانید به مرحله بعد بروید.');
        return;
      }
    }

    setStep(prev => Math.min(prev + 1, 5));
  };
  const prevStep = () => setStep(prev => Math.max(prev - 1, 1));

  const handleLocationSelect = (province: string, city: string, neighborhoods: string[] = []) => {
    setSelectedProvince(province);
    setSelectedCity(city);
    setSelectedNeighborhoods(neighborhoods);
  };

  const removeNeighborhood = (nhToRemove: string) => {
    setSelectedNeighborhoods((prev) => prev.filter((nh) => nh !== nhToRemove));
  };

  const openMapModal = () => {
    setTempCoordinates(coordinates);
    setIsMapModalOpen(true);
  };

  const confirmMapPosition = () => {
    setCoordinates(tempCoordinates);
    setLocationSelected(true);
    setIsMapModalOpen(false);
  };

  const handleSubmit = async () => {
    if (!name || !selectedProvince || !selectedCity || !address || !workingHours) {
      alert('لطفاً تمام فیلدهای ستاره‌دار در مرحله اول را پر کنید.');
      return;
    }

    if (!coverImage) {
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

      const coverFormData = new FormData();
      coverFormData.append('file', coverImage);

      const coverRes = await fetch('/api/upload', {
        method: 'POST',
        body: coverFormData,
      });

      if (!coverRes.ok) throw new Error('خطا در آپلود عکس کاور');
      const coverData = await coverRes.json();
      const uploadedCoverUrl = coverData.urls[0];

      let uploadedPortfolioUrls: string[] = [];
      if (portfolios.length > 0) {
        const portfolioFormData = new FormData();
        portfolios.forEach(file => {
          portfolioFormData.append('file', file);
        });

        const portfolioRes = await fetch('/api/upload', {
          method: 'POST',
          body: portfolioFormData,
        });

        if (!portfolioRes.ok) throw new Error('خطا در آپلود نمونه کارها');
        const portfolioData = await portfolioRes.json();
        uploadedPortfolioUrls = portfolioData.urls;
      }

      const formattedTags = selectedTags.map(tagName => {
        for (const [category, services] of Object.entries(SERVICE_DETAILS)) {
          if ((services as readonly string[]).includes(tagName)) return { name: tagName, category };
        }
        for (const [category, services] of Object.entries(customServices)) {
          if (services.includes(tagName)) return { name: tagName, category };
        }
        return { name: tagName, category: 'سایر' };
      });

      const payload = {
        userPhone: user.phone,
        name,
        province: selectedProvince,
        city: selectedCity,
        neighborhoods: selectedNeighborhoods,
        address,
        coordinates,
        phones: phones.filter(p => p.trim() !== ''),
        workingHours,
        closedDays,
        tags: formattedTags,
        description: description || 'توضیحات پیش‌فرض سالن',
        socials,
        imageUrl: uploadedCoverUrl,
        portfolios: uploadedPortfolioUrls,
        planId: selectedPlanId,
      };

      const response = await fetch('/api/business/create-pending', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'خطا در ارتباط با سرور');
      }

      if (data.success) {
        alert('کسب‌وکار شما با موفقیت ثبت و فعال شد!');
        router.push('/');
      } else if (data.paymentUrl) {
        window.location.href = data.paymentUrl;
      } else {
        alert('کسب‌وکار شما با موفقیت ثبت شد!');
        router.push('/');
      }

    } catch (error: any) {
      console.error(error);
      alert(error.message || 'خطایی رخ داد. لطفاً دوباره تلاش کنید.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto pt-6 pb-32 px-4 md:pt-8 md:pb-28 md:px-0 animate-fade-in">

      {/* هدر و دکمه بازگشت */}
      <div className="flex items-center gap-3 md:gap-4 mb-6 md:mb-8">
        <Link href="/profile" className="p-1.5 md:p-2 hover:bg-zinc-100 rounded-full transition-colors">
          <ArrowRight className="text-zinc-600 w-5 h-5 md:w-6 md:h-6" />
        </Link>
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-zinc-900">ثبت کسب‌وکار جدید</h1>
          <p className="text-zinc-500 text-xs md:text-sm mt-0.5 md:mt-1">مرحله {step.toLocaleString('fa-IR')} از ۴</p>
        </div>
      </div>

      {/* نشانگر مراحل (Stepper) */}
      <div className="mb-6 md:mb-8 flex items-center justify-between relative px-2 md:px-4">
        <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-zinc-200 -z-10 transform -translate-y-1/2 rounded-full mx-4 md:mx-6"></div>

        {[
          { id: 1, title: 'اطلاعات پایه' },
          { id: 2, title: 'خدمات' },
          { id: 3, title: 'ارتباطات' },
          { id: 4, title: 'تصاویر' },
        ].map((item) => (
          <div key={item.id} className="flex flex-col items-center gap-2 bg-white md:bg-transparent px-1 md:px-2 z-10" style={{ backgroundColor: 'var(--background, #ffffff)' }}>
            <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center font-bold text-xs md:text-sm transition-colors ${
              step >= item.id
                ? 'bg-[#824c71] text-white'
                : 'bg-zinc-100 text-zinc-500 border border-zinc-200'
            }`}>
              {step > item.id ? <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5" /> : item.id.toLocaleString('fa-IR')}
            </div>
          </div>
        ))}
      </div>

      {step === 1 && (
        <Step1BasicInfo
          name={name} onNameChange={setName}
          workingHours={workingHours} onWorkingHoursChange={setWorkingHours}
          description={description} onDescriptionChange={setDescription}
          closedDays={closedDays} onToggleClosedDay={toggleClosedDay}
          phones={phones} onAddPhone={handleAddPhone} onRemovePhone={handleRemovePhone} onPhoneChange={handlePhoneChange}
          selectedProvince={selectedProvince} selectedCity={selectedCity} onOpenRegionModal={() => setIsRegionModalOpen(true)}
          selectedNeighborhoods={selectedNeighborhoods} onRemoveNeighborhood={removeNeighborhood}
          address={address} onAddressChange={setAddress}
          hasLocation={locationSelected} coordinates={coordinates} onOpenMapModal={openMapModal}
        />
      )}

      {step === 2 && (
        <Step2Services
          categories={Object.keys(SERVICE_DETAILS)}
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
          onCoverUpload={handleCoverUpload}
          onRemoveCover={removeCoverImage}
          portfolios={portfolios}
          onPortfoliosUpload={handlePortfoliosUpload}
          onRemovePortfolio={removePortfolio}
          maxPortfolios={maxPortfolios}
          portfolioFootnote={
            <p className="text-[10px] md:text-xs text-blue-600 mb-4 bg-blue-50 p-2 md:p-2.5 rounded-lg md:rounded-xl">
              در مرحله ثبت اولیه امکان آپلود حداکثر ۱۰ نمونه‌کار وجود دارد. در صورت خرید اشتراک پیشرفته، پس از تکمیل ثبت‌نام می‌توانید تا ۳۰ نمونه‌کار به پروفایل خود اضافه کنید.
            </p>
          }
        />
      )}

      {/* دکمه‌های ناوبری (پایین فرم) */}
      <div className="mt-8 md:mt-10 pt-4 md:pt-6 border-t border-zinc-100 flex flex-row items-center justify-between gap-3 md:gap-4">
        {step > 1 && (
          <button
            type="button"
            onClick={prevStep}
            className="flex-1 flex items-center justify-center gap-1.5 md:gap-2 px-3 py-2.5 md:px-6 md:py-3 rounded-lg md:rounded-xl font-medium text-zinc-600 hover:bg-zinc-100 transition border border-transparent text-xs md:text-sm"
          >
            <ArrowRight className="w-4 h-4 md:w-5 md:h-5" /> مرحله قبل
          </button>
        )}

        {step < 4 ? (
          <button
            type="button"
            onClick={nextStep}
            className="flex-1 flex items-center justify-center gap-1.5 md:gap-2 bg-[#824c71] text-white px-3 py-2.5 md:px-8 md:py-3 rounded-lg md:rounded-xl font-medium hover:bg-[#6e3f60] transition shadow-lg shadow-[#e3c9dc]/40 text-xs md:text-sm"
          >
            مرحله بعد <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 flex items-center justify-center gap-1.5 md:gap-2 bg-[#824c71] text-white px-3 py-2.5 md:px-8 md:py-3 rounded-lg md:rounded-xl font-medium hover:bg-[#6e3f60] transition shadow-lg shadow-[#e3c9dc]/40 disabled:opacity-70 disabled:cursor-not-allowed text-xs md:text-sm"
          >
            {isSubmitting ? (
              <div className="w-4 h-4 md:w-5 md:h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              'ثبت و پرداخت'
            )}
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
        position={tempCoordinates}
        onPositionChange={setTempCoordinates}
        onClose={() => setIsMapModalOpen(false)}
        onConfirm={confirmMapPosition}
      />
    </div>
  );
}
