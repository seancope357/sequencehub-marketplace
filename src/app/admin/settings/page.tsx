import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Platform configuration will live here. No editable settings are enabled yet.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Platform Settings</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          This section is reserved for platform fee controls, category management, and
          email configuration once those admin endpoints are ready.
        </CardContent>
      </Card>
    </div>
  );
}
