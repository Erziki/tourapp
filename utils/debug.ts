// utils/debug.ts

// Enable debug mode in development
export const DEBUG = process.env.NODE_ENV === 'development';

/**
 * Logs a debug message if debug mode is enabled
 */
export const logDebug = (message: string, data?: any) => {
  if (DEBUG) {
    if (data) {
      console.log(`[DEBUG] ${message}`, data);
    } else {
      console.log(`[DEBUG] ${message}`);
    }
  }
};

/**
 * Logs error with improved formatting
 */
export const logError = (message: string, error: any) => {
  console.error(`[ERROR] ${message}`, error);
};

/**
 * Pretty prints an object for debugging
 */
export const prettyPrint = (obj: any): string => {
  try {
    return JSON.stringify(obj, null, 2);
  } catch (error) {
    console.error('Error pretty printing object:', error);
    return '[Unable to stringify object]';
  }
};

/**
 * Checks if an object is complete according to the required fields
 */
export const isComplete = (obj: any, requiredFields: string[]): boolean => {
  if (!obj) return false;
  
  return requiredFields.every(field => {
    const value = obj[field];
    if (value === undefined || value === null) return false;
    if (Array.isArray(value) && value.length === 0) return false;
    if (typeof value === 'string' && value.trim() === '') return false;
    return true;
  });
};

/**
 * Returns an object with only the specified fields
 */
export const pick = (obj: any, fields: string[]): any => {
  if (!obj) return {};
  
  return fields.reduce((result, field) => {
    if (obj[field] !== undefined) {
      result[field] = obj[field];
    }
    return result;
  }, {});
};