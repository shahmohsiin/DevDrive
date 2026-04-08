import { useState, useEffect, useCallback } from "react";
import {
  getUsers,
  register,
  deleteUser,
  getFolders,
  updateFolderPermissions,
} from "../lib/api";

interface UserItem {
  _id: string;
  email: string;
  displayName: string;
  role: string;
  createdAt: string;
}

interface FolderItem {
  _id: string;
  name: string;
  permissions: Array<{ userId: string; access: string }>;
}

export function AdminUsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [showPermissions, setShowPermissions] = useState<string | null>(null);

  // Create user form
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newDisplayName, setNewDisplayName] = useState("");
  const [newRole, setNewRole] = useState<"editor" | "viewer">("editor");
  const [creating, setCreating] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [usersRes, foldersRes] = await Promise.all([
        getUsers(),
        getFolders(),
      ]);
      if (usersRes.data) setUsers(usersRes.data);
      if (foldersRes.data) setFolders(foldersRes.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError("");

    try {
      await register({
        email: newEmail,
        password: newPassword,
        displayName: newDisplayName,
        role: newRole,
      });
      setShowCreate(false);
      setNewEmail("");
      setNewPassword("");
      setNewDisplayName("");
      setNewRole("editor");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create user");
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteUser(id: string) {
    if (!confirm("Delete this user? This cannot be undone.")) return;
    try {
      await deleteUser(id);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete user");
    }
  }

  async function handleToggleFolderAccess(
    folderId: string,
    userId: string,
    currentAccess: string | null
  ) {
    const folder = folders.find((f) => f._id === folderId);
    if (!folder) return;

    let newPermissions = [...folder.permissions];

    if (currentAccess) {
      // Remove access
      newPermissions = newPermissions.filter((p) => p.userId !== userId);
    } else {
      // Add editor access
      newPermissions.push({ userId, access: "editor" });
    }

    try {
      await updateFolderPermissions(folderId, newPermissions);
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update permissions"
      );
    }
  }

  async function handleChangeAccess(
    folderId: string,
    userId: string,
    newAccess: "editor" | "viewer"
  ) {
    const folder = folders.find((f) => f._id === folderId);
    if (!folder) return;

    const newPermissions = folder.permissions.map((p) =>
      p.userId === userId ? { ...p, access: newAccess } : p
    );

    try {
      await updateFolderPermissions(folderId, newPermissions);
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update permissions"
      );
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-[var(--color-accent-blue)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const selectedUser = showPermissions
    ? users.find((u) => u._id === showPermissions)
    : null;

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
              User Management
            </h2>
            <p className="text-sm text-[var(--color-text-muted)] mt-1">
              Create accounts and manage folder access
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="btn-primary text-sm"
          >
            + Create User
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="px-4 py-3 rounded-lg bg-[rgba(244,63,94,0.1)] border border-[rgba(244,63,94,0.2)] flex items-center justify-between animate-fade-in">
            <p className="text-sm text-[var(--color-accent-rose)]">{error}</p>
            <button
              onClick={() => setError("")}
              className="text-[var(--color-accent-rose)] hover:text-white ml-4"
            >
              ×
            </button>
          </div>
        )}

        {/* Create User Modal */}
        {showCreate && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="glass rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-fade-in">
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
                Create User
              </h3>
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5 uppercase tracking-wide">
                    Display Name
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={newDisplayName}
                    onChange={(e) => setNewDisplayName(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5 uppercase tracking-wide">
                    Email
                  </label>
                  <input
                    type="email"
                    className="input-field"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5 uppercase tracking-wide">
                    Password
                  </label>
                  <input
                    type="password"
                    className="input-field"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5 uppercase tracking-wide">
                    Role
                  </label>
                  <select
                    className="input-field"
                    value={newRole}
                    onChange={(e) =>
                      setNewRole(e.target.value as "editor" | "viewer")
                    }
                  >
                    <option value="editor">Editor</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    className="btn-primary flex-1"
                    disabled={creating}
                  >
                    {creating ? "Creating..." : "Create"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreate(false)}
                    className="btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Permissions Modal */}
        {showPermissions && selectedUser && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="glass rounded-2xl p-6 w-full max-w-md shadow-2xl animate-fade-in">
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-1">
                Folder Access
              </h3>
              <p className="text-sm text-[var(--color-text-muted)] mb-4">
                {selectedUser.displayName} ({selectedUser.email})
              </p>

              {folders.length === 0 ? (
                <p className="text-sm text-[var(--color-text-muted)] py-6 text-center">
                  No folders created yet
                </p>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {folders.map((folder) => {
                    const perm = folder.permissions.find(
                      (p) => p.userId === selectedUser._id
                    );
                    const hasAccess = !!perm;

                    return (
                      <div
                        key={folder._id}
                        className="flex items-center justify-between px-4 py-3 rounded-lg bg-[var(--color-surface-hover)]"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-base">📂</span>
                          <span className="text-sm text-[var(--color-text-primary)]">
                            {folder.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {hasAccess && (
                            <select
                              className="input-field !w-auto !py-1 !px-2 text-xs"
                              value={perm!.access}
                              onChange={(e) =>
                                handleChangeAccess(
                                  folder._id,
                                  selectedUser._id,
                                  e.target.value as "editor" | "viewer"
                                )
                              }
                            >
                              <option value="editor">Editor</option>
                              <option value="viewer">Viewer</option>
                            </select>
                          )}
                          <button
                            onClick={() =>
                              handleToggleFolderAccess(
                                folder._id,
                                selectedUser._id,
                                hasAccess ? perm!.access : null
                              )
                            }
                            className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                              hasAccess
                                ? "bg-[rgba(244,63,94,0.15)] text-[var(--color-accent-rose)] hover:bg-[rgba(244,63,94,0.25)]"
                                : "bg-[rgba(16,185,129,0.15)] text-[var(--color-accent-emerald)] hover:bg-[rgba(16,185,129,0.25)]"
                            }`}
                          >
                            {hasAccess ? "Remove" : "Grant"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-[var(--color-border-default)]">
                <button
                  onClick={() => setShowPermissions(null)}
                  className="btn-secondary w-full"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Users Table */}
        <div className="glass rounded-xl overflow-hidden">
          <div className="grid grid-cols-[1fr_1fr_100px_150px_120px] gap-4 px-6 py-3 text-[10px] text-[var(--color-text-muted)] uppercase tracking-widest font-semibold border-b border-[var(--color-border-default)]">
            <span>Name</span>
            <span>Email</span>
            <span>Role</span>
            <span>Created</span>
            <span className="text-right">Actions</span>
          </div>

          {users.map((u) => (
            <div
              key={u._id}
              className="grid grid-cols-[1fr_1fr_100px_150px_120px] gap-4 px-6 py-4 items-center hover:bg-[var(--color-surface-hover)] transition-colors group border-b border-[var(--color-border-default)] last:border-b-0"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--color-gradient-start)] to-[var(--color-gradient-end)] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {u.displayName.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm text-[var(--color-text-primary)] truncate">
                  {u.displayName}
                </span>
              </div>
              <span className="text-sm text-[var(--color-text-secondary)] truncate">
                {u.email}
              </span>
              <span
                className={`inline-flex w-fit px-2 py-0.5 rounded-full text-xs font-medium ${
                  u.role === "admin"
                    ? "bg-[rgba(139,92,246,0.15)] text-[var(--color-accent-purple)]"
                    : u.role === "editor"
                      ? "bg-[rgba(59,130,246,0.15)] text-[var(--color-accent-blue)]"
                      : "bg-[rgba(100,116,139,0.15)] text-[var(--color-text-secondary)]"
                }`}
              >
                {u.role}
              </span>
              <span className="text-xs text-[var(--color-text-muted)]">
                {new Date(u.createdAt).toLocaleDateString()}
              </span>
              <div className="flex items-center justify-end gap-1">
                {u.role !== "admin" && (
                  <>
                    <button
                      onClick={() => setShowPermissions(u._id)}
                      className="px-2 py-1 rounded-md text-xs text-[var(--color-accent-blue)] hover:bg-[rgba(59,130,246,0.1)] transition-colors"
                    >
                      Folders
                    </button>
                    <button
                      onClick={() => handleDeleteUser(u._id)}
                      className="px-2 py-1 rounded-md text-xs text-[var(--color-accent-rose)] hover:bg-[rgba(244,63,94,0.1)] transition-colors"
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
