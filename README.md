# CMS ERP System

Enterprise Content Management System with advanced User Management (UMS) and Permission Access Management (PAMS) modules.

## 🚀 Features

### Core Modules

- **UMS (User Management System)**
  - User registration and authentication
  - Profile management
  - Password policies and reset
  - Multi-factor authentication (MFA)
  - Session management
  - Account lockout protection

- **PAMS (Permission Access Management System)**
  - Role-based access control (RBAC)
  - Fine-grained permissions
  - Dynamic permission assignment
  - Role hierarchy

- **CMS (Content Management)**
  - Page management
  - Blog system
  - Media library
  - Form builder
  - Gallery system
  - SEO optimization

## 🛠️ Technology Stack

- **Frontend**: Next.js 15 with App Router, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js
- **Validation**: Zod
- **Security**: OWASP compliant, enterprise-grade security

## 📋 Prerequisites

- Node.js 18 or higher
- PostgreSQL 14 or higher
- npm or yarn

## 🔧 Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd CMS
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

```bash
cp .env.local.example .env.local
# Edit .env.local with your configuration
```

4. Set up the database:

```bash
# Make sure PostgreSQL is running
# Run the setup script
./scripts/setup-dev.sh
```

Or manually:

```bash
# Create database
createdb cms_db

# Push schema
npx prisma db push

# Generate Prisma client
npx prisma generate

# Seed database
npx prisma db seed
```

## 🚀 Development

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3100](http://localhost:3100) in your browser.

### Default Credentials

- **Email**: admin@example.com
- **Password**: Admin@123

## 📁 Project Structure

```
CMS/
├── src/
│   ├── app/              # Next.js App Router
│   ├── modules/          # Feature modules (UMS, PAMS, CMS)
│   ├── shared/           # Shared components and utilities
│   └── infrastructure/   # Core infrastructure (DB, Auth)
├── prisma/              # Database schema and migrations
├── tests/               # Test files
├── _sop/                # Standard Operating Procedures
└── _library/            # Reusable component library
```

## 🧪 Testing

Run tests:

```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:coverage
```

## 🔒 Security Features

- Password policies (complexity, history, expiration)
- Account lockout after failed attempts
- Multi-factor authentication (MFA)
- Session management with timeout
- Audit logging for all sensitive operations
- Input validation and sanitization
- SQL injection protection
- XSS protection
- CSRF protection
- Rate limiting
- GDPR/PDPA compliance ready

## 📝 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run test` - Run tests
- `npm run db:push` - Push database schema
- `npm run db:studio` - Open Prisma Studio
- `npm run db:seed` - Seed database

## 🚢 Deployment

1. Build the application:

```bash
npm run build
```

2. Set production environment variables
3. Run database migrations
4. Start the server:

```bash
npm start
```

## 📚 Documentation

- [API Documentation](./docs/api/README.md)
- [Architecture Guide](./docs/architecture/README.md)
- [Development SOPs](./_sop/README.md)

## 🤝 Contributing

Please read the [Development SOPs](./_sop/development/SOP-DEVELOPMENT-GUIDE.md) before contributing.

## 📄 License

This project is proprietary and confidential.
