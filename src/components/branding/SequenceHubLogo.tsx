import { cn } from '@/lib/utils';

type SequenceHubLogoVariant = 'header' | 'auth';

interface SequenceHubLogoProps {
  variant?: SequenceHubLogoVariant;
  animated?: boolean;
  className?: string;
  onClick?: () => void;
  ariaLabel?: string;
}

const DOT_COUNT = 12;
const DOT_INDEXES = Array.from({ length: DOT_COUNT }, (_, index) => index + 1);

export function SequenceHubLogo({
  variant = 'header',
  animated = true,
  className,
  onClick,
  ariaLabel = 'SequenceHUB logo with animated light dots',
}: SequenceHubLogoProps) {
  return (
    <div
      role="img"
      aria-label={ariaLabel}
      className={cn(
        'sh-logo',
        variant === 'header' ? 'sh-logo--header' : 'sh-logo--auth',
        animated ? 'sh-logo--animated' : 'sh-logo--static',
        className
      )}
      onClick={onClick}
    >
      <div className="sh-wordmark">
        <span className="sh-seq">Sequence</span>
        <span className="sh-hub">HUB</span>
      </div>

      <div className="sh-lights" aria-hidden="true">
        {DOT_INDEXES.map((index) => (
          <span key={index} className={cn('sh-dot', `sh-dot-${index}`)} />
        ))}
      </div>
    </div>
  );
}

