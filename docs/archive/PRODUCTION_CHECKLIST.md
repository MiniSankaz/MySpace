# 🚀 Production Deployment Checklist

## ✅ Pre-Deployment Checklist

### 1. Environment & Configuration

- [ ] Copy `.env.production.example` to `.env.production`
- [ ] Set all required environment variables
- [ ] Generate secure secrets for:
  - [ ] `NEXTAUTH_SECRET` (openssl rand -base64 32)
  - [ ] `JWT_SECRET` (openssl rand -base64 32)
  - [ ] `SESSION_SECRET` (openssl rand -base64 32)
- [ ] Configure production database URL with connection pooling
- [ ] Set `NODE_ENV=production`

### 2. Security

- [ ] Enable HTTPS/SSL certificate
- [ ] Configure CORS origins for production domain
- [ ] Set secure cookie settings
- [ ] Enable rate limiting
- [ ] Configure CSP headers
- [ ] Remove all console.log statements
- [ ] Disable source maps in production
- [ ] Scan for vulnerabilities: `npm audit`

### 3. Database

- [ ] Run database migrations: `npx prisma migrate deploy`
- [ ] Set up database backups
- [ ] Configure connection pooling
- [ ] Create indexes for performance
- [ ] Set up read replicas (if needed)

### 4. Performance

- [ ] Build for production: `npm run build`
- [ ] Enable image optimization
- [ ] Set up CDN for static assets
- [ ] Configure caching headers
- [ ] Enable gzip/brotli compression
- [ ] Minify CSS/JS bundles

### 5. Monitoring & Logging

- [ ] Set up error tracking (Sentry/Rollbar)
- [ ] Configure application monitoring (New Relic/Datadog)
- [ ] Set up centralized logging
- [ ] Configure health check endpoints
- [ ] Set up uptime monitoring

### 6. Testing

- [ ] Run all tests: `npm test`
- [ ] Run E2E tests: `npm run test:e2e`
- [ ] Test all API endpoints
- [ ] Load testing with expected traffic
- [ ] Security testing (OWASP Top 10)
- [ ] Cross-browser testing

## 📋 Deployment Steps

### Using Docker

```bash
# Build Docker image
docker build -t personal-assistant:latest .

# Run with Docker Compose
docker-compose -f docker-compose.production.yml up -d
```

### Using PM2

```bash
# Install PM2
npm install -g pm2

# Start application
pm2 start ecosystem.config.js --env production

# Save PM2 config
pm2 save
pm2 startup
```

### Using Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy to Vercel
vercel --prod
```

## 🔍 Post-Deployment Verification

### Health Checks

```bash
# Check application health
curl https://yourdomain.com/api/health

# Expected response:
{
  "status": "ok",
  "checks": {
    "server": { "status": "ok" },
    "database": { "status": "ok" },
    "memory": { "status": "ok" },
    "assistant": { "status": "ok" }
  }
}
```

### API Testing

```bash
# Test chat endpoint
curl -X POST https://yourdomain.com/api/assistant/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "help"}'

# Test rate limiting
for i in {1..100}; do
  curl -X POST https://yourdomain.com/api/assistant/chat \
    -H "Content-Type: application/json" \
    -d '{"message": "test"}'
done
```

### Performance Testing

```bash
# Load test with Apache Bench
ab -n 1000 -c 10 https://yourdomain.com/

# Load test with k6
k6 run load-test.js
```

## ⚠️ Critical Settings

### Required Environment Variables

```env
NODE_ENV=production
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=<generated>
JWT_SECRET=<generated>
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

### Recommended Security Headers

```javascript
// middleware.ts
{
  'Strict-Transport-Security': 'max-age=63072000',
  'X-Frame-Options': 'SAMEORIGIN',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
}
```

### Database Optimization

```sql
-- Add indexes for frequently queried columns
CREATE INDEX idx_assistant_conversation_userid ON "AssistantConversation"("userId");
CREATE INDEX idx_assistant_message_conversationid ON "AssistantMessage"("conversationId");
CREATE INDEX idx_assistant_task_userid_status ON "AssistantTask"("userId", "status");
```

## 🔥 Rollback Plan

### Quick Rollback Steps

1. Keep previous version backup
2. Database backup before migration
3. Environment variables backup
4. Use blue-green deployment if possible

### Rollback Commands

```bash
# Using PM2
pm2 reload ecosystem.config.js --update-env

# Using Docker
docker-compose down
docker-compose up -d --build

# Database rollback
npx prisma migrate resolve --rolled-back
```

## 📊 Monitoring Metrics

### Key Metrics to Track

- Response time (p50, p95, p99)
- Error rate (4xx, 5xx)
- Database query time
- Memory usage
- CPU usage
- Active connections
- Request rate
- Assistant API usage

### Alert Thresholds

- Response time > 1s (warning), > 3s (critical)
- Error rate > 1% (warning), > 5% (critical)
- Memory usage > 80% (warning), > 90% (critical)
- Database connections > 80% of pool (warning)

## 📞 Support & Maintenance

### Regular Maintenance Tasks

- [ ] Weekly: Review error logs
- [ ] Weekly: Check performance metrics
- [ ] Monthly: Security updates (`npm audit fix`)
- [ ] Monthly: Database optimization
- [ ] Quarterly: Dependency updates
- [ ] Quarterly: Security audit

### Emergency Contacts

- DevOps Team: [contact]
- Database Admin: [contact]
- Security Team: [contact]
- On-call Engineer: [contact]

## ✅ Sign-off

- [ ] Development Team Lead
- [ ] QA Team Lead
- [ ] Security Team
- [ ] DevOps Team
- [ ] Product Owner

---

**Last Updated**: December 2024
**Version**: 1.0.0
**Status**: Ready for Production
