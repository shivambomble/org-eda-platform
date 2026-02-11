import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const region = process.env.AWS_REGION || 'us-east-1';
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
const bucketName = process.env.AWS_BUCKET_NAME || 'org-eda-datasets';

// If no credentials, we might warn or fail, but let's initialize if possible
let s3Client: S3Client;

if (accessKeyId && secretAccessKey) {
  s3Client = new S3Client({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey
    }
  });
} else {
  console.warn("AWS Credentials not found. S3 uploads will fail or mock.");
  // Mock client or fail hard in real app. For this demo, we can't upload without creds.
  // We'll initialize a dummy client to avoid crash on start, but upload will error.
  s3Client = new S3Client({ region }); 
}

export const uploadFileToS3 = async (file: Express.Multer.File, key: string): Promise<string> => {
    if (!accessKeyId) {
        // Mock success for development if no creds?
        // Or throw error?
        // Let's mimic success for the "agent" flow if user hasn't provided creds, 
        // to show metadata handling, but clearly log it.
        console.log(`[MOCK S3] Would upload to ${bucketName}/${key}`);
        return `s3://${bucketName}/${key}`; 
    }

    const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype
    });

    try {
        await s3Client.send(command);
        return `s3://${bucketName}/${key}`;
    } catch (error) {
        console.error("S3 Upload Error:", error);
        throw new Error("Failed to upload file to S3");
    }
};
