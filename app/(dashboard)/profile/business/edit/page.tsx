//app/(dashboard)/profile/business/edit/page.tsx
'use client';

import { useState, useEffect } from 'react';
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
  Loader2,
  ImageIcon
} from 'lucide-react';
import RegionFilterModal from '@/components/RegionFilterModal';

// بارگذاری داینامیک کامپوننت نقشه برای جلوگیری از خطای SSR
const MapPicker = dynamic(() => import('@/components/MapPicker'), { ssr: false });

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
const MAX_PORTFOLIOS = 20;

export default function BusinessEditPage() {
  const router = useRouter();
  
  // استیت‌های مربوط به مراحل و رابط کاربری
  const [step, setStep] = useState(1);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [locationSelected, setLocationSelected] = useState<boolean>(false);
  const [expandedCategories, setExpandedCategories] = useState<string[]>(Object.keys(SERVICE_DETAILS));
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [isRegionModalOpen, setIsRegionModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // === استیت‌های فرم اصلی ===
  const [name, setName] = useState('');
  const [workingHours, setWorkingHours] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [phones, setPhones] = useState<string[]>(['']);
  const [closedDays, setClosedDays] = useState<string[]>([]);
  
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [newTagInputs, setNewTagInputs] = useState<Record<string, string>>({});
  const [customServices, setCustomServices] = useState<Record<string, string[]>>({});
  
  const [selectedProvince, setSelectedProvince] = useState<string>('');
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [selectedNeighborhoods, setSelectedNeighborhoods] = useState<string[]>([]);
  const [coordinates, setCoordinates] = useState<[number, number] | null>(null);
  const [tempCoordinates, setTempCoordinates] = useState<[number, number] | null>(null);
  
  // === استیت‌های تصاویر ===
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [existingCover, setExistingCover] = useState<string | null>(null);
  
  const [portfolios, setPortfolios] = useState<File[]>([]);
  const [existingPortfolios, setExistingPortfolios] = useState<string[]>([]);
  
  const [socials, setSocials] = useState({
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
    return 'سایر خدمات'; // اگر هیچ کلمه‌ای تطابق نداشت
  };

  // دریافت اطلاعات اولیه سالن
  useEffect(() => {
    const fetchSalonData = async () => {
      try {
        const storedUser = localStorage.getItem('user');
        if (!storedUser) {
          router.push('/login');
          return;
        }
        
        const user = JSON.parse(storedUser);
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
            
            // شناسایی تگ‌های کاستوم و قراردادن در دسته‌بندی صحیح
             if (salon.tags && salon.tags.length > 0) {
              // پشتیبانی از هر دو حالت (آرایه رشته‌های قدیمی و آرایه آبجکت‌های جدید)
              const extractedNames = salon.tags.map((t: any) => typeof t === 'string' ? t : t.name);
              setSelectedTags(extractedNames);
              
              const allDefaultTags = Object.values(SERVICE_DETAILS).flat();
              const loadedCustomsMap: Record<string, string[]> = {};
              const categoriesToExpand = new Set<string>();

              salon.tags.forEach((tagItem: any) => {
                const tagName = typeof tagItem === 'string' ? tagItem : tagItem.name;
                // اگر از قبل آبجکت باشد دسته‌بندی‌اش مشخص است، در غیر این صورت حدس می‌زنیم
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

  // هندلرهای شماره تماس
  const handleAddPhone = () => setPhones([...phones, '']);
  const handleRemovePhone = (index: number) => {
    if (phones.length > 1) setPhones(phones.filter((_, i) => i !== index));
  };
  const handlePhoneChange = (index: number, value: string) => {
    const newPhones = [...phones];
    newPhones[index] = value;
    setPhones(newPhones);
  };

  // افزودن خدمت اختصاصی
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

  // حذف کامل خدمت اختصاصی (هم از تگ‌های انتخاب شده و هم از لیست کاستوم‌ها)
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

  // هندلرهای تصاویر
  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setCoverImage(e.target.files[0]);
      setExistingCover(null); 
    }
  };

  const removeCoverImage = () => {
    setCoverImage(null);
    setExistingCover(null); 
  };

  const handlePortfoliosUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      const currentTotal = existingPortfolios.length + portfolios.length;
      const availableSlots = MAX_PORTFOLIOS - currentTotal;
      const newFiles = filesArray.slice(0, availableSlots);
      if (newFiles.length > 0) setPortfolios(prev => [...prev, ...newFiles]);
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

  const handleSubmit = async () => {
    if (!name || !selectedProvince || !selectedCity || !address || !workingHours) {
      alert('لطفاً تمام فیلدهای ستاره‌دار در مرحله اول را پر کنید.');
      return;
    }
    if (!coverImage && !existingCover) {
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
        // جستجو در خدمات پیش‌فرض
        for (const [cat, services] of Object.entries(SERVICE_DETAILS)) {
          if (services.includes(tagName)) {
            return { name: tagName, category: cat };
          }
        }
        // جستجو در خدمات کاستوم اضافه‌شده
        for (const [cat, customTags] of Object.entries(customServices)) {
          if (customTags.includes(tagName)) {
            return { name: tagName, category: cat };
          }
        }
        // در صورتی که پیدا نشد
        return { name: tagName, category: 'سایر خدمات' };
      });
      
      const payload = {
        userPhone: user.phone,
        name, workingHours, description, address, phones, closedDays,
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
        <Loader2 className="w-12 h-12 text-rose-600 animate-spin mb-4" />
        <p className="text-zinc-600 font-medium">در حال دریافت اطلاعات کسب‌وکار...</p>
      </div>
    );
  }

  const totalPortfoliosCount = existingPortfolios.length + portfolios.length;

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
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${
              step >= item.id ? 'bg-rose-600 text-white shadow-md shadow-rose-200' : 'bg-zinc-100 text-zinc-500 border border-zinc-200'
            }`}>
              {step > item.id ? <CheckCircle2 size={20} /> : item.id.toLocaleString('fa-IR')}
            </div>
            <span className={`text-xs md:text-sm font-medium ${step >= item.id ? 'text-rose-600' : 'text-zinc-400'}`}>
              {item.title}
            </span>
          </div>
        ))}
      </div>
      

      <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-5 md:p-8">
        

        {/* ================= مرحله ۱: اطلاعات پایه ================= */}
        {step === 1 && (
           <div className="space-y-8 animate-fade-in">
             <section className="space-y-6">
               <div className="flex items-center gap-2 border-b border-zinc-100 pb-3">
                 <Store className="text-zinc-700" size={24} />
                 <h2 className="text-lg font-semibold text-zinc-800">اطلاعات پایه سالن</h2>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 
                 <div className="space-y-2">
                   <label className="block text-sm font-medium text-zinc-700">نام سالن زیبایی <span className="text-red-500">*</span></label>
                   <input 
                     type="text" 
                     value={name}
                     onChange={(e) => setName(e.target.value)}
                     placeholder="مثال: سالن زیبایی گل‌ها" 
                     className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300 outline-none transition-all" 
                   />
                 </div>
                 
                 <div className="space-y-2">
                   <label className="block text-sm font-medium text-zinc-700">ساعات کاری <span className="text-red-500">*</span></label>
                   <div className="relative">
                     <Clock className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
                     <input 
                       type="text" 
                       value={workingHours}
                       onChange={(e) => setWorkingHours(e.target.value)}
                       placeholder="مثال: ۱۰ صبح تا ۸ شب" 
                       className="w-full pr-10 pl-4 py-3 rounded-xl border border-zinc-200 focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300 outline-none transition-all" 
                     />
                   </div>
                 </div>

                 <div className="space-y-2 md:col-span-2">
                   <label className="block text-sm font-medium text-zinc-700">توضیحات و معرفی سالن <span className="text-red-500">*</span></label>
                   <div className="relative">
                     <FileText className="absolute right-3 top-4 text-zinc-400" size={20} />
                     <textarea 
                       rows={3} 
                       value={description}
                       onChange={(e) => setDescription(e.target.value)}
                       placeholder="توضیح مختصری درباره سابقه، خدمات ویژه و محیط سالن خود بنویسید..." 
                       className="w-full pr-10 pl-4 py-3 rounded-xl border border-zinc-200 focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300 outline-none transition-all resize-none"
                     ></textarea>
                   </div>
                 </div>

                 <div className="space-y-3 md:col-span-2">
                   <label className="block text-sm font-medium text-zinc-700">روزهای تعطیل در هفته</label>
                   <div className="flex flex-wrap gap-2">
                     {WEEK_DAYS.map(day => (
                       <button
                         key={day}
                         type="button"
                         onClick={() => toggleClosedDay(day)}
                         className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
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

                 <div className="space-y-3 md:col-span-2 mt-2">
                   <label className="block text-sm font-medium text-zinc-700">شماره تماس‌های سالن <span className="text-red-500">*</span></label>
                   <div className="space-y-3">
                     {phones.map((phone, index) => (
                       <div key={index} className="flex gap-2">
                         <div className="relative flex-1">
                           <Phone className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
                           <input 
                             type="tel" 
                             value={phone} 
                             onChange={(e) => handlePhoneChange(index, e.target.value)} 
                             placeholder={`شماره تماس ${index + 1}`} 
                             className="w-full pr-10 pl-4 py-3 rounded-xl border border-zinc-200 focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300 outline-none transition-all text-left dir-ltr" 
                           />
                         </div>
                         {phones.length > 1 && (
                           <button type="button" onClick={() => handleRemovePhone(index)} className="p-3 text-red-500 bg-red-50 hover:bg-red-100 rounded-xl transition-colors">
                             <Trash2 size={20} />
                           </button>
                         )}
                       </div>
                     ))}
                   </div>
                   <button type="button" onClick={handleAddPhone} className="text-sm font-medium text-rose-600 flex items-center gap-1.5 mt-2 hover:text-rose-700 transition-colors">
                     <Plus size={16} /> افزودن شماره جدید
                   </button>
                 </div>
               </div>
             </section>

             <section className="space-y-6">
               <div className="flex items-center gap-2 border-b border-zinc-100 pb-3">
                 <MapPin className="text-zinc-700" size={24} />
                 <h2 className="text-lg font-semibold text-zinc-800">آدرس و موقعیت مکانی</h2>
               </div>
               
               <div className="space-y-3">
                 <label className="block text-sm font-medium text-zinc-700">استان و شهر <span className="text-red-500">*</span></label>
                 <button
                   type="button"
                   onClick={() => setIsRegionModalOpen(true)}
                   className="w-full px-4 py-3 rounded-xl border border-zinc-200 text-right flex justify-between items-center hover:border-zinc-300 focus:ring-1 focus:ring-zinc-300 outline-none transition-all bg-white"
                 >
                   <span className={selectedProvince ? 'text-zinc-800 font-medium' : 'text-zinc-400'}>
                     {selectedProvince && selectedCity ? `${selectedProvince} - ${selectedCity}` : 'انتخاب استان و شهر...'}
                   </span>
                   <ChevronDown size={20} className="text-zinc-400" />
                 </button>

                 {selectedProvince === 'تهران' && selectedCity === 'تهران' && selectedNeighborhoods.length > 0 && (
                   <div className="flex flex-wrap gap-2 mt-2 p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                    <div className="w-full text-xs text-zinc-500 mb-1">محله‌های انتخابی ({selectedNeighborhoods.length.toLocaleString('fa', { useGrouping: false })} از ۴)</div>
                     {selectedNeighborhoods.map((nh) => (
                       <span 
                         key={nh} 
                         className="flex items-center gap-1.5 bg-rose-50 text-rose-700 px-3 py-1.5 rounded-full text-xs font-bold border border-rose-100"
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
                           <X size={14} strokeWidth={2.5} />
                         </button>
                       </span>
                     ))}
                   </div>
                 )}
               </div>

               <div className="space-y-2">
                 <label className="block text-sm font-medium text-zinc-700">آدرس دقیق <span className="text-red-500">*</span></label>
                 <textarea 
                   rows={3} 
                   value={address}
                   onChange={(e) => setAddress(e.target.value)}
                   placeholder="خیابان اصلی، کوچه، پلاک، طبقه..." 
                   className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300 outline-none transition-all resize-none"
                 ></textarea>
               </div>
               
               {coordinates && coordinates[0] !== 0 && coordinates[1] !== 0 ? (
                 <div className="w-full space-y-3 animate-fade-in mt-6">
                   <div className="w-full h-48 md:h-56 rounded-2xl border border-zinc-200 overflow-hidden relative shadow-sm pointer-events-none bg-zinc-100">
                     <img 
                       src={`https://static-maps.yandex.ru/1.x/?ll=${coordinates[1]},${coordinates[0]}&z=15&l=map&size=600,250&pt=${coordinates[1]},${coordinates[0]},pm2rdm&lang=fa_IR`} 
                       alt="پیش‌نمایش نقشه" 
                       className="w-full h-full object-cover"
                     />
                   </div>
                   <div className="flex items-center justify-between px-1 pt-1">
                     <div className="flex items-center gap-2 text-green-600">
                       <CheckCircle2 size={20} />
                       <span className="font-medium text-zinc-800">موقعیت سالن ثبت شد</span>
                     </div>
                     <button 
                       type="button" 
                       onClick={() => {
                         setTempCoordinates(coordinates);
                         setIsMapModalOpen(true);
                       }} 
                       className="text-rose-600 text-sm font-medium hover:bg-rose-50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                     >
                       <MapPin size={16} /> ویرایش موقعیت
                     </button>
                   </div>
                 </div>
               ) : (
                 <div className="bg-zinc-50 border border-dashed border-zinc-300 rounded-2xl p-6 flex flex-col items-center justify-center text-center gap-3 mt-4">
                   <div className="w-12 h-12 bg-white text-zinc-400 rounded-full flex items-center justify-center shadow-sm mb-1 border border-zinc-200">
                     <Map size={28} />
                   </div>
                   <div>
                     <p className="font-medium text-zinc-800">موقعیت سالن را روی نقشه مشخص کنید</p>
                   </div>
                   <button 
                     type="button" 
                     onClick={() => {
                       setTempCoordinates([35.6997, 51.3380]);
                       setIsMapModalOpen(true);
                     }} 
                     className="mt-2 bg-white border border-zinc-200 shadow-sm px-5 py-2.5 rounded-xl text-zinc-700 text-sm font-medium hover:bg-zinc-100 flex items-center gap-2"
                   >
                     <MapPin size={18} className="text-zinc-600" /> انتخاب از روی نقشه
                   </button>
                 </div>
               )}
             </section>
           </div>
        )}

        {/* ================= مرحله ۲: خدمات ================= */}
        {step === 2 && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="text-zinc-700" size={24} />
                <h2 className="text-lg font-semibold text-zinc-800">خدمات قابل ارائه</h2>
              </div>
              <span className="text-xs text-rose-600 bg-rose-50 px-3 py-1 rounded-full font-medium">{selectedTags.length.toLocaleString('fa-IR')} خدمت انتخاب شده</span>
            </div>
            <p className="text-sm text-zinc-500 -mt-2">جزئیات خدماتی که در سالن شما ارائه می‌شود را با دقت انتخاب کنید تا مشتریان راحت‌تر شما را پیدا کنند.</p>
            
            <div className="space-y-4">
              {allCategories.map((category) => {
                const isExpanded = expandedCategories.includes(category);
                const defaultServices = SERVICE_DETAILS[category as keyof typeof SERVICE_DETAILS] || [];
                const categoryCustomServices = customServices[category] || [];
                // ترکیب خدمات پیش‌فرض با خدماتی که کاربر دستی تایپ کرده است
                const categoryServices = [...defaultServices, ...categoryCustomServices];
                const selectedCount = categoryServices.filter(s => selectedTags.includes(s)).length;
                
                return (
                  <div key={category} className="border border-zinc-100 rounded-xl overflow-hidden bg-zinc-50/50">
                    <button type="button" onClick={() => toggleCategory(category)} className="w-full flex items-center justify-between p-4 bg-white hover:bg-zinc-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-zinc-800">{category}</span>
                        {selectedCount > 0 && <span className="text-xs bg-rose-50 text-rose-600 px-2 py-0.5 rounded-full font-medium">{selectedCount.toLocaleString('fa-IR')} مورد</span>}
                      </div>
                      {isExpanded ? <ChevronUp size={20} className="text-zinc-400" /> : <ChevronDown size={20} className="text-zinc-400" />}
                    </button>
                    {isExpanded && (
                      <div className="p-4 border-t border-zinc-100 flex flex-col gap-4">
                        {/* لیست تگ‌ها */}
                        <div className="flex flex-wrap gap-2">
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
                                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                                    isSelected
                                      ? 'bg-rose-50 border border-rose-200 text-rose-600'
                                      : 'bg-white border border-zinc-200 text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50'
                                  }`}>
                                  {service}
                                </button>
                              );
                            } else {
                              // دکمه تگ کاستوم (تمایز رنگ و دکمه ضربدر)
                              return (
                                <div 
                                  key={service} 
                                  className={`flex items-center gap-1 pl-2 pr-4 py-1.5 rounded-xl text-sm font-medium transition-all border ${
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
                                    <X size={16} strokeWidth={2.5} />
                                  </button>
                                </div>
                              );
                            }
                          })}
                        </div>

                        
                        {/* بخش افزودن خدمت جدید */}
                        <div className="flex items-center gap-2 mt-1 pt-3 border-t border-zinc-100/60">
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
                            className="flex-1 text-sm px-4 py-2.5 rounded-xl border border-zinc-200 focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300 outline-none transition-all"
                          />
                          <button 
                            type="button" 
                            onClick={() => handleAddCustomTag(category)}
                            className="px-3 py-2.5 bg-zinc-100 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-800 rounded-xl transition-colors flex items-center justify-center gap-1 font-medium text-sm"
                          >
                            <Plus size={18} /> افزودن
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
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-center gap-2 border-b border-zinc-100 pb-3">
              <Globe className="text-zinc-700" size={24} />
              <h2 className="text-lg font-semibold text-zinc-800">شبکه‌های اجتماعی (اختیاری)</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {['instagram', 'whatsapp', 'telegram', 'rubika', 'bale', 'website'].map((social) => {
                const faNames: Record<string, string> = {
                  instagram: 'اینستاگرام', whatsapp: 'واتساپ', telegram: 'تلگرام', 
                  rubika: 'روبیکا', bale: 'بله', website: 'وب‌سایت'
                };
                return (
                  <div key={social} className="space-y-2">
                    <label className="block text-sm font-medium text-zinc-700">{faNames[social]}</label>
                    <div className="relative">
                      {social === 'website' ? <Globe className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400" size={20} /> 
                      : social === 'telegram' ? <Send className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
                      : <MessageCircle className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />}
                      <input 
                        type={social === 'website' ? 'url' : 'text'} 
                        value={socials[social as keyof typeof socials]}
                        onChange={(e) => setSocials({...socials, [social]: e.target.value})}
                        placeholder={social === 'website' ? "https://..." : "ID یا شماره"} 
                        className="w-full pr-10 pl-4 py-3 rounded-xl border border-zinc-200 focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300 outline-none transition-all text-left dir-ltr" 
                      />
                    </div>
                  </div>
                );
              })}
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
              
              {!coverImage && !existingCover ? (
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
                    src={coverImage ? URL.createObjectURL(coverImage) : existingCover!} 
                    alt="کاور اصلی" 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button 
                      type="button"
                      onClick={removeCoverImage}
                      className="bg-white/90 p-3 rounded-full text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                    >
                      <Trash2 size={20} /> <span className="font-medium">تغییر کاور</span>
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
                  {totalPortfoliosCount.toLocaleString('fa-IR')} از {MAX_PORTFOLIOS.toLocaleString('fa-IR')} تصویر
                </span>
              </div>
              
              {totalPortfoliosCount < MAX_PORTFOLIOS && (
                <label className="cursor-pointer bg-zinc-50 border-2 border-dashed border-zinc-300 rounded-2xl p-8 flex flex-col items-center justify-center text-center gap-3 hover:bg-zinc-100 transition-colors">
                  <div className="w-14 h-14 bg-white text-rose-600 rounded-full flex items-center justify-center shadow-sm mb-2 border border-zinc-200">
                    <UploadCloud size={30} />
                  </div>
                  <h3 className="font-medium text-zinc-800">برای آپلود نمونه کار جدید کلیک کنید</h3>
                  <input 
                    type="file" 
                    multiple 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handlePortfoliosUpload} 
                  />
                </label>
              )}


              {totalPortfoliosCount > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mt-6">
                  {existingPortfolios.map((url, index) => (
                    <div key={`existing-${index}`} className="relative group rounded-xl overflow-hidden aspect-square border border-zinc-200 shadow-sm">
                      <img src={url} alt="نمونه کار قبلی" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button type="button" onClick={() => removeExistingPortfolio(index)} className="bg-white/90 p-2 rounded-full text-red-600">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))}

                  {portfolios.map((file, index) => (
                    <div key={`new-${index}`} className="relative group rounded-xl overflow-hidden aspect-square border border-emerald-200 shadow-sm">
                      <div className="absolute top-2 right-2 bg-emerald-500 text-white text-[10px] px-2 py-0.5 rounded-full z-10">جدید</div>
                      <img src={URL.createObjectURL(file)} alt="نمونه کار جدید" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-20">
                        <button type="button" onClick={() => removePortfolio(index)} className="bg-white/90 p-2 rounded-full text-red-600">
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

        {/* دکمه‌های ناوبری */}
        <div className="mt-10 pt-6 border-t border-zinc-100 flex items-center justify-between">
          {step > 1 ? (
            <button type="button" onClick={prevStep} className="flex items-center gap-2 px-6 py-3 rounded-xl font-medium text-zinc-600 hover:bg-zinc-100 transition">
              <ArrowRight size={20} /> مرحله قبل
            </button>
          ) : <div></div>}

          {step < 4 ? (
            <button type="button" onClick={nextStep} className="flex items-center gap-2 bg-rose-600 text-white px-8 py-3 rounded-xl font-medium hover:bg-rose-700 transition">
              مرحله بعد <ArrowLeft size={20} />
            </button>
          ) : (
            <button 
              type="button" 
              onClick={handleSubmit} 
              disabled={isSubmitting}
              className="flex items-center gap-2 bg-rose-600 text-white px-8 py-3 rounded-xl font-medium hover:bg-rose-700 transition disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save size={20} />}
              {isSubmitting ? 'در حال بروزرسانی...' : 'ویرایش و ذخیره'}
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
            
            <div className="flex-1 relative bg-zinc-100 w-full h-full">
               <MapPicker 
                  position={tempCoordinates || coordinates || [35.6892, 51.3890]} 
                  setPosition={(coords: [number, number]) => setTempCoordinates(coords)}
               />
            </div>
            
            <div className="p-4 bg-white border-t border-zinc-100 flex justify-between items-center gap-3 z-10">
              <span className="text-sm text-zinc-500 hidden md:inline-block">لطفا نقشه را جابجا کنید تا نشانگر روی لوکیشن شما قرار بگیرد.</span>
              <div className="flex gap-3 w-full md:w-auto">
                <button onClick={() => setIsMapModalOpen(false)} className="flex-1 md:flex-none px-6 py-2.5 rounded-xl text-zinc-600 font-medium hover:bg-zinc-100 transition-colors">
                  انصراف
                </button>
                <button 
                  onClick={() => {
                    if (tempCoordinates) setCoordinates(tempCoordinates);
                    setLocationSelected(true);
                    setIsMapModalOpen(false);
                  }} 
                  className="flex-1 md:flex-none px-6 py-2.5 rounded-xl bg-rose-600 text-white font-medium hover:bg-rose-700 transition-colors flex items-center justify-center gap-2"
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
