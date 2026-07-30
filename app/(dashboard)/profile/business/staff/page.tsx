// app/(dashboard)/profile/business/staff/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Loader2, Plus, Trash2, Users } from 'lucide-react';

type StaffMember = { id: string; name: string };

export default function StaffPage() {
  const router = useRouter();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [newName, setNewName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const fetchStaff = async () => {
    try {
      const res = await fetch('/api/staff');
      if (res.ok) {
        const data = await res.json();
        setStaff(data.staff || []);
      } else if (res.status === 401) {
        router.push('/login');
      }
    } catch {
      setError('خطا در دریافت لیست پرسنل');
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name) return;

    setError('');
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'خطا در ثبت پرسنل');
        return;
      }

      setStaff((prev) => [...prev, data.staff].sort((a, b) => a.name.localeCompare(b.name, 'fa')));
      setNewName('');
    } catch {
      setError('خطای ارتباط با سرور');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('آیا از حذف این پرسنل مطمئن هستید؟')) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/staff?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setStaff((prev) => prev.filter((s) => s.id !== id));
      } else {
        const data = await res.json();
        alert(data.error || 'خطا در حذف پرسنل');
      }
    } catch {
      alert('خطای ارتباط با سرور');
    } finally {
      setDeletingId(null);
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

  return (
    <div className="flex flex-col min-h-screen bg-white pb-24">
      <div className="max-w-lg mx-auto w-full px-4 pt-6">
        <Link href="/profile/business/overview" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-700 transition-colors mb-5">
          <ArrowRight className="w-4 h-4" /> بازگشت
        </Link>

        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-[#824c71]" />
          <h1 className="text-base font-bold text-zinc-900">پرسنل سالن</h1>
        </div>

        <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
          اسم پرسنل رو یک‌بار اینجا ثبت کن تا موقع ثبت نوبت، از همین لیست انتخابش کنی و اسم‌ها همیشه یکسان بمونن.
        </p>

        <div className="flex gap-2 mb-5">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="اسم پرسنل جدید"
            className="flex-1 border border-zinc-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#824c71]/40 focus:border-[#824c71]"
          />
          <button
            onClick={handleAdd}
            disabled={isSubmitting || !newName.trim()}
            className="w-11 h-11 flex items-center justify-center rounded-xl bg-[#824c71] text-white disabled:opacity-50 shrink-0"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4.5 h-4.5" />}
          </button>
        </div>

        {error && <p className="text-red-600 text-xs font-medium mb-3">{error}</p>}

        {staff.length === 0 ? (
          <div className="text-center py-10 bg-zinc-50 rounded-2xl">
            <p className="text-zinc-400 text-sm">هنوز پرسنلی ثبت نشده است.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {staff.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-2 bg-white border border-zinc-100 rounded-xl px-4 py-3">
                <span className="text-sm font-medium text-zinc-800">{s.name}</span>
                <button
                  onClick={() => handleDelete(s.id)}
                  disabled={deletingId === s.id}
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-50 text-red-500 disabled:opacity-50"
                >
                  {deletingId === s.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}