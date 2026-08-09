// app/api/staff/[id]/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';

const VALID_DAYS = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];
const mobileRegex = /^09\d{9}$/;

async function getSalonFromToken() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) return null;
  try {
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    return await prisma.salon.findUnique({ where: { userId: decoded.userId } });
  } catch {
    return null;
  }
}

// PATCH: آپدیت پرسنل — دو نوع کاملاً مستقل از هم پشتیبانی می‌شود:
//   ۱) تغییر نام/شماره پرسنل (از تب «پرسنل»)      → body: { name?, phone? }
//   ۲) تغییر روزهای ثابت تعطیل (از تب «برنامه پرسنل») → body: { offDays: string[] }
// هر درخواست فقط فیلدهایی که خودش می‌فرستد را آپدیت می‌کند؛ بقیه دست‌نخورده می‌مانند.
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const salon = await getSalonFromToken();
  if (!salon) return NextResponse.json({ error: 'دسترسی ندارید' }, { status: 401 });

  const { id } = await params;

  const staffMember = await prisma.staff.findUnique({ where: { id } });
  if (!staffMember || staffMember.salonId !== salon.id)
    return NextResponse.json({ error: 'پرسنل یافت نشد' }, { status: 404 });

  const body = await req.json();
  const data: { name?: string; phone?: string; offDays?: string[] } = {};

  // ── بخش ۱: نام/شماره ──
  if (body.name !== undefined) {
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) return NextResponse.json({ error: 'نام پرسنل الزامی است' }, { status: 400 });

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
    const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
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

  // ── بخش ۲: روزهای ثابت تعطیل ──
  if (body.offDays !== undefined) {
    if (!Array.isArray(body.offDays)) {
      return NextResponse.json({ error: 'offDays باید آرایه باشد' }, { status: 400 });
    }
    data.offDays = body.offDays.filter((d: string) => VALID_DAYS.includes(d));
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'هیچ فیلدی برای بروزرسانی ارسال نشده است' }, { status: 400 });
  }

  const updated = await prisma.staff.update({
    where: { id },
    data,
  });

  return NextResponse.json({ success: true, staff: updated });
}