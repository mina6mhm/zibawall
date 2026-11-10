// lib/posts.ts
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const postsDirectory = path.join(process.cwd(), 'content/blog');

export type PostMeta = {
  slug: string;
  title: string;
  description: string;
  image?: string;
};

// فقط حروف/عدد/خط‌تیره (فارسی هم مجاز) — جلوی path traversal مثل ../../
const SLUG_RE = /^[\w\u0600-\u06FF-]+$/;

// محتوای بلاگ بین دیپلوی‌ها ثابت است؛ در production فقط یک‌بار از دیسک خوانده می‌شود
// (قبلاً readFileSync همزمان روی هر درخواست، event loop را بلاک می‌کرد).
const isProd = process.env.NODE_ENV === 'production';
const postCache = new Map<string, { meta: Record<string, any>; content: string }>();
let allPostsCache: PostMeta[] | null = null;

export function getPostBySlug(slug: string) {
  if (!SLUG_RE.test(slug)) throw new Error('Invalid slug');

  const cached = isProd ? postCache.get(slug) : undefined;
  if (cached) return cached;

  const fullPath = path.join(postsDirectory, `${slug}.mdx`);
  const fileContents = fs.readFileSync(fullPath, 'utf8');
  const { data, content } = matter(fileContents);
  const result = { meta: data, content };

  if (isProd) postCache.set(slug, result);
  return result;
}

export function getAllPosts(): PostMeta[] {
  if (isProd && allPostsCache) return allPostsCache;

  const entries = fs.readdirSync(postsDirectory);
  const mdxSlugs = entries.filter((entry) => entry.endsWith('.mdx'));

  const posts = mdxSlugs.map((slug) => {
    const fullPath = path.join(postsDirectory, slug);
    const fileContents = fs.readFileSync(fullPath, 'utf8');
    const { data } = matter(fileContents);

    return {
      slug: slug.replace(/\.mdx$/, ''),
      title: data.title,
      description: data.description,
      image: data.image || '/images/default-blog.jpg',
    } as PostMeta;
  });

  if (isProd) allPostsCache = posts;
  return posts;
}