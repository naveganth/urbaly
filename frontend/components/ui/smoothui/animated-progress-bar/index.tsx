'use client';

interface AnimatedProgressBarProps {
  value: number;
  className?: string;
}

export default function AnimatedProgressBar({
  value,
  className = '',
}: AnimatedProgressBarProps) {
  const safeValue = Math.max(0, Math.min(100, value));

  return (
    <div
      aria-label={`Formulário preenchido em ${safeValue}%`}
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={safeValue}
      className={`h-1 w-full overflow-hidden bg-muted ${className}`}
      role='progressbar'
    >
      <div
        className='h-full origin-left bg-primary transition-transform duration-300 ease-out motion-reduce:transition-none'
        style={{ transform: `scaleX(${safeValue / 100})` }}
      />
    </div>
  );
}
