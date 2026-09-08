// app/api/auth/send-otp/route.ts

import { NextResponse, after } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const { mobile } = await req.json();

    const mobileRegex = /^09\d{9}$/;

    if (!mobileRegex.test(mobile)) {
      return NextResponse.json(
        {
          error: 'شماره موبایل نامعتبر است'
        },
        {
          status: 400
        }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: {
        phone: mobile
      }
    });

    if (
      existingUser?.otpExpiresAt &&
      existingUser.otpExpiresAt > new Date()
    ) {
      const secondsLeft = Math.ceil(
        (
          existingUser.otpExpiresAt.getTime() -
          Date.now()
        ) / 1000
      );

      return NextResponse.json(
        {
          error: `لطفاً ${secondsLeft} ثانیه دیگر دوباره تلاش کنید`
        },
        {
          status: 429
        }
      );
    }

    const otpCode = Math.floor(
      10000 + Math.random() * 90000
    ).toString();

    // زمان اعتبار کد و فاصله‌ی لازم برای ارسال مجدد: ۹۰ ثانیه
    const expiresAt = new Date(
      Date.now() + 90 * 1000
    );

    await prisma.user.upsert({
      where: {
        phone: mobile
      },
      update: {
        otpCode,
        otpExpiresAt: expiresAt
      },
      create: {
        phone: mobile,
        otpCode,
        otpExpiresAt: expiresAt
      }
    });

    // در حالت تستی این لاگ بسیار مهم است تا بتوانید کد را بردارید
    console.log(`🔑 OTP for ${mobile}: ${otpCode}`);

    const apiKey =
      process.env.FARAZ_SMS_API_KEY;

    const lineNumber =
      process.env.FARAZ_SMS_LINE_NUMBER;

    if (!apiKey) {
      throw new Error(
        'FARAZ_SMS_API_KEY is not configured'
      );
    }

    if (!lineNumber) {
      throw new Error(
        'FARAZ_SMS_LINE_NUMBER is not configured'
      );
    }

    // بعد:
    const requestBody = {
      code: 'J88zq2Mhlt', // کد پترن تایید شده
      recipient: mobile,

      attributes: {
        code: otpCode
      },

      line_number: lineNumber,
      number_format: 'english'
    };

    // نکته‌ی مهم: قبلاً اینجا با await منتظر پاسخ سرویس پیامکی می‌ماندیم و
    // فقط بعد از آن به کاربر پاسخ می‌دادیم؛ همین باعث می‌شد رفتن به صفحه‌ی
    // کد تایید در فرانت‌اند چند ثانیه (تا ۱۵ ثانیه در بدترین حالت) طول بکشد.
    // چون کد OTP از قبل در دیتابیس ذخیره شده، همین الان به کاربر پاسخ موفق
    // می‌دهیم و ارسال واقعی پیامک را با after() در پس‌زمینه انجام می‌دهیم؛
    // این‌طوری فرانت‌اند بلافاصله بعد از ثبت کد به مرحله‌ی بعد می‌رود.
    after(async () => {
      try {
        console.log(
          '📤 SMS REQUEST:',
          JSON.stringify(requestBody)
        );

        const smsRes = await fetch(
          'https://api.iranpayamak.com/ws/v1/sms/pattern',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Api-Key': apiKey
            },
            body: JSON.stringify(requestBody),
            signal: AbortSignal.timeout(15000)
          }
        );

        const smsText = await smsRes.text();

        console.log('====================');
        console.log('SMS STATUS:', smsRes.status);
        console.log('SMS RESPONSE:', smsText);
        console.log('====================');

        if (!smsRes.ok) {
          console.error('❌ SMS send failed:', smsRes.status, smsText);
        }
      } catch (smsError) {
        console.error('❌ SMS Network/Send Error:', smsError);
      }
    });

    return NextResponse.json(
      {
        success: true,
        message: 'کد تایید ارسال شد'
      },
      {
        status: 200
      }
    );
  } catch (error) {
    console.error(
      '❌ Send OTP Error:',
      error
    );

    return NextResponse.json(
      {
        error: 'خطای سرور'
      },
      {
        status: 500
      }
    );
  }
}