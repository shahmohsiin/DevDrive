import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { config } from "./config.js";
import { PRESIGNED_URL_EXPIRY } from "./shared.js";

const s3 = new S3Client({
  region: "auto",
  endpoint: config.b2.endpoint,
  credentials: {
    accessKeyId: config.b2.applicationKeyId,
    secretAccessKey: config.b2.applicationKey,
  },
});

/**
 * Generate a presigned URL for uploading a file to B2
 */
export async function getUploadPresignedUrl(
  key: string,
  contentType: string,
  size: number
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: config.b2.bucketName,
    Key: key,
    ContentType: contentType,
    ContentLength: size,
  });

  return getSignedUrl(s3, command, { expiresIn: PRESIGNED_URL_EXPIRY });
}

/**
 * Generate a presigned URL for downloading a file from B2
 */
export async function getDownloadPresignedUrl(key: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: config.b2.bucketName,
    Key: key,
  });

  return getSignedUrl(s3, command, { expiresIn: PRESIGNED_URL_EXPIRY });
}

/**
 * Fetch an object's stream from B2
 */
export async function getFileObject(key: string) {
  const command = new GetObjectCommand({
    Bucket: config.b2.bucketName,
    Key: key,
  });

  return s3.send(command);
}

/**
 * Delete an object from B2
 */
export async function deleteB2Object(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: config.b2.bucketName,
    Key: key,
  });

  await s3.send(command);
}
