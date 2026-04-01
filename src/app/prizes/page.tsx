import type { Metadata } from 'next';
import { createPageMetadata } from '@/lib/seo';
import PrizeGamesPage from '../prize-games/page';

export async function generateMetadata(): Promise<Metadata> {
  return createPageMetadata('prizes');
}

export default function PrizesPage() {
  return <PrizeGamesPage />
}
