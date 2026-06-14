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
        (existingUser.otpExpiresAt.getTime() - Date.now()) /
          1000
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

    console.log(`🔑 OTP for ${mobile}: ${otpCode}`);

    const apiKey = process.env.FARAZ_SMS_API_KEY;

    if (!apiKey) {
      throw new Error(
        'FARAZ_SMS_API_KEY is not configured'
      );
    }

    try {
      const smsRes = await fetch(
        'https://api2.ippanel.com/api/v1/sms/pattern/normal/send',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: apiKey
          },
          body: JSON.stringify({
            code: 'J88zq2Mhlt',
            recipient: mobile,
            variable: {
              code: otpCode
            }
          }),
          signal: AbortSignal.timeout(15000)
        }
      );

      const smsText = await smsRes.text();

      console.log('====================');
      console.log('STATUS:', smsRes.status);
      console.log('BODY:', smsText);
      console.log('====================');

      if (!smsRes.ok) {
        console.error('❌ SMS Provider Error');
      }

    } catch (smsError) {
      console.error(
        '⚠️ SMS Network Error:',
        smsError
      );
    }

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