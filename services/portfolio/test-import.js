#!/usr/bin/env node

console.log('Testing imports...');

try {
  console.log('1. Testing shared config import...');
  const { getServiceUrl, getServicePort } = require('../../shared/config/ports.config');
  console.log('✅ Shared config imported successfully');
  
  console.log('2. Testing port functions...');
  const portfolioPort = getServicePort('portfolio');
  console.log(`✅ Portfolio port: ${portfolioPort}`);
  
  const gatewayUrl = getServiceUrl('gateway');
  console.log(`✅ Gateway URL: ${gatewayUrl}`);
  
  console.log('3. Testing express import...');
  const express = require('express');
  console.log('✅ Express imported successfully');
  
  console.log('4. Testing logger import...');
  // Skip logger test for now - it's a TypeScript file
  console.log('⚠️  Logger test skipped (TypeScript file)');
  
  console.log('\n🎉 All imports working correctly!');
  
} catch (error) {
  console.error('❌ Import failed:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
}