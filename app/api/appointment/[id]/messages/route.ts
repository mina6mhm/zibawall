//app/api/appointment/[id]/messages/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { userPhone, message } = body;

    if (!userPhone || !message?.trim()) {
      return NextResponse.json({ error: 'متن پیام الزامی است.' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { phone: userPhone } });
    if (!user) return NextResponse.json({ error: 'کاربر یافت نشد.' }, { status: 404 });

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: { salon: { select: { userId: true } } },
    });
    if (!appointment) return NextResponse.json({ error: 'نوبت یافت نشد.' }, { status: 404 });

    const isCustomer = appointment.customerId === user.id;
    const isSalonOwner = appointment.salon.userId === user.id;
    if (!isCustomer && !isSalonOwner) {
      return NextResponse.json({ error: 'دسترسی ندارید.' }, { status: 403 });
    }
    if (appointment.status === 'CANCELLED') {
      return NextResponse.json({ error: 'این گفتگو لغو شده است.' }, { status: 400 });
    }

    const created = await prisma.appointmentMessage.create({
      data: {
        appointmentId: id,
        sender: isSalonOwner ? 'SALON' : 'CUSTOMER',
        message: message.trim(),
      },
    });

    await prisma.appointment.update({
      where: { id },
      data: {
        seenByCustomer: isCustomer,
        seenBySalon: isSalonOwner,
      },
    });

    return NextResponse.json({ message: created }, { status: 201 });
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json({ error: 'خطا در ارسال پیام' }, { status: 500 });
  }
}
