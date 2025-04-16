// utils/cognito-debug.ts
"use client"

import { fetchUserAttributes } from 'aws-amplify/auth';

/**
 * Utility to log current user attributes for debugging
 * Use this to check if attributes are actually being saved to Cognito
 */
export async function logCurrentUserAttributes(): Promise<void> {
  try {
    console.log("🔍 Fetching current user attributes...");
    const attributes = await fetchUserAttributes();
    console.log("📊 Current user attributes:", attributes);
    return attributes;
  } catch (error) {
    console.error("❌ Error fetching user attributes:", error);
    throw error;
  }
}

/**
 * Utility to validate if attributes are properly formatted for Cognito updates
 * @param attributes The attributes object to validate
 * @returns Boolean indicating if attributes are valid
 */
export function validateCognitoAttributes(attributes: Record<string, any>): boolean {
  let isValid = true;
  const issues: string[] = [];

  // Check for null or undefined values
  Object.entries(attributes).forEach(([key, value]) => {
    if (value === null) {
      isValid = false;
      issues.push(`Attribute "${key}" has null value. Cognito expects string values or undefined.`);
    }
    
    // Check that values are strings
    if (value !== undefined && typeof value !== 'string') {
      isValid = false;
      issues.push(`Attribute "${key}" has non-string value: ${typeof value}. Cognito expects string values.`);
    }
  });

  // Log validation results
  if (isValid) {
    console.log("✅ Cognito attributes are valid:", attributes);
  } else {
    console.error("❌ Invalid Cognito attributes:", issues);
    console.log("Original attributes:", attributes);
  }

  return isValid;
}

/**
 * Convert attribute values to the format expected by Cognito
 * @param attributes Attributes object to sanitize
 * @returns Sanitized attributes ready for Cognito
 */
export function sanitizeCognitoAttributes(attributes: Record<string, any>): Record<string, string> {
  const sanitized: Record<string, string> = {};
  
  Object.entries(attributes).forEach(([key, value]) => {
    // Skip null values
    if (value === null) {
      return;
    }
    
    // Convert values to strings
    if (value !== undefined) {
      sanitized[key] = String(value);
    }
  });
  
  console.log("🧹 Sanitized attributes for Cognito:", sanitized);
  return sanitized;
}