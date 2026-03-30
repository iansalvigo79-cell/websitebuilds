'use client';

import { Box, Button, Card, CardContent, Container, Stack, TextField, Typography } from '@mui/material';
import { useState } from 'react';
import { toast } from 'react-toastify';
import AmbientBackground from '@/components/ui/AmbientBackground';

type ContactFormState = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  message: string;
};

const INITIAL_STATE: ContactFormState = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  message: '',
};

export default function ContactPage() {
  const [formData, setFormData] = useState<ContactFormState>(INITIAL_STATE);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    toast.success('Thanks! Your message has been sent.');
    setFormData(INITIAL_STATE);
  };

  return (
    <Box sx={{ position: 'relative', backgroundColor: '#050505', overflow: 'hidden' }}>
      <AmbientBackground />
      <Container maxWidth="sm" sx={{ position: 'relative', zIndex: 1, py: { xs: 7, md: 10 } }}>
        <Box className="anim-fade-up" sx={{ textAlign: 'center', mb: 4 }}>
          <Typography variant="h3" sx={{ color: '#fff', fontWeight: 900 }}>
            Contact Us
          </Typography>
          <Typography sx={{ color: '#9ca3af', mt: 1 }}>
            Send us a message and we will get back to you soon.
          </Typography>
        </Box>

        <Card
          className="anim-fade-up"
          sx={{
            backgroundColor: 'rgba(10, 10, 10, 0.85)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 3,
            boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
          }}
        >
          <CardContent sx={{ p: { xs: 3, md: 4 } }}>
            <form onSubmit={handleSubmit}>
              <Stack spacing={2.5}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <TextField
                    name="firstName"
                    label="First Name"
                    placeholder="Jane"
                    value={formData.firstName}
                    onChange={handleChange}
                    fullWidth
                    required
                    variant="outlined"
                  />
                  <TextField
                    name="lastName"
                    label="Last Name"
                    placeholder="Doe"
                    value={formData.lastName}
                    onChange={handleChange}
                    fullWidth
                    required
                    variant="outlined"
                  />
                </Stack>

                <TextField
                  name="email"
                  label="Email"
                  placeholder="you@example.com"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  fullWidth
                  required
                  variant="outlined"
                />

                <TextField
                  name="phone"
                  label="WhatsApp / Phone Number"
                  placeholder="+1 555 123 4567"
                  value={formData.phone}
                  onChange={handleChange}
                  fullWidth
                  required
                  variant="outlined"
                />

                <TextField
                  name="message"
                  label="Message"
                  placeholder="How can we help?"
                  value={formData.message}
                  onChange={handleChange}
                  fullWidth
                  required
                  variant="outlined"
                  multiline
                  minRows={5}
                />

                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  sx={{
                    backgroundColor: '#16a34a',
                    color: '#0f0505',
                    fontWeight: 800,
                    textTransform: 'none',
                    borderRadius: '10px',
                    py: 1.4,
                    '&:hover': {
                      backgroundColor: '#137f2d',
                    },
                  }}
                >
                  Send Message
                </Button>

                <Typography sx={{ color: '#7c7c7c', fontSize: '0.85rem', textAlign: 'center' }}>
                  We typically reply within 1-2 business days.
                </Typography>
              </Stack>
            </form>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}
