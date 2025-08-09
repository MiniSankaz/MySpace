// Script to create a local user for testing
// This creates a user in memory for login testing

import * as fs from 'fs';
import * as path from 'path';
import * as bcrypt from 'bcryptjs';

const USERS_FILE = path.join(process.cwd(), 'data', 'users.json');

interface User {
  id: string;
  email: string;
  username: string;
  passwordHash: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  isActive: boolean;
  createdAt: string;
}

async function createLocalUser() {
  console.log('Creating local user for testing...');
  
  // Ensure data directory exists
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  // Load existing users
  let users: User[] = [];
  if (fs.existsSync(USERS_FILE)) {
    const data = fs.readFileSync(USERS_FILE, 'utf-8');
    users = JSON.parse(data);
  }
  
  // Check if user already exists
  const existingUser = users.find(u => u.username === 'sankaz' || u.email === 'sankaz@example.com');
  if (existingUser) {
    console.log('User sankaz already exists!');
    return;
  }
  
  // Create new user
  const hashedPassword = await bcrypt.hash('sankaz123', 10);
  const newUser: User = {
    id: Math.random().toString(36).substring(7),
    email: 'sankaz@example.com',
    username: 'sankaz',
    passwordHash: hashedPassword,
    firstName: 'Sankaz',
    lastName: 'User',
    displayName: 'Sankaz',
    isActive: true,
    createdAt: new Date().toISOString(),
  };
  
  users.push(newUser);
  
  // Save users
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
  
  console.log('✅ Created local user successfully!');
  console.log('   Username: sankaz');
  console.log('   Email: sankaz@example.com');
  console.log('   Password: sankaz123');
  console.log('   File: data/users.json');
}

createLocalUser().catch(console.error);