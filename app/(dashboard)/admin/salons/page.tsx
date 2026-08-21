// app/(dashboard)/admin/salons/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Store, Filter, ChevronRight, ChevronDown, MapPin, Phone, User,
  CheckCircle2, XCircle, Loader2, ExternalLink, Users,
} from 'lucide-react';

type SalonStatus = 'PENDING_PAYMENT' | 'PENDING_APPROVAL' | 'ACTIVE' | 'REJECTED' | 'INACTIVE';

interface AdminSalon {
  id: string;
  name: string;
  province: string;
  city: string;
  district: string | null;
  address: string;
  phones: string[];
  workingHours: string;
  imageUrl: string;
  description: string;
  status: SalonStatus;
  rejectionReason: string | null;
  createdAt: string;
  genderAudience: 'FEMALE' | 'MALE' | 'BOTH';
  hasHomeService: boolean;
  user: { name: string | null; phone: string | null };
  socials: any;
}

const statusMap: Record<SalonStatus, { label: string; className: string }> = {
  PENDING_PAYMENT: { label: 'در انتظار پرداخت', className: 'bg-zinc-100 text-zinc-500' },
  PENDING_APPROVAL: { label: 'در انتظار تایید', className: 'bg-amber-50 text-amber-600' },
  ACTIVE: { label: 'فعال', className: 'bg-emerald-50 text-emerald-600' },
  REJECTED: { label: 'رد شده', className: 'bg-red-50 text-red-600' },
  INACTIVE: { label: 'غیرفعال', className: 'bg-zinc-100 text-zinc-400' },
};

const genderMap: Record<string, string> = {
  FEMALE: 'مخصوص خانم‌ها',
  MALE: 'مخصوص آقایون',
  BOTH: 'خانم‌ها و آقایون',
};

export default function AdminSalonsPage() {
  const [salons, setSalons] = useState<AdminSalon[]>([]);
  const [statusFilter, setStatusFilter] = useState<SalonStatus | 'ALL'>('PENDING_APPROVAL');
  const [isLoading, setIsLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const fetchSalons = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/salons?status=${statusFilter}`);
      if (res.status === 403) {
        setAccessDenied(true);
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setSalons(data.salons);
      }
    } catch (error) {
      console.error('خطا در دریافت لیست سالن‌ها:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSalons();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const handleApprove = async (id: string) => {
    setActioningId(id);
    try {
      const res = await fetch(`/api/admin/salons/${id}/approve`, { method: 'POST' });
      if (res.ok) {
        setSalons((prev) => prev.filter((s) => s.id !== id));
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || 'خطا در تایید سالن');
      }
    } catch {
      alert('خطای شبکه در ارتباط با سرور');
    } finally {
      setActioningId(null);
    }
  };

  const handleReject = async (id: string) => {
    setActioningId(id);
    try {
      const res = await fetch(`/api/admin/salons/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason.trim() }),
      });
      if (res.ok) {
        setSalons((prev) => prev.filter((s) => s.id !== id));
        setRejectingId(null);
        setRejectReason('');
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || 'خطا در رد کردن سالن');
      }
    } catch {
      alert('خطای شبکه در ارتباط با سرور');
    } finally {
      setActioningId(null);
    }
  };

  if (accessDenied) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center px-4">
        <p className="text-zinc-500">شما دسترسی ادمین ندارید.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-3 sm:px-6 py-6 sm:py-10">
      <Link href="/admin" className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700 mb-4">
        <ChevronRight className="w-4 h-4" /> پنل مدیریت
      </Link>

      <div className="flex items-center justify-between mb-6 gap-2">
        <h1 className="text-xl sm:text-2xl font-bold text-zinc-900">تایید سالن‌ها</h1>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-zinc-400 shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="border border-zinc-200 rounded-lg px-2.5 py-1.5 text-sm bg-white"
          >
            <option value="PENDING_APPROVAL">در انتظار تایید</option>
            <option value="ACTIVE">فعال</option>
            <option value="REJECTED">رد شده</option>
            <option value="PENDING_PAYMENT">در انتظار پرداخت</option>
            <option value="INACTIVE">غیرفعال</option>
            <option value="ALL">همه</option>
          </select>
        </div>
      </div>

      {isLoading && <p className="text-center text-zinc-400 text-sm py-14">در حال بارگذاری...</p>}

      {!isLoading && salons.length === 0 && (
        <div className="text-center py-14">
          <Store className="w-10 h-10 text-zinc-300 mx-auto mb-3" strokeWidth={1.5} />
          <p className="text-zinc-400 text-sm">سالنی در این وضعیت وجود ندارد</p>
        </div>
      )}

      <div className="space-y-2.5">
        {salons.map((salon) => {
          const isExpanded = expandedId === salon.id;
          const isActioning = actioningId === salon.id;
          const isRejecting = rejectingId === salon.id;

          return (
            <div key={salon.id} className="border border-zinc-100 rounded-2xl overflow-hidden bg-white">
              <button
                type="button"
                onClick={() => setExpandedId(isExpanded ? null : salon.id)}
                className="w-full flex items-start gap-3 px-4 py-3.5 hover:bg-zinc-50 transition-colors text-right"
              >
                <div className="w-11 h-11 rounded-xl bg-zinc-100 flex items-center justify-center shrink-0 overflow-hidden">
                  {salon.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={salon.imageUrl} alt={salon.name} className="w-full h-full object-cover" />
                  ) : (
                    <Store className="w-5 h-5 text-[#824c71]" strokeWidth={1.5} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-bold text-sm text-zinc-900 truncate">{salon.name}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-md font-medium shrink-0 ${statusMap[salon.status].className}`}>
                      {statusMap[salon.status].label}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 truncate">
                    {salon.province}، {salon.city}
                    {salon.district ? `، ${salon.district}` : ''}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-zinc-400">{salon.user?.name || 'بدون نام'}</span>
                    <span className="text-[10px] text-zinc-300">•</span>
                    <span className="text-[10px] text-zinc-400">
                      {new Date(salon.createdAt).toLocaleDateString('fa-IR')}
                    </span>
                  </div>
                </div>
                <ChevronDown className={`w-4 h-4 text-zinc-400 shrink-0 mt-1 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
              </button>

              {isExpanded && (
                <div className="border-t border-zinc-100 px-4 py-4 space-y-3 bg-zinc-50/50">
                  <div className="flex items-start gap-2 text-xs text-zinc-600">
                    <User className="w-3.5 h-3.5 text-zinc-400 shrink-0 mt-0.5" />
                    <span>{salon.user?.name || 'بدون نام'} — <span dir="ltr">{salon.user?.phone || '-'}</span></span>
                  </div>

                  <div className="flex items-start gap-2 text-xs text-zinc-600">
                    <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0 mt-0.5" />
                    <span>{salon.address}</span>
                  </div>

                  {salon.phones?.length > 0 && (
                    <div className="flex items-start gap-2 text-xs text-zinc-600">
                      <Phone className="w-3.5 h-3.5 text-zinc-400 shrink-0 mt-0.5" />
                      <span dir="ltr">{salon.phones.join(' - ')}</span>
                    </div>
                  )}

                  <div className="flex items-start gap-2 text-xs text-zinc-600">
                    <Users className="w-3.5 h-3.5 text-zinc-400 shrink-0 mt-0.5" />
                    <span>
                      {genderMap[salon.genderAudience]}
                      {salon.hasHomeService ? ' • دارای خدمات در محل' : ''}
                    </span>
                  </div>

                  {salon.description && (
                    <p className="text-xs text-zinc-600 leading-6 bg-white border border-zinc-100 rounded-xl px-3 py-2.5">
                      {salon.description}
                    </p>
                  )}

                  {salon.status === 'REJECTED' && salon.rejectionReason && (
                    <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">
                      دلیل رد قبلی: {salon.rejectionReason}
                    </p>
                  )}

                  <Link
                    href={`/salon/${salon.id}`}
                    target="_blank"
                    className="inline-flex items-center gap-1.5 text-xs text-[#824c71] font-medium"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> مشاهده صفحه عمومی سالن
                  </Link>

                  {(salon.status === 'PENDING_APPROVAL' || salon.status === 'REJECTED') && (
                    <div className="pt-2 border-t border-zinc-100">
                      {!isRejecting ? (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={isActioning}
                            onClick={() => handleApprove(salon.id)}
                            className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"
                          >
                            {isActioning ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                            تایید سالن
                          </button>
                          {salon.status === 'PENDING_APPROVAL' && (
                            <button
                              type="button"
                              disabled={isActioning}
                              onClick={() => { setRejectingId(salon.id); setRejectReason(''); }}
                              className="flex-1 flex items-center justify-center gap-1.5 bg-red-50 text-red-600 py-2.5 rounded-xl text-sm font-medium hover:bg-red-100 transition-colors disabled:opacity-50"
                            >
                              <XCircle className="w-4 h-4" />
                              رد کردن
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <textarea
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="دلیل رد شدن (اختیاری، برای اطلاع سالن‌دار)"
                            rows={2}
                            className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-xs focus:border-red-300 focus:ring-2 focus:ring-red-100 outline-none transition-all resize-none"
                          />
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              disabled={isActioning}
                              onClick={() => handleReject(salon.id)}
                              className="flex-1 flex items-center justify-center gap-1.5 bg-red-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
                            >
                              {isActioning ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                              تایید رد کردن
                            </button>
                            <button
                              type="button"
                              disabled={isActioning}
                              onClick={() => setRejectingId(null)}
                              className="px-4 py-2.5 rounded-xl text-sm font-medium text-zinc-500 hover:bg-zinc-100 transition-colors"
                            >
                              انصراف
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}