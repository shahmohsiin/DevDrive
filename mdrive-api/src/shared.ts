export const ACCESS_TOKEN_EXPIRY = "15m";
export const REFRESH_TOKEN_EXPIRY = "7d";
export const PRESIGNED_URL_EXPIRY = 3600;

export type Role = "admin" | "editor" | "viewer";

export interface User {
  _id: string;
  email: string;
  displayName: string;
  role: Role;
  createdAt?: string;
  updatedAt?: string;
}

export interface FolderPermission {
  userId: string;
  access: "editor" | "viewer";
}

export interface Folder {
  _id: string;
  name: string;
  description: string;
  ownerId: string;
  parentId?: string | null;
  b2Prefix: string;
  permissions: FolderPermission[];
  createdAt: string;
  updatedAt: string;
}

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

export type ActivityAction =
  | "user.create"
  | "user.security"
  | "folder.create"
  | "folder.update"
  | "folder.delete"
  | "folder.move"
  | "permission.update"
  | "file.upload"
  | "file.download"
  | "file.rename"
  | "file.delete"
  | "file.move"
  | "file.copy";

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
