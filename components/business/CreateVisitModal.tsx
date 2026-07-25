//components/business/CreateVisitModal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Loader2, Clock, UserPlus } from 'lucide-react';
import DatePicker, { DateObject } from 'react-multi-date-picker';
import persian from 'react-date-object/calendars/persian';
import persian_fa from 'react-date-object/locales/persian_fa';

type ServiceRow = { name: string; price: string; staffId: string; staffPercent: string };
type StaffMember = { id: string; name: string };

export type VisitForEdit = {
  id: string;
  customerPhone: string;
  customerName: string | null;
  visitDate: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  services: { name: string; price: number; staffId?: string | null; staffPercent?: number }[];
};

// تبدیل ارقام فارسی/عربی به انگلیسی
const toEnglishDigits = (value: string) => {
  const persianDigits = '۰۱۲۳۴۵۶۷۸۹';
  const arabicDigits = '٠١٢٣٤٥٦٧٨٩';
  return value
    .split('')
    .map((ch) => {
      const pIndex = persianDigits.indexOf(ch);
      if (pIndex !== -1) return String(pIndex);
      const aIndex = arabicDigits.indexOf(ch);
      if (aIndex !== -1) return String(aIndex);
      return ch;
    })
    .join('');
};

const sanitizeDigits = (value: string) => toEnglishDigits(value).replace(/[^0-9]/g, '');

const normalizePhone = (value: string) => {
  const digits = sanitizeDigits(value);
  if (digits.startsWith('98')) return '0' + digits.slice(2);
  if (digits.startsWith('9') && digits.length === 10) return '0' + digits;
  return digits;
};

// فرمت عدد با جداکننده سه‌رقمی (۲۰۰۰۰۰۰ -> 2,000,000)
const formatNumber = (value: string) => {
  const digits = sanitizeDigits(value);
  if (!digits) return '';
  return Number(digits).toLocaleString('en-US');
};

const emptyRow = (): ServiceRow => ({ name: '', price: '', staffId: '', staffPercent: '' });

export default function CreateVisitModal({
  isOpen,
  onClose,
  onSaved,
  userPhone,
  editingVisit,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  userPhone: string;
  editingVisit?: VisitForEdit | null;
}) {
  const isEditMode = !!editingVisit;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [visitDateObj, setVisitDateObj] = useState<DateObject | null>(null);
  const [checkInTime, setCheckInTime] = useState('');
  const [checkOutTime, setCheckOutTime] = useState('');
  const [services, setServices] = useState<ServiceRow[]>([emptyRow()]);

  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [isLoadingStaff, setIsLoadingStaff] = useState(false);
  const [addingStaffFor, setAddingStaffFor] = useState<number | null>(null);
  const [newStaffName, setNewStaffName] = useState('');
  const [isCreatingStaff, setIsCreatingStaff] = useState(false);

  // بارگذاری لیست پرسنل هر بار که مودال باز می‌شود
  useEffect(() => {
    if (!isOpen || !userPhone) return;
    const loadStaff = async () => {
      setIsLoadingStaff(true);
      try {
        const res = await fetch(`/api/staff?userPhone=${userPhone}`);
        if (res.ok) {
          const data = await res.json();
          setStaffList(data.staff || []);
        }
      } catch {
        // بی‌صدا؛ کاربر همچنان می‌تواند خدمت را بدون پرسنل ثبت کند
      } finally {
        setIsLoadingStaff(false);
      }
    };
    loadStaff();
  }, [isOpen, userPhone]);

  // پر کردن فرم در حالت ویرایش
  useEffect(() => {
    if (!isOpen) return;
    if (editingVisit) {
      setCustomerPhone(editingVisit.customerPhone || '');
      setCustomerName(editingVisit.customerName || '');
      setVisitDateObj(new DateObject({ date: new Date(editingVisit.visitDate), calendar: persian }));
      setCheckInTime(editingVisit.checkInTime || '');
      setCheckOutTime(editingVisit.checkOutTime || '');
      setServices(
        editingVisit.services.length
          ? editingVisit.services.map((s) => ({
              name: s.name,
              price: String(s.price),
              staffId: s.staffId || '',
              staffPercent: s.staffPercent ? String(s.staffPercent) : '',
            }))
          : [emptyRow()]
      );
    } else {
      resetForm();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, editingVisit]);

  if (!isOpen) return null;

  const addRow = () => setServices([...services, emptyRow()]);
  const removeRow = (i: number) => {
    if (services.length > 1) setServices(services.filter((_, idx) => idx !== i));
  };
  const updateRow = (i: number, field: keyof ServiceRow, value: string) => {
    const updated = [...services];
    updated[i] = { ...updated[i], [field]: value };
    setServices(updated);
  };

  const totalAmount = services.reduce((sum, s) => sum + (Number(sanitizeDigits(s.price)) || 0), 0);

  const resetForm = () => {
    setCustomerPhone('');
    setCustomerName('');
    setVisitDateObj(null);
    setCheckInTime('');
    setCheckOutTime('');
    setServices([emptyRow()]);
    setAddingStaffFor(null);
    setNewStaffName('');
  };

  const handleCreateStaff = async (rowIndex: number) => {
    if (!newStaffName.trim()) return;
    setIsCreatingStaff(true);
    try {
      const res = await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userPhone, name: newStaffName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'خطا در افزودن پرسنل');

      setStaffList((prev) => [...prev, data.staff]);
      updateRow(rowIndex, 'staffId', data.staff.id);
      setAddingStaffFor(null);
      setNewStaffName('');
    } catch (error: any) {
      alert(error.message || 'خطایی رخ داد.');
    } finally {
      setIsCreatingStaff(false);
    }
  };

  const handleSubmit = async () => {
    const normalizedPhone = normalizePhone(customerPhone);

    if (!normalizedPhone.trim() || !visitDateObj) {
      alert('شماره مشتری و تاریخ مراجعه الزامی است.');
      return;
    }
    const validServices = services.filter((s) => s.name.trim() && Number(sanitizeDigits(s.price)) > 0);
    if (validServices.length === 0) {
      alert('حداقل یک خدمت معتبر وارد کنید.');
      return;
    }

    setIsSubmitting(true);
    try {
      const gregorianDate = visitDateObj.toDate();

      const payload = {
        userPhone,
        customerPhone: normalizedPhone,
        customerName: customerName.trim() || undefined,
        visitDate: gregorianDate.toISOString(),
        checkInTime: checkInTime || undefined,
        checkOutTime: checkOutTime || undefined,
        services: validServices.map((s) => ({
          name: s.name.trim(),
          price: Number(sanitizeDigits(s.price)),
          staffId: s.staffId || undefined,
          staffPercent: s.staffPercent ? Number(sanitizeDigits(s.staffPercent)) : 0,
        })),
      };

      const url = isEditMode ? `/api/visit/${editingVisit!.id}` : '/api/visit';
      const method = isEditMode ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'خطا در ثبت مراجعه');

      resetForm();
      onSaved();
      onClose();
    } catch (error: any) {
      alert(error.message || 'خطایی رخ داد.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/40 backdrop-blur-sm px-0 md:px-4">
      <div className="bg-white w-full md:max-w-lg md:rounded-3xl rounded-t-3xl max-h-[85vh] flex flex-col">
        <div className="shrink-0 bg-white flex items-center justify-between px-5 py-4 border-b border-zinc-100 rounded-t-3xl">
          <h2 className="text-sm font-bold text-zinc-900">{isEditMode ? 'ویرایش مراجعه' : 'ثبت مراجعه جدید'}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg bg-zinc-100 text-zinc-500 hover:bg-zinc-200 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto p-5 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1.5">شماره موبایل مشتری *</label>
              <input
                value={customerPhone}
                onChange={(e) => setCustomerPhone(sanitizeDigits(e.target.value))}
                dir="ltr"
                inputMode="numeric"
                placeholder="09xxxxxxxxx یا 9xxxxxxxxx"
                className="w-full border border-zinc-200 rounded-xl px-3.5 py-2.5 text-sm text-left focus:border-[#824c71] focus:ring-2 focus:ring-[#824c71]/10 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1.5">نام مشتری</label>
              <input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="نام و نام خانوادگی"
                className="w-full border border-zinc-200 rounded-xl px-3.5 py-2.5 text-sm focus:border-[#824c71] focus:ring-2 focus:ring-[#824c71]/10 outline-none transition-all"
              />
            </div>
          </div>

          {/* تاریخ مراجعه (شمسی) */}
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1.5">تاریخ مراجعه *</label>
            <DatePicker
              value={visitDateObj}
              onChange={(date) => setVisitDateObj(date as DateObject)}
              calendar={persian}
              locale={persian_fa}
              calendarPosition="bottom-right"
              inputClass="w-full border border-zinc-200 rounded-xl px-3.5 py-2.5 text-sm focus:border-[#824c71] focus:ring-2 focus:ring-[#824c71]/10 outline-none transition-all"
              containerClassName="w-full"
              placeholder="انتخاب تاریخ"
            />
          </div>

          {/* بازه زمانی مراجعه */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 mb-1.5">
              <Clock className="w-3.5 h-3.5" /> بازه زمانی مراجعه
            </label>
            <div className="flex items-center gap-2 border border-zinc-200 rounded-xl px-3.5 py-2 focus-within:border-[#824c71] focus-within:ring-2 focus-within:ring-[#824c71]/10 transition-all">
              <input
                type="time"
                value={checkInTime}
                onChange={(e) => setCheckInTime(e.target.value)}
                className="flex-1 min-w-0 text-sm outline-none bg-transparent"
              />
              <span className="text-zinc-300 text-xs shrink-0">تا</span>
              <input
                type="time"
                value={checkOutTime}
                onChange={(e) => setCheckOutTime(e.target.value)}
                className="flex-1 min-w-0 text-sm outline-none bg-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-2.5">خدمات انجام‌شده *</label>
            <div className="space-y-3">
              {services.map((s, i) => (
                <div key={i} className="border border-zinc-200 rounded-2xl p-3.5 space-y-2.5 bg-zinc-50/60">
                  <div className="flex items-center gap-2">
                    <input
                      value={s.name}
                      onChange={(e) => updateRow(i, 'name', e.target.value)}
                      placeholder="نام خدمت (مثلاً میکاپ)"
                      className="flex-1 border border-zinc-200 rounded-xl px-3.5 py-2.5 text-sm bg-white focus:border-[#824c71] focus:ring-2 focus:ring-[#824c71]/10 outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => removeRow(i)}
                      disabled={services.length === 1}
                      className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-zinc-200 text-zinc-400 hover:bg-red-50 hover:border-red-200 hover:text-red-500 transition-colors disabled:opacity-30 shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] text-zinc-400 mb-1">هزینه (تومان)</label>
                      <input
                        value={formatNumber(s.price)}
                        onChange={(e) => updateRow(i, 'price', sanitizeDigits(e.target.value))}
                        inputMode="numeric"
                        placeholder="مثلاً 200,000"
                        dir="ltr"
                        className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm bg-white text-left focus:border-[#824c71] focus:ring-2 focus:ring-[#824c71]/10 outline-none transition-all"
                      />
                    </div>

                    {/* انتخاب پرسنل از لیست ثابت به‌جای تایپ آزاد */}
                    <div>
                      <label className="block text-[10px] text-zinc-400 mb-1">پرسنل</label>
                      {addingStaffFor === i ? (
                        <div className="flex items-center gap-1">
                          <input
                            value={newStaffName}
                            onChange={(e) => setNewStaffName(e.target.value)}
                            placeholder="نام پرسنل جدید"
                            className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm bg-white focus:border-[#824c71] focus:ring-2 focus:ring-[#824c71]/10 outline-none transition-all"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => handleCreateStaff(i)}
                            disabled={isCreatingStaff}
                            className="w-9 h-9 shrink-0 flex items-center justify-center rounded-lg bg-[#824c71] text-white disabled:opacity-50"
                          >
                            {isCreatingStaff ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      ) : (
                        <select
                          value={s.staffId}
                          onChange={(e) => {
                            if (e.target.value === '__new__') {
                              setAddingStaffFor(i);
                              setNewStaffName('');
                            } else {
                              updateRow(i, 'staffId', e.target.value);
                            }
                          }}
                          className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm bg-white focus:border-[#824c71] focus:ring-2 focus:ring-[#824c71]/10 outline-none transition-all"
                        >
                          <option value="">بدون پرسنل</option>
                          {staffList.map((st) => (
                            <option key={st.id} value={st.id}>
                              {st.name}
                            </option>
                          ))}
                          <option value="__new__">+ افزودن پرسنل جدید</option>
                        </select>
                      )}
                    </div>

                    <div>
                      <label className="block text-[10px] text-zinc-400 mb-1">درصد پرسنل</label>
                      <input
                        value={s.staffPercent}
                        onChange={(e) => updateRow(i, 'staffPercent', sanitizeDigits(e.target.value))}
                        inputMode="numeric"
                        placeholder="مثلاً 30"
                        dir="ltr"
                        className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm bg-white text-left focus:border-[#824c71] focus:ring-2 focus:ring-[#824c71]/10 outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-4 mt-3">
              <button
                type="button"
                onClick={addRow}
                className="flex items-center gap-1.5 text-sm font-medium text-[#824c71] hover:text-[#6d3f5e] transition-colors"
              >
                <Plus className="w-4 h-4" /> افزودن خدمت دیگر
              </button>
              {isLoadingStaff && (
                <span className="flex items-center gap-1 text-xs text-zinc-400">
                  <Loader2 className="w-3 h-3 animate-spin" /> بارگذاری پرسنل...
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-zinc-100">
            <span className="text-sm font-medium text-zinc-500">مبلغ کل</span>
            <span className="text-base font-bold text-[#824c71]">{totalAmount.toLocaleString('fa-IR')} تومان</span>
          </div>
        </div>

        <div className="shrink-0 p-5 pt-3 border-t border-zinc-100">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full bg-[#824c71] text-white py-3.5 rounded-2xl text-sm font-bold hover:bg-[#6d3f5e] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {isSubmitting ? 'در حال ثبت...' : isEditMode ? 'ذخیره تغییرات' : 'ثبت مراجعه'}
          </button>
        </div>
      </div>
    </div>
  );
}

