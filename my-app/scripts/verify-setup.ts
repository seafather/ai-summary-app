#!/usr/bin/env node

/**
 * Quick verification script for Supabase setup
 * Run: npx tsx scripts/verify-setup.ts
 */

import { createClient } from '@supabase/supabase-js';

console.log('🔍 Verifying Supabase Setup...\n');

// Check environment variables
const requiredEnvVars = {
  'NEXT_PUBLIC_SUPABASE_URL': process.env.NEXT_PUBLIC_SUPABASE_URL,
  'NEXT_PUBLIC_SUPABASE_ANON_KEY': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  'SUPABASE_SERVICE_ROLE_KEY': process.env.SUPABASE_SERVICE_ROLE_KEY,
};

let hasErrors = false;

console.log('1️⃣ Environment Variables:');
for (const [key, value] of Object.entries(requiredEnvVars)) {
  if (!value) {
    console.log(`   ❌ ${key} is not set`);
    hasErrors = true;
  } else {
    const displayValue = value.substring(0, 20) + '...';
    console.log(`   ✅ ${key}: ${displayValue}`);
  }
}

if (hasErrors) {
  console.log('\n❌ Missing environment variables!');
  console.log('\n📝 Please create/update .env.local file with:');
  console.log('   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co');
  console.log('   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...');
  console.log('   SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...');
  process.exit(1);
}

// Test connection
console.log('\n2️⃣ Testing Connection:');
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function verifyConnection() {
  try {
    const { count, error } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.log('   ❌ Cannot connect to database');
      console.log('   Error:', error.message);
      return false;
    }
    
    console.log(`   ✅ Connected successfully`);
    console.log(`   ℹ️  Found ${count || 0} users in database`);
    return true;
  } catch (error: any) {
    console.log('   ❌ Connection failed:', error.message);
    return false;
  }
}

async function verifyTables() {
  console.log('\n3️⃣ Verifying Tables:');
  const requiredTables = [
    'users',
    'documents', 
    'summaries',
    'summary_view_history',
    'api_usage_logs'
  ];
  
  let allTablesExist = true;
  
  for (const table of requiredTables) {
    try {
      const { error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.log(`   ❌ Table '${table}' not found`);
        allTablesExist = false;
      } else {
        console.log(`   ✅ Table '${table}' exists`);
      }
    } catch (error) {
      console.log(`   ❌ Cannot access table '${table}'`);
      allTablesExist = false;
    }
  }
  
  if (!allTablesExist) {
    console.log('\n⚠️  Some tables are missing!');
    console.log('   Run the SQL setup script in Supabase Dashboard');
    console.log('   File: /database/supabase_setup.sql');
  }
  
  return allTablesExist;
}

async function verifyStorage() {
  console.log('\n4️⃣ Verifying Storage:');
  try {
    const { data, error } = await supabase
      .storage
      .listBuckets();
    
    if (error) {
      console.log('   ⚠️  Cannot access storage:', error.message);
      return false;
    }
    
    const documentsBucket = data.find(b => b.name === 'documents');
    if (!documentsBucket) {
      console.log('   ⚠️  Bucket "documents" not found');
      console.log('   Create it in Supabase Dashboard > Storage');
      return false;
    }
    
    console.log(`   ✅ Bucket 'documents' exists`);
    console.log(`   ℹ️  Public: ${documentsBucket.public ? 'Yes' : 'No (Private)'}`);
    return true;
  } catch (error: any) {
    console.log('   ⚠️  Storage check failed:', error.message);
    return false;
  }
}

async function main() {
  const connectionOk = await verifyConnection();
  if (!connectionOk) {
    console.log('\n❌ Setup verification failed');
    console.log('\n📚 Check the import guide: /database/IMPORT_GUIDE.md');
    process.exit(1);
  }
  
  const tablesOk = await verifyTables();
  const storageOk = await verifyStorage();
  
  console.log('\n' + '='.repeat(50));
  
  if (tablesOk && storageOk) {
    console.log('✅ All checks passed! Your Supabase is ready to use.');
    console.log('\n🚀 Next steps:');
    console.log('   1. Run: npm run dev');
    console.log('   2. Start building your app!');
  } else {
    console.log('⚠️  Some checks failed. See above for details.');
    console.log('\n📚 Refer to: /database/IMPORT_GUIDE.md');
  }
  
  console.log('='.repeat(50) + '\n');
}

main().catch(console.error);
