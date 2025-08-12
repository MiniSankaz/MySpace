# Test Accounts & Credentials

## Admin Accounts

### Primary Admin
```
Email: sankaz@example.com
Username: sankaz
Password: Sankaz#3E25167B@2025
Role: Admin (Full access)
```

### Secondary Admin
```
Email: admin@example.com
Password: Admin@123
Role: Admin (Default admin)
```

## Test User Accounts

### Standard User
```
Email: user@example.com
Password: User@123
Role: User
```

### Test User
```
Email: test@personalai.com
Password: Test@123
Role: User
```

## API Keys (Reference .env.local)

### Claude API
```
ANTHROPIC_API_KEY=sk-ant-...
```

### Database Connection
```
DATABASE_URL=postgresql://user:pass@host:25060/dbname
```

### JWT Secrets
```
JWT_SECRET=your-jwt-secret
JWT_REFRESH_SECRET=your-refresh-secret
```

### NextAuth
```
NEXTAUTH_URL=http://localhost:4000
NEXTAUTH_SECRET=your-nextauth-secret
```

## Service URLs

### Development
```
Main App: http://localhost:4000
Terminal WS: ws://localhost:4001
Claude WS: ws://localhost:4002
Prisma Studio: http://localhost:5555
```

### Database
```
Host: db-postgresql-sgp1-xxxxx.ondigitalocean.com
Port: 25060
Database: defaultdb
SSL Mode: require
```

## Create New Test User

### Using Script
```bash
# Run sankaz setup script
tsx scripts/database/cleanup-and-setup-sankaz.ts

# Create admin manually
tsx scripts/create-admin.ts
```

### Manual SQL
```sql
INSERT INTO "User" (email, password, role, name)
VALUES ('test@example.com', 'hashed_password', 'USER', 'Test User');
```

## SSH/Server Access

### Development Server
```
Host: localhost
Port: 22
User: developer
Key: ~/.ssh/id_rsa
```

### Production Server
```
Host: [Contact DevOps]
Port: [Contact DevOps]
User: [Contact DevOps]
Key: [Contact DevOps]
```

## Third-party Services

### GitHub
```
Organization: [Your Org]
Repository: stock-portfolio-system
Branch: main, dev, feature/*
```

### Monitoring
```
Service: [TBD]
Dashboard: [TBD]
API Key: [TBD]
```

## Security Notes

1. **Never commit credentials** to git
2. **Use environment variables** for all secrets
3. **Rotate passwords** regularly
4. **Use different passwords** for each environment
5. **Enable 2FA** where possible
6. **Audit access logs** regularly