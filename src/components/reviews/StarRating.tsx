'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface StarRatingProps {
  rating: number;
  onChange?: (rating: number) => void;
  size?: 'sm' | 'md' | 'lg';
  readonly?: boolean;
  showCount?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
};

const textSizeClasses = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
};

export function StarRating({
  rating,
  onChange,
  size = 'md',
  readonly = false,
  showCount = false,
  className,
}: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  const isInteractive = !readonly && onChange;
  const displayRating = hoverRating ?? rating;

  const handleClick = (starRating: number) => {
    if (isInteractive && onChange) {
      onChange(starRating);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent, starRating: number) => {
    if (isInteractive && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      onChange?.(starRating);
    }
  };

  const renderStar = (index: number) => {
    const starNumber = index + 1;
    const fillPercentage = Math.min(Math.max(displayRating - index, 0), 1);

    return (
      <div
        key={index}
        className={cn(
          'relative inline-block',
          isInteractive && 'cursor-pointer transition-transform hover:scale-110'
        )}
        onClick={() => handleClick(starNumber)}
        onMouseEnter={() => isInteractive && setHoverRating(starNumber)}
        onMouseLeave={() => isInteractive && setHoverRating(null)}
        onKeyDown={(e) => handleKeyDown(e, starNumber)}
        tabIndex={isInteractive ? 0 : -1}
        role={isInteractive ? 'button' : undefined}
        aria-label={isInteractive ? `Rate ${starNumber} stars` : undefined}
      >
        {/* Background star (empty) */}
        <Star
          className={cn(
            sizeClasses[size],
            'text-muted-foreground/30',
            isInteractive && 'transition-colors'
          )}
        />

        {/* Foreground star (filled) */}
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ width: `${fillPercentage * 100}%` }}
        >
          <Star
            className={cn(
              sizeClasses[size],
              'fill-yellow-500 text-yellow-500',
              isInteractive && 'transition-colors'
            )}
          />
        </div>
      </div>
    );
  };

  return (
    <div className={cn('inline-flex items-center gap-1', className)}>
      <div
        className="inline-flex gap-0.5"
        role={isInteractive ? 'radiogroup' : undefined}
        aria-label={isInteractive ? 'Rating' : undefined}
      >
        {Array.from({ length: 5 }, (_, i) => renderStar(i))}
      </div>

      {showCount && (
        <span className={cn('ml-1 text-muted-foreground font-medium', textSizeClasses[size])}>
          ({rating.toFixed(1)})
        </span>
      )}
    </div>
  );
}
