# Login System Test Credentials

The login system has been successfully set up with database authentication. The system checks username/password from the PostgreSQL database.

## System Architecture

### 1. Database Schema
- **User Table**: Stores user credentials with encrypted passwords
- **Session Table**: Manages user sessions
- **Role Table**: Defines user roles and permissions
- **LoginHistory Table**: Tracks login attempts

### 2. Authentication Flow

1. **Login Endpoint**: `/api/ums/auth/login`
   - Accepts username/email and password
   - Validates credentials against database
   - Returns JWT tokens on success

2. **Frontend Login Page**: `/login`
   - Clean, responsive login form
   - Handles authentication errors
   - Redirects to dashboard on success

### 3. Security Features
- Password hashing with bcrypt (12 rounds)
- JWT token-based authentication
- Session management
- Failed login attempt tracking
- Account lockout after 5 failed attempts
- IP address and user agent logging

## Test User Credentials

To test the login system, you can create users with the following SQL commands or use the seed script:

### Sample Test Users:

1. **Admin User**
   - Username: `admin`
   - Email: `admin@example.com`
   - Password: `Admin123!`

2. **Regular User 1**
   - Username: `johndoe`
   - Email: `john.doe@example.com`
   - Password: `John123!`

3. **Regular User 2**
   - Username: `janesmith`
   - Email: `jane.smith@example.com`
   - Password: `Jane123!`

4. **Test User**
   - Username: `testuser`
   - Email: `test@example.com`
   - Password: `Test123!`

## How to Add Users to Database

### Option 1: Using the Seed Script

```bash
# Make sure database is connected
npx prisma db push

# Run the seed script
npx tsx scripts/database/seed-test-users.ts
```

### Option 2: Using the Registration API

You can register new users via the API:

```bash
curl -X POST http://localhost:4000/api/ums/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "username": "newuser",
    "password": "Password123!",
    "firstName": "New",
    "lastName": "User"
  }'
```

### Option 3: Direct Database Insert

If you have database access, you can manually insert users using a database client.

## Testing the Login

1. **Start the application**:
   ```bash
   npm run dev
   ```

2. **Navigate to login page**:
   ```
   http://localhost:4000/login
   ```

3. **Enter credentials**:
   - Use any of the test user credentials above
   - Click "Sign in"

4. **Successful login**:
   - You'll be redirected to `/dashboard`
   - Access token stored in localStorage
   - Refresh token stored as httpOnly cookie

## API Testing

Test the login API directly:

```bash
curl -X POST http://localhost:4000/api/ums/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "emailOrUsername": "admin",
    "password": "Admin123!"
  }'
```

## Features Implemented

✅ Database-based authentication
✅ Secure password storage (bcrypt)
✅ JWT token generation
✅ Session management
✅ Login form UI
✅ Error handling
✅ Account lockout protection
✅ Login history tracking
✅ Remember me functionality
✅ Responsive design

## File Locations

- **Login API**: `/src/app/api/ums/auth/login/route.ts`
- **Auth Service**: `/src/modules/ums/services/auth.service.ts`
- **Login Page**: `/src/app/login/page.tsx`
- **Login Form Component**: `/src/modules/ums/components/LoginForm.tsx`
- **Database Schema**: `/prisma/schema.prisma`
- **Test User Seed Script**: `/scripts/database/seed-test-users.ts`

## Troubleshooting

If you encounter database connection issues:

1. Check your `.env` file for correct `DATABASE_URL`
2. Ensure PostgreSQL is running
3. Run `npx prisma db push` to sync schema
4. Check database logs for connection errors

The login system is fully functional and ready for use!