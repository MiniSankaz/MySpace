# Authentication Standards & Cookie Naming Convention

## 🚨 CRITICAL: Cookie Naming Convention

### ✅ Correct Cookie Names
```javascript
// LOGIN/REGISTER sets these cookies:
accessToken   // JWT access token for API authentication
refreshToken  // JWT refresh token for token renewal

// DO NOT USE:
auth-token    // ❌ WRONG - This name is NOT used anywhere
authToken     // ❌ WRONG - Inconsistent with our standard
token         // ❌ WRONG - Too generic
```

## 📋 Case Study: 401 Unauthorized Loop Issue (2025-08-12)

### Problem Description
- **Symptom**: All API calls returning 401 Unauthorized despite user being logged in
- **Impact**: Infinite polling loops, Terminal creation failures, Git operations blocked
- **Root Cause**: Cookie name mismatch between Login API and other APIs

### Investigation Process
1. User reported 401 errors in Git API despite being logged in
2. Checked Login API → Sets cookie named `accessToken`
3. Checked Git/Terminal APIs → Looking for `auth-token` (wrong!)
4. Checked Middleware → Using `accessToken` (correct)
5. Found 20+ API endpoints using wrong cookie name

### Solution Applied
```javascript
// Before (WRONG):
const token = cookieStore.get('auth-token');

// After (CORRECT):
const token = cookieStore.get('accessToken');
```

### Files Affected (20 endpoints)
- `/api/workspace/git/*.ts` (10 files)
- `/api/workspace/git/stash/*.ts` (4 files)  
- `/api/terminal/*.ts` (4 files)
- `/api/workspace/sidebar/*.ts` (1 file)
- `/api/workspace/projects/*.ts` (1 file)

## 🔐 Authentication Flow Reference

### 1. Login/Register
```javascript
// src/app/api/ums/auth/login/route.ts
response.cookies.set('accessToken', token, {
  httpOnly: false,  // Client-side accessible
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: expiresIn
});

response.cookies.set('refreshToken', refreshToken, {
  httpOnly: true,   // Server-side only
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60
});
```

### 2. API Authentication
```javascript
// Any API route requiring authentication
import { cookies } from 'next/headers';

const cookieStore = await cookies();
const token = cookieStore.get('accessToken'); // ✅ CORRECT

// Also check Authorization header as fallback
const authHeader = request.headers.get('authorization');
const bearerToken = authHeader?.replace('Bearer ', '');

const finalToken = token?.value || bearerToken;
```

### 3. Middleware Authentication
```javascript
// src/middleware.ts
const token = request.cookies.get('accessToken')?.value || 
              request.headers.get('authorization')?.replace('Bearer ', '');
```

## 🛡️ Prevention Guidelines

### For All Agents
1. **ALWAYS** check this document before implementing authentication
2. **NEVER** assume cookie names - verify with Login API
3. **USE** consistent naming across all endpoints
4. **TEST** authentication flow end-to-end

### Code Review Checklist
- [ ] Uses `accessToken` for cookie name
- [ ] Includes Authorization header fallback
- [ ] Handles both cookie and header authentication
- [ ] Returns proper 401 status when unauthenticated
- [ ] Does NOT create authentication loops

### Common Mistakes to Avoid
1. ❌ Using `auth-token` instead of `accessToken`
2. ❌ Not checking Authorization header as fallback
3. ❌ Hardcoding token names without checking Login API
4. ❌ Creating new cookie names without updating all APIs

## 📝 Standard API Authentication Template

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    // Get auth token - MUST use 'accessToken'
    const cookieStore = await cookies();
    const token = cookieStore.get('accessToken');
    
    if (!token) {
      // Check Authorization header as fallback
      const authHeader = request.headers.get('authorization');
      if (!authHeader) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
      // Continue with bearer token
    }
    
    // Your API logic here
    
  } catch (error) {
    console.error('[API Name] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

## 🚨 Alert for Future Development

**CRITICAL**: Before creating any new authenticated API endpoint:
1. Read this document completely
2. Copy the template above
3. Use `accessToken` as cookie name
4. Test with actual login flow

## 📊 Impact of Wrong Cookie Names

### What Happens When Cookie Names Don't Match:
1. **401 Unauthorized** on every API call
2. **Infinite retry loops** as components try to recover
3. **Rate limiting triggers** from excessive retries
4. **User confusion** - logged in but nothing works
5. **System overload** from continuous failed requests

### Cost of This Issue:
- **Debug time**: 2+ hours to identify root cause
- **Files affected**: 20+ API endpoints
- **User impact**: Complete system unusable
- **Performance**: Server overload from retry loops

## 🔍 How to Debug Authentication Issues

### Quick Checks:
1. **Browser DevTools > Application > Cookies**
   - Look for `accessToken` cookie
   - Check if it exists and hasn't expired

2. **Network Tab**
   - Check request headers for Cookie field
   - Verify `accessToken` is being sent

3. **Server Logs**
   - Look for "No accessToken cookie found"
   - Check for "Unauthorized" responses

### Debug Commands:
```javascript
// In browser console
document.cookie.split(';').find(c => c.includes('accessToken'))

// In API route
console.log('Cookies:', cookieStore.getAll());
console.log('Auth Header:', request.headers.get('authorization'));
```

---

**Last Updated**: 2025-08-12
**Issue Reference**: Git API 401 Loop, Terminal Creation Failures
**Fixed By**: Authentication Cookie Name Standardization