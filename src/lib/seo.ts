import type { Metadata } from 'next';

type PageKey = 'home' | 'prizes' | 'help' | 'blog';

const DEFAULT_OG_IMAGE = '/assets/images/og-image.png';

const PAGE_METADATA = {
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
  'help': {
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
    title: 'Football Blog: Goals, Stats, Predictions & Matchday Insights',
    description:
      'Read football insights, goal trends and matchday breakdowns. Think you can predict the game? Start spotting high-scoring matches.',
    keywords: [
      'football prediction blog',
      'prediction tips',
      'football analytics',
      'Goalactico news',
    ],
    openGraph: {
      title: 'Football Blog: Goals, Stats, Predictions & Matchday Insights',
      description:
        'Read football insights, goal trends and matchday breakdowns. Think you can predict the game? Start spotting high-scoring matches.',
      images: [DEFAULT_OG_IMAGE],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Football Blog: Goals, Stats, Predictions & Matchday Insights',
      description:
        'Read football insights, goal trends and matchday breakdowns. Think you can predict the game? Start spotting high-scoring matches.',
      images: [DEFAULT_OG_IMAGE],
    },
  },
} satisfies Record<PageKey, Metadata>;

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
      images: [DEFAULT_OG_IMAGE],
    },
    twitter: {
      ...base.twitter,
      ...overrides.twitter,
      title: overrides.twitter?.title ?? title,
      description: overrides.twitter?.description ?? description,
      images: [DEFAULT_OG_IMAGE],
    },
  };
}
