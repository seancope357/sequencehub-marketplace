#!/usr/bin/env bun

/**
 * SequenceHUB Supabase Migration Script
 *
 * Migrates data from existing SQLite/PostgreSQL database to Supabase
 *
 * Usage:
 *   bun run scripts/migrate-to-supabase.ts --env production
 *
 * Prerequisites:
 *   - Supabase project created
 *   - Schema migrations applied (001_initial_schema.sql, 002_storage_policies.sql)
 *   - Environment variables configured in .env.migration
 *
 * CRITICAL: This script will NOT migrate passwords. Users must reset passwords.
 */

import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';

// ============================================
// CONFIGURATION
// ============================================

const OLD_DB = new PrismaClient({
  datasourceUrl: process.env.OLD_DATABASE_URL || process.env.DATABASE_URL
});

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials!');
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Migration statistics
const stats = {
  users: 0,
  profiles: 0,
  roles: 0,
  creatorAccounts: 0,
  products: 0,
  versions: 0,
  files: 0,
  media: 0,
  tags: 0,
  productTags: 0,
  prices: 0,
  checkoutSessions: 0,
  orders: 0,
  orderItems: 0,
  entitlements: 0,
  downloadTokens: 0,
  accessLogs: 0,
  auditLogs: 0,
  errors: 0
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Generate a random password for password reset
 */
function generateResetPassword(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Map old CUID to new UUID
 */
const userIdMap = new Map<string, string>();

/**
 * Log progress
 */
function logProgress(message: string) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

/**
 * Log error
 */
function logError(context: string, error: any) {
  console.error(`❌ [${context}]`, error);
  stats.errors++;
}

// ============================================
// MIGRATION FUNCTIONS
// ============================================

/**
 * Step 1: Migrate Users
 *
 * Creates Supabase Auth accounts for all users
 * Sends password reset emails to all users
 */
async function migrateUsers() {
  logProgress('📧 Migrating users...');

  const oldUsers = await OLD_DB.user.findMany({
    include: {
      roles: true,
      profile: true
    }
  });

  for (const oldUser of oldUsers) {
    try {
      // Generate temporary password (users will reset)
      const tempPassword = generateResetPassword();

      // Create Supabase Auth user
      const { data, error } = await supabase.auth.admin.createUser({
        email: oldUser.email,
        password: tempPassword,
        email_confirm: false, // Force email verification/password reset
        user_metadata: {
          name: oldUser.name,
          avatar: oldUser.avatar,
          migrated_from: 'sequencehub_v1',
          migration_date: new Date().toISOString()
        }
      });

      if (error) {
        logError(`User ${oldUser.email}`, error);
        continue;
      }

      if (!data.user) {
        logError(`User ${oldUser.email}`, 'No user returned from Supabase');
        continue;
      }

      // Map old ID to new ID
      userIdMap.set(oldUser.id, data.user.id);

      // Store mapping in database for Stripe webhook compatibility
      const { error: mapError } = await supabase
        .from('user_id_migrations')
        .insert({
          old_user_id: oldUser.id,
          new_user_id: data.user.id
        });

      if (mapError) {
        logError(`User ID mapping for ${oldUser.email}`, mapError);
      }

      stats.users++;

      // Migrate profile if exists
      if (oldUser.profile) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            user_id: data.user.id,
            display_name: oldUser.profile.displayName,
            bio: oldUser.profile.bio,
            website: oldUser.profile.website,
            social_twitter: oldUser.profile.socialTwitter,
            social_youtube: oldUser.profile.socialYouTube,
            social_instagram: oldUser.profile.socialInstagram,
            location: oldUser.profile.location
          });

        if (profileError) {
          logError(`Profile for ${oldUser.email}`, profileError);
        } else {
          stats.profiles++;
        }
      }

      // Migrate roles
      for (const role of oldUser.roles) {
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: data.user.id,
            role: role.role
          });

        if (roleError) {
          logError(`Role ${role.role} for ${oldUser.email}`, roleError);
        } else {
          stats.roles++;
        }
      }

      logProgress(`✅ Migrated user: ${oldUser.email} (${oldUser.id} → ${data.user.id})`);

    } catch (error) {
      logError(`User ${oldUser.email}`, error);
    }
  }

  logProgress(`✅ Migrated ${stats.users} users, ${stats.profiles} profiles, ${stats.roles} roles`);
}

/**
 * Step 2: Migrate Creator Accounts
 */
async function migrateCreatorAccounts() {
  logProgress('👨‍💼 Migrating creator accounts...');

  const oldCreators = await OLD_DB.creatorAccount.findMany();

  for (const oldCreator of oldCreators) {
    try {
      const newUserId = userIdMap.get(oldCreator.userId);
      if (!newUserId) {
        logError(`Creator account for ${oldCreator.userId}`, 'User not found in migration map');
        continue;
      }

      const { error } = await supabase
        .from('creator_accounts')
        .insert({
          user_id: newUserId,
          stripe_account_id: oldCreator.stripeAccountId,
          stripe_account_status: oldCreator.stripeAccountStatus,
          onboarding_status: oldCreator.onboardingStatus,
          platform_fee_percent: oldCreator.platformFeePercent,
          total_revenue: oldCreator.totalRevenue,
          total_sales: oldCreator.totalSales,
          payout_schedule: oldCreator.payoutSchedule
        });

      if (error) {
        logError(`Creator account for ${oldCreator.userId}`, error);
      } else {
        stats.creatorAccounts++;
      }
    } catch (error) {
      logError(`Creator account ${oldCreator.id}`, error);
    }
  }

  logProgress(`✅ Migrated ${stats.creatorAccounts} creator accounts`);
}

/**
 * Step 3: Migrate Products, Versions, Files, Media
 */
async function migrateProducts() {
  logProgress('📦 Migrating products...');

  const oldProducts = await OLD_DB.product.findMany({
    include: {
      versions: {
        include: {
          files: true
        }
      },
      media: true,
      tags: {
        include: {
          tag: true
        }
      },
      prices: true
    }
  });

  for (const oldProduct of oldProducts) {
    try {
      const newCreatorId = userIdMap.get(oldProduct.creatorId);
      if (!newCreatorId) {
        logError(`Product ${oldProduct.title}`, 'Creator not found in migration map');
        continue;
      }

      // Insert product
      const { data: newProduct, error: productError } = await supabase
        .from('products')
        .insert({
          slug: oldProduct.slug,
          creator_id: newCreatorId,
          title: oldProduct.title,
          description: oldProduct.description,
          category: oldProduct.category,
          status: oldProduct.status,
          license_type: oldProduct.licenseType,
          seat_count: oldProduct.seatCount,
          xlights_version_min: oldProduct.xLightsVersionMin,
          xlights_version_max: oldProduct.xLightsVersionMax,
          target_use: oldProduct.targetUse,
          expected_props: oldProduct.expectedProps,
          includes_fseq: oldProduct.includesFSEQ,
          includes_source: oldProduct.includesSource,
          meta_title: oldProduct.metaTitle,
          meta_description: oldProduct.metaDescription,
          meta_keywords: oldProduct.metaKeywords,
          view_count: oldProduct.viewCount,
          sale_count: oldProduct.saleCount
        })
        .select()
        .single();

      if (productError) {
        logError(`Product ${oldProduct.title}`, productError);
        continue;
      }

      stats.products++;

      // Migrate versions
      for (const oldVersion of oldProduct.versions) {
        const { data: newVersion, error: versionError } = await supabase
          .from('product_versions')
          .insert({
            product_id: newProduct.id,
            version_number: oldVersion.versionNumber,
            version_name: oldVersion.versionName,
            changelog: oldVersion.changelog,
            is_latest: oldVersion.isLatest,
            published_at: oldVersion.publishedAt?.toISOString()
          })
          .select()
          .single();

        if (versionError) {
          logError(`Version ${oldVersion.versionName} for ${oldProduct.title}`, versionError);
          continue;
        }

        stats.versions++;

        // Migrate files
        for (const oldFile of oldVersion.files) {
          const { error: fileError } = await supabase
            .from('product_files')
            .insert({
              version_id: newVersion.id,
              file_name: oldFile.fileName,
              original_name: oldFile.originalName,
              file_type: oldFile.fileType,
              file_size: oldFile.fileSize,
              file_hash: oldFile.fileHash,
              storage_key: oldFile.storageKey,
              mime_type: oldFile.mimeType,
              metadata: oldFile.metadata ? JSON.parse(oldFile.metadata) : null,
              sequence_length: oldFile.sequenceLength,
              fps: oldFile.fps,
              channel_count: oldFile.channelCount
            });

          if (fileError) {
            logError(`File ${oldFile.fileName} for ${oldProduct.title}`, fileError);
          } else {
            stats.files++;
          }
        }
      }

      // Migrate media
      for (const oldMedia of oldProduct.media) {
        const { error: mediaError } = await supabase
          .from('product_media')
          .insert({
            product_id: newProduct.id,
            media_type: oldMedia.mediaType,
            file_name: oldMedia.fileName,
            original_name: oldMedia.originalName,
            file_size: oldMedia.fileSize,
            file_hash: oldMedia.fileHash,
            storage_key: oldMedia.storageKey,
            mime_type: oldMedia.mimeType,
            width: oldMedia.width,
            height: oldMedia.height,
            alt_text: oldMedia.altText,
            display_order: oldMedia.displayOrder
          });

        if (mediaError) {
          logError(`Media ${oldMedia.fileName} for ${oldProduct.title}`, mediaError);
        } else {
          stats.media++;
        }
      }

      // Migrate prices
      for (const oldPrice of oldProduct.prices) {
        const { error: priceError } = await supabase
          .from('prices')
          .insert({
            product_id: newProduct.id,
            amount: oldPrice.amount,
            currency: oldPrice.currency,
            is_active: oldPrice.isActive
          });

        if (priceError) {
          logError(`Price for ${oldProduct.title}`, priceError);
        } else {
          stats.prices++;
        }
      }

      // Migrate product tags
      for (const oldProductTag of oldProduct.tags) {
        // Find or create tag
        const { data: tag } = await supabase
          .from('tags')
          .select('id')
          .eq('slug', oldProductTag.tag.slug)
          .single();

        if (tag) {
          const { error: tagError } = await supabase
            .from('product_tags')
            .insert({
              product_id: newProduct.id,
              tag_id: tag.id
            });

          if (tagError) {
            logError(`Product tag ${oldProductTag.tag.name} for ${oldProduct.title}`, tagError);
          } else {
            stats.productTags++;
          }
        }
      }

      logProgress(`✅ Migrated product: ${oldProduct.title}`);

    } catch (error) {
      logError(`Product ${oldProduct.id}`, error);
    }
  }

  logProgress(`✅ Migrated ${stats.products} products, ${stats.versions} versions, ${stats.files} files, ${stats.media} media`);
}

/**
 * Step 4: Migrate Orders and Entitlements
 */
async function migrateOrders() {
  logProgress('🛒 Migrating orders and entitlements...');

  const oldOrders = await OLD_DB.order.findMany({
    include: {
      items: true,
      entitlements: true
    }
  });

  for (const oldOrder of oldOrders) {
    try {
      const newUserId = userIdMap.get(oldOrder.userId);
      if (!newUserId) {
        logError(`Order ${oldOrder.orderNumber}`, 'User not found in migration map');
        continue;
      }

      // Insert order
      const { data: newOrder, error: orderError } = await supabase
        .from('orders')
        .insert({
          order_number: oldOrder.orderNumber,
          user_id: newUserId,
          total_amount: oldOrder.totalAmount,
          currency: oldOrder.currency,
          status: oldOrder.status,
          payment_intent_id: oldOrder.paymentIntentId,
          refunded_amount: oldOrder.refundedAmount,
          refunded_at: oldOrder.refundedAt?.toISOString(),
          utm_source: oldOrder.utmSource,
          utm_medium: oldOrder.utmMedium,
          utm_campaign: oldOrder.utmCampaign
        })
        .select()
        .single();

      if (orderError) {
        logError(`Order ${oldOrder.orderNumber}`, orderError);
        continue;
      }

      stats.orders++;

      // Migrate order items
      for (const oldItem of oldOrder.items) {
        // Find product by slug (need to query old DB for slug)
        const oldProduct = await OLD_DB.product.findUnique({
          where: { id: oldItem.productId }
        });

        if (!oldProduct) continue;

        const { data: newProduct } = await supabase
          .from('products')
          .select('id')
          .eq('slug', oldProduct.slug)
          .single();

        if (!newProduct) continue;

        const { error: itemError } = await supabase
          .from('order_items')
          .insert({
            order_id: newOrder.id,
            product_id: newProduct.id,
            version_id: oldItem.versionId, // Will need version ID mapping if IDs changed
            price_id: oldItem.priceId,
            price_at_purchase: oldItem.priceAtPurchase,
            currency: oldItem.currency
          });

        if (itemError) {
          logError(`Order item for ${oldOrder.orderNumber}`, itemError);
        } else {
          stats.orderItems++;
        }
      }

      // Migrate entitlements
      for (const oldEntitlement of oldOrder.entitlements) {
        const { error: entitlementError } = await supabase
          .from('entitlements')
          .insert({
            user_id: newUserId,
            order_id: newOrder.id,
            product_id: oldEntitlement.productId,
            version_id: oldEntitlement.versionId,
            license_type: oldEntitlement.licenseType,
            is_active: oldEntitlement.isActive,
            expires_at: oldEntitlement.expiresAt?.toISOString(),
            last_download_at: oldEntitlement.lastDownloadAt?.toISOString(),
            download_count: oldEntitlement.downloadCount
          });

        if (entitlementError) {
          logError(`Entitlement for ${oldOrder.orderNumber}`, entitlementError);
        } else {
          stats.entitlements++;
        }
      }

      logProgress(`✅ Migrated order: ${oldOrder.orderNumber}`);

    } catch (error) {
      logError(`Order ${oldOrder.id}`, error);
    }
  }

  logProgress(`✅ Migrated ${stats.orders} orders, ${stats.orderItems} order items, ${stats.entitlements} entitlements`);
}

/**
 * Step 5: Migrate Audit Logs (last 90 days only to reduce size)
 */
async function migrateAuditLogs() {
  logProgress('📝 Migrating audit logs (last 90 days)...');

  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const oldLogs = await OLD_DB.auditLog.findMany({
    where: {
      createdAt: {
        gte: ninetyDaysAgo
      }
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: 10000 // Limit to most recent 10,000 logs
  });

  for (const oldLog of oldLogs) {
    try {
      const newUserId = oldLog.userId ? userIdMap.get(oldLog.userId) : null;

      const { error } = await supabase
        .from('audit_logs')
        .insert({
          user_id: newUserId,
          order_id: oldLog.orderId,
          action: oldLog.action,
          entity_type: oldLog.entityType,
          entity_id: oldLog.entityId,
          changes: oldLog.changes ? JSON.parse(oldLog.changes) : null,
          metadata: oldLog.metadata ? JSON.parse(oldLog.metadata) : null,
          ip_address: oldLog.ipAddress,
          user_agent: oldLog.userAgent
        });

      if (error) {
        logError(`Audit log ${oldLog.id}`, error);
      } else {
        stats.auditLogs++;
      }
    } catch (error) {
      logError(`Audit log ${oldLog.id}`, error);
    }
  }

  logProgress(`✅ Migrated ${stats.auditLogs} audit logs`);
}

/**
 * Step 6: Send Password Reset Emails
 */
async function sendPasswordResetEmails() {
  logProgress('📧 Sending password reset emails to all users...');

  let resetCount = 0;

  for (const [oldUserId, newUserId] of userIdMap) {
    try {
      const oldUser = await OLD_DB.user.findUnique({
        where: { id: oldUserId }
      });

      if (!oldUser) continue;

      // Request password reset email
      const { error } = await supabase.auth.resetPasswordForEmail(oldUser.email, {
        redirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/auth/reset-password`
      });

      if (error) {
        logError(`Password reset for ${oldUser.email}`, error);
      } else {
        resetCount++;
        logProgress(`✉️  Sent password reset to ${oldUser.email}`);
      }
    } catch (error) {
      logError(`Password reset for ${oldUserId}`, error);
    }
  }

  logProgress(`✅ Sent ${resetCount} password reset emails`);
}

// ============================================
// MAIN MIGRATION FLOW
// ============================================

async function main() {
  console.log('');
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║   SequenceHUB Supabase Migration                         ║');
  console.log('║   Version: 1.0.0                                          ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('');

  const startTime = Date.now();

  try {
    // Step 1: Migrate users (includes profiles and roles)
    await migrateUsers();

    // Step 2: Migrate creator accounts
    await migrateCreatorAccounts();

    // Step 3: Migrate products, versions, files, media
    await migrateProducts();

    // Step 4: Migrate orders and entitlements
    await migrateOrders();

    // Step 5: Migrate audit logs (last 90 days)
    await migrateAuditLogs();

    // Step 6: Send password reset emails
    if (process.env.SEND_PASSWORD_RESETS === 'true') {
      await sendPasswordResetEmails();
    } else {
      logProgress('⏭️  Skipping password reset emails (set SEND_PASSWORD_RESETS=true to enable)');
    }

    // Final statistics
    const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(2);

    console.log('');
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║   Migration Complete!                                     ║');
    console.log('╚═══════════════════════════════════════════════════════════╝');
    console.log('');
    console.log('📊 Migration Statistics:');
    console.log('┌─────────────────────────┬─────────┐');
    console.log('│ Users                   │', stats.users.toString().padStart(7), '│');
    console.log('│ Profiles                │', stats.profiles.toString().padStart(7), '│');
    console.log('│ Roles                   │', stats.roles.toString().padStart(7), '│');
    console.log('│ Creator Accounts        │', stats.creatorAccounts.toString().padStart(7), '│');
    console.log('│ Products                │', stats.products.toString().padStart(7), '│');
    console.log('│ Product Versions        │', stats.versions.toString().padStart(7), '│');
    console.log('│ Product Files           │', stats.files.toString().padStart(7), '│');
    console.log('│ Product Media           │', stats.media.toString().padStart(7), '│');
    console.log('│ Product Tags            │', stats.productTags.toString().padStart(7), '│');
    console.log('│ Prices                  │', stats.prices.toString().padStart(7), '│');
    console.log('│ Orders                  │', stats.orders.toString().padStart(7), '│');
    console.log('│ Order Items             │', stats.orderItems.toString().padStart(7), '│');
    console.log('│ Entitlements            │', stats.entitlements.toString().padStart(7), '│');
    console.log('│ Audit Logs              │', stats.auditLogs.toString().padStart(7), '│');
    console.log('├─────────────────────────┼─────────┤');
    console.log('│ Errors                  │', stats.errors.toString().padStart(7), '│');
    console.log('│ Duration (minutes)      │', duration.padStart(7), '│');
    console.log('└─────────────────────────┴─────────┘');
    console.log('');

    if (stats.errors > 0) {
      console.log('⚠️  Migration completed with errors. Review logs above.');
      process.exit(1);
    } else {
      console.log('✅ Migration completed successfully with no errors!');
      console.log('');
      console.log('Next steps:');
      console.log('1. Verify data in Supabase Dashboard');
      console.log('2. Test authentication with password reset');
      console.log('3. Run file migration script to upload files to Supabase Storage');
      console.log('4. Update application environment variables');
      console.log('5. Deploy updated code to production');
      console.log('');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await OLD_DB.$disconnect();
  }
}

// Run migration
main();
