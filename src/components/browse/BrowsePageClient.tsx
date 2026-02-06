"use client";

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AppHeader } from '@/components/navigation/AppHeader';

interface Product {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  price: number;
  includesFSEQ: boolean;
  includesSource: boolean;
  saleCount: number;
}

interface BrowsePageClientProps {
  initialProducts: Product[];
}

export function BrowsePageClient({ initialProducts }: BrowsePageClientProps) {
  const router = useRouter();
  const [search, setSearch] = useState('');

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return initialProducts;
    return initialProducts.filter((product) =>
      [product.title, product.description, product.category]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(q))
    );
  }, [initialProducts, search]);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader contextLabel="Browse" showBrowse={false} />

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto mb-8">
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search sequences by title, description, or category"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="text-center text-muted-foreground">No products found.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((product) => (
              <Card key={product.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="text-lg">{product.title}</CardTitle>
                  <Badge variant="secondary" className="w-fit">
                    {product.category}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {product.description}
                  </p>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex gap-2">
                      {product.includesFSEQ && <Badge variant="outline">FSEQ</Badge>}
                      {product.includesSource && <Badge variant="outline">Source</Badge>}
                    </div>
                    <span className="font-semibold">
                      {product.price === 0 ? 'Free' : `$${product.price.toFixed(2)}`}
                    </span>
                  </div>
                  <Button className="w-full" onClick={() => router.push(`/p/${product.slug}`)}>
                    View Product
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
