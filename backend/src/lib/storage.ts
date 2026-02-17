import fs from 'fs/promises';
import path from 'path';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';

const STORAGE_TYPE = process.env.STORAGE_TYPE || 'filesystem';
const STORAGE_PATH = process.env.STORAGE_PATH || './storage';
const S3_BUCKET = process.env.S3_BUCKET || 'org-eda-datasets';
const S3_REGION = process.env.AWS_REGION || 'us-east-1';

// Initialize S3 client only if using S3
let s3Client: S3Client | null = null;

if (STORAGE_TYPE === 's3') {
  s3Client = new S3Client({
    region: S3_REGION,
    credentials: process.env.AWS_ACCESS_KEY_ID
      ? {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        }
      : undefined,
  });
}

/**
 * Upload file to storage (filesystem or S3)
 */
export const uploadFile = async (
  file: Express.Multer.File,
  key: string
): Promise<string> => {
  if (STORAGE_TYPE === 'filesystem') {
    return uploadToFilesystem(file, key);
  }

  return uploadToS3(file, key);
};

/**
 * Upload to local filesystem
 */
async function uploadToFilesystem(
  file: Express.Multer.File,
  key: string
): Promise<string> {
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
async function uploadToS3(
  file: Express.Multer.File,
  key: string
): Promise<string> {
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
 * Get file from storage (filesystem or S3)
 */
export const getFile = async (storagePath: string): Promise<Buffer> => {
  // Filesystem
  if (storagePath.startsWith('file://')) {
    const filePath = storagePath.replace('file://', '');
    console.log(`[Storage] Reading file from: ${filePath}`);
    return fs.readFile(filePath);
  }

  // S3
  if (storagePath.startsWith('s3://')) {
    const match = storagePath.match(/^s3:\/\/([^/]+)\/(.+)$/);

    if (!match) {
      throw new Error(`Invalid S3 path format: ${storagePath}`);
    }

    const bucket = match[1];
    const key = match[2];

    if (!s3Client) {
      throw new Error('S3 client not initialized');
    }

    try {
      console.log(`[Storage] Downloading from S3: s3://${bucket}/${key}`);

      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      });

      const response = await s3Client.send(command);

      if (!response.Body) {
        throw new Error('Empty response from S3');
      }

      const chunks: Buffer[] = [];
      const stream = response.Body as any;

      if (stream[Symbol.asyncIterator]) {
        for await (const chunk of stream) {
          chunks.push(Buffer.from(chunk));
        }
      } else {
        return new Promise((resolve, reject) => {
          stream.on('data', (chunk: Buffer) => chunks.push(chunk));
          stream.on('end', () => resolve(Buffer.concat(chunks)));
          stream.on('error', reject);
        });
      }

      return Buffer.concat(chunks);
    } catch (error) {
      console.error('S3 Download Error:', error);
      throw new Error('Failed to download file from S3');
    }
  }

  throw new Error(`Unknown storage path format: ${storagePath}`);
};
