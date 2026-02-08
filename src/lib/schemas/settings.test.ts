import { describe, expect, it } from 'vitest';
import { settingsPayloadSchema, defaultSettingsValues } from './settings';

describe('settingsPayloadSchema', () => {
  it('accepts valid payload', () => {
    const payload = settingsPayloadSchema.parse({
      ...defaultSettingsValues,
      displayName: 'Sequence Creator',
      timezone: 'America/Los_Angeles',
      supportEmail: 'support@example.com',
      notificationEmail: 'notify@example.com',
      productsPageSize: 50,
      currency: 'USD',
    });

    expect(payload.displayName).toBe('Sequence Creator');
    expect(payload.productsPageSize).toBe(50);
  });

  it('rejects invalid timezone', () => {
    const parsed = settingsPayloadSchema.safeParse({
      ...defaultSettingsValues,
      displayName: 'Sequence Creator',
      timezone: 'Mars/Phobos',
    });

    expect(parsed.success).toBe(false);
  });

  it('rejects unsupported page size', () => {
    const parsed = settingsPayloadSchema.safeParse({
      ...defaultSettingsValues,
      displayName: 'Sequence Creator',
      productsPageSize: 37,
    });

    expect(parsed.success).toBe(false);
  });
});

