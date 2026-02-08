import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SequenceHubLogo } from './SequenceHubLogo';

describe('SequenceHubLogo', () => {
  it('renders with default aria label and header variant', () => {
    render(<SequenceHubLogo />);

    const logo = screen.getByRole('img', {
      name: 'SequenceHUB logo with animated light dots',
    });

    expect(logo).toHaveClass('sh-logo');
    expect(logo).toHaveClass('sh-logo--header');
    expect(logo).toHaveClass('sh-logo--animated');
  });

  it('renders exactly 12 dots', () => {
    const { container } = render(<SequenceHubLogo />);
    const dots = container.querySelectorAll('.sh-dot');

    expect(dots).toHaveLength(12);
  });

  it('uses auth variant when requested', () => {
    render(<SequenceHubLogo variant="auth" />);

    const logo = screen.getByRole('img', {
      name: 'SequenceHUB logo with animated light dots',
    });

    expect(logo).toHaveClass('sh-logo--auth');
    expect(logo).not.toHaveClass('sh-logo--header');
  });

  it('supports disabling animation', () => {
    render(<SequenceHubLogo animated={false} />);

    const logo = screen.getByRole('img', {
      name: 'SequenceHUB logo with animated light dots',
    });

    expect(logo).toHaveClass('sh-logo--static');
    expect(logo).not.toHaveClass('sh-logo--animated');
  });

  it('marks lights rail as aria-hidden', () => {
    const { container } = render(<SequenceHubLogo />);
    const lights = container.querySelector('.sh-lights');

    expect(lights).toHaveAttribute('aria-hidden', 'true');
  });
});

