# Getting Started

This guide will help you set up and run the CMS for the first time.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **PostgreSQL** (v14 or higher)
- **Git**
- **npm** or **yarn**

## Installation Steps

### 1. Clone the Repository

```bash
git clone [repository-url]
cd CMS
```

### 2. Install Dependencies

```bash
npm install
# or
yarn install
```

### 3. Environment Configuration

Create a `.env.local` file in the root directory:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your configuration:

```env
# Database Configuration
DATABASE_URL="postgresql://username:password@localhost:5432/cms_db"

# Authentication
NEXTAUTH_SECRET="generate-a-secure-random-string"
NEXTAUTH_URL="http://localhost:3100"

# Optional: Email Configuration
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
SMTP_FROM="noreply@yoursite.com"

# Optional: WebSocket Configuration
NEXT_PUBLIC_WEBSOCKET_URL="ws://localhost:3100"
```

### 4. Database Setup

Create the database:

```bash
createdb cms_db
```

Run Prisma migrations:

```bash
npx prisma generate
npx prisma db push
```

Seed the database (optional):

```bash
npx prisma db seed
```

### 5. Start the Development Server

```bash
npm run dev
# or
yarn dev
```

The application will be available at:

- Frontend: [http://localhost:3100](http://localhost:3100)
- Admin Panel: [http://localhost:3100/admin](http://localhost:3100/admin)

## First Time Setup

### 1. Create Admin User

Navigate to `/admin` and create your first admin account.

### 2. Configure Site Settings

1. Go to **Admin > Settings**
2. Set your site name, description, and default language
3. Configure email settings if needed

### 3. Set Up Theme

1. Go to **Admin > Theme**
2. Customize colors, typography, and layout
3. Save your theme configuration

### 4. Create Your First Page

1. Go to **Admin > Page Builder**
2. Click "Create New Page"
3. Use drag & drop to add components
4. Save and publish the page

## Project Structure

```
CMS/
├── src/
│   ├── app/              # Next.js app directory
│   ├── components/       # Shared components
│   ├── modules/          # Feature modules
│   └── lib/              # Utilities
├── public/               # Static assets
├── prisma/               # Database schema
├── docs/                 # Documentation
└── package.json
```

## Common Tasks

### Running in Production

```bash
npm run build
npm start
```

### Database Migrations

```bash
# Create a migration
npx prisma migrate dev --name migration-name

# Apply migrations
npx prisma migrate deploy
```

### Running Tests

```bash
npm test
```

### Linting

```bash
npm run lint
```

## Troubleshooting

### Database Connection Issues

1. Ensure PostgreSQL is running
2. Check DATABASE_URL in `.env.local`
3. Verify database exists: `psql -l`

### Port Already in Use

If port 3100 is in use:

```bash
PORT=3001 npm run dev
```

### Module Not Found Errors

Clear cache and reinstall:

```bash
rm -rf node_modules .next
npm install
```

## Next Steps

- Read the [Admin Guide](./admin-guide.md) to learn about managing content
- Check the [Developer Guide](./developer-guide.md) for customization
- Explore [Module Documentation](./modules/) for specific features
