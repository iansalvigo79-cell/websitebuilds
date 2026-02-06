'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface AnimatedCardProps {
  children: ReactNode;
  index?: number;
  delay?: number;
}

export default function AnimatedCard({ children, index = 0, delay }: AnimatedCardProps) {
  const finalDelay = delay ?? (index * 0.08);

  const variants = {
    hidden: { opacity: 0, y: 16, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.55,
        ease: [0.22, 1, 0.36, 1],
        delay: finalDelay,
      },
    },
  };

  return (
    <motion.div initial="hidden" whileInView="visible" variants={variants} viewport={{ once: true }}>
      {children}
    </motion.div>
  );
}
