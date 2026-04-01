import type { Metadata } from 'next';

type PageKey = 'home' | 'prizes' | 'how-to-play' | 'blog';

const DEFAULT_OG_IMAGE = '/og-image.png';

const PAGE_METADATA: Record<PageKey, Metadata> = {
  home: {
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
      images: [DEFAULT_OG_IMAGE],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Football Prediction Competition | Play Free & Win Rewards',
      description:
        'Play a free football prediction game. Predict total goals, climb the leaderboard and win rewards with Goalactico.',
      images: [DEFAULT_OG_IMAGE],
    },
  },
  prizes: {
    title: 'Predict Football & Win Prizes | Goalactico Competitions',
    description:
      'Win prizes by predicting football goals. Compete in leagues and earn rewards based on accuracy with Goalactico.',
    keywords: [
      'football prediction game with prizes',
      'win prizes football predictions',
      'football competitions with prizes',
    ],
    openGraph: {
      title: 'Predict Football & Win Prizes | Goalactico Competitions',
      description:
        'Win prizes by predicting football goals. Compete in leagues and earn rewards based on accuracy with Goalactico.',
      images: [DEFAULT_OG_IMAGE],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Predict Football & Win Prizes | Goalactico Competitions',
      description:
        'Win prizes by predicting football goals. Compete in leagues and earn rewards based on accuracy with Goalactico.',
      images: [DEFAULT_OG_IMAGE],
    },
  },
  'how-to-play': {
    title: 'How Football Prediction Games Work | Goalactico Guide',
    description:
      'Simple guide to playing our football prediction game. No betting, just skill-based scoring and leaderboard competition.',
    keywords: [
      'how do football prediction games work',
      'how to predict football scores',
      'what is a football prediction game',
    ],
    openGraph: {
      title: 'How Football Prediction Games Work | Goalactico Guide',
      description:
        'Simple guide to playing our football prediction game. No betting, just skill-based scoring and leaderboard competition.',
      images: [DEFAULT_OG_IMAGE],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'How Football Prediction Games Work | Goalactico Guide',
      description:
        'Simple guide to playing our football prediction game. No betting, just skill-based scoring and leaderboard competition.',
      images: [DEFAULT_OG_IMAGE],
    },
  },
  blog: {
    title: 'Goalactico Blog',
    description: 'News, tips, and updates from the Goalactico football prediction community.',
    keywords: [
      'football prediction blog',
      'prediction tips',
      'football analytics',
      'Goalactico news',
    ],
    openGraph: {
      title: 'Goalactico Blog',
      description: 'News, tips, and updates from the Goalactico football prediction community.',
      images: [DEFAULT_OG_IMAGE],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Goalactico Blog',
      description: 'News, tips, and updates from the Goalactico football prediction community.',
      images: [DEFAULT_OG_IMAGE],
    },
  },
};

export function createPageMetadata(
  page: PageKey,
  overrides: Partial<Metadata> = {}
): Metadata {
  const base = PAGE_METADATA[page];
  const title = overrides.title ?? base.title;
  const description = overrides.description ?? base.description;
  const keywords = overrides.keywords ?? base.keywords;

  return {
    ...base,
    ...overrides,
    title,
    description,
    keywords,
    openGraph: {
      ...base.openGraph,
      ...overrides.openGraph,
      title: overrides.openGraph?.title ?? title,
      description: overrides.openGraph?.description ?? description,
      images: overrides.openGraph?.images ?? base.openGraph?.images ?? [DEFAULT_OG_IMAGE],
    },
    twitter: {
      ...base.twitter,
      ...overrides.twitter,
      title: overrides.twitter?.title ?? title,
      description: overrides.twitter?.description ?? description,
      images: overrides.twitter?.images ?? base.twitter?.images ?? [DEFAULT_OG_IMAGE],
    },
  };
}
