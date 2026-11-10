// app/api/auth/verify-otp/route.ts
import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';
import { rateLimit, resetRateLimit, getClientIp } from '@/lib/rateLimit';
import { normalizeDigits } from '@/lib/phone';

const MOBILE_REGEX = /^09\d{9}$/;
const CODE_REGEX = /^\d{4,8}$/;

const tooMany = (seconds: number) =>
  NextResponse.json(
    { error: 'تعداد تلاش‌ها زیاد است. کمی بعد دوباره تلاش کنید' },
    { status: 429, headers: { 'Retry-After': String(seconds) } }
  );

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const mobile = normalizeDigits(body?.mobile);
    const code = normalizeDigits(body?.code);

    if (!mobile || !code) {
      return NextResponse.json({ error: 'اطلاعات ناقص است' }, { status: 400 });
    }
    if (!MOBILE_REGEX.test(mobile) || !CODE_REGEX.test(code)) {
      return NextResponse.json({ error: 'کد وارد شده اشتباه است' }, { status: 400 });
    }

    // ضد brute-force: کد ۵ رقمی فقط ۹۰هزار حالت دارد و قبلاً هیچ محدودیتی روی تعداد
    // تلاش نبود؛ یعنی هر حسابی در ۹۰ ثانیه قابل تصاحب بود.
    const mobileKey = `verify-otp:mobile:${mobile}`;
    const mobileLimit = rateLimit(mobileKey, 8, 90 * 1000);
    if (!mobileLimit.ok) return tooMany(mobileLimit.retryAfter);

    const ipLimit = rateLimit(`verify-otp:ip:${getClientIp(req)}`, 60, 10 * 60 * 1000);
    if (!ipLimit.ok) return tooMany(ipLimit.retryAfter);

    const user = await prisma.user.findUnique({ where: { phone: mobile } });

    // پیام یکسان: وجود/عدم وجود شماره لو نمی‌رود
    if (!user || !user.otpCode || !user.otpExpiresAt) {
      return NextResponse.json({ error: 'کد وارد شده اشتباه است' }, { status: 400 });
    }

    if (user.otpCode !== code) {
      return NextResponse.json({ error: 'کد وارد شده اشتباه است' }, { status: 400 });
    }

    if (user.otpExpiresAt < new Date()) {
      return NextResponse.json({ error: 'کد منقضی شده است' }, { status: 400 });
    }

    // مصرف اتمیک کد: دو درخواست هم‌زمان با یک کد درست، هر دو موفق نمی‌شوند
    const consumed = await prisma.user.updateMany({
      where: { id: user.id, otpCode: code, otpExpiresAt: { gt: new Date() } },
      data: { otpCode: null, otpExpiresAt: null },
    });

    if (consumed.count === 0) {
      return NextResponse.json({ error: 'کد وارد شده اشتباه است' }, { status: 400 });
    }

    resetRateLimit(mobileKey);

    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET is not defined');

    const token = jwt.sign(
      { userId: user.id, phone: user.phone, role: user.role },
      secret,
      { expiresIn: '30d' }
    );

    // اگر یوزرنیم یا نام نداشت، کاربر جدید محسوب شود تا فرم تکمیل را ببیند
    const isNewUser = !user.username || !user.name;

    const response = NextResponse.json({
      success: true,
      isNewUser,
      user: {
        id: user.id,
        phone: user.phone,
        role: user.role,
        username: user.username,
        name: user.name,
      },
    });

    response.cookies.set({
      name: 'token',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 روز
    });

    return response;
  } catch (error) {
    console.error('Verify OTP Error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}