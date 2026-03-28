'use client';

import { Box } from '@mui/material';
import { useEffect, useRef } from 'react';

type Bubble = {
  x: number;
  y: number;
  radius: number;
  speed: number;
  drift: number;
  alpha: number;
};

export default function AmbientBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let dpr = window.devicePixelRatio || 1;
    let animationFrame = 0;
    let bubbles: Bubble[] = [];

    const createBubble = (): Bubble => ({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: 1.5 + Math.random() * 3.5,
      speed: 0.2 + Math.random() * 0.6,
      drift: (Math.random() - 0.5) * 0.2,
      alpha: 0.08 + Math.random() * 0.2,
    });

    const resize = () => {
      dpr = window.devicePixelRatio || 1;
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(140, Math.max(60, Math.floor((width * height) / 18000)));
      bubbles = Array.from({ length: count }, createBubble);
    };

    const tick = () => {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = 'rgba(22, 163, 74, 0.18)';

      for (const bubble of bubbles) {
        bubble.y -= bubble.speed;
        bubble.x += bubble.drift;

        if (bubble.y + bubble.radius < 0) {
          bubble.y = height + bubble.radius + Math.random() * 40;
          bubble.x = Math.random() * width;
        }

        if (bubble.x < -20) bubble.x = width + 20;
        if (bubble.x > width + 20) bubble.x = -20;

        ctx.beginPath();
        ctx.fillStyle = `rgba(22, 163, 74, ${bubble.alpha})`;
        ctx.arc(bubble.x, bubble.y, bubble.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      animationFrame = window.requestAnimationFrame(tick);
    };

    resize();
    tick();
    window.addEventListener('resize', resize);

    return () => {
      window.removeEventListener('resize', resize);
      window.cancelAnimationFrame(animationFrame);
    };
  }, []);

  return (
    <Box sx={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} aria-hidden />
    </Box>
  );
}
