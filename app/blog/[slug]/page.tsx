// app/blog/[slug]/page.tsx
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { MDXRemote } from 'next-mdx-remote/rsc';
import { getAllPosts, getPostBySlug } from '@/lib/posts';

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
        <div className="max-w-3xl mx-auto flex items-center gap-1.5 px-5 h-16">
          <Link href="/blog" className="flex items-center gap-1.5 text-zinc-600 hover:text-zinc-900 transition-colors">
            <ArrowRight className="w-4 h-4" />
            <span className="text-[13px] font-bold">بازگشت به وبلاگ</span>
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 py-10 md:py-14">
        <h1 className="text-2xl md:text-3xl font-bold text-zinc-900 mb-2 leading-snug">
          {post.meta.title}
        </h1>
        {post.meta.date && (
          <p className="text-xs text-zinc-400 mb-8">{post.meta.date}</p>
        )}

        <article
          className="text-zinc-700 text-[14.5px] leading-8
            [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:text-zinc-900 [&_h1]:mt-8 [&_h1]:mb-4
            [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-zinc-900 [&_h2]:mt-8 [&_h2]:mb-3
            [&_h3]:text-lg [&_h3]:font-bold [&_h3]:text-zinc-900 [&_h3]:mt-6 [&_h3]:mb-2
            [&_p]:mb-4
            [&_ul]:list-disc [&_ul]:pr-5 [&_ul]:mb-4
            [&_ol]:list-decimal [&_ol]:pr-5 [&_ol]:mb-4
            [&_a]:text-[#824c71] [&_a]:font-medium
            [&_strong]:font-bold [&_strong]:text-zinc-900
            [&_blockquote]:border-r-4 [&_blockquote]:border-[#824c71]/30 [&_blockquote]:pr-4 [&_blockquote]:text-zinc-500 [&_blockquote]:my-4"
        >
          <MDXRemote source={post.content} />
        </article>
      </main>
    </div>
  );
}