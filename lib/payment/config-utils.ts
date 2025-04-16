// lib/payment/config-utils.ts

/**
 * Payment mode configuration
 */
export function getPaymentMode(): 'production' | 'sandbox' {
    // Client-side safe way to access environment variables
    const paypalMode = process.env.NEXT_PUBLIC_PAYPAL_MODE;
    
    // Explicitly check for 'sandbox' - default to production for any other value
    return paypalMode?.trim() === 'sandbox' ? 'sandbox' : 'production';
  }
  
  /**
   * Get the appropriate PayPal client ID based on the mode
   */
  export function getPayPalClientId(mode: 'production' | 'sandbox'): string {
    return mode === 'sandbox'
      ? process.env.NEXT_PUBLIC_SANDBOX_PAYPAL_CLIENT_ID || ''
      : process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || '';
  }
  
  /**
   * Get the appropriate PayPal plan ID
   */
  export function getPayPalPlanId(
    planType: string, 
    billingCycle: 'monthly' | 'yearly', 
    mode: 'production' | 'sandbox'
  ): string {
    // Hard-coded fallback IDs for each plan and cycle
    const fallbackIds = {
      production: {
        pro: {
          monthly: 'P-40P68423NH785573DM7QOVOI',
          yearly: 'P-282460781D9985744M7QOWHI'
        },
        enterprise: {
          monthly: 'P-5DU62624BH0756710M7QOWVY',
          yearly: 'P-2E484680R6488271LM7QOXBI' 
        }
      },
      sandbox: {
        pro: {
          monthly: 'P-1PF41515VE727992DM7RVYMQ',
          yearly: 'P-6CB62664P1160430LM7RVYXQ'
        },
        enterprise: {
          monthly: 'P-5CJ32450KV4127732M7RVZBY',
          yearly: 'P-6TL51287K6264682EM7RVZLY'
        }
      }
    };
  
    // Direct access using string template
    let planId = '';
    const prefix = mode === 'sandbox' ? 'NEXT_PUBLIC_SANDBOX_PAYPAL_PLAN_' : 'NEXT_PUBLIC_PAYPAL_PLAN_';
    const planPrefix = planType.toUpperCase();
    const cyclePrefix = billingCycle.toUpperCase();
    const envVarName = `${prefix}${planPrefix}_${cyclePrefix}`;
    
    // Try to get from environment variable
    if (typeof process !== 'undefined' && process.env) {
      planId = process.env[envVarName] || '';
    }
    
    // If empty, use fallback
    if (!planId || planId.trim() === '') {
      try {
        // @ts-ignore - Dynamic access to nested object
        planId = fallbackIds[mode][planType][billingCycle] || '';
      } catch (e) {
        console.error('Could not find fallback plan ID', { mode, planType, billingCycle });
      }
    }
    
    console.log(`Looking up plan ID for ${planType} (${billingCycle}) in ${mode} mode`);
    console.log(`Using environment variable: ${envVarName}`);
    console.log(`Found plan ID: ${planId}`);
    
    return planId;
  }
  
  /**
   * Log all available environment variables for debugging (development only)
   */
  export function logEnvironmentVariables(): void {
    if (process.env.NODE_ENV !== 'production') {
      console.group('Payment Environment Variables');
      console.log('NEXT_PUBLIC_PAYPAL_MODE:', process.env.NEXT_PUBLIC_PAYPAL_MODE);
      console.log('Using Payment Mode:', getPaymentMode());
      
      // Client IDs
      console.log('NEXT_PUBLIC_PAYPAL_CLIENT_ID:', process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID);
      console.log('NEXT_PUBLIC_SANDBOX_PAYPAL_CLIENT_ID:', process.env.NEXT_PUBLIC_SANDBOX_PAYPAL_CLIENT_ID);
      
      // Plan IDs (Production)
      console.log('NEXT_PUBLIC_PAYPAL_PLAN_PRO_MONTHLY:', process.env.NEXT_PUBLIC_PAYPAL_PLAN_PRO_MONTHLY);
      console.log('NEXT_PUBLIC_PAYPAL_PLAN_PRO_YEARLY:', process.env.NEXT_PUBLIC_PAYPAL_PLAN_PRO_YEARLY);
      console.log('NEXT_PUBLIC_PAYPAL_PLAN_ENTERPRISE_MONTHLY:', process.env.NEXT_PUBLIC_PAYPAL_PLAN_ENTERPRISE_MONTHLY);
      console.log('NEXT_PUBLIC_PAYPAL_PLAN_ENTERPRISE_YEARLY:', process.env.NEXT_PUBLIC_PAYPAL_PLAN_ENTERPRISE_YEARLY);
      
      // Plan IDs (Sandbox)
      console.log('NEXT_PUBLIC_SANDBOX_PAYPAL_PLAN_PRO_MONTHLY:', process.env.NEXT_PUBLIC_SANDBOX_PAYPAL_PLAN_PRO_MONTHLY);
      console.log('NEXT_PUBLIC_SANDBOX_PAYPAL_PLAN_PRO_YEARLY:', process.env.NEXT_PUBLIC_SANDBOX_PAYPAL_PLAN_PRO_YEARLY);
      console.log('NEXT_PUBLIC_SANDBOX_PAYPAL_PLAN_ENTERPRISE_MONTHLY:', process.env.NEXT_PUBLIC_SANDBOX_PAYPAL_PLAN_ENTERPRISE_MONTHLY);
      console.log('NEXT_PUBLIC_SANDBOX_PAYPAL_PLAN_ENTERPRISE_YEARLY:', process.env.NEXT_PUBLIC_SANDBOX_PAYPAL_PLAN_ENTERPRISE_YEARLY);
      
      console.groupEnd();
    }
  }