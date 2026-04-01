import type { Metadata } from 'next';
import { createPageMetadata } from '@/lib/seo';
import BlogPageContent from '@/components/BlogPage';

export async function generateMetadata(): Promise<Metadata> {
  return createPageMetadata('blog', {
    title: 'Football Blog: Goals, Stats, Predictions & Matchday Insights',
    description:
      'Read football insights, goal trends and matchday breakdowns. Think you can predict the game? Start spotting high-scoring matches.',
  });
}

export default function BlogPage() {
  return <BlogPageContent />;
}
