"use client";

import { Box, Button, Container, MenuItem, Stack, TextField, Typography } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-toastify';
import ModernLoader from '@/components/ui/ModernLoader';

const COUNTRY_CODES = [
  { code: '+1', label: 'United States (+1)' },
  { code: '+44', label: 'United Kingdom (+44)' },
  { code: '+353', label: 'Ireland (+353)' },
  { code: '+61', label: 'Australia (+61)' },
  { code: '+64', label: 'New Zealand (+64)' },
  { code: '+27', label: 'South Africa (+27)' },
  { code: '+234', label: 'Nigeria (+234)' },
  { code: '+233', label: 'Ghana (+233)' },
  { code: '+254', label: 'Kenya (+254)' },
  { code: '+91', label: 'India (+91)' },
  { code: '+92', label: 'Pakistan (+92)' },
  { code: '+971', label: 'United Arab Emirates (+971)' },
  { code: '+974', label: 'Qatar (+974)' },
  { code: '+966', label: 'Saudi Arabia (+966)' },
  { code: '+49', label: 'Germany (+49)' },
  { code: '+33', label: 'France (+33)' },
  { code: '+34', label: 'Spain (+34)' },
  { code: '+39', label: 'Italy (+39)' },
  { code: '+31', label: 'Netherlands (+31)' },
  { code: '+46', label: 'Sweden (+46)' },
];

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

function SetupParamHandler({ onSetupChange }: { onSetupChange: (value: boolean) => void }) {
  const searchParams = useSearchParams();

  useEffect(() => {
    const setupValue = searchParams.get('setup');
    onSetupChange(setupValue === 'true' || setupValue === '1');
  }, [onSetupChange, searchParams]);

  return null;
}

export default function ProfilePage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    displayName: '',
    phoneCountryCode: '+1',
    phoneNumber: '',
  });
  const [errors, setErrors] = useState({
    firstName: '',
    lastName: '',
    displayName: '',
    phoneNumber: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [isSetup, setIsSetup] = useState(false);

  const loadProfile = useCallback(async () => {
    setIsFetching(true);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        router.push('/signin');
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('display_name, first_name, last_name, whatsapp')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Profile fetch error:', profileError);
        toast.error('Failed to load profile');
      }

      const phoneParts = splitPhone(profile?.whatsapp);
      setFormData({
        firstName: profile?.first_name ?? '',
        lastName: profile?.last_name ?? '',
        displayName: profile?.display_name ?? '',
        phoneCountryCode: phoneParts.phoneCountryCode,
        phoneNumber: phoneParts.phoneNumber,
      });
    } catch (err) {
      console.error('Profile fetch error:', err);
      toast.error('Failed to load profile');
    } finally {
      setIsFetching(false);
    }
  }, [router]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const validateForm = () => {
    const newErrors = {
      firstName: '',
      lastName: '',
      displayName: '',
      phoneNumber: '',
    };

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    } else if (formData.firstName.trim().length < 2) {
      newErrors.firstName = 'First name must be at least 2 characters';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    } else if (formData.lastName.trim().length < 2) {
      newErrors.lastName = 'Last name must be at least 2 characters';
    }

    if (formData.displayName.trim() && formData.displayName.trim().length > 20) {
      newErrors.displayName = 'Display name must be 20 characters or less';
    }

    if (formData.phoneNumber.trim() && !formData.phoneCountryCode) {
      newErrors.phoneNumber = 'Please select a country code';
    }

    setErrors(newErrors);
    return Object.values(newErrors).every((error) => error === '');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name as keyof typeof errors]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSaving(true);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        toast.error('Please sign in again');
        router.push('/signin');
        return;
      }

      const normalizedDigits = formData.phoneNumber.trim().replace(/[^\d]/g, '');
      const combinedPhone = formData.phoneNumber.trim()
        ? (formData.phoneCountryCode
          ? `${formData.phoneCountryCode}${normalizedDigits}`
          : formData.phoneNumber.trim())
        : null;
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: formData.displayName.trim() || null,
          first_name: formData.firstName.trim(),
          last_name: formData.lastName.trim(),
          whatsapp: combinedPhone,
        })
        .eq('id', user.id);

      if (error) {
        toast.error('Failed to update profile: ' + error.message);
        return;
      }

      toast.success('Profile updated successfully');
      if (isSetup) {
        router.push('/dashboard');
      }
    } catch (err) {
      console.error('Profile update error:', err);
      toast.error('An unexpected error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  const getInputStyles = (hasError: boolean) => ({
    '& .MuiOutlinedInput-root': {
      backgroundColor: '#111827',
      borderRadius: '8px',
      border: hasError ? '1px solid #ff6b6b' : '1px solid rgba(255, 255, 255, 0.12)',
      color: '#fff',
      '&:hover': {
        borderColor: hasError ? '#ff6b6b' : 'rgba(255, 255, 255, 0.2)',
      },
      '&.Mui-focused': {
        borderColor: hasError ? '#ff6b6b' : '#16a34a',
      },
    },
    '& .MuiOutlinedInput-input::placeholder': {
      color: '#888',
      opacity: 1,
    },
    '& .MuiFormHelperText-root': {
      color: hasError ? '#ff6b6b' : '#9ca3af',
      marginTop: '4px',
    },
  });

  if (isFetching) {
    return (
      <Box sx={{ minHeight: '100vh', backgroundColor: '#0a0a0a' }}>
        <ModernLoader label="Loading profile" sublabel="" minHeight="100vh" />
      </Box>
    );
  }

  return (
    <Box
      className="anim-fade-up"
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0a0a0a',
        py: 4,
      }}
    >
      <Suspense fallback={null}>
        <SetupParamHandler onSetupChange={setIsSetup} />
      </Suspense>

      <Container maxWidth="sm">
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography
            variant="h2"
            sx={{
              fontWeight: 900,
              fontSize: { xs: '2rem', md: '2.5rem' },
              mb: 1,
              color: '#fff',
              textTransform: 'uppercase',
              letterSpacing: 1,
            }}
          >
            Profile{' '}
            <Box
              component="span"
              sx={{
                color: '#16a34a',
                textShadow: '0 0 20px rgba(22, 163, 74, 0.38)',
              }}
            >
              Settings
            </Box>
          </Typography>
          <Typography
            variant="body1"
            sx={{
              color: '#999',
              fontSize: '0.95rem',
              letterSpacing: 0.5,
            }}
          >
            Keep your profile details up to date.
          </Typography>
        </Box>

        {isSetup ? (
          <Box
            sx={{
              backgroundColor: 'rgba(22,163,74,0.1)',
              border: '1px solid rgba(22,163,74,0.3)',
              borderRadius: '10px',
              color: '#ffffff',
              px: 2,
              py: 1.5,
              mb: 3,
              textAlign: 'center',
            }}
          >
            👋 Welcome! Please complete your profile before continuing.
          </Box>
        ) : null}

        <form onSubmit={handleSubmit} noValidate>
          <Stack spacing={3}>
            <Box>
              <Typography
                sx={{
                  color: '#fff',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  mb: 1,
                  letterSpacing: 1.2,
                  textTransform: 'uppercase',
                }}
              >
                First Name
              </Typography>
              <TextField
                name="firstName"
                placeholder="Enter your first name"
                variant="outlined"
                fullWidth
                value={formData.firstName}
                onChange={handleChange}
                error={!!errors.firstName}
                helperText={errors.firstName}
                sx={getInputStyles(!!errors.firstName)}
              />
            </Box>

            <Box>
              <Typography
                sx={{
                  color: '#fff',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  mb: 1,
                  letterSpacing: 1.2,
                  textTransform: 'uppercase',
                }}
              >
                Last Name
              </Typography>
              <TextField
                name="lastName"
                placeholder="Enter your last name"
                variant="outlined"
                fullWidth
                value={formData.lastName}
                onChange={handleChange}
                error={!!errors.lastName}
                helperText={errors.lastName}
                sx={getInputStyles(!!errors.lastName)}
              />
            </Box>

            <Box>
              <Typography
                sx={{
                  color: '#fff',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  mb: 1,
                  letterSpacing: 1.2,
                  textTransform: 'uppercase',
                }}
              >
                Display Name
              </Typography>
              <TextField
                name="displayName"
                placeholder="Enter display name"
                variant="outlined"
                fullWidth
                value={formData.displayName}
                onChange={handleChange}
                error={!!errors.displayName}
                helperText={errors.displayName || 'This is what shows on the leaderboard'}
                sx={getInputStyles(!!errors.displayName)}
              />
            </Box>

            <Box>
              <Typography
                sx={{
                  color: '#fff',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  mb: 1,
                  letterSpacing: 1.2,
                  textTransform: 'uppercase',
                }}
              >
                WhatsApp / Phone Number
              </Typography>
              <Stack spacing={2} direction={{ xs: 'column', md: 'row' }}>
                <TextField
                  select
                  name="phoneCountryCode"
                  variant="outlined"
                  fullWidth
                  value={formData.phoneCountryCode}
                  onChange={handleChange}
                  helperText="Country code"
                  sx={getInputStyles(false)}
                >
                  <MenuItem value="">Other</MenuItem>
                  {COUNTRY_CODES.map((entry) => (
                    <MenuItem key={entry.code} value={entry.code}>
                      {entry.label}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  name="phoneNumber"
                  placeholder="7012345678"
                  variant="outlined"
                  fullWidth
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  error={!!errors.phoneNumber}
                  helperText={errors.phoneNumber || 'Optional'}
                  sx={getInputStyles(!!errors.phoneNumber)}
                />
              </Stack>
            </Box>

            <Button
              type="submit"
              variant="contained"
              size="large"
              endIcon={isSaving ? <ModernLoader inline size={20} label="" sublabel="" /> : <ArrowForwardIcon />}
              disabled={isSaving}
              sx={{
                backgroundColor: isSaving ? '#666' : '#16a34a',
                color: '#0f0505',
                fontWeight: 900,
                fontSize: '1rem',
                padding: '14px 24px',
                borderRadius: '8px',
                textTransform: 'uppercase',
                letterSpacing: 1.2,
                transition: 'background-color 0.3s ease',
                mt: 2,
                cursor: isSaving ? 'not-allowed' : 'pointer',
                '&:hover': {
                  backgroundColor: isSaving ? '#666' : '#137f2d',
                  transform: 'none',
                },
                '&:active': {
                  transform: 'none',
                },
              }}
            >
              {isSaving ? 'Saving...' : (isSetup ? 'Save & Continue →' : 'Save Profile')}
            </Button>
          </Stack>
        </form>
      </Container>
    </Box>
  );
}








