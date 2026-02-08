import { z } from 'zod';

export const SUPPORTED_CURRENCIES = ['USD', 'CAD', 'EUR', 'GBP'] as const;
export const DASHBOARD_DEFAULT_VIEWS = [
  'overview',
  'listings',
  'orders',
  'payouts',
  'support',
] as const;
export const PRODUCTS_PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;
export const THEME_PREFERENCES = ['system', 'light', 'dark'] as const;

export const defaultSettingsValues = {
  displayName: '',
  businessName: '',
  supportEmail: '',
  notificationEmail: '',
  timezone: 'UTC',
  currency: 'USD',
  dashboardDefaultView: 'overview',
  productsPageSize: 25,
  themePreference: 'system',
  notifyNewOrder: true,
  notifyPayouts: true,
  notifyComments: false,
  notifySystem: true,
  marketingOptIn: false,
} as const;

function isValidIanaTimeZone(value: string) {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

const optionalTrimmedString = (maxLength: number) =>
  z
    .string()
    .trim()
    .max(maxLength)
    .optional()
    .nullable()
    .transform((value) => {
      if (!value) return null;
      return value.length > 0 ? value : null;
    });

const optionalEmail = z
  .string()
  .trim()
  .email('Enter a valid email address')
  .max(320)
  .optional()
  .nullable()
  .or(z.literal(''))
  .transform((value) => {
    if (!value) return null;
    return value;
  });

export const settingsPayloadSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, 'Display name must be at least 2 characters')
    .max(80, 'Display name must be 80 characters or fewer'),
  businessName: optionalTrimmedString(120),
  supportEmail: optionalEmail,
  notificationEmail: optionalEmail,
  timezone: z
    .string()
    .trim()
    .min(1, 'Timezone is required')
    .refine(isValidIanaTimeZone, 'Select a valid timezone'),
  currency: z.enum(SUPPORTED_CURRENCIES),
  dashboardDefaultView: z.enum(DASHBOARD_DEFAULT_VIEWS),
  productsPageSize: z
    .number()
    .int()
    .refine(
      (value) =>
        PRODUCTS_PAGE_SIZE_OPTIONS.includes(
          value as (typeof PRODUCTS_PAGE_SIZE_OPTIONS)[number]
        ),
      'Select a valid page size'
    ),
  themePreference: z.enum(THEME_PREFERENCES),
  notifyNewOrder: z.boolean(),
  notifyPayouts: z.boolean(),
  notifyComments: z.boolean(),
  notifySystem: z.boolean(),
  marketingOptIn: z.boolean(),
});

export type SettingsPayload = z.infer<typeof settingsPayloadSchema>;

export function normalizeSettingsPayload(
  payload: Partial<SettingsPayload>
): SettingsPayload {
  const normalized = {
    ...defaultSettingsValues,
    ...payload,
  };

  const parsed = settingsPayloadSchema.safeParse(normalized);
  if (parsed.success) {
    return parsed.data;
  }

  return {
    ...defaultSettingsValues,
    displayName: typeof payload.displayName === 'string' ? payload.displayName : '',
  };
}

