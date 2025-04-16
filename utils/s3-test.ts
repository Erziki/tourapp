// utils/s3-test.ts
"use client";

import { s3Client, S3_BUCKET_NAME } from "@/lib/aws/s3-config";
import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { uploadBase64ImageToS3 } from "@/lib/aws/s3-media-utils";

/**
 * Tests if the application can upload to S3 properly
 * You can run this in the browser console or import it in a component
 */
export async function testS3Connection() {
  try {
    console.log("Testing S3 connection...");
    
    // Generate a simple test content
    const testData = "Hello S3! Test time: " + new Date().toISOString();
    
    // Create a test key
    const testKey = `test/s3-connection-test-${Date.now()}.txt`;
    
    console.log(`Attempting to upload test file to s3://${S3_BUCKET_NAME}/${testKey}`);
    
    // Try to upload a simple file
    const putCommand = new PutObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: testKey,
      Body: testData,
      ContentType: "text/plain"
    });
    
    await s3Client.send(putCommand);
    console.log("✅ Upload successful!");
    
    // Try to read it back
    const getCommand = new GetObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: testKey
    });
    
    const response = await s3Client.send(getCommand);
    const responseData = await response.Body?.transformToString();
    
    if (responseData === testData) {
      console.log("✅ Test data matches! S3 connection is working correctly.");
      return true;
    } else {
      console.error("❌ Test data doesn't match. S3 connection might have issues.");
      console.log("Original:", testData);
      console.log("Retrieved:", responseData);
      return false;
    }
  } catch (error) {
    console.error("❌ S3 connection test failed:", error);
    return false;
  }
}

/**
 * Tests uploading a base64 image to S3
 * This more closely matches the profile image upload flow
 */
export async function testImageUpload(userId: string = "test-user-id") {
  try {
    console.log("Testing base64 image upload to S3...");
    
    // Create a small test image (1x1 pixel transparent PNG)
    const smallPngBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";
    
    console.log("Uploading test image...");
    const imageUrl = await uploadBase64ImageToS3(
      userId,
      smallPngBase64,
      "test-image.png",
      (progress) => console.log(`Upload progress: ${progress}%`)
    );
    
    console.log("✅ Image upload successful:", imageUrl);
    return imageUrl;
  } catch (error) {
    console.error("❌ Image upload test failed:", error);
    
    // Provide more detailed error information
    if (error instanceof Error) {
      console.error("Error details:", error.message);
      
      if (error.message.includes("credentials")) {
        console.error("This appears to be an authentication issue. Check your AWS credentials.");
      } else if (error.message.includes("CORS")) {
        console.error("This appears to be a CORS issue. Check your S3 bucket CORS configuration.");
      } else if (error.message.includes("AccessDenied")) {
        console.error("This appears to be a permissions issue. Check your IAM policies.");
      }
    }
    
    return null;
  }
}

/**
 * This function can be called from the browser console to check
 * your S3 configuration. Just run:
 * 
 * runS3Tests().then(console.log)
 */
export async function runS3Tests() {
  const results = {
    connectionTest: false,
    imageUploadTest: false,
    uploadedImageUrl: null
  };
  
  // Test basic S3 connection
  results.connectionTest = await testS3Connection();
  
  // If basic connection works, test image upload
  if (results.connectionTest) {
    const imageUrl = await testImageUpload();
    results.imageUploadTest = !!imageUrl;
    results.uploadedImageUrl = imageUrl;
  }
  
  return results;
}