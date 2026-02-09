"use client";

import {
  Box, Typography, Card, CardContent, Grid, Stack, Chip,
  ToggleButton, ToggleButtonGroup, Avatar,
} from '@mui/material';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useState } from 'react';

type BlogCategory = 'Strategy' | 'Preview' | 'Analysis';

interface BlogPost {
  id: string;
  title: string;
  description: string;
  author: string;
  date: string;
  category: BlogCategory;
}

const testBlogs: BlogPost[] = [
  {
    id: '1',
    title: 'Top 10 Prediction Strategies for the Premier League',
    description: 'Learn the best strategies to improve your prediction accuracy and climb the leaderboard this season.',
    author: 'Alex Champion',
    date: 'Feb 5, 2025',
    category: 'Strategy',
  },
  {
    id: '2',
    title: 'Match Day 25 Preview: Key Fixtures to Watch',
    description: 'Breaking down the most important matches this weekend and what to expect from each team.',
    author: 'Sarah Writer',
    date: 'Feb 4, 2025',
    category: 'Preview',
  },
  {
    id: '3',
    title: 'How Weather Affects Football Match Outcomes',
    description: 'An in-depth analysis of how rain, wind, and temperature impact game results and scoring.',
    author: 'Mike Analyst',
    date: 'Feb 3, 2025',
    category: 'Analysis',
  },
  {
    id: '4',
    title: 'Understanding Expected Goals (xG) for Predictions',
    description: 'How to use xG data to make smarter predictions and find value in your picks.',
    author: 'Emma Stats',
    date: 'Feb 2, 2025',
    category: 'Analysis',
  },
  {
    id: '5',
    title: 'Winning Streak: How to Build Momentum',
    description: 'Tips and tricks for maintaining a winning prediction streak throughout the season.',
    author: 'James Keeper',
    date: 'Feb 1, 2025',
    category: 'Strategy',
  },
  {
    id: '6',
    title: 'Champions League Round of 16 Preview',
    description: 'Everything you need to know about the upcoming Champions League knockout stage fixtures.',
    author: 'David Pro',
    date: 'Jan 30, 2025',
    category: 'Analysis',
  },
];

const getCategoryColor = (category: BlogCategory) => {
  switch (category) {
    case 'Strategy': return '#16a34a';
    case 'Preview': return '#3b82f6';
    case 'Analysis': return '#a855f7';
  }
};

export default function BlogsTab() {
  const [filter, setFilter] = useState('all');

  const filteredBlogs = filter === 'all'
    ? testBlogs
    : testBlogs.filter((b) => b.category.toLowerCase() === filter);

  return (
    <Box>
      {/* Header */}
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 0.5 }}>
        <Avatar sx={{ width: 48, height: 48, backgroundColor: 'rgba(59, 130, 246, 0.15)' }}>
          <MenuBookIcon sx={{ color: '#3b82f6', fontSize: '1.5rem' }} />
        </Avatar>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: '#fff' }}>
        Blogs
      </Typography>
          <Typography sx={{ color: '#999', fontSize: '0.85rem' }}>
            Read the latest sports insights and analysis
          </Typography>
        </Box>
      </Stack>

      {/* Filter Toggle */}
      <ToggleButtonGroup
        value={filter}
        exclusive
        onChange={(_e, val) => val && setFilter(val)}
        sx={{ mb: 3, mt: 2 }}
      >
        {['all', 'strategy', 'preview', 'analysis'].map((val) => (
          <ToggleButton
            key={val}
            value={val}
            sx={{
              color: filter === val ? '#fff' : '#999',
              backgroundColor: filter === val ? '#1a1a1a' : 'transparent',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.85rem',
              px: 2.5,
              py: 0.8,
              '&.Mui-selected': { backgroundColor: '#1a1a1a', color: '#fff' },
              '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.05)' },
            }}
          >
            {val.charAt(0).toUpperCase() + val.slice(1)}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>

      {/* Blog Cards Grid */}
      <Grid container spacing={2.5}>
        {filteredBlogs.map((blog) => {
          const catColor = getCategoryColor(blog.category);

          return (
            <Grid item xs={12} sm={6} md={4} key={blog.id}>
              <Card sx={{
                backgroundColor: '#1a1a1a',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                overflow: 'hidden',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
              }}>
                {/* Image Placeholder */}
                <Box sx={{
                  height: 180,
                  background: `linear-gradient(135deg, rgba(22, 163, 74, 0.2) 0%, rgba(22, 163, 74, 0.05) 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                }}>
                  {/* Category Tag */}
                  <Chip
                    label={blog.category}
                    size="small"
                    sx={{
                      position: 'absolute',
                      top: 12,
                      left: 12,
                      backgroundColor: catColor,
                      color: '#fff',
                      fontWeight: 700,
                      fontSize: '0.7rem',
                      height: 24,
                    }}
                  />
                  <Typography sx={{ color: 'rgba(22, 163, 74, 0.3)', fontSize: '3rem', fontWeight: 900 }}>
                    G
                  </Typography>
                </Box>

                {/* Content */}
                <CardContent sx={{ p: 2, flex: 1, display: 'flex', flexDirection: 'column', '&:last-child': { pb: 2 } }}>
                  <Typography sx={{
                    color: '#fff',
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    mb: 1,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}>
                    {blog.title}
                  </Typography>

                  <Typography sx={{
                    color: '#999',
                    fontSize: '0.8rem',
                    lineHeight: 1.5,
                    mb: 2,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    flex: 1,
                  }}>
                    {blog.description}
                  </Typography>

                  {/* Footer */}
                  <Stack direction="row" alignItems="center" justifyContent="space-between"
                    sx={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)', pt: 1.5 }}
                  >
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Typography sx={{ color: '#fff', fontSize: '0.75rem', fontWeight: 600 }}>
                        {blog.author}
                      </Typography>
                      <Typography sx={{ color: '#666', fontSize: '0.75rem' }}>•</Typography>
                      <Stack direction="row" alignItems="center" spacing={0.3}>
                        <CalendarTodayIcon sx={{ color: '#999', fontSize: '0.7rem' }} />
                        <Typography sx={{ color: '#999', fontSize: '0.75rem' }}>
                          {blog.date}
                        </Typography>
                      </Stack>
                    </Stack>
                    <Stack direction="row" alignItems="center" spacing={0.3} sx={{ cursor: 'pointer', '&:hover .read-text': { color: '#16a34a' } }}>
                      <Typography className="read-text" sx={{ color: '#16a34a', fontSize: '0.8rem', fontWeight: 700 }}>
                        Read
                      </Typography>
                      <ArrowForwardIcon sx={{ color: '#16a34a', fontSize: '0.9rem' }} />
                    </Stack>
                  </Stack>
        </CardContent>
      </Card>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
}
