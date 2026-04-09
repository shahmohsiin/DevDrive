import { getAuthState } from "./tauri";

let cachedApiUrl: string | null = null;
let cachedToken: string | null = null;

/**
 * Initialize/refresh the API client state from Tauri config
 */
export async function refreshApiState(): Promise<void> {
  const state = await getAuthState();
  cachedApiUrl = state.api_url;
  cachedToken = state.access_token;
}

async function ensureApiState(): Promise<void> {
  if (cachedApiUrl !== null) return;

  try {
    await refreshApiState();
  } catch {
    // Fall back to defaults if the Tauri bridge is temporarily unavailable.
  }
}

function getApiUrl(): string {
  return cachedApiUrl || "https://dev-drive-mdrive-api.vercel.app";
}

function getHeaders(hasJsonBody = false): Record<string, string> {
  const headers: Record<string, string> = {};
  if (hasJsonBody) {
    headers["Content-Type"] = "application/json";
  }
  if (cachedToken) {
    headers["Authorization"] = `Bearer ${cachedToken}`;
  }
  return headers;
}

/**
 * Set the token directly (used after login before refreshing from config)
 */
export function setToken(token: string): void {
  cachedToken = token;
}

export function clearCachedToken(): void {
  cachedToken = null;
}

/**
 * Generic API request helper
 */
async function request<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<{ success: boolean; data?: T; error?: string }> {
  await ensureApiState();

  const baseUrl = getApiUrl().endsWith('/') ? getApiUrl().slice(0, -1) : getApiUrl();
  const url = `${baseUrl}${path}`;
  const hasBody = body !== undefined && method !== "GET";
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 15000);
  const options: RequestInit = {
    method,
    headers: getHeaders(hasBody),
    signal: controller.signal,
  };

  try {
    if (hasBody) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    const text = await response.text();
    let json: { success?: boolean; data?: T; error?: string } = {
      success: response.ok,
    };

    if (text) {
      try {
        json = JSON.parse(text);
      } catch {
        json = {
          success: response.ok,
          error: text,
        };
      }
    }

    if (!response.ok) {
      throw new Error(json.error || `Request failed: ${response.status}`);
    }

    return json as { success: boolean; data?: T; error?: string };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(
        "Request timed out while contacting the API. Check the API URL/server and try refresh."
      );
    }
    throw err;
  } finally {
    window.clearTimeout(timeout);
  }
}

// ─── Auth ────────────────────────────────────────────────────

export async function login(email: string, password: string) {
  return request<{
    user: { _id: string; email: string; displayName: string; role: string };
    tokens: { accessToken: string; refreshToken: string };
  }>("POST", "/auth/login", { email, password });
}

export async function register(params: {
  email: string;
  password: string;
  displayName: string;
  role?: string;
}) {
  return request<
    | {
      _id: string;
      email: string;
      displayName: string;
      role: string;
    }
    | {
      user: { _id: string; email: string; displayName: string; role: string };
      tokens: { accessToken: string; refreshToken: string };
    }
  >("POST", "/auth/register", params);
}

export async function getMe() {
  return request<{
    _id: string;
    email: string;
    displayName: string;
    role: string;
  }>("GET", "/auth/me");
}

export async function refreshTokens(refreshToken: string) {
  return request<{
    user: { _id: string; email: string; displayName: string; role: string };
    tokens: { accessToken: string; refreshToken: string };
  }>("POST", "/auth/refresh", { refreshToken });
}

export async function getUsers() {
  return request<
    Array<{
      _id: string;
      email: string;
      displayName: string;
      role: string;
      createdAt: string;
    }>
  >("GET", "/auth/users");
}

export async function deleteUser(id: string) {
  return request("DELETE", `/auth/users/${id}`);
}

export async function changePassword(params: { oldPassword?: string; newPassword: string }) {
  return request("PATCH", "/auth/password", params);
}

// ─── Folders ─────────────────────────────────────────────────

export async function createFolder(name: string, description?: string, parentId?: string) {
  return request<{
    _id: string;
    name: string;
    description: string;
    ownerId: string;
    parentId?: string;
    permissions: Array<{ userId: string; access: string }>;
  }>("POST", "/folders", { name, description, parentId });
}

export async function getFolderChat(folderId: string) {
  return request<Array<{ _id: string; userId: string; content: string; createdAt: string }>>("GET", `/folders/${folderId}/chat`);
}

export async function sendFolderMessage(folderId: string, content: string, attachments?: any[], replyTo?: string, replyToContent?: string) {
  return request<{ _id: string; userId: string; content: string; createdAt: string; attachments?: any[]; replyTo?: string; replyToContent?: string }>("POST", `/folders/${folderId}/chat`, { content, attachments, replyTo, replyToContent });
}

export async function deleteFolderMessage(folderId: string, messageId: string) {
  return request<{ success: boolean }>("DELETE", `/folders/${folderId}/chat/${messageId}`);
}

export async function getFolderNotes(folderId: string) {
  return request<any[]>("GET", `/folders/${folderId}/notes`);
}

export async function createNote(folderId: string, content: string) {
  return request<{ success: boolean; data: any }>("POST", `/folders/${folderId}/notes`, { content });
}

export async function updateNote(noteId: string, content: string) {
  return request<{ success: boolean; data: any }>("PATCH", `/notes/${noteId}`, { content });
}

export async function deleteNote(noteId: string) {
  return request<{ success: boolean }>("DELETE", `/notes/${noteId}`);
}

export async function getFolders(parentId?: string | null) {
  const query = parentId ? `?parentId=${parentId}` : "";
  return request<
    Array<{
      _id: string;
      name: string;
      description: string;
      ownerId: string;
      parentId?: string;
      permissions: Array<{ userId: string; access: string }>;
      createdAt: string;
      updatedAt: string;
    }>
  >("GET", `/folders${query}`);
}

export async function getFolder(id: string) {
  return request<{
    _id: string;
    name: string;
    description: string;
    ownerId: string;
    permissions: Array<{ userId: string; access: string }>;
  }>("GET", `/folders/${id}`);
}

export async function updateFolder(
  id: string,
  params: { name?: string; description?: string }
) {
  return request("PUT", `/folders/${id}`, params);
}

export async function updateFolderPermissions(
  id: string,
  permissions: Array<{ userId: string; access: string }>
) {
  return request("PUT", `/folders/${id}/permissions`, { permissions });
}

export async function deleteFolder(id: string) {
  return request("DELETE", `/folders/${id}`);
}

// ─── Files ───────────────────────────────────────────────────

export async function getUploadUrl(params: {
  folderId: string;
  relativePath: string;
  fileName: string;
  mimeType: string;
  size: number;
  sha256: string;
  fileId?: string;
}) {
  return request<{
    uploadUrl: string;
    b2Key: string;
    fileId: string;
  }>("POST", "/files/upload-url", params);
}

export async function confirmUpload(params: {
  fileId: string;
  b2Key: string;
  sha256: string;
  size: number;
}) {
  return request("POST", "/files/confirm-upload", params);
}

export async function getDownloadUrl(fileId: string, version?: number) {
  return request<{
    downloadUrl: string;
    fileName: string;
    size: number;
  }>("POST", "/files/download-url", { fileId, version });
}

export async function getFolderFiles(folderId: string) {
  return request<
    Array<{
      _id: string;
      folderId: string;
      relativePath: string;
      fileName: string;
      mimeType: string;
      currentVersion: number;
      sha256: string;
      size: number;
      deleted: boolean;
      uploadedBy: string;
      createdAt: string;
      updatedAt: string;
    }>
  >("GET", `/files/folder/${folderId}`);
}

export async function renameFile(id: string, fileName: string) {
  return request("PATCH", `/files/${id}`, { fileName });
}

export async function deleteFile(id: string) {
  return request("DELETE", `/files/${id}`);
}

export async function moveFile(id: string, targetFolderId: string) {
  return request("PATCH", `/files/${id}/move`, { targetFolderId });
}

export async function copyFile(id: string, targetFolderId: string) {
  return request("POST", `/files/${id}/copy`, { targetFolderId });
}

export async function moveFolder(id: string, targetParentId: string | null) {
  return request("PATCH", `/folders/${id}/move`, { targetParentId });
}

// ─── Activity ────────────────────────────────────────────────

export async function getFolderActivity(
  folderId: string,
  page = 1,
  pageSize = 50
) {
  return request<{
    items: Array<{
      _id: string;
      userId: string;
      userEmail: string;
      action: string;
      details: string;
      filePath?: string;
      timestamp: string;
    }>;
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
  }>("GET", `/activity/${folderId}?page=${page}&pageSize=${pageSize}`);
}
