// Unified Shared Resources for DevDrive API
// ---------------------------------------------------------

// Constants
export const ACCESS_TOKEN_EXPIRY = "15m";
export const REFRESH_TOKEN_EXPIRY = "7d";
export const PRESIGNED_URL_EXPIRY = 3600; // 1 hour

// Types
export interface User {
  _id: string;
  email: string;
  displayName: string;
  role: "admin" | "editor" | "viewer";
}

export interface Folder {
  _id: string;
  name: string;
  ownerId: string;
  parentId: string | null;
  path: string;
  permissions: Array<{
    userId: string;
    role: "editor" | "viewer";
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface FileMeta {
  _id: string;
  folderId: string;
  name: string;
  relativePath: string;
  size: number;
  mimeType: string;
  b2FileId: string | null;
  uploadedBy: string;
  deleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Activity {
  _id: string;
  userId: string;
  action: "create" | "update" | "delete" | "upload" | "login";
  targetType: "folder" | "file" | "note" | "user";
  targetId: string;
  details: string;
  timestamp: string;
}

export interface Note {
  _id: string;
  folderId: string;
  content: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  _id: string;
  folderId: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: string;
}
