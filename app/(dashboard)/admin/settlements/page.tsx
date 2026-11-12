// app/(dashboard)/admin/settlements/page.tsx
// پنل تسویه‌ی بیعانه‌ها: به هر سالن‌دار چقدر و به کدام کارت باید واریز شود، و ثبت واریز با کد پیگیری.
'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, ChevronDown, Wallet, Loader2, Copy, Check, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { formatCardNumber, getBankName } from '@/lib/card';

interface SettlementItem {
  salonId: string;
  salonName: string;
  ownerName: string | null;
  ownerPhone: string | null;
  cardNumber: string;
  cardValid: boolean;
  totalOwed: number;
  bookingsCount: number;
}

interface SettlementBooking {
  id: string;
  date: string;
  startTime: string;
  customerName: string | null;
  customerPhone: string;
  depositAmount: number;
}

const fmt = (n: number) => n.toLocaleString('fa-IR');
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('fa-IR', { timeZone: 'UTC' });

export default function AdminSettlementsPage() {
  const [items, setItems] = useState<SettlementItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [details, setDetails] = useState<SettlementBooking[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [reference, setReference] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const [doneMsg, setDoneMsg] = useState('');

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/settlements');
      if (res.status === 403 || res.status === 401) return setAccessDenied(true);
      if (res.ok) setItems((await res.json()).items ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggle = async (salonId: string) => {
    setError('');
    setDoneMsg('');
    setReference('');
    if (expandedId === salonId) return setExpandedId(null);
    setExpandedId(salonId);
    setDetails([]);
    setDetailsLoading(true);
    try {
      const res = await fetch(`/api/admin/settlements?salonId=${encodeURIComponent(salonId)}`);
      if (res.ok) setDetails((await res.json()).bookings ?? []);
    } finally {
      setDetailsLoading(false);
    }
  };

  const copy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    } catch { /* کلیپ‌بورد در دسترس نیست */ }
  };

  // مبلغی که ادمین باید واریز کند = جمع «همین نوبت‌هایی که روی صفحه می‌بیند» (نه جمع لحظه‌ی بعد)
  const detailsTotal = details.reduce((s, b) => s + b.depositAmount, 0);

  const settle = async (salonId: string) => {
    if (!reference.trim()) return setError('کد پیگیری واریز را وارد کنید');
    if (!confirm(`ثبت واریز ${fmt(detailsTotal)} تومان برای ${details.length.toLocaleString('fa-IR')} نوبت؟ این کار قابل بازگشت نیست.`)) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/admin/settlements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ salonId, bookingIds: details.map((b) => b.id), reference: reference.trim() }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) return setError(d.error || 'خطا در ثبت تسویه');
      setDoneMsg(
        d.skipped > 0
          ? `${fmt(d.count)} نوبت تسویه شد؛ ${fmt(d.skipped)} نوبت (لغو یا قبلاً تسویه‌شده) نادیده گرفته شد. مبلغ ثبت‌شده: ${fmt(d.total)} تومان`
          : `تسویه ثبت شد: ${fmt(d.total)} تومان`
      );
      setExpandedId(null);
      await load();
    } catch {
      setError('خطای ارتباط با سرور');
    } finally {
      setSaving(false);
    }
  };

  if (accessDenied) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center px-4">
        <p className="text-zinc-500">شما دسترسی ادمین ندارید.</p>
      </div>
    );
  }

  const grandTotal = items.reduce((s, i) => s + i.totalOwed, 0);

  return (
    <div className="max-w-2xl mx-auto px-3 sm:px-6 py-6 sm:py-10">
      <div className="flex items-center gap-2.5 mb-2">
        <Link href="/admin" className="w-9 h-9 flex items-center justify-center rounded-full bg-zinc-50 text-zinc-500">
          <ChevronRight className="w-4 h-4" />
        </Link>
        <div className="w-10 h-10 bg-zinc-100 rounded-xl flex items-center justify-center text-[#824c71] shrink-0">
          <Wallet className="w-5 h-5" strokeWidth={1.5} />
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-zinc-900">تسویه‌ی بیعانه‌ها</h1>
      </div>
      <p className="text-xs text-zinc-400 mb-5 leading-6">
        فقط نوبت‌های قطعی و پرداخت‌شده‌ی بیعانه‌دار نمایش داده می‌شوند. نوبت لغوشده مشمول استرداد به مشتری است، نه واریز به سالن‌دار.
        هزینه‌ی اپ در این مبلغ‌ها نیست.
      </p>

      {doneMsg && (
        <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-xl px-3.5 py-3 mb-4">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {doneMsg}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 text-[#824c71] animate-spin" /></div>
      ) : items.length === 0 ? (
        <p className="text-center text-zinc-400 text-sm py-16">بیعانه‌ی تسویه‌نشده‌ای وجود ندارد</p>
      ) : (
        <>
          <div className="flex items-center justify-between bg-zinc-50 rounded-xl px-4 py-3 mb-3 text-xs">
            <span className="text-zinc-500">جمع کل بدهی به سالن‌دارها</span>
            <span className="font-bold text-zinc-900 text-sm">{fmt(grandTotal)} تومان</span>
          </div>

          <div className="space-y-2.5">
            {items.map((it) => {
              const open = expandedId === it.salonId;
              const bank = getBankName(it.cardNumber);
              return (
                <div key={it.salonId} className="bg-white border border-zinc-100 rounded-2xl overflow-hidden">
                  <button
                    onClick={() => toggle(it.salonId)}
                    className="w-full flex items-center justify-between gap-3 px-4 py-4 text-right"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-zinc-900 truncate">{it.salonName}</p>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        {fmt(it.bookingsCount)} نوبت{it.ownerName ? ` · ${it.ownerName}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-bold text-[#824c71]">{fmt(it.totalOwed)} تومان</span>
                      <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform ${open ? 'rotate-180' : ''}`} />
                    </div>
                  </button>

                  {open && (
                    <div className="border-t border-zinc-100 px-4 py-4 space-y-3">
                      {/* کارت مقصد */}
                      {it.cardValid ? (
                        <div className="bg-zinc-50 rounded-xl px-3.5 py-3">
                          <p className="text-[11px] text-zinc-400 mb-1">شماره کارت مقصد{bank ? ` (${bank})` : ''}</p>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-base font-bold text-zinc-900 tracking-wider" dir="ltr">{formatCardNumber(it.cardNumber)}</span>
                            <button
                              onClick={() => copy(it.cardNumber, `c-${it.salonId}`)}
                              className="text-zinc-500 p-1.5 rounded-full hover:bg-zinc-200"
                              title="کپی شماره کارت"
                            >
                              {copied === `c-${it.salonId}` ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                            </button>
                          </div>
                          {it.ownerPhone && <p className="text-[11px] text-zinc-400 mt-1.5" dir="ltr">{it.ownerPhone}</p>}
                        </div>
                      ) : (
                        <div className="flex items-start gap-2 bg-red-50 text-red-600 text-xs rounded-xl px-3.5 py-3">
                          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                          شماره کارت معتبری برای این سالن ثبت نشده است؛ با سالن‌دار تماس بگیرید{it.ownerPhone ? ` (${it.ownerPhone})` : ''}.
                        </div>
                      )}

                      {/* ریز نوبت‌ها */}
                      {detailsLoading ? (
                        <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 text-[#824c71] animate-spin" /></div>
                      ) : (
                        <>
                          <div className="max-h-64 overflow-y-auto divide-y divide-zinc-100 text-xs">
                            {details.map((b) => (
                              <div key={b.id} className="flex items-center justify-between gap-3 py-2">
                                <span className="min-w-0 truncate text-zinc-700">
                                  {b.customerName || 'بدون نام'} · <span dir="ltr">{b.customerPhone}</span>
                                  <span className="text-zinc-400"> · {fmtDate(b.date)} {b.startTime}</span>
                                </span>
                                <span className="font-bold text-zinc-800 shrink-0">{fmt(b.depositAmount)}</span>
                              </div>
                            ))}
                          </div>

                          <div className="flex items-center justify-between text-sm border-t border-zinc-100 pt-3">
                            <span className="text-zinc-500">مبلغ قابل واریز</span>
                            <span className="font-bold text-[#824c71]">{fmt(detailsTotal)} تومان</span>
                          </div>

                          <input
                            value={reference}
                            onChange={(e) => setReference(e.target.value)}
                            placeholder="کد پیگیری واریز (بعد از انتقال وجه)"
                            maxLength={60}
                            className="w-full border border-zinc-200 rounded-[10px] px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#824c71] focus:ring-1 focus:ring-[#824c71]/20"
                          />
                          {error && <p className="text-red-500 text-xs font-medium">{error}</p>}
                          <button
                            onClick={() => settle(it.salonId)}
                            disabled={saving || details.length === 0 || !it.cardValid}
                            className="w-full bg-[#824c71] text-white rounded-[10px] py-3 text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2"
                          >
                            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                            واریز کردم؛ ثبت تسویه
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
