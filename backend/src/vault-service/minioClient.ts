import { Client } from 'minio';
import crypto from 'crypto';
import { MinIOConfig, PresignedUrlResponse } from './types';

// MinIO configuration
const minioConfig: MinIOConfig = {
  endpoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: parseInt(process.env.MINIO_PORT || '9000'),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY || 'admin',
  secretKey: process.env.MINIO_SECRET_KEY || 'admin123',
  bucketName: process.env.MINIO_BUCKET_NAME || 'aegisvault-files'
};

// Create MinIO client
const minioClient = new Client({
  endPoint: minioConfig.endpoint,
  port: minioConfig.port,
  useSSL: minioConfig.useSSL,
  accessKey: minioConfig.accessKey,
  secretKey: minioConfig.secretKey,
});

// Ensure bucket exists
const ensureBucketExists = async (): Promise<void> => {
  try {
    const exists = await minioClient.bucketExists(minioConfig.bucketName);
    if (!exists) {
      await minioClient.makeBucket(minioConfig.bucketName, 'us-east-1');
      console.log(`✅ Created MinIO bucket: ${minioConfig.bucketName}`);
    } else {
      console.log(`✅ MinIO bucket exists: ${minioConfig.bucketName}`);
    }
  } catch (error) {
    console.error('❌ MinIO bucket setup error:', error);
    throw error;
  }
};

// Initialize MinIO client
ensureBucketExists().catch(console.error);

// Generate unique file path
export const generateFilePath = (userId: string, itemId: string, version: number, extension?: string): string => {
  const timestamp = Date.now();
  const randomId = crypto.randomBytes(8).toString('hex');
  const ext = extension ? `.${extension}` : '';
  return `vault/${userId}/${itemId}/v${version}/${timestamp}-${randomId}${ext}`;
};

// Generate presigned URL for upload
export const generatePresignedUploadUrl = async (
  filePath: string,
  mimeType: string,
  expiresIn: number = 3600 // 1 hour default
): Promise<PresignedUrlResponse> => {
  try {
    const uploadUrl = await minioClient.presignedPutObject(
      minioConfig.bucketName,
      filePath,
      expiresIn
    );

    return {
      uploadUrl,
      expiresIn
    };
  } catch (error) {
    console.error('Error generating presigned upload URL:', error);
    throw new Error('Failed to generate upload URL');
  }
};

// Generate presigned URL for download
export const generatePresignedDownloadUrl = async (
  filePath: string,
  expiresIn: number = 3600 // 1 hour default
): Promise<string> => {
  try {
    const downloadUrl = await minioClient.presignedGetObject(
      minioConfig.bucketName,
      filePath,
      expiresIn
    );
    return downloadUrl;
  } catch (error) {
    console.error('Error generating presigned download URL:', error);
    throw new Error('Failed to generate download URL');
  }
};

// Check if file exists
export const fileExists = async (filePath: string): Promise<boolean> => {
  try {
    await minioClient.statObject(minioConfig.bucketName, filePath);
    return true;
  } catch (error) {
    return false;
  }
};

// Delete file
export const deleteFile = async (filePath: string): Promise<void> => {
  try {
    await minioClient.removeObject(minioConfig.bucketName, filePath);
  } catch (error) {
    console.error('Error deleting file:', error);
    throw new Error('Failed to delete file');
  }
};

// Get file metadata
export const getFileMetadata = async (filePath: string) => {
  try {
    const stat = await minioClient.statObject(minioConfig.bucketName, filePath);
    return {
      size: stat.size,
      etag: stat.etag,
      lastModified: stat.lastModified,
      contentType: stat.metaData['content-type']
    };
  } catch (error) {
    console.error('Error getting file metadata:', error);
    throw new Error('Failed to get file metadata');
  }
};

// Download file from MinIO
export const downloadFileFromMinIO = async (filePath: string): Promise<Buffer> => {
  try {
    const stream = await minioClient.getObject(minioConfig.bucketName, filePath);
    const chunks: Buffer[] = [];
    
    return new Promise((resolve, reject) => {
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', (error) => reject(error));
    });
  } catch (error) {
    console.error('Error downloading file from MinIO:', error);
    throw new Error('Failed to download file');
  }
};

// Generate file checksum
export const generateChecksum = (data: Buffer): string => {
  return crypto.createHash('sha256').update(data).digest('hex');
};

export { minioClient, minioConfig };
