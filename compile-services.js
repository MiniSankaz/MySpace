#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🔧 Compiling services with fixes...');

// Create a temporary tsconfig for compiling services
const tempTsConfig = {
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist/services",
    "rootDir": "./src/services",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node",
    "baseUrl": "./",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": [
    "src/services/**/*"
  ],
  "exclude": [
    "node_modules",
    "dist"
  ]
};

// Write temporary config
fs.writeFileSync('tsconfig.services.json', JSON.stringify(tempTsConfig, null, 2));

try {
  // Compile services
  execSync('npx tsc -p tsconfig.services.json', { stdio: 'inherit' });
  console.log('✅ Services compiled successfully');
  
  // Clean up
  fs.unlinkSync('tsconfig.services.json');
  
} catch (error) {
  console.error('❌ Failed to compile services:', error.message);
  
  // Clean up on error
  if (fs.existsSync('tsconfig.services.json')) {
    fs.unlinkSync('tsconfig.services.json');
  }
  
  process.exit(1);
}