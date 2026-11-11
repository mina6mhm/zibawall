// lib/paymentAuthority.ts
//
// ثبت و بررسی «همه‌ی» authorityهای پرداختِ یک نوبت یا رزرو (جدول PaymentAuthority).
// مشکل قبلی: هر درخواست پرداخت authority جدیدی می‌ساخت و روی خود رکورد می‌نوشت؛ دوبار کلیک
// (به‌خصوص وقتی قفل حافظه‌ای بین چند سرور مشترک نبود) باعث می‌شد پرداختِ موفق با authority اول در
// verify رد شود. حالا verify هر authorityی را که برای همین نوبت/رزرو صادر شده بپذیرد، و ایدمپوتنسیِ
// موجود (SUCCESS فقط یک‌بار ثبت می‌شود) از تایید دوباره جلوگیری می‌کند.
import { prisma } from '@/lib/prisma';

export type AuthorityTarget = { bookingId: string } | { bookingGroupId: string };

const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

/** ثبت authority تازه. خطا را نمی‌اندازد: ستون authority روی خود رکورد همچنان fallback است. */
export async function recordAuthority(target: AuthorityTarget, authority: string): Promise<void> {
  try {
    await prisma.paymentAuthority.create({ data: { authority, ...target } });
  } catch (error) {
    console.error('PAYMENT_AUTHORITY_NOT_RECORDED', { target, authority, error });
  }

  // پاک‌سازی ارزان و گاه‌به‌گاه ردیف‌های قدیمی (authority زرین‌پال بعد از چند دقیقه بی‌مصرف است)
  if (Math.random() < 0.02) {
    prisma.paymentAuthority
      .deleteMany({ where: { createdAt: { lt: new Date(Date.now() - RETENTION_MS) } } })
      .catch(() => {});
  }
}

/**
 * آیا این authority متعلق به همین نوبت/رزرو است؟
 * اول ستون خود رکورد (سازگار با رکوردهای قدیمی)، بعد جدول PaymentAuthority.
 */
export async function isAuthorityOf(
  target: AuthorityTarget,
  currentAuthority: string | null | undefined,
  authority: string
): Promise<boolean> {
  if (currentAuthority && currentAuthority === authority) return true;

  const row = await prisma.paymentAuthority.findUnique({
    where: { authority },
    select: { bookingId: true, bookingGroupId: true },
  });
  if (!row) return false;

  return 'bookingId' in target
    ? row.bookingId === target.bookingId
    : row.bookingGroupId === target.bookingGroupId;
}
