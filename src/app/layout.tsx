import './globals.css';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import AppShell from '@/components/AppShell';

const defaultDescription =
  'Goalactico is a free football prediction game where you predict total goals, climb the leaderboard, and win prizes — a skill-based competition with no betting.';

export const metadata: Metadata = {
  metadataBase: new URL('https://www.goalactico.net'),
  title: {
    default: 'Goalactico',
    template: '%s | Goalactico',
  },
  description: defaultDescription,
  keywords: [
    'football prediction game',
    'free football prediction game',
    'predict football scores',
    'predict total goals',
    'football prediction competition',
    'football prediction game with prizes',
    'skill-based football predictions',
    'no betting football predictions',
    'football score predictions',
  ],
  openGraph: {
    title: 'Goalactico',
    description: defaultDescription,
    url: 'https://www.goalactico.net',
    siteName: 'Goalactico',
    locale: 'en_GB',
    type: 'website',
    images: [
      {
        url: '/assets/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Goalactico',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Goalactico',
    description: defaultDescription,
    images: ['/assets/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Google Fonts for heading style */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* <link href="https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@700;900&family=Bebas+Neue&family=Inter:wght@300;400;600;800;900&display=swap" rel="stylesheet" /> */}
        <link rel="icon" type="image/png" href="/assets/images/logo.png" />
      </head>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
