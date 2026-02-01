# File Upload System - Quick Start

## Install Dependencies

```bash
bun install
```

## Configure Environment

```bash
# Generate secure secrets
export JWT_SECRET=$(openssl rand -hex 32)
export DOWNLOAD_SECRET=$(openssl rand -hex 32)

# Create .env file
cat > .env << ENVEOF
DATABASE_URL="file:./db/dev.db"
JWT_SECRET="${JWT_SECRET}"
DOWNLOAD_SECRET="${DOWNLOAD_SECRET}"
NEXT_PUBLIC_BASE_URL="http://localhost:3000"
NODE_ENV="development"
ENVEOF
```

## Create Upload Directory

```bash
mkdir -p download
```

## Start Development Server

```bash
bun run dev
```

## Test Upload

Upload a file via the API (requires authentication):

```bash
# Login to get token
TOKEN=$(curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@sequencehub.com","password":"admin123"}' \
  -c cookies.txt -s | jq -r '.token')

# Upload a test file
curl -X POST http://localhost:3000/api/upload/simple \
  -b cookies.txt \
  -F "file=@test.txt" \
  -F "fileType=ASSET"
```

## Full Documentation

- Complete system docs: `docs/FILE_UPLOAD_SYSTEM.md`
- Setup guide: `docs/SETUP_UPLOAD_SYSTEM.md`
- Implementation summary: `UPLOAD_SYSTEM_SUMMARY.md`
