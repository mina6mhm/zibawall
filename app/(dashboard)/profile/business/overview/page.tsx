// app/(dashboard)/profile/business/overview/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import {
  Store, Edit, Trash2, ArrowRight, Loader2, MapPin, ChevronLeft, ChevronDown,
  CalendarClock, Clock, XCircle, ShieldCheck, UserPlus, Phone, X,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

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

export default function BusinessOverviewPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [salonData, setSalonData] = useState<any>(null);
  const [isSalonOwner, setIsSalonOwner] = useState(false);

  // ── بخش «مدیران سالن» — به‌صورت آکاردئون، همین‌جا توی صفحه‌ی تنظیمات ──
  const [managersOpen, setManagersOpen] = useState(false);
  const [managers, setManagers] = useState<SalonManager[] | null>(null);
  const [managersLoading, setManagersLoading] = useState(false);
  const [managersError, setManagersError] = useState('');
  const [newPhoneDigits, setNewPhoneDigits] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [isAddingManager, setIsAddingManager] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
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
    fetchProfile();
  }, [router]);

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
    if (!window.confirm('آیا از حذف کامل کسب‌وکار خود مطمئن هستید؟ این عمل غیرقابل بازگشت است.')) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/salon?id=${salonData.id}`, { method: 'DELETE' });
      if (res.ok) {
        alert('کسب‌وکار شما با موفقیت حذف شد.');
        router.push('/profile');
      } else {
        const errorData = await res.json();
        alert(errorData.error || 'خطا در حذف');
      }
    } catch {
      alert('خطای شبکه');
    } finally {
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
    variant: 'default' as const,
  },
  {
    key: 'edit',
    label: 'ویرایش اطلاعات',
    description: 'خدمات، تصاویر و مشخصات سالن',
    icon: Edit,
    href: '/profile/business/edit',
    variant: 'default' as const,
  },
  // حذف کسب‌وکار فقط برای صاحب اصلی نمایش داده می‌شود
  ...(isSalonOwner
    ? [{
        key: 'delete',
        label: 'حذف کسب‌وکار',
        description: 'این عمل غیرقابل بازگشت است',
        icon: Trash2,
        onClick: handleDeleteBusiness,
        variant: 'danger' as const,
      }]
    : []),
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

            const iconBox = (
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  action.variant === 'danger'
                    ? 'bg-red-50 text-red-500'
                    : 'bg-zinc-100 text-zinc-600'
                }`}
              >
                <Icon className="w-4.5 h-4.5" strokeWidth={1.75} />
              </div>
            );

            const textBlock = (
              <div className="flex-1 min-w-0 text-right">
                <p className={`text-sm font-bold ${action.variant === 'danger' ? 'text-red-600' : 'text-zinc-900'}`}>
                  {action.label}
                </p>
                <p className={`text-xs mt-0.5 truncate ${action.variant === 'danger' ? 'text-red-400' : 'text-zinc-400'}`}>
                  {action.description}
                </p>
              </div>
            );

            const baseClass = `group w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl bg-white border transition-all text-right ${
              action.variant === 'danger'
                ? 'border-zinc-100 hover:border-red-200 hover:bg-red-50/50'
                : 'border-zinc-100 hover:border-zinc-200 hover:shadow-sm'
            }`;

            if (action.href) {
              return (
                <Link key={action.key} href={action.href} className={baseClass}>
                  {iconBox}
                  {textBlock}
                  <ChevronLeft className="w-4 h-4 text-zinc-300 group-hover:-translate-x-0.5 transition-transform shrink-0" />
                </Link>
              );
            }

            return (
              <button
                key={action.key}
                onClick={action.onClick}
                disabled={isLoading}
                className={`${baseClass} disabled:opacity-50`}
              >
                {iconBox}
                {textBlock}
                {isLoading ? (
                  <Loader2 className="w-4 h-4 text-red-400 animate-spin shrink-0" />
                ) : (
                  <ChevronLeft className="w-4 h-4 text-red-200 group-hover:-translate-x-0.5 transition-transform shrink-0" />
                )}
              </button>
            );
          })}

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
        </div>
      </div>
    </div>
  );
}