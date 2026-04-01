import type { Metadata } from 'next';
import HowToPlayPage from '@/components/HowToPlayPage';
import { createPageMetadata } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  return createPageMetadata('help');
}

export default function HowToPlay() {
  return <HowToPlayPage />;
}
