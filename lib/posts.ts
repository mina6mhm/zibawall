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

export function getPostBySlug(slug: string) {
  const fullPath = path.join(postsDirectory, `${slug}.mdx`);
  const fileContents = fs.readFileSync(fullPath, 'utf8');
  const { data, content } = matter(fileContents);
  return { meta: data, content };
}

export function getAllPosts(): PostMeta[] {
  const slugs = fs.readdirSync(postsDirectory);

  const posts = slugs.map((slug) => {
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
  
  return posts;
}
