//app/(dashboard)/profile/accounting/page.tsx
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ArrowRight, Plus, Loader2, User, Clock, Calendar, Pencil, Trash2,
  Users, ChevronRight as ChevronRightIcon, ChevronLeft as ChevronLeftIcon, ChevronLeft
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import CreateVisitModal, { VisitForEdit } from '@/components/business/CreateVisitModal';

type ServiceItem = { name: string; price: number; staffId?: string | null; staffName?: string | null; staffPercent?: number };
type Visit = {
  id: string;
  customerName: string | null;
  customerPhone: string;
  visitDate: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  services: ServiceItem[];
  totalAmount: number;
  paymentStatus: 'PENDING' | 'SUCCESS' | 'FAILED';
};
type StaffMember = { id: string; name: string };

type TabKey = 'visits' | 'staff';
const MAX_DAYS_BACK = 6; // امروز + ۶ روز قبل = ۷ روز

function startOfDay(d: Date) {
  const nd = new Date(d);
  nd.setHours(0, 0, 0, 0);
  return nd;
}

function getDateForOffset(offset: number) {
  const d = startOfDay(new Date());
  d.setDate(d.getDate() - offset);
  return d;
}

function getDayLabel(offset: number, date: Date) {
  if (offset === 0) return 'امروز';
  if (offset === 1) return 'دیروز';
  return date.toLocaleDateString('fa-IR', { weekday: 'long', day: 'numeric', month: 'long' });
}

export default function AccountingPage() {
  const router = useRouter();
  const [userPhone, setUserPhone] = useState('');
  const [visits, setVisits] = useState<Visit[]>([]);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVisit, setEditingVisit] = useState<VisitForEdit | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('visits');
  const [visitDayOffset, setVisitDayOffset] = useState(0);

  // مدیریت پرسنل
  const [newStaffName, setNewStaffName] = useState('');
  const [isSavingStaff, setIsSavingStaff] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [editingStaffName, setEditingStaffName] = useState('');

  const fetchVisits = useCallback(async (phone: string) => {
    setIsFetching(true);
    try {
      const res = await fetch(`/api/visit?scope=salon&userPhone=${phone}`);
      if (res.ok) {
        const data = await res.json();
        setVisits(data.visits || []);
      }
    } catch (error) {
      console.error('خطا در دریافت مراجعه‌ها:', error);
    } finally {
      setIsFetching(false);
    }
  }, []);

  const fetchStaff = useCallback(async (phone: string) => {
    try {
      const res = await fetch(`/api/staff?userPhone=${phone}`);
      if (res.ok) {
        const data = await res.json();
        setStaffList(data.staff || []);
      }
    } catch (error) {
      console.error('خطا در دریافت پرسنل:', error);
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
      fetchVisits(user.phone);
      fetchStaff(user.phone);
    };
    init();
  }, [router, fetchVisits, fetchStaff]);

  const totalIncome = visits.reduce((sum, v) => sum + v.totalAmount, 0);
  const totalCommission = visits.reduce(
    (sum, v) => sum + v.services.reduce((s, item) => s + (item.price * (item.staffPercent || 0)) / 100, 0),
    0
  );

  const openCreateModal = () => {
    setEditingVisit(null);
    setIsModalOpen(true);
  };

  const openEditModal = (visit: Visit) => {
    setEditingVisit({
      id: visit.id,
      customerPhone: visit.customerPhone,
      customerName: visit.customerName,
      visitDate: visit.visitDate,
      checkInTime: visit.checkInTime,
      checkOutTime: visit.checkOutTime,
      services: visit.services.map((s) => ({
        name: s.name,
        price: s.price,
        staffId: s.staffId || null,
        staffPercent: s.staffPercent || 0,
      })),
    });
    setIsModalOpen(true);
  };

  const handleDeleteVisit = async (visitId: string) => {
    if (!window.confirm('آیا از حذف این مراجعه مطمئن هستید؟')) return;
    try {
      const res = await fetch(`/api/visit/${visitId}?userPhone=${userPhone}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'خطا در حذف مراجعه');
      fetchVisits(userPhone);
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
        body: JSON.stringify({ userPhone, name: newStaffName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'خطا در افزودن پرسنل');
      setStaffList((prev) => [...prev, data.staff]);
      setNewStaffName('');
    } catch (error: any) {
      alert(error.message || 'خطایی رخ داد.');
    } finally {
      setIsSavingStaff(false);
    }
  };

  const handleRenameStaff = async (id: string) => {
    if (!editingStaffName.trim()) return;
    try {
      const res = await fetch(`/api/staff/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userPhone, name: editingStaffName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'خطا در ویرایش پرسنل');
      setStaffList((prev) => prev.map((s) => (s.id === id ? data.staff : s)));
      setEditingStaffId(null);
      setEditingStaffName('');
    } catch (error: any) {
      alert(error.message || 'خطایی رخ داد.');
    }
  };

  const handleDeleteStaff = async (id: string) => {
    if (!window.confirm('آیا از حذف این پرسنل مطمئن هستید؟ تاریخچه مراجعه‌های قبلی حفظ می‌ماند.')) return;
    try {
      const res = await fetch(`/api/staff/${id}?userPhone=${userPhone}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'خطا در حذف پرسنل');
      setStaffList((prev) => prev.filter((s) => s.id !== id));
    } catch (error: any) {
      alert(error.message || 'خطایی رخ داد.');
    }
  };

  const selectedVisitDate = getDateForOffset(visitDayOffset);
  const visitDayLabel = getDayLabel(visitDayOffset, selectedVisitDate);
  const selectedDayVisits = useMemo(
    () => visits.filter((v) => startOfDay(new Date(v.visitDate)).getTime() === selectedVisitDate.getTime()),
    [visits, selectedVisitDate]
  );

  const tabs: { key: TabKey; label: string; icon: any }[] = [
    { key: 'visits', label: 'مراجعه‌ها', icon: Calendar },
    { key: 'staff', label: 'پرسنل', icon: Users },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-white pb-32">
      <div className="max-w-lg mx-auto w-full px-4 pt-6">
        <Link href="/profile" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-700 transition-colors mb-5">
          <ArrowRight className="w-4 h-4" /> بازگشت
        </Link>

        <div className="flex items-center justify-between mb-5">
          <h1 className="text-base font-bold text-zinc-900">حسابداری</h1>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-1.5 bg-[#824c71] text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-[#6d3f5e] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> ثبت مراجعه
          </button>
        </div>

        {/* کارت‌های درآمد و پورسانت: الان لینک به صفحه جدا هستن */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <Link
            href="/profile/accounting/income"
            className="group bg-[#824c71]/5 border border-[#824c71]/15 rounded-2xl p-4 text-right hover:bg-[#824c71]/10 transition-colors"
          >
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-zinc-500">درآمد کل</p>
              <ChevronLeft className="w-3.5 h-3.5 text-[#824c71] group-hover:-translate-x-0.5 transition-transform" />
            </div>
            <p className="text-lg font-bold text-[#824c71]">{totalIncome.toLocaleString('fa-IR')}</p>
            <p className="text-[10px] text-zinc-400">تومان</p>
          </Link>

          <Link
            href="/profile/accounting/commission"
            className="group bg-zinc-50 border border-zinc-100 rounded-2xl p-4 text-right hover:bg-zinc-100 transition-colors"
          >
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-zinc-500">پورسانت پرسنل</p>
              <ChevronLeft className="w-3.5 h-3.5 text-zinc-500 group-hover:-translate-x-0.5 transition-transform" />
            </div>
            <p className="text-lg font-bold text-zinc-700">{Math.round(totalCommission).toLocaleString('fa-IR')}</p>
            <p className="text-[10px] text-zinc-400">تومان</p>
          </Link>
        </div>

        {/* تب‌ها: فقط مراجعه‌ها و پرسنل */}
        <div className="flex items-center gap-1.5 bg-zinc-50 rounded-2xl p-1.5 mb-5">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-colors ${
                  active ? 'bg-white text-[#824c71] shadow-sm' : 'text-zinc-500'
                }`}
              >
                <Icon className="w-3.5 h-3.5" /> {tab.label}
              </button>
            );
          })}
        </div>

        {isFetching ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-[#824c71] animate-spin mb-3" />
            <p className="text-sm text-zinc-400">در حال دریافت اطلاعات...</p>
          </div>
        ) : (
          <>
            {/* تب مراجعه‌ها: یک روز در هر بار، با ناوبری فلشی */}
            {activeTab === 'visits' && (
              <div>
                <div className="flex items-center justify-between bg-zinc-50 rounded-2xl p-2 mb-4">
                  <button
                    onClick={() => setVisitDayOffset((v) => Math.max(v - 1, 0))}
                    disabled={visitDayOffset <= 0}
                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-white text-zinc-600 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-zinc-100 transition-colors shrink-0"
                    aria-label="روز بعد"
                  >
                    <ChevronRightIcon className="w-5 h-5" />
                  </button>

                  <div className="text-center">
                    <p className="text-sm font-bold text-zinc-800">{visitDayLabel}</p>
                    {selectedDayVisits.length > 0 && (
                      <p className="text-[11px] text-zinc-400 mt-0.5">{selectedDayVisits.length.toLocaleString('fa-IR')} مراجعه</p>
                    )}
                  </div>

                  <button
                    onClick={() => setVisitDayOffset((v) => Math.min(v + 1, MAX_DAYS_BACK))}
                    disabled={visitDayOffset >= MAX_DAYS_BACK}
                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-white text-zinc-600 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-zinc-100 transition-colors shrink-0"
                    aria-label="روز قبل"
                  >
                    <ChevronLeftIcon className="w-5 h-5" />
                  </button>
                </div>

                {selectedDayVisits.length === 0 ? (
                  <p className="text-sm text-zinc-400 text-center py-12">مراجعه‌ای برای این روز ثبت نشده است.</p>
                ) : (
                  <div className="space-y-3">
                    {selectedDayVisits.map((visit) => (
                      <div key={visit.id} className="border border-zinc-100 rounded-2xl p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1.5 text-sm font-bold text-zinc-900">
                            <User className="w-3.5 h-3.5 text-[#824c71]" />
                            {visit.customerName || visit.customerPhone}
                          </div>
                          <span
                            className={`text-[10px] px-2 py-1 rounded-full font-medium ${
                              visit.paymentStatus === 'SUCCESS'
                                ? 'bg-green-50 text-green-600'
                                : visit.paymentStatus === 'FAILED'
                                ? 'bg-red-50 text-red-500'
                                : 'bg-amber-50 text-amber-600'
                            }`}
                          >
                            {visit.paymentStatus === 'SUCCESS' ? 'پرداخت‌شده' : visit.paymentStatus === 'FAILED' ? 'ناموفق' : 'در انتظار پرداخت'}
                          </span>
                        </div>

                        {visit.checkInTime && (
                          <div className="flex items-center gap-1 text-xs text-zinc-400 mb-3">
                            <Clock className="w-3 h-3" /> {visit.checkInTime} - {visit.checkOutTime || '—'}
                          </div>
                        )}

                        <div className="space-y-1.5">
                          {visit.services.map((s, i) => (
                            <div key={i} className="flex items-center justify-between text-xs bg-zinc-50 rounded-lg px-3 py-2">
                              <span className="text-zinc-600">
                                {s.name} {s.staffName ? `· ${s.staffName}` : ''} {s.staffPercent ? `(${s.staffPercent}٪)` : ''}
                              </span>
                              <span className="font-medium text-zinc-800">{s.price.toLocaleString('fa-IR')} ت</span>
                            </div>
                          ))}
                        </div>

                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-100">
                          <span className="text-xs text-zinc-500">مبلغ کل</span>
                          <span className="text-sm font-bold text-[#824c71]">{visit.totalAmount.toLocaleString('fa-IR')} تومان</span>
                        </div>

                        <div className="flex items-center gap-2 mt-3">
                          <button
                            onClick={() => openEditModal(visit)}
                            className="flex-1 flex items-center justify-center gap-1.5 border border-zinc-200 rounded-xl py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-50 transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" /> ویرایش
                          </button>
                          <button
                            onClick={() => handleDeleteVisit(visit.id)}
                            className="flex-1 flex items-center justify-center gap-1.5 border border-red-100 rounded-xl py-2 text-xs font-bold text-red-500 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> حذف
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* تب پرسنل */}
            {activeTab === 'staff' && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <input
                    value={newStaffName}
                    onChange={(e) => setNewStaffName(e.target.value)}
                    placeholder="نام پرسنل جدید"
                    className="flex-1 border border-zinc-200 rounded-xl px-3.5 py-2.5 text-sm focus:border-[#824c71] focus:ring-2 focus:ring-[#824c71]/10 outline-none transition-all"
                  />
                  <button
                    onClick={handleAddStaff}
                    disabled={isSavingStaff}
                    className="flex items-center gap-1.5 bg-[#824c71] text-white px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-[#6d3f5e] transition-colors disabled:opacity-50"
                  >
                    {isSavingStaff ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />} افزودن
                  </button>
                </div>

                {staffList.length === 0 ? (
                  <p className="text-sm text-zinc-400 text-center py-10">هنوز پرسنلی ثبت نشده است.</p>
                ) : (
                  staffList.map((staff) => (
                    <div key={staff.id} className="flex items-center justify-between border border-zinc-100 rounded-2xl p-3.5">
                      {editingStaffId === staff.id ? (
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            value={editingStaffName}
                            onChange={(e) => setEditingStaffName(e.target.value)}
                            className="flex-1 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:border-[#824c71] outline-none"
                            autoFocus
                          />
                          <button onClick={() => handleRenameStaff(staff.id)} className="text-xs font-bold text-[#824c71] px-2">
                            ذخیره
                          </button>
                          <button onClick={() => setEditingStaffId(null)} className="text-xs font-bold text-zinc-400 px-2">
                            انصراف
                          </button>
                        </div>
                      ) : (
                        <>
                          <span className="text-sm font-medium text-zinc-800">{staff.name}</span>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => {
                                setEditingStaffId(staff.id);
                                setEditingStaffName(staff.name);
                              }}
                              className="w-8 h-8 flex items-center justify-center rounded-lg bg-zinc-50 text-zinc-500 hover:bg-zinc-100 transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteStaff(staff.id)}
                              className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </div>

      <CreateVisitModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaved={() => fetchVisits(userPhone)}
        userPhone={userPhone}
        editingVisit={editingVisit}
      />
    </div>
  );
}