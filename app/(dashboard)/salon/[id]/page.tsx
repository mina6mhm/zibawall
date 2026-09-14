// app/(dashboard)/salon/[id]/page.tsx

"use client";
import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { CATEGORY_MAPPING } from "@/lib/data";
import { 
  Star, MapPin, Clock, Phone,
  CheckCircle2, CalendarOff, X, MessageCircle, CalendarClock, ChevronDown, ChevronUp, Map, Trash2,
  Home, Users, Share2
} from "lucide-react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import ShareSalonModal from "@/components/salon/ShareSalonModal";


const GENDER_AUDIENCE_LABELS: Record<string, string> = {
  FEMALE: 'مخصوص خانم‌ها',
  MALE: 'مخصوص آقایون',
  BOTH: 'خانم‌ها و آقایون',
};

// اعداد لاتین رو به فارسی تبدیل می‌کنه — برای نمایش تعداد آرا/نظرات و امتیاز
const toPersianDigits = (str: string) => str.replace(/[0-9]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);

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
  const [ratingError, setRatingError] = useState("");
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [localReviews, setLocalReviews] = useState<any[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [showRoutingModal, setShowRoutingModal] = useState(false);
  const [loggedInUserName, setLoggedInUserName] = useState<string>("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  // --- کنترل مودال انتخاب شماره تماس (وقتی سالن بیش از یک شماره داشته باشد) ---
  const [showPhoneModal, setShowPhoneModal] = useState(false);

  // --- کنترل پاپ‌آپ هشدار وقتی نوبت‌دهی آنلاین سالن غیرفعاله ---
  const [showBookingAlert, setShowBookingAlert] = useState(false);

  // --- اشتراک‌گذاری صفحه سالن (لینک + QR) ---
  const [showShareModal, setShowShareModal] = useState(false);

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
        setIsAdmin(user.role === 'ADMIN');
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

  const handleDeleteSalon = async () => {
    if (!salon) return;
    setIsDeleting(true);
    setDeleteError("");
    try {
      const response = await fetch(`/api/salon?id=${salon.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'خطا در حذف کسب‌وکار');
      }

      router.push('/');
    } catch (error: any) {
      setDeleteError(error.message || 'مشکلی پیش آمد. لطفاً دوباره تلاش کنید.');
      setIsDeleting(false);
    }
  };

  // --- اشتراک‌گذاری صفحه‌ی این سالن: باز کردن مودال لینک + QR ---
  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!salon) return;
    setShowShareModal(true);
  };

  const shareUrl = salon && typeof window !== "undefined"
    ? `${window.location.origin}/salon/${salon.id}`
    : "";

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <div className="w-10 h-10 border-4 border-[#824c71]/15 border-t-[#824c71] rounded-full animate-spin"></div>
        <p className="text-zinc-500 font-medium text-sm">در حال دریافت اطلاعات سالن...</p>
      </div>
    );
  }

  if (!salon) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] px-4 text-center gap-4">
        <h2 className="text-xl sm:text-2xl font-bold text-zinc-800">سالن پیدا نشد!</h2>
        <p className="text-sm text-zinc-500 max-w-xs">این سالن حذف شده یا لینکش اشتباهه.</p>
        <button
          onClick={() => router.push("/")}
          className="mt-2 bg-[#824c71]/8 hover:bg-[#824c71]/14 text-[#824c71] font-medium text-sm px-5 py-2.5 rounded-[10px] transition-colors"
        >
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
  const avgRatingNum = totalVotes > 0
    ? ratedReviews.reduce((acc, review) => acc + review.rating, 0) / totalVotes
    : 0;
  // عدد صحیح (۵، ۴، ۳...) بدون اعشار نشون داده می‌شه، غیرصحیح با یک رقم اعشار، و بدون رای اصلاً "0"
  const averageRating = totalVotes === 0
    ? "0"
    : Number.isInteger(avgRatingNum) ? String(avgRatingNum) : avgRatingNum.toFixed(1);

  const textReviews = localReviews.filter(review => review.comment && review.comment.trim() !== "");

  // امتیازی که خودِ همین کاربر قبلاً ثبت کرده (برای پر نگه‌داشتن ستاره‌ها بعد از رفرش)
  const myRating = userRating || (ratedReviews.find(r => r.name === loggedInUserName)?.rating ?? 0);

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

  // --- ثبت امتیاز ستاره‌ای — هر کاربر فقط یک بار می‌تواند امتیاز بدهد ---
  const handleRatingSubmit = async (star: number) => {
    if (hasAlreadyReviewed) return;
    setRatingError("");
    setUserRating(star);
    setIsSubmittingRating(true);

    try {
      const response = await fetch(`/api/salon/${salon.id}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: loggedInUserName,
          rating: star,
          comment: ""
        })
      });

      const result = await response.json();
      if (!response.ok) {
        if (response.status === 403) {
          setUserRating(0);
          return setRatingError(result.error);
        }
        throw new Error(result.error || "خطا در ثبت امتیاز");
      }

      setLocalReviews([result, ...localReviews]);
      setHasAlreadyReviewed(true);
      localStorage.setItem(`has_reviewed_${salon.id}_${loggedInUserName}`, "true");
    } catch (error: any) {
      setUserRating(0);
      setRatingError(error.message || "مشکلی پیش آمد. لطفاً دوباره تلاش کنید.");
    } finally {
      setIsSubmittingRating(false);
    }
  };

  // --- ثبت نظر متنی — بدون محدودیت تعداد، کاملاً مستقل از امتیاز ستاره‌ای ---
  const handleReviewSubmit = async () => {
    setReviewError(""); 
    setSuccessMessage("");

    if (!reviewText.trim()) return setReviewError("لطفاً متن نظر خود را بنویسید.");

    try {
        const response = await fetch(`/api/salon/${salon.id}/reviews`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            name: loggedInUserName,
            rating: 0, 
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
    } catch (error: any) {
        setReviewError(error.message || "مشکلی پیش آمد. لطفاً دوباره تلاش کنید.");
    }
  };

  // --- کلیک روی دکمه‌ی تماس: اگر بیش از یک شماره وجود دارد، مودال انتخاب شماره باز می‌شود ---
  const handleCallButtonClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (salon.phones && salon.phones.length > 1) {
      e.preventDefault();
      setShowPhoneModal(true);
    }
  };

  // --- کلیک روی دکمه‌ی نوبت‌دهی: اگر فعال باشه می‌ره به صفحه‌ی رزرو، وگرنه پاپ‌آپ هشدار باز می‌شه ---
  const handleBookingButtonClick = () => {
    if (salon.bookingEnabled) {
      router.push(`/salon/${salon.id}/book`);
    } else {
      setShowBookingAlert(true);
    }
  };

  const primaryPhone = salon.phones && salon.phones.length > 0 ? salon.phones[0] : null;

  const salonInfoCard = (
    <div>
      <div className="mb-4">
        <h1 className="text-2xl sm:text-[28px] font-bold text-zinc-900 leading-snug">{salon.name}</h1>

        {/* امتیازدهی ستاره‌ای — کاملاً مستقل از نظر متنی، هر کاربر فقط یک بار */}
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <div className="flex items-center">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                disabled={hasAlreadyReviewed || isSubmittingRating}
                onClick={() => handleRatingSubmit(star)}
                aria-label={`${star} ستاره`}
                className={`p-0.5 ${hasAlreadyReviewed ? 'cursor-default' : 'active:scale-90 transition-transform'}`}
              >
                <Star
                  className={`w-5 h-5 ${star <= myRating ? 'text-amber-400 fill-current' : 'text-zinc-300'}`}
                />
              </button>
            ))}
          </div>
          <span className="text-xs text-zinc-500">
            <span className="font-bold text-zinc-800">{toPersianDigits(averageRating)}</span>
            {' '}· {toPersianDigits(String(totalVotes))} رای
          </span>
        </div>

        {hasAlreadyReviewed ? (
          <p className="text-[11px] text-zinc-400 mt-1.5">امتیاز شما ثبت شده است.</p>
        ) : (
          <p className="text-[11px] text-zinc-400 mt-1.5">برای ثبت امتیاز روی ستاره‌ها بزنید.</p>
        )}
        {ratingError && <p className="text-red-600 text-[11px] font-medium mt-1.5">{ratingError}</p>}
      </div>

      {/* بج‌های خدمات در منزل / مخاطب سالن */}
      {(salon.hasHomeService || salon.genderAudience) && (
        <div className="flex flex-wrap items-center gap-2 mb-5">
          {salon.hasHomeService && (
            <span className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-medium text-[#824c71] bg-[#824c71]/8 px-3 py-1.5 rounded-full">
              <Home className="w-3.5 h-3.5" />
              خدمات در منزل
            </span>
          )}
          {salon.genderAudience && (
            <span className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-medium text-[#824c71] bg-[#824c71]/8 px-3 py-1.5 rounded-full">
              <Users className="w-3.5 h-3.5" />
              {GENDER_AUDIENCE_LABELS[salon.genderAudience] || salon.genderAudience}
            </span>
          )}
        </div>
      )}

      {isAdmin && (
        <button
          onClick={() => setShowDeleteModal(true)}
          className="w-full flex items-center justify-center gap-2 mb-5 py-2.5 rounded-[10px] border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          حذف این کسب‌وکار (ادمین)
        </button>
      )}

      <div className="space-y-3 sm:space-y-3.5 text-zinc-600 text-[13px] sm:text-sm mb-6">
        <div className="flex items-start">
          <MapPin className="w-4 h-4 sm:w-5 sm:h-5 ml-2 mt-0.5 text-[#824c71] flex-shrink-0" />
          <p className="leading-relaxed">{salon.address}</p>
        </div>
        
        <div className="flex items-start">
          <Phone className="w-4 h-4 sm:w-5 sm:h-5 ml-2 mt-0.5 text-zinc-400 flex-shrink-0" />
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {salon.phones?.map((phone: string, idx: number) => (
              <span key={idx} dir="ltr" className="font-medium text-zinc-800">{phone}</span>
            ))}
          </div>
        </div>

        {salon.workingHours && (
          <div className="flex items-center">
            <Clock className="w-4 h-4 sm:w-5 sm:h-5 ml-2 text-zinc-400 flex-shrink-0" />
            <p>{salon.workingHours}</p>
          </div>
        )}

        {salon.closedDays && salon.closedDays.length > 0 && (
          <div className="flex items-center text-red-500">
            <CalendarOff className="w-4 h-4 sm:w-5 sm:h-5 ml-2 flex-shrink-0" />
            <p className="font-medium text-xs sm:text-sm">تعطیل: {salon.closedDays.join('، ')}</p>
          </div>
        )}
      </div>

      <div 
        onClick={() => setShowRoutingModal(true)}
        className="relative w-full h-32 sm:h-44 bg-[#824c71]/5 rounded-2xl mb-6 overflow-hidden cursor-pointer group"
      >
        {salon.coordinates && salon.coordinates.length === 2 ? (
          <>
            <img 
              src={`https://static-maps.yandex.ru/1.x/?ll=${salon.coordinates[1]},${salon.coordinates[0]}&z=17&l=map&size=600,250&pt=${salon.coordinates[1]},${salon.coordinates[0]},pm2rdm&lang=fa_IR`} 
              alt={`موقعیت ${salon.name}`} 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5 bg-white/90 backdrop-blur-md px-2.5 py-1.5 rounded-[10px] text-[11px] font-medium text-[#824c71] shadow-sm">
              <Map className="w-3.5 h-3.5" />
              نمایش مسیر
            </div>
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-[#824c71]/30 gap-2">
            <Map size={28} />
            <span className="text-xs sm:text-sm text-zinc-400">نقشه ثبت نشده</span>
          </div>
        )}
      </div>

      {salon.socials && (
  <div className="flex justify-center flex-wrap gap-2.5 mb-2 px-2">

    {/* وب‌سایت */}
{salon.socials.website && (
  <a
    href={salon.socials.website.startsWith('http')
      ? salon.socials.website
      : `https://${salon.socials.website}`}
    target="_blank"
    rel="noopener noreferrer"
    className="flex items-center justify-center w-10 h-10 rounded-full bg-[#824c71]/8 hover:bg-[#824c71]/14 transition-all active:scale-90 touch-manipulation"
  >
    <img
      src="/web.png"
      alt="وب‌سایت"
      className="w-5 h-5 object-contain"
    />
  </a>
)}

{/* اینستاگرام */}
{salon.socials.instagram && (
  <a
    href={`https://instagram.com/${salon.socials.instagram.replace('@', '')}`}
    target="_blank"
    rel="noopener noreferrer"
    className="flex items-center justify-center w-10 h-10 rounded-full bg-[#824c71]/8 hover:bg-[#824c71]/14 transition-all active:scale-90 touch-manipulation"
  >
    <img
      src="/instagram.png"
      alt="اینستاگرام"
      className="w-5 h-5 object-contain"
    />
  </a>
)}

{/* واتساپ */}
{salon.socials.whatsapp && (
  <a
    href={`https://wa.me/${salon.socials.whatsapp}`}
    target="_blank"
    rel="noopener noreferrer"
    className="flex items-center justify-center w-10 h-10 rounded-full bg-[#824c71]/8 hover:bg-[#824c71]/14 transition-all active:scale-90 touch-manipulation"
  >
    <img
      src="/whatsapp.png"
      alt="واتساپ"
      className="w-5 h-5 object-contain"
    />
  </a>
)}

{/* تلگرام */}
{salon.socials.telegram && (
  <a
    href={`https://t.me/${salon.socials.telegram.replace('@', '')}`}
    target="_blank"
    rel="noopener noreferrer"
    className="flex items-center justify-center w-10 h-10 rounded-full bg-[#824c71]/8 hover:bg-[#824c71]/14 transition-all active:scale-90 touch-manipulation"
  >
    <img
      src="/telegram.png"
      alt="تلگرام"
      className="w-5 h-5 object-contain"
    />
  </a>
)}

{/* روبیکا */}
{salon.socials.rubika && (
  <a
    href={`https://rubika.ir/${salon.socials.rubika.replace('@', '')}`}
    target="_blank"
    rel="noopener noreferrer"
    className="flex items-center justify-center w-10 h-10 rounded-full bg-[#824c71]/8 hover:bg-[#824c71]/14 transition-all active:scale-90 touch-manipulation"
  >
    <img
      src="/rubika.png"
      alt="روبیکا"
      className="w-5 h-5 object-contain"
    />
  </a>
)}

{/* بله */}
{salon.socials.bale && (
  <a
    href={`https://ble.ir/${salon.socials.bale.replace('@', '')}`}
    target="_blank"
    rel="noopener noreferrer"
    className="flex items-center justify-center w-10 h-10 rounded-full bg-[#824c71]/8 hover:bg-[#824c71]/14 transition-all active:scale-90 touch-manipulation"
  >
    <img
      src="/Bale.png"
      alt="بله"
      className="w-5 h-5 object-contain"
    />
  </a>
)}

  </div>
)}

{/*دسکتاپ*/}
<div className="hidden lg:flex flex-row-reverse gap-2.5 mt-2">
  {/* هر دو حالت (فعال/غیرفعال) ظاهر یکسان دارن — کلیک روی حالت غیرفعال پاپ‌آپ هشدار رو باز می‌کنه */}
  <button
    onClick={handleBookingButtonClick}
    className="flex-1 bg-[#824c71] hover:bg-[#6e3f60] text-white font-bold py-3 rounded-[10px] text-center transition flex items-center justify-center gap-2 text-sm shadow-sm shadow-[#824c71]/20"
  >
    <CalendarClock className="w-4 h-4" />
    نوبت‌دهی آنلاین
  </button>
  {primaryPhone && (
    <a
      href={`tel:${primaryPhone}`}
      onClick={handleCallButtonClick}
      className="w-12 h-12 flex items-center justify-center rounded-[10px] bg-[#824c71]/10 text-[#824c71] hover:bg-[#824c71]/15 transition shrink-0"
    >
      <Phone className="w-5 h-5" />
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
              <img src={selectedImage} alt="بزرگنمایی" className="max-w-full max-h-[85vh] object-contain rounded-[10px]" onClick={(e) => e.stopPropagation()} />
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
              <button onClick={() => setShowRoutingModal(false)} className="p-1.5 text-zinc-400 bg-[#824c71]/5 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex flex-col gap-2.5">
              <a href={`https://neshan.org/maps/routing?dest_lat=${salon.coordinates[0]}&dest_lng=${salon.coordinates[1]}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-3.5 rounded-[10px] bg-[#824c71]/5 active:bg-[#824c71]/10">
                <span className="font-bold text-sm text-zinc-800">نشان (Neshan)</span>
                <img src="/neshan.png" alt="نشان" className="w-6 h-6 object-contain" />
              </a>
              <a href={`https://balad.ir/?lat=${salon.coordinates[0]}&lng=${salon.coordinates[1]}&title=${encodeURIComponent(salon.name)}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-3.5 rounded-[10px] bg-[#824c71]/5 active:bg-[#824c71]/10">
                <span className="font-bold text-sm text-zinc-800">بلد (Balad)</span>
                <img src="/balad.png" alt="بلد" className="w-6 h-6 object-contain" />
              </a>
              <a href={`https://www.google.com/maps/dir/?api=1&destination=${salon.coordinates[0]},${salon.coordinates[1]}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-3.5 rounded-[10px] bg-[#824c71]/5 active:bg-[#824c71]/10">
                <span className="font-bold text-sm text-zinc-800">گوگل مپ (Google Maps)</span>
                <img src="/google-maps.png" alt="گوگل مپ" className="w-6 h-6 object-contain" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* مودال انتخاب شماره تماس (وقتی سالن بیش از یک شماره دارد) */}
      {showPhoneModal && salon.phones && salon.phones.length > 1 && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4" onClick={() => setShowPhoneModal(false)}>
          <div className="bg-white w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl p-5 pb-8 sm:pb-5 animate-in slide-in-from-bottom-2" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-base font-bold text-zinc-900">با کدام شماره تماس بگیرم؟</h3>
              <button onClick={() => setShowPhoneModal(false)} className="p-1.5 text-zinc-400 bg-[#824c71]/5 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col gap-2.5">
              {salon.phones.map((phone: string, idx: number) => (
                <a
                  key={idx}
                  href={`tel:${phone}`}
                  onClick={() => setShowPhoneModal(false)}
                  className="flex items-center justify-between p-3.5 rounded-[10px] bg-[#824c71]/5 active:bg-[#824c71]/10"
                >
                  <span dir="ltr" className="font-bold text-sm text-zinc-800">{phone}</span>
                  <span className="w-8 h-8 rounded-full bg-[#824c71]/10 flex items-center justify-center">
                    <Phone className="w-4 h-4 text-[#824c71]" />
                  </span>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* مودال تأیید حذف (فقط ادمین) */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => !isDeleting && setShowDeleteModal(false)}>
          <div className="bg-white w-full max-w-sm rounded-2xl p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-bold text-zinc-900 mb-2">حذف کسب‌وکار</h3>
            <p className="text-sm text-zinc-600 mb-4 leading-relaxed">
              آیا مطمئنید می‌خواهید «{salon.name}» را برای همیشه حذف کنید؟ این عملیات غیرقابل بازگشت است.
            </p>

            {deleteError && (
              <p className="text-red-600 text-xs font-medium mb-3">{deleteError}</p>
            )}

            <div className="flex gap-2.5">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-[10px] bg-[#824c71]/8 text-zinc-700 text-sm font-medium disabled:opacity-50"
              >
                انصراف
              </button>
              <button
                onClick={handleDeleteSalon}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-[10px] bg-red-600 hover:bg-red-700 text-white text-sm font-medium disabled:opacity-50"
              >
                {isDeleting ? "در حال حذف..." : "بله، حذف شود"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* پاپ‌آپ هشدار — وقتی نوبت‌دهی آنلاین سالن غیرفعاله و کاربر روی دکمه‌ی نوبت‌دهی می‌زنه */}
      {showBookingAlert && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm px-5"
          onClick={() => setShowBookingAlert(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 bg-amber-50 rounded-[10px] flex items-center justify-center mb-4 mx-auto">
              <CalendarClock className="w-6 h-6 text-amber-500" />
            </div>
            <h3 className="text-base font-bold text-zinc-900 text-center mb-2">
              نوبت‌دهی آنلاین فعال نیست
            </h3>
            <p className="text-sm text-zinc-500 text-center leading-relaxed mb-5">
              این سالن هنوز سیستم نوبت‌دهی آنلاین را فعال نکرده است.
              برای رزرو وقت با سالن تماس بگیرید.
            </p>
            <button
              onClick={() => setShowBookingAlert(false)}
              className="w-full bg-[#824c71]/[0.07] hover:bg-[#824c71]/[0.12] text-[#824c71] rounded-[10px] py-3 text-sm font-semibold"
            >
              متوجه شدم
            </button>
          </div>
        </div>
      )}

      {/* مودال اشتراک‌گذاری (لینک + QR) */}
      <ShareSalonModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        url={shareUrl}
        salonName={salon?.name || ""}
      />

      {/* محتوای اصلی */}
      {/* پدینگ پایین (pb-28) برای جلوگیری از رفتن محتوا زیر دکمه شناور موبایل است */}
      <div className="max-w-5xl mx-auto pb-36 sm:pb-24 px-3 sm:px-6 mt-4 sm:mt-6">

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 sm:gap-10">
          
          <div className="lg:col-span-2">
            <div className="space-y-3 sm:space-y-4">
              {/* گالری اصلی: تصویر بزرگ با نوار شناور بازگشت/اشتراک‌گذاری/نشان + بج امتیاز روی خودِ عکس */}
              <div
                className="relative w-full h-72 sm:h-96 rounded-2xl overflow-hidden cursor-pointer bg-gradient-to-br from-[#fdf8fb] via-[#f7edf3] to-[#f3e6ee]"
                onClick={() => salon.imageUrl && setSelectedImage(salon.imageUrl)}
              >
                {salon.imageUrl ? (
                  <img src={salon.imageUrl} alt={salon.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[#824c71]/30 text-sm">بدون تصویر</div>
                )}

                {/* سایه‌ی ملایم بالای عکس برای خوانایی بهتر دکمه‌های شناور */}
                <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/35 to-transparent pointer-events-none" />

                {/* نوار شناور بالا: اشتراک‌گذاری و نشان کردن */}
                <div className="absolute top-4 inset-x-4 flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleShare}
                      aria-label="اشتراک‌گذاری صفحه سالن"
                      className="w-10 h-10 flex items-center justify-center rounded-full bg-white/90 backdrop-blur-md text-zinc-700 shadow-sm active:scale-90 transition-transform"
                    >
                      <Share2 className="w-4.5 h-4.5" />
                    </button>
                    <button
                      onClick={toggleBookmark}
                      aria-label="نشان کردن"
                      className="w-10 h-10 flex items-center justify-center rounded-full bg-white/90 backdrop-blur-md shadow-sm active:scale-90 transition-transform"
                    >
                      <svg viewBox="0 0 24 24" className={`w-5 h-5 ${isBookmarked ? "text-[#824c71]" : "text-zinc-600"}`} fill={isBookmarked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M6 4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v17.5l-6-4-6 4V4z" />
                      </svg>
                    </button>
                  </div>
                </div>

              </div>
              
              {salon.portfolios && salon.portfolios.length > 0 && (
                  <div className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar snap-x">
                  {salon.portfolios.map((imgUrl: string, index: number) => (
                      <div 
                      key={index} 
                      onClick={() => setSelectedImage(imgUrl)}
                      className="w-24 h-24 sm:w-32 sm:h-32 flex-shrink-0 bg-[#824c71]/5 rounded-[10px] overflow-hidden snap-start cursor-pointer shadow-sm"
                      >
                        <img src={imgUrl} alt={`نمونه کار ${index + 1}`} className="w-full h-full object-cover" />
                      </div>
                  ))}
                  </div>
              )}
            </div>

            <div className="block lg:hidden mt-6">
              {salonInfoCard}
            </div>

            <section className="mt-6">
              <h2 className="text-lg sm:text-xl font-bold text-zinc-900 mb-3">درباره سالن</h2>
              <p className="text-zinc-600 text-[13px] sm:text-sm leading-relaxed text-justify">
                {salon.description || "توضیحاتی ثبت نشده است."}
              </p>
            </section>

            <section className="mt-8">
              <h2 className="text-lg sm:text-xl font-bold text-zinc-900 mb-4">خدمات ما</h2>
              <div className="space-y-2">
                {Object.keys(groupedServices).length > 0 ? (
                  Object.entries(groupedServices).map(([category, services]) => {
                    const isExpanded = expandedCategories.includes(category);
                    return (
                      <div key={category} className="rounded-[10px] bg-white shadow-[0_1px_8px_rgba(0,0,0,0.05)] overflow-hidden">
                        <button type="button" onClick={() => toggleCategory(category)} className="w-full flex items-center justify-between px-4 py-3.5 text-right">
                          <div className="flex items-baseline gap-2">
                            <span className="font-bold text-zinc-800 text-[13px] sm:text-sm">{category}</span>
                            <span className="text-[11px] sm:text-xs text-zinc-400">
                              {toPersianDigits(String(services.length))} خدمت
                            </span>
                          </div>
                          {isExpanded ? <ChevronUp size={18} className="text-[#824c71]" /> : <ChevronDown size={18} className="text-zinc-400" />}
                        </button>
                        {isExpanded && (
                          <div className="px-4 pb-4 flex flex-wrap gap-x-5 gap-y-2.5">
                            {services.map((service, index) => (
                              <div key={index} className="flex items-center"> 
                                <CheckCircle2 className="w-3.5 h-3.5 text-[#824c71] ml-1.5 flex-shrink-0" />
                                <span className="text-zinc-700 text-xs sm:text-[13px]">{service}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <p className="text-zinc-500 text-xs py-2">خدماتی ثبت نشده است.</p>
                )}
              </div>
            </section>

            <section className="mt-8">
              <h2 className="text-lg sm:text-xl font-bold text-zinc-900 mb-4">
                نظرات
                <span className="text-xs font-medium text-zinc-400 mr-2">
                  {toPersianDigits(String(textReviews.length))} نظر
                </span>
              </h2>

              <div className="mb-6">
                  <h3 className="font-medium text-sm text-zinc-800 mb-3">ثبت نظر</h3>

                  {successMessage && (
                      <div className="mb-3 flex items-center gap-2 text-[#824c71]">
                          <CheckCircle2 className="w-4 h-4" />
                          <span className="text-xs font-medium">{successMessage}</span>
                      </div>
                  )}

                  <textarea 
                      value={reviewText} onChange={(e) => setReviewText(e.target.value)}
                      className="w-full bg-white border border-zinc-300 rounded-[10px] p-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#824c71]/40 focus:border-[#824c71]/40 mb-3 resize-none"
                      rows={3} placeholder="تجربه خود را بنویسید..."
                  ></textarea>
                  
                  {reviewError && <p className="text-red-600 text-xs font-medium mb-3">{reviewError}</p>}

                  <button
                    onClick={handleReviewSubmit}
                    className="bg-[#824c71] hover:bg-[#6e3f60] text-white font-medium px-5 py-2.5 rounded-md text-xs sm:text-sm transition-colors"
                  >
                    ثبت نظر
                  </button>
              </div>

              <div className="space-y-3">
                {textReviews.length > 0 ? (
                  textReviews.map((review) => (
                    <div key={review.id} className="p-4 rounded-[10px] bg-[#824c71]/[0.06]">
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
{/*موبایل*/}
<div className="fixed bottom-8 left-5 right-5 z-[60] lg:hidden flex gap-2.5 items-center">
  {/* هر دو حالت (فعال/غیرفعال) ظاهر یکسان دارن — کلیک روی حالت غیرفعال پاپ‌آپ هشدار رو باز می‌کنه */}
  <button
    onClick={handleBookingButtonClick}
    className="flex-1 bg-[#824c71] hover:bg-[#824c71]/90 text-white font-bold py-4 rounded-[10px] text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#824c71]/20 active:scale-95 transition-transform"
  >
    <CalendarClock className="w-4 h-4" />
    نوبت‌دهی آنلاین
  </button>
  {primaryPhone && (
    <a
      href={`tel:${primaryPhone}`}
      onClick={handleCallButtonClick}
      className="w-14 h-14 flex items-center justify-center rounded-[10px] bg-[#824c71] hover:bg-[#824c71]/90 text-white shadow-lg shadow-[#824c71]/20 active:scale-95 transition-transform shrink-0"
    >
      <Phone className="w-5 h-5" />
    </a>
  )}
</div>

    </>
  );
}