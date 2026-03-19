"use client";

import { Box, Button, Container, MenuItem, TextField, Typography, Stack, Checkbox, FormControlLabel } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
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

export default function SignUpPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    displayName: '',
    email: '',
    phoneCountryCode: '+1',
    phoneNumber: '',
    password: '',
    confirmPassword: '',
    confirmAge: false,
    termsAccepted: false,
  });

  const [errors, setErrors] = useState({
    firstName: '',
    lastName: '',
    displayName: '',
    phoneNumber: '',
    email: '',
    password: '',
    confirmPassword: '',
    confirmAge: '',
    termsAccepted: '',
  });

  const [isLoading, setIsLoading] = useState(false);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = () => {
    const newErrors = {
      firstName: '',
      lastName: '',
      displayName: '',
      phoneNumber: '',
      email: '',
      password: '',
      confirmPassword: '',
      confirmAge: '',
      termsAccepted: '',
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

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!formData.confirmAge) {
      newErrors.confirmAge = 'You must confirm you are over 18';
    }

    if (!formData.termsAccepted) {
      newErrors.termsAccepted = 'You must accept the terms and privacy policy';
    }

    setErrors(newErrors);
    return Object.values(newErrors).every((error) => error === '');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | { target: { name: string; value: unknown } }) => {
    const { name, value } = e.target;
    const type = 'type' in e.target ? e.target.type : undefined;
    const checked = 'checked' in e.target ? e.target.checked : undefined;

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (typeof value === 'string' ? value : String(value)),
    }));
    // Clear error when user changes value
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

    setIsLoading(true);

    try {
      // Sign up user with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });

      if (authError) {
        console.error('Supabase Auth Error (signup):', authError);
        toast.error(authError.message);
        setIsLoading(false);
        return;
      }

      if (authData.user) {
        const normalizedDigits = formData.phoneNumber.trim().replace(/[^\d]/g, '');
        const combinedPhone = formData.phoneNumber.trim()
          ? (formData.phoneCountryCode
            ? `${formData.phoneCountryCode}${normalizedDigits}`
            : formData.phoneNumber.trim())
          : null;
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: authData.user.id,
            email: formData.email,
            first_name: formData.firstName.trim(),
            last_name: formData.lastName.trim(),
            display_name: formData.displayName.trim() || null,
            whatsapp: combinedPhone,
            account_type: 'free',
            subscription_status: 'inactive',
            role: 0,
          });

        if (profileError) {
          console.error('Supabase Profile Error (signup):', profileError);
          toast.error('Error creating profile: ' + profileError.message);
          setIsLoading(false);
          return;
        }

        toast.success('Account created successfully! Redirecting to login...');
        setTimeout(() => {
          router.push('/signin');
        }, 2000);
      }
    } catch (err) {
      console.error('Unexpected Error (signup):', err);
      toast.error('An unexpected error occurred');
      setIsLoading(false);
    } finally {
      setIsLoading(false);
    }
  };


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
            Join{' '}
            <Box
              component="span"
              sx={{
                color: '#16a34a',
                textShadow: '0 0 20px rgba(22, 163, 74, 0.38)',
              }}
            >
              THE GAME
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
            Create your account and start predicting
          </Typography>
        </Box>

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
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: '#111827',
                    borderRadius: '8px',
                    border: errors.firstName ? '1px solid #ff6b6b' : '1px solid rgba(255,255,255,0.12)',
                    color: '#fff',
                    '&:hover': {
                      borderColor: errors.firstName ? '#ff6b6b' : 'rgba(255,255,255,0.2)',
                    },
                    '&.Mui-focused': {
                      borderColor: errors.firstName ? '#ff6b6b' : '#16a34a',
                    },
                  },
                  '& .MuiOutlinedInput-input::placeholder': {
                    color: '#888',
                    opacity: 1,
                  },
                  '& .MuiFormHelperText-root': {
                    color: errors.firstName ? '#ff6b6b' : '#94a3b8',
                    marginTop: '4px',
                  },
                }}
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
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: '#111827',
                    borderRadius: '8px',
                    border: errors.lastName ? '1px solid #ff6b6b' : '1px solid rgba(255,255,255,0.12)',
                    color: '#fff',
                    '&:hover': {
                      borderColor: errors.lastName ? '#ff6b6b' : 'rgba(255,255,255,0.2)',
                    },
                    '&.Mui-focused': {
                      borderColor: errors.lastName ? '#ff6b6b' : '#16a34a',
                    },
                  },
                  '& .MuiOutlinedInput-input::placeholder': {
                    color: '#888',
                    opacity: 1,
                  },
                  '& .MuiFormHelperText-root': {
                    color: errors.lastName ? '#ff6b6b' : '#94a3b8',
                    marginTop: '4px',
                  },
                }}
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
                placeholder="Enter your display name"
                variant="outlined"
                fullWidth
                value={formData.displayName}
                onChange={handleChange}
                error={!!errors.displayName}
                helperText={errors.displayName || 'This is what shows on the leaderboard'}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: '#111827',
                    borderRadius: '8px',
                    border: errors.displayName ? '1px solid #ff6b6b' : '1px solid rgba(255,255,255,0.12)',
                    color: '#fff',
                    '&:hover': {
                      borderColor: errors.displayName ? '#ff6b6b' : 'rgba(255,255,255,0.2)',
                    },
                    '&.Mui-focused': {
                      borderColor: errors.displayName ? '#ff6b6b' : '#16a34a',
                    },
                  },
                  '& .MuiOutlinedInput-input::placeholder': {
                    color: '#888',
                    opacity: 1,
                  },
                  '& .MuiFormHelperText-root': {
                    color: errors.displayName ? '#ff6b6b' : '#94a3b8',
                    marginTop: '4px',
                  },
                }}
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
                Email Address
              </Typography>
              <TextField
                name="email"
                placeholder="Enter your email"
                type="email"
                variant="outlined"
                fullWidth
                value={formData.email}
                onChange={handleChange}
                error={!!errors.email}
                helperText={errors.email}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: '#111827',
                    borderRadius: '8px',
                    border: errors.email ? '1px solid #ff6b6b' : '1px solid rgba(255,255,255,0.12)',
                    color: '#fff',
                    '&:hover': {
                      borderColor: errors.email ? '#ff6b6b' : 'rgba(255,255,255,0.2)',
                    },
                    '&.Mui-focused': {
                      borderColor: errors.email ? '#ff6b6b' : '#16a34a',
                    },
                  },
                  '& .MuiOutlinedInput-input::placeholder': {
                    color: '#888',
                    opacity: 1,
                  },
                  '& .MuiFormHelperText-root': {
                    color: errors.email ? '#ff6b6b' : '#94a3b8',
                    marginTop: '4px',
                  },
                }}
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
                  sx={{
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
                    '& .MuiOutlinedInput-input::placeholder': {
                      color: '#888',
                      opacity: 1,
                    },
                    '& .MuiFormHelperText-root': {
                      color: '#94a3b8',
                      marginTop: '4px',
                    },
                  }}
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
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: '#111827',
                      borderRadius: '8px',
                      border: errors.phoneNumber ? '1px solid #ff6b6b' : '1px solid rgba(255,255,255,0.12)',
                      color: '#fff',
                      '&:hover': {
                        borderColor: errors.phoneNumber ? '#ff6b6b' : 'rgba(255,255,255,0.2)',
                      },
                      '&.Mui-focused': {
                        borderColor: errors.phoneNumber ? '#ff6b6b' : '#16a34a',
                      },
                    },
                    '& .MuiOutlinedInput-input::placeholder': {
                      color: '#888',
                      opacity: 1,
                    },
                    '& .MuiFormHelperText-root': {
                      color: errors.phoneNumber ? '#ff6b6b' : '#94a3b8',
                      marginTop: '4px',
                    },
                  }}
                />
              </Stack>
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
                Password
              </Typography>
              <TextField
                name="password"
                placeholder="Create a password"
                type="password"
                variant="outlined"
                fullWidth
                value={formData.password}
                onChange={handleChange}
                error={!!errors.password}
                helperText={errors.password}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: '#111827',
                    borderRadius: '8px',
                    border: errors.password ? '1px solid #ff6b6b' : '1px solid rgba(255,255,255,0.12)',
                    color: '#fff',
                    '&:hover': {
                      borderColor: errors.password ? '#ff6b6b' : 'rgba(255,255,255,0.2)',
                    },
                    '&.Mui-focused': {
                      borderColor: errors.password ? '#ff6b6b' : '#16a34a',
                    },
                  },
                  '& .MuiOutlinedInput-input::placeholder': {
                    color: '#888',
                    opacity: 1,
                  },
                  '& .MuiFormHelperText-root': {
                    color: errors.password ? '#ff6b6b' : '#94a3b8',
                    marginTop: '4px',
                  },
                }}
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
                Confirm Password
              </Typography>
              <TextField
                name="confirmPassword"
                placeholder="Confirm your password"
                type="password"
                variant="outlined"
                fullWidth
                value={formData.confirmPassword}
                onChange={handleChange}
                error={!!errors.confirmPassword}
                helperText={errors.confirmPassword}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: '#111827',
                    borderRadius: '8px',
                    border: errors.confirmPassword ? '1px solid #ff6b6b' : '1px solid rgba(255,255,255,0.12)',
                    color: '#fff',
                    '&:hover': {
                      borderColor: errors.confirmPassword ? '#ff6b6b' : 'rgba(255,255,255,0.2)',
                    },
                    '&.Mui-focused': {
                      borderColor: errors.confirmPassword ? '#ff6b6b' : '#16a34a',
                    },
                  },
                  '& .MuiOutlinedInput-input::placeholder': {
                    color: '#888',
                    opacity: 1,
                  },
                  '& .MuiFormHelperText-root': {
                    color: errors.confirmPassword ? '#ff6b6b' : '#94a3b8',
                    marginTop: '4px',
                  },
                }}
              />
            </Box>            <Box>
              <FormControlLabel
                control={
                  <Checkbox
                    name="confirmAge"
                    checked={formData.confirmAge}
                    onChange={handleChange}
                    sx={{
                      color: errors.confirmAge ? '#ff6b6b' : '#16a34a',
                      '&.Mui-checked': {
                        color: errors.confirmAge ? '#ff6b6b' : '#16a34a',
                      },
                    }}
                  />
                }
                label={
                  <Typography sx={{ color: '#999', fontSize: '0.85rem' }}>
                    I confirm I am over 18 years old
                  </Typography>
                }
              />
              {errors.confirmAge && (
                <Typography sx={{ color: '#ff6b6b', fontSize: '0.75rem', mt: 0.5 }}>
                  {errors.confirmAge}
                </Typography>
              )}
            </Box>


            <Box>
              <FormControlLabel
                control={
                  <Checkbox
                    name="termsAccepted"
                    checked={formData.termsAccepted}
                    onChange={handleChange}
                    sx={{
                      color: errors.termsAccepted ? '#ff6b6b' : '#16a34a',
                      '&.Mui-checked': {
                        color: errors.termsAccepted ? '#ff6b6b' : '#16a34a',
                      },
                    }}
                  />
                }
                label={
                  <Typography sx={{ color: '#999', fontSize: '0.85rem' }}>
                    I agree to the{' '}
                    <Box
                      component="span"
                      sx={{ color: '#16a34a', cursor: 'pointer', textDecoration: 'none' }}
                    >
                      Terms of Service
                    </Box>
                    {' '}and{' '}
                    <Box
                      component="span"
                      sx={{ color: '#16a34a', cursor: 'pointer', textDecoration: 'none' }}
                    >
                      Privacy Policy
                    </Box>
                  </Typography>
                }
              />
              {errors.termsAccepted && (
                <Typography sx={{ color: '#ff6b6b', fontSize: '0.75rem', mt: 0.5 }}>
                  {errors.termsAccepted}
                </Typography>
              )}
            </Box>

            <Button
              type="submit"
              variant="contained"
              size="large"
              endIcon={isLoading ? <ModernLoader inline size={20} label="" sublabel="" /> : <ArrowForwardIcon />}
              disabled={isLoading}
              sx={{
                backgroundColor: isLoading ? '#666' : '#16a34a',
                color: '#0f0505',
                fontWeight: 900,
                fontSize: '1rem',
                padding: '14px 24px',
                borderRadius: '8px',
                textTransform: 'uppercase',
                letterSpacing: 1.2,
                transition: 'background-color 0.3s ease',
                mt: 2,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                '&:hover': {
                  backgroundColor: isLoading ? '#666' : '#137f2d',
                  transform: 'none',
                },
                '&:active': {
                  transform: 'none',
                },
              }}
            >
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </Button>

            <Box sx={{ textAlign: 'center', pt: 2 }}>
              <Typography variant="body2" sx={{ color: '#999', fontSize: '0.9rem' }}>
                Already have an account?{' '}
                <Link href="/signin" style={{ color: '#16a34a', textDecoration: 'none' }}>
                  Sign In
                </Link>
              </Typography>
            </Box>
          </Stack>
        </form>
      </Container>
    </Box>
  );
}










