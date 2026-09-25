import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  gradient?: boolean;
  onClick?: () => void;
}

export function GlassCard({
  children,
  className = '',
  hover = false,
  gradient = false,
  onClick,
}: GlassCardProps) {
  return (
    <motion.div
      whileHover={hover ? { y: -4, scale: 1.008 } : undefined}
      transition={{ type: 'spring', stiffness: 350, damping: 25 }}
      onClick={onClick}
      className={`glass-3d rounded-2xl p-6 ${hover ? 'cursor-pointer transition-all duration-300' : ''} ${
        gradient ? 'glass-gradient-bg' : ''
      } ${className}`}
    >
      {children}
    </motion.div>
  );
}
