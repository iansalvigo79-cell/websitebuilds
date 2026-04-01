'use client';

import { Box, Container } from '@mui/material';
import BlogsTab from '../app/dashboard/BlogsTab';

export default function BlogPageContent() {
  return (
    <Box sx={{ backgroundColor: '#0a0a0f', minHeight: '100vh' }}>
      <Container maxWidth="xl" sx={{ py: { xs: 4, md: 6 } }}>
        <BlogsTab />
      </Container>
    </Box>
  );
}
