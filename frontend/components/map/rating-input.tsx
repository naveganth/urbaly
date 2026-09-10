'use client';

import * as React from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RatingInputProps {
  value: number;
  onChange: (value: number) => void;
  max?: number;
  disabled?: boolean;
  className?: string;
}

const RATING_LABELS: Record<number, { text: string; color: string }> = {
  1: { text: 'Leve / Desconforto menor', color: 'text-emerald-500' },
  2: { text: 'Moderado / Requer atenção', color: 'text-amber-500' },
  3: { text: 'Preocupante / Dificulta passagem', color: 'text-orange-500' },
  4: { text: 'Grave / Risco de danos materiais', color: 'text-rose-500' },
  5: { text: 'Crítico / Risco iminente de acidente', color: 'text-red-600' },
};

export function RatingInput({
  value,
  onChange,
  max = 5,
  disabled = false,
  className,
}: RatingInputProps) {
  const [hoverValue, setHoverValue] = React.useState<number | null>(null);

  const activeValue = hoverValue ?? value;
  const currentLabel = RATING_LABELS[activeValue] || RATING_LABELS[1];

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <div className="flex items-center gap-1.5">
        {Array.from({ length: max }, (_, index) => {
          const starNumber = index + 1;
          const isFilled = starNumber <= activeValue;

          return (
            <button
              key={starNumber}
              type="button"
              disabled={disabled}
              onClick={() => onChange(starNumber)}
              onMouseEnter={() => setHoverValue(starNumber)}
              onMouseLeave={() => setHoverValue(null)}
              className={cn(
                'group relative p-1 rounded-md transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:scale-115 active:scale-95'
              )}
              aria-label={`Avaliar gravidade como nível ${starNumber} de ${max}`}
            >
              <Star
                className={cn(
                  'size-6 transition-colors duration-150',
                  isFilled
                    ? 'fill-amber-400 text-amber-400 drop-shadow-[0_2px_8px_rgba(251,191,36,0.4)]'
                    : 'text-muted-foreground/40 hover:text-muted-foreground/70'
                )}
              />
            </button>
          );
        })}

        <span className="ml-2 font-mono text-xs font-semibold px-2 py-0.5 rounded-full bg-muted text-foreground border border-border">
          {activeValue} / {max}
        </span>
      </div>

      <p className={cn('text-xs font-medium transition-colors duration-200', currentLabel.color)}>
        Nível {activeValue}: {currentLabel.text}
      </p>
    </div>
  );
}
