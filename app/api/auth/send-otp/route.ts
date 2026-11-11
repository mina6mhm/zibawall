// app/api/auth/send-otp/route.ts
import { NextResponse, after } from 'next/server';
import { randomInt } from 'crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { rateLimit, getClientIp } from '@/lib/rateLimit';
import { normalizeDigits } from '@/lib/phone';

const MOBILE_REGEX = /^09\d{9}$/;
// زمان اعتبار کد و فاصله‌ی لازم برای ارسال مجدد: ۹۰ ثانیه
const OTP_TTL_MS = 90 * 1000;

const tooMany = (seconds: number, message: string) =>
  NextResponse.json(
    { error: message },
    { status: 429, headers: { 'Retry-After': String(seconds) } }
  );

// اگر پیامک ارسال نشد، قفل ۹۰ثانیه‌ای را آزاد کن تا کاربر بتواند فوراً دوباره تلاش کند
async function releaseOtpLock(mobile: string, otpCode: string) {
  try {
    await prisma.user.updateMany({
      where: { phone: mobile, otpCode },
      data: { otpCode: null, otpExpiresAt: null },
    });
  } catch (e) {
    console.error('Failed to release OTP lock:', e);
  }
}

export async function POST(req: Request) {
  try {
    // محدودیت per-IP: جلوی ساخت انبوه کاربر (upsert) و پیامک‌بمبی را می‌گیرد
    const ipLimit = await rateLimit(`send-otp:ip:${getClientIp(req)}`, 10, 10 * 60 * 1000);
    if (!ipLimit.ok) {
      return tooMany(ipLimit.retryAfter, 'تعداد درخواست‌ها زیاد است. کمی بعد دوباره تلاش کنید');
    }

    const body = await req.json().catch(() => null);
    const mobile = normalizeDigits(body?.mobile);

    if (!MOBILE_REGEX.test(mobile)) {
      return NextResponse.json({ error: 'شماره موبایل نامعتبر است' }, { status: 400 });
    }

    const isProd = process.env.NODE_ENV === 'production';

    // لیست شماره‌های تستی که کد ثابت دارن (مثلاً شماره‌های خارجی که SMS بهشون نمی‌رسه)
    const testPhones = (process.env.TEST_PHONE_NUMBERS || '')
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);
    const testCode = process.env.TEST_OTP_CODE;
    // در production بدون TEST_OTP_CODE صریح، کد پیش‌فرض ۱۱۱۱۱ هرگز استفاده نمی‌شود
    const isTestPhone = testPhones.includes(mobile) && (!isProd || !!testCode);

    const apiKey = process.env.FARAZ_SMS_API_KEY;
    const lineNumber = process.env.FARAZ_SMS_LINE_NUMBER;

    // قبل از گرفتن قفل چک می‌شود، تا با تنظیمات ناقص کاربر ۹۰ ثانیه قفل نشود
    if (isProd && !isTestPhone && (!apiKey || !lineNumber)) {
      console.error('SMS provider env (FARAZ_SMS_API_KEY / FARAZ_SMS_LINE_NUMBER) is not configured');
      return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
    }

    // کد با crypto.randomInt (Math.random قابل پیش‌بینی است)
    const otpCode = isTestPhone ? testCode || '11111' : String(randomInt(10000, 100000));

    const now = new Date();
    const expiresAt = new Date(now.getTime() + OTP_TTL_MS);

    // گرفتن «قفل» به‌صورت اتمیک: فقط اگر کد قبلی منقضی شده باشد آپدیت می‌شود.
    // قبلاً بررسی و نوشتن جدا بود و ۲ درخواست هم‌زمان هر دو رد می‌شدند (دو پیامک).
    const updated = await prisma.user.updateMany({
      where: {
        phone: mobile,
        OR: [{ otpExpiresAt: null }, { otpExpiresAt: { lte: now } }],
      },
      data: { otpCode, otpExpiresAt: expiresAt },
    });

    if (updated.count === 0) {
      const existing = await prisma.user.findUnique({
        where: { phone: mobile },
        select: { otpExpiresAt: true },
      });

      if (existing) {
        const secondsLeft = Math.max(
          1,
          Math.ceil(((existing.otpExpiresAt?.getTime() ?? Date.now()) - Date.now()) / 1000)
        );
        return tooMany(secondsLeft, `لطفاً ${secondsLeft} ثانیه دیگر دوباره تلاش کنید`);
      }

      try {
        await prisma.user.create({
          data: { phone: mobile, otpCode, otpExpiresAt: expiresAt },
        });
      } catch (e) {
        // درخواست هم‌زمان دیگری همین شماره را همین الان ساخته
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
          return tooMany(OTP_TTL_MS / 1000, 'لطفاً چند ثانیه دیگر دوباره تلاش کنید');
        }
        throw e;
      }
    }

    // شماره‌های whitelist شده هیچ‌وقت SMS واقعی نمی‌گیرن
    if (isTestPhone) {
      return NextResponse.json({ success: true, message: 'کد تایید ارسال شد' }, { status: 200 });
    }

    // محیط توسعه: کد فقط در ترمینال لاگ می‌شود (هرگز در production لاگ نمی‌شود،
    // چون هر کسی که به لاگ‌ها دسترسی داشته باشد می‌توانست وارد حساب بقیه شود)
    if (!isProd) {
      console.log(`🔑 OTP for ${mobile}: ${otpCode}`);
      return NextResponse.json(
        {
          success: true,
          message: 'کد تایید ارسال شد (حالت توسعه — کد را از ترمینال سرور بردارید)',
        },
        { status: 200 }
      );
    }

    const requestBody = {
      code: 'J88zq2Mhlt', // کد پترن تایید شده
      recipient: mobile,
      attributes: { code: otpCode },
      line_number: lineNumber,
      number_format: 'english',
    };

    after(async () => {
      try {
        const smsRes = await fetch('https://api.iranpayamak.com/ws/v1/sms/pattern', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Api-Key': apiKey! },
          body: JSON.stringify(requestBody),
          signal: AbortSignal.timeout(10000),
        });

        if (!smsRes.ok) {
          const smsText = await smsRes.text().catch(() => '');
          console.error('❌ SMS send failed:', smsRes.status, smsText.slice(0, 300));
          await releaseOtpLock(mobile, otpCode);
        }
      } catch (smsError) {
        console.error('❌ SMS Network/Send Error:', smsError);
        await releaseOtpLock(mobile, otpCode);
      }
    });

    return NextResponse.json({ success: true, message: 'کد تایید ارسال شد' }, { status: 200 });
  } catch (error) {
    console.error('❌ Send OTP Error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}