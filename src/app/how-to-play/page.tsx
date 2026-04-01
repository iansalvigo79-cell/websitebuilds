import type { Metadata } from 'next';
import HowToPlayPage from '@/components/HowToPlayPage';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'How Football Prediction Games Work | Goalactico Guide',
    description:
      'Simple guide to playing our football prediction game. No betting, just skill-based scoring and leaderboard competition.',
    keywords: [
      'how do football prediction games work',
      'how to predict football scores',
      'what is a football prediction game',
    ],
  };
}

export default function HowToPlay() {
  return <HowToPlayPage />;
}
