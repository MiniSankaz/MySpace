# Database Setup - DigitalOcean PostgreSQL

## Connection Issue Resolution

### Current Status

- ✅ SSL CA certificate configured
- ❌ Connection timeout - IP whitelisting required

### Troubleshooting Steps

1. **Check IP Whitelisting** (Required)
   - Log into DigitalOcean Control Panel
   - Navigate to Databases → Your PostgreSQL cluster
   - Go to "Settings" → "Trusted Sources"
   - Add your current IP address or use `0.0.0.0/0` for development (not recommended for production)
   - Your current IP can be found at: https://whatismyipaddress.com/

2. **SSL Certificate Configuration**
   - CA certificate is located at: `/path/to/your/ca-certificate.crt`
   - Already configured in `.env` file

3. **Connection String Format**
   ```
   postgresql://[USERNAME]:[PASSWORD]@[HOST]:[PORT]/[DATABASE]?sslmode=require&sslcert=/path/to/ca-certificate.crt
   ```

### For Prisma

Once IP is whitelisted, the connection should work with:

```bash
# Test connection
npx prisma db push

# If still having issues, try:
NODE_TLS_REJECT_UNAUTHORIZED=0 npx prisma db push
```

### Environment Variables

Make sure your `.env` file has:

```env
DATABASE_URL="postgresql://[USERNAME]:[PASSWORD]@[HOST]:[PORT]/[DATABASE]?sslmode=require"
```

### Security Notes

- Never commit `.env` files to git
- Never commit actual credentials to version control
- Use environment variables for all sensitive information
- Keep database passwords in a secure password manager
- Rotate credentials regularly

### Getting Your Credentials

1. Log into DigitalOcean Control Panel
2. Navigate to your database cluster
3. Click on "Connection Details"
4. Copy the connection parameters
5. Store them securely in your `.env.local` file
