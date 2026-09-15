// app/(dashboard)/salon/[id]/page.tsx

"use client";
import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { CATEGORY_MAPPING } from "@/lib/data";
import {
  Star, MapPin, Clock, Phone,
  CheckCircle2, CalendarOff, X, CalendarClock, ChevronDown, ChevronUp, Map, Trash2,
  Home, Users, Share2, MessageSquare, Loader2, ArrowRight
} from "lucide-react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import ShareSalonModal from "@/components/salon/ShareSalonModal";

const GENDER_AUDIENCE_LABELS: Record<string, string> = {
  FEMALE: 'مخصوص خانم‌ها',
  MALE: 'مخصوص آقایون',
  BOTH: 'خانم‌ها و آقایون',
};

const toPersianDigits = (str: string) => str.replace(/[0-9]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);

// استایل کارت — همون استایل کارت‌های صفحه‌ی «نوبت‌های من»: بدون بوردر، فقط سایه‌ی نرم
const CARD = "bg-white rounded-xl p-5 shadow-[0_2px_14px_rgba(0,0,0,0.09)]";

export default function SalonDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();

  const [salon, setSalon] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [userRating, setUserRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [reviewError, setReviewError] = useState("");
  const [ratingError, setRatingError] = useState("");
  const [ratingSaved, setRatingSaved] = useState(false);
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
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [showBookingAlert, setShowBookingAlert] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev =>
      prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]
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
      const response = await fetch(`/api/salon?id=${salon.id}`, { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'خطا در حذف کسب‌وکار');
      router.push('/');
    } catch (error: any) {
      setDeleteError(error.message || 'مشکلی پیش آمد. لطفاً دوباره تلاش کنید.');
      setIsDeleting(false);
    }
  };

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
        <div className="w-10 h-10 border-4 border-[#824c71]/15 border-t-[#824c71] rounded-full animate-spin" />
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
          className="mt-2 bg-[#824c71] hover:bg-[#6e3f60] text-white font-medium text-sm px-5 py-2.5 rounded-[10px] transition-colors"
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
  const averageRating = totalVotes === 0
    ? "0"
    : Number.isInteger(avgRatingNum) ? String(avgRatingNum) : avgRatingNum.toFixed(1);

  const textReviews = localReviews.filter(review => review.comment && review.comment.trim() !== "");

  // امتیاز فعلیِ خودِ کاربر (اگر قبلاً ثبت کرده باشد) — قابل تغییر است
  const savedMyRating = ratedReviews.find(r => r.name === loggedInUserName)?.rating ?? 0;
  const myRating = userRating || savedMyRating;

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

  // --- ثبت یا تغییر امتیاز ستاره‌ای — مستقل از نظر متنی ---
  const handleRatingSubmit = async (star: number) => {
    if (isSubmittingRating || star === myRating) return;
    setRatingError("");
    setRatingSaved(false);
    setUserRating(star);
    setIsSubmittingRating(true);
    try {
      const response = await fetch(`/api/salon/${salon.id}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: loggedInUserName, rating: star, comment: "" })
      });
      const result = await response.json();
      if (!response.ok) {
        setUserRating(0);
        if (response.status === 403) return setRatingError(result.error);
        throw new Error(result.error || "خطا در ثبت امتیاز");
      }
      // امتیاز قبلیِ همین کاربر را جایگزین می‌کنیم تا میانگین درست بماند
      setLocalReviews([result, ...localReviews.filter(r => !(r.rating > 0 && r.name === loggedInUserName))]);
      setRatingSaved(true);
    } catch (error: any) {
      setUserRating(0);
      setRatingError(error.message || "مشکلی پیش آمد. لطفاً دوباره تلاش کنید.");
    } finally {
      setIsSubmittingRating(false);
    }
  };

  // --- ثبت نظر متنی — بدون محدودیت تعداد ---
  const handleReviewSubmit = async () => {
    setReviewError("");
    setSuccessMessage("");
    if (!reviewText.trim()) return setReviewError("لطفاً متن نظر خود را بنویسید.");
    try {
      const response = await fetch(`/api/salon/${salon.id}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: loggedInUserName, rating: 0, comment: reviewText.trim() })
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

  const handleCallButtonClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (salon.phones && salon.phones.length > 1) {
      e.preventDefault();
      setShowPhoneModal(true);
    }
  };

  const handleBookingButtonClick = () => {
    if (salon.bookingEnabled) {
      router.push(`/salon/${salon.id}/book`);
    } else {
      setShowBookingAlert(true);
    }
  };

  const primaryPhone = salon.phones && salon.phones.length > 0 ? salon.phones[0] : null;

  const socialLinks: { key: string; href: string; img: string; alt: string }[] = [];
  if (salon.socials) {
    const s = salon.socials;
    if (s.website) socialLinks.push({ key: 'website', href: s.website.startsWith('http') ? s.website : `https://${s.website}`, img: '/web.png', alt: 'وب‌سایت' });
    if (s.instagram) socialLinks.push({ key: 'instagram', href: `https://instagram.com/${s.instagram.replace('@', '')}`, img: '/instagram.png', alt: 'اینستاگرام' });
    if (s.whatsapp) socialLinks.push({ key: 'whatsapp', href: `https://wa.me/${s.whatsapp}`, img: '/whatsapp.png', alt: 'واتساپ' });
    if (s.telegram) socialLinks.push({ key: 'telegram', href: `https://t.me/${s.telegram.replace('@', '')}`, img: '/telegram.png', alt: 'تلگرام' });
    if (s.rubika) socialLinks.push({ key: 'rubika', href: `https://rubika.ir/${s.rubika.replace('@', '')}`, img: '/rubika.png', alt: 'روبیکا' });
    if (s.bale) socialLinks.push({ key: 'bale', href: `https://ble.ir/${s.bale.replace('@', '')}`, img: '/Bale.png', alt: 'بله' });
  }

  // ── کارت اطلاعات سالن ──
  const salonInfoCard = (
    <div className={CARD}>
      <h1 className="text-[22px] sm:text-2xl font-bold text-zinc-900 leading-snug">{salon.name}</h1>

      {(salon.hasHomeService || salon.genderAudience) && (
        <div className="flex flex-wrap items-center gap-2 mt-3.5">
          {salon.hasHomeService && (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#824c71] bg-[#824c71]/8 px-2.5 py-1.5 rounded-lg">
              <Home className="w-3.5 h-3.5" />
              خدمات در منزل
            </span>
          )}
          {salon.genderAudience && (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#824c71] bg-[#824c71]/8 px-2.5 py-1.5 rounded-lg">
              <Users className="w-3.5 h-3.5" />
              {GENDER_AUDIENCE_LABELS[salon.genderAudience] || salon.genderAudience}
            </span>
          )}
        </div>
      )}

      {/* اطلاعات تماس */}
      <div className="space-y-3 text-zinc-600 text-[13px] mt-4">
        <div className="flex items-start gap-2">
          <MapPin className="w-4 h-4 mt-0.5 text-[#824c71] shrink-0" />
          <p className="leading-relaxed">{salon.address}</p>
        </div>

        {salon.phones?.length > 0 && (
          <div className="flex items-start gap-2">
            <Phone className="w-4 h-4 mt-0.5 text-[#824c71] shrink-0" />
            <p className="leading-relaxed">
              {salon.phones.map((p: string) => toPersianDigits(p)).join(' - ')}
            </p>
          </div>
        )}

        {salon.workingHours && (
          <div className="flex items-start gap-2">
            <Clock className="w-4 h-4 mt-0.5 text-[#824c71] shrink-0" />
            <p>{salon.workingHours}</p>
          </div>
        )}

        {salon.closedDays?.length > 0 && (
          <div className="flex items-start gap-2 text-red-500">
            <CalendarOff className="w-4 h-4 mt-0.5 shrink-0" />
            <p className="font-medium">تعطیل: {salon.closedDays.join('، ')}</p>
          </div>
        )}
      </div>

      {/* نقشه */}
      <div
        onClick={() => setShowRoutingModal(true)}
        className="relative w-full h-36 bg-zinc-50 rounded-lg mt-4 overflow-hidden cursor-pointer group"
      >
        {salon.coordinates && salon.coordinates.length === 2 ? (
          <>
            <img
              src={`https://static-maps.yandex.ru/1.x/?ll=${salon.coordinates[1]},${salon.coordinates[0]}&z=17&l=map&size=600,250&pt=${salon.coordinates[1]},${salon.coordinates[0]},pm2rdm&lang=fa_IR`}
              alt={`موقعیت ${salon.name}`}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-[#824c71] shadow-sm">
              <Map className="w-3.5 h-3.5" />
              نمایش مسیر
            </div>
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-zinc-300 gap-2">
            <Map size={26} />
            <span className="text-xs text-zinc-400">نقشه ثبت نشده</span>
          </div>
        )}
      </div>

      {/* شبکه‌های اجتماعی */}
      {socialLinks.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2.5 mt-4">
          {socialLinks.map((s) => (
            <a
              key={s.key}
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center w-10 h-10 rounded-full bg-[#824c71]/8 hover:bg-[#824c71]/14 transition-all active:scale-90"
            >
              <img src={s.img} alt={s.alt} className="w-5 h-5 object-contain" />
            </a>
          ))}
        </div>
      )}

      {/* دکمه‌های اصلی — فقط دسکتاپ */}
      <div className="hidden lg:flex flex-row-reverse gap-2.5 mt-4">
        <button
          onClick={handleBookingButtonClick}
          className="flex-1 bg-[#824c71] hover:bg-[#6e3f60] text-white font-bold py-3 rounded-[10px] transition flex items-center justify-center gap-2 text-sm"
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

      {isAdmin && (
        <button
          onClick={() => setShowDeleteModal(true)}
          className="w-full flex items-center justify-center gap-2 mt-4 py-2.5 rounded-[10px] bg-red-50 text-red-600 text-xs font-bold hover:bg-red-100 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          حذف این کسب‌وکار (ادمین)
        </button>
      )}
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
              <TransformWrapper initialScale={1} minScale={1} maxScale={4} centerOnInit wheel={{ disabled: true }}>
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
          <div className="bg-white w-full sm:max-w-sm rounded-t-2xl sm:rounded-xl p-5 pb-8 sm:pb-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-base font-bold text-zinc-900">مسیریابی با...</h3>
              <button onClick={() => setShowRoutingModal(false)} className="p-1.5 text-zinc-400 hover:bg-zinc-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col gap-2">
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

      {/* مودال انتخاب شماره تماس */}
      {showPhoneModal && salon.phones && salon.phones.length > 1 && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4" onClick={() => setShowPhoneModal(false)}>
          <div className="bg-white w-full sm:max-w-sm rounded-t-2xl sm:rounded-xl p-5 pb-8 sm:pb-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-base font-bold text-zinc-900">با کدام شماره تماس بگیرم؟</h3>
              <button onClick={() => setShowPhoneModal(false)} className="p-1.5 text-zinc-400 hover:bg-zinc-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col gap-2">
              {salon.phones.map((phone: string, idx: number) => (
                <a
                  key={idx}
                  href={`tel:${phone}`}
                  onClick={() => setShowPhoneModal(false)}
                  className="flex items-center justify-between p-3.5 rounded-[10px] bg-[#824c71]/5 active:bg-[#824c71]/10"
                >
                  <span className="font-bold text-sm text-zinc-800">{toPersianDigits(phone)}</span>
                  <span className="w-8 h-8 rounded-full bg-[#824c71]/10 flex items-center justify-center">
                    <Phone className="w-4 h-4 text-[#824c71]" />
                  </span>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* مودال تأیید حذف (ادمین) */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => !isDeleting && setShowDeleteModal(false)}>
          <div className="bg-white w-full max-w-sm rounded-xl p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-bold text-zinc-900 mb-2">حذف کسب‌وکار</h3>
            <p className="text-sm text-zinc-600 mb-4 leading-relaxed">
              آیا مطمئنید می‌خواهید «{salon.name}» را برای همیشه حذف کنید؟ این عملیات غیرقابل بازگشت است.
            </p>
            {deleteError && <p className="text-red-600 text-xs font-medium mb-3">{deleteError}</p>}
            <div className="flex gap-2.5">
              <button onClick={() => setShowDeleteModal(false)} disabled={isDeleting} className="flex-1 py-2.5 rounded-[10px] bg-zinc-100 text-zinc-700 text-sm font-medium disabled:opacity-50">
                انصراف
              </button>
              <button onClick={handleDeleteSalon} disabled={isDeleting} className="flex-1 py-2.5 rounded-[10px] bg-red-600 hover:bg-red-700 text-white text-sm font-medium disabled:opacity-50">
                {isDeleting ? "در حال حذف..." : "بله، حذف شود"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* پاپ‌آپ هشدار نوبت‌دهی غیرفعال */}
      {showBookingAlert && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm px-5" onClick={() => setShowBookingAlert(false)}>
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center mb-4 mx-auto">
              <CalendarClock className="w-6 h-6 text-amber-500" />
            </div>
            <h3 className="text-base font-bold text-zinc-900 text-center mb-2">نوبت‌دهی آنلاین فعال نیست</h3>
            <p className="text-sm text-zinc-500 text-center leading-relaxed mb-5">
              این سالن هنوز سیستم نوبت‌دهی آنلاین را فعال نکرده است. برای رزرو وقت با سالن تماس بگیرید.
            </p>
            <button onClick={() => setShowBookingAlert(false)} className="w-full bg-[#824c71] hover:bg-[#6e3f60] text-white rounded-[10px] py-3 text-sm font-bold">
              متوجه شدم
            </button>
          </div>
        </div>
      )}

      <ShareSalonModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        url={shareUrl}
        salonName={salon?.name || ""}
      />

      {/* ── محتوای اصلی ── */}
      <div className="max-w-5xl mx-auto pb-36 sm:pb-24 px-3 sm:px-6 mt-4 sm:mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          <div className="lg:col-span-2 flex flex-col gap-5">

            {/* کاور اصلی + نمونه کارها بلافاصله زیرش */}
            <div className="flex flex-col gap-3">
              <div
                className="relative w-full h-64 sm:h-80 rounded-xl overflow-hidden cursor-pointer bg-zinc-100"
                onClick={() => salon.imageUrl && setSelectedImage(salon.imageUrl)}
              >
                {salon.imageUrl ? (
                  <img src={salon.imageUrl} alt={salon.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-300 text-sm">بدون تصویر</div>
                )}

                <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/30 to-transparent pointer-events-none" />

                <div className="absolute top-3 inset-x-3 flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => router.push('/dashboard')}
                    aria-label="بازگشت به پیشخوان"
                    className="w-10 h-10 flex items-center justify-center rounded-full bg-white/95 backdrop-blur-md text-zinc-700 shadow-sm active:scale-90 transition-transform"
                  >
                    <ArrowRight className="w-4.5 h-4.5" />
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleShare}
                      aria-label="اشتراک‌گذاری صفحه سالن"
                      className="w-10 h-10 flex items-center justify-center rounded-full bg-white/95 backdrop-blur-md text-zinc-700 shadow-sm active:scale-90 transition-transform"
                    >
                      <Share2 className="w-4.5 h-4.5" />
                    </button>
                    <button
                      onClick={toggleBookmark}
                      aria-label="نشان کردن"
                      className="w-10 h-10 flex items-center justify-center rounded-full bg-white/95 backdrop-blur-md shadow-sm active:scale-90 transition-transform"
                    >
                      <svg viewBox="0 0 24 24" className={`w-5 h-5 ${isBookmarked ? "text-[#824c71]" : "text-zinc-600"}`} fill={isBookmarked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M6 4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v17.5l-6-4-6 4V4z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              {salon.portfolios?.length > 0 && (
                <div className="flex gap-2.5 overflow-x-auto pb-1 hide-scrollbar snap-x">
                  {salon.portfolios.map((imgUrl: string, index: number) => (
                    <div
                      key={index}
                      onClick={() => setSelectedImage(imgUrl)}
                      className="w-24 h-24 sm:w-28 sm:h-28 shrink-0 rounded-lg overflow-hidden snap-start cursor-pointer bg-zinc-100"
                    >
                      <img src={imgUrl} alt={`نمونه کار ${index + 1}`} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* کارت اطلاعات — موبایل */}
            <div className="block lg:hidden">{salonInfoCard}</div>

            {/* درباره سالن */}
            <div className={CARD}>
              <h2 className="text-base font-bold text-zinc-900 mb-3">درباره سالن</h2>
              <p className="text-zinc-600 text-[13px] leading-relaxed text-justify">
                {salon.description || "توضیحاتی ثبت نشده است."}
              </p>
            </div>

            {/* خدمات ما */}
            <div className={CARD}>
              <h2 className="text-base font-bold text-zinc-900 mb-4">خدمات ما</h2>
              <div className="space-y-2">
                {Object.keys(groupedServices).length > 0 ? (
                  Object.entries(groupedServices).map(([category, services]) => {
                    const isExpanded = expandedCategories.includes(category);
                    return (
                      <div key={category} className="rounded-lg bg-[#824c71]/[0.05] overflow-hidden">
                        <button
                          type="button"
                          onClick={() => toggleCategory(category)}
                          className="w-full flex items-center justify-between px-3.5 py-3 text-right"
                        >
                          <div className="flex items-baseline gap-2">
                            <span className="font-bold text-zinc-800 text-[13px]">{category}</span>
                            <span className="text-[11px] text-zinc-400">
                              {toPersianDigits(String(services.length))} خدمت
                            </span>
                          </div>
                          {isExpanded
                            ? <ChevronUp size={17} className="text-[#824c71]" />
                            : <ChevronDown size={17} className="text-zinc-400" />}
                        </button>
                        {isExpanded && (
                          <div className="px-3.5 pb-3.5 flex flex-wrap gap-x-4 gap-y-2.5">
                            {services.map((service, index) => (
                              <div key={index} className="flex items-center">
                                <CheckCircle2 className="w-3.5 h-3.5 text-[#824c71] ml-1.5 shrink-0" />
                                <span className="text-zinc-700 text-xs">{service}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <p className="text-zinc-400 text-xs py-2">خدماتی ثبت نشده است.</p>
                )}
              </div>
            </div>

            {/* ── کارت امتیاز ── */}
            <div className={CARD}>
              <h2 className="text-base font-bold text-zinc-900 mb-4">امتیاز سالن</h2>

              <div className="flex items-center gap-5">
                {/* میانگین */}
                <div className="flex flex-col items-center text-center shrink-0">
                  <span className="text-4xl font-bold text-zinc-900 leading-none">
                    {toPersianDigits(averageRating)}
                  </span>
                  <div className="flex items-center gap-0.5 mt-2">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star
                        key={i}
                        className={`w-3 h-3 ${i <= Math.round(avgRatingNum) ? 'text-amber-400 fill-current' : 'text-zinc-200 fill-current'}`}
                      />
                    ))}
                  </div>
                  <span className="text-[11px] text-zinc-400 mt-1.5">
                    {toPersianDigits(String(totalVotes))} رای
                  </span>
                </div>

                {/* امتیازدهی کاربر — قابل تغییر */}
                <div className="flex-1 min-w-0 bg-[#824c71]/[0.05] rounded-lg p-3.5">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-[13px] font-bold text-zinc-800">
                      {savedMyRating ? 'امتیاز شما' : 'امتیاز بدهید'}
                    </p>
                    {isSubmittingRating && <Loader2 className="w-3.5 h-3.5 text-[#824c71] animate-spin" />}
                    {ratingSaved && !isSubmittingRating && (
                      <span className="text-[11px] font-medium text-emerald-600">ثبت شد</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1" onMouseLeave={() => setHoverRating(0)}>
                    {[1, 2, 3, 4, 5].map((star) => {
                      const active = star <= (hoverRating || myRating);
                      return (
                        <button
                          key={star}
                          type="button"
                          disabled={isSubmittingRating}
                          onMouseEnter={() => setHoverRating(star)}
                          onClick={() => handleRatingSubmit(star)}
                          aria-label={`${star} ستاره`}
                          className="active:scale-90 transition-transform disabled:opacity-60"
                        >
                          <Star className={`w-7 h-7 ${active ? 'text-amber-400 fill-current' : 'text-zinc-200 fill-current'}`} />
                        </button>
                      );
                    })}
                  </div>

                  <p className="text-[11px] text-zinc-400 mt-2">
                    {savedMyRating ? 'برای تغییر، روی ستاره‌ی دلخواه بزنید.' : 'روی ستاره‌ها بزنید.'}
                  </p>
                  {ratingError && <p className="text-red-600 text-[11px] font-medium mt-1.5">{ratingError}</p>}
                </div>
              </div>
            </div>

            {/* ── کارت نظرات ── */}
            <div className={CARD}>
              <h2 className="text-base font-bold text-zinc-900 mb-4">
                نظرات
                <span className="text-xs font-medium text-zinc-400 mr-2">
                  {toPersianDigits(String(textReviews.length))} نظر
                </span>
              </h2>

              {successMessage && (
                <div className="mb-3 flex items-center gap-2 bg-emerald-50 text-emerald-700 rounded-lg px-3 py-2.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span className="text-xs font-medium">{successMessage}</span>
                </div>
              )}

              <textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                className="w-full bg-white border border-zinc-200 rounded-lg p-3 text-sm focus:outline-none focus:border-[#824c71]/50 transition resize-none placeholder:text-zinc-400"
                rows={3}
                placeholder="تجربه خود را بنویسید..."
              />

              {reviewError && <p className="text-red-600 text-xs font-medium mt-2">{reviewError}</p>}

              <button
                onClick={handleReviewSubmit}
                className="mt-3 bg-[#824c71] hover:bg-[#6e3f60] text-white font-bold px-5 py-2.5 rounded-[10px] text-xs transition-colors"
              >
                ثبت نظر
              </button>

              {/* لیست نظرات */}
              <div className="mt-5 space-y-2.5">
                {textReviews.length > 0 ? (
                  textReviews.map((review) => (
                    <div key={review.id} className="p-3.5 rounded-lg bg-[#824c71]/[0.05]">
                      <div className="flex justify-between items-center gap-2 mb-1.5">
                        <span className="font-bold text-zinc-800 text-[13px]">{review.name}</span>
                        {review.rating > 0 && (
                          <div className="flex items-center gap-0.5 shrink-0">
                            {[1, 2, 3, 4, 5].map((i) => (
                              <Star key={i} className={`w-3 h-3 ${i <= review.rating ? 'text-amber-400 fill-current' : 'text-zinc-200 fill-current'}`} />
                            ))}
                          </div>
                        )}
                      </div>
                      <p className="text-zinc-600 text-[13px] leading-relaxed text-justify">{review.comment}</p>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 gap-2">
                    <MessageSquare className="w-7 h-7 text-zinc-200" />
                    <p className="text-zinc-400 text-xs">هنوز نظری ثبت نشده است.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ستون کناری — دسکتاپ */}
          <div className="hidden lg:block lg:col-span-1 h-fit sticky top-6">
            {salonInfoCard}
          </div>

        </div>
      </div>

      {/* نوار شناور پایین — موبایل */}
      <div className="fixed bottom-6 left-4 right-4 z-[60] lg:hidden flex gap-2.5 items-center">
        <button
          onClick={handleBookingButtonClick}
          className="flex-1 bg-[#824c71] hover:bg-[#6e3f60] text-white font-bold py-4 rounded-[10px] text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#824c71]/25 active:scale-95 transition-transform"
        >
          <CalendarClock className="w-4 h-4" />
          نوبت‌دهی آنلاین
        </button>
        {primaryPhone && (
          <a
            href={`tel:${primaryPhone}`}
            onClick={handleCallButtonClick}
            className="w-14 h-14 flex items-center justify-center rounded-[10px] bg-[#824c71] hover:bg-[#6e3f60] text-white shadow-lg shadow-[#824c71]/25 active:scale-95 transition-transform shrink-0"
          >
            <Phone className="w-5 h-5" />
          </a>
        )}
      </div>
    </>
  );
}