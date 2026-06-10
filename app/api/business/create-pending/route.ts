// app/api/business/create-pending/route.ts

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// قیمت پلن‌ها باید در سرور تعریف شود تا امنیت حفظ شود
const PLAN_PRICES: { [key: string]: number } = {
  'monthly-normal': 1000000,
  'monthly-advanced': 2000000,
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      userPhone, name, province, city, neighborhoods, address, coordinates,
      phones, workingHours, closedDays, tags, description, socials,
      imageUrl, portfolios, planId,
    } = body;
    
    // ۱. اعتبارسنجی اولیه
    if (!userPhone || !name || !planId || !imageUrl) {
      return NextResponse.json({ message: 'اطلاعات ضروری ارسال نشده است.' }, { status: 400 });
    }
    
    // ۲. پیدا کردن کاربر
    const user = await prisma.user.findUnique({ where: { phone: userPhone } });
    if (!user) {
      return NextResponse.json({ message: 'کاربر یافت نشد.' }, { status: 404 });
    }

    // بررسی اینکه آیا کاربر قبلاً سالن ثبت کرده یا نه
    const existingSalon = await prisma.salon.findUnique({
      where: { userId: user.id },
      include: { payments: true },
    });

    if (existingSalon) {
      if (existingSalon.status === 'ACTIVE' || existingSalon.status === 'INACTIVE') {
        return NextResponse.json({ message: 'شما قبلاً یک سالن ثبت کرده‌اید.' }, { status: 409 });
      }

      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      const isExpiredPending = existingSalon.status === 'PENDING_PAYMENT' && existingSalon.createdAt < tenMinutesAgo;

      if (isExpiredPending) {
        await prisma.salon.delete({ where: { id: existingSalon.id } });
      } else {
        return NextResponse.json(
          { message: 'درخواست پرداخت قبلی شما هنوز فعال است. لطفاً پرداخت را تکمیل کنید یا چند دقیقه دیگر دوباره تلاش کنید.' },
          { status: 409 }
        );
      }
    }

    // ۳. تعیین قیمت از روی شناسه پلن
    const amount = PLAN_PRICES[planId];
    if (!amount) {
      return NextResponse.json({ message: 'پلن اشتراک نامعتبر است.' }, { status: 400 });
    }

    // در مرحله ثبت‌نام اولیه، همه کاربران نهایتاً 10 نمونه‌کار می‌توانند آپلود کنند
const MAX_INITIAL_PORTFOLIOS = 10;

if (portfolios && portfolios.length > MAX_INITIAL_PORTFOLIOS) {
  return NextResponse.json({ 
    message: `در مرحله ثبت اولیه، حداکثر ${MAX_INITIAL_PORTFOLIOS} نمونه کار مجاز است.` 
  }, { status: 400 });
}
    
    // --- تغییر اول: محاسبه تاریخ انقضای اشتراک (مثلاً ۱ ماه بعد) ---
    const expirationDate = new Date();
    expirationDate.setMonth(expirationDate.getMonth() + 1);

    // ۴. ساخت سالن با وضعیت "فعال" به جای "در انتظار پرداخت"
    const newSalon = await prisma.salon.create({
        data: {
          name, province, city, neighborhoods, address,
          lat: coordinates?.[0], lng: coordinates?.[1],
          phones, workingHours, closedDays, tags, description, imageUrl, portfolios,
          planId,
          status: 'ACTIVE', // --- تغییر دوم: وضعیت به ACTIVE تغییر یافت ---
          subscriptionExpiresAt: expirationDate, // --- تغییر سوم: ثبت تاریخ انقضا ---
          userId: user.id,
          socials: { 
            create: {
              website: socials.website, instagram: socials.instagram, whatsapp: socials.whatsapp,
              telegram: socials.telegram, rubika: socials.rubika, bale: socials.bale,
            },
          },
        },
    });

    // --- تغییر چهارم: کامنت کردن موقت سیستم پرداخت و زرین پال ---
    /*
    // ۵. ساخت رکورد پرداخت برای این سالن
    const newPayment = await prisma.payment.create({
        data: { amount, planId, status: 'PENDING', salonId: newSalon.id }
    });

    // ۶. درخواست لینک پرداخت از درگاه (مثال با زرین‌پال)
    const merchantId = process.env.ZARINPAL_MERCHANT_ID || 'XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX';
    const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/payment/verify`;
    
    const zarinpalPayload = {
      merchant_id: merchantId,
      amount: amount * 10,
      callback_url: callbackUrl,
      description: `خرید اشتراک برای سالن ${name}`,
      metadata: { mobile: userPhone },
    };

    const zarinpalRes = await fetch('https://api.zarinpal.com/pg/v4/payment/request.json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(zarinpalPayload),
    });

    const zarinpalData = await zarinpalRes.json();

    if (zarinpalData.errors && zarinpalData.errors.length > 0) {
        console.error('Zarinpal Error:', zarinpalData.errors);
        return NextResponse.json({ message: 'خطا در اتصال به درگاه پرداخت.' }, { status: 500 });
    }

    const { authority } = zarinpalData.data;

    // ۷. ذخیره کد رهگیری درگاه در دیتابیس
    await prisma.payment.update({
        where: { id: newPayment.id }, data: { authority },
    });

    // ۸. ارسال لینک پرداخت به فرانت‌اند
    const paymentUrl = `https://www.zarinpal.com/pg/StartPay/${authority}`;
    return NextResponse.json({ paymentUrl });
    */

    // --- تغییر پنجم: بازگرداندن پیام موفقیت به جای لینک پرداخت ---
    return NextResponse.json({ 
      success: true, 
      salonId: newSalon.id, 
      message: 'سالن با موفقیت ثبت و فعال شد' 
    });

  } catch (error) {
    console.error('Create-Pending Error:', error);
    return NextResponse.json({ message: 'خطای داخلی سرور' }, { status: 500 });
  }
}
