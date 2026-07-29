// app/(dashboard)/my-salon/page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Loader2, Plus, Trash2, Pencil, ChevronDown, ChevronUp, Clock, Wallet,
  Users, Layers, Calendar, ChevronRight as ChevronRightIcon, ChevronLeft as ChevronLeftIcon,
  User, Phone, Ban,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import ManualBookingModal from '@/components/business/ManualBookingModal';

type BookingService = { id: string; name: string; durationMinutes: number; price: number | null };
type StaffRef = { id: string; name: string };
type BookingCategory = { id: string; name: string; services: BookingService[]; staff: StaffRef[] };
type Staff = { id: string; name: string; categories: { id: string; name: string }[] };

type TabKey = 'categories' | 'staff' | 'bookings';

export default function MySalonPage() {
  const router = useRouter();
  const [userPhone, setUserPhone] = useState('');
  const [salon, setSalon] = useState<any>(null);
  const [isFetching, setIsFetching] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('categories');

  const [categories, setCategories] = useState<BookingCategory[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(null);

  const [isTogglingBooking, setIsTogglingBooking] = useState(false);

  const [newCategoryName, setNewCategoryName] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');

  const [serviceFormFor, setServiceFormFor] = useState<string | null>(null);
  const [serviceName, setServiceName] = useState('');
  const [serviceDuration, setServiceDuration] = useState('');
  const [servicePrice, setServicePrice] = useState('');
  const [isSavingService, setIsSavingService] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);

  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffCategoryIds, setNewStaffCategoryIds] = useState<string[]>([]);
  const [isSavingStaff, setIsSavingStaff] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [editingStaffName, setEditingStaffName] = useState('');
  const [editingStaffCategoryIds, setEditingStaffCategoryIds] = useState<string[]>([]);

  // --- نوبت‌های سالن ---
  const [bookings, setBookings] = useState<any[]>([]);
  const [dayOffset, setDayOffset] = useState(0);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const MAX_DAYS_FORWARD = 30;

  const toEnglishDigits = (value: string) => {
    const p = '۰۱۲۳۴۵۶۷۸۹';
    const a = '٠١٢٣٤٥٦٧٨٩';
    return value.split('').map((ch) => {
      const pi = p.indexOf(ch);
      if (pi !== -1) return String(pi);
      const ai = a.indexOf(ch);
      if (ai !== -1) return String(ai);
      return ch;
    }).join('');
  };
  const sanitizeDigits = (v: string) => toEnglishDigits(v).replace(/[^0-9]/g, '');

  const fetchCategories = useCallback(async (phone: string) => {
    const res = await fetch(`/api/booking-category?userPhone=${phone}`);
    if (res.ok) {
      const data = await res.json();
      setCategories(data.categories || []);
    }
  }, []);

  const fetchStaff = useCallback(async (phone: string) => {
    const res = await fetch(`/api/staff?userPhone=${phone}`);
    if (res.ok) {
      const data = await res.json();
      setStaffList(data.staff || []);
    }
  }, []);

  const fetchBookings = useCallback(async (phone: string) => {
    const res = await fetch(`/api/booking?userPhone=${phone}`);
    if (res.ok) {
      const data = await res.json();
      setBookings(data.bookings || []);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      const meRes = await fetch('/api/auth/me');
      if (!meRes.ok) {
        router.push('/login');
        return;
      }
      const user = await meRes.json();
      setUserPhone(user.phone);

      const profileRes = await fetch('/api/user/profile');
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        if (!profileData.salon) {
          router.push('/profile/business');
          return;
        }
        setSalon(profileData.salon);
      }

      await fetchCategories(user.phone);
      await fetchStaff(user.phone);
      await fetchBookings(user.phone);
      setIsFetching(false);
    };
    init();
  }, [router, fetchCategories, fetchStaff, fetchBookings]);

  const handleToggleBooking = async () => {
    setIsTogglingBooking(true);
    try {
      const res = await fetch('/api/salon/booking-toggle', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userPhone, bookingEnabled: !salon.bookingEnabled }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'خطا در تغییر وضعیت');
      setSalon((prev: any) => ({ ...prev, bookingEnabled: data.bookingEnabled }));
    } catch (error: any) {
      alert(error.message || 'خطایی رخ داد.');
    } finally {
      setIsTogglingBooking(false);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    setIsAddingCategory(true);
    try {
      const res = await fetch('/api/booking-category', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userPhone, name: newCategoryName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'خطا در ثبت دسته');
      setCategories((prev) => [...prev, data.category]);
      setNewCategoryName('');
    } catch (error: any) {
      alert(error.message || 'خطایی رخ داد.');
    } finally {
      setIsAddingCategory(false);
    }
  };

  const handleRenameCategory = async (id: string) => {
    if (!editingCategoryName.trim()) return;
    try {
      const res = await fetch(`/api/booking-category/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userPhone, name: editingCategoryName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'خطا در ویرایش دسته');
      setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, name: data.category.name } : c)));
      setEditingCategoryId(null);
    } catch (error: any) {
      alert(error.message || 'خطایی رخ داد.');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!window.confirm('حذف این دسته، همه‌ی ریزخدمات زیرش را هم حذف می‌کند. ادامه می‌دهید؟')) return;
    try {
      const res = await fetch(`/api/booking-category/${id}?userPhone=${userPhone}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'خطا در حذف دسته');
      setCategories((prev) => prev.filter((c) => c.id !== id));
    } catch (error: any) {
      alert(error.message || 'خطایی رخ داد.');
    }
  };

  const openServiceForm = (categoryId: string, service?: BookingService) => {
    setServiceFormFor(categoryId);
    setEditingServiceId(service?.id || null);
    setServiceName(service?.name || '');
    setServiceDuration(service ? String(service.durationMinutes) : '');
    setServicePrice(service?.price ? String(service.price) : '');
  };

  const closeServiceForm = () => {
    setServiceFormFor(null);
    setEditingServiceId(null);
    setServiceName('');
    setServiceDuration('');
    setServicePrice('');
  };

  const handleSaveService = async (categoryId: string) => {
    if (!serviceName.trim() || !serviceDuration) {
      alert('نام ریزخدمت و مدت‌زمان الزامی است.');
      return;
    }
    setIsSavingService(true);
    try {
      const url = editingServiceId ? `/api/booking-service/${editingServiceId}` : '/api/booking-service';
      const method = editingServiceId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userPhone,
          categoryId,
          name: serviceName.trim(),
          durationMinutes: sanitizeDigits(serviceDuration),
          price: servicePrice ? sanitizeDigits(servicePrice) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'خطا در ثبت ریزخدمت');

      setCategories((prev) =>
        prev.map((c) => {
          if (c.id !== categoryId) return c;
          if (editingServiceId) {
            return { ...c, services: c.services.map((s) => (s.id === editingServiceId ? data.service : s)) };
          }
          return { ...c, services: [...c.services, data.service] };
        })
      );
      closeServiceForm();
    } catch (error: any) {
      alert(error.message || 'خطایی رخ داد.');
    } finally {
      setIsSavingService(false);
    }
  };

  const handleDeleteService = async (categoryId: string, serviceId: string) => {
    if (!window.confirm('آیا از حذف این ریزخدمت مطمئن هستید؟')) return;
    try {
      const res = await fetch(`/api/booking-service/${serviceId}?userPhone=${userPhone}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'خطا در حذف ریزخدمت');
      setCategories((prev) =>
        prev.map((c) => (c.id === categoryId ? { ...c, services: c.services.filter((s) => s.id !== serviceId) } : c))
      );
    } catch (error: any) {
      alert(error.message || 'خطایی رخ داد.');
    }
  };

  const handleAddStaff = async () => {
    if (!newStaffName.trim()) return;
    setIsSavingStaff(true);
    try {
      const res = await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userPhone, name: newStaffName.trim(), categoryIds: newStaffCategoryIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'خطا در افزودن پرسنل');
      setStaffList((prev) => [...prev, data.staff]);
      setNewStaffName('');
      setNewStaffCategoryIds([]);
    } catch (error: any) {
      alert(error.message || 'خطایی رخ داد.');
    } finally {
      setIsSavingStaff(false);
    }
  };

  const openEditStaff = (staff: Staff) => {
    setEditingStaffId(staff.id);
    setEditingStaffName(staff.name);
    setEditingStaffCategoryIds(staff.categories.map((c) => c.id));
  };

  const handleSaveStaffEdit = async () => {
    if (!editingStaffId || !editingStaffName.trim()) return;
    try {
      const res = await fetch(`/api/staff/${editingStaffId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userPhone, name: editingStaffName.trim(), categoryIds: editingStaffCategoryIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'خطا در ویرایش پرسنل');
      setStaffList((prev) => prev.map((s) => (s.id === editingStaffId ? data.staff : s)));
      setEditingStaffId(null);
    } catch (error: any) {
      alert(error.message || 'خطایی رخ داد.');
    }
  };

  const handleDeleteStaff = async (id: string) => {
    if (!window.confirm('آیا از حذف این پرسنل مطمئن هستید؟')) return;
    try {
      const res = await fetch(`/api/staff/${id}?userPhone=${userPhone}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'خطا در حذف پرسنل');
      setStaffList((prev) => prev.filter((s) => s.id !== id));
    } catch (error: any) {
      alert(error.message || 'خطایی رخ داد.');
    }
  };

  const handleCancelBooking = async (id: string) => {
    if (!window.confirm('آیا از لغو این نوبت مطمئن هستید؟')) return;
    try {
      const res = await fetch(`/api/booking/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userPhone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'خطا در لغو نوبت');
      fetchBookings(userPhone);
    } catch (error: any) {
      alert(error.message || 'خطایی رخ داد.');
    }
  };

  const toggleCategoryInList = (list: string[], setList: (v: string[]) => void, categoryId: string) => {
    setList(list.includes(categoryId) ? list.filter((c) => c !== categoryId) : [...list, categoryId]);
  };

  const getDateForOffset = (offset: number) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + offset);
    return d;
  };
  const getDayLabel = (offset: number, date: Date) => {
    if (offset === 0) return 'امروز';
    if (offset === 1) return 'فردا';
    if (offset === -1) return 'دیروز';
    return date.toLocaleDateString('fa-IR', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  const totalServices = categories.reduce((sum, c) => sum + c.services.length, 0);

  if (isFetching) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-[#824c71] animate-spin mb-3" />
        <p className="text-sm text-zinc-400">در حال دریافت اطلاعات...</p>
      </div>
    );
  }

  const selectedDate = getDateForOffset(dayOffset);
  const dayLabel = getDayLabel(dayOffset, selectedDate);
  const dayBookings = bookings.filter(
    (b) => new Date(b.date).toDateString() === selectedDate.toDateString()
  );

  return (
    <div className="flex flex-col min-h-screen bg-white pb-32">
      <div className="max-w-lg mx-auto w-full px-4 pt-6">
        <h1 className="text-base font-bold text-zinc-900 mb-4">مدیریت نوبت‌دهی</h1>

        {/* روشن/خاموش کردن نوبت‌دهی */}
        <div className="border border-zinc-100 rounded-2xl p-4 mb-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-zinc-900">نوبت‌دهی آنلاین</p>
              <p className="text-xs text-zinc-400 mt-0.5">
                {salon.bookingEnabled ? 'فعال — مشتریان می‌توانند نوبت آنلاین بگیرند' : 'غیرفعال'}
              </p>
            </div>
            <button
              onClick={handleToggleBooking}
              disabled={isTogglingBooking}
              className={`relative w-12 h-7 rounded-full transition-colors shrink-0 ${
                salon.bookingEnabled ? 'bg-[#824c71]' : 'bg-zinc-200'
              } disabled:opacity-50`}
            >
              <span
                className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  salon.bookingEnabled ? 'right-1' : 'right-6'
                }`}
              />
            </button>
          </div>
          {!salon.bookingEnabled && totalServices === 0 && (
            <p className="text-[11px] text-amber-600 bg-amber-50 rounded-lg px-3 py-2 mt-3">
              برای فعال‌سازی، اول حداقل یک دسته و ریزخدمت در پایین تعریف کنید.
            </p>
          )}
        </div>

        {/* تب‌ها */}
        <div className="flex items-center gap-1.5 bg-zinc-50 rounded-2xl p-1.5 mb-5">
          <button
            onClick={() => setActiveTab('categories')}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-colors ${
              activeTab === 'categories' ? 'bg-white text-[#824c71] shadow-sm' : 'text-zinc-500'
            }`}
          >
            <Layers className="w-3.5 h-3.5" /> دسته‌ها و خدمات
          </button>
          <button
            onClick={() => setActiveTab('staff')}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-colors ${
              activeTab === 'staff' ? 'bg-white text-[#824c71] shadow-sm' : 'text-zinc-500'
            }`}
          >
            <Users className="w-3.5 h-3.5" /> پرسنل
          </button>
          <button
            onClick={() => setActiveTab('bookings')}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-colors ${
              activeTab === 'bookings' ? 'bg-white text-[#824c71] shadow-sm' : 'text-zinc-500'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" /> نوبت‌های سالن
          </button>
        </div>

        {/* تب دسته‌ها و خدمات */}
        {activeTab === 'categories' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="نام دسته جدید (مثلاً خدمات ناخن)"
                className="flex-1 border border-zinc-200 rounded-xl px-3.5 py-2.5 text-sm focus:border-[#824c71] outline-none"
              />
              <button
                onClick={handleAddCategory}
                disabled={isAddingCategory}
                className="flex items-center gap-1.5 bg-[#824c71] text-white px-4 py-2.5 rounded-xl text-xs font-bold disabled:opacity-50"
              >
                {isAddingCategory ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />} افزودن
              </button>
            </div>

            {categories.length === 0 ? (
              <p className="text-sm text-zinc-400 text-center py-10">هنوز دسته‌ای تعریف نشده است.</p>
            ) : (
              categories.map((cat) => {
                const isExpanded = expandedCategoryId === cat.id;
                return (
                  <div key={cat.id} className="border border-zinc-100 rounded-2xl overflow-hidden">
                    <div className="flex items-center justify-between p-3.5 bg-zinc-50/50">
                      {editingCategoryId === cat.id ? (
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            value={editingCategoryName}
                            onChange={(e) => setEditingCategoryName(e.target.value)}
                            className="flex-1 border border-zinc-200 rounded-lg px-3 py-1.5 text-sm outline-none"
                            autoFocus
                          />
                          <button onClick={() => handleRenameCategory(cat.id)} className="text-xs font-bold text-[#824c71]">ذخیره</button>
                          <button onClick={() => setEditingCategoryId(null)} className="text-xs font-bold text-zinc-400">انصراف</button>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => setExpandedCategoryId(isExpanded ? null : cat.id)}
                            className="flex items-center gap-2 flex-1 text-right"
                          >
                            <span className="text-sm font-bold text-zinc-900">{cat.name}</span>
                            <span className="text-[10px] bg-white text-zinc-500 px-2 py-0.5 rounded-full">
                              {cat.services.length.toLocaleString('fa-IR')} ریزخدمت
                            </span>
                          </button>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                setEditingCategoryId(cat.id);
                                setEditingCategoryName(cat.name);
                              }}
                              className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteCategory(cat.id)}
                              className="w-8 h-8 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-50"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setExpandedCategoryId(isExpanded ? null : cat.id)}>
                              {isExpanded ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
                            </button>
                          </div>
                        </>
                      )}
                    </div>

                    {isExpanded && (
                      <div className="p-3.5 space-y-2.5">
                        {cat.services.map((s) => (
                          <div key={s.id} className="flex items-center justify-between bg-zinc-50 rounded-xl px-3.5 py-2.5">
                            <div>
                              <p className="text-sm font-medium text-zinc-800">{s.name}</p>
                              <p className="text-[11px] text-zinc-400 flex items-center gap-2 mt-0.5">
                                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {s.durationMinutes.toLocaleString('fa-IR')} دقیقه</span>
                                {s.price && <span className="flex items-center gap-1"><Wallet className="w-3 h-3" /> {s.price.toLocaleString('fa-IR')} تومان</span>}
                              </p>
                            </div>
                            <div className="flex items-center gap-1">
                              <button onClick={() => openServiceForm(cat.id, s)} className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-400 hover:bg-white">
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => handleDeleteService(cat.id, s.id)} className="w-7 h-7 flex items-center justify-center rounded-lg text-red-400 hover:bg-white">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}

                        {serviceFormFor === cat.id ? (
                          <div className="border border-zinc-200 rounded-xl p-3 space-y-2 bg-zinc-50/60">
                            <input
                              value={serviceName}
                              onChange={(e) => setServiceName(e.target.value)}
                              placeholder="نام ریزخدمت (مثلاً کاشت ناخن)"
                              className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm bg-white outline-none"
                            />
                            <div className="grid grid-cols-2 gap-2">
                              <input
                                value={serviceDuration}
                                onChange={(e) => setServiceDuration(sanitizeDigits(e.target.value))}
                                placeholder="مدت‌زمان (دقیقه) *"
                                dir="ltr"
                                inputMode="numeric"
                                className="border border-zinc-200 rounded-lg px-3 py-2 text-sm bg-white text-left outline-none"
                              />
                              <input
                                value={servicePrice}
                                onChange={(e) => setServicePrice(sanitizeDigits(e.target.value))}
                                placeholder="قیمت (اختیاری)"
                                dir="ltr"
                                inputMode="numeric"
                                className="border border-zinc-200 rounded-lg px-3 py-2 text-sm bg-white text-left outline-none"
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleSaveService(cat.id)}
                                disabled={isSavingService}
                                className="flex-1 bg-[#824c71] text-white py-2 rounded-lg text-xs font-bold disabled:opacity-50"
                              >
                                {isSavingService ? 'در حال ذخیره...' : 'ذخیره'}
                              </button>
                              <button onClick={closeServiceForm} className="px-3 py-2 rounded-lg text-xs font-bold text-zinc-500 bg-white border border-zinc-200">
                                انصراف
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => openServiceForm(cat.id)}
                            className="flex items-center gap-1.5 text-xs font-bold text-[#824c71]"
                          >
                            <Plus className="w-3.5 h-3.5" /> افزودن ریزخدمت
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* تب پرسنل */}
        {activeTab === 'staff' && (
          <div className="space-y-3">
            <div className="border border-zinc-200 rounded-xl p-3 space-y-2.5 bg-zinc-50/60">
              <input
                value={newStaffName}
                onChange={(e) => setNewStaffName(e.target.value)}
                placeholder="نام پرسنل جدید"
                className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm bg-white outline-none"
              />
              {categories.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => toggleCategoryInList(newStaffCategoryIds, setNewStaffCategoryIds, cat.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        newStaffCategoryIds.includes(cat.id)
                          ? 'bg-[#824c71]/10 border-[#824c71]/30 text-[#824c71]'
                          : 'bg-white border-zinc-200 text-zinc-500'
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              )}
              <button
                onClick={handleAddStaff}
                disabled={isSavingStaff}
                className="w-full flex items-center justify-center gap-1.5 bg-[#824c71] text-white py-2 rounded-lg text-xs font-bold disabled:opacity-50"
              >
                {isSavingStaff ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />} افزودن پرسنل
              </button>
            </div>

            {staffList.length === 0 ? (
              <p className="text-sm text-zinc-400 text-center py-10">هنوز پرسنلی ثبت نشده است.</p>
            ) : (
              staffList.map((staff) => (
                <div key={staff.id} className="border border-zinc-100 rounded-2xl p-3.5">
                  {editingStaffId === staff.id ? (
                    <div className="space-y-2.5">
                      <input
                        value={editingStaffName}
                        onChange={(e) => setEditingStaffName(e.target.value)}
                        className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm outline-none"
                      />
                      <div className="flex flex-wrap gap-1.5">
                        {categories.map((cat) => (
                          <button
                            key={cat.id}
                            onClick={() => toggleCategoryInList(editingStaffCategoryIds, setEditingStaffCategoryIds, cat.id)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                              editingStaffCategoryIds.includes(cat.id)
                                ? 'bg-[#824c71]/10 border-[#824c71]/30 text-[#824c71]'
                                : 'bg-white border-zinc-200 text-zinc-500'
                            }`}
                          >
                            {cat.name}
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={handleSaveStaffEdit} className="text-xs font-bold text-[#824c71]">ذخیره</button>
                        <button onClick={() => setEditingStaffId(null)} className="text-xs font-bold text-zinc-400">انصراف</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-zinc-800">{staff.name}</p>
                        <p className="text-[11px] text-zinc-400 mt-0.5">
                          {staff.categories.length > 0 ? staff.categories.map((c) => c.name).join('، ') : 'بدون دسته'}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => openEditStaff(staff)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-zinc-50 text-zinc-500">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDeleteStaff(staff.id)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-50 text-red-500">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* تب نوبت‌های سالن */}
        {activeTab === 'bookings' && (
          <div>
            <button
              onClick={() => setIsManualModalOpen(true)}
              className="w-full flex items-center justify-center gap-1.5 bg-[#824c71] text-white py-2.5 rounded-xl text-xs font-bold mb-4"
            >
              <Plus className="w-3.5 h-3.5" /> ثبت نوبت دستی / مسدودسازی زمان
            </button>

            <div className="flex items-center justify-between bg-zinc-50 rounded-2xl p-2 mb-4">
              <button
                onClick={() => setDayOffset((v) => Math.max(v - 1, -7))}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-white text-zinc-600"
              >
                <ChevronRightIcon className="w-5 h-5" />
              </button>
              <p className="text-sm font-bold text-zinc-800">{dayLabel}</p>
              <button
                onClick={() => setDayOffset((v) => Math.min(v + 1, MAX_DAYS_FORWARD))}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-white text-zinc-600"
              >
                <ChevronLeftIcon className="w-5 h-5" />
              </button>
            </div>

            {dayBookings.length === 0 ? (
              <p className="text-sm text-zinc-400 text-center py-10">نوبتی برای این روز ثبت نشده است.</p>
            ) : (
              <div className="space-y-2.5">
                {dayBookings.map((b) => (
                  <div key={b.id} className="border border-zinc-100 rounded-2xl p-3.5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold text-zinc-900">{b.startTime} - {b.endTime}</span>
                      <span className={`text-[10px] px-2 py-1 rounded-full font-medium ${
                        b.source === 'BLOCKED' ? 'bg-zinc-100 text-zinc-500' : b.source === 'MANUAL' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'
                      }`}>
                        {b.source === 'BLOCKED' ? 'مسدود' : b.source === 'MANUAL' ? 'ثبت دستی' : 'آنلاین'}
                      </span>
                    </div>
                    {b.source !== 'BLOCKED' && (
                      <p className="text-xs text-zinc-600 mb-1">{b.categoryName} — {b.serviceName}</p>
                    )}
                    {b.staffName && <p className="text-[11px] text-zinc-400">پرسنل: {b.staffName}</p>}
                    {b.customerName && (
                      <p className="text-[11px] text-zinc-400 flex items-center gap-1 mt-1">
                        <User className="w-3 h-3" /> {b.customerName}
                        {b.customerPhone && <span className="flex items-center gap-1 mr-2"><Phone className="w-3 h-3" /> {b.customerPhone}</span>}
                      </p>
                    )}
                    <button
                      onClick={() => handleCancelBooking(b.id)}
                      className="w-full mt-2.5 flex items-center justify-center gap-1.5 border border-red-100 rounded-lg py-1.5 text-xs font-bold text-red-500"
                    >
                      <Ban className="w-3.5 h-3.5" /> لغو
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <ManualBookingModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        onCreated={() => fetchBookings(userPhone)}
        userPhone={userPhone}
        categories={categories}
        staffList={staffList}
      />
    </div>
  );
}