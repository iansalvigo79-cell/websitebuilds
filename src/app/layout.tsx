import './globals.css';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import AppShell from '@/components/AppShell';

const BASE_URL = 'https://www.goalactico.net';
const defaultDescription =
  'Goalactico is a free football prediction game where you predict total goals, climb the leaderboard, and win prizes — a skill-based competition with no betting.';

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
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
    url: BASE_URL,
    siteName: 'Goalactico',
    locale: 'en_GB',
    type: 'website',
    images: [
      {
        url: `${BASE_URL}/assets/images/og-image.png`,
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
    images: [`${BASE_URL}/assets/images/og-image.png`],
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
        {/* Google tag (gtag.js) */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-96F0345M6R"></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-96F0345M6R');
            `,
          }}
        />
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
