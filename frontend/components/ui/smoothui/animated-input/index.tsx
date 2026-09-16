'use client';

import { motion, useReducedMotion } from 'motion/react';
import { useId, useState } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';

export interface AnimatedInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label: string;
  icon?: ReactNode;
  onChange?: (value: string) => void;
  inputClassName?: string;
}

export default function AnimatedInput({
  label,
  icon,
  value,
  defaultValue = '',
  onChange,
  inputClassName = '',
  className = '',
  ...props
}: AnimatedInputProps) {
  const [internalValue, setInternalValue] = useState(String(defaultValue));
  const [focused, setFocused] = useState(false);
  const reducedMotion = useReducedMotion();
  const id = `animated-input-${useId().replace(/:/g, '')}`;
  const currentValue = value === undefined ? internalValue : String(value);
  const floating = focused || currentValue.length > 0;

  return (
    <div className={`relative flex items-center ${className}`}>
      {icon && (
        <span aria-hidden='true' className='absolute left-3 z-1 text-muted-foreground'>
          {icon}
        </span>
      )}
      <input
        {...props}
        aria-label={label}
        className={`peer w-full rounded-sm border border-border bg-background px-3 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${icon ? 'pl-10' : ''} ${inputClassName}`}
        id={id}
        onBlur={() => setFocused(false)}
        onChange={(event) => {
          if (value === undefined) setInternalValue(event.target.value);
          onChange?.(event.target.value);
        }}
        onFocus={() => setFocused(true)}
        placeholder={floating ? props.placeholder : ''}
        value={currentValue}
      />
      <motion.label
        animate={
          reducedMotion
            ? undefined
            : { color: floating ? 'var(--primary)' : 'var(--muted-foreground)', scale: floating ? 0.82 : 1, y: floating ? -23 : 0 }
        }
        className={`pointer-events-none absolute left-3 origin-left bg-background px-1 text-sm text-muted-foreground ${icon ? 'left-10' : ''}`}
        htmlFor={id}
        style={
          reducedMotion
            ? { transform: floating ? 'translateY(-23px) scale(.82)' : 'translateY(0) scale(1)' }
            : undefined
        }
        transition={{ duration: reducedMotion ? 0 : 0.2 }}
      >
        {label}
      </motion.label>
    </div>
  );
}
