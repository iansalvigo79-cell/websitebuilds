import type { Metadata } from 'next';
import HomePage from '@/components/HomePage';
import { createPageMetadata } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  return createPageMetadata('home');
}

export default function Home() {
  return <HomePage />;
}
