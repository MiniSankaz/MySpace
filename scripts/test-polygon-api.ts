import axios from 'axios';

// Test different Polygon.io API authentication methods
async function testPolygonAPI() {
  // Test API key - you need to replace this with a real one
  const API_KEY = process.env.POLYGON_API_KEY || '454aeb0d-cdaf-4b25-838e-28d8cce05484';
  
  console.log('🔍 Testing Polygon.io API Authentication Methods\n');
  console.log('================================\n');
  
  // Stocks to test (found in our database)
  const symbols = ['AAPL', 'GOOGL'];
  
  // Method 1: Using Bearer token in header (current method)
  console.log('📌 Method 1: Bearer Token in Authorization Header');
  console.log('Format: Authorization: Bearer YOUR_API_KEY\n');
  
  for (const symbol of symbols) {
    try {
      console.log(`Testing ${symbol}...`);
      const response = await axios.get(
        `https://api.polygon.io/v2/aggs/ticker/${symbol}/prev`,
        {
          params: { adjusted: true },
          headers: {
            'Authorization': `Bearer ${API_KEY}`
          },
          timeout: 5000
        }
      );
      
      console.log(`✅ ${symbol}: Success!`);
      console.log(`   Price: $${response.data.results?.[0]?.c || 'N/A'}`);
      console.log(`   Volume: ${response.data.results?.[0]?.v || 'N/A'}\n`);
    } catch (error: any) {
      console.log(`❌ ${symbol}: Failed`);
      console.log(`   Error: ${error.response?.data?.error || error.message}`);
      console.log(`   Status: ${error.response?.status || 'N/A'}\n`);
    }
  }
  
  // Method 2: Using API key in query parameter
  console.log('📌 Method 2: API Key in Query Parameter');
  console.log('Format: ?apiKey=YOUR_API_KEY\n');
  
  for (const symbol of symbols) {
    try {
      console.log(`Testing ${symbol}...`);
      const response = await axios.get(
        `https://api.polygon.io/v2/aggs/ticker/${symbol}/prev`,
        {
          params: { 
            adjusted: true,
            apiKey: API_KEY
          },
          timeout: 5000
        }
      );
      
      console.log(`✅ ${symbol}: Success!`);
      console.log(`   Price: $${response.data.results?.[0]?.c || 'N/A'}`);
      console.log(`   Volume: ${response.data.results?.[0]?.v || 'N/A'}\n`);
    } catch (error: any) {
      console.log(`❌ ${symbol}: Failed`);
      console.log(`   Error: ${error.response?.data?.error || error.message}`);
      console.log(`   Status: ${error.response?.status || 'N/A'}\n`);
    }
  }
  
  // Method 3: Test different endpoints
  console.log('📌 Method 3: Testing Different Endpoints\n');
  
  const endpoints = [
    {
      name: 'Previous Close',
      url: `/v2/aggs/ticker/AAPL/prev`,
      params: { adjusted: true }
    },
    {
      name: 'Ticker Details',
      url: `/v3/reference/tickers/AAPL`,
      params: {}
    },
    {
      name: 'Last Trade',
      url: `/v2/last/trade/AAPL`,
      params: {}
    }
  ];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`Testing ${endpoint.name}...`);
      const response = await axios.get(
        `https://api.polygon.io${endpoint.url}`,
        {
          params: {
            ...endpoint.params,
            apiKey: API_KEY
          },
          timeout: 5000
        }
      );
      
      console.log(`✅ ${endpoint.name}: Success!`);
      console.log(`   Response keys: ${Object.keys(response.data).join(', ')}\n`);
    } catch (error: any) {
      console.log(`❌ ${endpoint.name}: Failed`);
      console.log(`   Error: ${error.response?.data?.error || error.response?.data?.message || error.message}`);
      console.log(`   Status: ${error.response?.status || 'N/A'}\n`);
    }
  }
  
  console.log('================================\n');
  console.log('📊 Summary:\n');
  console.log('1. Polygon.io supports both Bearer token and query parameter authentication');
  console.log('2. Free tier has rate limits (5 requests/minute)');
  console.log('3. You need a valid API key from https://polygon.io/dashboard/api-keys');
  console.log('4. The test API key is invalid - you need to get a real one\n');
  console.log('🔗 Sign up at: https://polygon.io/dashboard/signup\n');
}

// Run the test
testPolygonAPI().catch(console.error);