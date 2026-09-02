// app/(dashboard)/profile/business/overview/page.tsx
'use client';

import React, { useState, useEffect, Suspense } from 'react';
import {
  Store, Edit, Trash2, ArrowRight, Loader2, MapPin, ChevronLeft, ChevronDown,
  CalendarClock, Clock, XCircle, ShieldCheck, UserPlus, Phone, X, Pin, CheckCircle2,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { openPaymentUrl } from '@/lib/openPaymentUrl';

type SalonManager = {
  id: string;
  phone: string;
  label: string | null;
};

const toEnglishDigits = (str: string) =>
  str
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - '۰'.charCodeAt(0)))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - '٠'.charCodeAt(0)));

const toPersianDigits = (str: string) => str.replace(/[0-9]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);
const sanitizeDigitsOnly = (value: string) => toEnglishDigits(value).replace(/[^0-9]/g, '');
const mobileRegex = /^09\d{9}$/;

function BusinessOverviewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [salonData, setSalonData] = useState<any>(null);
  const [isSalonOwner, setIsSalonOwner] = useState(false);

  // ── پین کردن سالن — نمایش اول در جستجوها ──
  const [showPinModal, setShowPinModal] = useState(false);
  const [isPinning, setIsPinning] = useState(false);
  const [pinError, setPinError] = useState('');
  const [pinNotice, setPinNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // ── بخش «مدیران سالن» — به‌صورت آکاردئون، همین‌جا توی صفحه‌ی تنظیمات ──
  const [managersOpen, setManagersOpen] = useState(false);
  const [managers, setManagers] = useState<SalonManager[] | null>(null);
  const [managersLoading, setManagersLoading] = useState(false);
  const [managersError, setManagersError] = useState('');
  const [newPhoneDigits, setNewPhoneDigits] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [isAddingManager, setIsAddingManager] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  // ── تایید حذف کسب‌وکار — به‌جای window.confirm پیش‌فرض مرورگر ──
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/user/profile');
      if (res.ok) {
        const data = await res.json();
        if (!data.salon) {
          router.push('/profile/business');
          return;
        }
        setSalonData(data.salon);
        setIsSalonOwner(!!data.isSalonOwner);
      } else if (res.status === 401) {
        router.push('/login');
      }
    } catch (error) {
      console.error('خطا در دریافت اطلاعات:', error);
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  // ── بازگشت از درگاه پرداخت پین ──
  useEffect(() => {
    if (searchParams.get('pinSuccess')) {
      setPinNotice({ type: 'success', text: 'پرداخت با موفقیت انجام شد و سالن شما پین شد.' });
      fetchProfile();
    } else if (searchParams.get('pinFailed')) {
      setPinNotice({ type: 'error', text: 'پرداخت ناموفق بود. سالن شما پین نشد. لطفاً دوباره تلاش کنید.' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const isPinned = !!salonData?.pinnedUntil && new Date(salonData.pinnedUntil) > new Date();
  const pinnedUntilLabel = salonData?.pinnedUntil
    ? new Date(salonData.pinnedUntil).toLocaleDateString('fa-IR')
    : '';

  const handlePin = async () => {
    setPinError('');
    setIsPinning(true);
    try {
      const res = await fetch('/api/salon/pin', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setPinError(data.error || 'خطا در اتصال به درگاه پرداخت');
        return;
      }
      await openPaymentUrl(data.paymentUrl);
    } catch {
      setPinError('خطای ارتباط با سرور');
    } finally {
      setIsPinning(false);
    }
  };

  const fetchManagers = async () => {
    setManagersLoading(true);
    setManagersError('');
    try {
      const res = await fetch('/api/salon/managers');
      const data = await res.json();
      if (res.ok) {
        setManagers(data.managers || []);
      } else {
        setManagersError(data.error || 'خطا در دریافت لیست مدیران');
      }
    } catch {
      setManagersError('خطای ارتباط با سرور');
    } finally {
      setManagersLoading(false);
    }
  };

  const toggleManagers = () => {
    const next = !managersOpen;
    setManagersOpen(next);
    if (next && managers === null) fetchManagers();
  };

  const handlePhoneChange = (value: string) => {
    setNewPhoneDigits(sanitizeDigitsOnly(value).slice(0, 11));
  };

  const handleAddManager = async () => {
    if (!mobileRegex.test(newPhoneDigits)) {
      setManagersError('شماره موبایل معتبر نیست (مثال: 09123456789)');
      return;
    }
    setManagersError('');
    setIsAddingManager(true);
    try {
      const res = await fetch('/api/salon/managers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: newPhoneDigits, label: newLabel.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setManagersError(data.error || 'خطا در افزودن مدیر');
        return;
      }
      setManagers((prev) => [...(prev || []), data.manager]);
      setNewPhoneDigits('');
      setNewLabel('');
    } catch {
      setManagersError('خطای ارتباط با سرور');
    } finally {
      setIsAddingManager(false);
    }
  };

  const handleRemoveManager = async (id: string) => {
    if (!window.confirm('این شماره از این پس هیچ دسترسی‌ای به این کسب‌وکار نخواهد داشت. حذف شود؟')) return;
    setRemovingId(id);
    try {
      const res = await fetch(`/api/salon/managers?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setManagers((prev) => (prev || []).filter((m) => m.id !== id));
      } else {
        const data = await res.json();
        alert(data.error || 'خطا در حذف مدیر');
      }
    } catch {
      alert('خطای ارتباط با سرور');
    } finally {
      setRemovingId(null);
    }
  };

  const handleDeleteBusiness = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/salon?id=${salonData.id}`, { method: 'DELETE' });
      if (res.ok) {
        router.push('/profile');
      } else {
        const errorData = await res.json();
        alert(errorData.error || 'خطا در حذف');
        setIsLoading(false);
      }
    } catch {
      alert('خطای شبکه');
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] bg-white">
        <Loader2 className="w-10 h-10 text-[#824c71] animate-spin mb-4" />
        <p className="text-zinc-500 font-medium text-sm">در حال دریافت اطلاعات...</p>
      </div>
    );
  }

  if (!salonData) return null;

  const actions = [
  {
    key: 'booking',
    label: 'تنظیمات نوبت‌دهی آنلاین',
    description: 'فعال‌سازی و مدیریت نوبت‌دهی',
    icon: CalendarClock,
    href: '/my-salon/booking-settings',
  },
  {
    key: 'edit',
    label: 'ویرایش اطلاعات',
    description: 'خدمات، تصاویر و مشخصات سالن',
    icon: Edit,
    href: '/profile/business/edit',
  },
];

  return (
    <div className="flex flex-col min-h-screen bg-white pb-24">
      <div className="max-w-lg mx-auto w-full px-4 pt-6">

        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-700 transition-colors mb-5"
        >
          <ArrowRight className="w-4 h-4" /> بازگشت
        </button>

        {/* اعلان نتیجه‌ی بازگشت از درگاه پرداخت پین */}
        {pinNotice && (
          <div
            className={`flex items-center gap-2 rounded-xl p-3 mb-5 text-sm font-medium ${
              pinNotice.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
            }`}
          >
            {pinNotice.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 shrink-0" />
            )}
            {pinNotice.text}
          </div>
        )}

        {/* وضعیت تایید سالن توسط ادمین */}
        {salonData.status === 'PENDING_APPROVAL' && (
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3.5 mb-5">
            <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" strokeWidth={1.5} />
            <div>
              <p className="text-sm font-bold text-amber-800">در انتظار تایید ادمین</p>
              <p className="text-xs text-amber-700 mt-1 leading-5">
                کسب‌وکار شما ثبت شده ولی هنوز برای کاربران دیگر نمایش داده نمی‌شود. پس از بررسی و تایید ادمین، صفحه‌ی شما پابلیک خواهد شد.
              </p>
            </div>
          </div>
        )}

        {salonData.status === 'REJECTED' && (
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl px-4 py-3.5 mb-5">
            <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" strokeWidth={1.5} />
            <div>
              <p className="text-sm font-bold text-red-800">ثبت کسب‌وکار رد شد</p>
              <p className="text-xs text-red-700 mt-1 leading-5">
                {salonData.rejectionReason || 'اطلاعات ثبتی شما توسط ادمین تایید نشد.'} برای اصلاح اطلاعات و ارسال مجدد، از گزینه‌ی «ویرایش اطلاعات» استفاده کنید.
              </p>
            </div>
          </div>
        )}

        {/* اگر کاربر مدیرِ اضافه‌شده است نه صاحب اصلی، همین‌جا بهش گفته می‌شود */}
        {!isSalonOwner && (
          <div className="flex items-start gap-3 bg-violet-50 border border-violet-200 rounded-2xl px-4 py-3.5 mb-5">
            <ShieldCheck className="w-5 h-5 text-violet-600 shrink-0 mt-0.5" strokeWidth={1.5} />
            <div>
              <p className="text-sm font-bold text-violet-800">شما مدیر این کسب‌وکار هستید</p>
              <p className="text-xs text-violet-700 mt-1 leading-5">
                صاحب اصلی سالن شما را به‌عنوان مدیر اضافه کرده. به همه‌ی نوبت‌ها و تنظیمات دسترسی دارید، ولی حذف کسب‌وکار و مدیریت لیست مدیران فقط با خودِ صاحب سالن است.
              </p>
            </div>
          </div>
        )}

        {/* کارت سالن — با زدن روی آن، صفحه عمومی سالن باز می‌شود */}
        <Link
          href={`/salon/${salonData.id}`}
          className="block bg-gradient-to-br from-[#824c71] to-[#6d3f5e] rounded-3xl p-5 shadow-lg shadow-[#824c71]/20 mb-5 active:opacity-90 transition-opacity"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/15 backdrop-blur rounded-2xl flex items-center justify-center shrink-0 border border-white/20">
              <Store className="w-6 h-6 text-white" strokeWidth={1.5} />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-white font-bold text-base truncate">{salonData.name}</h1>
              <p className="text-white/70 text-xs flex items-center gap-1 mt-1">
                <MapPin className="w-3 h-3" />
                {salonData.province}، {salonData.city}
              </p>
            </div>
            <ChevronLeft className="w-4.5 h-4.5 text-white/60 shrink-0" />
          </div>
        </Link>

        {/* اکشن‌ها */}
        <div className="space-y-2.5">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.key}
                href={action.href}
                className="group w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl bg-white border border-zinc-100 hover:border-zinc-200 hover:shadow-sm transition-all text-right"
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-zinc-100 text-zinc-600">
                  <Icon className="w-4.5 h-4.5" strokeWidth={1.75} />
                </div>
                <div className="flex-1 min-w-0 text-right">
                  <p className="text-sm font-bold text-zinc-900">{action.label}</p>
                  <p className="text-xs mt-0.5 truncate text-zinc-400">{action.description}</p>
                </div>
                <ChevronLeft className="w-4 h-4 text-zinc-300 group-hover:-translate-x-0.5 transition-transform shrink-0" />
              </Link>
            );
          })}

          {/* پین کردن سالن — نمایش اول در جستجوها، فقط صاحب اصلی می‌تواند پرداخت کند */}
          {isSalonOwner && salonData.status === 'ACTIVE' && (
            <button
              type="button"
              onClick={() => {
                setPinError('');
                setShowPinModal(true);
              }}
              className="group w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl bg-white border border-zinc-100 hover:border-zinc-200 hover:shadow-sm transition-all text-right"
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  isPinned ? 'bg-amber-50 text-amber-600' : 'bg-zinc-100 text-zinc-600'
                }`}
              >
                <Pin className="w-4.5 h-4.5" strokeWidth={1.75} />
              </div>
              <div className="flex-1 min-w-0 text-right">
                <p className="text-sm font-bold text-zinc-900">
                  {isPinned ? 'سالن شما پین است' : 'پین کردن سالن'}
                </p>
                <p className="text-xs mt-0.5 truncate text-zinc-400">
                  {isPinned ? `تا ${pinnedUntilLabel} در جستجوها اول نمایش داده می‌شوید` : 'همیشه اولین سالن در جستجوها باشید'}
                </p>
              </div>
              <ChevronLeft className="w-4 h-4 text-zinc-300 group-hover:-translate-x-0.5 transition-transform shrink-0" />
            </button>
          )}

          {/* مدیران سالن — فقط صاحب اصلی می‌بیند، به‌صورت آکاردئون همین‌جا باز می‌شود */}
          {isSalonOwner && (
            <div className="rounded-2xl bg-white border border-zinc-100 overflow-hidden">
              <button
                type="button"
                onClick={toggleManagers}
                className="w-full flex items-center gap-3.5 px-4 py-3.5 text-right"
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-zinc-100 text-zinc-600">
                  <ShieldCheck className="w-4.5 h-4.5" strokeWidth={1.75} />
                </div>
                <div className="flex-1 min-w-0 text-right">
                  <p className="text-sm font-bold text-zinc-900">مدیران سالن</p>
                  <p className="text-xs mt-0.5 truncate text-zinc-400">
                    افزودن شماره‌هایی که مثل خودتان به همه‌چیز دسترسی داشته باشند
                  </p>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-zinc-300 shrink-0 transition-transform ${managersOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {managersOpen && (
                <div className="px-4 pb-4 pt-1 border-t border-zinc-100">
                  <p className="text-[11px] text-zinc-400 leading-relaxed mb-3">
                    شماره موبایلی که وارد کنید، دقیقاً مثل خودتان به نوبت‌ها، پرسنل و تنظیمات این سالن دسترسی خواهد داشت — هر کاربری که با آن شماره وارد شود.
                  </p>

                  {/* فرم افزودن — یک ردیف جمع‌وجور، نه یک صفحه‌ی جدا */}
                  <div className="flex items-stretch gap-2 mb-3">
                    <div className="flex items-center gap-1.5 border border-zinc-200 rounded-lg bg-zinc-50/50 px-3 h-10 flex-1 min-w-0 focus-within:ring-1 focus-within:ring-[#824c71]/40 focus-within:border-[#824c71]">
                      <Phone className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      <input
                        type="tel"
                        inputMode="numeric"
                        dir="ltr"
                        value={toPersianDigits(newPhoneDigits)}
                        onChange={(e) => handlePhoneChange(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddManager()}
                        placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                        className="w-full h-full bg-transparent outline-none border-0 text-xs text-left min-w-0"
                      />
                    </div>
                    <input
                      type="text"
                      value={newLabel}
                      onChange={(e) => setNewLabel(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddManager()}
                      placeholder="یادداشت (اختیاری)"
                      className="w-28 shrink-0 border border-zinc-200 rounded-lg bg-zinc-50/50 px-2.5 h-10 text-xs focus:outline-none focus:ring-1 focus:ring-[#824c71]/40 focus:border-[#824c71]"
                    />
                    <button
                      onClick={handleAddManager}
                      disabled={isAddingManager || !newPhoneDigits}
                      className="w-10 h-10 shrink-0 flex items-center justify-center rounded-lg bg-[#824c71] text-white disabled:opacity-50"
                      title="افزودن مدیر"
                    >
                      {isAddingManager ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                    </button>
                  </div>

                  {managersError && <p className="text-red-600 text-[11px] font-medium mb-2.5">{managersError}</p>}

                  {managersLoading ? (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="w-5 h-5 text-[#824c71] animate-spin" />
                    </div>
                  ) : managers && managers.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {managers.map((m) => (
                        <div
                          key={m.id}
                          className="flex items-center gap-1.5 bg-zinc-50 border border-zinc-100 rounded-full pl-1.5 pr-3 py-1.5"
                        >
                          <div className="text-right leading-tight">
                            <span dir="ltr" className="block text-[11px] font-medium text-zinc-700">{m.phone}</span>
                            {m.label && <span className="block text-[10px] text-zinc-400">{m.label}</span>}
                          </div>
                          <button
                            onClick={() => handleRemoveManager(m.id)}
                            disabled={removingId === m.id}
                            className="w-5 h-5 flex items-center justify-center rounded-full bg-white text-zinc-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-50 shrink-0"
                          >
                            {removingId === m.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-zinc-400 text-center py-4">هنوز مدیری اضافه نکرده‌اید.</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* حذف کسب‌وکار — همیشه آخرین گزینه، فقط برای صاحب اصلی */}
          {isSalonOwner && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="group w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl bg-white border border-zinc-100 hover:border-red-200 hover:bg-red-50/50 transition-all text-right"
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-red-50 text-red-500">
                <Trash2 className="w-4.5 h-4.5" strokeWidth={1.75} />
              </div>
              <div className="flex-1 min-w-0 text-right">
                <p className="text-sm font-bold text-red-600">حذف کسب‌وکار</p>
                <p className="text-xs mt-0.5 truncate text-red-400">این عمل غیرقابل بازگشت است</p>
              </div>
              <ChevronLeft className="w-4 h-4 text-red-200 group-hover:-translate-x-0.5 transition-transform shrink-0" />
            </button>
          )}
        </div>
      </div>

      {/* پاپ‌آپ توضیح و پرداخت پین کردن سالن */}
      {showPinModal && (
        <div
          className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm px-4 pb-4 sm:pb-4"
          onClick={() => !isPinning && setShowPinModal(false)}
        >
          <div
            className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
              <Pin className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-zinc-900 mb-1.5">
              {isPinned ? 'تمدید پین سالن' : 'پین کردن سالن'}
            </h3>
            <p className="text-sm text-zinc-500 leading-6 mb-2">
              با پرداخت، به مدت ۳۰ روز سالن «{salonData.name}» در جستجوها و فیلترها همیشه به‌عنوان اولین سالن نمایش داده می‌شود.
            </p>
            {isPinned && (
              <p className="text-xs text-amber-700 bg-amber-50 rounded-xl px-3 py-2 mb-2 leading-5">
                سالن شما الان تا {pinnedUntilLabel} پین است. با پرداخت مجدد، ۳۰ روز به همین تاریخ اضافه می‌شود.
              </p>
            )}
            <p className="text-xs text-zinc-400 leading-5 mb-5">
              مبلغ در صفحه‌ی پرداخت زرین‌پال به شما نمایش داده خواهد شد.
            </p>

            {pinError && <p className="text-red-600 text-xs font-medium mb-3">{pinError}</p>}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowPinModal(false)}
                disabled={isPinning}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-zinc-600 bg-zinc-100 hover:bg-zinc-200 transition-colors disabled:opacity-50"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handlePin}
                disabled={isPinning}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-[#824c71] hover:bg-[#6f3f5f] transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isPinning ? <Loader2 className="w-4 h-4 animate-spin" /> : 'پرداخت و ادامه'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* پاپ‌آپ تایید حذف کسب‌وکار */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm px-4 pb-4 sm:pb-4"
          onClick={() => !isLoading && setShowDeleteConfirm(false)}
        >
          <div
            className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center mb-4">
              <Trash2 className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-zinc-900 mb-1.5">حذف کامل کسب‌وکار</h3>
            <p className="text-sm text-zinc-500 leading-6 mb-5">
              با حذف «{salonData.name}»، تمام اطلاعات، نوبت‌ها و پرسنل این سالن برای همیشه پاک می‌شود. این عمل غیرقابل بازگشت است.
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isLoading}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-zinc-600 bg-zinc-100 hover:bg-zinc-200 transition-colors disabled:opacity-50"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleDeleteBusiness}
                disabled={isLoading}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-red-500 hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'بله، حذف شود'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BusinessOverviewPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[60vh] bg-white">
          <Loader2 className="w-10 h-10 text-[#824c71] animate-spin mb-4" />
          <p className="text-zinc-500 font-medium text-sm">در حال دریافت اطلاعات...</p>
        </div>
      }
    >
      <BusinessOverviewContent />
    </Suspense>
  );
}