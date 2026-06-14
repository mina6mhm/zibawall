// app/api/auth/send-otp/route.ts

import { NextResponse } from 'next/server';
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

    const expiresAt = new Date(
      Date.now() + 2 * 60 * 1000
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

    /* ==========================================
       بخش ارسال پیامک موقتاً کامنت شده است
       ==========================================
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

    const requestBody = {
      code: 'J88zq2Mhlt', // کد پترن تایید شده
      recipient: mobile,

      attributes: {
        code: otpCode
      },

      line_number: lineNumber,
      number_format: 'persian'
    };

    console.log(
      '📤 SMS REQUEST:',
      JSON.stringify(requestBody)
    );

    let smsRes: Response;

    try {
      smsRes = await fetch(
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
    } catch (networkError) {
      console.error(
        '❌ SMS Network Error:',
        networkError
      );

      return NextResponse.json(
        {
          error:
            'ارتباط با سامانه پیامکی برقرار نشد'
        },
        {
          status: 500
        }
      );
    }

    const smsText = await smsRes.text();

    console.log('====================');
    console.log('SMS STATUS:', smsRes.status);
    console.log('SMS RESPONSE:', smsText);
    console.log('====================');

    if (!smsRes.ok) {
      return NextResponse.json(
        {
          error: 'ارسال پیامک با خطا مواجه شد'
        },
        {
          status: 500
        }
      );
    }
    ========================================== */

    return NextResponse.json(
      {
        success: true,
        // پیام موقت برای اینکه بدانید پیامک ارسال نشده اما عملیات موفق بوده
        message: 'کد تایید در ترمینال لاگ شد (حالت تستی)'
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
