import { Skeleton } from '@/components/ui/skeleton';
import { AppHeader } from '@/components/navigation/AppHeader';
import { SellerSidebarNav } from '@/components/dashboard/seller/SellerSidebarNav';

export default function DashboardProductsLoading() {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader contextLabel="Dashboard / Products" browseLabel="Marketplace" browseHref="/" />

      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <SellerSidebarNav />
        </div>

        <div className="mb-6 flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>

        <div className="space-y-3">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      </div>
    </div>
  );
}

