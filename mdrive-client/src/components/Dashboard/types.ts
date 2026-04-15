export interface DashboardFolderItem {
  _id: string;
  name: string;
  description: string;
  ownerId: string;
  parentId?: string;
  permissions: Array<{ userId: string; access: string }>;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardFileItem {
  _id: string;
  folderId: string;
  relativePath: string;
  fileName: string;
  mimeType: string;
  currentVersion: number;
  size: number;
  updatedAt: string;
}
