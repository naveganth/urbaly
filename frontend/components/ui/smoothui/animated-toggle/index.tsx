'use client';

import { motion, useReducedMotion } from 'motion/react';

interface AnimatedToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}

export default function AnimatedToggle({
  checked,
  onChange,
  label,
  disabled = false,
}: AnimatedToggleProps) {
  const reducedMotion = useReducedMotion();

  return (
    <button
      type='button'
      role='switch'
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className='relative inline-flex h-6 w-11 shrink-0 items-center rounded-full bg-muted-foreground/30 p-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 data-[checked=true]:bg-primary disabled:cursor-not-allowed disabled:opacity-50'
      data-checked={checked}
    >
      <motion.span
        className='pointer-events-none size-5 rounded-full border border-border bg-background shadow-sm'
        animate={{ x: checked ? 20 : 0 }}
        transition={reducedMotion ? { duration: 0 } : { type: 'spring', bounce: 0.1, duration: 0.25 }}
      />
    </button>
  );
}
