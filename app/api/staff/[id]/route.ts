// app/api/staff/[id]/route.ts
import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { normalizeDigits } from '@/lib/phone';
import { cleanString } from '@/lib/validate';
import { getSalonFromCookieToken as getSalonFromToken } from '@/lib/salonAccess';

const VALID_DAYS = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];
const mobileRegex = /^09\d{9}$/;
const MAX_STAFF_NAME_LENGTH = 60;

// PATCH: آپدیت پرسنل — دو نوع کاملاً مستقل از هم پشتیبانی می‌شود:
//   ۱) تغییر نام/شماره پرسنل (از تب «پرسنل»)      → body: { name?, phone? }
//   ۲) تغییر روزهای ثابت تعطیل (از تب «برنامه پرسنل») → body: { offDays: string[] }
// هر درخواست فقط فیلدهایی که خودش می‌فرستد را آپدیت می‌کند؛ بقیه دست‌نخورده می‌مانند.
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const salon = await getSalonFromToken();
    if (!salon) return NextResponse.json({ error: 'دسترسی ندارید' }, { status: 401 });

    const { id } = await params;

    const staffMember = await prisma.staff.findUnique({ where: { id } });
    if (!staffMember || staffMember.salonId !== salon.id)
      return NextResponse.json({ error: 'پرسنل یافت نشد' }, { status: 404 });

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'اطلاعات ارسالی نامعتبر است' }, { status: 400 });
    }
    const data: { name?: string; phone?: string; offDays?: string[]; commissionPercent?: number | null } = {};

    // ── بخش ۱: نام/شماره ──
    if (body.name !== undefined) {
      const name = cleanString(body.name, MAX_STAFF_NAME_LENGTH) ?? '';
      if (!name) return NextResponse.json({ error: 'نام پرسنل الزامی است (حداکثر ۶۰ کاراکتر)' }, { status: 400 });

      if (name !== staffMember.name) {
        const existingName = await prisma.staff.findUnique({
          where: { salonId_name: { salonId: salon.id, name } },
        });
        if (existingName) {
          return NextResponse.json({ error: 'این نام قبلاً برای پرسنل دیگری ثبت شده است' }, { status: 400 });
        }
      }
      data.name = name;
    }

    if (body.phone !== undefined) {
      const phone = normalizeDigits(body.phone);
      if (!mobileRegex.test(phone)) {
        return NextResponse.json({ error: 'شماره موبایل معتبر نیست' }, { status: 400 });
      }

      if (phone !== staffMember.phone) {
        const existingPhone = await prisma.staff.findUnique({
          where: { salonId_phone: { salonId: salon.id, phone } },
        });
        if (existingPhone) {
          return NextResponse.json({ error: 'این شماره موبایل قبلاً برای پرسنل دیگری ثبت شده است' }, { status: 400 });
        }
      }
      data.phone = phone;
    }

    // ── بخش ۲: درصد پیش‌فرض پرسنل (اختیاری) ──
    if (body.commissionPercent !== undefined) {
      if (body.commissionPercent === null || body.commissionPercent === '') {
        data.commissionPercent = null;
      } else {
        const n = Number(body.commissionPercent);
        if (Number.isNaN(n) || n < 0 || n > 100) {
          return NextResponse.json({ error: 'درصد پرسنل باید عددی بین ۰ تا ۱۰۰ باشد' }, { status: 400 });
        }
        data.commissionPercent = n;
      }
    }

    // ── بخش ۳: روزهای ثابت تعطیل ──
    if (body.offDays !== undefined) {
      if (!Array.isArray(body.offDays)) {
        return NextResponse.json({ error: 'offDays باید آرایه باشد' }, { status: 400 });
      }
      data.offDays = Array.from(new Set(body.offDays.filter((d: unknown): d is string => typeof d === 'string' && VALID_DAYS.includes(d))));
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'هیچ فیلدی برای بروزرسانی ارسال نشده است' }, { status: 400 });
    }

    const updated = await prisma.staff.update({
      where: { id },
      data,
    });

    return NextResponse.json({ success: true, staff: updated });
  } catch (error) {
    // نام/شماره تکراریِ هم‌زمان (race بین بررسی و update)
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return NextResponse.json({ error: 'این نام یا شماره قبلاً برای پرسنل دیگری ثبت شده است' }, { status: 409 });
      }
      if (error.code === 'P2025') {
        return NextResponse.json({ error: 'پرسنل یافت نشد' }, { status: 404 });
      }
    }
    console.error('Error updating staff:', error);
    return NextResponse.json({ error: 'خطای سرور در ویرایش پرسنل' }, { status: 500 });
  }
}
