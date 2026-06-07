// app/(dashboard)/salon/[id]/page.tsx

"use client";
import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { CATEGORY_MAPPING } from "@/lib/data";
import { 
  ArrowRight, Star, MapPin, Clock, Phone,
  Navigation, CheckCircle2, CalendarOff, X, MessageCircle, ChevronDown, ChevronUp, Globe, Send, Map, Bookmark
} from "lucide-react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";


export default function SalonDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  
  // استیت‌های مربوط به دیتابیس
  const [salon, setSalon] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasAlreadyReviewed, setHasAlreadyReviewed] = useState(false);

  // استیت بوک‌مارک
  const [isBookmarked, setIsBookmarked] = useState(false);

  // استیت‌های عکس، فرم نظر و لیست نظرات
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  // استیت‌های مربوط به فرم نظر
  const [userRating, setUserRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [reviewError, setReviewError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  
  // استیت برای نگهداری تمام رای‌ها و نظرات
  const [localReviews, setLocalReviews] = useState<any[]>([]);

  // استیت برای دسته‌بندی‌های باز شده در بخش خدمات
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

  // استیت مودال مسیریابی
  const [showRoutingModal, setShowRoutingModal] = useState(false);

  // نام کاربری لاگین شده
  const [loggedInUserName, setLoggedInUserName] = useState<string>("");

  // تابع تغییر وضعیت باز/بسته بودن یک دسته‌بندی خدمات
  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category) 
        : [...prev, category]
    );
  };

  // خواندن اطلاعات کاربر از لوکال استوریج در هنگام لود صفحه
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        // اولویت با username است، اگر نداشت name، اگر هیچکدام نبود "کاربر مهمان"
        setLoggedInUserName(parsedUser.username || parsedUser.name || "کاربر مهمان");
      } catch (error) {
        console.error("خطا در خواندن اطلاعات کاربر:", error);
        setLoggedInUserName("کاربر مهمان");
      }
    } else {
      setLoggedInUserName("کاربر مهمان");
    }
  }, []);

  useEffect(() => {
    // تا زمانی که وضعیت لاگین و نام کاربری مشخص نشده، درخواستی نزن
    if (!loggedInUserName) return;

    // چک کردن اینکه آیا این کاربر خاص قبلا نظر داده یا نه
    const reviewed = localStorage.getItem(`has_reviewed_${resolvedParams.id}_${loggedInUserName}`);
    if (reviewed) {
      setHasAlreadyReviewed(true);
    }

    const fetchSalonData = async () => {
      setIsLoading(true);
      try {
        const salonId = resolvedParams.id;

        // بررسی وضعیت بوک‌مارک از لوکال استوریج
        const savedBookmarks = JSON.parse(localStorage.getItem('bookmarkedSalons') || '[]');
        setIsBookmarked(savedBookmarks.includes(salonId));

        // دریافت اطلاعات سالن از دیتابیس
        const response = await fetch(`/api/salon/${salonId}`);
        if (!response.ok) {
           throw new Error('سالن پیدا نشد');
        }
        
        const data = await response.json();
        setSalon(data);
        setLocalReviews(data.reviews || []);

        // محاسبه دسته‌بندی‌ها و باز گذاشتن پیش‌فرض آن‌ها
        if (data.tags) {
          const categories = new Set<string>();
          data.tags.forEach((tag: any) => {
            let category = 'سایر خدمات';
            // اگر تگ به فرمت جدید (آبجکت) بود
            if (typeof tag === 'object' && tag !== null && tag.category) {
              category = tag.category;
            } 
            // اگر تگ به فرمت قدیمی (رشته) بود
            else if (typeof tag === 'string') {
              category = Object.keys(CATEGORY_MAPPING).find(key => CATEGORY_MAPPING[key].includes(tag)) || 'سایر خدمات';
            }
            categories.add(category);
          });
          setExpandedCategories(Array.from(categories));
        }

      } catch (error) {
        console.error("Error fetching salon:", error);
        setSalon(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSalonData();
  }, [resolvedParams.id, loggedInUserName]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <div className="w-10 h-10 border-4 border-zinc-200 border-t-zinc-800 rounded-full animate-spin"></div>
        <p className="text-zinc-500 font-medium text-sm">در حال دریافت اطلاعات سالن...</p>
      </div>
    );
  }

  if (!salon) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <h2 className="text-2xl font-bold text-zinc-800 mb-4">سالن پیدا نشد!</h2>
        <button onClick={() => router.push("/")} className="text-rose-600 hover:text-rose-700 font-medium">
          بازگشت به صفحه اصلی
        </button>
      </div>
    );
  }

  // گروه‌بندی تگ‌ها (خدمات)
  const groupedServices: Record<string, string[]> = {};
  if (salon.tags) {
    salon.tags.forEach((tag: any) => {
      let name = '';
      let category = 'سایر خدمات';

      if (typeof tag === 'object' && tag !== null) {
        name = tag.name;
        category = tag.category || 'سایر خدمات';
      } else if (typeof tag === 'string') {
        name = tag;
        category = Object.keys(CATEGORY_MAPPING).find(key => CATEGORY_MAPPING[key].includes(tag)) || 'سایر خدمات';
      }

      if (name) {
        if (!groupedServices[category]) groupedServices[category] = [];
        groupedServices[category].push(name);
      }
    });
  }

  const ratedReviews = localReviews.filter(review => review.rating > 0);
  const totalVotes = ratedReviews.length;
  const averageRating = totalVotes > 0 
    ? (ratedReviews.reduce((acc, review) => acc + review.rating, 0) / totalVotes).toFixed(1)
    : "0.0";

  const textReviews = localReviews.filter(review => review.comment && review.comment.trim() !== "");

  // هندلر تغییر وضعیت بوک‌مارک
  const toggleBookmark = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!salon) return;
    
    let savedBookmarks = JSON.parse(localStorage.getItem('bookmarkedSalons') || '[]');
    
    if (isBookmarked) {
      savedBookmarks = savedBookmarks.filter((id: string) => id !== salon.id);
    } else {
      savedBookmarks.push(salon.id);
    }
    
    localStorage.setItem('bookmarkedSalons', JSON.stringify(savedBookmarks));
    setIsBookmarked(!isBookmarked);
  };

  const handleReviewSubmit = async () => {
    setReviewError(""); 
    setSuccessMessage("");

    const isTextEmpty = !reviewText.trim();

    if (hasAlreadyReviewed) {
      if (isTextEmpty) {
        setReviewError("لطفاً متن نظر خود را بنویسید.");
        return;
      }
    } else {
      if (userRating === 0 && isTextEmpty) {
        setReviewError("لطفاً حداقل یک امتیاز بدهید یا نظر خود را بنویسید.");
        return;
      }
    }
    
    try {
        const response = await fetch(`/api/salon/${salon.id}/reviews`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            name: loggedInUserName,
            rating: hasAlreadyReviewed ? 0 : userRating, 
            comment: reviewText.trim() 
          })
        });

        const result = await response.json();

        if (!response.ok) {
          if (response.status === 403) {
            setReviewError(result.error);
            return;
          }
          throw new Error(result.error || "خطا در ثبت اطلاعات در سرور");
        }

        setLocalReviews([result, ...localReviews]); 
        setSuccessMessage("نظر شما با موفقیت ثبت شد!");
        setReviewText(""); 
        
        if (!hasAlreadyReviewed && userRating > 0) {
          setHasAlreadyReviewed(true);
          localStorage.setItem(`has_reviewed_${salon.id}_${loggedInUserName}`, "true");
        }

    } catch (error: any) {
        console.error("خطا در ثبت نظر در سرور:", error);
        setReviewError(error.message || "مشکلی در ارتباط با سرور پیش آمد. لطفاً دوباره تلاش کنید.");
    }
  };

  const salonInfoCard = (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-zinc-200">
      <div className="flex justify-between items-start mb-4">
        <h1 className="text-2xl font-bold text-zinc-900">{salon.name}</h1>
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center bg-amber-50 px-2 py-1 rounded-lg">
            <Star className="w-4 h-4 text-amber-500 fill-current ml-1" />
            <span className="font-bold text-amber-700 text-sm">{averageRating}</span>
          </div>
          <span className="text-xs text-zinc-500 font-medium">({totalVotes} رای)</span>
        </div>
      </div>

      <div className="space-y-4 text-zinc-600 text-sm mb-6">
        <div className="flex items-start">
          <MapPin className="w-5 h-5 ml-2 text-rose-500 flex-shrink-0" />
          <p className="leading-relaxed">{salon.address}</p>
        </div>
        
        <div className="flex items-start">
          <Phone className="w-5 h-5 ml-2 text-blue-500 flex-shrink-0" />
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {salon.phones?.map((phone: string, idx: number) => (
              <span key={idx} dir="ltr" className="font-medium text-zinc-800">{phone}</span>
            ))}
          </div>
        </div>

        {salon.workingHours && (
          <div className="flex items-center">
            <Clock className="w-5 h-5 ml-2 text-orange-500 flex-shrink-0" />
            <p>{salon.workingHours}</p>
          </div>
        )}

        {salon.closedDays && salon.closedDays.length > 0 && (
          <div className="flex items-center text-red-500 bg-red-50 p-2 rounded-lg">
            <CalendarOff className="w-5 h-5 ml-2 flex-shrink-0" />
            <p className="font-medium">تعطیل: {salon.closedDays.join('، ')}</p>
          </div>
        )}
      </div>

      <div 
        onClick={() => setShowRoutingModal(true)}
        className="relative w-full h-36 md:h-48 bg-zinc-100 rounded-xl mb-6 overflow-hidden cursor-pointer group border border-zinc-200 shadow-sm"
      >
        {salon.coordinates && salon.coordinates.length === 2 ? (
          <img 
            src={`https://static-maps.yandex.ru/1.x/?ll=${salon.coordinates[1]},${salon.coordinates[0]}&z=17&l=map&size=600,250&pt=${salon.coordinates[1]},${salon.coordinates[0]},pm2rdm&lang=fa_IR`} 
            alt={`موقعیت ${salon.name} روی نقشه`} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-zinc-400 gap-2">
            <Map size={32} />
            <span className="text-sm">نقشه ثبت نشده</span>
          </div>
        )}
      </div>

      {salon.socials && (
        <div className="flex justify-center flex-wrap gap-4 mb-6 px-2">
          {salon.socials.website && (
            <a href={salon.socials.website.startsWith('http') ? salon.socials.website : `https://${salon.socials.website}`} target="_blank" rel="noopener noreferrer" className="group flex items-center justify-center w-10 h-10 bg-zinc-50 rounded-full hover:bg-white hover:shadow-md hover:-translate-y-1 transition-all duration-300 border border-transparent hover:border-zinc-100" title="وب‌سایت">
              <img src="/web.png" alt="وب‌سایت" className="w-5 h-5 object-contain grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-300" />
            </a>
          )}
          {salon.socials.instagram && (
            <a href={`https://instagram.com/${salon.socials.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="group flex items-center justify-center w-10 h-10 bg-zinc-50 rounded-full hover:bg-white hover:shadow-md hover:-translate-y-1 transition-all duration-300 border border-transparent hover:border-zinc-100" title="اینستاگرام">
              <img src="/instagram.png" alt="اینستاگرام" className="w-5 h-5 object-contain grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-300" />
            </a>
          )}
          {salon.socials.whatsapp && (
            <a href={`https://wa.me/${salon.socials.whatsapp}`} target="_blank" rel="noopener noreferrer" className="group flex items-center justify-center w-10 h-10 bg-zinc-50 rounded-full hover:bg-white hover:shadow-md hover:-translate-y-1 transition-all duration-300 border border-transparent hover:border-zinc-100" title="واتس‌اپ">
              <img src="/whatsapp.png" alt="واتس‌اپ" className="w-5 h-5 object-contain grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-300" />
            </a>
          )}
          {salon.socials.telegram && (
            <a href={`https://t.me/${salon.socials.telegram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="group flex items-center justify-center w-10 h-10 bg-zinc-50 rounded-full hover:bg-white hover:shadow-md hover:-translate-y-1 transition-all duration-300 border border-transparent hover:border-zinc-100" title="تلگرام">
              <img src="/telegram.png" alt="تلگرام" className="w-5 h-5 object-contain grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-300" />
            </a>
          )}
          {salon.socials.bale && (
            <a href={`https://ble.ir/${salon.socials.bale.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="group flex items-center justify-center w-10 h-10 bg-zinc-50 rounded-full hover:bg-white hover:shadow-md hover:-translate-y-1 transition-all duration-300 border border-transparent hover:border-zinc-100" title="بله">
              <img src="/bale.png" alt="بله" className="w-5 h-5 object-contain grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-300" />
            </a>
          )}
          {salon.socials.rubika && (
            <a href={`https://rubika.ir/${salon.socials.rubika.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="group flex items-center justify-center w-10 h-10 bg-zinc-50 rounded-full hover:bg-white hover:shadow-md hover:-translate-y-1 transition-all duration-300 border border-transparent hover:border-zinc-100" title="روبیکا">
              <img src="/rubika.png" alt="روبیکا" className="w-5 h-5 object-contain grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-300" />
            </a>
          )}
        </div>
      )}

      <div className="flex">
        {salon.phones && salon.phones.length > 0 && (
            <a
            href={`tel:${salon.phones[0]}`}
            className="w-full bg-zinc-900 hover:bg-black text-white font-medium py-3.5 rounded-xl shadow-md text-center transition flex items-center justify-center"
          >
            تماس
          </a>
        )}
      </div>
    </div>
  );

  return (
    <>
            {selectedImage && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl w-full max-h-[90vh] flex items-center justify-center">
            <button 
              onClick={() => setSelectedImage(null)}
              className="absolute -top-12 right-0 text-white hover:text-gray-300 p-2 z-[110]"
            >
              <X className="w-8 h-8" />
            </button>
            
            {/* نمایش در موبایل: قابلیت زوم با انگشت فعال است */}
            <div className="w-full h-full sm:hidden flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
              <TransformWrapper
                initialScale={1}
                minScale={1}
                maxScale={4}
                centerOnInit={true}
                wheel={{ disabled: true }} // زوم با غلتک موس غیرفعال تا فقط مخصوص تاچ موبایل باشد
              >
                <TransformComponent wrapperClass="!w-full !h-full flex items-center justify-center">
                  <img 
                    src={selectedImage} 
                    alt="بزرگنمایی" 
                    className="max-w-full max-h-[85vh] object-contain rounded-lg"
                  />
                </TransformComponent>
              </TransformWrapper>
            </div>

            {/* نمایش در دسکتاپ: بدون قابلیت زوم (مثل قبل) */}
            <div className="hidden sm:flex items-center justify-center w-full h-full">
              <img 
                src={selectedImage} 
                alt="بزرگنمایی" 
                className="max-w-full max-h-[85vh] object-contain rounded-lg"
                onClick={(e) => e.stopPropagation()} 
              />
            </div>

          </div>
        </div>
      )}

      {showRoutingModal && salon.coordinates && (
        <div 
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4"
          onClick={() => setShowRoutingModal(false)}
        >
          <div 
            className="bg-white w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl p-6 pb-8 sm:pb-6 animate-in slide-in-from-bottom-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-zinc-900">مسیریابی با...</h3>
              <button onClick={() => setShowRoutingModal(false)} className="p-2 text-zinc-400 hover:text-zinc-700 bg-zinc-50 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex flex-col gap-3">
              <a 
                href={`https://neshan.org/maps/routing?orig=&dest=${salon.coordinates[0]},${salon.coordinates[1]}`} 
                target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-between p-4 rounded-xl border border-zinc-200 hover:bg-sky-50 hover:border-sky-200 transition"
              >
                <span className="font-bold text-zinc-800">نشان (Neshan)</span>
                <img src="/neshan.png" alt="لوگوی نشان" className="w-7 h-7 object-contain" />
              </a>
              
              <a 
                href={`https://balad.ir/route?dest=${salon.coordinates[0]},${salon.coordinates[1]}`} 
                target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-between p-4 rounded-xl border border-zinc-200 hover:bg-emerald-50 hover:border-emerald-200 transition"
              >
                <span className="font-bold text-zinc-800">بلد (Balad)</span>
                <img src="/balad.png" alt="لوگوی بلد" className="w-7 h-7 object-contain" />
              </a>
              
              <a 
                href={`https://www.google.com/maps/dir/?api=1&destination=${salon.coordinates[0]},${salon.coordinates[1]}`} 
                target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-between p-4 rounded-xl border border-zinc-200 hover:bg-rose-50 hover:border-rose-200 transition"
              >
                <span className="font-bold text-zinc-800">گوگل مپ (Google Maps)</span>
                <img src="/google-maps.png" alt="لوگوی گوگل مپ" className="w-7 h-7 object-contain" />
              </a>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto pb-24 px-4 sm:px-6 mt-8">
        
        {/* هدر: دکمه بازگشت و دکمه بوک‌مارک در یک ردیف */}
        <div className="flex justify-between items-center mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center text-zinc-600 hover:text-zinc-900 transition font-medium"
          >
            <ArrowRight className="w-5 h-5 ml-2" />
            بازگشت
          </button>

          <button 
            onClick={toggleBookmark}
            className="flex items-center justify-center p-2 rounded-full hover:bg-zinc-100 transition-colors group"
            title={isBookmarked ? "حذف از نشان‌شده‌ها" : "افزودن به نشان‌شده‌ها"}
          >
            <Bookmark 
              className={`w-6 h-6 transition-colors ${
                isBookmarked 
                  ? "text-zinc-900 fill-zinc-900" 
                  : "text-zinc-500 group-hover:text-zinc-900"
              }`} 
            />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <div className="lg:col-span-2 space-y-8">
            <div className="space-y-4">
              <div 
                className="w-full h-80 bg-zinc-200 rounded-2xl overflow-hidden relative group cursor-pointer border border-zinc-100"
                onClick={() => setSelectedImage(salon.imageUrl)}
              >
                {salon.imageUrl ? (
                   <img 
                   src={salon.imageUrl} 
                   alt={salon.name} 
                   className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                 />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-400 bg-zinc-50">بدون تصویر</div>
                )}
               
                <div className="absolute bottom-4 right-4 bg-black/60 text-white px-3 py-1.5 rounded-lg backdrop-blur-md text-sm font-medium">
                  تصویر اصلی
                </div>
              </div>
              
              {salon.portfolios && salon.portfolios.length > 0 && (
                  <div className="flex gap-4 overflow-x-auto pb-2 hide-scrollbar">
                  {salon.portfolios.map((imgUrl: string, index: number) => (
                      <div 
                      key={index} 
                      onClick={() => setSelectedImage(imgUrl)}
                      className="w-32 h-32 flex-shrink-0 bg-zinc-100 rounded-xl overflow-hidden border border-zinc-200 cursor-pointer hover:opacity-90 transition"
                      >
                      <img src={imgUrl} alt={`نمونه کار ${index + 1}`} className="w-full h-full object-cover" />
                      </div>
                  ))}
                  </div>
              )}
            </div>

            <div className="block lg:hidden">
              {salonInfoCard}
            </div>

            <section className="bg-white rounded-2xl p-6 shadow-sm border border-zinc-200">
              <h2 className="text-xl font-bold text-zinc-900 mb-4">درباره سالن</h2>
              <p className="text-zinc-600 leading-relaxed text-justify">
                {salon.description || "توضیحاتی برای این سالن ثبت نشده است."}
              </p>
            </section>

            <section className="bg-white rounded-2xl p-6 shadow-sm border border-zinc-200">
              <h2 className="text-xl font-bold text-zinc-900 mb-6">خدمات ما</h2>
              <div className="space-y-4">
                {Object.keys(groupedServices).length > 0 ? (
                  Object.entries(groupedServices).map(([category, services]) => {
                    const isExpanded = expandedCategories.includes(category);
                    
                    return (
                      <div key={category} className="border border-zinc-100 rounded-xl overflow-hidden bg-zinc-50/50">
                        <button 
                          type="button" 
                          onClick={() => toggleCategory(category)} 
                          className="w-full flex items-center justify-between p-4 bg-white hover:bg-zinc-50 transition-colors border-b border-zinc-100"
                        >
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-zinc-800 text-sm">{category}</span>
                            <span className="text-xs bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-full font-medium">
                              {services.length.toLocaleString('fa-IR')} خدمت
                            </span>
                          </div>
                          {isExpanded ? <ChevronUp size={20} className="text-zinc-400" /> : <ChevronDown size={20} className="text-zinc-400" />}
                        </button>
                        
                        {isExpanded && (
                          <div className="p-4 flex flex-wrap gap-3 bg-white">
                            {services.map((service, index) => (
                              <div key={index} className="flex items-center bg-zinc-50 px-3 py-2 rounded-lg"> 
                                <CheckCircle2 className="w-4 h-4 text-emerald-500 ml-2" />
                                <span className="text-zinc-700 text-sm font-medium">{service}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <p className="text-zinc-500 text-sm">خدماتی ثبت نشده است.</p>
                )}
              </div>
            </section>

            <section className="bg-white rounded-2xl p-6 shadow-sm border border-zinc-200 mb-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-zinc-900">نظرات مشتریان</h2>
                <span className="text-sm font-medium text-zinc-500 bg-zinc-100 px-3 py-1 rounded-full">{textReviews.length} نظر ثبت شده</span>
              </div>

              <div className="bg-zinc-50 rounded-xl p-5 mb-8 border border-zinc-100">
                  <h3 className="font-medium text-zinc-800 mb-4">
                      {hasAlreadyReviewed ? "ثبت نظر جدید" : "امتیاز و نظر خود را ثبت کنید"}
                  </h3>
                  
                  {successMessage && (
                      <div className="mb-4 p-3 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100 flex items-center gap-2">
                          <CheckCircle2 className="w-5 h-5" />
                          <span className="text-sm font-medium">{successMessage}</span>
                      </div>
                  )}

                  {!hasAlreadyReviewed ? (
                      <div className="flex items-center gap-1 mb-4 cursor-pointer mt-2">
                          {[1, 2, 3, 4, 5].map((star) => (
                          <Star 
                              key={star} 
                              onClick={() => setUserRating(star)}
                              className={`w-7 h-7 transition-colors ${star <= userRating ? 'text-amber-400 fill-current' : 'text-zinc-300 hover:text-amber-200'}`} 
                          />
                          ))}
                      </div>
                  ) : (
                      <p className="text-sm text-emerald-600 mb-4 font-medium mt-2">شما قبلاً امتیاز خود را ثبت کرده‌اید. می‌توانید نظر جدیدی اضافه کنید.</p>
                  )}

                  <textarea 
                      value={reviewText}
                      onChange={(e) => setReviewText(e.target.value)}
                      className="w-full bg-white border border-zinc-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-800 mb-4 resize-none transition-shadow"
                      rows={3}
                      placeholder={hasAlreadyReviewed ? "نظر خود را بنویسید..." : "در صورت تمایل، تجربه خود از این سالن را بنویسید..."}
                  ></textarea>
                  
                  {reviewError && (
                      <p className="text-rose-500 text-xs font-medium mb-4">{reviewError}</p>
                  )}

                  <button 
                      onClick={handleReviewSubmit}
                      className="bg-zinc-900 hover:bg-black text-white px-6 py-2.5 rounded-lg text-sm font-medium transition"
                  >
                      {hasAlreadyReviewed ? "ثبت نظر" : "ثبت"}
                  </button>
              </div>

              <div className="space-y-4">
                {textReviews.length > 0 ? (
                  textReviews.map((review) => (
                    <div key={review.id} className="border-b border-zinc-100 pb-5 last:border-0 last:pb-0">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-bold text-zinc-800 text-sm">{review.name}</span>
                        {review.rating > 0 && (
                            <div className="flex bg-zinc-50 px-2 py-1 rounded-md">
                            {[...Array(5)].map((_, i) => (
                                <Star key={i} className={`w-3.5 h-3.5 ${i < review.rating ? 'text-amber-400 fill-current' : 'text-zinc-300'}`} />
                            ))}
                            </div>
                        )}
                      </div>
                      <p className="text-zinc-600 text-sm leading-relaxed text-justify">{review.comment}</p>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 bg-zinc-50 rounded-xl border border-dashed border-zinc-200">
                     <MessageCircle className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
                     <p className="text-zinc-500 text-sm font-medium">هنوز نظری ثبت نشده است. اولین نفر باشید!</p>
                  </div>
                )}
              </div>
            </section>
          </div>

          <div className="hidden lg:block lg:col-span-1 h-fit sticky top-6">
            {salonInfoCard}
          </div>

        </div>
      </div>
    </>
  );
}
