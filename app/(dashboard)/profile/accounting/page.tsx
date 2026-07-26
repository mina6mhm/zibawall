//app/(dashboard)/profile/accounting/page.tsx
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ArrowRight, Plus, Loader2, User, Clock, Calendar, Pencil, Trash2,
  Users, Wallet, ChevronDown, ChevronUp, TrendingUp
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
type RangeKey = 'today' | 'week' | 'month' | 'all';

const RANGE_LABELS: Record<RangeKey, string> = {
  today: 'امروز',
  week: '۷ روز اخیر',
  month: '۳۰ روز اخیر',
  all: 'همه',
};

const DAYS_TO_SHOW = 7;

function isInRange(dateStr: string, range: RangeKey) {
  if (range === 'all') return true;
  const date = new Date(dateStr);
  const now = new Date();
  if (range === 'today') {
    return date.toDateString() === now.toDateString();
  }
  const days = range === 'week' ? 7 : 30;
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - days);
  return date >= cutoff;
}

function startOfDay(d: Date) {
  const nd = new Date(d);
  nd.setHours(0, 0, 0, 0);
  return nd;
}

function getDayLabel(date: Date, todayStart: Date) {
  const diffDays = Math.round((todayStart.getTime() - startOfDay(date).getTime()) / 86400000);
  if (diffDays === 0) return 'امروز';
  if (diffDays === 1) return 'دیروز';
  return date.toLocaleDateString('fa-IR', { weekday: 'long', day: 'numeric', month: 'long' });
}

function getLastDaySlots(n: number) {
  const today = startOfDay(new Date());
  const slots: Date[] = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    slots.push(d);
  }
  return slots; // امروز اول، قدیمی‌ترین آخر
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
  const [reportRange, setReportRange] = useState<RangeKey>('today');

  const [isIncomeExpanded, setIsIncomeExpanded] = useState(false);
  const [isCommissionExpanded, setIsCommissionExpanded] = useState(false);

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

  // گزارش دوره‌ای (برای کارت درآمد کل)
  const rangeVisits = useMemo(() => visits.filter((v) => isInRange(v.visitDate, reportRange)), [visits, reportRange]);
  const rangeIncome = rangeVisits.reduce((sum, v) => sum + v.totalAmount, 0);
  const rangeCommission = rangeVisits.reduce(
    (sum, v) => sum + v.services.reduce((s, item) => s + (item.price * (item.staffPercent || 0)) / 100, 0),
    0
  );

  // مراجعه‌ها به‌صورت روزانه، تا ۷ روز قبل
  const visitsByDaySlots = useMemo(() => {
    const slots = getLastDaySlots(DAYS_TO_SHOW);
    const todayStart = startOfDay(new Date());
    return slots.map((slotDate) => {
      const dayVisits = visits.filter(
        (v) => startOfDay(new Date(v.visitDate)).getTime() === slotDate.getTime()
      );
      return { date: slotDate, label: getDayLabel(slotDate, todayStart), visits: dayVisits };
    });
  }, [visits]);

  // پورسانت پرسنل به‌صورت روزانه، تا ۷ روز قبل (برای کارت پورسانت پرسنل)
  const commissionByDaySlots = useMemo(() => {
    const slots = getLastDaySlots(DAYS_TO_SHOW);
    const todayStart = startOfDay(new Date());
    return slots.map((slotDate) => {
      const dayVisits = visits.filter(
        (v) => startOfDay(new Date(v.visitDate)).getTime() === slotDate.getTime()
      );
      const map = new Map<string, { name: string; totalCommission: number; serviceCount: number }>();
      dayVisits.forEach((v) => {
        v.services.forEach((s) => {
          if (!s.staffPercent) return;
          const key = s.staffId || `unlinked:${s.staffName || 'نامشخص'}`;
          const name = s.staffName || 'بدون پرسنل مشخص';
          const commission = (s.price * (s.staffPercent || 0)) / 100;
          const entry = map.get(key) || { name, totalCommission: 0, serviceCount: 0 };
          entry.totalCommission += commission;
          entry.serviceCount += 1;
          map.set(key, entry);
        });
      });
      const dayTotal = Array.from(map.values()).reduce((sum, e) => sum + e.totalCommission, 0);
      return {
        date: slotDate,
        label: getDayLabel(slotDate, todayStart),
        dayTotal,
        staffEntries: Array.from(map.values()).sort((a, b) => b.totalCommission - a.totalCommission),
      };
    });
  }, [visits]);

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

        {/* کارت درآمد کل: قابل باز شدن -> گزارش دوره‌ای */}
        <div className="grid grid-cols-2 gap-3 mb-2.5">
          <button
            onClick={() => setIsIncomeExpanded((v) => !v)}
            className="bg-[#824c71]/5 border border-[#824c71]/15 rounded-2xl p-4 text-right hover:bg-[#824c71]/10 transition-colors"
          >
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-zinc-500">درآمد کل</p>
              {isIncomeExpanded ? <ChevronUp className="w-3.5 h-3.5 text-[#824c71]" /> : <ChevronDown className="w-3.5 h-3.5 text-[#824c71]" />}
            </div>
            <p className="text-lg font-bold text-[#824c71]">{totalIncome.toLocaleString('fa-IR')}</p>
            <p className="text-[10px] text-zinc-400">تومان</p>
          </button>

          <button
            onClick={() => setIsCommissionExpanded((v) => !v)}
            className="bg-zinc-50 border border-zinc-100 rounded-2xl p-4 text-right hover:bg-zinc-100 transition-colors"
          >
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-zinc-500">پورسانت پرسنل</p>
              {isCommissionExpanded ? <ChevronUp className="w-3.5 h-3.5 text-zinc-500" /> : <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />}
            </div>
            <p className="text-lg font-bold text-zinc-700">{Math.round(totalCommission).toLocaleString('fa-IR')}</p>
            <p className="text-[10px] text-zinc-400">تومان</p>
          </button>
        </div>

        {/* گزارش دوره‌ای باز شده (داخل کارت درآمد کل) */}
        {isIncomeExpanded && (
          <div className="border border-[#824c71]/15 bg-[#824c71]/5 rounded-2xl p-4 mb-2.5 space-y-4">
            <div className="flex items-center gap-2">
              {(Object.keys(RANGE_LABELS) as RangeKey[]).map((key) => (
                <button
                  key={key}
                  onClick={() => setReportRange(key)}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-colors ${
                    reportRange === key ? 'bg-[#824c71] text-white' : 'bg-white text-zinc-500'
                  }`}
                >
                  {RANGE_LABELS[key]}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-xl p-3">
                <p className="text-[11px] text-zinc-500 mb-1">تعداد مراجعه</p>
                <p className="text-base font-bold text-zinc-800">{rangeVisits.length.toLocaleString('fa-IR')}</p>
              </div>
              <div className="bg-white rounded-xl p-3">
                <p className="text-[11px] text-zinc-500 mb-1">درآمد</p>
                <p className="text-base font-bold text-[#824c71]">{rangeIncome.toLocaleString('fa-IR')}</p>
                <p className="text-[10px] text-zinc-400">تومان</p>
              </div>
              <div className="bg-white rounded-xl p-3">
                <p className="text-[11px] text-zinc-500 mb-1">پورسانت پرسنل</p>
                <p className="text-base font-bold text-zinc-700">{Math.round(rangeCommission).toLocaleString('fa-IR')}</p>
                <p className="text-[10px] text-zinc-400">تومان</p>
              </div>
              <div className="bg-white rounded-xl p-3">
                <p className="text-[11px] text-zinc-500 mb-1 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> سود خالص (تقریبی)
                </p>
                <p className="text-base font-bold text-green-600">
                  {Math.round(rangeIncome - rangeCommission).toLocaleString('fa-IR')}
                </p>
                <p className="text-[10px] text-zinc-400">تومان</p>
              </div>
            </div>
          </div>
        )}

        {/* پورسانت روزانه باز شده (داخل کارت پورسانت پرسنل) */}
        {isCommissionExpanded && (
          <div className="border border-zinc-100 bg-zinc-50 rounded-2xl p-4 mb-5 space-y-4">
            {commissionByDaySlots.map((day) => (
              <div key={day.date.toISOString()}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-zinc-700">{day.label}</span>
                  <span className="text-xs font-bold text-[#824c71]">
                    {Math.round(day.dayTotal).toLocaleString('fa-IR')} تومان
                  </span>
                </div>
                {day.staffEntries.length === 0 ? (
                  <p className="text-[11px] text-zinc-400 bg-white rounded-lg px-3 py-2">پورسانتی برای این روز ثبت نشده</p>
                ) : (
                  <div className="space-y-1.5">
                    {day.staffEntries.map((entry, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-white rounded-lg px-3 py-2">
                        <div>
                          <span className="text-xs font-medium text-zinc-800">{entry.name}</span>
                          <span className="text-[10px] text-zinc-400 mr-1.5">
                            ({entry.serviceCount.toLocaleString('fa-IR')} خدمت)
                          </span>
                        </div>
                        <span className="text-xs font-bold text-zinc-700">
                          {Math.round(entry.totalCommission).toLocaleString('fa-IR')} ت
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

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
            {/* تب مراجعه‌ها: روزانه، تا ۷ روز قبل */}
            {activeTab === 'visits' && (
              <div className="space-y-5">
                {visitsByDaySlots.map((day) => (
                  <div key={day.date.toISOString()}>
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="text-sm font-bold text-zinc-800">{day.label}</span>
                      {day.visits.length > 0 && (
                        <span className="text-xs text-zinc-400">{day.visits.length.toLocaleString('fa-IR')} مراجعه</span>
                      )}
                    </div>

                    {day.visits.length === 0 ? (
                      <p className="text-xs text-zinc-400 bg-zinc-50 rounded-xl px-3.5 py-3">مراجعه‌ای برای این روز ثبت نشده</p>
                    ) : (
                      <div className="space-y-3">
                        {day.visits.map((visit) => (
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
                ))}
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