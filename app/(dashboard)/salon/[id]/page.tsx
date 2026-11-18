// app/(dashboard)/salon/[id]/page.tsx

"use client";
import { useEffect, useState, use, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { CATEGORY_MAPPING } from "@/lib/data";
import {
  Star, Phone, ChevronDown, ChevronRight, Navigation, Trash2,
  Share2, Loader2, X, Check, Bookmark,
} from "lucide-react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import ShareSalonModal from "@/components/salon/ShareSalonModal";

const GENDER_AUDIENCE_LABELS: Record<string, string> = {
  FEMALE: 'مخصوص خانم‌ها',
  MALE: 'مخصوص آقایون',
  BOTH: 'خانم‌ها و آقایون',
};

const toPersianDigits = (str: string) => str.replace(/[0-9]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);

const ICON = { strokeWidth: 1.75 } as const;

// ─── اجزای مشترک ────────────────────────────────────────────────────────────

// هر بخش با یک خط نازک از بخش قبلی جدا می‌شود
function Section({ title, count, children }: { title?: string; count?: string; children: ReactNode }) {
  return (
    <section className="px-4 py-5 border-t border-zinc-100">
      {title && (
        <div className="flex items-baseline gap-2 mb-3.5">
          <h2 className="text-[15px] font-bold text-zinc-900">{title}</h2>
          {count && <span className="text-[11px] text-zinc-400">{count}</span>}
        </div>
      )}
      {children}
    </section>
  );
}

// عنوان کوچک در ردیف اول، مقدار در ردیف دوم
function InfoRow({ label, tone, children }: { label: string; tone?: "red"; children: ReactNode }) {
  return (
    <div className="py-3 first:pt-0 last:pb-0">
      <p className="text-[11px] text-zinc-400 leading-5">{label}</p>
      <div className={`text-[13px] leading-6 ${tone === "red" ? "text-red-500 font-bold" : "text-zinc-800"}`}>
        {children}
      </div>
    </div>
  );
}

function Stars({ value, size = "w-3 h-3" }: { value: number; size?: string }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={`${size} fill-current ${i <= value ? "text-amber-400" : "text-zinc-200"}`} strokeWidth={0} />
      ))}
    </div>
  );
}

function Modal({
  children,
  onClose,
  center,
  z = "z-[100]",
}: {
  children: ReactNode;
  onClose: () => void;
  center?: boolean;
  z?: string;
}) {
  return (
    <div
      className={`fixed inset-0 ${z} flex ${center ? "items-center" : "items-end sm:items-center"} justify-center bg-black/50 backdrop-blur-sm ${center ? "p-4" : "sm:p-4"}`}
      onClick={onClose}
    >
      <div
        className={`bg-white w-full sm:max-w-sm ${center ? "rounded-2xl" : "rounded-t-3xl sm:rounded-2xl"} p-4 ${center ? "" : "pb-8 sm:pb-4"}`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

function ModalHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="flex justify-between items-center mb-4">
      <h3 className="text-base font-bold text-zinc-900">{title}</h3>
      <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-zinc-100 text-zinc-500 hover:bg-zinc-200 transition-colors">
        <X className="w-4 h-4" {...ICON} />
      </button>
    </div>
  );
}

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
      <div className="flex flex-col items-center justify-center h-[60vh] px-2 text-center gap-4">
        <h2 className="text-xl sm:text-2xl font-bold text-zinc-800">سالن پیدا نشد!</h2>
        <p className="text-sm text-zinc-500 max-w-xs">این سالن حذف شده یا لینکش اشتباهه.</p>
        <button
          onClick={() => router.push("/")}
          className="mt-2 bg-[#824c71] hover:bg-[#6e3f60] text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-colors"
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

  // دکمه‌ها: نوبت‌دهی (بنفش، بدون آیکن) و تماس (سبز)
  const bookingBtnCls =
    "bg-[#824c71] hover:bg-[#6e3f60] text-white font-bold rounded-xl text-sm transition-colors active:scale-[0.98]";
  const callBtnCls =
    "bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition-colors active:scale-[0.98] flex items-center justify-center gap-2";

  const starCounts = [5, 4, 3, 2, 1].map((s) => ({
    star: s,
    count: ratedReviews.filter((r) => r.rating === s).length,
  }));

  // ── بخش اطلاعات تماس (موبایل: داخل صفحه، دسکتاپ: ستون کناری) ──
  const infoSection = (
    <>
      <Section title="اطلاعات سالن">
        <div className="divide-y divide-zinc-100">
          <InfoRow label="آدرس">
            <p>{salon.address}</p>
          </InfoRow>

          {salon.phones?.length > 0 && (
            <InfoRow label="شماره تماس">
              <div className="flex flex-col">
                {salon.phones.map((p: string, i: number) => (
                  <a key={i} href={`tel:${p}`} className="w-fit hover:text-[#824c71] transition-colors">
                    {toPersianDigits(p)}
                  </a>
                ))}
              </div>
            </InfoRow>
          )}

          {salon.workingHours && (
            <InfoRow label="ساعت کاری">
              <p>{salon.workingHours}</p>
            </InfoRow>
          )}

          {salon.closedDays?.length > 0 && (
            <InfoRow label="روزهای تعطیل" tone="red">
              <p>{salon.closedDays.join('، ')}</p>
            </InfoRow>
          )}
        </div>
      </Section>

      <Section>
        {/* نقشه */}
        <div
          onClick={() => setShowRoutingModal(true)}
          className="relative w-full h-40 bg-zinc-100 rounded-xl overflow-hidden cursor-pointer group"
        >
          {salon.coordinates && salon.coordinates.length === 2 ? (
            <>
              <img
                src={`https://static-maps.yandex.ru/1.x/?ll=${salon.coordinates[1]},${salon.coordinates[0]}&z=17&l=map&size=600,250&pt=${salon.coordinates[1]},${salon.coordinates[0]},pm2rdm&lang=fa_IR`}
                alt={`موقعیت ${salon.name}`}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5 bg-[#824c71] text-white px-3.5 py-2 rounded-full text-[11px] font-bold">
                <Navigation className="w-3.5 h-3.5" {...ICON} />
                مسیریابی
              </div>
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-xs text-zinc-400">نقشه ثبت نشده</span>
            </div>
          )}
        </div>

        {/* شبکه‌های اجتماعی */}
        {socialLinks.length > 0 && (
          <div className="flex flex-wrap gap-2.5 mt-4">
            {socialLinks.map((s) => (
              <a
                key={s.key}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.alt}
                className="flex items-center justify-center w-10 h-10 rounded-full bg-zinc-100 hover:bg-zinc-200 transition-all active:scale-90"
              >
                <img src={s.img} alt={s.alt} className="w-5 h-5 object-contain" />
              </a>
            ))}
          </div>
        )}

        {isAdmin && (
          <button
            onClick={() => setShowDeleteModal(true)}
            className="w-full flex items-center justify-center gap-2 mt-4 py-2.5 rounded-xl bg-red-50 text-red-600 text-xs font-bold hover:bg-red-100 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" {...ICON} />
            حذف این کسب‌وکار (ادمین)
          </button>
        )}
      </Section>
    </>
  );

  const heroBtn =
    "w-10 h-10 flex items-center justify-center rounded-full bg-white/90 backdrop-blur-md text-zinc-700 active:scale-90 transition-transform";

  return (
    <>
      {/* مودال تصاویر */}
      {selectedImage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-0 sm:p-4" onClick={() => setSelectedImage(null)}>
          <div className="relative w-full h-full sm:max-w-4xl sm:max-h-[90vh] flex items-center justify-center">
            <button onClick={() => setSelectedImage(null)} className="absolute top-4 right-4 sm:-top-12 sm:right-0 text-white bg-black/50 sm:bg-transparent rounded-full p-2 z-[110]">
              <X className="w-6 h-6 sm:w-8 sm:h-8" {...ICON} />
            </button>

            <div className="w-full h-full sm:hidden flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
              <TransformWrapper initialScale={1} minScale={1} maxScale={4} centerOnInit wheel={{ disabled: true }}>
                <TransformComponent wrapperClass="!w-full !h-full flex items-center justify-center">
                  <img src={selectedImage} alt="بزرگنمایی" className="max-w-full max-h-screen object-contain" />
                </TransformComponent>
              </TransformWrapper>
            </div>

            <div className="hidden sm:flex items-center justify-center w-full h-full">
              <img src={selectedImage} alt="بزرگنمایی" className="max-w-full max-h-[85vh] object-contain rounded-xl" onClick={(e) => e.stopPropagation()} />
            </div>
          </div>
        </div>
      )}

      {/* مودال مسیریابی */}
      {showRoutingModal && salon.coordinates && (
        <Modal onClose={() => setShowRoutingModal(false)}>
          <ModalHeader title="مسیریابی با..." onClose={() => setShowRoutingModal(false)} />
          <div className="flex flex-col gap-2">
            {[
              { href: `https://neshan.org/maps/routing?dest_lat=${salon.coordinates[0]}&dest_lng=${salon.coordinates[1]}`, label: "نشان (Neshan)", img: "/neshan.png", alt: "نشان" },
              { href: `https://balad.ir/?lat=${salon.coordinates[0]}&lng=${salon.coordinates[1]}&title=${encodeURIComponent(salon.name)}`, label: "بلد (Balad)", img: "/balad.png", alt: "بلد" },
              { href: `https://www.google.com/maps/dir/?api=1&destination=${salon.coordinates[0]},${salon.coordinates[1]}`, label: "گوگل مپ (Google Maps)", img: "/google-maps.png", alt: "گوگل مپ" },
            ].map((r) => (
              <a
                key={r.label}
                href={r.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-50 hover:bg-zinc-100 transition-colors"
              >
                <span className="font-bold text-sm text-zinc-800">{r.label}</span>
                <img src={r.img} alt={r.alt} className="w-6 h-6 object-contain" />
              </a>
            ))}
          </div>
        </Modal>
      )}

      {/* مودال انتخاب شماره تماس */}
      {showPhoneModal && salon.phones && salon.phones.length > 1 && (
        <Modal onClose={() => setShowPhoneModal(false)}>
          <ModalHeader title="با کدام شماره تماس بگیرم؟" onClose={() => setShowPhoneModal(false)} />
          <div className="flex flex-col gap-2">
            {salon.phones.map((phone: string, idx: number) => (
              <a
                key={idx}
                href={`tel:${phone}`}
                onClick={() => setShowPhoneModal(false)}
                className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-50 hover:bg-zinc-100 transition-colors"
              >
                <span className="font-bold text-sm text-zinc-800">{toPersianDigits(phone)}</span>
                <span className="bg-emerald-600 text-white text-[11px] font-bold px-3.5 py-1.5 rounded-full">تماس</span>
              </a>
            ))}
          </div>
        </Modal>
      )}

      {/* مودال تأیید حذف (ادمین) */}
      {showDeleteModal && (
        <Modal center z="z-[110]" onClose={() => !isDeleting && setShowDeleteModal(false)}>
          <h3 className="text-base font-bold text-zinc-900 mb-2">حذف کسب‌وکار</h3>
          <p className="text-sm text-zinc-600 mb-4 leading-relaxed">
            آیا مطمئنید می‌خواهید «{salon.name}» را برای همیشه حذف کنید؟ این عملیات غیرقابل بازگشت است.
          </p>
          {deleteError && <p className="text-red-600 text-xs font-medium mb-3">{deleteError}</p>}
          <div className="flex gap-2.5">
            <button onClick={() => setShowDeleteModal(false)} disabled={isDeleting} className="flex-1 py-2.5 rounded-xl bg-zinc-100 text-zinc-700 text-sm font-bold disabled:opacity-50">
              انصراف
            </button>
            <button onClick={handleDeleteSalon} disabled={isDeleting} className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold disabled:opacity-50">
              {isDeleting ? "در حال حذف..." : "بله، حذف شود"}
            </button>
          </div>
        </Modal>
      )}

      {/* پاپ‌آپ هشدار نوبت‌دهی غیرفعال */}
      {showBookingAlert && (
        <Modal center z="z-[200]" onClose={() => setShowBookingAlert(false)}>
          <h3 className="text-base font-bold text-zinc-900 text-center mb-2">نوبت‌دهی آنلاین فعال نیست</h3>
          <p className="text-sm text-zinc-500 text-center leading-relaxed mb-5">
            این سالن هنوز سیستم نوبت‌دهی آنلاین را فعال نکرده است. برای رزرو وقت با سالن تماس بگیرید.
          </p>
          <button onClick={() => setShowBookingAlert(false)} className={`w-full py-3 ${bookingBtnCls}`}>
            متوجه شدم
          </button>
        </Modal>
      )}

      <ShareSalonModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        url={shareUrl}
        salonName={salon?.name || ""}
      />

      {/* ── محتوای اصلی ── */}
      <div className="max-w-5xl mx-auto pb-28 sm:pb-24 px-2 sm:px-6 mt-2 sm:mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 lg:gap-5 items-start">

          {/* ستون اصلی — یک صفحه‌ی یکپارچه که بخش‌هایش با خط جدا می‌شوند */}
          <main className="lg:col-span-2 bg-white rounded-2xl overflow-hidden">

            {/* هیرو: عکس + نام سالن روی آن */}
            <div
              className={`relative w-full h-80 sm:h-[26rem] cursor-pointer ${
                salon.imageUrl ? "bg-zinc-200" : "bg-gradient-to-br from-[#824c71] to-[#5a3350]"
              }`}
              onClick={() => salon.imageUrl && setSelectedImage(salon.imageUrl)}
            >
              {salon.imageUrl && (
                <img src={salon.imageUrl} alt={salon.name} className="absolute inset-0 w-full h-full object-cover" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/5 to-black/30 pointer-events-none" />

              <div className="absolute top-3 inset-x-3 flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => router.push('/dashboard')}
                  aria-label="بازگشت به پیشخوان"
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-[#824c71] text-white active:scale-90 transition-transform"
                >
                  <ChevronRight className="w-5 h-5" strokeWidth={2.25} />
                </button>

                <div className="flex items-center gap-2">
                  <button onClick={handleShare} aria-label="اشتراک‌گذاری صفحه سالن" className={heroBtn}>
                    <Share2 className="w-[18px] h-[18px]" {...ICON} />
                  </button>
                  <button onClick={toggleBookmark} aria-label="نشان کردن" className={heroBtn}>
                    <Bookmark
                      className={`w-[18px] h-[18px] ${isBookmarked ? "text-[#824c71] fill-current" : "text-zinc-600"}`}
                      {...ICON}
                    />
                  </button>
                </div>
              </div>

              <div className="absolute bottom-0 inset-x-0 p-4 pointer-events-none">
                <h1 className="text-2xl sm:text-3xl font-bold text-white leading-snug">{salon.name}</h1>
                {(salon.hasHomeService || salon.genderAudience) && (
                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    {salon.hasHomeService && (
                      <span className="text-[11px] font-bold text-white bg-white/20 backdrop-blur-md px-3 py-1 rounded-full">
                        خدمات در منزل
                      </span>
                    )}
                    {salon.genderAudience && (
                      <span className="text-[11px] font-bold text-white bg-white/20 backdrop-blur-md px-3 py-1 rounded-full">
                        {GENDER_AUDIENCE_LABELS[salon.genderAudience] || salon.genderAudience}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* نوار خلاصه: امتیاز | نظرات | نوبت‌دهی — با خط عمودی */}
            <div className="grid grid-cols-3 text-center">
              <div className="py-3.5 border-e border-zinc-100">
                <p className="text-[11px] text-zinc-400">امتیاز</p>
                <p className="text-[15px] font-bold text-zinc-900 mt-0.5">{toPersianDigits(averageRating)}</p>
              </div>
              <div className="py-3.5 border-e border-zinc-100">
                <p className="text-[11px] text-zinc-400">نظرات</p>
                <p className="text-[15px] font-bold text-zinc-900 mt-0.5">{toPersianDigits(String(textReviews.length))}</p>
              </div>
              <div className="py-3.5">
                <p className="text-[11px] text-zinc-400">نوبت‌دهی</p>
                <p className={`text-[15px] font-bold mt-0.5 ${salon.bookingEnabled ? "text-emerald-600" : "text-zinc-500"}`}>
                  {salon.bookingEnabled ? "آنلاین" : "تلفنی"}
                </p>
              </div>
            </div>

            {/* نمونه کارها */}
            {salon.portfolios?.length > 0 && (
              <Section title="نمونه کارها">
                <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar snap-x -mx-4 px-4">
                  {salon.portfolios.map((imgUrl: string, index: number) => (
                    <div
                      key={index}
                      onClick={() => setSelectedImage(imgUrl)}
                      className="w-28 h-28 shrink-0 rounded-xl overflow-hidden snap-start cursor-pointer bg-zinc-100"
                    >
                      <img src={imgUrl} alt={`نمونه کار ${index + 1}`} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* درباره سالن */}
            <Section title="درباره سالن">
              <p className="text-zinc-600 text-[13px] leading-7 text-justify">
                {salon.description || "توضیحاتی ثبت نشده است."}
              </p>
            </Section>

            {/* خدمات */}
            <Section title="خدمات">
              {Object.keys(groupedServices).length > 0 ? (
                <div className="divide-y divide-zinc-100 -my-1">
                  {Object.entries(groupedServices).map(([category, services]) => {
                    const isExpanded = expandedCategories.includes(category);
                    return (
                      <div key={category}>
                        <button
                          type="button"
                          onClick={() => toggleCategory(category)}
                          className="w-full flex items-center justify-between gap-3 py-3 text-right"
                        >
                          <div className="flex items-baseline gap-2 min-w-0">
                            <span className="font-bold text-zinc-800 text-[13px]">{category}</span>
                            <span className="text-[11px] text-zinc-400">{toPersianDigits(String(services.length))} خدمت</span>
                          </div>
                          <ChevronDown
                            className={`w-[18px] h-[18px] shrink-0 transition-transform ${isExpanded ? "rotate-180 text-[#824c71]" : "text-zinc-400"}`}
                            {...ICON}
                          />
                        </button>
                        {isExpanded && (
                          <div className="pb-3.5 flex flex-wrap gap-1.5">
                            {services.map((service, index) => (
                              <span key={index} className="text-xs text-zinc-700 bg-zinc-100 rounded-full px-3 py-1.5">
                                {service}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-zinc-400 text-xs">خدماتی ثبت نشده است.</p>
              )}
            </Section>

            {/* اطلاعات تماس — فقط موبایل (در دسکتاپ ستون کناری) */}
            <div className="lg:hidden">{infoSection}</div>

            {/* امتیاز */}
            <Section title="امتیاز سالن">
              <div className="grid grid-cols-[auto_1fr] gap-6 items-center">
                <div className="flex flex-col items-center text-center">
                  <span className="text-5xl font-bold text-zinc-900 leading-none">{toPersianDigits(averageRating)}</span>
                  <div className="mt-2.5">
                    <Stars value={Math.round(avgRatingNum)} size="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[11px] text-zinc-400 mt-1.5">{toPersianDigits(String(totalVotes))} رای</span>
                </div>

                <div className="space-y-1.5 min-w-0">
                  {starCounts.map(({ star, count }) => (
                    <div key={star} className="flex items-center gap-2 text-[11px] text-zinc-400">
                      <span className="w-2.5 text-center">{toPersianDigits(String(star))}</span>
                      <div className="flex-1 h-1.5 rounded-full bg-zinc-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-amber-400"
                          style={{ width: totalVotes ? `${(count / totalVotes) * 100}%` : "0%" }}
                        />
                      </div>
                      <span className="w-4 text-left">{toPersianDigits(String(count))}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* امتیازدهی کاربر — قابل تغییر */}
              <div className="mt-5 rounded-xl bg-[#824c71]/[0.06] p-4">
                <div className="flex items-center gap-2 mb-2.5">
                  <p className="text-[13px] font-bold text-zinc-800">
                    {savedMyRating ? 'امتیاز شما' : 'امتیاز بدهید'}
                  </p>
                  {isSubmittingRating && <Loader2 className="w-3.5 h-3.5 text-[#824c71] animate-spin" {...ICON} />}
                  {ratingSaved && !isSubmittingRating && (
                    <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-emerald-600">
                      <Check className="w-3 h-3" strokeWidth={2.5} />
                      ثبت شد
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5" onMouseLeave={() => setHoverRating(0)}>
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
                        <Star className={`w-8 h-8 fill-current ${active ? 'text-amber-400' : 'text-white'}`} strokeWidth={0} />
                      </button>
                    );
                  })}
                </div>

                <p className="text-[11px] text-zinc-400 mt-2.5">
                  {savedMyRating ? 'برای تغییر، روی ستاره‌ی دلخواه بزنید.' : 'روی ستاره‌ها بزنید.'}
                </p>
                {ratingError && <p className="text-red-600 text-[11px] font-medium mt-1.5">{ratingError}</p>}
              </div>
            </Section>

            {/* نظرات */}
            <Section title="نظرات" count={`${toPersianDigits(String(textReviews.length))} نظر`}>
              {successMessage && (
                <div className="mb-3 flex items-center gap-2 bg-emerald-50 text-emerald-700 rounded-xl px-3 py-2.5">
                  <Check className="w-4 h-4 shrink-0" strokeWidth={2.25} />
                  <span className="text-xs font-bold">{successMessage}</span>
                </div>
              )}

              <textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                className="w-full bg-zinc-50 border border-transparent rounded-xl p-3 text-sm outline-none focus:bg-white focus:border-[#824c71]/50 focus:ring-2 focus:ring-[#824c71]/10 transition resize-none placeholder:text-zinc-400"
                rows={3}
                placeholder="تجربه خود را بنویسید..."
              />

              {reviewError && <p className="text-red-600 text-xs font-medium mt-2">{reviewError}</p>}

              <button
                onClick={handleReviewSubmit}
                className={`mt-3 w-full sm:w-auto px-7 py-2.5 text-xs ${bookingBtnCls}`}
              >
                ثبت نظر
              </button>

              {/* لیست نظرات — جدا شده با خط */}
              <div className="mt-5 divide-y divide-zinc-100">
                {textReviews.length > 0 ? (
                  textReviews.map((review) => (
                    <div key={review.id} className="flex gap-3 py-4 first:pt-0 last:pb-0">
                      <span className="w-9 h-9 rounded-full bg-[#824c71]/10 text-[#824c71] flex items-center justify-center text-sm font-bold shrink-0">
                        {String(review.name || "؟").slice(0, 1)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-zinc-800 text-[13px] leading-5">{review.name}</p>
                        {review.rating > 0 && (
                          <div className="mt-0.5">
                            <Stars value={review.rating} />
                          </div>
                        )}
                        <p className="text-zinc-600 text-[13px] leading-relaxed text-justify mt-1.5 break-words">{review.comment}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-zinc-400 text-xs text-center py-6">هنوز نظری ثبت نشده است.</p>
                )}
              </div>
            </Section>
          </main>

          {/* ستون کناری — دسکتاپ: دکمه‌ها + اطلاعات */}
          <aside className="hidden lg:block sticky top-6 bg-white rounded-2xl overflow-hidden">
            <div className="p-4 flex flex-col gap-2.5">
              <button onClick={handleBookingButtonClick} className={`w-full py-3.5 ${bookingBtnCls}`}>
                نوبت‌دهی آنلاین
              </button>
              {primaryPhone && (
                <a href={`tel:${primaryPhone}`} onClick={handleCallButtonClick} className={`w-full py-3.5 ${callBtnCls}`}>
                  <Phone className="w-4 h-4" {...ICON} />
                  تماس با سالن
                </a>
              )}
            </div>
            {infoSection}
          </aside>

        </div>
      </div>

      {/* نوار شناور پایین — موبایل */}
      <div className="fixed bottom-3 left-2 right-2 z-[60] lg:hidden bg-white/95 backdrop-blur-md border border-zinc-200 rounded-2xl p-2 flex gap-2">
        <button onClick={handleBookingButtonClick} className={`flex-1 py-3.5 ${bookingBtnCls}`}>
          نوبت‌دهی آنلاین
        </button>
        {primaryPhone && (
          <a href={`tel:${primaryPhone}`} onClick={handleCallButtonClick} className={`px-6 py-3.5 ${callBtnCls}`}>
            <Phone className="w-4 h-4" {...ICON} />
            تماس
          </a>
        )}
      </div>
    </>
  );
}