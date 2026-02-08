'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const SELLER_NAV_ITEMS = [
  { href: '/dashboard', label: 'Overview' },
  { href: '/dashboard/products', label: 'Listings' },
  { href: '/dashboard/orders', label: 'Orders' },
  { href: '/dashboard/payouts', label: 'Payouts' },
  { href: '/dashboard/support', label: 'Support' },
  { href: '/dashboard/settings', label: 'Settings' },
];

export function SellerSidebarNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Seller dashboard sections" className="overflow-x-auto pb-1">
      <ul className="flex min-w-max items-center gap-2">
        {SELLER_NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  'inline-flex items-center rounded-md border px-3 py-1.5 text-sm transition-colors',
                  isActive
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
