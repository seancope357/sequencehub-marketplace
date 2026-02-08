'use client';

import { useEffect, useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { Save, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DASHBOARD_DEFAULT_VIEWS,
  PRODUCTS_PAGE_SIZE_OPTIONS,
  SUPPORTED_CURRENCIES,
  THEME_PREFERENCES,
  settingsPayloadSchema,
  type SettingsPayload,
} from '@/lib/schemas/settings';

const FALLBACK_TIMEZONES = [
  'UTC',
  'America/Los_Angeles',
  'America/Denver',
  'America/Chicago',
  'America/New_York',
  'America/Toronto',
  'Europe/London',
  'Europe/Berlin',
  'Europe/Paris',
  'Asia/Tokyo',
  'Asia/Singapore',
  'Australia/Sydney',
];

interface SettingsFormProps {
  initialValues: SettingsPayload;
  accountEmail: string;
  isSaving: boolean;
  onSave: (payload: SettingsPayload) => Promise<void>;
}

export function SettingsForm({
  initialValues,
  accountEmail,
  isSaving,
  onSave,
}: SettingsFormProps) {
  const form = useForm<SettingsPayload>({
    resolver: zodResolver(settingsPayloadSchema),
    defaultValues: initialValues,
    mode: 'onChange',
  });

  useEffect(() => {
    form.reset(initialValues);
  }, [initialValues, form]);

  const timezoneOptions = useMemo(() => {
    if (typeof Intl.supportedValuesOf !== 'function') {
      return FALLBACK_TIMEZONES;
    }

    const supported = Intl.supportedValuesOf('timeZone');
    const preferred = FALLBACK_TIMEZONES.filter((tz) => supported.includes(tz));
    const remaining = supported.filter((tz) => !preferred.includes(tz)).slice(0, 80);
    return [...preferred, ...remaining];
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty, isValid },
    reset,
  } = form;

  const submit = handleSubmit(async (payload) => {
    await onSave(payload);
  });

  return (
    <form onSubmit={submit} className="space-y-6 pb-24">
      <Card>
        <CardHeader>
          <CardTitle>Profile &amp; Business</CardTitle>
          <CardDescription>Public-facing and support contact details.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="displayName">Display name</Label>
            <Input id="displayName" {...register('displayName')} />
            {errors.displayName ? (
              <p className="text-sm text-destructive">{errors.displayName.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="businessName">Business name</Label>
            <Input id="businessName" placeholder="Optional" {...register('businessName')} />
            {errors.businessName ? (
              <p className="text-sm text-destructive">{errors.businessName.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="supportEmail">Support email</Label>
            <Input
              id="supportEmail"
              type="email"
              placeholder="Optional"
              autoComplete="email"
              {...register('supportEmail')}
            />
            {errors.supportEmail ? (
              <p className="text-sm text-destructive">{errors.supportEmail.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notificationEmail">Notification email</Label>
            <Input
              id="notificationEmail"
              type="email"
              placeholder={accountEmail}
              autoComplete="email"
              {...register('notificationEmail')}
            />
            {errors.notificationEmail ? (
              <p className="text-sm text-destructive">{errors.notificationEmail.message}</p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Marketplace Preferences</CardTitle>
          <CardDescription>Control default views and list behavior in the seller dashboard.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <Controller
              control={form.control}
              name="timezone"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="timezone">
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    {timezoneOptions.map((timezone) => (
                      <SelectItem key={timezone} value={timezone}>
                        {timezone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.timezone ? (
              <p className="text-sm text-destructive">{errors.timezone.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="currency">Currency</Label>
            <Controller
              control={form.control}
              name="currency"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="currency">
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPORTED_CURRENCIES.map((currency) => (
                      <SelectItem key={currency} value={currency}>
                        {currency}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dashboardDefaultView">Default dashboard view</Label>
            <Controller
              control={form.control}
              name="dashboardDefaultView"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="dashboardDefaultView">
                    <SelectValue placeholder="Select default view" />
                  </SelectTrigger>
                  <SelectContent>
                    {DASHBOARD_DEFAULT_VIEWS.map((view) => (
                      <SelectItem key={view} value={view}>
                        {view.charAt(0).toUpperCase() + view.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="productsPageSize">Products page size</Label>
            <Controller
              control={form.control}
              name="productsPageSize"
              render={({ field }) => (
                <Select value={String(field.value)} onValueChange={(value) => field.onChange(Number(value))}>
                  <SelectTrigger id="productsPageSize">
                    <SelectValue placeholder="Select page size" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRODUCTS_PAGE_SIZE_OPTIONS.map((size) => (
                      <SelectItem key={size} value={String(size)}>
                        {size} items
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.productsPageSize ? (
              <p className="text-sm text-destructive">{errors.productsPageSize.message}</p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>Select which seller updates should trigger email notifications.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <Controller
            control={form.control}
            name="notifyNewOrder"
            render={({ field }) => (
              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label htmlFor="notifyNewOrder">New order notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive an email when an order is completed.</p>
                </div>
                <Switch
                  id="notifyNewOrder"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </div>
            )}
          />

          <Controller
            control={form.control}
            name="notifyPayouts"
            render={({ field }) => (
              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label htmlFor="notifyPayouts">Payout notifications</Label>
                  <p className="text-sm text-muted-foreground">Get notified when payout status changes.</p>
                </div>
                <Switch
                  id="notifyPayouts"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </div>
            )}
          />

          <Controller
            control={form.control}
            name="notifyComments"
            render={({ field }) => (
              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label htmlFor="notifyComments">Listing comment notifications</Label>
                  <p className="text-sm text-muted-foreground">Email updates when comments are posted on listings.</p>
                </div>
                <Switch
                  id="notifyComments"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </div>
            )}
          />

          <Controller
            control={form.control}
            name="notifySystem"
            render={({ field }) => (
              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label htmlFor="notifySystem">System alerts</Label>
                  <p className="text-sm text-muted-foreground">Important account, security, and policy updates.</p>
                </div>
                <Switch
                  id="notifySystem"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </div>
            )}
          />

          <Controller
            control={form.control}
            name="marketingOptIn"
            render={({ field }) => (
              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label htmlFor="marketingOptIn">Product updates and announcements</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive occasional emails about marketplace updates.
                  </p>
                </div>
                <Switch
                  id="marketingOptIn"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </div>
            )}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Set how the dashboard theme should behave.</CardDescription>
        </CardHeader>
        <CardContent className="max-w-md">
          <div className="space-y-2">
            <Label htmlFor="themePreference">Theme preference</Label>
            <Controller
              control={form.control}
              name="themePreference"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="themePreference">
                    <SelectValue placeholder="Select theme" />
                  </SelectTrigger>
                  <SelectContent>
                    {THEME_PREFERENCES.map((theme) => (
                      <SelectItem key={theme} value={theme}>
                        {theme.charAt(0).toUpperCase() + theme.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </CardContent>
      </Card>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="container mx-auto flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <p className="text-sm text-muted-foreground">
            {isDirty ? 'You have unsaved changes.' : 'All changes saved.'}
          </p>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => reset(initialValues)}
              disabled={!isDirty || isSaving}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button type="submit" disabled={!isDirty || !isValid || isSaving}>
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? 'Saving...' : 'Save changes'}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}

