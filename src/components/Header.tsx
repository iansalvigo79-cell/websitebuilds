'use client';

import {
  AppBar,
  Toolbar,
  Typography,
  Container,
  Box,
  Button,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Divider,
} from '@mui/material';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, usePathname } from 'next/navigation';
import PersonIcon from '@mui/icons-material/Person';
import SettingsIcon from '@mui/icons-material/Settings';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import LogoutIcon from '@mui/icons-material/Logout';

// Pages where the header should be hidden
const HIDDEN_ROUTES = ['/signin', '/signup'];

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const isHidden = HIDDEN_ROUTES.includes(pathname) || pathname.startsWith('/admin');

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        setUser(authUser);
        // Fetch profile
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .single();
        if (profileData) {
          setProfile(profileData);
        }
      }
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        checkAuth();
      } else {
        setUser(null);
        setProfile(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setAnchorEl(null);
    router.push('/');
  };

  const handleFaqNavigation = () => {
    handleClose();

    if (pathname === '/') {
      const faqSection = document.getElementById('faq');
      if (faqSection) {
        faqSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        window.history.replaceState(null, '', '#faq');
        return;
      }
    }

    router.push('/#faq');
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Hide header on auth and admin pages (after all hooks)
  if (isHidden) {
    return null;
  }

  return (
    <AppBar
      position="sticky"
      className="anim-slide-down"
      sx={{
        backgroundColor: 'transparent !important',
        boxShadow: 'none',
        borderBottom: 'none',
        backdropFilter: 'blur(10px)',
        backgroundImage: 'none !important'
      }}
    >
      <Container maxWidth="lg">
        <Toolbar disableGutters sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box
              sx={{
                width: 80,
                height: 40,
                position: 'relative',
              }}
            >
              <Link href="/" aria-label="Home">
                <Image
                  src="/assets/images/logo.png"
                  alt="Goalactico Logo"
                  width={80}
                  height={40}
                  priority
                />
              </Link>
            </Box>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 900,
                letterSpacing: 1,
                color: '#fff',
                fontSize: { xs: '0.9rem', md: '1.2rem' },
                textTransform: 'uppercase',
              }}
            >
              Goalactico
            </Typography>
          </Box>

          {user ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {/* Settings Gear Icon */}
              <IconButton
                onClick={() => router.push('/settings')}
                sx={{
                  color: '#999',
                  '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.05)', color: '#fff' },
                }}
              >
                <SettingsIcon />
              </IconButton>

              {/* User Profile Icon */}
              <Box sx={{ position: 'relative' }}>
                <IconButton
                  onClick={handleClick}
                  sx={{
                    color: '#999',
                    '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.05)', color: '#fff' },
                  }}
                >
                  <PersonIcon />
                </IconButton>

                <Menu
                  anchorEl={anchorEl}
                  open={open}
                  onClose={handleClose}
                  onClick={handleClose}
                  PaperProps={{
                    elevation: 0,
                    sx: {
                      overflow: 'visible',
                      filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
                      mt: 1.5,
                      minWidth: 220,
                      maxWidth: 220,
                      backgroundColor: '#1a1a1a',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      '&:before': {
                        content: '""',
                        display: 'block',
                        position: 'absolute',
                        top: 0,
                        right: 14,
                        width: 10,
                        height: 10,
                        bgcolor: '#1a1a1a',
                        transform: 'translateY(-50%) rotate(45deg)',
                        zIndex: 0,
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderBottom: 'none',
                        borderRight: 'none',
                      },
                    },
                  }}
                  transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                  anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                >
                  {/* User Info Section */}
                  <Box sx={{ px: 1.5, py: 1.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Avatar
                      sx={{
                        width: 40,
                        height: 40,
                        backgroundColor: '#4a90e2',
                        color: '#fff',
                        fontWeight: 600,
                        fontSize: '1rem',
                      }}
                    >
                      {profile?.display_name ? getInitials(profile.display_name) : user.email?.[0].toUpperCase() || 'U'}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ color: '#fff', fontWeight: 600, fontSize: '0.875rem', lineHeight: 1.2 }}>
                        {profile?.display_name || 'User'}
                      </Typography>
                      <Typography sx={{ color: '#999', fontSize: '0.75rem', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {user.email}
                      </Typography>
                    </Box>
                  </Box>

                  <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)' }} />

                  {/* Menu Items */}
                  <MenuItem
                    onClick={() => {
                      handleClose();
                      router.push('/profile');
                    }}
                    sx={{
                      color: '#fff',
                      py: 1,
                      px: 1.5,
                      minHeight: 'auto',
                      '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.05)' },
                    }}
                  >
                    <PersonIcon sx={{ mr: 1.5, fontSize: '1rem', color: '#999' }} />
                    <Typography sx={{ fontSize: '0.875rem' }}>My Profile</Typography>
                  </MenuItem>
                  <MenuItem
                    onClick={() => {
                      handleClose();
                      router.push('/settings');
                    }}
                    sx={{
                      color: '#fff',
                      py: 1,
                      px: 1.5,
                      minHeight: 'auto',
                      '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.05)' },
                    }}
                  >
                    <SettingsIcon sx={{ mr: 1.5, fontSize: '1rem', color: '#999' }} />
                    <Typography sx={{ fontSize: '0.875rem' }}>Settings</Typography>
                  </MenuItem>
                  <MenuItem
                    onClick={() => {
                      handleClose();
                      router.push('/paywall');
                    }}
                    sx={{
                      color: '#fff',
                      py: 1,
                      px: 1.5,
                      minHeight: 'auto',
                      '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.05)' },
                    }}
                  >
                    <AttachMoneyIcon sx={{ mr: 1.5, fontSize: '1rem', color: '#999' }} />
                    <Typography sx={{ fontSize: '0.875rem' }}>Subscription</Typography>
                  </MenuItem>
                  <MenuItem
                    onClick={handleFaqNavigation}
                    sx={{
                      color: '#fff',
                      py: 1,
                      px: 1.5,
                      minHeight: 'auto',
                      '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.05)' },
                    }}
                  >
                    <HelpOutlineIcon sx={{ mr: 1.5, fontSize: '1rem', color: '#999' }} />
                    <Typography sx={{ fontSize: '0.875rem' }}>FAQ</Typography>
                  </MenuItem>

                  <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)', my: 0.5 }} />

                  {/* Logout Button */}
                  <MenuItem
                    onClick={handleLogout}
                    sx={{
                      color: '#ff4444',
                      py: 1,
                      px: 1.5,
                      minHeight: 'auto',
                      backgroundColor: 'rgba(255, 68, 68, 0.1)',
                      mx: 0.5,
                      mb: 0.5,
                      mt: 0.5,
                      borderRadius: '4px',
                      '&:hover': { backgroundColor: 'rgba(255, 68, 68, 0.2)' },
                    }}
                  >
                    <LogoutIcon sx={{ mr: 1.5, fontSize: '1rem' }} />
                    <Typography sx={{ fontSize: '0.875rem', fontWeight: 600 }}>Logout</Typography>
                  </MenuItem>
                </Menu>
              </Box>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, md: 1.5 } }}>
              <Button
                component={Link}
                href="/signin"
                variant="text"
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  color: '#fff',
                  fontSize: { xs: '0.8rem', md: '0.95rem' },
                  '&:hover': {
                    color: '#16a34a',
                  },
                }}
              >
                Log In
              </Button>
              <Button
                component={Link}
                href="/signup"
                variant="contained"
                sx={{
                  backgroundColor: '#16a34a',
                  color: '#000',
                  textTransform: 'none',
                  fontWeight: 700,
                  borderRadius: '25px',
                  padding: { xs: '8px 16px', md: '10px 24px' },
                  boxShadow: '0 4px 12px rgba(22, 163, 74, 0.28)',
                  fontSize: { xs: '0.8rem', md: '0.95rem' },
                  transition: 'background-color 0.3s ease',
                  '&:hover': {
                    backgroundColor: '#137f2d',
                    transform: 'none',
                  },
                  '&:active': {
                    transform: 'none',
                  },
                  '&:focus-visible': {
                    transform: 'none',
                  },
                }}
              >
                Play for Free
              </Button>

              <Button
                component={Link}
                href="/paywall"
                variant="contained"
                sx={{
                  backgroundColor: '#16a34a',
                  color: '#000',
                  textTransform: 'none',
                  fontWeight: 700,
                  borderRadius: '25px',
                  padding: { xs: '8px 16px', md: '10px 24px' },
                  boxShadow: '0 4px 12px rgba(22, 163, 74, 0.28)',
                  fontSize: { xs: '0.8rem', md: '0.95rem' },
                  transition: 'background-color 0.3s ease',
                  '&:hover': {
                    backgroundColor: '#137f2d',
                    transform: 'none',
                  },
                  '&:active': {
                    transform: 'none',
                  },
                  '&:focus-visible': {
                    transform: 'none',
                  },
                }}
              >
                Subscription
              </Button>
            </Box>
          )}
        </Toolbar>
      </Container>
    </AppBar>
  );
}
