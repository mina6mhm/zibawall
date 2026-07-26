//app/api/appointment/verify/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyZarinpalPayment } from '@/lib/zarinpal';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const appointmentId = searchParams.get('appointmentId');
  const authority = searchParams.get('Authority');
  const status = searchParams.get('Status');
  const origin = req.nextUrl.origin;

  if (!appointmentId) {
    return NextResponse.redirect(`${origin}/appointments`);
  }

  const appointment = await prisma.appointment.findUnique({ where: { id: appointmentId } });
  if (!appointment) {
    return NextResponse.redirect(`${origin}/appointments`);
  }

  if (status !== 'OK' || !authority) {
    await prisma.appointment.update({ where: { id: appointmentId }, data: { depositStatus: 'FAILED' } });
    return NextResponse.redirect(`${origin}/appointments/${appointmentId}?payment=failed`);
  }

  try {
    const result = await verifyZarinpalPayment({ amountToman: appointment.depositAmount, authority });

    if (result.success) {
      await prisma.appointment.update({
        where: { id: appointmentId },
        data: {
          depositStatus: 'SUCCESS',
          status: 'CONFIRMED',
          refId: String(result.refId),
        },
      });
      return NextResponse.redirect(`${origin}/appointments/${appointmentId}?payment=success`);
    }

    await prisma.appointment.update({ where: { id: appointmentId }, data: { depositStatus: 'FAILED' } });
    return NextResponse.redirect(`${origin}/appointments/${appointmentId}?payment=failed`);
  } catch (error) {
    console.error('Error verifying payment:', error);
    return NextResponse.redirect(`${origin}/appointments/${appointmentId}?payment=failed`);
  }
}
