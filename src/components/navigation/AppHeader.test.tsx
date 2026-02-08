import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  logout: vi.fn(),
  useAuth: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mocks.push,
  }),
}));

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => mocks.useAuth(),
}));

vi.mock('@/components/navigation/DashboardMenu', () => ({
  DashboardMenu: () => <div data-testid="dashboard-menu">Dashboard Menu</div>,
}));

import { AppHeader } from './AppHeader';

describe('AppHeader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      isCreatorOrAdmin: false,
      isAdmin: false,
      logout: mocks.logout,
    });
  });

  it('renders the animated SequenceHUB logo in header variant', () => {
    render(<AppHeader />);

    const logo = screen.getByRole('img', {
      name: 'SequenceHUB logo with animated light dots',
    });

    expect(logo).toHaveClass('sh-logo--header');
  });

  it('navigates home when logo button is clicked', () => {
    render(<AppHeader />);

    fireEvent.click(screen.getByRole('button', { name: 'Go to homepage' }));

    expect(mocks.push).toHaveBeenCalledWith('/');
  });
});

