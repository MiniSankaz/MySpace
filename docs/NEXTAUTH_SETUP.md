# NextAuth Configuration Guide

## 1. Environment Variables ที่ต้องตั้งค่า

เพิ่มค่าเหล่านี้ใน `.env.local`:

```bash
# NextAuth Configuration
NEXTAUTH_URL=http://localhost:4000
NEXTAUTH_SECRET=your-secret-key-here

# OAuth Providers (Optional)
# Google
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# GitHub
GITHUB_ID=your-github-id
GITHUB_SECRET=your-github-secret

# Facebook
FACEBOOK_CLIENT_ID=your-facebook-client-id
FACEBOOK_CLIENT_SECRET=your-facebook-client-secret
```

## 2. วิธีสร้าง NEXTAUTH_SECRET

### Option 1: ใช้ OpenSSL (แนะนำ)
```bash
openssl rand -base64 32
```

### Option 2: ใช้ Node.js
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Option 3: ใช้ Online Generator
ไปที่ https://generate-secret.vercel.app/32

## 3. ตัวอย่างค่า Environment Variables

### Development (.env.local)
```bash
# NextAuth - Development
NEXTAUTH_URL=http://localhost:4000
NEXTAUTH_SECRET=xK9$mP2@nL5#qR8*vT4&bY7!wZ3^jF6%hN9$sD2@aE5#uC8*kM4@

# Optional: OAuth Providers
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

### Production (.env.production)
```bash
# NextAuth - Production
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=generate-new-secret-for-production

# Use environment variables from hosting provider
# Vercel, Netlify, etc. will set these automatically
```

## 4. การตั้งค่า OAuth Providers

### Google OAuth
1. ไปที่ [Google Cloud Console](https://console.cloud.google.com/)
2. สร้าง Project ใหม่หรือเลือก Project ที่มีอยู่
3. ไปที่ APIs & Services > Credentials
4. สร้าง OAuth 2.0 Client ID
5. เพิ่ม Authorized redirect URIs:
   - `http://localhost:4000/api/auth/callback/google` (Development)
   - `https://yourdomain.com/api/auth/callback/google` (Production)

### GitHub OAuth
1. ไปที่ GitHub Settings > Developer settings > OAuth Apps
2. คลิก "New OAuth App"
3. กรอกข้อมูล:
   - Application name: Your App Name
   - Homepage URL: `http://localhost:4000`
   - Authorization callback URL: `http://localhost:4000/api/auth/callback/github`
4. คัดลอก Client ID และ Client Secret

### Facebook OAuth
1. ไปที่ [Facebook Developers](https://developers.facebook.com/)
2. สร้าง App ใหม่
3. เพิ่ม Facebook Login product
4. ตั้งค่า Valid OAuth Redirect URIs:
   - `http://localhost:4000/api/auth/callback/facebook`

## 5. NextAuth Configuration File

สร้างไฟล์ `/src/lib/auth.ts`:

```typescript
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/core/database/prisma";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    // Email/Password Provider
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        });

        if (!user || !user.passwordHash) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        );

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.displayName || user.username,
        };
      }
    }),
    
    // OAuth Providers (Optional)
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET ? [
      GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      })
    ] : []),
    
    ...(process.env.GITHUB_ID && process.env.GITHUB_SECRET ? [
      GitHubProvider({
        clientId: process.env.GITHUB_ID,
        clientSecret: process.env.GITHUB_SECRET,
      })
    ] : []),
  ],
  
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  
  jwt: {
    secret: process.env.NEXTAUTH_SECRET,
  },
  
  pages: {
    signIn: "/login",
    signOut: "/login",
    error: "/login",
  },
  
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    
    async session({ session, token }) {
      if (session?.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  
  debug: process.env.NODE_ENV === "development",
};
```

## 6. การใช้งานในโปรเจค

### API Route Handler
```typescript
// app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
```

### ใน Server Components
```typescript
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function Page() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    // Not authenticated
    redirect("/login");
  }
  
  return <div>Welcome {session.user.email}</div>;
}
```

### ใน Client Components
```typescript
'use client';
import { useSession } from "next-auth/react";

export default function Component() {
  const { data: session, status } = useSession();
  
  if (status === "loading") {
    return <div>Loading...</div>;
  }
  
  if (status === "unauthenticated") {
    return <div>Not logged in</div>;
  }
  
  return <div>Welcome {session?.user?.email}</div>;
}
```

## 7. Security Best Practices

1. **NEXTAUTH_SECRET**
   - ใช้ค่าที่แตกต่างกันระหว่าง Development และ Production
   - ไม่ควร commit ลง Git
   - ใช้ environment variables จาก hosting provider

2. **NEXTAUTH_URL**
   - Development: `http://localhost:4000`
   - Production: ใช้ domain จริง `https://yourdomain.com`
   - ไม่ต้องใส่ trailing slash

3. **Database**
   - ใช้ SSL connection สำหรับ Production
   - Regular backup
   - ใช้ connection pooling

4. **Session Security**
   - ตั้ง secure cookies สำหรับ Production
   - ใช้ HTTPS เท่านั้นใน Production
   - ตั้ง session timeout ที่เหมาะสม

## 8. Troubleshooting

### Error: `NEXTAUTH_URL` is not set
- ตรวจสอบว่าตั้งค่า NEXTAUTH_URL ใน .env.local
- Restart development server หลังแก้ไข .env

### Error: `[next-auth][error][CLIENT_FETCH_ERROR]`
- ตรวจสอบว่า NEXTAUTH_URL ตรงกับ URL ที่ใช้จริง
- ตรวจสอบ network และ firewall settings

### OAuth Provider Errors
- ตรวจสอบ redirect URIs ใน provider console
- ตรวจสอบ Client ID และ Secret
- ตรวจสอบว่า provider app อยู่ใน production mode

## 9. Testing

```bash
# Test authentication flow
curl -X POST http://localhost:4000/api/auth/signin/credentials \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'

# Check session
curl http://localhost:4000/api/auth/session \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"
```

## 10. Migration from JWT to NextAuth

ถ้าระบบเดิมใช้ JWT:
1. NextAuth จะจัดการ session แทน JWT tokens
2. Update API endpoints ให้ใช้ `getServerSession`
3. Update client-side authentication checks
4. Migrate existing users (passwords ยังใช้ได้เหมือนเดิม)