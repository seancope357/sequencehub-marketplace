/**
 * Background Job System - Type Definitions
 * Comprehensive type system for BullMQ job queues
 */

import { Job, JobsOptions } from 'bullmq';

// ============================================
// QUEUE NAMES
// ============================================

export enum QueueName {
  FILE_PROCESSING = 'file-processing',
  EMAIL = 'email',
  WEBHOOK_RETRY = 'webhook-retry',
  CLEANUP = 'cleanup',
  ANALYTICS = 'analytics',
}

// ============================================
// JOB PRIORITIES
// ============================================

export enum JobPriority {
  CRITICAL = 1,   // Order processing, payment webhooks
  HIGH = 3,       // File processing for new uploads
  NORMAL = 5,     // Email notifications
  LOW = 7,        // Analytics, cleanup
  BACKGROUND = 10 // Scheduled maintenance
}

// ============================================
// JOB STATUS
// ============================================

export enum JobStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  FAILED = 'failed',
  DELAYED = 'delayed',
}

// ============================================
// FILE PROCESSING JOBS
// ============================================

export type FileProcessingTask = 'metadata-extraction' | 'virus-scan' | 'thumbnail-generation' | 'hash-verification';

export interface FileProcessingJobData {
  fileId: string;
  storageKey: string;
  fileName: string;
  fileType: 'SOURCE' | 'RENDERED' | 'ASSET' | 'PREVIEW';
  tasks: FileProcessingTask[];
  priority?: JobPriority;
  userId?: string;
  productId?: string;
}

export interface FileProcessingJobResult {
  success: boolean;
  fileId: string;
  tasksCompleted: FileProcessingTask[];
  metadata?: any;
  errors?: string[];
}

// ============================================
// EMAIL JOBS
// ============================================

export type EmailTemplate =
  | 'welcome'
  | 'order-confirmation'
  | 'download-ready'
  | 'creator-payout'
  | 'product-approved'
  | 'product-rejected'
  | 'platform-announcement';

export interface EmailJobData {
  to: string;
  template: EmailTemplate;
  data: Record<string, any>;
  userId?: string;
  orderId?: string;
  priority?: JobPriority;
}

export interface EmailJobResult {
  success: boolean;
  emailId?: string;
  error?: string;
}

// ============================================
// WEBHOOK RETRY JOBS
// ============================================

export interface WebhookRetryJobData {
  webhookId: string;
  eventType: string;
  payload: any;
  url: string;
  attempt: number;
  maxAttempts?: number;
}

export interface WebhookRetryJobResult {
  success: boolean;
  attempt: number;
  response?: any;
  error?: string;
}

// ============================================
// CLEANUP JOBS
// ============================================

export type CleanupTask =
  | 'expired-tokens'
  | 'abandoned-sessions'
  | 'old-audit-logs'
  | 'soft-deleted-records'
  | 'failed-jobs'
  | 'completed-jobs';

export interface CleanupJobData {
  task: CleanupTask;
  olderThanDays?: number;
  dryRun?: boolean;
}

export interface CleanupJobResult {
  success: boolean;
  task: CleanupTask;
  deletedCount: number;
  errors?: string[];
}

// ============================================
// ANALYTICS JOBS
// ============================================

export type AnalyticsTask =
  | 'aggregate-downloads'
  | 'calculate-revenue'
  | 'generate-report'
  | 'update-stats';

export interface AnalyticsJobData {
  task: AnalyticsTask;
  startDate?: Date;
  endDate?: Date;
  entityType?: string;
  entityId?: string;
}

export interface AnalyticsJobResult {
  success: boolean;
  task: AnalyticsTask;
  recordsProcessed: number;
  data?: any;
}

// ============================================
// JOB UNION TYPES
// ============================================

export type JobData =
  | FileProcessingJobData
  | EmailJobData
  | WebhookRetryJobData
  | CleanupJobData
  | AnalyticsJobData;

export type JobResult =
  | FileProcessingJobResult
  | EmailJobResult
  | WebhookRetryJobResult
  | CleanupJobResult
  | AnalyticsJobResult;

// ============================================
// QUEUE CONFIGURATION
// ============================================

export interface QueueConfig {
  name: QueueName;
  defaultJobOptions: JobsOptions;
  concurrency: number;
  removeOnComplete?: boolean | number | { age?: number; count?: number };
  removeOnFail?: boolean | number | { age?: number; count?: number };
}

// ============================================
// WORKER CONFIGURATION
// ============================================

export interface WorkerConfig {
  queueName: QueueName;
  concurrency: number;
  limiter?: {
    max: number;
    duration: number;
  };
}

// ============================================
// JOB MONITORING
// ============================================

export interface QueueMetrics {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: number;
}

export interface JobInfo {
  id: string;
  name: string;
  data: any;
  progress: number;
  attemptsMade: number;
  timestamp: number;
  processedOn?: number;
  finishedOn?: number;
  failedReason?: string;
  stacktrace?: string[];
}

export interface QueueHealth {
  name: QueueName;
  status: 'healthy' | 'degraded' | 'unhealthy';
  metrics: QueueMetrics;
  isPaused: boolean;
  lastJobProcessed?: number;
  errors?: string[];
}

// ============================================
// SCHEDULED JOB CONFIGURATION
// ============================================

export interface ScheduledJobConfig {
  name: string;
  pattern: string; // Cron pattern
  data?: any;
  options?: JobsOptions;
}

export const SCHEDULED_JOBS: ScheduledJobConfig[] = [
  // Daily cleanup at 2 AM
  {
    name: 'daily-cleanup',
    pattern: '0 2 * * *',
    data: {
      tasks: ['expired-tokens', 'abandoned-sessions'],
    },
  },
  // Daily analytics aggregation at 1 AM
  {
    name: 'daily-analytics',
    pattern: '0 1 * * *',
    data: {
      task: 'aggregate-downloads',
    },
  },
  // Weekly cleanup of old audit logs (Sunday at 3 AM)
  {
    name: 'weekly-audit-cleanup',
    pattern: '0 3 * * 0',
    data: {
      task: 'old-audit-logs',
      olderThanDays: 90,
    },
  },
  // Hourly analytics processing
  {
    name: 'hourly-analytics',
    pattern: '0 * * * *',
    data: {
      task: 'update-stats',
    },
  },
  // Cleanup failed jobs older than 7 days (daily at 4 AM)
  {
    name: 'daily-failed-jobs-cleanup',
    pattern: '0 4 * * *',
    data: {
      task: 'failed-jobs',
      olderThanDays: 7,
    },
  },
];

// ============================================
// ERROR HANDLING
// ============================================

export class JobError extends Error {
  constructor(
    message: string,
    public code: string,
    public isRetryable: boolean = true,
    public context?: any
  ) {
    super(message);
    this.name = 'JobError';
  }
}

export enum JobErrorCode {
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  METADATA_EXTRACTION_FAILED = 'METADATA_EXTRACTION_FAILED',
  VIRUS_SCAN_FAILED = 'VIRUS_SCAN_FAILED',
  EMAIL_SEND_FAILED = 'EMAIL_SEND_FAILED',
  WEBHOOK_TIMEOUT = 'WEBHOOK_TIMEOUT',
  WEBHOOK_ERROR = 'WEBHOOK_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  INVALID_DATA = 'INVALID_DATA',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
}
