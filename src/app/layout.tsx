'use client';

import './globals.css';
import { CssBaseline } from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { ReactNode, useEffect, useState } from 'react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      // Natural grass/forest green used across the UI
      main: '#16a34a',
    },
    secondary: {
      main: '#22c55e',
    },
    background: {
      default: '#0a0a0a',
      paper: '#111111',
    },
    text: {
      primary: '#ffffff',
      secondary: '#ffffff',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", sans-serif',
    h1: {
      fontFamily: '"Chakra Petch", "Bebas Neue", sans-serif',
      fontSize: '2.5rem',
      fontWeight: 900,
      letterSpacing: 0.5,
    },
    h2: {
      fontFamily: '"Chakra Petch", "Bebas Neue", sans-serif',
      fontSize: '2rem',
      fontWeight: 900,
    },
    h3: {
      fontFamily: '"Chakra Petch", "Bebas Neue", sans-serif',
      fontSize: '1.5rem',
      fontWeight: 900,
    },
    h4: {
      fontFamily: '"Chakra Petch", "Bebas Neue", sans-serif',
      fontWeight: 900,
    },
    h5: {
      fontFamily: '"Chakra Petch", "Bebas Neue", sans-serif',
      fontWeight: 900,
    },
    h6: {
      fontFamily: '"Chakra Petch", "Bebas Neue", sans-serif',
      fontWeight: 900,
    },
  },
});

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // Trigger page load animation when client mounts
    setIsMounted(true);
  }, []);
  return (
    <html lang="en">
      <head>
        {/* Google Fonts for heading style */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@700;900&family=Bebas+Neue&family=Inter:wght@300;400;600;800;900&display=swap" rel="stylesheet" />
        <link rel="icon" type="image/png" href="/assets/images/logo.png" />
        <title>GamePredict - Football Game Predictions</title>
        <meta name="description" content="AI-powered football game predictions" />
      </head>
      <body>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <div className={`app-root ${isMounted ? 'is-mounted' : ''}`}>
            {children}
          </div>
          <ToastContainer
            position="top-right"
            autoClose={3000}
            hideProgressBar={false}
            newestOnTop={false}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="dark"
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
