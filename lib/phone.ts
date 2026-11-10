// lib/phone.ts
// تبدیل ارقام فارسی (۰-۹) و عربی (٠-٩) به انگلیسی؛ کاربرانی که با کیبورد فارسی
// شماره یا کد را وارد می‌کنند قبلاً «شماره نامعتبر» یا «کد اشتباه» می‌گرفتند.
export function normalizeDigits(input: unknown): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .trim();
}