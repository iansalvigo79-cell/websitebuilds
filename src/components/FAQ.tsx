'use client';

import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Container,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

const faqItems = [
  {
    question: 'What do I predict in Goalactico?',
    answer:
      'You’re predicting totals across all games combined in a matchday — not scorelines for each match. Free players play FT (full-time) goals only, while subscribers unlock all four games: FT goals, HT (half-time) goals, FT corners, and HT corners.',
  },
  {
    question: 'When does prediction entry close?',
    answer:
      'Every matchday has a fixed cut-off time. You must submit your prediction before this deadline, otherwise it will not count. All times are displayed in GMT.',
  },
  {
    question: 'How are points calculated?',
    answer:
      'The closer your prediction is to the real total, the more points you earn. Exact = 10 points, ±1 = 7 points, ±2 = 4 points, ±3 = 2 points, anything beyond that = 0 points.',
  },
  {
    question: 'How does the leaderboard work?',
    answer:
      'Your points build across matchdays, with the highest totals ranking at the top. Free players compete for bragging rights only, while subscribers compete in prize leagues and can win rewards.',
  },
  {
    question: 'What is the difference between free and paid access?',
    answer:
      'Free players play one game — predicting Full-Time (FT) goals. Subscribers unlock the full experience, with four full-time and half-time prediction games: FT goals, HT goals, FT corners, and HT corners.',
  },
  {
    question: 'Is this betting or gambling?',
    answer:
      'No. Goalactico is a skill-based prediction game. You are not placing bets or wagering money on odds based match outcomes.',
  },
];

export default function FAQ() {
  return (
    <Box
      id="faq"
      sx={{
        py: { xs: 6, md: 8 },
        backgroundColor: '#0a0a0a',
      }}
    >
      <Container maxWidth="md">
        <Box sx={{ textAlign: 'center', mb: { xs: 3, md: 4 } }}>
          <Typography
            variant="h3"
            sx={{
              fontWeight: 900,
              color: '#fff',
              mb: 1.5,
              fontSize: { xs: '1.5rem', sm: '2rem', md: '3rem' },
              letterSpacing: 1,
              textTransform: 'uppercase',
            }}
          >
            FAQ
          </Typography>
          <Typography
            sx={{
              color: '#ffffff',
              fontSize: { xs: '0.9rem', md: '1rem' },
              maxWidth: 620,
              mx: 'auto',
              lineHeight: 1.7,
            }}
          >
            Quick answers about predictions, scoring, rankings, and access tiers.
          </Typography>
        </Box>

        <Box sx={{ display: 'grid', gap: 1.2 }}>
          {faqItems.map((item) => (
            <Accordion
              key={item.question}
              disableGutters
              sx={{
                backgroundColor: '#0f0f0f',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                '&:before': { display: 'none' },
                boxShadow: 'none',
                borderRadius: '8px',
                overflow: 'hidden',
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon sx={{ color: '#16a34a' }} />}
                sx={{
                  px: { xs: 2, md: 2.5 },
                  '& .MuiAccordionSummary-content': { my: 1.5 },
                }}
              >
                <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: { xs: '0.92rem', md: '1rem' } }}>
                  {item.question}
                </Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ px: { xs: 2, md: 2.5 }, pb: 2.2, pt: 0 }}>
                <Typography sx={{ color: '#d1d5db', fontSize: { xs: '0.86rem', md: '0.95rem' }, lineHeight: 1.7 }}>
                  {item.answer}
                </Typography>
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      </Container>
    </Box>
  );
}
