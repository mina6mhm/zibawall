// app/(dashboard)/my-salon/services/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowRight, Loader2, Plus, Pencil, Trash2, ChevronDown, ChevronUp, Clock, ListChecks, CalendarCheck,
} from 'lucide-react';
import CategoryFormModal from '@/components/booking/CategoryFormModal';
import ServiceItemFormModal from '@/components/booking/ServiceItemFormModal';

type ServiceItemRow = { id: string; name: string; durationMinutes: number; price: number | null; isActive: boolean };
type CategoryRow = { id: string; title: string; isActive: boolean; depositAmount: number; services: ServiceItemRow[] };

export default function ServicesManagementPage() {
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expanded, setExpanded] = useState<string[]>([]);

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryRow | null>(null);

  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<ServiceItemRow | null>(null);

  // وضعیت روشن/خاموش بودن نوبت‌دهی آنلاین کل سالن
  const [bookingEnabled, setBookingEnabled] = useState(false);
  const [canEnable, setCanEnable] = useState(false);
  const [isTogglingBooking, setIsTogglingBooking] = useState(false);
  const [toggleError, setToggleError] = useState('');

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/salon/booking-categories');
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchBookingStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/salon/booking-toggle');
      if (res.ok) {
        const data = await res.json();
        setBookingEnabled(data.bookingEnabled);
        setCanEnable(data.canEnable);
      }
    } catch {
      // نادیده گرفتن خطای دریافت وضعیت — سوییچ همون مقدار پیش‌فرض می‌مونه
    }
  }, []);

  useEffect(() => {
    fetchCategories();
    fetchBookingStatus();
  }, [fetchCategories, fetchBookingStatus]);

  const toggleExpand = (id: string) =>
    setExpanded((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));

  const formatMoney = (amount: number) => amount.toLocaleString('fa-IR');

  const handleDeleteCategory = async (id: string) => {
    if (!window.confirm('این دسته‌بندی و همه‌ی خدماتش حذف می‌شود. مطمئنید؟')) return;
    const res = await fetch(`/api/salon/booking-categories?id=${id}`, { method: 'DELETE' });
    if (res.ok) {
      fetchCategories();
      fetchBookingStatus();
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!window.confirm('این خدمت حذف شود؟')) return;
    const res = await fetch(`/api/salon/service-items?id=${id}`, { method: 'DELETE' });
    if (res.ok) {
      fetchCategories();
      fetchBookingStatus();
    }
  };

  const toggleCategoryActive = async (cat: CategoryRow) => {
    await fetch('/api/salon/booking-categories', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: cat.id, isActive: !cat.isActive }),
    });
    fetchCategories();
    fetchBookingStatus();
  };

  const toggleItemActive = async (item: ServiceItemRow) => {
    await fetch('/api/salon/service-items', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: item.id, isActive: !item.isActive }),
    });
    fetchCategories();
    fetchBookingStatus();
  };

  const handleToggleBooking = async () => {
    setToggleError('');
    const nextValue = !bookingEnabled;

    if (nextValue && !canEnable) {
      setToggleError('ابتدا حداقل یک دسته‌بندیِ فعال با یک خدمتِ فعال ثبت کنید');
      return;
    }

    setIsTogglingBooking(true);
    try {
      const res = await fetch('/api/salon/booking-toggle', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingEnabled: nextValue }),
      });
      const data = await res.json();
      if (!res.ok) {
        setToggleError(data.error || 'خطا در تغییر وضعیت');
        return;
      }
      setBookingEnabled(data.bookingEnabled);
    } catch {
      setToggleError('خطای ارتباط با سرور');
    } finally {
      setIsTogglingBooking(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 text-[#824c71] animate-spin mb-4" />
        <p className="text-zinc-500 font-medium text-sm">در حال دریافت اطلاعات...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto pt-8 pb-32 px-4 md:pt-10 md:px-0">
      <div className="flex items-center gap-3 mb-7">
        <Link href="/my-salon" className="w-10 h-10 flex items-center justify-center rounded-xl bg-zinc-100 text-zinc-600 hover:bg-zinc-200 transition-colors shrink-0">
          <ArrowRight className="w-4.5 h-4.5" />
        </Link>
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-zinc-900">خدمات نوبت‌دهی آنلاین</h1>
          <p className="text-zinc-500 text-xs md:text-sm mt-0.5">دسته‌بندی‌ها و خدماتی که مشتری می‌تواند آنلاین رزرو کند</p>
        </div>
      </div>

      {/* سوییچ روشن/خاموش کردن نوبت‌دهی آنلاین */}
      <div className="bg-white border border-zinc-100 rounded-2xl p-4 mb-4 shadow-sm shadow-zinc-200/50">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${bookingEnabled ? 'bg-[#824c71]/10 text-[#824c71]' : 'bg-zinc-100 text-zinc-400'}`}>
              <CalendarCheck className="w-4.5 h-4.5" />
            </div>
            <div>
              <p className="text-sm font-bold text-zinc-800">نوبت‌دهی آنلاین</p>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                {bookingEnabled
                  ? 'مشتری‌ها می‌توانند از صفحه‌ی سالن شما نوبت آنلاین بگیرند'
                  : 'دکمه‌ی رزرو آنلاین برای مشتری‌ها نمایش داده نمی‌شود'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleToggleBooking}
            disabled={isTogglingBooking}
            aria-label="روشن/خاموش کردن نوبت‌دهی آنلاین"
            className={`w-12 h-7 rounded-full shrink-0 transition-colors relative disabled:opacity-60 ${
              bookingEnabled ? 'bg-[#824c71]' : 'bg-zinc-200'
            }`}
          >
            <span
              className="absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all"
              style={{ right: bookingEnabled ? '22px' : '2px' }}
            />
          </button>
        </div>
        {toggleError && <p className="text-red-600 text-[11px] font-medium mt-2.5">{toggleError}</p>}
        {!bookingEnabled && !canEnable && !toggleError && (
          <p className="text-amber-600 text-[11px] font-medium mt-2.5">
            برای فعال‌سازی، ابتدا یک دسته‌بندیِ فعال با حداقل یک خدمتِ فعال بسازید.
          </p>
        )}
      </div>

      <button
        onClick={() => {
          setEditingCategory(null);
          setIsCategoryModalOpen(true);
        }}
        className="w-full flex items-center justify-center gap-2 bg-[#824c71] hover:bg-[#6e3f60] text-white py-3.5 rounded-xl font-medium text-sm transition-colors shadow-lg shadow-[#e3c9dc]/40 mb-6"
      >
        <Plus className="w-4.5 h-4.5" />
        دسته‌بندی جدید
      </button>

      {categories.length === 0 ? (
        <div className="text-center py-16 bg-zinc-50 rounded-2xl">
          <ListChecks className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
          <p className="text-zinc-400 text-sm">هنوز دسته‌بندی‌ای ثبت نکرده‌اید. تا وقتی حداقل یک دسته‌بندی فعال با یک خدمت نداشته باشید، دکمه‌ی رزرو آنلاین برای مشتری‌ها نمایش داده نمی‌شود.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {categories.map((cat) => {
            const isExpanded = expanded.includes(cat.id);
            return (
              <div key={cat.id} className="bg-white border border-zinc-100 rounded-2xl shadow-sm shadow-zinc-200/50 overflow-hidden">
                <div className="flex items-center justify-between p-4">
                  <button type="button" onClick={() => toggleExpand(cat.id)} className="flex items-center gap-2 flex-1 text-right">
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
                    <div>
                      <p className="text-sm font-bold text-zinc-800">{cat.title}</p>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        {cat.services.length.toLocaleString('fa-IR')} خدمت
                        {cat.depositAmount > 0 && ` · بیعانه: ${formatMoney(cat.depositAmount)} تومان`}
                      </p>
                    </div>
                  </button>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => toggleCategoryActive(cat)}
                      className={`text-[11px] font-bold px-2.5 py-1.5 rounded-lg ${cat.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-zinc-100 text-zinc-400'}`}
                    >
                      {cat.isActive ? 'فعال' : 'غیرفعال'}
                    </button>
                    <button
                      onClick={() => {
                        setEditingCategory(cat);
                        setIsCategoryModalOpen(true);
                      }}
                      className="w-8 h-8 flex items-center justify-center rounded-lg bg-zinc-100 text-zinc-500"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(cat.id)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-50 text-red-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-zinc-100 p-4 space-y-2 bg-zinc-50/50">
                    {cat.services.map((item) => (
                      <div key={item.id} className="flex items-center justify-between bg-white rounded-xl p-3 border border-zinc-100">
                        <div>
                          <p className="text-xs font-bold text-zinc-800">{item.name}</p>
                          <p className="text-[11px] text-zinc-400 mt-0.5 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {item.durationMinutes.toLocaleString('fa-IR')} دقیقه
                            {item.price ? ` · ${formatMoney(item.price)} تومان` : ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => toggleItemActive(item)}
                            className={`text-[10px] font-bold px-2 py-1 rounded-md ${item.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-zinc-100 text-zinc-400'}`}
                          >
                            {item.isActive ? 'فعال' : 'غیرفعال'}
                          </button>
                          <button
                            onClick={() => {
                              setEditingItem(item);
                              setActiveCategoryId(cat.id);
                              setIsItemModalOpen(true);
                            }}
                            className="w-7 h-7 flex items-center justify-center rounded-lg bg-zinc-100 text-zinc-500"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-50 text-red-500"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}

                    <button
                      onClick={() => {
                        setEditingItem(null);
                        setActiveCategoryId(cat.id);
                        setIsItemModalOpen(true);
                      }}
                      className="w-full flex items-center justify-center gap-1.5 text-xs font-medium text-[#824c71] bg-white border border-dashed border-zinc-200 rounded-xl py-2.5 mt-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> افزودن خدمت به این دسته
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <CategoryFormModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        onSaved={() => {
          fetchCategories();
          fetchBookingStatus();
        }}
        categoryToEdit={editingCategory}
      />

      {activeCategoryId && (
        <ServiceItemFormModal
          isOpen={isItemModalOpen}
          onClose={() => setIsItemModalOpen(false)}
          onSaved={() => {
            fetchCategories();
            fetchBookingStatus();
          }}
          categoryId={activeCategoryId}
          itemToEdit={editingItem}
        />
      )}
    </div>
  );
}