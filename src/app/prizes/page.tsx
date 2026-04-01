import type { Metadata } from 'next';
import { createPageMetadata } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  return createPageMetadata('prizes');
}

export default function PrizesPage() {
  return null;
}
