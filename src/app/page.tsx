import type { Metadata } from 'next';
import HomePage from '@/components/HomePage';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Football Prediction Competition | Play Free & Win Rewards',
    description:
      'Play a free football prediction game. Predict total goals, climb the leaderboard and win rewards with Goalactico.',
    keywords: [
      'football prediction game',
      'predict football scores',
      'free football prediction game',
      'football prediction competition',
    ],
    openGraph: {
      title: 'Football Prediction Competition | Play Free & Win Rewards',
      description:
        'Play a free football prediction game. Predict total goals, climb the leaderboard and win rewards with Goalactico.',
      images: ['/og-image.png'],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Football Prediction Competition | Play Free & Win Rewards',
      description:
        'Play a free football prediction game. Predict total goals, climb the leaderboard and win rewards with Goalactico.',
      images: ['/og-image.png'],
    },
  };
}

export default function Home() {
  return <HomePage />;
}
