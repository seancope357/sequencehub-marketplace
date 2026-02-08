import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import DashboardProducts from './page';

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  push: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: mocks.replace,
    push: mocks.push,
  }),
}));

vi.mock('@/components/navigation/AppHeader', () => ({
  AppHeader: () => <div data-testid="app-header" />,
}));

vi.mock('@/components/dashboard/seller/SellerSidebarNav', () => ({
  SellerSidebarNav: () => <div data-testid="seller-nav" />,
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('DashboardProducts page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders empty state when products list is empty', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ products: [] }), { status: 200 })
      )
    );

    render(<DashboardProducts />);

    await screen.findByText('No products yet');
    expect(screen.getByText('Create your first listing to start selling.')).toBeInTheDocument();
  });

  it('redirects to login when API returns unauthorized', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 401 })));

    render(<DashboardProducts />);

    await waitFor(() => {
      expect(mocks.replace).toHaveBeenCalledWith('/auth/login?next=%2Fdashboard%2Fproducts');
    });
  });

  it('shows retry error state when products request fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    render(<DashboardProducts />);

    await screen.findByText('Unable to load products');
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});

