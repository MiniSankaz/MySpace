# คู่มือการตั้งค่า NextAuth

## 📋 สิ่งที่ต้องทำ

### 1. ตั้งค่า Environment Variables

เพิ่มค่าเหล่านี้ใน `.env.local`:

```bash
# การตั้งค่า NextAuth (บังคับ)
NEXTAUTH_URL=http://localhost:4110
NEXTAUTH_SECRET=คีย์ลับของคุณ

# OAuth Providers (ไม่บังคับ - ถ้าต้องการให้ login ด้วย Google, GitHub, Facebook)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_ID=
GITHUB_SECRET=
```

### 2. วิธีสร้าง NEXTAUTH_SECRET

#### วิธีที่ 1: ใช้ Script ที่เตรียมไว้ให้ (แนะนำ)

```bash
node scripts/generate-nextauth-secret.js
```

#### วิธีที่ 2: ใช้คำสั่ง OpenSSL

```bash
openssl rand -base64 32
```

#### วิธีที่ 3: ใช้ Node.js

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## 🔧 การตั้งค่าสำหรับ Production

### สำหรับ Vercel

1. ไปที่ Project Settings > Environment Variables
2. เพิ่ม:
   - `NEXTAUTH_URL` = `https://your-domain.com`
   - `NEXTAUTH_SECRET` = คีย์ลับใหม่ (อย่าใช้ตัวเดียวกับ development)

### สำหรับ DigitalOcean App Platform

1. ไปที่ App > Settings > Environment Variables
2. เพิ่มตัวแปรเดียวกับ Vercel

### สำหรับ Server ทั่วไป

1. ตั้งค่าใน `.env.production`
2. หรือตั้งค่าเป็น System Environment Variables

## 🔐 การเพิ่ม OAuth Login

### Google Login

1. ไปที่ https://console.cloud.google.com/
2. สร้าง Project ใหม่
3. เปิดใช้ Google+ API
4. สร้าง OAuth 2.0 credentials
5. เพิ่ม Redirect URI:
   - Development: `http://localhost:4110/api/auth/callback/google`
   - Production: `https://your-domain.com/api/auth/callback/google`
6. คัดลอก Client ID และ Secret มาใส่ใน .env.local

### GitHub Login

1. ไปที่ GitHub Settings > Developer settings
2. New OAuth App
3. กรอกข้อมูล:
   - Homepage URL: `http://localhost:4110`
   - Callback URL: `http://localhost:4110/api/auth/callback/github`
4. คัดลอก Client ID และ Secret

### Facebook Login

1. ไปที่ https://developers.facebook.com/
2. สร้าง App
3. เพิ่ม Facebook Login
4. ตั้งค่า Redirect URI

## 🚀 การใช้งานในโค้ด

### ตรวจสอบการ Login ใน Pages

```typescript
// ใน Server Component
import { getServerSession } from "next-auth";

export default async function Page() {
  const session = await getServerSession();

  if (!session) {
    // ยังไม่ได้ login
    redirect("/login");
  }

  // แสดงข้อมูลผู้ใช้
  return <div>สวัสดี {session.user.email}</div>;
}
```

### ตรวจสอบใน API Routes

```typescript
// app/api/protected/route.ts
import { getServerSession } from "next-auth";

export async function GET() {
  const session = await getServerSession();

  if (!session) {
    return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  }

  // ดำเนินการต่อ...
}
```

### ใน Client Components

```typescript
'use client';
import { useSession } from "next-auth/react";

export default function Component() {
  const { data: session } = useSession();

  if (!session) {
    return <div>กรุณาเข้าสู่ระบบ</div>;
  }

  return <div>สวัสดี {session.user.email}</div>;
}
```

## ⚠️ ข้อควรระวัง

1. **NEXTAUTH_SECRET**
   - ต้องเก็บเป็นความลับ ห้ามเปิดเผย
   - ใช้คนละตัวระหว่าง Dev และ Production
   - ไม่ควร commit ลง Git

2. **NEXTAUTH_URL**
   - Development: `http://localhost:4110`
   - Production: ใช้ domain จริง `https://your-domain.com`
   - ไม่ต้องมี / ต่อท้าย

3. **Database**
   - ตรวจสอบว่ามี User table ในฐานข้อมูล
   - ต้องมี field: id, email, passwordHash

## 🐛 แก้ปัญหาที่พบบ่อย

### ปัญหา: NEXTAUTH_URL is not set

✅ **วิธีแก้**:

- ตรวจสอบไฟล์ .env.local
- Restart server หลังแก้ไข

### ปัญหา: Google Login ไม่ทำงาน

✅ **วิธีแก้**:

- ตรวจสอบ Redirect URI ใน Google Console
- ตรวจสอบว่า Client ID และ Secret ถูกต้อง

### ปัญหา: Session หาย หลัง Refresh

✅ **วิธีแก้**:

- ตรวจสอบ NEXTAUTH_SECRET
- ตรวจสอบ cookie settings

## 📞 ติดต่อขอความช่วยเหลือ

หากพบปัญหา:

1. ดู Error log ใน Terminal
2. ตรวจสอบ Browser Console
3. ดูเอกสารที่ https://next-auth.js.org/

## ✅ Checklist

- [ ] สร้าง NEXTAUTH_SECRET แล้ว
- [ ] ตั้งค่า NEXTAUTH_URL แล้ว
- [ ] เพิ่มใน .env.local แล้ว
- [ ] Restart server แล้ว
- [ ] ทดสอบ Login แล้ว
- [ ] ตั้งค่า OAuth (ถ้าต้องการ)
- [ ] เตรียม Production environment
