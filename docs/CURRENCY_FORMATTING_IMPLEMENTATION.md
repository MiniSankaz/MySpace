# Thai Baht (THB) Currency Formatting Implementation

## Overview
Complete implementation of Thai Baht (฿) currency formatting for the Portfolio system, supporting both THB and USD with proper locale formatting and real-time conversion.

## Implementation Status: ✅ COMPLETE

### Files Created/Modified

#### 1. Frontend Utilities
- **`/src/utils/currency.ts`** - Core currency formatting utilities
  - `formatCurrency()` - Main formatting function with THB/USD support
  - `formatTHB()` / `formatUSD()` - Convenience functions
  - `convertCurrency()` - Exchange rate conversion
  - `formatThaiNumber()` - Thai locale number formatting
  - `parseCurrency()` - Parse formatted strings back to numbers
  - `formatCompactCurrency()` - Compact notation (฿1.5M, $2.5K)

#### 2. React Hooks
- **`/src/hooks/useCurrencyPreference.ts`** - User preference management
  - Stores currency preference in localStorage
  - Auto-detects based on browser locale
  - Provides context provider for global state

#### 3. UI Components
- **`/src/components/portfolio/CurrencyToggle.tsx`** - Currency switcher UI
  - Button variant: Simple toggle
  - Dropdown variant: Full menu with options
  - Switch variant: iOS-style toggle
  
- **`/src/components/portfolio/PortfolioValueCard.tsx`** - Example implementation
  - Shows proper currency formatting in action
  - Handles conversion between USD/THB
  - Displays both currencies when needed

#### 4. Backend Services
- **`/services/portfolio/src/services/currency.service.ts`** - Enhanced with:
  - Thai locale formatting
  - Proper ฿ symbol handling
  - Multiple API fallbacks for exchange rates
  
- **`/services/portfolio/src/routes/currency.routes.ts`** - New API endpoints:
  - `GET /api/v1/currency/rate` - Get exchange rates
  - `POST /api/v1/currency/convert` - Convert amounts
  - `POST /api/v1/currency/format` - Format for display
  - `GET /api/v1/currency/supported` - List supported currencies

#### 5. Updated Components
- **`/src/components/portfolio/portfolio-dashboard.tsx`** - Updated with:
  - Currency toggle in header
  - Dynamic formatting based on preference
  - Conversion for all monetary values

#### 6. Test Suite
- **`/src/utils/__tests__/currency.test.ts`** - Comprehensive tests
  - Unit tests for all utility functions
  - Integration tests for conversion workflows
  - Edge case handling

## Features Implemented

### ✅ Thai Baht Symbol (฿)
- Proper Thai Baht symbol instead of "THB"
- Consistent placement at the beginning of amounts
- Works with all formatting options

### ✅ Currency Toggle
- Switch between THB and USD instantly
- Remembers user preference
- Auto-detects based on browser locale (optional)

### ✅ Number Formatting
- Thai locale: `฿35,500.00`
- US locale: `$35,500.00`
- Compact format: `฿1.5M`, `$2.5K`
- Percentage with sign: `+15.50%`, `-3.25%`

### ✅ Real-time Conversion
- Current rate: 1 USD = 35.50 THB
- Automatic conversion for portfolio values
- Fallback rates when API unavailable
- Caching for performance

### ✅ Backend API
- RESTful endpoints for currency operations
- Exchange rate fetching with multiple providers
- Format validation and conversion
- Cache management

## Usage Examples

### Frontend Usage

```typescript
import { formatTHB, formatUSD, convertCurrency } from '@/utils/currency';
import { useCurrencyPreference } from '@/hooks/useCurrencyPreference';

// Format Thai Baht
formatTHB(35500); // "฿35,500.00"
formatTHB(1000, { showSign: true }); // "+฿1,000.00"
formatTHB(1500000, { compact: true }); // "฿1.5M"

// Convert and format
const usdAmount = 1000;
const thbAmount = convertCurrency(usdAmount, 'USD', 'THB'); // 35500
const formatted = formatTHB(thbAmount); // "฿35,500.00"

// Use in component
function MyComponent() {
  const { currency, toggleCurrency } = useCurrencyPreference();
  
  const value = 1000; // USD base
  const displayValue = currency === 'THB' 
    ? convertCurrency(value, 'USD', 'THB') 
    : value;
    
  return (
    <div>
      <span>{formatCurrency(displayValue, currency)}</span>
      <button onClick={toggleCurrency}>Toggle Currency</button>
    </div>
  );
}
```

### API Usage

```bash
# Get exchange rate
curl -X GET "http://localhost:4160/api/v1/currency/rate?from=USD&to=THB" \
  -H "x-user-id: test-user"

# Format currency
curl -X POST "http://localhost:4160/api/v1/currency/format" \
  -H "Content-Type: application/json" \
  -H "x-user-id: test-user" \
  -d '{"amount": 35500, "currency": "THB"}'

# Response: {"formatted": "฿35,500.00", "symbol": "฿"}
```

## Configuration

### Exchange Rates
Default rates in `/services/portfolio/src/services/currency.service.ts`:
```typescript
'USD_THB': 35.50,
'THB_USD': 0.0282,
```

### Supported Currencies
- THB - Thai Baht (฿)
- USD - US Dollar ($)
- EUR - Euro (€)
- GBP - British Pound (£)
- JPY - Japanese Yen (¥)
- And more...

### Environment Variables (Optional)
```env
EXCHANGE_RATE_API_KEY=your_api_key  # For real-time rates
FIXER_API_KEY=your_fixer_key        # Fallback provider
```

## Testing

Run the test suite:
```bash
npm test src/utils/__tests__/currency.test.ts
```

Test the API endpoints:
```bash
# Test exchange rate
curl http://localhost:4160/api/v1/currency/rate?from=USD&to=THB

# Test formatting
curl -X POST http://localhost:4160/api/v1/currency/format \
  -H "Content-Type: application/json" \
  -d '{"amount": 35500, "currency": "THB"}'
```

## Migration Guide

For existing components using old formatting:

### Before
```typescript
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
};

// Shows: $35,500.00
```

### After
```typescript
import { formatCurrency } from '@/utils/currency';
import { useCurrencyPreference } from '@/hooks/useCurrencyPreference';

const { currency } = useCurrencyPreference();

// Automatically shows ฿ or $ based on preference
formatCurrency(value, currency); // "฿35,500.00" or "$1,000.00"
```

## Performance Considerations

1. **Caching**: Exchange rates cached for 5 minutes
2. **LocalStorage**: Currency preference stored locally
3. **Memoization**: Use `useMemo` for conversion calculations
4. **Batch Operations**: Convert multiple values at once when possible

## Browser Support

- Modern browsers with Intl.NumberFormat support
- Fallback formatting for older browsers
- Tested on Chrome, Firefox, Safari, Edge

## Future Enhancements

1. **More Currencies**: Add support for other ASEAN currencies
2. **Historical Rates**: Track exchange rate history
3. **Custom Rates**: Allow users to set custom exchange rates
4. **Crypto Support**: Add cryptocurrency formatting
5. **Regional Settings**: Support more Thai-specific formats

## Troubleshooting

### Issue: Symbol not showing correctly
- Ensure UTF-8 encoding in HTML: `<meta charset="UTF-8">`
- Check font support for ฿ symbol

### Issue: Wrong exchange rate
- Check if API keys are configured
- Verify fallback rates are up to date
- Clear cache if needed: `currencyService.clearCache()`

### Issue: Formatting not updating
- Check localStorage for stored preferences
- Verify CurrencyProvider is wrapping components
- Clear browser cache and reload

## Contact

For issues or questions about the currency implementation, please refer to the portfolio service documentation or contact the development team.