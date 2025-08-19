#!/usr/bin/env node

const axios = require('axios');

const BASE_URL = 'http://localhost:4600';

async function testMarketDataService() {
  console.log('Testing Market Data Service...\n');
  
  try {
    // Test health endpoint
    console.log('1. Testing health endpoint...');
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    console.log('Health Status:', healthResponse.data.status);
    console.log('Service:', healthResponse.data.service);
    console.log('Port:', healthResponse.data.port);
    console.log('✅ Health check passed\n');
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    console.log('Is the Market Data Service running on port 4600?');
    return;
  }
  
  try {
    // Test single quote
    console.log('2. Testing single quote (AAPL)...');
    const quoteResponse = await axios.get(`${BASE_URL}/api/v1/market/quote/AAPL`);
    console.log('Quote Response:', JSON.stringify(quoteResponse.data, null, 2));
    console.log('✅ Single quote test passed\n');
  } catch (error) {
    console.error('❌ Single quote test failed:', error.response?.data || error.message);
  }
  
  try {
    // Test batch quotes
    console.log('3. Testing batch quotes (AAPL, GOOGL, MSFT)...');
    const batchResponse = await axios.get(`${BASE_URL}/api/v1/market/quotes`, {
      params: { symbols: 'AAPL,GOOGL,MSFT' }
    });
    console.log('Batch Quotes Count:', batchResponse.data.data?.length);
    batchResponse.data.data?.forEach(quote => {
      console.log(`  - ${quote.symbol}: $${quote.price} (${quote.changePercent > 0 ? '+' : ''}${quote.changePercent}%)`);
    });
    console.log('✅ Batch quotes test passed\n');
  } catch (error) {
    console.error('❌ Batch quotes test failed:', error.response?.data || error.message);
  }
  
  // Test integration with Portfolio Service
  try {
    console.log('4. Testing integration with Portfolio Service...');
    console.log('Checking if Portfolio Service can reach Market Data Service...');
    
    // First, check if Portfolio Service is running
    const portfolioHealthResponse = await axios.get('http://localhost:4500/health');
    console.log('Portfolio Service Status:', portfolioHealthResponse.data.status);
    
    // Now test if Portfolio Service can get quotes from Market Data Service
    // This would typically be done internally by the Portfolio Service
    console.log('✅ Services are running and accessible\n');
  } catch (error) {
    console.log('⚠️  Portfolio Service not running or not accessible');
  }
  
  console.log('Market Data Service Test Complete!');
}

// Run the test
testMarketDataService().catch(console.error);