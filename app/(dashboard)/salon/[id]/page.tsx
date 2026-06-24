// app/(dashboard)/salon/[id]/page.tsx

"use client";
import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { CATEGORY_MAPPING } from "@/lib/data";
import { 
  ArrowRight, Star, MapPin, Clock, Phone,
  CheckCircle2, CalendarOff, X, MessageCircle, ChevronDown, ChevronUp, Map
} from "lucide-react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";

export default function SalonDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  
  const [salon, setSalon] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasAlreadyReviewed, setHasAlreadyReviewed] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [userRating, setUserRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [reviewError, setReviewError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [localReviews, setLocalReviews] = useState<any[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [showRoutingModal, setShowRoutingModal] = useState(false);
  const [loggedInUserName, setLoggedInUserName] = useState<string>("");

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category) 
        : [...prev, category]
    );
  };

  useEffect(() => {
  const fetchUser = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const user = await res.json();
        setLoggedInUserName(user.username || "کاربر مهمان");
      } else {
        setLoggedInUserName("کاربر مهمان");
      }
    } catch {
      setLoggedInUserName("کاربر مهمان");
    }
  };
  fetchUser();
}, []);

  useEffect(() => {
    if (!loggedInUserName) return;

    const reviewed = localStorage.getItem(`has_reviewed_${resolvedParams.id}_${loggedInUserName}`);
    if (reviewed) {
      setHasAlreadyReviewed(true);
    }

    const fetchSalonData = async () => {
      setIsLoading(true);
      try {
        const salonId = resolvedParams.id;
        const savedBookmarks = JSON.parse(localStorage.getItem('bookmarkedSalons') || '[]');
        setIsBookmarked(savedBookmarks.includes(salonId));

        const response = await fetch(`/api/salon/${salonId}`);
        if (!response.ok) throw new Error('سالن پیدا نشد');
        
        const data = await response.json();
        setSalon(data);
        setLocalReviews(data.reviews || []);

        if (data.tags) {
          const categories = new Set<string>();
          data.tags.forEach((tag: any) => {
            let category = 'سایر خدمات';
            if (typeof tag === 'object' && tag !== null && tag.category) {
              category = tag.category;
            } else if (typeof tag === 'string') {
              category = Object.keys(CATEGORY_MAPPING).find(key => CATEGORY_MAPPING[key].includes(tag)) || 'سایر خدمات';
            }
            categories.add(category);
          });
          setExpandedCategories(Array.from(categories));
        }
      } catch (error) {
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
      <div className="flex flex-col items-center justify-center h-[60vh] px-4 text-center">
        <h2 className="text-xl sm:text-2xl font-bold text-zinc-800 mb-4">سالن پیدا نشد!</h2>
        <button onClick={() => router.push("/")} className="text-rose-600 hover:text-rose-700 font-medium">
          بازگشت به صفحه اصلی
        </button>
      </div>
    );
  }

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
      if (isTextEmpty) return setReviewError("لطفاً متن نظر خود را بنویسید.");
    } else {
      if (userRating === 0 && isTextEmpty) return setReviewError("لطفاً حداقل یک امتیاز بدهید یا نظر خود را بنویسید.");
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
          if (response.status === 403) return setReviewError(result.error);
          throw new Error(result.error || "خطا در ثبت اطلاعات");
        }

        setLocalReviews([result, ...localReviews]); 
        setSuccessMessage("نظر شما با موفقیت ثبت شد!");
        setReviewText(""); 
        
        if (!hasAlreadyReviewed && userRating > 0) {
          setHasAlreadyReviewed(true);
          localStorage.setItem(`has_reviewed_${salon.id}_${loggedInUserName}`, "true");
        }
    } catch (error: any) {
        setReviewError(error.message || "مشکلی پیش آمد. لطفاً دوباره تلاش کنید.");
    }
  };

  const salonInfoCard = (
    <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-zinc-200">
      <div className="flex justify-between items-start mb-4 gap-3">
        <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 leading-snug">{salon.name}</h1>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <div className="flex items-center bg-amber-50 px-2 py-1 rounded-lg">
            <Star className="w-4 h-4 text-amber-500 fill-current ml-1" />
            <span className="font-bold text-amber-700 text-sm">{averageRating}</span>
          </div>
          <span className="text-[11px] sm:text-xs text-zinc-500 font-medium">({totalVotes} رای)</span>
        </div>
      </div>

      <div className="space-y-3 sm:space-y-4 text-zinc-600 text-[13px] sm:text-sm mb-6">
        <div className="flex items-start">
          <MapPin className="w-4 h-4 sm:w-5 sm:h-5 ml-2 mt-0.5 text-rose-500 flex-shrink-0" />
          <p className="leading-relaxed">{salon.address}</p>
        </div>
        
        <div className="flex items-start">
          <Phone className="w-4 h-4 sm:w-5 sm:h-5 ml-2 mt-0.5 text-blue-500 flex-shrink-0" />
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {salon.phones?.map((phone: string, idx: number) => (
              <span key={idx} dir="ltr" className="font-medium text-zinc-800">{phone}</span>
            ))}
          </div>
        </div>

        {salon.workingHours && (
          <div className="flex items-center">
            <Clock className="w-4 h-4 sm:w-5 sm:h-5 ml-2 text-orange-500 flex-shrink-0" />
            <p>{salon.workingHours}</p>
          </div>
        )}

        {salon.closedDays && salon.closedDays.length > 0 && (
          <div className="flex items-center text-red-500 bg-red-50 p-2 rounded-lg">
            <CalendarOff className="w-4 h-4 sm:w-5 sm:h-5 ml-2 flex-shrink-0" />
            <p className="font-medium">تعطیل: {salon.closedDays.join('، ')}</p>
          </div>
        )}
      </div>

      <div 
        onClick={() => setShowRoutingModal(true)}
        className="relative w-full h-32 sm:h-48 bg-zinc-100 rounded-xl mb-6 overflow-hidden cursor-pointer group border border-zinc-200"
      >
        {salon.coordinates && salon.coordinates.length === 2 ? (
          <img 
            src={`https://static-maps.yandex.ru/1.x/?ll=${salon.coordinates[1]},${salon.coordinates[0]}&z=17&l=map&size=600,250&pt=${salon.coordinates[1]},${salon.coordinates[0]},pm2rdm&lang=fa_IR`} 
            alt={`موقعیت ${salon.name}`} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-zinc-400 gap-2">
            <Map size={28} />
            <span className="text-xs sm:text-sm">نقشه ثبت نشده</span>
          </div>
        )}
      </div>

      {salon.socials && (
  <div className="flex justify-center flex-wrap gap-3 mb-2 px-2">

    {salon.socials.website && (
      <a
        href={salon.socials.website.startsWith('http')
          ? salon.socials.website
          : `https://${salon.socials.website}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center w-10 h-10 rounded-full transition-all hover:bg-zinc-100 active:scale-95"
      >
        <img
          src="/web.png"
          alt="وب‌سایت"
          className="w-5 h-5 object-contain grayscale opacity-60"
        />
      </a>
    )}

    {salon.socials.instagram && (
      <a
        href={`https://instagram.com/${salon.socials.instagram.replace('@', '')}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center w-10 h-10 rounded-full transition-all hover:bg-zinc-100 active:scale-95"
      >
        <img
          src="/instagram.png"
          alt="اینستاگرام"
          className="w-5 h-5 object-contain grayscale opacity-60"
        />
      </a>
    )}

    {salon.socials.whatsapp && (
      <a
        href={`https://wa.me/${salon.socials.whatsapp}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center w-10 h-10 rounded-full transition-all hover:bg-zinc-100 active:scale-95"
      >
        <img
          src="/whatsapp.png"
          alt="واتساپ"
          className="w-5 h-5 object-contain grayscale opacity-60"
        />
      </a>
    )}

    {salon.socials.telegram && (
      <a
        href={`https://t.me/${salon.socials.telegram.replace('@', '')}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center w-10 h-10 rounded-full transition-all hover:bg-zinc-100 active:scale-95"
      >
        <img
          src="/telegram.png"
          alt="تلگرام"
          className="w-5 h-5 object-contain grayscale opacity-60"
        />
      </a>
    )}

    {salon.socials.rubika && (
  <a
    href={`https://rubika.ir/${salon.socials.rubika.replace('@', '')}`}
    target="_blank"
    rel="noopener noreferrer"
    className="flex items-center justify-center w-10 h-10 rounded-full transition-all hover:bg-zinc-100 active:scale-95"
  >
    <img
      src="/rubika.png"
      alt="روبیکا"
      className="w-5 h-5 object-contain grayscale opacity-60"
    />
  </a>
)}

{salon.socials.bale && (
  <a
    href={`https://ble.ir/${salon.socials.bale.replace('@', '')}`}
    target="_blank"
    rel="noopener noreferrer"
    className="flex items-center justify-center w-10 h-10 rounded-full transition-all hover:bg-zinc-100 active:scale-95"
  >
    <img
      src="/Bale.png"
      alt="بله"
      className="w-5 h-5 object-contain grayscale opacity-60"
    />
  </a>
)}

  </div>
)}

      {/* دکمه تماس در دسکتاپ */}
      <div className="hidden lg:flex mt-6">
        {salon.phones && salon.phones.length > 0 && (
            <a href={`tel:${salon.phones[0]}`} className="w-full bg-zinc-900 hover:bg-black text-white font-medium py-3 rounded-xl shadow-md text-center transition flex items-center justify-center">
              تماس با سالن
            </a>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* مودال تصاویر */}
      {selectedImage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-0 sm:p-4" onClick={() => setSelectedImage(null)}>
          <div className="relative w-full h-full sm:max-w-4xl sm:max-h-[90vh] flex items-center justify-center">
            <button onClick={() => setSelectedImage(null)} className="absolute top-4 right-4 sm:-top-12 sm:right-0 text-white bg-black/50 sm:bg-transparent rounded-full p-2 z-[110]">
              <X className="w-6 h-6 sm:w-8 sm:h-8" />
            </button>
            
            <div className="w-full h-full sm:hidden flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
              <TransformWrapper initialScale={1} minScale={1} maxScale={4} centerOnInit={true} wheel={{ disabled: true }}>
                <TransformComponent wrapperClass="!w-full !h-full flex items-center justify-center">
                  <img src={selectedImage} alt="بزرگنمایی" className="max-w-full max-h-screen object-contain" />
                </TransformComponent>
              </TransformWrapper>
            </div>

            <div className="hidden sm:flex items-center justify-center w-full h-full">
              <img src={selectedImage} alt="بزرگنمایی" className="max-w-full max-h-[85vh] object-contain rounded-lg" onClick={(e) => e.stopPropagation()} />
            </div>
          </div>
        </div>
      )}

      {/* مودال مسیریابی */}
      {showRoutingModal && salon.coordinates && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4" onClick={() => setShowRoutingModal(false)}>
          <div className="bg-white w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl p-5 pb-8 sm:pb-5 animate-in slide-in-from-bottom-2" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-base font-bold text-zinc-900">مسیریابی با...</h3>
              <button onClick={() => setShowRoutingModal(false)} className="p-1.5 text-zinc-400 bg-zinc-50 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex flex-col gap-2.5">
              <a href={`https://neshan.org/maps/routing?orig=&dest=${salon.coordinates[0]},${salon.coordinates[1]}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-3.5 rounded-xl border border-zinc-200 bg-zinc-50 active:bg-zinc-100">
                <span className="font-bold text-sm text-zinc-800">نشان (Neshan)</span>
                <img src="/neshan.png" alt="نشان" className="w-6 h-6 object-contain" />
              </a>
              <a href={`https://balad.ir/route?dest=${salon.coordinates[0]},${salon.coordinates[1]}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-3.5 rounded-xl border border-zinc-200 bg-zinc-50 active:bg-zinc-100">
                <span className="font-bold text-sm text-zinc-800">بلد (Balad)</span>
                <img src="/balad.png" alt="بلد" className="w-6 h-6 object-contain" />
              </a>
              <a href={`https://www.google.com/maps/dir/?api=1&destination=${salon.coordinates[0]},${salon.coordinates[1]}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-3.5 rounded-xl border border-zinc-200 bg-zinc-50 active:bg-zinc-100">
                <span className="font-bold text-sm text-zinc-800">گوگل مپ (Google Maps)</span>
                <img src="/google-maps.png" alt="گوگل مپ" className="w-6 h-6 object-contain" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* محتوای اصلی */}
      {/* پدینگ پایین (pb-28) برای جلوگیری از رفتن محتوا زیر دکمه شناور موبایل است */}
      <div className="max-w-5xl mx-auto pb-40 sm:pb-24 px-3 sm:px-6 mt-4 sm:mt-8">
        
        <div className="flex justify-between items-center mb-4 sm:mb-8 px-1">
          <button onClick={() => router.back()} className="flex items-center text-sm sm:text-base text-zinc-600 font-medium">
            <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-1.5" />
            بازگشت
          </button>
          <button onClick={toggleBookmark} className="p-2 rounded-full active:bg-zinc-100">
            <svg viewBox="0 0 24 24" className={`w-6 h-6 ${isBookmarked ? "text-zinc-900" : "text-zinc-500"}`} fill={isBookmarked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v17.5l-6-4-6 4V4z" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-8">
          
          <div className="lg:col-span-2 space-y-5 sm:space-y-8">
            <div className="space-y-3 sm:space-y-4">
              <div 
                className="w-full h-64 sm:h-80 bg-zinc-200 rounded-xl sm:rounded-2xl overflow-hidden relative cursor-pointer"
                onClick={() => setSelectedImage(salon.imageUrl)}
              >
                {salon.imageUrl ? (
                   <img src={salon.imageUrl} alt={salon.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-400 text-sm">بدون تصویر</div>
                )}
                <div className="absolute bottom-3 right-3 bg-black/60 text-white px-2.5 py-1 rounded-md backdrop-blur-md text-xs font-medium">
                  تصویر اصلی
                </div>
              </div>
              
              {salon.portfolios && salon.portfolios.length > 0 && (
                  <div className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar snap-x">
                  {salon.portfolios.map((imgUrl: string, index: number) => (
                      <div 
                      key={index} 
                      onClick={() => setSelectedImage(imgUrl)}
                      className="w-24 h-24 sm:w-32 sm:h-32 flex-shrink-0 bg-zinc-100 rounded-lg sm:rounded-xl overflow-hidden snap-start cursor-pointer"
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

            <section className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-zinc-200">
              <h2 className="text-lg sm:text-xl font-bold text-zinc-900 mb-3">درباره سالن</h2>
              <p className="text-zinc-600 text-[13px] sm:text-sm leading-relaxed text-justify">
                {salon.description || "توضیحاتی ثبت نشده است."}
              </p>
            </section>

            <section className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-zinc-200">
              <h2 className="text-lg sm:text-xl font-bold text-zinc-900 mb-4">خدمات ما</h2>
              <div className="space-y-3">
                {Object.keys(groupedServices).length > 0 ? (
                  Object.entries(groupedServices).map(([category, services]) => {
                    const isExpanded = expandedCategories.includes(category);
                    return (
                      <div key={category} className="border border-zinc-100 rounded-xl overflow-hidden">
                        <button type="button" onClick={() => toggleCategory(category)} className="w-full flex items-center justify-between p-3.5 bg-zinc-50/50 active:bg-zinc-100">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-zinc-800 text-[13px] sm:text-sm">{category}</span>
                            <span className="text-[10px] sm:text-xs bg-white border border-zinc-200 text-zinc-500 px-2 py-0.5 rounded-full">
                              {services.length} خدمت
                            </span>
                          </div>
                          {isExpanded ? <ChevronUp size={18} className="text-zinc-400" /> : <ChevronDown size={18} className="text-zinc-400" />}
                        </button>
                        {isExpanded && (
                          <div className="p-3.5 flex flex-wrap gap-2.5 border-t border-zinc-100">
                            {services.map((service, index) => (
                              <div key={index} className="flex items-center bg-zinc-50 px-2.5 py-1.5 rounded-md border border-zinc-100"> 
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 ml-1.5" />
                                <span className="text-zinc-700 text-xs sm:text-[13px]">{service}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <p className="text-zinc-500 text-xs">خدماتی ثبت نشده است.</p>
                )}
              </div>
            </section>

            <section className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-zinc-200">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg sm:text-xl font-bold text-zinc-900">نظرات</h2>
                <span className="text-xs font-medium text-zinc-500 bg-zinc-100 px-2.5 py-1 rounded-md">{textReviews.length} نظر</span>
              </div>

              <div className="bg-zinc-50 rounded-xl p-4 mb-6 border border-zinc-100">
                  <h3 className="font-medium text-sm text-zinc-800 mb-3">
                      {hasAlreadyReviewed ? "ثبت نظر جدید" : "امتیاز و نظر خود را ثبت کنید"}
                  </h3>
                  
                  {successMessage && (
                      <div className="mb-3 p-2.5 bg-emerald-50 text-emerald-600 rounded-md flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4" />
                          <span className="text-xs font-medium">{successMessage}</span>
                      </div>
                  )}

                  {!hasAlreadyReviewed ? (
                      <div className="flex items-center gap-1 mb-3">
                          {[1, 2, 3, 4, 5].map((star) => (
                          <Star key={star} onClick={() => setUserRating(star)} className={`w-6 h-6 sm:w-7 sm:h-7 ${star <= userRating ? 'text-amber-400 fill-current' : 'text-zinc-300'}`} />
                          ))}
                      </div>
                  ) : (
                      <p className="text-xs text-emerald-600 mb-3 font-medium">قبلاً امتیاز داده‌اید. ثبت نظر متنی:</p>
                  )}

                  <textarea 
                      value={reviewText} onChange={(e) => setReviewText(e.target.value)}
                      className="w-full bg-white border border-zinc-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-400 mb-3 resize-none"
                      rows={3} placeholder="تجربه خود را بنویسید..."
                  ></textarea>
                  
                  {reviewError && <p className="text-rose-500 text-xs font-medium mb-3">{reviewError}</p>}

                  <button onClick={handleReviewSubmit} className="w-full sm:w-auto bg-zinc-900 text-white px-5 py-2.5 rounded-lg text-sm font-medium active:bg-black">
                      {hasAlreadyReviewed ? "ثبت نظر" : "ثبت"}
                  </button>
              </div>

              <div className="space-y-4">
                {textReviews.length > 0 ? (
                  textReviews.map((review) => (
                    <div key={review.id} className="border-b border-zinc-100 pb-4 last:border-0 last:pb-0">
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="font-bold text-zinc-800 text-xs sm:text-sm">{review.name}</span>
                        {review.rating > 0 && (
                            <div className="flex">
                            {[...Array(5)].map((_, i) => (
                                <Star key={i} className={`w-3 h-3 ${i < review.rating ? 'text-amber-400 fill-current' : 'text-zinc-200'}`} />
                            ))}
                            </div>
                        )}
                      </div>
                      <p className="text-zinc-600 text-[13px] leading-relaxed text-justify">{review.comment}</p>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6">
                     <p className="text-zinc-400 text-xs">هنوز نظری ثبت نشده است.</p>
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

      {/* دکمه شناور تماس برای موبایل (Sticky Bottom Bar) */}
      {salon.phones && salon.phones.length > 0 && (
  <div className="fixed bottom-6 left-4 right-4 z-[60] lg:hidden">
    <a 
      href={`tel:${salon.phones[0]}`} 
      className="flex w-full bg-zinc-900 text-white font-medium py-4 rounded-2xl text-sm items-center justify-center gap-2 shadow-lg shadow-zinc-400/30 active:scale-95 transition-transform"
    >
      <Phone className="w-4 h-4" />
      تماس با سالن
    </a>
  </div>
)}

    </>
  );
}
