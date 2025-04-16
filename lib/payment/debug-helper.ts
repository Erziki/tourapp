// lib/payment/debug-helper.ts

/**
 * Debug helper for PayPal integration issues
 */
export function debugPayPal(verbose = false) {
    // Get various environment variables
    const envVars = {
      NODE_ENV: process.env.NODE_ENV,
      NEXT_PUBLIC_PAYPAL_MODE: process.env.NEXT_PUBLIC_PAYPAL_MODE,
      NEXT_PUBLIC_PAYPAL_CLIENT_ID: maskValue(process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID),
      NEXT_PUBLIC_SANDBOX_PAYPAL_CLIENT_ID: maskValue(process.env.NEXT_PUBLIC_SANDBOX_PAYPAL_CLIENT_ID),
      NEXT_PUBLIC_PAYPAL_PLAN_PRO_MONTHLY: process.env.NEXT_PUBLIC_PAYPAL_PLAN_PRO_MONTHLY,
      NEXT_PUBLIC_PAYPAL_PLAN_PRO_YEARLY: process.env.NEXT_PUBLIC_PAYPAL_PLAN_PRO_YEARLY,
      NEXT_PUBLIC_PAYPAL_PLAN_ENTERPRISE_MONTHLY: process.env.NEXT_PUBLIC_PAYPAL_PLAN_ENTERPRISE_MONTHLY,
      NEXT_PUBLIC_PAYPAL_PLAN_ENTERPRISE_YEARLY: process.env.NEXT_PUBLIC_PAYPAL_PLAN_ENTERPRISE_YEARLY,
      NEXT_PUBLIC_SANDBOX_PAYPAL_PLAN_PRO_MONTHLY: process.env.NEXT_PUBLIC_SANDBOX_PAYPAL_PLAN_PRO_MONTHLY,
      NEXT_PUBLIC_SANDBOX_PAYPAL_PLAN_PRO_YEARLY: process.env.NEXT_PUBLIC_SANDBOX_PAYPAL_PLAN_PRO_YEARLY,
      NEXT_PUBLIC_SANDBOX_PAYPAL_PLAN_ENTERPRISE_MONTHLY: process.env.NEXT_PUBLIC_SANDBOX_PAYPAL_PLAN_ENTERPRISE_MONTHLY,
      NEXT_PUBLIC_SANDBOX_PAYPAL_PLAN_ENTERPRISE_YEARLY: process.env.NEXT_PUBLIC_SANDBOX_PAYPAL_PLAN_ENTERPRISE_YEARLY,
    };
  
    // Check for browser environment
    const isBrowser = typeof window !== 'undefined';
    
    // Environment info
    const environment = {
      isBrowser,
      isProduction: process.env.NODE_ENV === 'production',
      isDevelopment: process.env.NODE_ENV === 'development',
      paypalSDKLoaded: isBrowser && !!window.paypal,
      paypalSDKVersion: getPayPalSDKVersion(),
      userAgent: isBrowser ? navigator.userAgent : 'N/A',
    };
    
    // Determine active mode
    const activeMode = process.env.NEXT_PUBLIC_PAYPAL_MODE?.trim() === 'sandbox' ? 'sandbox' : 'production';
    
    // Validate client ID and plan IDs
    const validation = {
      activeMode,
      clientIdPresent: activeMode === 'sandbox' 
        ? !!process.env.NEXT_PUBLIC_SANDBOX_PAYPAL_CLIENT_ID 
        : !!process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID,
      planIdsPresent: {
        proMonthly: activeMode === 'sandbox'
          ? !!process.env.NEXT_PUBLIC_SANDBOX_PAYPAL_PLAN_PRO_MONTHLY
          : !!process.env.NEXT_PUBLIC_PAYPAL_PLAN_PRO_MONTHLY,
        proYearly: activeMode === 'sandbox'
          ? !!process.env.NEXT_PUBLIC_SANDBOX_PAYPAL_PLAN_PRO_YEARLY
          : !!process.env.NEXT_PUBLIC_PAYPAL_PLAN_PRO_YEARLY,
        enterpriseMonthly: activeMode === 'sandbox'
          ? !!process.env.NEXT_PUBLIC_SANDBOX_PAYPAL_PLAN_ENTERPRISE_MONTHLY
          : !!process.env.NEXT_PUBLIC_PAYPAL_PLAN_ENTERPRISE_MONTHLY,
        enterpriseYearly: activeMode === 'sandbox'
          ? !!process.env.NEXT_PUBLIC_SANDBOX_PAYPAL_PLAN_ENTERPRISE_YEARLY
          : !!process.env.NEXT_PUBLIC_PAYPAL_PLAN_ENTERPRISE_YEARLY
      }
    };
    
    // Overall status
    const isConfigValid = validation.clientIdPresent && 
      validation.planIdsPresent.proMonthly &&
      validation.planIdsPresent.proYearly &&
      validation.planIdsPresent.enterpriseMonthly &&
      validation.planIdsPresent.enterpriseYearly;
  
    const summary = {
      mode: activeMode,
      isConfigValid,
      clientIdOk: validation.clientIdPresent,
      allPlansOk: Object.values(validation.planIdsPresent).every(value => value === true),
      sdkLoaded: environment.paypalSDKLoaded,
    };
  
    // Log the debug information
    console.group('PayPal Debug Information');
    console.log('Summary:', summary);
    
    if (verbose) {
      console.log('Environment:', environment);
      console.log('Validation:', validation);
      console.log('Environment Variables:', envVars);
    }
    
    // Show any detected issues
    const issues = [];
    
    if (!validation.clientIdPresent) {
      issues.push(`Missing PayPal Client ID for ${activeMode} mode`);
    }
    
    for (const [planKey, isPresent] of Object.entries(validation.planIdsPresent)) {
      if (!isPresent) {
        issues.push(`Missing Plan ID: ${planKey} in ${activeMode} mode`);
      }
    }
    
    if (!environment.paypalSDKLoaded && isBrowser) {
      issues.push('PayPal SDK not loaded in browser');
    }
    
    if (issues.length > 0) {
      console.log('Detected Issues:', issues);
    } else {
      console.log('No issues detected 👍');
    }
    
    console.groupEnd();
    
    return { summary, issues, environment, validation, envVars };
  }
  
  // Helper function to mask sensitive values
  function maskValue(value?: string): string {
    if (!value) return 'missing';
    if (value.length <= 8) return '***';
    return value.substring(0, 4) + '...' + value.substring(value.length - 4);
  }
  
  // Get PayPal SDK version if available
  function getPayPalSDKVersion(): string {
    if (typeof window === 'undefined') return 'N/A';
    try {
      // Find PayPal SDK script tag
      const scriptTag = Array.from(document.getElementsByTagName('script'))
        .find(script => script.src && script.src.includes('paypal.com/sdk/js'));
      
      if (!scriptTag) return 'Not found';
      
      // Extract version from URL if possible
      const url = new URL(scriptTag.src);
      const versionParam = url.searchParams.get('sdkVersion');
      return versionParam || 'Unknown';
    } catch (e) {
      return 'Error detecting';
    }
  }
  
  /**
   * Test if PayPal integration is working properly by attempting to load SDK
   */
  export async function testPayPalSDKLoading(): Promise<boolean> {
    return new Promise((resolve) => {
      if (typeof window === 'undefined') {
        resolve(false);
        return;
      }
      
      // If already loaded
      if (window.paypal) {
        resolve(true);
        return;
      }
      
      // Determine client ID
      const mode = process.env.NEXT_PUBLIC_PAYPAL_MODE?.trim() === 'sandbox' ? 'sandbox' : 'production';
      const clientId = mode === 'sandbox'
        ? process.env.NEXT_PUBLIC_SANDBOX_PAYPAL_CLIENT_ID
        : process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
      
      if (!clientId) {
        resolve(false);
        return;
      }
      
      // Try to load SDK with a timeout
      const script = document.createElement('script');
      script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=USD&intent=subscription`;
      script.async = true;
      
      const timeout = setTimeout(() => {
        console.error('PayPal SDK loading timed out');
        resolve(false);
      }, 5000);
      
      script.onload = () => {
        clearTimeout(timeout);
        resolve(!!window.paypal);
      };
      
      script.onerror = () => {
        clearTimeout(timeout);
        resolve(false);
      };
      
      document.body.appendChild(script);
      
      // Clean up after test
      setTimeout(() => {
        if (document.body.contains(script)) {
          document.body.removeChild(script);
        }
      }, 6000);
    });
  }