import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface ScrollReveal3DProps {
  children: ReactNode;
  delay?: number;
  duration?: number;
  direction?: 'up' | 'down' | 'left' | 'right';
  className?: string;
}

export function ScrollReveal3D({
  children,
  delay = 0,
  duration = 0.65,
  direction = 'up',
  className = '',
}: ScrollReveal3DProps) {
  let initialX = 0;
  let initialY = 0;
  let initialRotateX = 0;
  let initialRotateY = 0;

  if (direction === 'up') {
    initialY = 36;
    initialRotateX = 8;
  } else if (direction === 'down') {
    initialY = -36;
    initialRotateX = -8;
  } else if (direction === 'left') {
    initialX = 36;
    initialRotateY = -8;
  } else if (direction === 'right') {
    initialX = -36;
    initialRotateY = 8;
  }

  return (
    <motion.div
      initial={{
        opacity: 0,
        x: initialX,
        y: initialY,
        rotateX: initialRotateX,
        rotateY: initialRotateY,
        scale: 0.98,
      }}
      whileInView={{
        opacity: 1,
        x: 0,
        y: 0,
        rotateX: 0,
        rotateY: 0,
        scale: 1,
      }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{
        duration,
        delay,
        ease: [0.23, 1, 0.32, 1],
      }}
      className={`preserve-3d ${className}`}
      style={{ perspective: 1200 }}
    >
      {children}
    </motion.div>
  );
}
