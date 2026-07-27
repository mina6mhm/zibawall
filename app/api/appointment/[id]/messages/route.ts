//app/api/appointment/[id]/messages/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { userPhone, message, type = 'TEXT', mediaUrl, duration, replyToId } = body;

    if (!userPhone) {
      return NextResponse.json({ error: 'شماره کاربر الزامی است.' }, { status: 400 });
    }
    if (type === 'TEXT' && !message?.trim()) {
      return NextResponse.json({ error: 'متن پیام الزامی است.' }, { status: 400 });
    }
    if ((type === 'IMAGE' || type === 'VOICE') && !mediaUrl) {
      return NextResponse.json({ error: 'فایل ارسالی نامعتبر است.' }, { status: 400 });
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

    if (replyToId) {
      const replyTarget = await prisma.appointmentMessage.findFirst({
        where: { id: replyToId, appointmentId: id },
      });
      if (!replyTarget) {
        return NextResponse.json({ error: 'پیامی که به آن پاسخ می‌دهید یافت نشد.' }, { status: 400 });
      }
    }

    const created = await prisma.appointmentMessage.create({
      data: {
        appointmentId: id,
        sender: isSalonOwner ? 'SALON' : 'CUSTOMER',
        type,
        message: message?.trim() || null,
        mediaUrl: mediaUrl || null,
        duration: duration || null,
        replyToId: replyToId || null,
      },
      include: { replyTo: true },
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