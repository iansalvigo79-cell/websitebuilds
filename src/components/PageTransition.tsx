'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface PageTransitionProps {
  children: ReactNode;
  delay?: number;
}

export default function PageTransition({ children, delay = 0 }: PageTransitionProps) {
  const variants = {
    hidden: { opacity: 0, y: 12, scale: 0.98 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.6,
        ease: [0.22, 1, 0.36, 1], // cubic-bezier(0.22, 1, 0.36, 1)
        delay,
      },
    },
    exit: {
      opacity: 0,
      y: -12,
      scale: 0.98,
      transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] },
    },
  };

  return (
    <motion.div initial="hidden" animate="visible" exit="exit" variants={variants}>
      {children}
    </motion.div>
  );
}
