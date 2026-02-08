// src/app/browse/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { AppHeader } from '@/components/navigation/AppHeader';

interface Product {
  id: string;
  slug: string;
  title: string;
  description: string;
  price: number;
  category: string;
  creator: {
    name: string;
  };
}

export default function BrowsePage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/products?q=${searchTerm}`);
      if (response.ok) {
        const data = await response.json();
        setProducts(data.products);
      }
    } catch (error) {
      console.error('Failed to fetch products', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchProducts();
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader contextLabel="Browse" showBrowse={false} />

      {/* Browse Section */}
      <section className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Browse Sequences</h1>
          <p className="text-muted-foreground">
            Find the perfect sequence for your next display.
          </p>
        </div>

        <form onSubmit={handleSearch} className="mb-8 flex gap-2">
          <Input
            placeholder="Search for sequences..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Button type="submit">
            <Search className="h-4 w-4 mr-2" />
            Search
          </Button>
        </form>

        {isLoading ? (
          <div className="text-center">
            <p>Loading...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <Card
                key={product.id}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => router.push(`/p/${product.slug}`)}
              >
                <CardContent className="p-6">
                  <div className="aspect-video bg-muted rounded-lg mb-4"></div>
                  <Badge variant="secondary" className="mb-2">
                    {product.category}
                  </Badge>
                  <h3 className="text-xl font-semibold mb-2">{product.title}</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    by {product.creator.name}
                  </p>
                  <div className="flex justify-between items-center">
                    <p className="text-lg font-bold">
                      ${product.price.toFixed(2)}
                    </p>
                    <Button variant="ghost" size="sm">
                      View
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {products.length === 0 && !isLoading && (
          <div className="text-center py-16">
            <p className="text-muted-foreground">No sequences found.</p>
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="container mx-auto px-4 py-8 text-center text-sm text-muted-foreground">
          <p>© 2026 SequenceHUB. All Rights Reserved.</p>
        </div>
      </footer>
    </div>
  );
}
