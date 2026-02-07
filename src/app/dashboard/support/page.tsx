'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppHeader } from '@/components/navigation/AppHeader';
import { useAuth } from '@/hooks/use-auth';
import { SellerSidebarNav } from '@/components/dashboard/seller/SellerSidebarNav';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { CircleHelp } from 'lucide-react';

type SupportTicket = {
  id: string;
  category: string;
  subject: string;
  description: string;
  status: string;
  orderId: string | null;
  productId: string | null;
  createdAt: string;
};

interface SupportResponse {
  tickets: SupportTicket[];
}

const DEFAULT_FORM = {
  category: 'general',
  subject: '',
  description: '',
  orderId: '',
  productId: '',
};

export default function DashboardSupportPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading, isCreatorOrAdmin } = useAuth();

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

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

    void loadTickets();
  }, [authLoading, isAuthenticated, isCreatorOrAdmin, router]);

  async function loadTickets() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/dashboard/support', {
        cache: 'no-store',
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error?.message || payload?.error || 'Failed to load support tickets');
      }

      const payload = (await response.json()) as SupportResponse;
      setTickets(payload.tickets || []);
    } catch (loadError) {
      console.error('Failed to load support tickets:', loadError);
      setError(loadError instanceof Error ? loadError.message : 'Failed to load support tickets');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch('/api/dashboard/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: form.category,
          subject: form.subject,
          description: form.description,
          orderId: form.orderId || undefined,
          productId: form.productId || undefined,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error?.message || payload?.error || 'Failed to submit support ticket');
      }

      setForm(DEFAULT_FORM);
      await loadTickets();
    } catch (submitTicketError) {
      console.error('Failed to submit support ticket:', submitTicketError);
      setSubmitError(
        submitTicketError instanceof Error
          ? submitTicketError.message
          : 'Failed to submit support ticket'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">Loading support...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader contextLabel="Dashboard / Support" browseLabel="Marketplace" browseHref="/" />

      <div className="container mx-auto px-4 py-8 space-y-6">
        <SellerSidebarNav />

        <div>
          <h1 className="text-3xl font-bold">Support</h1>
          <p className="text-muted-foreground">Submit seller issues and track progress.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Create Support Ticket</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  value={form.category}
                  onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
                  placeholder="general, payout, listing, order"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  value={form.subject}
                  onChange={(event) => setForm((prev) => ({ ...prev, subject: event.target.value }))}
                  placeholder="Short summary"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                  placeholder="Describe the issue and what you expected to happen"
                  rows={6}
                  required
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="orderId">Order ID (optional)</Label>
                  <Input
                    id="orderId"
                    value={form.orderId}
                    onChange={(event) => setForm((prev) => ({ ...prev, orderId: event.target.value }))}
                    placeholder="UUID"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="productId">Product ID (optional)</Label>
                  <Input
                    id="productId"
                    value={form.productId}
                    onChange={(event) => setForm((prev) => ({ ...prev, productId: event.target.value }))}
                    placeholder="UUID"
                  />
                </div>
              </div>

              {submitError ? <p className="text-sm text-destructive">{submitError}</p> : null}

              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Submitting...' : 'Submit Ticket'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your Tickets</CardTitle>
          </CardHeader>
          <CardContent>
            {error ? (
              <div className="space-y-3">
                <p className="text-sm text-destructive">{error}</p>
                <Button variant="outline" onClick={() => void loadTickets()}>
                  Retry
                </Button>
              </div>
            ) : tickets.length === 0 ? (
              <div className="text-center py-10 space-y-2">
                <CircleHelp className="h-12 w-12 mx-auto text-muted-foreground" />
                <p className="text-lg font-medium">No support tickets yet</p>
                <p className="text-sm text-muted-foreground">Create a ticket above when you need assistance.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tickets.map((ticket) => (
                  <div key={ticket.id} className="rounded border p-4 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium">{ticket.subject}</p>
                      <Badge variant={ticket.status === 'OPEN' ? 'secondary' : 'outline'}>
                        {ticket.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">Category: {ticket.category}</p>
                    <p className="text-sm">{ticket.description}</p>
                    <p className="text-xs text-muted-foreground">
                      Created {new Date(ticket.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
