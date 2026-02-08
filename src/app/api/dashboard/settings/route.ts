import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { requireAuthenticatedUser } from '@/lib/auth/guards';
import { applyRateLimit, RATE_LIMIT_CONFIGS } from '@/lib/rate-limit';
import { badRequestError, internalServerError } from '@/lib/api/errors';
import {
  DASHBOARD_DEFAULT_VIEWS,
  PRODUCTS_PAGE_SIZE_OPTIONS,
  SUPPORTED_CURRENCIES,
  THEME_PREFERENCES,
  defaultSettingsValues,
  settingsPayloadSchema,
  type SettingsPayload,
} from '@/lib/schemas/settings';

function isMissingSettingsStorageError(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
    return false;
  }

  return error.code === 'P2021' || error.code === 'P2022';
}

function toSettingsResponse({
  user,
  profile,
  settings,
}: {
  user: { id: string; email: string; name: string | null };
  profile: { displayName: string } | null;
  settings: {
    businessName: string | null;
    supportEmail: string | null;
    notificationEmail: string | null;
    timezone: string;
    currency: string;
    dashboardDefaultView: string;
    productsPageSize: number;
    themePreference: string;
    notifyNewOrder: boolean;
    notifyPayouts: boolean;
    notifyComments: boolean;
    notifySystem: boolean;
    marketingOptIn: boolean;
  };
}) {
  const derivedDisplayName = profile?.displayName || user.name || user.email.split('@')[0] || 'User';

  return {
    displayName: derivedDisplayName,
    businessName: settings.businessName || '',
    supportEmail: settings.supportEmail || '',
    notificationEmail: settings.notificationEmail || user.email,
    timezone: settings.timezone || defaultSettingsValues.timezone,
    currency: settings.currency || defaultSettingsValues.currency,
    dashboardDefaultView:
      settings.dashboardDefaultView || defaultSettingsValues.dashboardDefaultView,
    productsPageSize: settings.productsPageSize || defaultSettingsValues.productsPageSize,
    themePreference: settings.themePreference || defaultSettingsValues.themePreference,
    notifyNewOrder: settings.notifyNewOrder,
    notifyPayouts: settings.notifyPayouts,
    notifyComments: settings.notifyComments,
    notifySystem: settings.notifySystem,
    marketingOptIn: settings.marketingOptIn,
  } satisfies SettingsPayload;
}

async function ensureSettingsRow(userId: string, email: string) {
  return db.userSettings.upsert({
    where: { userId },
    create: {
      userId,
      notificationEmail: email,
      timezone: defaultSettingsValues.timezone,
      currency: defaultSettingsValues.currency,
      dashboardDefaultView: defaultSettingsValues.dashboardDefaultView,
      productsPageSize: defaultSettingsValues.productsPageSize,
      themePreference: defaultSettingsValues.themePreference,
      notifyNewOrder: defaultSettingsValues.notifyNewOrder,
      notifyPayouts: defaultSettingsValues.notifyPayouts,
      notifyComments: defaultSettingsValues.notifyComments,
      notifySystem: defaultSettingsValues.notifySystem,
      marketingOptIn: defaultSettingsValues.marketingOptIn,
    },
    update: {},
    select: {
      businessName: true,
      supportEmail: true,
      notificationEmail: true,
      timezone: true,
      currency: true,
      dashboardDefaultView: true,
      productsPageSize: true,
      themePreference: true,
      notifyNewOrder: true,
      notifyPayouts: true,
      notifyComments: true,
      notifySystem: true,
      marketingOptIn: true,
    },
  });
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuthenticatedUser();
    if (authResult.response) {
      return authResult.response;
    }

    const rateLimit = await applyRateLimit(request, {
      config: RATE_LIMIT_CONFIGS.STATS_QUERY,
      byUser: true,
      byIp: false,
      message: 'Settings query rate limit exceeded. Please try again later.',
    });

    if (!rateLimit.allowed) {
      return rateLimit.response;
    }

    const userRecord = await db.user.findUnique({
      where: { id: authResult.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        profile: {
          select: {
            displayName: true,
          },
        },
      },
    });

    if (!userRecord) {
      return internalServerError('Unable to load account details');
    }

    const settings = await ensureSettingsRow(userRecord.id, userRecord.email);

    return NextResponse.json({
      settings: toSettingsResponse({
        user: userRecord,
        profile: userRecord.profile,
        settings,
      }),
      accountEmail: userRecord.email,
      options: {
        currencies: SUPPORTED_CURRENCIES,
        dashboardViews: DASHBOARD_DEFAULT_VIEWS,
        pageSizes: PRODUCTS_PAGE_SIZE_OPTIONS,
        themes: THEME_PREFERENCES,
      },
    });
  } catch (error) {
    if (isMissingSettingsStorageError(error)) {
      return internalServerError(
        'Settings storage is not configured. Apply the latest user_settings migration.'
      );
    }

    console.error('Failed to fetch dashboard settings:', error);
    return internalServerError();
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authResult = await requireAuthenticatedUser();
    if (authResult.response) {
      return authResult.response;
    }

    const rateLimit = await applyRateLimit(request, {
      config: RATE_LIMIT_CONFIGS.PRODUCT_UPDATE,
      byUser: true,
      byIp: false,
      message: 'Too many settings updates. Please wait before trying again.',
    });

    if (!rateLimit.allowed) {
      return rateLimit.response;
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return badRequestError('Invalid JSON body');
    }

    const parsed = settingsPayloadSchema.safeParse(body);
    if (!parsed.success) {
      return badRequestError('Invalid settings payload', {
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }

    const payload = parsed.data;
    const updated = await db.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: authResult.user.id },
        data: {
          name: payload.displayName,
        },
        select: {
          id: true,
          email: true,
          name: true,
        },
      });

      const profile = await tx.profile.upsert({
        where: { userId: authResult.user.id },
        create: {
          userId: authResult.user.id,
          displayName: payload.displayName,
        },
        update: {
          displayName: payload.displayName,
        },
        select: {
          displayName: true,
        },
      });

      const settings = await tx.userSettings.upsert({
        where: { userId: authResult.user.id },
        create: {
          userId: authResult.user.id,
          businessName: payload.businessName,
          supportEmail: payload.supportEmail,
          notificationEmail: payload.notificationEmail || user.email,
          timezone: payload.timezone,
          currency: payload.currency,
          dashboardDefaultView: payload.dashboardDefaultView,
          productsPageSize: payload.productsPageSize,
          themePreference: payload.themePreference,
          notifyNewOrder: payload.notifyNewOrder,
          notifyPayouts: payload.notifyPayouts,
          notifyComments: payload.notifyComments,
          notifySystem: payload.notifySystem,
          marketingOptIn: payload.marketingOptIn,
        },
        update: {
          businessName: payload.businessName,
          supportEmail: payload.supportEmail,
          notificationEmail: payload.notificationEmail || user.email,
          timezone: payload.timezone,
          currency: payload.currency,
          dashboardDefaultView: payload.dashboardDefaultView,
          productsPageSize: payload.productsPageSize,
          themePreference: payload.themePreference,
          notifyNewOrder: payload.notifyNewOrder,
          notifyPayouts: payload.notifyPayouts,
          notifyComments: payload.notifyComments,
          notifySystem: payload.notifySystem,
          marketingOptIn: payload.marketingOptIn,
        },
        select: {
          businessName: true,
          supportEmail: true,
          notificationEmail: true,
          timezone: true,
          currency: true,
          dashboardDefaultView: true,
          productsPageSize: true,
          themePreference: true,
          notifyNewOrder: true,
          notifyPayouts: true,
          notifyComments: true,
          notifySystem: true,
          marketingOptIn: true,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: authResult.user.id,
          action: 'USER_UPDATED',
          entityType: 'settings',
          entityId: authResult.user.id,
          metadata: {
            source: 'dashboard_settings',
          },
        },
      });

      return { user, profile, settings };
    });

    return NextResponse.json({
      settings: toSettingsResponse(updated),
      message: 'Settings saved successfully.',
    });
  } catch (error) {
    if (isMissingSettingsStorageError(error)) {
      return internalServerError(
        'Settings storage is not configured. Apply the latest user_settings migration.'
      );
    }

    console.error('Failed to update dashboard settings:', error);
    return internalServerError();
  }
}
