// app/api/salon/booking-settings/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { getSalonForUserId } from '@/lib/salonAccess';
import { parseJsonBody } from '@/lib/http';

export async function PATCH(req: Request) {
  try {
    const auth = await getAuthUser();
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const salon = await getSalonForUserId(auth.userId);
    if (!salon) return NextResponse.json({ error: 'سالنی یافت نشد' }, { status: 404 });

    const parsed = await parseJsonBody(req);
    if (!parsed.ok) return parsed.response;
    const { bookingEnabled } = parsed.body;

    if (typeof bookingEnabled !== 'boolean') {
      return NextResponse.json({ error: 'مقدار نامعتبر است' }, { status: 400 });
    }

    const updated = await prisma.salon.update({
      where: { id: salon.id },
      data: { bookingEnabled },
      select: { bookingEnabled: true },
    });

    return NextResponse.json({ success: true, bookingEnabled: updated.bookingEnabled }, { status: 200 });
  } catch (error) {
    console.error('Error updating booking settings:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
