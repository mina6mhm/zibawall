// app/blog/page.tsx
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { Vazirmatn } from 'next/font/google';
import { getAllPosts } from '@/lib/posts';

// همون فونت نمایشی سنگین که توی لندینگ برای تیترها استفاده شده — برای هماهنگی هویت بصری
const vazir = Vazirmatn({ subsets: ['arabic'], weight: '800', display: 'swap' });

export const metadata = {
  title: 'وبلاگ زیباوال',
  description: 'مقالات و راهنمای زیباوال درباره‌ی نوبت‌دهی و مدیریت سالن‌های زیبایی.',
};

export default function BlogIndexPage() {
  const posts = getAllPosts();

  return (
    <div className="min-h-screen bg-white" dir="rtl">
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-zinc-100">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-5 md:px-10 h-14 md:h-16">
          <Link href="/" className="flex items-center gap-1.5 text-zinc-600 hover:text-zinc-900 transition-colors">
            <ArrowRight className="w-4 h-4 shrink-0" />
            <span className="text-[13px] font-bold">بازگشت</span>
          </Link>
          <span className={`${vazir.className} text-zinc-900 text-[13px] md:text-sm`}>وبلاگ زیباوال</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-5 md:px-10 py-8 md:py-14">
        <h1 className={`${vazir.className} text-2xl md:text-[32px] text-zinc-900 mb-1.5`}>
          آخرین مقالات
        </h1>
        <p className="text-[13px] md:text-sm text-zinc-500 mb-8 md:mb-12">
          راهنما و نکات کاربردی درباره‌ی سالن‌های زیبایی و نوبت‌دهی آنلاین
        </p>

        {posts.length === 0 ? (
          <div className="text-center py-16 bg-zinc-50 rounded-2xl">
            <p className="text-zinc-400 text-sm">هنوز مقاله‌ای منتشر نشده است.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
            {posts.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="group bg-white border border-zinc-100 rounded-2xl overflow-hidden shadow-sm shadow-zinc-200/40 hover:shadow-md hover:-translate-y-0.5 transition-all"
              >
                <div className="relative w-full h-44 sm:h-40 bg-zinc-100">
                  <Image
                    src={post.image || '/images/default-blog.jpg'}
                    alt={post.title}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="p-4 md:p-5">
                  <h2 className="font-bold text-zinc-900 text-[15px] md:text-base mb-1.5 leading-snug">
                    {post.title}
                  </h2>
                  <p className="text-[12.5px] md:text-[13px] text-zinc-500 leading-relaxed line-clamp-2">
                    {post.description}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}