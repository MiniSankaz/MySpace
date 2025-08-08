# Port Configuration Guide

This document explains how the CMS application handles port configuration and how to customize it.

## Default Port Configuration

The CMS application now uses **port 3100** by default instead of the typical Next.js port 3000.

## Environment Variables

### Core Port Configuration

```bash
# Main application port
PORT=3100

# Site URLs (automatically use PORT if not specified)
NEXT_PUBLIC_SITE_URL="http://localhost:3100"
NEXT_PUBLIC_API_URL="http://localhost:3100/api"
NEXT_PUBLIC_WEBSOCKET_URL="ws://localhost:3100"

# NextAuth URL
NEXTAUTH_URL="http://localhost:3100"

# WebSocket port (usually same as main port)
WEBSOCKET_PORT=3100
```

## How to Change the Port

### Option 1: Environment Variable

Set the `PORT` environment variable:

```bash
# For development
PORT=3200 npm run dev

# For production
PORT=3200 npm run start
```

### Option 2: Update .env Files

Edit `.env.local` or `.env`:

```bash
PORT=3200
NEXT_PUBLIC_SITE_URL="http://localhost:3200"
NEXT_PUBLIC_API_URL="http://localhost:3200/api"
NEXT_PUBLIC_WEBSOCKET_URL="ws://localhost:3200"
NEXTAUTH_URL="http://localhost:3200"
WEBSOCKET_PORT=3200
```

### Option 3: Package.json Scripts

The scripts automatically use the `PORT` environment variable with fallback to 3100:

```json
{
  "scripts": {
    "dev": "next dev -p ${PORT:-3100}",
    "start": "next start -p ${PORT:-3100}"
  }
}
```

## Docker Configuration

### Docker Compose

The `docker-compose.yml` is configured to expose port 3100:

```yaml
services:
  app:
    ports:
      - "3100:3100"
    environment:
      PORT: 3100
```

### Dockerfile

The Dockerfile exposes port 3100:

```dockerfile
EXPOSE 3100
ENV PORT 3100
```

## Files Updated

The following files have been updated to use port 3100 and environment variables:

### Environment Files

- `.env`
- `.env.local`
- `.env.example` (new)

### Configuration Files

- `package.json` - Scripts use `${PORT:-3100}`
- `next.config.js` - Runtime configuration
- `Dockerfile` - Expose port 3100
- `docker-compose.yml` - Port mapping

### Source Code

- `src/app/(public)/blog/[slug]/page.tsx` - Social sharing URLs
- `src/app/(public)/p/[slug]/page.tsx` - Schema.org URL

### Documentation

- `README.md`
- `docs/getting-started.md`
- `docs/api-reference.md`
- `docs/developer-guide.md`
- `IMPLEMENTATION_STATUS.md`

### Scripts

- `scripts/dev.sh` - Already using 3100
- `scripts/start.sh` - Already using 3100
- `scripts/docker.sh` - Already using 3100

## Verification

To verify the port configuration is working:

1. **Check environment loading**:

   ```bash
   node -e "console.log('PORT:', process.env.PORT || '3100')"
   ```

2. **Start development server**:

   ```bash
   npm run dev
   ```

   Should show: `Local: http://localhost:3100`

3. **Check all URLs are consistent**:
   - Frontend: http://localhost:3100
   - Admin: http://localhost:3100/admin
   - API: http://localhost:3100/api
   - WebSocket: ws://localhost:3100

## Troubleshooting

### Port Already in Use

If port 3100 is already in use:

```bash
# Use a different port
PORT=3101 npm run dev

# Or kill the process using port 3100
lsof -ti:3100 | xargs kill -9
```

### Environment Variables Not Loading

1. Ensure `.env.local` exists
2. Check file formatting (no spaces around `=`)
3. Restart the development server
4. Check `next.config.js` for proper configuration

### Docker Issues

```bash
# Rebuild containers with new port configuration
docker-compose down
docker-compose build --no-cache
docker-compose up
```

## Best Practices

1. **Always use environment variables** instead of hardcoded ports
2. **Keep all URLs consistent** across environment files
3. **Update documentation** when changing default ports
4. **Test both development and production** configurations
5. **Use the provided scripts** for consistent port handling
