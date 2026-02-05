import type { ReactNode } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AppHeader } from '@/components/navigation/AppHeader';
import { getCurrentUser } from '@/lib/supabase/auth';
import { isAdmin } from '@/lib/auth-utils';

const adminNav = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/products', label: 'Products' },
  { href: '/admin/orders', label: 'Orders' },
  { href: '/admin/media', label: 'Media' },
  { href: '/admin/audit', label: 'Audit Logs' },
  { href: '/admin/settings', label: 'Settings' },
];

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/auth/login');
  }

  if (!isAdmin(user)) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader contextLabel="Admin" browseLabel="Marketplace" browseHref="/" />
      <div className="container mx-auto px-4 py-8">
        <div className="grid gap-6 md:grid-cols-[220px_1fr]">
          <aside className="space-y-2">
            <div className="text-sm font-semibold text-muted-foreground">Admin Panel</div>
            <nav className="flex flex-col gap-2">
              {adminNav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-md border px-3 py-2 text-sm text-foreground hover:bg-muted"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </aside>
          <main className="space-y-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
