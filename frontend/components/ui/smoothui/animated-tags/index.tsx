'use client';

import { motion, useReducedMotion } from 'motion/react';

interface AnimatedTagsProps {
  items: string[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export default function AnimatedTags({
  items,
  value,
  onChange,
  className = '',
}: AnimatedTagsProps) {
  const reducedMotion = useReducedMotion();

  return (
    <div className={`flex flex-wrap gap-2 ${className}`} role='listbox'>
      {items.map((item) => {
        const selected = item === value;
        return (
          <motion.button
            key={item}
            type='button'
            role='option'
            aria-selected={selected}
            onClick={() => onChange(item)}
            whileHover={reducedMotion ? undefined : { y: -1 }}
            whileTap={reducedMotion ? undefined : { scale: 0.98 }}
            className={`rounded-md border px-3 py-1.5 text-xs transition-colors ${
              selected
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-background text-muted-foreground hover:border-foreground/40 hover:text-foreground'
            }`}
          >
            {item}
          </motion.button>
        );
      })}
    </div>
  );
}
