// app/admin/support/[id]/page.tsx
'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, CheckCircle2, User, Send, Trash2 } from 'lucide-react';

type SupportStatus = 'PENDING' | 'IN_PROGRESS' | 'ANSWERED' | 'CLOSED';
type Sender = 'USER' | 'ADMIN';

interface ThreadItem {
  id: string;
  sender: Sender;
  message: string;
  createdAt: string;
}

const statusMap: Record<SupportStatus, { label: string; className: string }> = {
  PENDING: { label: 'در انتظار بررسی', className: 'bg-zinc-100 text-zinc-500' },
  IN_PROGRESS: { label: 'در حال بررسی', className: 'bg-amber-50 text-amber-600' },
  ANSWERED: { label: 'پاسخ داده شد', className: 'bg-emerald-50 text-emerald-600' },
  CLOSED: { label: 'بسته شده', className: 'bg-zinc-100 text-zinc-400' },
};

const dateFormatter = new Intl.DateTimeFormat('fa-IR', { dateStyle: 'short', timeStyle: 'short' });
const formatDate = (iso: string) => {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '' : dateFormatter.format(d);
};

const readJson = async (res: Response): Promise<any | null> => {
  try {
    return await res.json();
  } catch {
    return null;
  }
};

const fetchWithTimeout = async (input: string, init: RequestInit = {}, ms = 15000) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  init.signal?.addEventListener('abort', () => controller.abort());
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
};

const buildThread = (ticket: any): ThreadItem[] => {
  const replies: any[] = Array.isArray(ticket.replies) ? ticket.replies : [];
  const items: ThreadItem[] = [
    { id: `${ticket.id}-first`, sender: 'USER', message: ticket.message, createdAt: ticket.createdAt },
  ];
  if (ticket.adminReply && replies.length === 0) {
    items.push({
      id: `${ticket.id}-legacy`,
      sender: 'ADMIN',
      message: ticket.adminReply,
      createdAt: ticket.repliedAt || ticket.createdAt,
    });
  }
  replies.forEach((r) => {
    items.push({ id: r.id, sender: r.sender, message: r.message, createdAt: r.createdAt });
  });
  return items;
};

export default function AdminSupportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [userInfo, setUserInfo] = useState<{ name: string | null; phone: string | null; salonName: string | null }>({
    name: null,
    phone: null,
    salonName: null,
  });
  const [status, setStatus] = useState<SupportStatus>('PENDING');
  const [thread, setThread] = useState<ThreadItem[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isFetching, setIsFetching] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const sendingRef = useRef(false);
  const deletingRef = useRef(false);
  const closingRef = useRef(false);
  const loadedRef = useRef(false);

  useEffect(() => {
    setIsTouchDevice(window.matchMedia('(pointer: coarse)').matches);
  }, []);

  const fetchThread = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const res = await fetchWithTimeout(`/api/support/${id}`, { signal, cache: 'no-store' });
        if (res.status === 401) {
          router.push('/login');
          return;
        }
        if (res.status === 403) {
          setAccessDenied(true);
          return;
        }
        if (res.status === 404) {
          setNotFound(true);
          return;
        }
        const data = res.ok ? await readJson(res) : null;
        if (!data?.ticket) {
          if (!loadedRef.current) setLoadError(true);
          return;
        }
        loadedRef.current = true;
        setLoadError(false);
        setStatus(data.ticket.status);
        setUserInfo({
          name: data.ticket.user?.name || data.ticket.name,
          phone: data.ticket.phone || data.ticket.user?.phone,
          salonName: data.ticket.hadSalon ? data.ticket.salonName : null,
        });
        setThread(buildThread(data.ticket));
        if (!data.ticket.seenByAdmin) {
          fetchWithTimeout(`/api/support/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ seenByAdmin: true }),
          }).catch(() => {});
        }
      } catch (error) {
        if (signal?.aborted) return;
        console.error('خطا در دریافت مکالمه:', error);
        if (!loadedRef.current) setLoadError(true);
      } finally {
        if (!signal?.aborted) setIsFetching(false);
      }
    },
    [id, router]
  );

  useEffect(() => {
    const controller = new AbortController();
    loadedRef.current = false;
    setIsFetching(true);
    setNotFound(false);
    setAccessDenied(false);
    setLoadError(false);
    fetchThread(controller.signal);
    return () => controller.abort();
  }, [fetchThread]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thread]);

  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 120) + 'px';
    }
  }, [newMessage]);

  const handleRetry = () => {
    setLoadError(false);
    setIsFetching(true);
    fetchThread();
  };

  const handleSend = async () => {
    const trimmed = newMessage.trim();
    if (!trimmed || sendingRef.current) return;

    sendingRef.current = true;
    setIsSending(true);
    setActionError(null);
    try {
      const res = await fetchWithTimeout(`/api/support/${id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed }),
      });
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      if (res.ok) {
        setNewMessage('');
        await fetchThread();
      } else {
        const err = await readJson(res);
        setActionError(err?.error || 'خطا در ارسال پاسخ');
      }
    } catch (error) {
      console.error(error);
      setActionError('خطای شبکه در ارتباط با سرور');
    } finally {
      sendingRef.current = false;
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (isTouchDevice) return;
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (e.nativeEvent.isComposing) return;
      handleSend();
    }
  };

  const handleClose = async () => {
    if (closingRef.current) return;
    closingRef.current = true;
    setIsClosing(true);
    setActionError(null);
    try {
      const res = await fetchWithTimeout(`/api/support/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CLOSED' }),
      });
      if (res.ok) {
        await fetchThread();
      } else {
        const err = await readJson(res);
        setActionError(err?.error || 'خطا در بستن مکالمه');
      }
    } catch (error) {
      console.error(error);
      setActionError('خطای شبکه در ارتباط با سرور');
    } finally {
      closingRef.current = false;
      setIsClosing(false);
    }
  };

  const handleDelete = async () => {
    if (deletingRef.current) return;
    if (!window.confirm('آیا از حذف کامل این مکالمه مطمئن هستید؟ این عمل غیرقابل بازگشت است.')) return;
    deletingRef.current = true;
    setIsDeleting(true);
    setActionError(null);
    try {
      const res = await fetchWithTimeout(`/api/support/${id}`, { method: 'DELETE' });
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      if (res.ok) {
        router.push('/admin/support');
      } else {
        const err = await readJson(res);
        setActionError(err?.error || 'خطا در حذف مکالمه');
      }
    } catch (error) {
      console.error(error);
      setActionError('خطای شبکه در ارتباط با سرور');
    } finally {
      deletingRef.current = false;
      setIsDeleting(false);
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
    <div className="flex flex-col min-h-dvh bg-white">

      {/* هدر */}
      <div className="sticky top-0 z-10 bg-white border-b border-zinc-100 px-4 py-3.5 flex items-center gap-3">
        <Link
          href="/admin/support"
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-zinc-100 transition-colors shrink-0"
        >
          <ChevronRight className="w-5 h-5 text-zinc-600" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-sm font-bold text-zinc-900 truncate">{userInfo.name || 'کاربر'}</h1>
          <p className="text-[11px] text-zinc-400" dir="ltr">{userInfo.phone}</p>
        </div>
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="w-8 h-8 flex items-center justify-center rounded-full text-zinc-400 hover:bg-red-50 hover:text-red-500 transition-colors shrink-0 disabled:opacity-40"
          aria-label="حذف مکالمه"
        >
          <Trash2 className="w-4 h-4" />
        </button>
        <span className={`text-[11px] px-2.5 py-1 rounded-lg font-medium shrink-0 ${statusMap[status]?.className ?? ''}`}>
          {statusMap[status]?.label ?? ''}
        </span>
      </div>

      {userInfo.salonName && (
        <div className="max-w-2xl mx-auto w-full px-4 pt-3">
          <p className="text-xs text-[#824c71] bg-[#e3c9dc]/15 inline-block px-2.5 py-1 rounded-lg">
            سالن: {userInfo.salonName}
          </p>
        </div>
      )}

      {/* پیام‌ها */}
      <div className="max-w-2xl mx-auto w-full px-4 py-5 space-y-3 flex-1 pb-32">
        {isFetching && <p className="text-center text-zinc-400 text-sm py-14">در حال بارگذاری...</p>}
        {notFound && <p className="text-center text-zinc-400 text-sm py-14">این مکالمه یافت نشد.</p>}

        {loadError && !isFetching && (
          <div className="text-center py-14">
            <p className="text-zinc-500 text-sm mb-3">خطا در دریافت مکالمه.</p>
            <button
              onClick={handleRetry}
              className="text-sm font-semibold text-[#824c71] underline underline-offset-4"
            >
              تلاش مجدد
            </button>
          </div>
        )}

        {thread.map((item) =>
          item.sender === 'USER' ? (
            <div key={item.id} className="flex items-start gap-2 max-w-[85%] mr-auto flex-row-reverse">
              <div className="min-w-0 bg-zinc-50 border border-zinc-200 rounded-xl rounded-tr-sm px-4 py-3 text-[14px] leading-relaxed text-zinc-700 whitespace-pre-wrap break-words">
                <div className="flex items-center gap-1.5 text-zinc-500 text-[11px] font-medium mb-1.5">
                  <User className="w-3.5 h-3.5" /> پیام کاربر
                </div>
                {item.message}
                <div className="text-[10px] text-zinc-400 mt-1.5">{formatDate(item.createdAt)}</div>
              </div>
            </div>
          ) : (
            <div key={item.id} className="flex items-start gap-2 max-w-[85%]">
              <div className="min-w-0 bg-[#e3c9dc]/25 border border-[#e3c9dc]/60 rounded-xl rounded-tl-sm px-4 py-3 text-[14px] leading-relaxed text-zinc-700 whitespace-pre-wrap break-words">
                <div className="flex items-center gap-1.5 text-[#824c71] text-[11px] font-medium mb-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> پاسخ شما
                </div>
                {item.message}
                <div className="text-[10px] text-zinc-400 mt-1.5">{formatDate(item.createdAt)}</div>
              </div>
            </div>
          )
        )}
        <div ref={bottomRef} />
      </div>

      {/* باکس ارسال پاسخ */}
      {!isFetching && !notFound && !loadError && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-zinc-100 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] z-50">
          <div className="max-w-2xl mx-auto">
            {actionError && (
              <p role="alert" className="text-xs text-red-500 pb-2">
                {actionError}
              </p>
            )}
            <div className="flex items-end gap-2">
              {status !== 'CLOSED' && (
                <button
                  onClick={handleClose}
                  disabled={isClosing}
                  className="text-[11px] text-zinc-400 hover:text-zinc-600 px-2 shrink-0 underline self-center disabled:opacity-40"
                >
                  بستن مکالمه
                </button>
              )}
              <textarea
                ref={textareaRef}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value.slice(0, 2000))}
                onKeyDown={handleKeyDown}
                placeholder="پاسخ خود را بنویسید..."
                rows={1}
                maxLength={2000}
                className="flex-1 border border-zinc-200 rounded-xl px-4 py-2.5 text-sm resize-none leading-relaxed max-h-[120px] overflow-y-auto focus:border-[#824c71] focus:ring-2 focus:ring-[#824c71]/15 outline-none transition-all"
              />
              <button
                onClick={handleSend}
                disabled={isSending || !newMessage.trim()}
                className="w-11 h-11 flex items-center justify-center bg-[#824c71] text-white rounded-xl shadow-sm shadow-[#824c71]/30 hover:bg-[#6d3f5e] transition-all active:scale-95 disabled:opacity-40 disabled:shadow-none shrink-0"
                aria-label="ارسال"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}