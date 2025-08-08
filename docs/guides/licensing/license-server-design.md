# Online License Server Design

## System Architecture

```
┌─────────────────┐     HTTPS      ┌──────────────────┐
│   CMS Client    │ ◄────────────► │  License Server  │
│  (Customer)     │                 │   (Your Cloud)   │
└─────────────────┘                 └──────────────────┘
                                            │
                                            ▼
                                    ┌──────────────────┐
                                    │    Database      │
                                    │  (PostgreSQL)    │
                                    └──────────────────┘
```

## Database Schema

### 1. Products Table

```sql
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  version VARCHAR(20) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 2. Customers Table

```sql
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  company_name VARCHAR(255),
  contact_name VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  country VARCHAR(2),
  tax_id VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 3. License Types Table

```sql
CREATE TABLE license_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  max_domains INTEGER DEFAULT 1,
  max_users INTEGER DEFAULT NULL,
  features JSONB DEFAULT '{}',
  duration_days INTEGER DEFAULT 365,
  price DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 4. Licenses Table

```sql
CREATE TABLE licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_key VARCHAR(19) UNIQUE NOT NULL, -- XXXX-XXXX-XXXX-XXXX
  product_id UUID REFERENCES products(id),
  customer_id UUID REFERENCES customers(id),
  license_type_id UUID REFERENCES license_types(id),
  status VARCHAR(20) DEFAULT 'inactive', -- inactive, active, suspended, expired
  issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  activated_at TIMESTAMP,
  expires_at TIMESTAMP,
  last_check_at TIMESTAMP,
  max_activations INTEGER DEFAULT 1,
  current_activations INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 5. Activations Table

```sql
CREATE TABLE activations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id UUID REFERENCES licenses(id),
  domain VARCHAR(255) NOT NULL,
  ip_address INET,
  machine_id VARCHAR(255),
  environment VARCHAR(50), -- production, staging, development
  activated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deactivated_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}'
);
```

### 6. License Checks Table

```sql
CREATE TABLE license_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id UUID REFERENCES licenses(id),
  activation_id UUID REFERENCES activations(id),
  ip_address INET,
  user_agent TEXT,
  status VARCHAR(20), -- valid, invalid, expired, suspended
  response_code INTEGER,
  checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB DEFAULT '{}'
);
```

### 7. Feature Flags Table

```sql
CREATE TABLE feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  default_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## API Endpoints

### 1. License Activation

```
POST /api/v1/licenses/activate
Headers:
  Content-Type: application/json
  X-License-Key: XXXX-XXXX-XXXX-XXXX

Body:
{
  "domain": "example.com",
  "ip": "203.150.xxx.xxx",
  "machine_id": "generated-unique-id",
  "environment": "production"
}

Response:
{
  "success": true,
  "activation_id": "uuid",
  "expires_at": "2025-08-04T10:00:00Z",
  "features": {
    "page_builder": true,
    "multi_language": true,
    "api_access": true,
    "max_users": 10
  }
}
```

### 2. License Validation

```
POST /api/v1/licenses/validate
Headers:
  Content-Type: application/json
  X-License-Key: XXXX-XXXX-XXXX-XXXX
  X-Activation-ID: uuid

Body:
{
  "domain": "example.com",
  "machine_id": "generated-unique-id"
}

Response:
{
  "valid": true,
  "status": "active",
  "expires_at": "2025-08-04T10:00:00Z",
  "days_remaining": 365,
  "features": {...}
}
```

### 3. License Deactivation

```
POST /api/v1/licenses/deactivate
Headers:
  Content-Type: application/json
  X-License-Key: XXXX-XXXX-XXXX-XXXX
  X-Activation-ID: uuid

Response:
{
  "success": true,
  "message": "License deactivated successfully"
}
```

### 4. License Info

```
GET /api/v1/licenses/info
Headers:
  X-License-Key: XXXX-XXXX-XXXX-XXXX

Response:
{
  "license_key": "XXXX-XXXX-XXXX-XXXX",
  "product": "CMS-ERP",
  "customer": {
    "company": "Example Corp",
    "email": "admin@example.com"
  },
  "type": "multi_domain",
  "status": "active",
  "activations": [
    {
      "domain": "example.com",
      "activated_at": "2024-08-04T10:00:00Z",
      "is_active": true
    }
  ],
  "max_activations": 5,
  "current_activations": 1,
  "expires_at": "2025-08-04T10:00:00Z"
}
```

## License Key Generation Algorithm

```typescript
interface LicenseKeyComponents {
  productCode: string; // 2 chars
  customerCode: string; // 4 chars
  typeCode: string; // 2 chars
  random: string; // 6 chars
  checksum: string; // 2 chars
}

function generateLicenseKey(
  productId: string,
  customerId: string,
  licenseTypeId: string,
): string {
  // Generate components
  const components = {
    productCode: generateProductCode(productId),
    customerCode: generateCustomerCode(customerId),
    typeCode: generateTypeCode(licenseTypeId),
    random: generateRandomString(6),
    checksum: "",
  };

  // Calculate checksum
  const dataString = Object.values(components).join("");
  components.checksum = calculateChecksum(dataString);

  // Format as XXXX-XXXX-XXXX-XXXX
  const key =
    components.productCode +
    components.customerCode.substring(0, 2) +
    "-" +
    components.customerCode.substring(2, 4) +
    components.typeCode +
    components.random.substring(0, 2) +
    "-" +
    components.random.substring(2, 6) +
    "-" +
    components.checksum +
    generatePadding(2);

  return key.toUpperCase();
}
```

## Client Integration (CMS Side)

### 1. License Checker Service

```typescript
// services/license.service.ts
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

interface LicenseConfig {
  serverUrl: string;
  checkInterval: number; // hours
  offlineGracePeriod: number; // days
  cacheLocation: string;
}

class LicenseService {
  private config: LicenseConfig;
  private licenseKey: string;
  private activationId: string | null = null;
  private lastCheck: Date | null = null;
  private cachedFeatures: Record<string, any> = {};

  constructor(config: LicenseConfig) {
    this.config = config;
    this.licenseKey = process.env.LICENSE_KEY || "";
  }

  async initialize(): Promise<void> {
    // Check cached license first
    const cached = await this.loadCachedLicense();

    if (cached && this.isWithinGracePeriod(cached.lastCheck)) {
      this.activationId = cached.activationId;
      this.cachedFeatures = cached.features;
      this.lastCheck = new Date(cached.lastCheck);

      // Schedule background check
      this.scheduleBackgroundCheck();
      return;
    }

    // Perform activation
    await this.activate();
  }

  async activate(): Promise<void> {
    const domain = this.getCurrentDomain();
    const machineId = this.getMachineId();

    const response = await fetch(
      `${this.config.serverUrl}/api/v1/licenses/activate`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-License-Key": this.licenseKey,
        },
        body: JSON.stringify({
          domain,
          ip: await this.getPublicIP(),
          machine_id: machineId,
          environment: process.env.NODE_ENV,
        }),
      },
    );

    if (!response.ok) {
      throw new Error("License activation failed");
    }

    const data = await response.json();
    this.activationId = data.activation_id;
    this.cachedFeatures = data.features;
    this.lastCheck = new Date();

    await this.saveCachedLicense();
  }

  async validate(): Promise<boolean> {
    if (!this.activationId) {
      return false;
    }

    try {
      const response = await fetch(
        `${this.config.serverUrl}/api/v1/licenses/validate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-License-Key": this.licenseKey,
            "X-Activation-ID": this.activationId,
          },
          body: JSON.stringify({
            domain: this.getCurrentDomain(),
            machine_id: this.getMachineId(),
          }),
        },
      );

      const data = await response.json();

      if (data.valid) {
        this.cachedFeatures = data.features;
        this.lastCheck = new Date();
        await this.saveCachedLicense();
      }

      return data.valid;
    } catch (error) {
      // Check if within grace period for offline operation
      return this.isWithinGracePeriod(this.lastCheck);
    }
  }

  hasFeature(featureCode: string): boolean {
    return this.cachedFeatures[featureCode] === true;
  }

  getFeatureLimit(featureCode: string): number | null {
    return this.cachedFeatures[featureCode] || null;
  }

  private getMachineId(): string {
    // Generate unique machine ID based on hardware
    const cpus = require("os").cpus();
    const networkInterfaces = require("os").networkInterfaces();

    const data = JSON.stringify({
      cpus: cpus.map((cpu) => cpu.model),
      network: Object.keys(networkInterfaces),
    });

    return crypto.createHash("sha256").update(data).digest("hex");
  }

  private getCurrentDomain(): string {
    return (
      process.env.NEXT_PUBLIC_SITE_URL?.replace(/https?:\/\//, "") ||
      "localhost"
    );
  }

  private async getPublicIP(): Promise<string> {
    try {
      const response = await fetch("https://api.ipify.org?format=json");
      const data = await response.json();
      return data.ip;
    } catch {
      return "unknown";
    }
  }

  private isWithinGracePeriod(lastCheck: Date | null): boolean {
    if (!lastCheck) return false;

    const daysSinceCheck =
      (Date.now() - lastCheck.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceCheck <= this.config.offlineGracePeriod;
  }

  private async saveCachedLicense(): Promise<void> {
    const cache = {
      activationId: this.activationId,
      features: this.cachedFeatures,
      lastCheck: this.lastCheck?.toISOString(),
      licenseKey: this.encryptData(this.licenseKey),
    };

    // Save to encrypted file or database
    await prisma.systemConfig.upsert({
      where: { key: "license_cache" },
      update: { value: this.encryptData(JSON.stringify(cache)) },
      create: {
        key: "license_cache",
        value: this.encryptData(JSON.stringify(cache)),
        description: "Cached license data",
      },
    });
  }

  private async loadCachedLicense(): Promise<any> {
    const config = await prisma.systemConfig.findUnique({
      where: { key: "license_cache" },
    });

    if (!config) return null;

    try {
      const decrypted = this.decryptData(config.value);
      return JSON.parse(decrypted);
    } catch {
      return null;
    }
  }

  private encryptData(data: string): string {
    const cipher = crypto.createCipher(
      "aes-256-cbc",
      process.env.ENCRYPTION_KEY!,
    );
    return cipher.update(data, "utf8", "hex") + cipher.final("hex");
  }

  private decryptData(data: string): string {
    const decipher = crypto.createDecipher(
      "aes-256-cbc",
      process.env.ENCRYPTION_KEY!,
    );
    return decipher.update(data, "hex", "utf8") + decipher.final("utf8");
  }

  private scheduleBackgroundCheck(): void {
    setTimeout(
      async () => {
        await this.validate();
        this.scheduleBackgroundCheck();
      },
      this.config.checkInterval * 60 * 60 * 1000,
    );
  }
}

export const licenseService = new LicenseService({
  serverUrl: process.env.LICENSE_SERVER_URL || "https://license.yourdomain.com",
  checkInterval: 24, // hours
  offlineGracePeriod: 7, // days
  cacheLocation: "/tmp/license.cache",
});
```

### 2. Middleware Integration

```typescript
// middleware/license.middleware.ts
import { NextRequest, NextResponse } from "next/server";
import { licenseService } from "@/services/license.service";

export async function licenseMiddleware(request: NextRequest) {
  // Skip license check for public routes
  const publicPaths = ["/api/health", "/api/license/callback"];
  if (publicPaths.some((path) => request.nextUrl.pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Check license validity
  const isValid = await licenseService.validate();

  if (!isValid) {
    return NextResponse.json(
      { error: "Invalid or expired license" },
      { status: 403 },
    );
  }

  // Check feature access
  const path = request.nextUrl.pathname;
  if (
    path.startsWith("/api/page-builder") &&
    !licenseService.hasFeature("page_builder")
  ) {
    return NextResponse.json(
      { error: "Page Builder feature not available in your license" },
      { status: 403 },
    );
  }

  return NextResponse.next();
}
```

## Admin Dashboard Features

### 1. License Management UI

- View all licenses
- Create new licenses
- Activate/Deactivate licenses
- View activation history
- Monitor usage statistics

### 2. Customer Management

- Customer profiles
- License history
- Support tickets
- Payment history

### 3. Analytics Dashboard

- Active licenses by type
- Geographic distribution
- Feature usage statistics
- Revenue reports

### 4. Automated Processes

- License expiry notifications
- Automatic suspension
- Usage alerts
- Compliance monitoring

## Security Considerations

### 1. API Security

- Rate limiting per license key
- IP whitelisting (optional)
- Request signing with HMAC
- SSL/TLS encryption

### 2. License Key Security

- Cryptographically secure generation
- Checksum validation
- Key rotation capability
- Blacklist management

### 3. Client Security

- Obfuscated license checking code
- Encrypted local cache
- Anti-tampering checks
- Secure communication

## Deployment Architecture

### 1. High Availability

```
                    ┌─────────────────┐
                    │   CloudFlare    │
                    │   (CDN + DDoS)  │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │  Load Balancer  │
                    │   (AWS ALB)     │
                    └────────┬────────┘
                             │
            ┌────────────────┼────────────────┐
            │                │                │
     ┌──────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐
     │   Server 1   │  │   Server 2   │  │   Server 3   │
     │  (Primary)   │  │  (Replica)   │  │  (Replica)   │
     └──────┬──────┘  └──────┬──────┘  └──────┬──────┘
            │                │                │
            └────────────────┼────────────────┘
                             │
                    ┌────────▼────────┐
                    │   PostgreSQL    │
                    │   (Primary)     │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │  Read Replicas  │
                    └─────────────────┘
```

### 2. Monitoring

- Health checks endpoint
- Prometheus metrics
- ELK stack for logs
- Alerting with PagerDuty

## Implementation Timeline

### Phase 1 (2 weeks)

- Basic license server
- Key generation
- Activation/Validation API

### Phase 2 (2 weeks)

- Client integration
- Offline grace period
- Feature flags

### Phase 3 (1 week)

- Admin dashboard
- Analytics
- Monitoring

### Phase 4 (1 week)

- Testing & optimization
- Documentation
- Deployment

## Cost Estimation

### Infrastructure (Monthly)

- VPS/Cloud servers: $100-200
- Database: $50-100
- CDN/DDoS protection: $20-50
- Monitoring: $30-50
- **Total**: ~$200-400/month

### Development

- Initial setup: 6 weeks
- Maintenance: 2-4 hours/week

This comprehensive license server design provides a robust foundation for protecting and monetizing your CMS product.
