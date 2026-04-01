'use client';

import { ReactNode, useEffect, useState } from 'react';
import { CssBaseline } from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import SessionManager from '@/components/SessionManager';

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

export default function AppShell({ children }: { children: ReactNode }) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // Trigger page load animation when client mounts
    setIsMounted(true);
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <SessionManager />
      <div
        className={`app-root ${isMounted ? 'is-mounted' : ''}`}
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#0a0a0a',
        }}
      >
        <Header />
        <div style={{ flex: 1 }}>{children}</div>
        <Footer />
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
  );
}
