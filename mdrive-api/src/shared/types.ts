// ─── User ────────────────────────────────────────────────────

export interface User {
  _id: string;
  email: string;
  displayName: string;
  role: "admin" | "editor" | "viewer";
  createdAt: string;
  updatedAt: string;
}

export interface UserCreatePayload {
  email: string;
  password: string;
  displayName: string;
  role: "admin" | "editor" | "viewer";
}

// ─── Auth ────────────────────────────────────────────────────

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

// ─── Folder ──────────────────────────────────────────────────

export interface FolderPermission {
  userId: string;
  access: "editor" | "viewer";
}

export interface Folder {
  _id: string;
  name: string;
  description: string;
  ownerId: string;
  parentId?: string;
  b2Prefix: string;
  permissions: FolderPermission[];
  createdAt: string;
  updatedAt: string;
}

export interface FolderCreatePayload {
  name: string;
  description?: string;
  parentId?: string;
}

export interface FolderPermissionPayload {
  userId: string;
  access: "editor" | "viewer";
}

// ─── File Metadata ───────────────────────────────────────────

export interface FileRevision {
  version: number;
  b2Key: string;
  sha256: string;
  size: number;
  uploadedBy: string;
  uploadedAt: string;
}

export interface FileMeta {
  _id: string;
  folderId: string;
  relativePath: string;
  fileName: string;
  mimeType: string;
  currentVersion: number;
  sha256: string;
  size: number;
  b2Key: string;
  revisions: FileRevision[];
  deleted: boolean;
  uploadedBy: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Presigned URLs ──────────────────────────────────────────

export interface UploadUrlRequest {
  folderId: string;
  relativePath: string;
  fileName: string;
  mimeType: string;
  size: number;
  sha256: string;
}

export interface UploadUrlResponse {
  uploadUrl: string;
  b2Key: string;
  fileId: string;
}

export interface DownloadUrlRequest {
  fileId: string;
  version?: number;
}

export interface DownloadUrlResponse {
  downloadUrl: string;
  fileName: string;
  size: number;
}

// ─── Upload Confirmation ────────────────────────────────────

export interface ConfirmUploadPayload {
  fileId: string;
  b2Key: string;
  sha256: string;
  size: number;
}

// ─── Activity Log ────────────────────────────────────────────

export type ActivityAction =
  | "file.upload"
  | "file.download"
  | "file.delete"
  | "file.rename"
  | "file.move"
  | "file.copy"
  | "folder.create"
  | "folder.update"
  | "folder.rename"
  | "folder.move"
  | "folder.delete"
  | "user.create"
  | "user.security"
  | "permission.update";

export interface ActivityLog {
  _id: string;
  userId: string;
  userEmail: string;
  userName?: string;
  folderId?: string;
  action: ActivityAction;
  details: string;
  filePath?: string;
  timestamp: string;
}

// ─── API Responses ───────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
