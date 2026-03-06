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
      'For each matchday, you predict the total goals scored across all listed fixtures. Your prediction is compared with the real total once matches are completed.',
  },
  {
    question: 'When does prediction entry close?',
    answer:
      'Predictions lock when the first game of that matchday kicks off. You can edit your entry any time before kickoff.',
  },
  {
    question: 'How are points calculated?',
    answer:
      'Points are awarded by accuracy: exact total = 10 points, off by 1 = 7 points, off by 2 = 4 points, off by 3 = 2 points, and more than 3 away = 0 points.',
  },
  {
    question: 'How does the leaderboard work?',
    answer:
      'Your points are added across matchdays. Players with the highest cumulative score rank at the top and compete for period-based prizes.',
  },
  {
    question: 'What is the difference between free and paid access?',
    answer:
      'Free users can play the core prediction mode. Paid access unlocks all four prediction games: FT Goals, HT Goals, FT Corners, and HT Corners.',
  },
  {
    question: 'Is this betting or gambling?',
    answer:
      'No. Goalactico is a skill-based prediction competition. You are not placing wagers on match outcomes.',
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
