// app/(dashboard)/profile/business/page.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { 
  Store, 
  MapPin, 
  Clock, 
  Save,
  ArrowRight,
  ArrowLeft,
  Phone,
  MessageCircle,
  Send,
  Globe,
  Plus,
  Trash2,
  Map,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  X,
  ImagePlus,
  UploadCloud,
  FileText,
  ImageIcon,
  CreditCard // <-- اضافه شد
} from 'lucide-react';
import RegionFilterModal from '@/components/RegionFilterModal'; 
import SubscriptionPicker from '@/components/SubscriptionPicker'; // <-- اضافه شد

// لود کردن نقشه فقط در سمت کلاینت
const MapPicker = dynamic(() => import('@/components/MapPicker'), {
  ssr: false,
  loading: () => <div className="w-full h-full flex items-center justify-center bg-zinc-100 text-zinc-500">در حال بارگذاری نقشه...</div>
});

const SERVICE_DETAILS = {
  'خدمات مو': [
    'کوتاهی ژورنالی', 'رنگ، لایت و مش', 'بالیاژ و آمبره', 'کراتینه و احیا مو', 
    'پروتئین‌تراپی و بوتاکس مو', 'شینیون و استایل مو', 'اکستنشن مو', 'بافت مو', 'براشینگ'
  ],
  'خدمات ناخن': [
    'کاشت ناخن (پودر/ژل)', 'ترمیم ناخن', 'ژلیش (لاک ژل)', 'لمینت ناخن', 
    'مانیکور', 'پدیکور و کفسابی', 'طراحی و دیزاین ناخن', 'ریموو ناخن'
  ],
  'خدمات ابرو و مژه': [
    'اصلاح و قرینه‌سازی ابرو', 'میکروبلیدینگ و فیبروز ابرو', 'تاتو و هاشور ابرو', 
    'اکستنشن مژه (کلاسیک/والیوم/مگاوالیوم)', 'کاشت مژه موقت', 'لیفت و لمینت مژه', 'لیفت ابرو'
  ],
  'خدمات پوست و زیبایی': [
    'فیشیال و پاکسازی تخصصی', 'میکرودرم و میکرونیدلینگ', 'مزوتراپی پوست', 
    'پلاژن تراپی', 'درمان لک و جوش', 'ماساژ صورت'
  ],
  'خدمات آرایش و میکاپ': [
    'میکاپ محفلی (VIP/ویژه)', 'گریم تخصصی و کانتورینگ', 'آرایش دائم (خط چشم، شیدینگ لب)', 
    'خودآرایی'
  ],
  'پکیج‌های عروس': [
    'پکیج کامل عروس (VIP)', 'پکیج عقد و نامزدی', 'پکیج فرمالیته', 
    'میکاپ و شینیون عروس', 'مشاوره تخصصی عروس'
  ],
  'موزدایی و بدن': [
    'اپیلاسیون کل بدن', 'اپیلاسیون گیاهی / پیشرفته', 'لیزر موهای زائد', 
    'وکس صورت', 'بند و ابرو (اصلاح صورت)'
  ],
  'خدمات ماساژ و اسپا': [
    'ماساژ ریلکسی', 'ماساژ درمانی', 'ماساژ سنگ داغ', 'اسپا و حمام مغربی'
  ]
};

const WEEK_DAYS = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه'];

export default function BusinessRegistrationPage() {
  const router = useRouter();
  
  const [step, setStep] = useState(1);
  const [locationSelected, setLocationSelected] = useState<boolean>(false);
  const [expandedCategories, setExpandedCategories] = useState<string[]>(Object.keys(SERVICE_DETAILS));
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [isRegionModalOpen, setIsRegionModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // استیت انتخاب پلن (اضافه شد)
  const [selectedPlanId, setSelectedPlanId] = useState<string>('monthly-advanced');

  const maxPortfolios = 10; // سقف پیش‌فرض برای همه در مرحله ساخت کسب‌وکار

  const [name, setName] = useState('');
  const [workingHours, setWorkingHours] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');

  // استیت‌های مربوط به افزودن تگ دلخواه
  const [customServices, setCustomServices] = useState<Record<string, string[]>>({});
  const [newTagInputs, setNewTagInputs] = useState<Record<string, string>>({});

  
  // مختصات نقشه اصلی و موقت
  const [coordinates, setCoordinates] = useState<[number, number]>([35.6997, 51.3380]); // پیش‌فرض: تهران
  const [tempCoordinates, setTempCoordinates] = useState<[number, number]>([35.6997, 51.3380]);
  
  const [phones, setPhones] = useState<string[]>(['']);
  const [closedDays, setClosedDays] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedProvince, setSelectedProvince] = useState<string>('');
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [selectedNeighborhoods, setSelectedNeighborhoods] = useState<string[]>([]);
  
  // استیت‌های عکس‌ها
  const [coverImage, setCoverImage] = useState<File | null>(null); // عکس کاور
  const [portfolios, setPortfolios] = useState<File[]>([]); // نمونه کارها
  
  const [socials, setSocials] = useState({
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

    // اضافه کردن تگ به لیست تگ‌های اختصاصی همان دسته
    setCustomServices(prev => ({
      ...prev,
      [category]: [...(prev[category] || []), tag]
    }));

    // انتخاب خودکار تگ اضافه شده
    if (!selectedTags.includes(tag)) {
      setSelectedTags(prev => [...prev, tag]);
    }

    // خالی کردن اینپوت
    setNewTagInputs(prev => ({ ...prev, [category]: '' }));
  };

  const handleRemoveCustomTag = (category: string, tagToRemove: string) => {
    // حذف از لیست خدمات اختصاصی همان دسته
    setCustomServices(prev => ({
      ...prev,
      [category]: prev[category]?.filter(tag => tag !== tagToRemove) || []
    }));

    // حذف خودکار از لیست تگ‌های انتخاب‌شده
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

  // هندلر آپلود کاور
  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setCoverImage(e.target.files[0]);
    }
  };

  const removeCoverImage = () => setCoverImage(null);

  // هندلر آپلود نمونه کارها
    const handlePortfoliosUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      const availableSlots = maxPortfolios - portfolios.length;
      const newFiles = filesArray.slice(0, availableSlots);
      
      if (newFiles.length > 0) {
        setPortfolios(prev => [...prev, ...newFiles]);
      } else {
        alert(`شما در این اشتراک حداکثر می‌توانید ${maxPortfolios} عکس آپلود کنید.`);
      }
    }
  };


  const removePortfolio = (index: number) => {
    setPortfolios(prev => prev.filter((_, i) => i !== index));
  };

  const nextStep = () => {
    // اعتبارسنجی مرحله ۱
    if (step === 1) {
      // بررسی اینکه حداقل یک شماره تماس وارد شده باشد
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
        return; // توقف اجرا و جلوگیری از رفتن به مرحله بعد
      }
    }

    setStep(prev => Math.min(prev + 1, 5)); // تغییر از 4 به 5
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
      const storedUser = localStorage.getItem('user');
      if (!storedUser) {
        alert('لطفا ابتدا وارد حساب کاربری خود شوید.');
        router.push('/login');
        return;
      }
      const user = JSON.parse(storedUser);

      // --- ۱. آپلود عکس کاور ---
      const coverFormData = new FormData();
      coverFormData.append('file', coverImage);

      const coverRes = await fetch('/api/upload', {
        method: 'POST',
        body: coverFormData,
      });

      if (!coverRes.ok) throw new Error('خطا در آپلود عکس کاور');
      const coverData = await coverRes.json();
      const uploadedCoverUrl = coverData.urls[0];

      // --- ۲. آپلود نمونه کارها (در صورت وجود) ---
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
          if (services.includes(tagName)) return { name: tagName, category: category };
        }
        for (const [category, services] of Object.entries(customServices)) {
          if (services.includes(tagName)) return { name: tagName, category: category };
        }
        return { name: tagName, category: 'سایر' };
      });

      // --- ۳. ارسال اطلاعات نهایی به دیتابیس (تغییر یافته برای درگاه پرداخت) ---
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
        planId: selectedPlanId, // ارسال شناسه پلن انتخابی
      };

      // تغییر آدرس از /api/salon به API جدید برای ایجاد پرداخت
      const response = await fetch('/api/business/create-pending', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'خطا در ارتباط با سرور');
      }

      // ۴. بررسی وجود لینک پرداخت و انتقال 
      if (data.success) {
        // اگر API پاسخ موفقیت‌آمیز داد (با تغییراتی که در سرور اعمال کردیم)
        alert('کسب‌وکار شما با موفقیت ثبت و فعال شد!');
        router.push('/'); // هدایت به داشبورد
      } else if (data.paymentUrl) {
        // این بخش برای سازگاری با حالت آنلاین (در آینده) باقی می‌ماند
        window.location.href = data.paymentUrl;
      } else {
        // حالت fallback
        alert('کسب‌وکار شما با موفقیت ثبت شد!');
        router.push('/');
      }

     // if (data.paymentUrl) {
        // اگر سرور لینک پرداخت برگرداند، کاربر را به درگاه منتقل کن
      //  window.location.href = data.paymentUrl;
     // } else {
        // اگر پرداخت نیاز نبود یا درگاه تستی بود
      //  alert('کسب‌وکار شما با موفقیت ثبت شد!');
      //  router.push('/');
    //  }

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
          <p className="text-zinc-500 text-xs md:text-sm mt-0.5 md:mt-1">مرحله {step.toLocaleString('fa-IR')} از ۵</p> 
        </div>
      </div>

      {/* نشانگر مراحل (Stepper) */}
      <div className="mb-6 md:mb-8 flex items-center justify-between relative px-2 md:px-4">
        {/* خط رابط بین مراحل */}
        <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-zinc-200 -z-10 transform -translate-y-1/2 rounded-full mx-4 md:mx-6"></div>
        
        {[
          { id: 1, title: 'اطلاعات پایه' },
          { id: 2, title: 'خدمات' },
          { id: 3, title: 'ارتباطات' },
          { id: 4, title: 'تصاویر' },
          { id: 5, title: 'اشتراک' } 
        ].map((item) => (
          // نکته: کلاس bg-[#f8fafc] را در صورتی که بک‌گراند کل صفحه شما رنگ دیگری است، با رنگ پس‌زمینه خودتان جایگزین کنید تا خط پشتی مخفی بماند.
          <div key={item.id} className="flex flex-col items-center gap-2 bg-[#f8fafc] md:bg-transparent px-1 md:px-2 z-10" style={{ backgroundColor: 'var(--background, #fdfcfc)' }}> 
            <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center font-bold text-xs md:text-sm transition-colors ${
              step >= item.id 
                ? 'bg-rose-600 text-white shadow-sm' 
                : 'bg-zinc-100 text-zinc-500 border border-zinc-200'
            }`}>
              {step > item.id ? <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5" /> : item.id.toLocaleString('fa-IR')}
            </div>
          </div>
        ))}
      </div>

      {/* کانتینر سفیدرنگ فرم‌ها */}
      <div className="bg-white rounded-xl md:rounded-2xl border border-zinc-100 shadow-sm p-4 md:p-8">
                {/* ================= مرحله ۱: اطلاعات پایه ================= */}
        {step === 1 && (
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
                    onChange={(e) => setName(e.target.value)}
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
                      onChange={(e) => setWorkingHours(e.target.value)}
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
                      onChange={(e) => setDescription(e.target.value)}
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
                        onClick={() => toggleClosedDay(day)}
                        className={`px-3 py-1.5 md:px-4 md:py-2 rounded-lg md:rounded-xl text-xs md:text-sm font-medium transition-colors ${
                          closedDays.includes(day)
                            ? 'bg-rose-50 text-rose-600 border border-rose-200'
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
                            onChange={(e) => handlePhoneChange(index, e.target.value)} 
                            placeholder={`شماره تماس ${index + 1}`} 
                            className="w-full pr-9 pl-3 py-2.5 md:pr-10 md:pl-4 md:py-3 text-sm md:text-base rounded-lg md:rounded-xl border border-zinc-200 focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300 outline-none transition-all text-left dir-ltr" 
                          />
                        </div>
                        {phones.length > 1 && (
                          <button type="button" onClick={() => handleRemovePhone(index)} className="p-2.5 md:p-3 text-red-500 bg-red-50 hover:bg-red-100 rounded-lg md:rounded-xl transition-colors">
                            <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <button type="button" onClick={handleAddPhone} className="text-xs md:text-sm font-medium text-rose-600 flex items-center gap-1 md:gap-1.5 mt-1 md:mt-2 hover:text-rose-700 transition-colors">
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
                  onClick={() => setIsRegionModalOpen(true)}
                  className="w-full px-3 py-2.5 md:px-4 md:py-3 text-sm md:text-base rounded-lg md:rounded-xl border border-zinc-200 text-right flex justify-between items-center hover:border-zinc-300 focus:ring-1 focus:ring-zinc-300 outline-none transition-all bg-white"
                >
                  <span className={selectedProvince ? 'text-zinc-800 font-medium' : 'text-zinc-400'}>
                    {selectedProvince && selectedCity ? `${selectedProvince} - ${selectedCity}` : 'انتخاب استان و شهر...'}
                  </span>
                  <ChevronDown className="text-zinc-400 w-4 h-4 md:w-5 md:h-5" />
                </button>

                {/* نمایش محله‌های انتخاب شده در صورت وجود */}
                {selectedProvince === 'تهران' && selectedCity === 'تهران' && selectedNeighborhoods.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 md:gap-2 mt-1.5 md:mt-2 p-2.5 md:p-3 bg-zinc-50 rounded-lg md:rounded-xl border border-zinc-100">
                    <div className="w-full text-[10px] md:text-xs text-zinc-500 mb-0.5 md:mb-1">محله‌های انتخابی ({selectedNeighborhoods.length.toLocaleString('fa', { useGrouping: false })} از ۴)</div>
                    {selectedNeighborhoods.map((nh) => (
                      <span 
                        key={nh} 
                        className="flex items-center gap-1 md:gap-1.5 bg-rose-50 text-rose-700 px-2.5 py-1 md:px-3 md:py-1.5 rounded-full text-[10px] md:text-xs font-bold border border-rose-100"
                      >
                        {nh}
                        <button 
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeNeighborhood(nh);
                          }} 
                          className="hover:bg-rose-200 text-rose-500 rounded-full p-0.5 transition-colors"
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
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="خیابان اصلی، کوچه، پلاک، طبقه..." 
                  className="w-full px-3 py-2.5 md:px-4 md:py-3 text-sm md:text-base rounded-lg md:rounded-xl border border-zinc-200 focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300 outline-none transition-all resize-none"
                ></textarea>
              </div>
              
              {/* بخش انتخاب و نمایش نقشه */}
              {locationSelected ? (
                <div className="w-full space-y-2 md:space-y-3 animate-fade-in mt-4 md:mt-6">
                  {/* کادر مستطیلی نقشه */}
                  <div className="w-full h-36 md:h-56 rounded-xl md:rounded-2xl border border-zinc-200 overflow-hidden relative shadow-sm pointer-events-none bg-zinc-100">
                    <img 
                      src={`https://static-maps.yandex.ru/1.x/?ll=${coordinates[1]},${coordinates[0]}&z=15&l=map&size=600,250&pt=${coordinates[1]},${coordinates[0]},pm2rdm&lang=fa_IR`} 
                      alt="پیش‌نمایش نقشه" 
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* وضعیت و ویرایش - زیر نقشه */}
                  <div className="flex flex-row items-center justify-between px-1 pt-1">
                    <div className="flex items-center gap-1.5 md:gap-2 text-green-600">
                      <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5" />
                      <span className="text-xs md:text-sm font-medium text-zinc-800">موقعیت سالن ثبت شد</span>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => {
                        setTempCoordinates(coordinates);
                        setIsMapModalOpen(true);
                      }} 
                      className="text-rose-600 text-[10px] md:text-sm font-medium hover:bg-rose-50 px-2 py-1 md:px-3 md:py-1.5 rounded-lg transition-colors flex items-center gap-1"
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
                    onClick={() => {
                      setTempCoordinates(coordinates);
                      setIsMapModalOpen(true);
                    }} 
                    className="mt-1 md:mt-2 bg-white border border-zinc-200 shadow-sm px-4 py-2 md:px-5 md:py-2.5 rounded-lg md:rounded-xl text-zinc-700 text-xs md:text-sm font-medium hover:bg-zinc-100 flex items-center gap-1.5 md:gap-2"
                  >
                    <MapPin className="w-4 h-4 md:w-[18px] md:h-[18px] text-zinc-600" /> انتخاب از روی نقشه
                  </button>
                </div>
              )}
            </section>
          </div>
        )}
        
                {/* ================= مرحله ۲: خدمات ================= */}
        {step === 2 && (
          <div className="space-y-4 md:space-y-6 animate-fade-in">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-2 md:pb-3">
              <div className="flex items-center gap-1.5 md:gap-2">
                <CheckCircle2 className="text-zinc-700 w-5 h-5 md:w-6 md:h-6" />
                <h2 className="text-base md:text-lg font-semibold text-zinc-800">خدمات قابل ارائه</h2>
              </div>
              <span className="text-[10px] md:text-xs text-rose-600 bg-rose-50 px-2 py-0.5 md:px-3 md:py-1 rounded-full font-medium">
                {selectedTags.length.toLocaleString('fa-IR')} خدمت انتخاب شده
              </span>
            </div>
            <p className="text-xs md:text-sm text-zinc-500 -mt-1 md:-mt-2">
              جزئیات خدماتی که در سالن شما ارائه می‌شود را با دقت انتخاب کنید تا مشتریان راحت‌تر شما را پیدا کنند.
            </p>
            
            <div className="space-y-3 md:space-y-4">
              {Object.keys(SERVICE_DETAILS).map((category) => {
                const isExpanded = expandedCategories.includes(category);
                const defaultServices = SERVICE_DETAILS[category as keyof typeof SERVICE_DETAILS] || [];
                const categoryCustomServices = customServices[category] || [];
                // ترکیب خدمات پیش‌فرض با خدماتی که کاربر دستی تایپ کرده است
                const categoryServices = [...defaultServices, ...categoryCustomServices];
                const selectedCount = categoryServices.filter(s => selectedTags.includes(s)).length;
                
                return (
                  <div key={category} className="border border-zinc-100 rounded-lg md:rounded-xl overflow-hidden bg-zinc-50/50">
                    <button 
                      type="button" 
                      onClick={() => toggleCategory(category)} 
                      className="w-full flex items-center justify-between p-3 md:p-4 bg-white hover:bg-zinc-50 transition-colors"
                    >
                      <div className="flex items-center gap-2 md:gap-3">
                        <span className="text-sm md:text-base font-medium text-zinc-800">{category}</span>
                        {selectedCount > 0 && (
                          <span className="text-[10px] md:text-xs bg-rose-50 text-rose-600 px-1.5 py-0.5 md:px-2 md:py-0.5 rounded-full font-medium">
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
                        {/* لیست تگ‌ها */}
                        <div className="flex flex-wrap gap-1.5 md:gap-2">
                          {categoryServices.map(service => {
                            const isDefault = defaultServices.includes(service);
                            const isSelected = selectedTags.includes(service);

                            if (isDefault) {
                              // دکمه تگ عادی
                              return (
                                <button 
                                  key={service} 
                                  type="button" 
                                  onClick={() => toggleTag(service)} 
                                  className={`px-3 py-1.5 md:px-4 md:py-2 rounded-lg md:rounded-xl text-xs md:text-sm font-medium transition-all ${
                                    isSelected
                                      ? 'bg-rose-50 border border-rose-200 text-rose-600'
                                      : 'bg-white border border-zinc-200 text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50'
                                  }`}
                                >
                                  {service}
                                </button>
                              );
                            } else {
                              // دکمه تگ کاستوم (تمایز رنگ و دکمه ضربدر)
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
                                    onClick={() => toggleTag(service)} 
                                    className="flex-1 text-right py-0.5"
                                  >
                                    {service}
                                  </button>
                                  <button 
                                    type="button" 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRemoveCustomTag(category, service);
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
                            }
                          })}
                        </div>

                        {/* بخش افزودن خدمت جدید */}
                        <div className="flex items-center gap-1.5 md:gap-2 mt-1 pt-2 md:pt-3 border-t border-zinc-100/60">
                          <input 
                            type="text" 
                            value={newTagInputs[category] || ''}
                            onChange={(e) => setNewTagInputs({...newTagInputs, [category]: e.target.value})}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddCustomTag(category);
                              }
                            }}
                            placeholder={`افزودن خدمت جدید به ${category}...`} 
                            className="flex-1 text-xs md:text-sm px-3 py-2 md:px-4 md:py-2.5 rounded-lg md:rounded-xl border border-zinc-200 focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300 outline-none transition-all"
                          />
                          <button 
                            type="button" 
                            onClick={() => handleAddCustomTag(category)}
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
        )}

               {/* ================= مرحله ۳: شبکه‌های اجتماعی ================= */}
        {step === 3 && (
          <div className="space-y-4 md:space-y-6 animate-fade-in">
            <div className="flex items-center gap-1.5 md:gap-2 border-b border-zinc-100 pb-2 md:pb-3">
              <Globe className="text-zinc-700 w-5 h-5 md:w-6 md:h-6" />
              <h2 className="text-base md:text-lg font-semibold text-zinc-800">شبکه‌های اجتماعی (اختیاری)</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              
              <div className="space-y-1.5 md:space-y-2">
                <label className="block text-xs md:text-sm font-medium text-zinc-700">اینستاگرام</label>
                <div className="relative">
                  <svg className="absolute right-2.5 md:right-3 top-1/2 -translate-y-1/2 text-zinc-400 w-4 h-4 md:w-5 md:h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
                  <input 
                    type="text" 
                    value={socials.instagram}
                    onChange={(e) => setSocials({...socials, instagram: e.target.value})}
                    placeholder="ID اینستاگرام" 
                    className="w-full pr-8 md:pr-10 pl-3 md:pl-4 py-2.5 md:py-3 text-sm md:text-base rounded-lg md:rounded-xl border border-zinc-200 focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300 outline-none transition-all text-left dir-ltr" 
                  />
                </div>
              </div>

              <div className="space-y-1.5 md:space-y-2">
                <label className="block text-xs md:text-sm font-medium text-zinc-700">واتساپ</label>
                <div className="relative">
                  <MessageCircle className="absolute right-2.5 md:right-3 top-1/2 -translate-y-1/2 text-zinc-400 w-4 h-4 md:w-5 md:h-5" />
                  <input 
                    type="text" 
                    value={socials.whatsapp}
                    onChange={(e) => setSocials({...socials, whatsapp: e.target.value})}
                    placeholder="شماره واتساپ" 
                    className="w-full pr-8 md:pr-10 pl-3 md:pl-4 py-2.5 md:py-3 text-sm md:text-base rounded-lg md:rounded-xl border border-zinc-200 focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300 outline-none transition-all text-left dir-ltr" 
                  />
                </div>
              </div>

              <div className="space-y-1.5 md:space-y-2">
                <label className="block text-xs md:text-sm font-medium text-zinc-700">تلگرام</label>
                <div className="relative">
                  <Send className="absolute right-2.5 md:right-3 top-1/2 -translate-y-1/2 text-zinc-400 w-4 h-4 md:w-5 md:h-5" />
                  <input 
                    type="text" 
                    value={socials.telegram}
                    onChange={(e) => setSocials({...socials, telegram: e.target.value})}
                    placeholder="ID تلگرام" 
                    className="w-full pr-8 md:pr-10 pl-3 md:pl-4 py-2.5 md:py-3 text-sm md:text-base rounded-lg md:rounded-xl border border-zinc-200 focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300 outline-none transition-all text-left dir-ltr" 
                  />
                </div>
              </div>

              <div className="space-y-1.5 md:space-y-2">
                <label className="block text-xs md:text-sm font-medium text-zinc-700">روبیکا</label>
                <div className="relative">
                  <MessageCircle className="absolute right-2.5 md:right-3 top-1/2 -translate-y-1/2 text-zinc-400 w-4 h-4 md:w-5 md:h-5" />
                  <input 
                    type="text" 
                    value={socials.rubika}
                    onChange={(e) => setSocials({...socials, rubika: e.target.value})}
                    placeholder="ID یا شماره روبیکا" 
                    className="w-full pr-8 md:pr-10 pl-3 md:pl-4 py-2.5 md:py-3 text-sm md:text-base rounded-lg md:rounded-xl border border-zinc-200 focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300 outline-none transition-all text-left dir-ltr" 
                  />
                </div>
              </div>

              <div className="space-y-1.5 md:space-y-2">
                <label className="block text-xs md:text-sm font-medium text-zinc-700">بله</label>
                <div className="relative">
                  <MessageCircle className="absolute right-2.5 md:right-3 top-1/2 -translate-y-1/2 text-zinc-400 w-4 h-4 md:w-5 md:h-5" />
                  <input 
                    type="text" 
                    value={socials.bale}
                    onChange={(e) => setSocials({...socials, bale: e.target.value})}
                    placeholder="ID یا شماره بله" 
                    className="w-full pr-8 md:pr-10 pl-3 md:pl-4 py-2.5 md:py-3 text-sm md:text-base rounded-lg md:rounded-xl border border-zinc-200 focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300 outline-none transition-all text-left dir-ltr" 
                  />
                </div>
              </div>

              <div className="space-y-1.5 md:space-y-2">
                <label className="block text-xs md:text-sm font-medium text-zinc-700">وب‌سایت</label>
                <div className="relative">
                  <Globe className="absolute right-2.5 md:right-3 top-1/2 -translate-y-1/2 text-zinc-400 w-4 h-4 md:w-5 md:h-5" />
                  <input 
                    type="url" 
                    value={socials.website}
                    onChange={(e) => setSocials({...socials, website: e.target.value})}
                    placeholder="https://..." 
                    className="w-full pr-8 md:pr-10 pl-3 md:pl-4 py-2.5 md:py-3 text-sm md:text-base rounded-lg md:rounded-xl border border-zinc-200 focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300 outline-none transition-all text-left dir-ltr" 
                  />
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ================= مرحله ۴: تصاویر و نمونه کارها ================= */}
        {step === 4 && (
          <div className="space-y-10 animate-fade-in">
            <div className="flex items-center gap-2 border-b border-zinc-100 pb-3">
              <ImagePlus className="text-zinc-700" size={24} />
              <h2 className="text-lg font-semibold text-zinc-800">تصاویر سالن</h2>
            </div>

            {/* بخش اول: کاور اصلی */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-zinc-800">عکس کاور اصلی <span className="text-red-500">*</span></h3>
                <span className="text-xs text-zinc-500">برای نمایش در صفحه اصلی سالن</span>
              </div>
              
              {!coverImage ? (
                <label className="cursor-pointer bg-zinc-50 border-2 border-dashed border-zinc-300 rounded-2xl p-8 flex flex-col items-center justify-center text-center gap-3 hover:bg-zinc-100 transition-colors">
                  <div className="w-14 h-14 bg-white text-rose-600 rounded-full flex items-center justify-center shadow-sm mb-2 border border-zinc-200">
                    <ImageIcon size={30} />
                  </div>
                  <h3 className="font-medium text-zinc-800">برای آپلود کاور اصلی کلیک کنید</h3>
                  <p className="text-sm text-zinc-500">فرمت‌های مجاز: JPG, PNG, WEBP</p>
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handleCoverUpload} 
                  />
                </label>
              ) : (
                <div className="relative group rounded-xl overflow-hidden aspect-video border border-zinc-200 shadow-sm max-w-lg">
                  <img 
                    src={URL.createObjectURL(coverImage)} 
                    alt="کاور اصلی" 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button 
                      type="button"
                      onClick={removeCoverImage}
                      className="bg-white/90 p-3 rounded-full text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                    >
                      <Trash2 size={20} /> <span className="font-medium">حذف کاور</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* بخش دوم: نمونه کارها */}
            <div className="space-y-4 pt-4 border-t border-zinc-100">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-zinc-800">نمونه کارها (اختیاری)</h3>
                <span className="text-xs bg-zinc-100 text-zinc-600 px-3 py-1 rounded-full font-medium">
                  {portfolios.length.toLocaleString('fa-IR')} از {maxPortfolios.toLocaleString('fa-IR')}
                </span>
              </div>
              <p className="text-sm text-zinc-500 -mt-2">
                تصاویر باکیفیت از کارهای خود قرار دهید تا مشتریان بیشتری جذب کنید.
              </p>
              
              {portfolios.length < maxPortfolios && (
                <label className="cursor-pointer bg-zinc-50 border-2 border-dashed border-zinc-300 rounded-2xl p-8 flex flex-col items-center justify-center text-center gap-3 hover:bg-zinc-100 transition-colors">
                  <div className="w-14 h-14 bg-white text-rose-600 rounded-full flex items-center justify-center shadow-sm mb-2 border border-zinc-200">
                    <UploadCloud size={30} />
                  </div>
                  <h3 className="font-medium text-zinc-800">برای آپلود نمونه کارها کلیک کنید</h3>
                  <p className="text-sm text-zinc-500">انتخاب همزمان چند عکس امکان‌پذیر است</p>
                  <input 
                    type="file" 
                    multiple 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handlePortfoliosUpload} 
                  />
                </label>
              )}
<p className="text-xs text-blue-600 mb-4 bg-blue-50 p-2 rounded-md">
  در مرحله ثبت اولیه امکان آپلود حداکثر ۱۰ نمونه‌کار وجود دارد. در صورت خرید اشتراک پیشرفته، پس از تکمیل ثبت‌نام می‌توانید تا ۳۰ نمونه‌کار به پروفایل خود اضافه کنید.
</p>
              {portfolios.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mt-6">
                  {portfolios.map((file, index) => (
                    <div key={index} className="relative group rounded-xl overflow-hidden aspect-square border border-zinc-200 shadow-sm">
                      <img 
                        src={URL.createObjectURL(file)} 
                        alt={`نمونه کار ${index + 1}`} 
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button 
                          type="button"
                          onClick={() => removePortfolio(index)}
                          className="bg-white/90 p-2 rounded-full text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= مرحله ۵: انتخاب اشتراک (اضافه شد) ================= */}
        {step === 5 && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-center gap-2 border-b border-zinc-100 pb-3">
              <CreditCard className="text-zinc-700" size={24} />
              <h2 className="text-lg font-semibold text-zinc-800">انتخاب پلن اشتراک</h2>
            </div>
            <p className="text-sm text-zinc-500 -mt-2">
              برای نمایش کسب‌وکار شما در پلتفرم، لطفاً یک پلن اشتراک انتخاب کنید.
            </p>
            
            <SubscriptionPicker 
              selectedPlanId={selectedPlanId} 
              onSelectPlan={setSelectedPlanId} 
            />
          </div>
        )}

        {/* دکمه‌ های ناوبری (پایین فرم) */}
        <div className="mt-10 pt-6 border-t border-zinc-100 flex items-center justify-between">
          
          {step > 1 ? (
            <button type="button" onClick={prevStep} className="flex items-center gap-2 px-6 py-3 rounded-xl font-medium text-zinc-600 hover:bg-zinc-100 transition border border-transparent">
              <ArrowRight size={20} /> مرحله قبل
            </button>
          ) : <div></div>}

          {step < 5 ? ( // تغییر از 4 به 5
            <button type="button" onClick={nextStep} className="flex items-center gap-2 bg-rose-600 text-white px-8 py-3 rounded-xl font-medium hover:bg-rose-700 transition shadow-lg shadow-rose-200">
              مرحله بعد <ArrowLeft size={20} />
            </button>
          ) : (
            <button 
              type="button" 
              onClick={handleSubmit} 
              disabled={isSubmitting}
              className="flex items-center gap-2 bg-rose-600 text-white px-8 py-3 rounded-xl font-medium hover:bg-rose-700 transition shadow-lg shadow-rose-200 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              <button 
  type="button" 
  onClick={handleSubmit} 
  disabled={isSubmitting}
  className="flex items-center gap-2 bg-rose-600 text-white px-8 py-3 rounded-xl font-medium hover:bg-rose-700 transition shadow-lg shadow-rose-200 disabled:opacity-70 disabled:cursor-not-allowed"
>
  {isSubmitting ? 'در حال ثبت...' : 'ثبت و پرداخت'}
</button>
            </button>
          )}
        </div>
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

      {isMapModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col h-[75vh] md:h-[85vh]">
            
            <div className="p-4 border-b border-zinc-100 flex justify-between items-center bg-white z-10">
              <h3 className="font-semibold text-zinc-800">انتخاب موقعیت روی نقشه</h3>
              <button onClick={() => setIsMapModalOpen(false)} className="text-zinc-400 hover:text-zinc-700 transition-colors bg-zinc-100 hover:bg-zinc-200 p-2 rounded-full">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 relative bg-zinc-100 w-full h-full z-0">
              {/* ارسال مختصات موقت به نقشه */}
              <MapPicker position={tempCoordinates} setPosition={setTempCoordinates} />
            </div>
            <div className="p-4 bg-white border-t border-zinc-100 flex justify-between items-center gap-3 z-10 relative">
              <span className="text-sm text-zinc-500 hidden md:inline-block">
                لطفا روی نقشه کلیک کنید تا نشانگر در محل دقیق کسب‌وکار شما قرار بگیرد.
              </span>
              <div className="flex gap-3 w-full md:w-auto">
                <button onClick={() => setIsMapModalOpen(false)} className="flex-1 md:flex-none px-6 py-2.5 rounded-xl text-zinc-600 font-medium hover:bg-zinc-100 transition-colors">
                  انصراف
                </button>
                <button 
                  onClick={() => {
                    // با زدن دکمه تایید، مختصات موقت در مختصات اصلی ذخیره می‌شود
                    setCoordinates(tempCoordinates);
                    setLocationSelected(true);
                    setIsMapModalOpen(false);
                    console.log('مختصات انتخاب شده:', tempCoordinates); 
                  }} 
                  className="flex-1 md:flex-none px-6 py-2.5 rounded-xl bg-rose-600 text-white font-medium hover:bg-rose-700 transition-colors shadow-md shadow-rose-200 flex items-center justify-center gap-2"
                >
                <CheckCircle2 size={20} /> تایید موقعیت
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}