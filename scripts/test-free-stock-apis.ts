import axios from 'axios';

// Test multiple free stock market APIs
async function testFreeStockAPIs() {
  console.log('🔍 Testing Free Stock Market APIs (No Credit Card Required)\n');
  console.log('==============================================================\n');
  
  const testSymbol = 'AAPL';
  
  // 1. Alpha Vantage - Free tier: 25 requests/day, 5 requests/minute
  console.log('📊 1. Alpha Vantage (25 requests/day free)');
  console.log('--------------------------------------------');
  try {
    const alphaVantageKey = 'demo'; // 'demo' key for testing
    const avResponse = await axios.get(
      `https://www.alphavantage.co/query`,
      {
        params: {
          function: 'GLOBAL_QUOTE',
          symbol: testSymbol,
          apikey: alphaVantageKey
        },
        timeout: 5000
      }
    );
    
    if (avResponse.data['Global Quote']) {
      const quote = avResponse.data['Global Quote'];
      console.log(`✅ Success! ${testSymbol}: $${quote['05. price']}`);
      console.log(`   Change: ${quote['09. change']} (${quote['10. change percent']})`);
      console.log(`   Volume: ${quote['06. volume']}`);
    } else {
      console.log(`⚠️ Response received but no quote data`);
      console.log(`   Note: May need to register for free API key at alphavantage.co`);
    }
  } catch (error: any) {
    console.log(`❌ Failed: ${error.message}`);
  }
  
  console.log('\n');
  
  // 2. Finnhub - Free tier: Unlimited API calls
  console.log('📊 2. Finnhub (Unlimited calls free tier)');
  console.log('------------------------------------------');
  try {
    // You need to register at finnhub.io for a free API key
    const finnhubKey = 'ct7nbm1r01qqj7t4cbt0ct7nbm1r01qqj7t4cbtg'; // Example key format
    const fhResponse = await axios.get(
      `https://finnhub.io/api/v1/quote`,
      {
        params: {
          symbol: testSymbol,
          token: finnhubKey
        },
        timeout: 5000
      }
    );
    
    if (fhResponse.data && fhResponse.data.c) {
      console.log(`✅ Success! ${testSymbol}: $${fhResponse.data.c}`);
      console.log(`   Change: ${fhResponse.data.d} (${fhResponse.data.dp}%)`);
      console.log(`   High: $${fhResponse.data.h}, Low: $${fhResponse.data.l}`);
    } else {
      console.log(`⚠️ No data - Register for free key at finnhub.io`);
    }
  } catch (error: any) {
    console.log(`❌ Failed: ${error.message}`);
    console.log(`   Note: Register for free API key at finnhub.io`);
  }
  
  console.log('\n');
  
  // 3. Twelve Data - Free tier: 800 requests/day
  console.log('📊 3. Twelve Data (800 requests/day free)');
  console.log('------------------------------------------');
  try {
    const twelveDataKey = 'demo'; // Use 'demo' for testing
    const tdResponse = await axios.get(
      `https://api.twelvedata.com/quote`,
      {
        params: {
          symbol: testSymbol,
          apikey: twelveDataKey
        },
        timeout: 5000
      }
    );
    
    if (tdResponse.data && tdResponse.data.price) {
      console.log(`✅ Success! ${testSymbol}: $${tdResponse.data.price}`);
      console.log(`   Change: ${tdResponse.data.change} (${tdResponse.data.percent_change}%)`);
      console.log(`   Volume: ${tdResponse.data.volume}`);
    } else {
      console.log(`⚠️ No data - Register for free key at twelvedata.com`);
    }
  } catch (error: any) {
    console.log(`❌ Failed: ${error.message}`);
    console.log(`   Note: Register for free API key at twelvedata.com`);
  }
  
  console.log('\n');
  
  // 4. Financial Modeling Prep - Free tier: 250 requests/day
  console.log('📊 4. Financial Modeling Prep (250 requests/day free)');
  console.log('------------------------------------------------------');
  try {
    // FMP requires registration for API key
    const fmpKey = 'demo'; // Use 'demo' for limited testing
    const fmpResponse = await axios.get(
      `https://financialmodelingprep.com/api/v3/quote/${testSymbol}`,
      {
        params: {
          apikey: fmpKey
        },
        timeout: 5000
      }
    );
    
    if (fmpResponse.data && fmpResponse.data.length > 0) {
      const quote = fmpResponse.data[0];
      console.log(`✅ Success! ${testSymbol}: $${quote.price}`);
      console.log(`   Change: ${quote.change} (${quote.changesPercentage}%)`);
      console.log(`   Volume: ${quote.volume}`);
    } else {
      console.log(`⚠️ No data - Register for free key at financialmodelingprep.com`);
    }
  } catch (error: any) {
    console.log(`❌ Failed: ${error.message}`);
    console.log(`   Note: Register for free API key at financialmodelingprep.com`);
  }
  
  console.log('\n');
  
  // 5. Yahoo Finance (via RapidAPI) - Unofficial but reliable
  console.log('📊 5. Yahoo Finance (Unofficial - No key needed)');
  console.log('-------------------------------------------------');
  try {
    // Using Yahoo Finance v8 API endpoint (no key required)
    const yfResponse = await axios.get(
      `https://query1.finance.yahoo.com/v8/finance/chart/${testSymbol}`,
      {
        timeout: 5000,
        headers: {
          'User-Agent': 'Mozilla/5.0'
        }
      }
    );
    
    if (yfResponse.data && yfResponse.data.chart && yfResponse.data.chart.result) {
      const result = yfResponse.data.chart.result[0];
      const meta = result.meta;
      const price = meta.regularMarketPrice;
      const previousClose = meta.previousClose;
      const change = price - previousClose;
      const changePercent = (change / previousClose * 100).toFixed(2);
      
      console.log(`✅ Success! ${testSymbol}: $${price}`);
      console.log(`   Change: ${change.toFixed(2)} (${changePercent}%)`);
      console.log(`   Volume: ${meta.regularMarketVolume}`);
      console.log(`   🎯 No API key required!`);
    }
  } catch (error: any) {
    console.log(`❌ Failed: ${error.message}`);
  }
  
  console.log('\n');
  
  // 6. IEX Cloud - Free tier: 50,000 messages/month
  console.log('📊 6. IEX Cloud (50,000 messages/month free)');
  console.log('---------------------------------------------');
  try {
    // IEX provides sandbox for testing
    const iexToken = 'pk_test_123456789'; // Sandbox token format
    const iexResponse = await axios.get(
      `https://sandbox.iexapis.com/stable/stock/${testSymbol}/quote`,
      {
        params: {
          token: iexToken
        },
        timeout: 5000
      }
    );
    
    if (iexResponse.data) {
      console.log(`✅ Success! ${testSymbol}: $${iexResponse.data.latestPrice}`);
      console.log(`   Change: ${iexResponse.data.change} (${iexResponse.data.changePercent}%)`);
      console.log(`   Volume: ${iexResponse.data.volume}`);
    }
  } catch (error: any) {
    console.log(`❌ Failed: ${error.message}`);
    console.log(`   Note: Register for free sandbox key at iexcloud.io`);
  }
  
  console.log('\n==============================================================\n');
  console.log('📋 Summary of Free Stock Market APIs:\n');
  console.log('1. 🏆 Yahoo Finance - NO KEY NEEDED, unlimited requests');
  console.log('2. Alpha Vantage - 25 requests/day, real-time data');
  console.log('3. Finnhub - Unlimited calls, comprehensive data');
  console.log('4. Twelve Data - 800 requests/day, WebSocket support');
  console.log('5. Financial Modeling Prep - 250 requests/day');
  console.log('6. IEX Cloud - 50,000 messages/month');
  console.log('7. Polygon.io - 5 requests/minute (your current)');
  
  console.log('\n💡 Recommendations:');
  console.log('• For unlimited free: Use Yahoo Finance (unofficial but reliable)');
  console.log('• For official API: Finnhub (unlimited) or Alpha Vantage (limited but good)');
  console.log('• For real-time WebSocket: Twelve Data or keep Polygon.io');
  console.log('\n🔗 Register for free keys at:');
  console.log('• alphavantage.co/support/#api-key');
  console.log('• finnhub.io/register');
  console.log('• twelvedata.com/apikey');
  console.log('• financialmodelingprep.com/developer/docs');
}

// Run tests
testFreeStockAPIs().catch(console.error);