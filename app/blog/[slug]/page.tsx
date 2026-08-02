// app/blog/[slug]/page.tsx
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { ArrowRight, Calendar } from 'lucide-react';
import { Vazirmatn } from 'next/font/google';
import { MDXRemote } from 'next-mdx-remote/rsc';
import { getAllPosts, getPostBySlug } from '@/lib/posts';

// همون فونت نمایشی سنگین لندینگ — برای تیتر اصلی و تیترهای داخل متن مقاله
const vazir = Vazirmatn({ subsets: ['arabic'], weight: '800', display: 'swap' });

export function generateStaticParams() {
  return getAllPosts().map((post) => ({ slug: post.slug }));
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  let post;
  try {
    post = getPostBySlug(slug);
  } catch {
    notFound();
  }

  if (!post) notFound();

  return (
    <div className="min-h-screen bg-white" dir="rtl">
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-zinc-100">
        <div className="max-w-2xl mx-auto flex items-center gap-1.5 px-5 h-14 md:h-16">
          <Link href="/blog" className="flex items-center gap-1.5 text-zinc-600 hover:text-zinc-900 transition-colors">
            <ArrowRight className="w-4 h-4 shrink-0" />
            <span className="text-[13px] font-bold">بازگشت به وبلاگ</span>
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-5 py-8 md:py-14">
        <h1 className={`${vazir.className} text-[22px] md:text-3xl text-zinc-900 mb-3 leading-[1.5]`}>
          {post.meta.title}
        </h1>

        {post.meta.date && (
          <div className="flex items-center gap-1.5 text-[12px] text-zinc-400 mb-6 md:mb-8">
            <Calendar className="w-3.5 h-3.5" />
            <span>{post.meta.date}</span>
          </div>
        )}

        {post.meta.image && (
          <div className="relative w-full h-52 md:h-72 rounded-2xl overflow-hidden bg-zinc-100 mb-8">
            <Image src={post.meta.image} alt={post.meta.title} fill className="object-cover" />
          </div>
        )}

        <article
          className="text-zinc-700 text-[14.5px] md:text-[15.5px] leading-[2]
            [&_h1]:font-['inherit']
            [&_h2]:text-[19px] md:[&_h2]:text-[22px] [&_h2]:font-extrabold [&_h2]:text-zinc-900 [&_h2]:mt-10 [&_h2]:mb-4 [&_h2]:leading-snug
            [&_h3]:text-[16.5px] md:[&_h3]:text-lg [&_h3]:font-bold [&_h3]:text-zinc-900 [&_h3]:mt-8 [&_h3]:mb-3
            [&_p]:mb-5
            [&_ul]:list-disc [&_ul]:pr-5 [&_ul]:mb-5 [&_ul]:space-y-1.5
            [&_ol]:list-decimal [&_ol]:pr-5 [&_ol]:mb-5 [&_ol]:space-y-1.5
            [&_li]:leading-[1.9]
            [&_a]:text-[#824c71] [&_a]:font-medium [&_a]:underline [&_a]:underline-offset-2
            [&_strong]:font-bold [&_strong]:text-zinc-900
            [&_blockquote]:border-r-4 [&_blockquote]:border-[#824c71]/30 [&_blockquote]:bg-[#824c71]/[0.04] [&_blockquote]:rounded-l-lg [&_blockquote]:pr-4 [&_blockquote]:py-2 [&_blockquote]:text-zinc-600 [&_blockquote]:my-6
            [&_code]:bg-zinc-100 [&_code]:text-[#824c71] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded-md [&_code]:text-[13px]
            [&_pre]:bg-zinc-900 [&_pre]:text-zinc-100 [&_pre]:p-4 [&_pre]:rounded-xl [&_pre]:overflow-x-auto [&_pre]:text-[13px] [&_pre]:my-6 [&_pre]:leading-relaxed
            [&_pre_code]:bg-transparent [&_pre_code]:text-inherit [&_pre_code]:p-0
            [&_img]:rounded-2xl [&_img]:my-6 [&_img]:w-full
            [&_hr]:my-10 [&_hr]:border-zinc-100
            [&_table]:w-full [&_table]:text-[13px] [&_table]:my-6
            [&_th]:bg-zinc-50 [&_th]:p-2.5 [&_th]:text-right [&_th]:font-bold
            [&_td]:p-2.5 [&_td]:border-t [&_td]:border-zinc-100"
        >
          <MDXRemote source={post.content} />
        </article>

        <div className="mt-12 pt-6 border-t border-zinc-100">
          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 text-[13px] font-bold text-[#824c71] hover:text-[#6d3f5e] transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
            بازگشت به همه‌ی مقالات
          </Link>
        </div>
      </main>
    </div>
  );
}