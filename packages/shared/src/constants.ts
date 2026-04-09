export const ROLES = ["admin", "editor", "viewer"] as const;
export type Role = (typeof ROLES)[number];

export const PERMISSIONS = ["editor", "viewer"] as const;
export type Permission = (typeof PERMISSIONS)[number];

/** File/folder patterns to ignore during upload */
export const IGNORE_PATTERNS = [
  ".git",
  "node_modules",
  "dist",
  "build",
  ".next",
  "target",
  ".cache",
  ".DS_Store",
  "Thumbs.db",
  ".env",
  ".env.local",
  "__pycache__",
  "*.pyc",
  ".turbo",
] as const;

/** Max file size for upload (100 MB) */
export const MAX_FILE_SIZE = 100 * 1024 * 1024;

/** Presigned URL expiry in seconds (15 minutes) */
export const PRESIGNED_URL_EXPIRY = 15 * 60;

/** Access token expiry */
export const ACCESS_TOKEN_EXPIRY = "1h";

/** Refresh token expiry */
export const REFRESH_TOKEN_EXPIRY = "7d";
