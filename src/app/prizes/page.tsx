import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Predict Football & Win Prizes | Goalactico Competitions',
    description:
      'Win prizes by predicting football goals. Compete in leagues and earn rewards based on accuracy with Goalactico.',
    keywords: [
      'football prediction game with prizes',
      'win prizes football predictions',
      'football competitions with prizes',
    ],
  };
}

export default function PrizesPage() {
  return null;
}
