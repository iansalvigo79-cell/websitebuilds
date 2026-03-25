"use client";

import { Box, Button, Container, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-toastify';
import ModernLoader from '@/components/ui/ModernLoader';
import { allCountries } from 'country-telephone-data';

type TeamOption = { id: string; name: string };

const COUNTRY_CODES = allCountries
  .map((country: { name: string; iso2: string; dialCode: string }) => {
    const dial = country.dialCode.startsWith('+') ? country.dialCode : `+${country.dialCode}`;
    return {
      code: dial,
      iso2: country.iso2.toUpperCase(),
      label: `${country.name} (${dial})`,
    };
  })
  .sort((a, b) => a.label.localeCompare(b.label));

const COUNTRY_CODES_BY_LENGTH = [...COUNTRY_CODES].sort((a, b) => b.code.length - a.code.length);

const splitPhone = (value?: string | null) => {
  if (!value) {
    return { phoneCountryCode: '+1', phoneNumber: '' };
  }
  const trimmed = value.trim();
  if (!trimmed.startsWith('+')) {
    return { phoneCountryCode: '+1', phoneNumber: trimmed };
  }
  const match = COUNTRY_CODES_BY_LENGTH.find((entry) => trimmed.startsWith(entry.code));
  if (match) {
    return {
      phoneCountryCode: match.code,
      phoneNumber: trimmed.slice(match.code.length).trim(),
    };
  }
  return { phoneCountryCode: '', phoneNumber: trimmed };
};

export default function SettingsPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [currentEmail, setCurrentEmail] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [profileForm, setProfileForm] = useState({
    displayName: '',
    phoneCountryCode: '+1',
    phoneNumber: '',
    teamId: '',
  });
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [subscription, setSubscription] = useState({
    accountType: 'free',
    subscriptionStatus: 'inactive',
    stripeSubscriptionId: null as string | null,
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingEmail, setIsSavingEmail] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [isPortalLoading, setIsPortalLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const loadSettings = async () => {
      setIsLoading(true);
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          router.push('/signin');
          return;
        }
        if (!isMounted) return;
        setUserId(user.id);
        const email = user.email ?? '';
        setCurrentEmail(email);
        setNewEmail(email);

        const [profileRes, teamsRes] = await Promise.all([
          supabase
            .from('profiles')
            .select('display_name, whatsapp, team_id, account_type, subscription_status, stripe_subscription_id')
            .eq('id', user.id)
            .single(),
          supabase
            .from('teams')
            .select('id, name')
            .order('name', { ascending: true }),
        ]);

        if (!isMounted) return;

        if (profileRes.error) {
          console.error('Settings profile load error:', profileRes.error);
          toast.error('Failed to load settings');
        } else if (profileRes.data) {
          const phoneParts = splitPhone(profileRes.data.whatsapp);
          setProfileForm({
            displayName: profileRes.data.display_name ?? '',
            phoneCountryCode: phoneParts.phoneCountryCode,
            phoneNumber: phoneParts.phoneNumber,
            teamId: profileRes.data.team_id ?? '',
          });
          setSubscription({
            accountType: profileRes.data.account_type ?? 'free',
            subscriptionStatus: profileRes.data.subscription_status ?? 'inactive',
            stripeSubscriptionId: profileRes.data.stripe_subscription_id ?? null,
          });
        }

        if (teamsRes.error) {
          console.error('Settings teams load error:', teamsRes.error);
          setTeams([]);
        } else {
          setTeams((teamsRes.data || []) as TeamOption[]);
        }
      } catch (err) {
        console.error('Settings load error:', err);
        toast.error('Failed to load settings');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadSettings();
    return () => {
      isMounted = false;
    };
  }, [router]);

  const isPaid = useMemo(
    () => subscription.accountType === 'paid' || Boolean(subscription.stripeSubscriptionId),
    [subscription.accountType, subscription.stripeSubscriptionId]
  );

  const inputStyles = {
    '& .MuiOutlinedInput-root': {
      backgroundColor: '#111827',
      borderRadius: '8px',
      border: '1px solid rgba(255,255,255,0.12)',
      color: '#fff',
      '&:hover': {
        borderColor: 'rgba(255,255,255,0.2)',
      },
      '&.Mui-focused': {
        borderColor: '#16a34a',
      },
    },
    '& input:-webkit-autofill, & textarea:-webkit-autofill': {
      WebkitBoxShadow: '0 0 0 1000px #111827 inset',
      WebkitTextFillColor: '#fff',
      caretColor: '#fff',
      borderRadius: '8px',
    },
    '& input:-webkit-autofill:hover, & input:-webkit-autofill:focus, & textarea:-webkit-autofill:hover, & textarea:-webkit-autofill:focus': {
      WebkitBoxShadow: '0 0 0 1000px #111827 inset',
      WebkitTextFillColor: '#fff',
      caretColor: '#fff',
    },
    '& .MuiOutlinedInput-input::placeholder': {
      color: '#888',
      opacity: 1,
    },
    '& .MuiFormHelperText-root': {
      color: '#9ca3af',
      marginTop: '4px',
    },
  };

  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleProfileSave = async () => {
    if (!userId) return;
    const displayName = profileForm.displayName.trim();
    const rawPhone = profileForm.phoneNumber.trim();

    if (displayName.length > 20) {
      toast.error('Display name must be 20 characters or less');
      return;
    }
    if (rawPhone) {
      if (!profileForm.phoneCountryCode && !rawPhone.startsWith('+')) {
        toast.error('Please select a country code');
        return;
      }
    }

    setIsSavingProfile(true);
    try {
      const selectedTeam = teams.find((team) => team.id === profileForm.teamId) || null;
      const normalizedDigits = rawPhone.replace(/[^\d]/g, '');
      const combinedPhone = rawPhone
        ? (profileForm.phoneCountryCode
          ? `${profileForm.phoneCountryCode}${normalizedDigits}`
          : rawPhone)
        : '';
      const updates: Record<string, string | null> = {
        display_name: displayName || null,
        whatsapp: combinedPhone || null,
        team_id: profileForm.teamId || null,
        team_name: selectedTeam?.name ?? null,
      };

      let { error } = await supabase.from('profiles').update(updates).eq('id', userId);
      if (error && updates.team_name) {
        const fallback = await supabase
          .from('profiles')
          .update({
            display_name: updates.display_name,
            whatsapp: updates.whatsapp,
            team_id: updates.team_id,
          })
          .eq('id', userId);
        if (fallback.error) {
          toast.error('Failed to update settings: ' + fallback.error.message);
          return;
        }
        toast.success('Settings updated (team name will sync later).');
        return;
      }
      if (error) {
        toast.error('Failed to update settings: ' + error.message);
        return;
      }
      toast.success('Settings updated successfully');
    } catch (err) {
      console.error('Profile save error:', err);
      toast.error('Failed to update settings');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleEmailUpdate = async () => {
    if (!userId) return;
    const trimmedEmail = newEmail.trim();
    if (!trimmedEmail || trimmedEmail === currentEmail) {
      toast.info('Email is already up to date');
      return;
    }
    if (!validateEmail(trimmedEmail)) {
      toast.error('Please enter a valid email');
      return;
    }

    setIsSavingEmail(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: trimmedEmail });
      if (error) {
        toast.error('Email update failed: ' + error.message);
        return;
      }
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ email: trimmedEmail })
        .eq('id', userId);
      if (profileError) {
        console.warn('Profile email update warning:', profileError);
      }
      toast.success('Email update requested. Check your inbox to confirm.');
    } catch (err) {
      console.error('Email update error:', err);
      toast.error('Email update failed');
    } finally {
      setIsSavingEmail(false);
    }
  };

  const handlePasswordUpdate = async () => {
    if (!password) {
      toast.error('Please enter a new password');
      return;
    }
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setIsSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        toast.error('Password update failed: ' + error.message);
        return;
      }
      toast.success('Password updated successfully');
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      console.error('Password update error:', err);
      toast.error('Password update failed');
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleManageBilling = async () => {
    setIsPortalLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('Please sign in again');
        setIsPortalLoading(false);
        return;
      }
      const res = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || 'Could not open billing portal');
        setIsPortalLoading(false);
        return;
      }
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error('Portal URL not returned');
        setIsPortalLoading(false);
      }
    } catch (err) {
      console.error('Portal error:', err);
      toast.error('An unexpected error occurred');
      setIsPortalLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!userId) return;
    const confirmed = window.confirm(
      'This will permanently delete your account and data. This action cannot be undone. Continue?'
    );
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('Please sign in again');
        setIsDeleting(false);
        return;
      }
      const res = await fetch('/api/account/delete', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || 'Account deletion failed');
        setIsDeleting(false);
        return;
      }
      await supabase.auth.signOut();
      toast.success('Account deleted');
      router.push('/');
    } catch (err) {
      console.error('Delete account error:', err);
      toast.error('Account deletion failed');
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <ModernLoader
        label="Loading Settings"
        sublabel="Preparing your account controls..."
        minHeight="100vh"
        sx={{ backgroundColor: '#0a0a0a' }}
      />
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: '#0a0a0a',
        py: 6,
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          inset: 0,
          backgroundImage: 'url(/images/settings-modal-bg.svg)',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
          backgroundSize: 'cover',
          opacity: 0.02,
          pointerEvents: 'none',
        },
      }}
    >
      <Container maxWidth="md" sx={{ position: 'relative', zIndex: 1 }}>
        <Box sx={{ textAlign: 'center', mb: 5 }}>
          <Typography
            variant="h2"
            sx={{
              fontWeight: 900,
              fontSize: { xs: '2rem', md: '2.5rem' },
              color: '#fff',
              textTransform: 'uppercase',
              letterSpacing: 1,
            }}
          >
            Account Settings
          </Typography>
          <Typography sx={{ color: '#9ca3af', mt: 1 }}>
            Update your profile, security, and subscription preferences.
          </Typography>
        </Box>

        <Stack spacing={3}>
          <Box
            sx={{
              backgroundColor: 'rgba(17,24,39,0.9)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '14px',
              p: { xs: 3, md: 4 },
            }}
          >
            <Typography sx={{ color: '#fff', fontWeight: 800, mb: 2 }}>
              Profile Details
            </Typography>
            <Stack spacing={2.5}>
              <TextField
                fullWidth
                label="Display Name"
                placeholder="Your public display name"
                value={profileForm.displayName}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, displayName: e.target.value }))}
                helperText="Shown on leaderboards"
                sx={inputStyles}
              />
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                <TextField
                  select
                  fullWidth
                  label="Country Code"
                  value={profileForm.phoneCountryCode}
                  onChange={(e) => setProfileForm((prev) => ({ ...prev, phoneCountryCode: e.target.value }))}
                  helperText="Select a country code"
                  sx={inputStyles}
                >
                  <MenuItem value="">Other</MenuItem>
                  {COUNTRY_CODES.map((entry) => (
                    <MenuItem key={`${entry.iso2}-${entry.code}`} value={entry.code}>
                      {entry.label}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  fullWidth
                  label="WhatsApp / Phone Number"
                  placeholder="7012345678"
                  value={profileForm.phoneNumber}
                  onChange={(e) => setProfileForm((prev) => ({ ...prev, phoneNumber: e.target.value }))}
                  helperText="Optional"
                  sx={inputStyles}
                />
              </Stack>
              <TextField
                select
                fullWidth
                label="Favourite Team"
                value={profileForm.teamId}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, teamId: e.target.value }))}
                helperText={teams.length ? 'Pick your favourite club' : 'No teams available'}
                sx={inputStyles}
              >
                <MenuItem value="">No team selected</MenuItem>
                {teams.map((team) => (
                  <MenuItem key={team.id} value={team.id}>
                    {team.name}
                  </MenuItem>
                ))}
              </TextField>
              <Button
                variant="contained"
                onClick={handleProfileSave}
                disabled={isSavingProfile}
                sx={{
                  alignSelf: 'flex-start',
                  backgroundColor: isSavingProfile ? '#666' : '#16a34a',
                  color: '#0f0505',
                  fontWeight: 800,
                  textTransform: 'none',
                  px: 3,
                  '&:hover': { backgroundColor: isSavingProfile ? '#666' : '#137f2d' },
                }}
              >
                {isSavingProfile ? 'Saving...' : 'Save Profile'}
              </Button>
            </Stack>
          </Box>

          <Box
            sx={{
              backgroundColor: 'rgba(17,24,39,0.9)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '14px',
              p: { xs: 3, md: 4 },
            }}
          >
            <Typography sx={{ color: '#fff', fontWeight: 800, mb: 2 }}>
              Email & Password
            </Typography>
            <Stack spacing={2.5}>
              <TextField
                fullWidth
                label="Current Email"
                value={currentEmail}
                disabled
                sx={inputStyles}
              />
              <TextField
                fullWidth
                label="New Email"
                placeholder="name@example.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                sx={inputStyles}
              />
              <Button
                variant="outlined"
                onClick={handleEmailUpdate}
                disabled={isSavingEmail}
                sx={{
                  alignSelf: 'flex-start',
                  borderColor: '#16a34a',
                  color: '#16a34a',
                  fontWeight: 700,
                  textTransform: 'none',
                  px: 3,
                  '&:hover': { borderColor: '#137f2d', color: '#137f2d' },
                }}
              >
                {isSavingEmail ? 'Updating...' : 'Update Email'}
              </Button>

              <Box sx={{ borderTop: '1px solid rgba(255,255,255,0.08)', pt: 2 }}>
                <TextField
                  fullWidth
                  label="New Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  sx={inputStyles}
                />
              </Box>
              <TextField
                fullWidth
                label="Confirm New Password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                sx={inputStyles}
              />
              <Button
                variant="contained"
                onClick={handlePasswordUpdate}
                disabled={isSavingPassword}
                sx={{
                  alignSelf: 'flex-start',
                  backgroundColor: isSavingPassword ? '#666' : '#16a34a',
                  color: '#0f0505',
                  fontWeight: 800,
                  textTransform: 'none',
                  px: 3,
                  '&:hover': { backgroundColor: isSavingPassword ? '#666' : '#137f2d' },
                }}
              >
                {isSavingPassword ? 'Updating...' : 'Update Password'}
              </Button>
            </Stack>
          </Box>

          <Box
            sx={{
              backgroundColor: 'rgba(17,24,39,0.9)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '14px',
              p: { xs: 3, md: 4 },
            }}
          >
            <Typography sx={{ color: '#fff', fontWeight: 800, mb: 2 }}>
              Subscription
            </Typography>
            <Typography sx={{ color: '#9ca3af', mb: 2 }}>
              Status: {subscription.subscriptionStatus || 'inactive'}
            </Typography>
            {isPaid ? (
              <Button
                variant="outlined"
                onClick={handleManageBilling}
                disabled={isPortalLoading}
                sx={{
                  borderColor: '#16a34a',
                  color: '#16a34a',
                  fontWeight: 700,
                  textTransform: 'none',
                  px: 3,
                  '&:hover': { borderColor: '#137f2d', color: '#137f2d' },
                }}
              >
                {isPortalLoading ? 'Opening...' : 'Manage or Cancel Subscription'}
              </Button>
            ) : (
              <Button
                variant="contained"
                onClick={() => router.push('/paywall')}
                sx={{
                  backgroundColor: '#16a34a',
                  color: '#0f0505',
                  fontWeight: 800,
                  textTransform: 'none',
                  px: 3,
                  '&:hover': { backgroundColor: '#137f2d' },
                }}
              >
                Upgrade to Pro
              </Button>
            )}
          </Box>

          <Box
            sx={{
              backgroundColor: 'rgba(127,29,29,0.15)',
              border: '1px solid rgba(239,68,68,0.4)',
              borderRadius: '14px',
              p: { xs: 3, md: 4 },
            }}
          >
            <Typography sx={{ color: '#fca5a5', fontWeight: 800, mb: 1 }}>
              Danger Zone
            </Typography>
            <Typography sx={{ color: '#fecaca', mb: 2 }}>
              Permanently delete your account and all associated data.
            </Typography>
            <Button
              variant="contained"
              color="error"
              onClick={handleDeleteAccount}
              disabled={isDeleting}
              sx={{
                backgroundColor: isDeleting ? '#7f1d1d' : '#ef4444',
                fontWeight: 800,
                textTransform: 'none',
                px: 3,
                '&:hover': { backgroundColor: isDeleting ? '#7f1d1d' : '#dc2626' },
              }}
            >
              {isDeleting ? 'Deleting...' : 'Delete Account'}
            </Button>
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}

















