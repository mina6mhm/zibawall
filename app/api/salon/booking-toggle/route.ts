// app/api/salon/booking-toggle/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { userPhone, bookingEnabled } = body;

    if (!userPhone || typeof bookingEnabled !== 'boolean') {
      return NextResponse.json({ error: 'اطلاعات ارسالی ناقص است.' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { phone: userPhone } });
    if (!user) return NextResponse.json({ error: 'کاربر یافت نشد.' }, { status: 404 });

    const salon = await prisma.salon.findUnique({ where: { userId: user.id } });
    if (!salon) return NextResponse.json({ error: 'کسب‌وکاری یافت نشد.' }, { status: 404 });

    // اگه می‌خواد نوبت‌دهی رو روشن کنه، باید حداقل یک ریزخدمت با پرسنل تعریف‌شده وجود داشته باشه
    if (bookingEnabled) {
      const serviceCount = await prisma.bookingService.count({ where: { salonId: salon.id } });
      if (serviceCount === 0) {
        return NextResponse.json(
          { error: 'برای فعال‌سازی نوبت‌دهی، ابتدا حداقل یک دسته و ریزخدمت تعریف کنید.' },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.salon.update({
      where: { userId: user.id },
      data: { bookingEnabled },
    });

    return NextResponse.json({ success: true, bookingEnabled: updated.bookingEnabled });
  } catch (error) {
    console.error('Error toggling booking:', error);
    return NextResponse.json({ error: 'خطا در تغییر وضعیت نوبت‌دهی' }, { status: 500 });
  }
}