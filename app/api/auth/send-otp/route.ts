// app/api/auth/send-otp/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { mobile } = await req.json();

    if (!mobile || mobile.length !== 11) {
      return NextResponse.json({ error: 'شماره موبایل نامعتبر است' }, { status: 400 });
    }

    // 👈 اضافه کردن شماره تست برای دور زدن ارسال پیامک
    if (mobile === '09109827633') {
      console.log(`\n🔑 ورود با اکانت تست: ${mobile} - بدون ارسال پیامک\n`);
      return NextResponse.json({ message: 'کد با موفقیت ارسال/تولید شد' }, { status: 200 });
    }

    // تولید کد ۵ رقمی تصادفی
    const otpCode = Math.floor(10000 + Math.random() * 90000).toString();
    const expiresAt = new Date(Date.now() + 2 * 60 * 1000); // 2 دقیقه اعتبار

    // ذخیره در دیتابیس
    await prisma.user.upsert({
      where: { phone: mobile },
      update: { otpCode, otpExpiresAt: expiresAt },
      create: { phone: mobile, otpCode, otpExpiresAt: expiresAt },
    });

    console.log(`\n🔑 کد ورود برای شماره ${mobile} : ${otpCode}\n`);

    // تلاش برای ارسال پیامک سریع (Verify)
    try {
      const smsRes = await fetch("https://api.sms.ir/v1/send/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "x-api-key": process.env.SMS_IR_API_KEY as string
        },
        body: JSON.stringify({
          mobile: mobile,
          templateId: 193575, // شناسه قالب شما
          parameters: [
            {
              name: "CODE", 
              value: otpCode
            }
          ]
        }),
        signal: AbortSignal.timeout(15000)
      });

      const smsData = await smsRes.json();
      console.log("📥 پاسخ سرور sms.ir (ارسال سریع):", smsData); 

    } catch (smsError) {
      console.error("⚠️ هشدار: خطای شبکه در ارسال پیامک", smsError);
    }

    return NextResponse.json({ message: 'کد با موفقیت ارسال/تولید شد' }, { status: 200 });

  } catch (error) {
    console.error("❌ خطای کلی در send-otp:", error);
    return NextResponse.json({ error: 'خطای سرور در تولید کد' }, { status: 500 });
  }
}
