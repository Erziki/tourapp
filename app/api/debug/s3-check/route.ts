// app/api/debug/s3-check/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { 
  ListBucketsCommand, 
  HeadBucketCommand,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand
} from '@aws-sdk/client-s3';
import { s3Client, S3_BUCKET_NAME } from '@/lib/aws/s3-config';

// This is a diagnostic API endpoint to verify S3 configuration is working correctly
export async function GET(req: NextRequest) {
  console.log("🔍 Running S3 configuration check...");
  const results: Record<string, any> = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    tests: {}
  };
  
  try {
    // 1. Check if we can list buckets (credentials check)
    console.log("📋 Checking S3 credentials by listing buckets...");
    try {
      const listCommand = new ListBucketsCommand({});
      const listResponse = await s3Client.send(listCommand);
      
      results.tests.listBuckets = {
        success: true,
        buckets: listResponse.Buckets?.length || 0
      };
      
      console.log(`✅ Successfully listed ${listResponse.Buckets?.length || 0} buckets`);
    } catch (error) {
      console.error("❌ Failed to list buckets:", error);
      results.tests.listBuckets = {
        success: false,
        error: error.message
      };
    }
    
    // 2. Check if target bucket exists
    console.log(`🪣 Checking if bucket '${S3_BUCKET_NAME}' exists...`);
    try {
      const headCommand = new HeadBucketCommand({
        Bucket: S3_BUCKET_NAME
      });
      
      await s3Client.send(headCommand);
      results.tests.bucketExists = {
        success: true,
        name: S3_BUCKET_NAME
      };
      
      console.log(`✅ Bucket '${S3_BUCKET_NAME}' exists`);
    } catch (error) {
      console.error(`❌ Bucket check failed:`, error);
      results.tests.bucketExists = {
        success: false,
        error: error.message
      };
    }
    
    // 3. Try a test write
    const testKey = `_debug/test-${Date.now()}.json`;
    console.log(`📝 Testing write to '${testKey}'...`);
    
    try {
      const putCommand = new PutObjectCommand({
        Bucket: S3_BUCKET_NAME,
        Key: testKey,
        Body: JSON.stringify({ test: true, timestamp: Date.now() }),
        ContentType: 'application/json'
      });
      
      await s3Client.send(putCommand);
      results.tests.writeObject = {
        success: true,
        key: testKey
      };
      
      console.log(`✅ Successfully wrote test object`);
      
      // 4. Try to read the file back
      console.log(`📖 Testing read of '${testKey}'...`);
      try {
        const getCommand = new GetObjectCommand({
          Bucket: S3_BUCKET_NAME,
          Key: testKey
        });
        
        const getResponse = await s3Client.send(getCommand);
        const content = await getResponse.Body?.transformToString();
        
        results.tests.readObject = {
          success: true,
          contentLength: content?.length || 0
        };
        
        console.log(`✅ Successfully read test object`);
      } catch (readError) {
        console.error(`❌ Failed to read test object:`, readError);
        results.tests.readObject = {
          success: false,
          error: readError.message
        };
      }
      
      // 5. Clean up the test file
      console.log(`🧹 Cleaning up test object...`);
      try {
        const deleteCommand = new DeleteObjectCommand({
          Bucket: S3_BUCKET_NAME,
          Key: testKey
        });
        
        await s3Client.send(deleteCommand);
        results.tests.deleteObject = {
          success: true
        };
        
        console.log(`✅ Successfully deleted test object`);
      } catch (deleteError) {
        console.error(`❌ Failed to delete test object:`, deleteError);
        results.tests.deleteObject = {
          success: false,
          error: deleteError.message
        };
      }
    } catch (writeError) {
      console.error(`❌ Failed to write test object:`, writeError);
      results.tests.writeObject = {
        success: false,
        error: writeError.message
      };
    }
    
    // Overall result
    const allSuccessful = Object.values(results.tests).every(test => test.success === true);
    results.success = allSuccessful;
    
    if (allSuccessful) {
      console.log("✅ All S3 tests passed! Configuration is working correctly");
    } else {
      console.error("❌ S3 configuration test failed!");
    }
    
    return NextResponse.json(results);
  } catch (error) {
    console.error("❌ Unexpected error during S3 check:", error);
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}