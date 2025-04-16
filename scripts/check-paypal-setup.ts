// scripts/check-paypal-setup.ts
// Run with: npx ts-node scripts/check-paypal-setup.ts

import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: '.env.local' });

const requiredVariables = [
  // Mode
  'NEXT_PUBLIC_PAYPAL_MODE',
  
  // Production credentials
  'NEXT_PUBLIC_PAYPAL_CLIENT_ID',
  'PAYPAL_CLIENT_SECRET',
  
  // Production plan IDs
  'NEXT_PUBLIC_PAYPAL_PLAN_PRO_MONTHLY',
  'NEXT_PUBLIC_PAYPAL_PLAN_PRO_YEARLY',
  'NEXT_PUBLIC_PAYPAL_PLAN_ENTERPRISE_MONTHLY',
  'NEXT_PUBLIC_PAYPAL_PLAN_ENTERPRISE_YEARLY',
  
  // Sandbox credentials
  'NEXT_PUBLIC_SANDBOX_PAYPAL_CLIENT_ID',
  'SANDBOX_PAYPAL_CLIENT_SECRET',
  
  // Sandbox plan IDs
  'NEXT_PUBLIC_SANDBOX_PAYPAL_PLAN_PRO_MONTHLY',
  'NEXT_PUBLIC_SANDBOX_PAYPAL_PLAN_PRO_YEARLY',
  'NEXT_PUBLIC_SANDBOX_PAYPAL_PLAN_ENTERPRISE_MONTHLY',
  'NEXT_PUBLIC_SANDBOX_PAYPAL_PLAN_ENTERPRISE_YEARLY',
];

function checkEnvironmentVariables() {
  console.log('Checking PayPal environment variables...\n');
  
  const missing: string[] = [];
  const empty: string[] = [];
  const present: string[] = [];
  
  requiredVariables.forEach(variable => {
    const value = process.env[variable];
    if (value === undefined) {
      missing.push(variable);
    } else if (value.trim() === '') {
      empty.push(variable);
    } else {
      present.push(variable);
    }
  });
  
  // Print summary
  console.log('=== SUMMARY ===');
  console.log(`Total variables checked: ${requiredVariables.length}`);
  console.log(`Present and filled: ${present.length}`);
  console.log(`Present but empty: ${empty.length}`);
  console.log(`Missing entirely: ${missing.length}`);
  
  // Current mode
  const mode = process.env.NEXT_PUBLIC_PAYPAL_MODE || 'production';
  console.log(`\nCurrent PayPal mode: ${mode}`);
  
  // Print details
  if (present.length > 0) {
    console.log('\n=== CORRECTLY CONFIGURED ===');
    present.forEach(variable => {
      const value = process.env[variable];
      // For security, truncate client secrets when printing
      if (variable.includes('SECRET')) {
        console.log(`✅ ${variable}: ${value?.substring(0, 5)}...`);
      } else {
        console.log(`✅ ${variable}: ${value}`);
      }
    });
  }
  
  if (empty.length > 0) {
    console.log('\n=== EMPTY VARIABLES ===');
    empty.forEach(variable => {
      console.log(`⚠️ ${variable}: <empty string>`);
    });
  }
  
  if (missing.length > 0) {
    console.log('\n=== MISSING VARIABLES ===');
    missing.forEach(variable => {
      console.log(`❌ ${variable}: <not defined>`);
    });
  }
  
  // Check active mode configuration
  console.log('\n=== ACTIVE MODE CHECK ===');
  if (mode === 'sandbox') {
    const hasClientId = process.env.NEXT_PUBLIC_SANDBOX_PAYPAL_CLIENT_ID && 
                        process.env.NEXT_PUBLIC_SANDBOX_PAYPAL_CLIENT_ID.trim() !== '';
    const hasPlanIds = process.env.NEXT_PUBLIC_SANDBOX_PAYPAL_PLAN_PRO_MONTHLY && 
                       process.env.NEXT_PUBLIC_SANDBOX_PAYPAL_PLAN_PRO_MONTHLY.trim() !== '';
    
    if (hasClientId && hasPlanIds) {
      console.log('✅ Sandbox mode is properly configured');
    } else {
      console.log('❌ Sandbox mode is MISSING required configuration:');
      if (!hasClientId) console.log('   - Missing sandbox client ID');
      if (!hasPlanIds) console.log('   - Missing sandbox plan IDs');
    }
  } else {
    // Production mode
    const hasClientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID && 
                        process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID.trim() !== '';
    const hasPlanIds = process.env.NEXT_PUBLIC_PAYPAL_PLAN_PRO_MONTHLY && 
                       process.env.NEXT_PUBLIC_PAYPAL_PLAN_PRO_MONTHLY.trim() !== '';
    
    if (hasClientId && hasPlanIds) {
      console.log('✅ Production mode is properly configured');
    } else {
      console.log('❌ Production mode is MISSING required configuration:');
      if (!hasClientId) console.log('   - Missing production client ID');
      if (!hasPlanIds) console.log('   - Missing production plan IDs');
    }
  }
  
  // Provide recommendations
  console.log('\n=== RECOMMENDATIONS ===');
  if (empty.length > 0 || missing.length > 0) {
    console.log('Please add the following to your .env.local file:');
    [...empty, ...missing].forEach(variable => {
      console.log(`${variable}=YOUR_VALUE_HERE`);
    });
    
    // Specific hint for sandbox plan IDs
    if (empty.includes('NEXT_PUBLIC_SANDBOX_PAYPAL_PLAN_PRO_MONTHLY') || 
        missing.includes('NEXT_PUBLIC_SANDBOX_PAYPAL_PLAN_PRO_MONTHLY')) {
      console.log('\nTo get your sandbox plan IDs:');
      console.log('1. Log in to the PayPal Developer Dashboard: https://developer.paypal.com/dashboard/');
      console.log('2. Navigate to "My Apps & Credentials" and select your sandbox app');
      console.log('3. Go to "Products" and then "Subscriptions"');
      console.log('4. Create subscription plans for each tier and billing cycle');
      console.log('5. Copy the plan IDs into your .env.local file');
    }
  } else {
    console.log('Your PayPal configuration looks good!');
  }
}

// Run the check
checkEnvironmentVariables();