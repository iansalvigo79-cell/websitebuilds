"use client";

import {
  Box, Typography, Card, CardContent, Grid, Stack, Chip,
  ToggleButton, ToggleButtonGroup, Avatar, Dialog, DialogTitle, DialogContent, IconButton, CircularProgress,
} from '@mui/material';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CloseIcon from '@mui/icons-material/Close';
import { useState, useEffect } from 'react';
import { Blog, BlogCategory } from '@/types/database';

type BlogFilter = 'all' | 'strategy' | 'preview' | 'analysis';

const FILTER_TO_CATEGORY: Record<Exclude<BlogFilter, 'all'>, BlogCategory> = {
  strategy: 'Strategy',
  preview: 'Preview',
  analysis: 'Analysis',
};

const getCategoryColor = (category: BlogCategory) => {
  switch (category) {
    case 'Strategy': return '#16a34a';
    case 'Preview': return '#3b82f6';
    case 'Analysis': return '#a855f7';
  }
};

const formatDate = (dateString: string) => {
  const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' };
  return new Date(dateString).toLocaleDateString('en-US', options);
};

export default function BlogsTab() {
  const [filter, setFilter] = useState<BlogFilter>('all');
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBlog, setSelectedBlog] = useState<Blog | null>(null);
  const [blogModalOpen, setBlogModalOpen] = useState(false);
  const [isBlogDetailLoading, setIsBlogDetailLoading] = useState(false);

  useEffect(() => {
    const fetchBlogs = async () => {
      try {
        setIsLoading(true);
        const queryParam = filter === 'all' ? '' : `?category=${FILTER_TO_CATEGORY[filter]}`;
        const res = await fetch(`/api/blogs${queryParam}`);
        
        if (!res.ok) throw new Error('Failed to fetch blogs');
        
        const { blogs: fetchedBlogs } = await res.json();
        setBlogs(fetchedBlogs || []);
      } catch (err) {
        console.error('Error fetching blogs:', err);
        setBlogs([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBlogs();
  }, [filter]);

  const filteredBlogs = filter === 'all'
    ? blogs
    : blogs.filter((b) => b.category === FILTER_TO_CATEGORY[filter]);

  const handleReadClick = async (blog: Blog) => {
    setBlogModalOpen(true);
    setIsBlogDetailLoading(true);

    try {
      const res = await fetch(`/api/blogs/${blog.id}`);
      if (!res.ok) throw new Error('Failed to fetch blog details');

      const { blog: fullBlog } = await res.json();
      setSelectedBlog(fullBlog || blog);
    } catch (err) {
      console.error('Error fetching blog details:', err);
      // Fallback to list item so modal still opens.
      setSelectedBlog(blog);
    } finally {
      setIsBlogDetailLoading(false);
    }
  };

  const handleCloseModal = () => {
    setBlogModalOpen(false);
    setSelectedBlog(null);
    setIsBlogDetailLoading(false);
  };

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
        onChange={(_e, val: BlogFilter | null) => val && setFilter(val)}
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

      {/* Loading State */}
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <CircularProgress sx={{ color: '#3b82f6' }} />
        </Box>
      ) : filteredBlogs.length > 0 ? (
        <>
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
                              {formatDate(blog.created_at)}
                            </Typography>
                          </Stack>
                        </Stack>
                        <Stack 
                          direction="row" 
                          alignItems="center" 
                          spacing={0.3} 
                          onClick={() => handleReadClick(blog)}
                          sx={{ cursor: 'pointer', '&:hover .read-text': { color: '#16a34a' } }}
                        >
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
        </>
      ) : (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <Typography sx={{ color: '#999', fontSize: '1.1rem' }}>
            No blogs available
          </Typography>
        </Box>
      )}

      {/* Blog Detail Modal */}
      <Dialog
        open={blogModalOpen}
        onClose={handleCloseModal}
        maxWidth="md"
        fullWidth
        sx={{
          '& .MuiDialog-paper': {
            backgroundColor: '#0a0a0a',
            color: '#fff',
          }
        }}
      >
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {selectedBlog?.title}
              </Typography>
              <IconButton onClick={handleCloseModal} sx={{ color: '#999' }}>
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent dividers sx={{ maxHeight: '70vh', overflow: 'auto' }}>
              {isBlogDetailLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                  <CircularProgress sx={{ color: '#3b82f6' }} />
                </Box>
              ) : selectedBlog && (
                <Stack spacing={2}>
                  {/* Blog Header Info */}
                  <Stack direction="row" alignItems="center" spacing={2}>
                    <Chip 
                      label={selectedBlog.category}
                      sx={{
                        backgroundColor: getCategoryColor(selectedBlog.category),
                        color: '#fff',
                        fontWeight: 700,
                      }}
                    />
                    <Typography sx={{ color: '#999', fontSize: '0.9rem' }}>
                      By {selectedBlog.author}
                    </Typography>
                    <Typography sx={{ color: '#999', fontSize: '0.9rem' }}>
                      {formatDate(selectedBlog.created_at)}
                    </Typography>
                  </Stack>

                  {/* Blog Content */}
                  <Box sx={{
                    '& h1, & h2, & h3': { color: '#fff', fontWeight: 700, mt: 2, mb: 1 },
                    '& h1': { fontSize: '1.8rem' },
                    '& h2': { fontSize: '1.4rem' },
                    '& h3': { fontSize: '1.1rem' },
                    '& p': { color: '#ddd', lineHeight: 1.7, mb: 1 },
                    '& ul, & ol': { color: '#ddd', mb: 1 },
                    '& li': { mb: 0.5, lineHeight: 1.6 },
                    '& strong': { color: '#fff', fontWeight: 700 },
                    '& em': { color: '#bbb' },
                    '& code': { backgroundColor: '#1a1a1a', color: '#16a34a', p: '2px 6px', borderRadius: '4px' },
                  }}>
                    {String(selectedBlog.content || '').split('\n').map((line, idx) => {
                      // Parse markdown headings
                      if (line.startsWith('# ')) {
                        return <Typography key={idx} component="h1" sx={{ fontSize: '1.8rem', fontWeight: 700, color: '#fff', mt: 2, mb: 1 }}>{line.substring(2)}</Typography>;
                      }
                      if (line.startsWith('## ')) {
                        return <Typography key={idx} component="h2" sx={{ fontSize: '1.4rem', fontWeight: 700, color: '#fff', mt: 2, mb: 1 }}>{line.substring(3)}</Typography>;
                      }
                      if (line.startsWith('### ')) {
                        return <Typography key={idx} component="h3" sx={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', mt: 1, mb: 0.5 }}>{line.substring(4)}</Typography>;
                      }
                      if (line.startsWith('- ')) {
                        return <Typography key={idx} component="li" sx={{ color: '#ddd', ml: 2 }}>{line.substring(2)}</Typography>;
                      }
                      if (line.trim().length === 0) {
                        return <Box key={idx} sx={{ height: '0.5rem' }} />;
                      }
                      return <Typography key={idx} sx={{ color: '#ddd', lineHeight: 1.7, mb: 1 }}>{line}</Typography>;
                    })}
                  </Box>

                  {/* Footer Stats */}
                  <Stack direction="row" spacing={3} sx={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)', pt: 2 }}>
                    <Typography sx={{ color: '#999', fontSize: '0.85rem' }}>
                      👁️ {selectedBlog.views} views
                    </Typography>
                  </Stack>
                </Stack>
              )}
            </DialogContent>
          </Dialog>
    </Box>
  );
}
