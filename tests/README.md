# Test Directory Structure

## 📁 Organization (Updated: 2025-08-17)

All tests have been organized into a single `/tests` directory with clear categories:

### `/tests/unit/`

Unit tests for individual functions and components

- Currently: 0 files (to be created as needed)
- Naming: `*.test.ts` or `*.spec.ts`

### `/tests/integration/`

Integration tests for service interactions

- Currently: 1 file
- Tests inter-service communication

### `/tests/e2e/`

End-to-end tests for complete user flows

- Currently: 1 file
- Tests full application workflows

### `/tests/manual/`

Manual test scripts and utilities (20 files)

- `test-ai-*.js` - AI Assistant testing
- `test-terminal*.js` - Terminal service testing
- `test-claude*.js` - Claude integration testing
- `test-frontend*.js` - Frontend testing
- Other utility test scripts

## 🚀 Running Tests

```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Manual tests
node tests/manual/test-ai-assistant.js
node tests/manual/test-terminal.js
```

## 📝 Test Configuration

### Jest Configuration (`jest.config.js`)

```javascript
module.exports = {
  testMatch: [
    "**/tests/unit/**/*.test.ts",
    "**/tests/integration/**/*.test.ts",
  ],
  testPathIgnorePatterns: ["/node_modules/", "/tests/manual/", "/tests/e2e/"],
};
```

### E2E Configuration (Playwright/Cypress)

- Config file: `playwright.config.ts` or `cypress.config.ts`
- Test location: `/tests/e2e/`

## 🎯 Testing Strategy

1. **Unit Tests**: Test individual functions in isolation
2. **Integration Tests**: Test service interactions
3. **E2E Tests**: Test complete user journeys
4. **Manual Tests**: For development and debugging

## 📊 Coverage Goals

- Unit: 80% coverage
- Integration: Key workflows covered
- E2E: Critical user paths tested

## 🔧 Adding New Tests

1. **Unit Test**: Create in `/tests/unit/[module]/[feature].test.ts`
2. **Integration Test**: Create in `/tests/integration/[workflow].test.ts`
3. **E2E Test**: Create in `/tests/e2e/[user-journey].e2e.ts`
4. **Manual Test**: Create in `/tests/manual/test-[feature].js`
