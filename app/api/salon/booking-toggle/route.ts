// app/api/salon/booking-toggle/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOwnedSalonFromToken } from '@/lib/auth-salon';

export const dynamic = 'force-dynamic';

// وضعیت فعلی نوبت‌دهی آنلاین + اینکه اصلاً امکان روشن کردنش هست یا نه
export async function GET() {
  const result = await getOwnedSalonFromToken();
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });

  const activeCategoryWithService = await prisma.bookingCategory.findFirst({
    where: {
      salonId: result.salon.id,
      isActive: true,
      services: { some: { isActive: true } },
    },
  });

  return NextResponse.json(
    {
      bookingEnabled: result.salon.bookingEnabled,
      canEnable: !!activeCategoryWithService,
    },
    { status: 200 }
  );
}

// روشن/خاموش کردن نوبت‌دهی آنلاین
export async function PUT(req: Request) {
  const result = await getOwnedSalonFromToken();
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });

  const body = await req.json();
  if (typeof body?.bookingEnabled !== 'boolean') {
    return NextResponse.json({ error: 'مقدار نامعتبر است' }, { status: 400 });
  }

  // اگر می‌خواد روشنش کنه، باید حداقل یک دسته‌بندیِ فعال با یک خدمتِ فعال داشته باشه
  if (body.bookingEnabled) {
    const activeCategoryWithService = await prisma.bookingCategory.findFirst({
      where: {
        salonId: result.salon.id,
        isActive: true,
        services: { some: { isActive: true } },
      },
    });
    if (!activeCategoryWithService) {
      return NextResponse.json(
        { error: 'ابتدا حداقل یک دسته‌بندیِ فعال با یک خدمتِ فعال ثبت کنید' },
        { status: 400 }
      );
    }
  }

  const salon = await prisma.salon.update({
    where: { id: result.salon.id },
    data: { bookingEnabled: body.bookingEnabled },
  });

  return NextResponse.json({ success: true, bookingEnabled: salon.bookingEnabled }, { status: 200 });
}