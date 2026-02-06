import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getStripeConfigStatus } from '@/lib/stripe-connect';

export const dynamic = 'force-dynamic';

export default function AdminSettingsPage() {
  const stripeStatus = getStripeConfigStatus();
  const envChecks = [
    { label: 'NEXT_PUBLIC_SUPABASE_URL', value: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) },
    { label: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', value: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) },
    { label: 'SUPABASE_SERVICE_ROLE_KEY', value: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY) },
    { label: 'DATABASE_URL', value: Boolean(process.env.DATABASE_URL) },
    { label: 'STRIPE_SECRET_KEY', value: Boolean(process.env.STRIPE_SECRET_KEY) },
    { label: 'STRIPE_WEBHOOK_SECRET', value: Boolean(process.env.STRIPE_WEBHOOK_SECRET) },
    { label: 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', value: Boolean(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) },
    { label: 'DOWNLOAD_SECRET', value: Boolean(process.env.DOWNLOAD_SECRET) },
    { label: 'NEXT_PUBLIC_BASE_URL', value: Boolean(process.env.NEXT_PUBLIC_BASE_URL) },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Environment configuration status for this deployment.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Stripe Connect</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div>
            <span className="font-medium">Configured:</span>{' '}
            <span>{stripeStatus.configured ? 'Yes' : 'No'}</span>
          </div>
          <div>
            <span className="font-medium">Base URL:</span>{' '}
            <span>{stripeStatus.baseUrl}</span>
          </div>
          {!stripeStatus.configured && stripeStatus.message ? (
            <div className="text-muted-foreground">{stripeStatus.message}</div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Environment Variables</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {envChecks.map((env) => (
            <div key={env.label} className="flex items-center justify-between">
              <span className="font-medium">{env.label}</span>
              <span>{env.value ? 'Configured' : 'Missing'}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
