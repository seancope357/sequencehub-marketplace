'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { AppHeader } from '@/components/navigation/AppHeader';
import { SellerSidebarNav } from '@/components/dashboard/seller/SellerSidebarNav';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

const CATEGORIES = [
  'CHRISTMAS',
  'HALLOWEEN',
  'PIXEL_TREE',
  'MELODY',
  'MATRIX',
  'ARCH',
  'PROP',
  'FACEBOOK',
  'OTHER',
] as const;

const STATUSES = ['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const;

type EditableProduct = {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  status: string;
  price: number;
  includesFSEQ: boolean;
  includesSource: boolean;
};

export default function EditProductPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading, isCreatorOrAdmin } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<EditableProduct | null>(null);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    if (!isCreatorOrAdmin) {
      router.push('/dashboard/creator/onboarding');
      return;
    }

    void loadProduct();
  }, [authLoading, isAuthenticated, isCreatorOrAdmin, router, params.id]);

  async function loadProduct() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/dashboard/products/${params.id}`, { cache: 'no-store' });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error?.message || payload?.error || 'Failed to load product');
      }

      const payload = await response.json();
      setForm(payload.product as EditableProduct);
    } catch (loadError) {
      console.error('Failed to load product:', loadError);
      setError(loadError instanceof Error ? loadError.message : 'Failed to load product');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/dashboard/products/${params.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          category: form.category,
          status: form.status,
          price: form.price,
          includesFSEQ: form.includesFSEQ,
          includesSource: form.includesSource,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error?.message || payload?.error || 'Failed to update product');
      }

      router.push('/dashboard/products');
    } catch (saveError) {
      console.error('Failed to update product:', saveError);
      setError(saveError instanceof Error ? saveError.message : 'Failed to update product');
    } finally {
      setIsSaving(false);
    }
  }

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">Loading listing...</div>
      </div>
    );
  }

  if (!user || !form) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader contextLabel="Dashboard / Listings / Edit" browseLabel="Marketplace" browseHref="/" />

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="mb-6">
            <SellerSidebarNav />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Edit Listing</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-5" onSubmit={handleSave}>
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={form.title}
                    onChange={(event) => setForm((prev) => (prev ? { ...prev, title: event.target.value } : prev))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={form.description}
                    onChange={(event) =>
                      setForm((prev) => (prev ? { ...prev, description: event.target.value } : prev))
                    }
                    rows={8}
                    required
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <select
                      id="category"
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      value={form.category}
                      onChange={(event) =>
                        setForm((prev) => (prev ? { ...prev, category: event.target.value } : prev))
                      }
                    >
                      {CATEGORIES.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <select
                      id="status"
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      value={form.status}
                      onChange={(event) =>
                        setForm((prev) => (prev ? { ...prev, status: event.target.value } : prev))
                      }
                    >
                      {STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="price">Price (USD)</Label>
                    <Input
                      id="price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.price}
                      onChange={(event) =>
                        setForm((prev) =>
                          prev
                            ? {
                                ...prev,
                                price: Number.parseFloat(event.target.value || '0'),
                              }
                            : prev
                        )
                      }
                      required
                    />
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={form.includesFSEQ}
                      onCheckedChange={(value) =>
                        setForm((prev) => (prev ? { ...prev, includesFSEQ: value === true } : prev))
                      }
                    />
                    Includes FSEQ
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={form.includesSource}
                      onCheckedChange={(value) =>
                        setForm((prev) => (prev ? { ...prev, includesSource: value === true } : prev))
                      }
                    />
                    Includes Source
                  </label>
                </div>

                {error ? <p className="text-sm text-destructive">{error}</p> : null}

                <div className="flex items-center gap-3">
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => router.push('/dashboard/products')}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
