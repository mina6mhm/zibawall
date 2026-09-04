//app/api/booking-group/verify/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { verifyZarinpalPayment } from '@/lib/zarinpal';
import { checkGroupSlotsStillAvailable } from '@/lib/bookingSchedule';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const authority = searchParams.get('Authority');
  const status = searchParams.get('Status');
  const groupId = searchParams.get('groupId');

  const baseUrl = new URL(req.url).origin;

  // این درخواست (برگشت از زرین‌پال) روی اپ‌های نیتیو داخل مرورگرِ سیستم اتفاق
  // می‌افتد نه WebView خودِ اپ (به lib/openPaymentUrl.ts نگاه کنید)، پس کوکی
  // لاگینِ اپ آنجا وجود ندارد. اگر همین‌جا کوکی معتبر داشتیم (حالت وب)، مستقیم
  // به صفحه‌ی محافظت‌شده برمی‌گردیم؛ در غیر این صورت (حالت اپ نیتیو) به
  // صفحه‌ی عمومی /payment/result که نیازی به لاگین ندارد.
  const hasValidSession = await (async () => {
    try {
      const cookieStore = await cookies();
      const token = cookieStore.get('token')?.value;
      if (!token) return false;
      jwt.verify(token, process.env.JWT_SECRET!);
      return true;
    } catch {
      return false;
    }
  })();

  const redirectTo = (result: 'success' | 'failed' | 'slotTaken') =>
    hasValidSession
      ? NextResponse.redirect(`${baseUrl}/appointments?paymentResult=${result}`)
      : NextResponse.redirect(`${baseUrl}/payment/result?status=${result}`);

  if (!groupId || !authority) return redirectTo('failed');

  const group = await prisma.bookingGroup.findUnique({
    where: { id: groupId },
    include: { bookings: true },
  });
  if (!group || group.authority !== authority) return redirectTo('failed');

  if (status !== 'OK') {
    await prisma.bookingGroup.update({ where: { id: group.id }, data: { paymentStatus: 'FAILED' } });
    return redirectTo('failed');
  }

  try {
    const result = await verifyZarinpalPayment({ amountToman: group.totalAmount, authority });

    if (result.success) {
      // پول واقعاً از مشتری کم شده. قبل از CONFIRM کردن همه‌ی نوبت‌های سبد، دوباره
      // چک می‌کنیم هیچ‌کدوم از اسلات‌ها (که ممکنه هولدشون منقضی شده باشه) توسط
      // شخص دیگه‌ای گرفته نشده باشن — همون ریسکی که lib/bookingSchedule.ts توضیح داده.
      try {
        const outcome = await prisma.$transaction(
          async (tx) => {
            const check = await checkGroupSlotsStillAvailable(group.bookings, tx);

            if (!check.ok) {
              // پول گرفته شده ولی حداقل یکی از اسلات‌ها دیگه در دسترس نیست: کل
              // گروه و همه‌ی نوبت‌هاش CANCELLED می‌شن (نه FAILED، چون paymentStatus
              // باید SUCCESS بمونه تا در حساب‌ها دیده بشه و برای استرداد پیگیری بشه).
              await tx.bookingGroup.update({
                where: { id: group.id },
                data: { paymentStatus: 'SUCCESS', refId: String(result.refId) },
              });
              await tx.booking.updateMany({
                where: { bookingGroupId: group.id },
                data: { paymentStatus: 'SUCCESS', status: 'CANCELLED' },
              });
              return { ok: false as const };
            }

            await tx.bookingGroup.update({
              where: { id: group.id },
              data: { paymentStatus: 'SUCCESS', refId: String(result.refId) },
            });
            await tx.booking.updateMany({
              where: { bookingGroupId: group.id },
              data: { paymentStatus: 'SUCCESS', status: 'CONFIRMED' },
            });
            return { ok: true as const };
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
        );

        if (!outcome.ok) {
          return redirectTo('slotTaken');
        }
        return redirectTo('success');
      } catch (txError) {
        console.error('Error confirming booking group after payment:', txError);
        return redirectTo('slotTaken');
      }
    }

    await prisma.bookingGroup.update({ where: { id: group.id }, data: { paymentStatus: 'FAILED' } });
    return redirectTo('failed');
  } catch (error) {
    console.error('Error verifying group payment:', error);
    return redirectTo('failed');
  }
}