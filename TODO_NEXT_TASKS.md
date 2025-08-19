# 📋 TODO - งานที่ต้องทำต่อ
*Last Updated: 2025-08-18*

## 🚀 Priority 1 - งานเร่งด่วน

### 1. Fix Market Data Service TypeScript Errors
- **Path**: `/services/market-data/`
- **Issues**: TypeScript compilation errors
- **Fix**: 
  - แก้ไข import paths จาก `@types/index` เป็น `../types/index`
  - แก้ไข bigint to number conversions
  - Remove unused imports
- **Status**: ⚠️ Ready but not running

### 2. Complete Frontend-Backend Integration
- **Tasks**:
  - [ ] เพิ่ม JWT token handling ใน Frontend
  - [ ] Update `api-client.ts` ให้ส่ง Authorization header
  - [ ] เพิ่ม token refresh logic
  - [ ] Handle authentication errors ใน UI
- **Files**: `/src/lib/api-client.ts`, `/src/hooks/useAuth.tsx`

## 📊 Priority 2 - Performance Dashboard

### 1. Portfolio Value Chart
- **Components ที่ต้องสร้าง**:
  - `PortfolioChart.tsx` - Line chart แสดงมูลค่า portfolio ตามเวลา
  - `PerformanceMetrics.tsx` - Cards แสดง ROI, Total Gain/Loss, Daily Change
  - `AssetAllocation.tsx` - Pie chart แสดงสัดส่วนการลงทุน
- **Libraries**: recharts หรือ chart.js
- **API**: ใช้ `/api/v1/portfolios/:id/snapshots`

### 2. Real-time Price Updates
- **Tasks**:
  - [ ] เชื่อมต่อ Polygon.io API ผ่าน Market Data Service
  - [ ] Implement WebSocket สำหรับ real-time prices
  - [ ] Update holdings values แบบ real-time
  - [ ] แสดง day change และ % change
- **Polygon.io Credentials**:
  ```
  API Key: 454aeb0d-cdaf-4b25-838e-28d8cce05484
  Secret: UD1Xi6n8rYbPhnv1V6U3N9jO5Hn5cHPA
  ```

## 🔧 Priority 3 - System Improvements

### 1. Background Jobs
- **Daily Snapshot Generation**:
  - สร้าง cron job รัน 00:00 ทุกวัน
  - บันทึก portfolio value ลง `portfolio_snapshots` table
  - คำนวณ daily change
- **Market Data Sync**:
  - Sync ราคาหุ้นทุก 5 นาที (market hours)
  - Update cache ใน Redis

### 2. Testing & Documentation
- **Unit Tests**:
  - [ ] Transaction Controller tests
  - [ ] Portfolio Service tests
  - [ ] Frontend component tests
- **Integration Tests**:
  - [ ] Full user flow testing
  - [ ] API endpoint testing
- **Documentation**:
  - [ ] API documentation (Swagger/OpenAPI)
  - [ ] User guide
  - [ ] Deployment guide

### 3. Production Readiness
- **Security**:
  - [ ] Setup rate limiting
  - [ ] Add request logging
  - [ ] Configure CORS properly
  - [ ] Secure environment variables
- **Performance**:
  - [ ] Add Redis caching
  - [ ] Implement pagination
  - [ ] Optimize database queries
  - [ ] Add indexes
- **Monitoring**:
  - [ ] Setup error tracking (Sentry)
  - [ ] Add performance monitoring
  - [ ] Configure alerts

## 📝 Nice to Have - Features เพิ่มเติม

1. **Advanced Analytics**:
   - Sharpe ratio calculation
   - Beta calculation
   - Correlation analysis
   - Risk metrics

2. **Trading Features**:
   - Limit orders
   - Stop loss
   - Trading alerts
   - Price notifications

3. **Export & Reports**:
   - Monthly statements
   - Tax reports
   - Performance reports
   - Custom date ranges

4. **Mobile App**:
   - React Native app
   - Push notifications
   - Biometric authentication

## 🛠️ Technical Debt

1. **Code Quality**:
   - [ ] Remove console.logs
   - [ ] Fix ESLint warnings
   - [ ] Remove unused dependencies
   - [ ] Update deprecated packages

2. **Database**:
   - [ ] Add proper indexes
   - [ ] Optimize queries
   - [ ] Add data validation constraints
   - [ ] Setup backup strategy

3. **Infrastructure**:
   - [ ] Dockerize all services
   - [ ] Setup CI/CD pipeline
   - [ ] Configure auto-scaling
   - [ ] Setup load balancer

## 📅 Timeline Estimate

- **Week 1** (19-25 Aug): Fix Market Data Service, Complete Frontend Integration
- **Week 2** (26 Aug - 1 Sep): Performance Dashboard, Real-time Updates
- **Week 3** (2-8 Sep): Testing, Documentation, Production Prep
- **Week 4** (9-15 Sep): Deployment, Monitoring Setup

## 🔑 Important Notes

1. **Database Connection**: ใช้ DigitalOcean PostgreSQL
   ```
   DATABASE_URL="postgresql://user:password@localhost:5432/database?sslmode=require"
   ```

2. **Services Status**:
   - Frontend (4100): ✅ Running
   - Gateway (4110): ✅ Running  
   - Portfolio (4160): ✅ Running
   - Market Data (4170): ⚠️ Ready but needs fixes

3. **Test Accounts**:
   - sankaz@example.com / Sankaz#CC13DC13@2025
   - test@personalai.com / Test@123

4. **Key Files**:
   - Development Plan: `/docs/development-plans/portfolio-transaction-performance-plan.md`
   - Technical Spec: `/docs/technical-specs/portfolio-transaction-technical-spec.md`
   - Task Assignments: `/docs/development-plans/portfolio-task-assignments.md`

---
**Priority Order**: 
1. Fix immediate issues (TypeScript, Integration)
2. Complete core features (Dashboard, Real-time)
3. Production preparation
4. Nice-to-have features