// lib/aws/s3-config.ts
import { S3Client } from "@aws-sdk/client-s3";

// Check if required environment variables are set
const requiredVars = [
  'NEXT_PUBLIC_AWS_REGION',
  'NEXT_PUBLIC_S3_BUCKET_NAME'
];

// Function to validate environment variables
const validateEnvVars = () => {
  const missingVars = requiredVars.filter(
    varName => !process.env[varName]
  );
  
  if (missingVars.length > 0) {
    console.error(`Missing required environment variables: ${missingVars.join(', ')}`);
    return false;
  }
  
  return true;
};

// Get region from environment, default to us-east-1 if not set
const AWS_REGION = process.env.NEXT_PUBLIC_AWS_REGION || "us-east-1";

// Get bucket name from environment
export const S3_BUCKET_NAME = process.env.NEXT_PUBLIC_S3_BUCKET_NAME || "solutours";

// Debug function to log authentication details
function logAuthDetails() {
  console.log(`[S3-CONFIG] Environment: ${process.env.NODE_ENV}`);
  console.log(`[S3-CONFIG] Region: ${AWS_REGION}`);
  console.log(`[S3-CONFIG] Bucket: ${S3_BUCKET_NAME}`);
  
  if (process.env.NEXT_PUBLIC_AWS_ACCESS_KEY && process.env.NEXT_PUBLIC_AWS_SECRET_KEY) {
    console.log(`[S3-CONFIG] Using explicit credentials from environment variables`);
  } else {
    console.log(`[S3-CONFIG] Using AWS credential chain (IAM role or instance profile)`);
  }
}

// Log authentication details
logAuthDetails();

// Create S3 client with appropriate credentials
export const s3Client = new S3Client({
  region: AWS_REGION,
  // ALWAYS use environment variables if they are available, regardless of environment
  ...(process.env.NEXT_PUBLIC_AWS_ACCESS_KEY && process.env.NEXT_PUBLIC_AWS_SECRET_KEY ? {
    credentials: {
      accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY,
      secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRET_KEY
    }
  } : {})
});

// Export a function to validate S3 configuration
export const validateS3Config = async (): Promise<boolean> => {
  if (!validateEnvVars()) {
    return false;
  }
  
  try {
    // Try to import the ListBucketsCommand to test S3 connectivity
    const { ListBucketsCommand } = await import('@aws-sdk/client-s3');
    
    // Create a test command
    const command = new ListBucketsCommand({});
    
    // Try to execute it
    console.log('[S3-TEST] Testing S3 connection with ListBucketsCommand...');
    const response = await s3Client.send(command);
    
    console.log('[S3-TEST] S3 connection successful:', {
      bucketCount: response.Buckets?.length || 0
    });
    return true;
  } catch (error) {
    console.error('[S3-TEST] Failed to connect to S3:', {
      message: error.message,
      code: error.code,
      name: error.name,
      statusCode: error.$metadata?.httpStatusCode,
      requestId: error.$metadata?.requestId
    });
    return false;
  }
};

// Add a simple test function for direct file operations
export const testS3Upload = async (): Promise<boolean> => {
  try {
    const { PutObjectCommand } = await import('@aws-sdk/client-s3');
    
    console.log('[S3-TEST] Testing S3 file upload...');
    const testKey = `_test/connection-test-${Date.now()}.json`;
    const testData = { test: true, timestamp: new Date().toISOString() };
    
    const command = new PutObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: testKey,
      Body: JSON.stringify(testData),
      ContentType: "application/json"
    });
    
    console.log(`[S3-TEST] Attempting to upload test file to ${testKey}...`);
    await s3Client.send(command);
    console.log('[S3-TEST] Test file upload successful!');
    
    return true;
  } catch (error) {
    console.error('[S3-TEST] Test file upload failed:', {
      message: error.message,
      code: error.code,
      name: error.name,
      statusCode: error.$metadata?.httpStatusCode,
      requestId: error.$metadata?.requestId
    });
    return false;
  }
};