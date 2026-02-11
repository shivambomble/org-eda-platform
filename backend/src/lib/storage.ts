import fs from 'fs/promises';
import path from 'path';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const STORAGE_TYPE = process.env.STORAGE_TYPE || 'filesystem';
const STORAGE_PATH = process.env.STORAGE_PATH || './storage';
const S3_BUCKET = process.env.S3_BUCKET || 'org-eda-datasets';
const S3_REGION = process.env.AWS_REGION || 'us-east-1';

// Initialize S3 client only if using S3
let s3Client: S3Client | null = null;
if (STORAGE_TYPE === 's3') {
  s3Client = new S3Client({
    region: S3_REGION,
    credentials: process.env.AWS_ACCESS_KEY_ID ? {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    } : undefined,
  });
}

/**
 * Upload file to storage (filesystem or S3 based on STORAGE_TYPE env var)
 */
export const uploadFile = async (file: Express.Multer.File, key: string): Promise<string> => {
  if (STORAGE_TYPE === 'filesystem') {
    return uploadToFilesystem(file, key);
  } else {
    return uploadToS3(file, key);
  }
};

/**
 * Upload to local filesystem
 */
async function uploadToFilesystem(file: Express.Multer.File, key: string): Promise<string> {
  const fullPath = path.join(STORAGE_PATH, key);
  const dir = path.dirname(fullPath);

  // Ensure directory exists
  await fs.mkdir(dir, { recursive: true });

  // Write file
  await fs.writeFile(fullPath, file.buffer);

  console.log(`[Filesystem] Uploaded to ${fullPath}`);
  return `file://${fullPath}`;
}

/**
 * Upload to S3
 */
async function uploadToS3(file: Express.Multer.File, key: string): Promise<string> {
  if (!s3Client) {
    throw new Error('S3 client not initialized');
  }

  const command = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
  });

  try {
    await s3Client.send(command);
    console.log(`[S3] Uploaded to s3://${S3_BUCKET}/${key}`);
    return `s3://${S3_BUCKET}/${key}`;
  } catch (error) {
    console.error('S3 Upload Error:', error);
    throw new Error('Failed to upload file to S3');
  }
}

/**
 * Get file from storage
 */
export const getFile = async (storagePath: string): Promise<Buffer> => {
  if (storagePath.startsWith('file://')) {
    const filePath = storagePath.replace('file://', '');
    console.log(`[Storage] Reading file from: ${filePath}`);
    return await fs.readFile(filePath);
  } else if (storagePath.startsWith('s3://')) {
    throw new Error('S3 download not implemented yet');
  } else {
    throw new Error(`Unknown storage path format: ${storagePath}`);
  }
};
