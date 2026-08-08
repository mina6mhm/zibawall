// app/api/staff/[id]/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';

const VALID_DAYS = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];

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

// PATCH: آپدیت روزهای ثابت تعطیل پرسنل
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

  if (!Array.isArray(body.offDays))
    return NextResponse.json({ error: 'offDays باید آرایه باشد' }, { status: 400 });

  // فقط روزهای معتبر هفته قبول می‌شه
  const offDays = body.offDays.filter((d: string) => VALID_DAYS.includes(d));

  const updated = await prisma.staff.update({
    where: { id },
    data: { offDays },
  });

  return NextResponse.json({ success: true, staff: updated });
}