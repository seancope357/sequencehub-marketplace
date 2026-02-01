// SequenceHUB.com - Marketplace for xLights Sequences
'use client';

import { useState, useEffect } from 'react';
import { Search, Filter, Download, Clock, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

interface Product {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  price: number;
  includesFSEQ: boolean;
  includesSource: boolean;
  xLightsVersionMin?: string;
  xLightsVersionMax?: string;
  creator: {
    name: string;
    avatar?: string;
  };
  media?: {
    storageKey: string;
  };
  saleCount: number;
}

const CATEGORIES = [
  { value: 'all', label: 'All Categories' },
  { value: 'CHRISTMAS', label: 'Christmas' },
  { value: 'HALLOWEEN', label: 'Halloween' },
  { value: 'PIXEL_TREE', label: 'Pixel Tree' },
  { value: 'MELODY', label: 'Melody' },
  { value: 'MATRIX', label: 'Matrix' },
  { value: 'ARCH', label: 'Arch' },
  { value: 'PROP', label: 'Prop' },
  { value: 'FACEBOOK', label: 'Facebook' },
  { value: 'OTHER', label: 'Other' },
];

const PRICE_RANGES = [
  { value: 'all', label: 'All Prices' },
  { value: 'free', label: 'Free' },
  { value: 'paid', label: 'Paid' },
  { value: '0-10', label: '$0 - $10' },
  { value: '10-25', label: '$10 - $25' },
  { value: '25-50', label: '$25 - $50' },
  { value: '50+', label: '$50+' },
];

const SORT_OPTIONS = [
  { value: 'popular', label: 'Most Popular' },
  { value: 'recent', label: 'Recently Added' },
  { value: 'price-low', label: 'Price: Low to High' },
  { value: 'price-high', label: 'Price: High to Low' },
];

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [priceRange, setPriceRange] = useState('all');
  const [sortBy, setSortBy] = useState('popular');
  const [showFilters, setShowFilters] = useState(false);

  // Load products
  useEffect(() => {
    loadProducts();
  }, []);

  // Filter and sort products
  useEffect(() => {
    let result = [...products];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(query) ||
          p.description.toLowerCase().includes(query) ||
          p.category.toLowerCase().includes(query)
      );
    }

    // Apply category filter
    if (category !== 'all') {
      result = result.filter((p) => p.category === category);
    }

    // Apply price filter
    if (priceRange === 'free') {
      result = result.filter((p) => p.price === 0);
    } else if (priceRange === 'paid') {
      result = result.filter((p) => p.price > 0);
    } else if (priceRange === '0-10') {
      result = result.filter((p) => p.price > 0 && p.price <= 10);
    } else if (priceRange === '10-25') {
      result = result.filter((p) => p.price > 10 && p.price <= 25);
    } else if (priceRange === '25-50') {
      result = result.filter((p) => p.price > 25 && p.price <= 50);
    } else if (priceRange === '50+') {
      result = result.filter((p) => p.price > 50);
    }

    // Apply sorting
    switch (sortBy) {
      case 'popular':
        result.sort((a, b) => b.saleCount - a.saleCount);
        break;
      case 'price-low':
        result.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        result.sort((a, b) => b.price - a.price);
        break;
      case 'recent':
        // Assuming products are already sorted by date
        break;
    }

    setFilteredProducts(result);
  }, [products, searchQuery, category, priceRange, sortBy]);

  const loadProducts = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/products');
      if (response.ok) {
        const data = await response.json();
        setProducts(data.products || []);
      }
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (value: string) => {
    setSearchQuery(value);
  };

  const handleProductClick = (slug: string) => {
    window.location.href = `/p/${slug}`;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold">SequenceHUB</h1>
                <p className="text-xs text-muted-foreground">Marketplace for xLights Sequences</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={() => (window.location.href = '/auth/login')}>
                Login
              </Button>
              <Button onClick={() => (window.location.href = '/auth/register')}>
                Sign Up
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="border-b bg-gradient-to-b from-secondary/50 to-background">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Discover Amazing xLights Sequences
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Buy and sell professional light show sequences. From Christmas to Halloween,
              find the perfect sequences for your display.
            </p>

            {/* Search Bar */}
            <div className="max-w-2xl mx-auto">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
                <Input
                  type="text"
                  placeholder="Search sequences by title, category, or keywords..."
                  className="pl-12 pr-4 py-6 text-lg"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="border-b bg-background">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="gap-2"
            >
              <Filter className="h-4 w-4" />
              Filters
            </Button>

            {showFilters && (
              <>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={priceRange} onValueChange={setPriceRange}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Price" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRICE_RANGES.map((range) => (
                      <SelectItem key={range.value} value={range.value}>
                        {range.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    {SORT_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            )}

            <div className="ml-auto text-sm text-muted-foreground">
              {filteredProducts.length} sequences found
            </div>
          </div>
        </div>
      </section>

      {/* Products Grid */}
      <section className="container mx-auto px-4 py-8">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-48 w-full rounded" />
                  <Skeleton className="h-6 w-3/4 mt-4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No sequences found</h3>
            <p className="text-muted-foreground">
              Try adjusting your search or filters to find what you're looking for.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <Card
                key={product.id}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => handleProductClick(product.slug)}
              >
                <CardHeader className="p-0">
                  <div className="aspect-video bg-muted relative overflow-hidden rounded-t-lg">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Package className="h-12 w-12 text-muted-foreground" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <Badge variant="secondary" className="text-xs">
                      {product.category}
                    </Badge>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Download className="h-3 w-3" />
                      {product.saleCount}
                    </div>
                  </div>
                  <h3 className="font-semibold text-lg mb-1 line-clamp-2">{product.title}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                    {product.description}
                  </p>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {product.includesFSEQ && (
                      <Badge variant="outline" className="text-xs">
                        FSEQ
                      </Badge>
                    )}
                    {product.includesSource && (
                      <Badge variant="outline" className="text-xs">
                        Source
                      </Badge>
                    )}
                  </div>
                  {product.xLightsVersionMin && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      xLights {product.xLightsVersionMin}
                      {product.xLightsVersionMax && ` - ${product.xLightsVersionMax}`}
                    </div>
                  )}
                </CardContent>
                <CardFooter className="p-4 pt-0 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center text-xs font-semibold">
                      {product.creator.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {product.creator.name}
                    </span>
                  </div>
                  <div className="text-lg font-bold">
                    {product.price === 0 ? 'Free' : `$${product.price.toFixed(2)}`}
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="border-t mt-auto">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <Package className="h-6 w-6 text-primary" />
              <span className="font-semibold">SequenceHUB</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2024 SequenceHUB.com - Marketplace for xLights Sequences
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
