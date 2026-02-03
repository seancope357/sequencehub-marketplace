'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Package } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

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

export default function BrowsePage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const loadProducts = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/products');
        if (!response.ok) {
          throw new Error('Failed to load products');
        }
        const data = await response.json();
        setProducts(data.products || []);
      } catch (error) {
        console.error('Error loading products:', error);
        setProducts([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadProducts();
  }, []);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter((product) =>
      [product.title, product.description, product.category]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(q))
    );
  }, [products, search]);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="h-6 w-6 text-primary" />
              <span className="font-semibold cursor-pointer" onClick={() => router.push('/')}
              >
                SequenceHUB
              </span>
              <span className="text-muted-foreground">/</span>
              <span>Browse</span>
            </div>
            <Button variant="outline" onClick={() => router.push('/auth/register')}>
              Start Selling
            </Button>
          </div>
        </div>
      </header>

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

        {isLoading ? (
          <div className="text-center text-muted-foreground">Loading products…</div>
        ) : filteredProducts.length === 0 ? (
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
