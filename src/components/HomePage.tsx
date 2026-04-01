'use client';

import { Hero } from '@/components';
import { createPageMetadata } from '@/lib/seo';
import { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  return createPageMetadata('home');
}

export default function HomePage() {
  return <Hero />;
}
