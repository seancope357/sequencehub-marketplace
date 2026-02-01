# File Upload System - Quick Setup Guide

## Installation

### 1. Install Dependencies

```bash
bun install
```

This will install the new dependencies added to `package.json`:
- `@aws-sdk/client-s3` - S3-compatible client for R2
- `@aws-sdk/s3-request-presigner` - Presigned URL generation
- `fast-xml-parser` - XML parsing for XSQ metadata

### 2. Environment Configuration

Copy the example environment file and configure:

```bash
cp .env.example .env
```

**Required for Development:**
```bash
# Generate secure secrets
JWT_SECRET=$(openssl rand -hex 32)
DOWNLOAD_SECRET=$(openssl rand -hex 32)

# Add to .env
echo "JWT_SECRET=$JWT_SECRET" >> .env
echo "DOWNLOAD_SECRET=$DOWNLOAD_SECRET" >> .env
```

**Optional for Production (R2):**
```bash
# Add R2 credentials to .env
R2_ENDPOINT="https://[your-account-id].r2.cloudflarestorage.com"
R2_ACCESS_KEY_ID="your-key-id"
R2_SECRET_ACCESS_KEY="your-secret-key"
R2_BUCKET_NAME="sequencehub-files"
```

### 3. Database Setup

The upload system uses existing Prisma schema. No migrations needed.

```bash
bun run db:generate  # Generate Prisma client
bun run db:push      # Push schema to database
```

### 4. Create Upload Directory (Development)

For local storage (when R2 is not configured):

```bash
mkdir -p download
```

The system will automatically create subdirectories as needed.

## Testing the Upload System

### Test 1: Simple Upload

```bash
# Create a test file
echo "test data" > test.txt

# Upload via API (requires authentication)
curl -X POST http://localhost:3000/api/upload/simple \
  -H "Cookie: auth_token=YOUR_TOKEN" \
  -F "file=@test.txt" \
  -F "fileType=ASSET"
```

### Test 2: Multipart Upload

See client implementation example in `docs/FILE_UPLOAD_SYSTEM.md`

### Test 3: Metadata Extraction

Upload a real FSEQ file to test metadata extraction:

```bash
curl -X POST http://localhost:3000/api/upload/simple \
  -H "Cookie: auth_token=YOUR_TOKEN" \
  -F "file=@sequence.fseq" \
  -F "fileType=RENDERED"
```

Check response for extracted metadata:
- channelCount
- frameCount
- sequenceLength
- fps

## File Structure

```
src/
├── app/api/upload/
│   ├── initiate/route.ts    # Start multipart upload
│   ├── chunk/route.ts        # Upload chunks
│   ├── complete/route.ts     # Finalize upload
│   ├── simple/route.ts       # Direct upload
│   └── abort/route.ts        # Cancel upload
├── lib/
│   ├── upload/
│   │   ├── types.ts          # TypeScript types
│   │   ├── validation.ts     # File validation
│   │   ├── hash.ts           # Hashing utilities
│   │   ├── metadata.ts       # Metadata extraction
│   │   ├── session.ts        # Session management
│   │   └── index.ts          # Public API
│   └── storage/
│       ├── r2.ts             # R2 integration
│       ├── local.ts          # Local storage
│       └── index.ts          # Storage abstraction
docs/
├── FILE_UPLOAD_SYSTEM.md     # Full documentation
└── SETUP_UPLOAD_SYSTEM.md    # This file
```

## Security Checklist

Before deploying to production:

- [ ] Generate strong JWT_SECRET (32+ bytes)
- [ ] Generate strong DOWNLOAD_SECRET (32+ bytes)
- [ ] Configure R2 bucket with proper CORS
- [ ] Enable HTTPS in production
- [ ] Set up rate limiting on upload endpoints
- [ ] Configure file size limits appropriately
- [ ] Enable virus scanning (hook points ready)
- [ ] Review audit logs regularly
- [ ] Set up monitoring for security alerts

## Storage Backend Selection

The system automatically selects storage backend:

**Local Storage (Development):**
- Used when R2 credentials are NOT set
- Files stored in `/download` directory
- Signed URLs use local server

**R2 Storage (Production):**
- Used when R2 credentials ARE set
- Files stored in Cloudflare R2 bucket
- Presigned URLs for downloads

## Troubleshooting

### "Module not found" errors

```bash
# Regenerate Prisma client
bun run db:generate

# Clear cache and reinstall
rm -rf node_modules .next
bun install
```

### Upload fails with 500 error

1. Check logs in console
2. Verify authentication token is valid
3. Check AuditLog table for security alerts
4. Ensure upload directory exists (local) or R2 is configured

### R2 connection errors

1. Verify credentials in `.env`
2. Check R2 bucket exists: `wrangler r2 bucket list`
3. Test R2 connection with AWS CLI:
   ```bash
   aws s3 ls --endpoint-url $R2_ENDPOINT
   ```

### Metadata extraction fails

1. Verify file is valid FSEQ/XSQ format
2. Check file magic bytes match extension
3. Review error in audit logs
4. File will still upload, just without metadata

## Production Deployment

### Cloudflare R2 Setup

1. Create R2 bucket:
```bash
wrangler r2 bucket create sequencehub-files
```

2. Configure CORS (if needed for direct uploads):
```bash
wrangler r2 bucket cors put sequencehub-files --rules '[
  {
    "AllowedOrigins": ["https://yourdomain.com"],
    "AllowedMethods": ["PUT", "POST", "GET"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3000
  }
]'
```

3. Generate API tokens in Cloudflare dashboard:
   - Permissions: R2 Read + Write
   - Copy Access Key ID and Secret Access Key

4. Add to production `.env`

### Environment Variables Checklist

Production `.env` should have:

```bash
# Database (PostgreSQL in production)
DATABASE_URL="postgresql://..."

# Authentication
JWT_SECRET="[32-byte-hex]"
DOWNLOAD_SECRET="[32-byte-hex]"

# Stripe
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_live_..."

# R2 Storage
R2_ENDPOINT="https://[account].r2.cloudflarestorage.com"
R2_ACCESS_KEY_ID="[access-key]"
R2_SECRET_ACCESS_KEY="[secret-key]"
R2_BUCKET_NAME="sequencehub-files"

# Base URL
NEXT_PUBLIC_BASE_URL="https://yourdomain.com"

# Production mode
NODE_ENV="production"
```

## Monitoring

### Key Metrics to Monitor

1. **Upload Success Rate**
   - Query AuditLog for FILE_UPLOADED actions
   - Track failures vs successes

2. **Storage Usage**
   - Query ProductFile table: `SUM(fileSize)`
   - Monitor R2 bucket size

3. **Deduplication Savings**
   - Count files with `deduplicated: true`
   - Calculate storage saved

4. **Security Alerts**
   - Query AuditLog for SECURITY_ALERT
   - Set up alerts for suspicious patterns

### Example Monitoring Queries

```sql
-- Upload success rate (last 24 hours)
SELECT
  COUNT(*) as total_uploads,
  SUM(CASE WHEN action = 'FILE_UPLOADED' THEN 1 ELSE 0 END) as successful
FROM AuditLog
WHERE createdAt > datetime('now', '-1 day')
  AND entityType = 'product_file';

-- Storage usage by file type
SELECT
  fileType,
  COUNT(*) as count,
  SUM(fileSize) / 1024 / 1024 as size_mb
FROM ProductFile
GROUP BY fileType;

-- Security alerts
SELECT *
FROM AuditLog
WHERE action = 'SECURITY_ALERT'
ORDER BY createdAt DESC
LIMIT 100;
```

## Next Steps

1. Install dependencies: `bun install`
2. Configure environment: Copy and edit `.env`
3. Test with sample file
4. Integrate into product creation flow
5. Add frontend upload UI components
6. Set up monitoring
7. Deploy to production

## Support

For detailed API documentation, see `docs/FILE_UPLOAD_SYSTEM.md`

For security considerations, see `.claude/agents/security-guardian.md`

For xLights-specific features, see `.claude/agents/xlights-specialist.md`
