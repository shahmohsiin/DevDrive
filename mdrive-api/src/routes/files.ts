import type { FastifyInstance } from "fastify";
import { ObjectId } from "mongodb";
import { nanoid } from "nanoid";
import { filesCollection, toFileMetaResponse } from "../models/file-meta.js";
import { foldersCollection } from "../models/folder.js";
import { logActivity } from "../models/activity.js";
import { getUploadPresignedUrl, getDownloadPresignedUrl } from "../b2.js";

/**
 * Check if user has at least the given access level on a folder
 */
async function checkFolderAccess(
  userId: string,
  role: string,
  folderId: string,
  requiredAccess: "viewer" | "editor"
): Promise<boolean> {
  if (role === "admin") return true;

  if (!ObjectId.isValid(folderId)) return false;

  const folder = await foldersCollection().findOne({
    _id: new ObjectId(folderId),
  });
  if (!folder) return false;

  if (folder.ownerId.toHexString() === userId) return true;

  const permission = folder.permissions.find(
    (p) => p.userId.toHexString() === userId
  );

  if (!permission) return false;

  if (requiredAccess === "viewer") return true;
  if (requiredAccess === "editor") return permission.access === "editor";

  return false;
}

export default async function fileRoutes(fastify: FastifyInstance) {
  // ─── POST /files/upload-url ───────────────────────────────
  fastify.post(
    "/files/upload-url",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { folderId, relativePath, fileName, mimeType, size, sha256 } =
        request.body as {
          folderId: string;
          relativePath: string;
          fileName: string;
          mimeType: string;
          size: number;
          sha256: string;
        };

      if (
        !folderId ||
        !relativePath ||
        !fileName ||
        !mimeType ||
        !size ||
        !sha256
      ) {
        return reply.status(400).send({
          success: false,
          error: "All fields are required",
        });
      }

      // Check editor access
      const hasAccess = await checkFolderAccess(
        request.user.userId,
        request.user.role,
        folderId,
        "editor"
      );
      if (!hasAccess) {
        return reply
          .status(403)
          .send({ success: false, error: "No editor access to this folder" });
      }

      const folder = await foldersCollection().findOne({
        _id: new ObjectId(folderId),
      });
      if (!folder) {
        return reply
          .status(404)
          .send({ success: false, error: "Folder not found" });
      }

      // Check if file already exists (update vs create)
      const existingFile = await filesCollection().findOne({
        folderId: new ObjectId(folderId),
        relativePath,
        deleted: { $ne: true },
      });

      const version = existingFile
        ? existingFile.currentVersion + 1
        : 1;
      const b2Key = `${folder.b2Prefix}${nanoid(8)}_v${version}_${fileName}`;

      let uploadUrl: string;
      try {
        uploadUrl = await getUploadPresignedUrl(b2Key, mimeType, size);
      } catch (err) {
        console.error("B2 Presigned URL Error:", err);
        return reply.status(500).send({
          success: false,
          error: `Failed to generate B2 upload URL: ${err instanceof Error ? err.message : String(err)}`
        });
      }

      let fileId: string;
      const now = new Date();

      if (existingFile) {
        // Create a new pending version
        fileId = existingFile._id.toHexString();
      } else {
        // Create new file metadata (pending)
        const result = await filesCollection().insertOne({
          _id: new ObjectId(),
          folderId: new ObjectId(folderId),
          relativePath,
          fileName,
          mimeType,
          currentVersion: 0, // will be updated on confirm
          sha256: "",
          size: 0,
          b2Key: "",
          revisions: [],
          deleted: false,
          uploadedBy: new ObjectId(request.user.userId),
          createdAt: now,
          updatedAt: now,
        });
        fileId = result.insertedId.toHexString();
      }

      console.log(`Generated upload URL for ${fileName} (Key: ${b2Key})`);

      return {
        success: true,
        data: { uploadUrl, b2Key, fileId },
      };
    }
  );

  // ─── POST /files/confirm-upload ───────────────────────────
  fastify.post(
    "/files/confirm-upload",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { fileId, b2Key, sha256, size } = request.body as {
        fileId: string;
        b2Key: string;
        sha256: string;
        size: number;
      };

      if (!fileId || !b2Key || !sha256 || !size) {
        return reply
          .status(400)
          .send({ success: false, error: "All fields are required" });
      }

      if (!ObjectId.isValid(fileId)) {
        return reply.status(400).send({ success: false, error: "Invalid fileId" });
      }

      const file = await filesCollection().findOne({
        _id: new ObjectId(fileId),
      });
      if (!file) {
        return reply
          .status(404)
          .send({ success: false, error: "File not found" });
      }

      const hasAccess = await checkFolderAccess(
        request.user.userId,
        request.user.role,
        file.folderId.toHexString(),
        "editor"
      );
      if (!hasAccess) {
        return reply
          .status(403)
          .send({ success: false, error: "Access denied" });
      }

      const newVersion = file.currentVersion + 1;
      const now = new Date();

      const newRevision = {
        version: newVersion,
        b2Key,
        sha256,
        size,
        uploadedBy: new ObjectId(request.user.userId),
        uploadedAt: now,
      };

      const result = await filesCollection().findOneAndUpdate(
        { _id: new ObjectId(fileId) },
        {
          $set: {
            currentVersion: newVersion,
            sha256,
            size,
            b2Key,
            uploadedBy: new ObjectId(request.user.userId),
            updatedAt: now,
          },
          $push: { revisions: newRevision },
        },
        { returnDocument: "after" }
      );

      if (!result) {
        return reply
          .status(500)
          .send({ success: false, error: "Failed to confirm upload" });
      }

      await logActivity({
        userId: request.user.userId,
        userEmail: request.user.email,
        userName: request.user.displayName,
        folderId: file.folderId.toHexString(),
        action: "file.upload",
        details: `Uploaded ${result.fileName} (v${newVersion}, ${(size / 1024).toFixed(1)}KB)`,
        filePath: result.relativePath,
      });

      return { success: true, data: toFileMetaResponse(result) };
    }
  );

  // ─── POST /files/download-url ─────────────────────────────
  fastify.post(
    "/files/download-url",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { fileId, version } = request.body as {
        fileId: string;
        version?: number;
      };

      if (!fileId) {
        return reply
          .status(400)
          .send({ success: false, error: "fileId is required" });
      }

      if (!ObjectId.isValid(fileId)) {
        return reply.status(400).send({ success: false, error: "Invalid fileId" });
      }

      const file = await filesCollection().findOne({
        _id: new ObjectId(fileId),
      });
      if (!file || file.deleted) {
        return reply
          .status(404)
          .send({ success: false, error: "File not found" });
      }

      const hasAccess = await checkFolderAccess(
        request.user.userId,
        request.user.role,
        file.folderId.toHexString(),
        "viewer"
      );
      if (!hasAccess) {
        return reply
          .status(403)
          .send({ success: false, error: "Access denied" });
      }

      let b2Key = file.b2Key;
      if (version && version !== file.currentVersion) {
        const rev = file.revisions.find((r) => r.version === version);
        if (!rev) {
          return reply
            .status(404)
            .send({ success: false, error: "Version not found" });
        }
        b2Key = rev.b2Key;
      }

      const downloadUrl = await getDownloadPresignedUrl(b2Key);

      await logActivity({
        userId: request.user.userId,
        userEmail: request.user.email,
        userName: request.user.displayName,
        folderId: file.folderId.toHexString(),
        action: "file.download",
        details: `Downloaded ${file.fileName}${version ? ` (v${version})` : ""}`,
        filePath: file.relativePath,
      });

      return {
        success: true,
        data: {
          downloadUrl,
          fileName: file.fileName,
          size: file.size,
        },
      };
    }
  );

  // ─── GET /files/folder/:folderId ──────────────────────────
  fastify.get(
    "/files/folder/:folderId",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { folderId } = request.params as { folderId: string };

      if (!ObjectId.isValid(folderId)) {
        return reply.status(400).send({ success: false, error: "Invalid folderId" });
      }

      const hasAccess = await checkFolderAccess(
        request.user.userId,
        request.user.role,
        folderId,
        "viewer"
      );
      if (!hasAccess) {
        return reply
          .status(403)
          .send({ success: false, error: "Access denied" });
      }

      const files = await filesCollection()
        .find({
          folderId: new ObjectId(folderId),
          deleted: { $ne: true },
        })
        .sort({ relativePath: 1 })
        .toArray();

      return {
        success: true,
        data: files.map(toFileMetaResponse),
      };
    }
  );

  // ─── PATCH /files/:id (rename) ────────────────────────────
  fastify.patch(
    "/files/:id",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const { fileName } = request.body as { fileName: string };

      if (!ObjectId.isValid(id)) {
        return reply.status(400).send({ 
          success: false, 
          error: `Invalid file ID format: "${id}"` 
        });
      }

      if (!fileName || fileName.trim().length === 0) {
        return reply.status(400).send({
          success: false,
          error: "fileName is required",
        });
      }

      const file = await filesCollection().findOne({
        _id: new ObjectId(id),
      });
      if (!file || file.deleted) {
        return reply
          .status(404)
          .send({ success: false, error: "File not found" });
      }

      const hasAccess = await checkFolderAccess(
        request.user.userId,
        request.user.role,
        file.folderId.toHexString(),
        "editor"
      );
      if (!hasAccess) {
        return reply
          .status(403)
          .send({ success: false, error: "Access denied" });
      }

      const oldName = file.fileName;
      const newName = fileName.trim();

      const result = await filesCollection().findOneAndUpdate(
        { _id: new ObjectId(id) },
        {
          $set: {
            fileName: newName,
            updatedAt: new Date(),
          },
        },
        { returnDocument: "after" }
      );

      if (!result) {
        return reply
          .status(500)
          .send({ success: false, error: "Failed to rename file" });
      }

      await logActivity({
        userId: request.user.userId,
        userEmail: request.user.email,
        userName: request.user.displayName,
        folderId: file.folderId.toHexString(),
        action: "file.rename",
        details: `Renamed file from "${oldName}" to "${newName}"`,
        filePath: result.relativePath,
      });

      return { success: true, data: toFileMetaResponse(result) };
    }
  );

  // ─── DELETE /files/:id ────────────────────────────────────
  fastify.delete(
    "/files/:id",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      if (!ObjectId.isValid(id)) {
        return reply.status(400).send({ 
          success: false, 
          error: `Invalid file ID format: "${id}"` 
        });
      }

      const file = await filesCollection().findOne({
        _id: new ObjectId(id),
      });
      if (!file) {
        return reply
          .status(404)
          .send({ success: false, error: "File not found" });
      }

      const hasAccess = await checkFolderAccess(
        request.user.userId,
        request.user.role,
        file.folderId.toHexString(),
        "editor"
      );
      if (!hasAccess) {
        return reply
          .status(403)
          .send({ success: false, error: "Access denied" });
      }

      await filesCollection().updateOne(
        { _id: new ObjectId(id) },
        {
          $set: {
            deleted: true,
            updatedAt: new Date(),
          },
        }
      );

      await logActivity({
        userId: request.user.userId,
        userEmail: request.user.email,
        userName: request.user.displayName,
        folderId: file.folderId.toHexString(),
        action: "file.delete",
        details: `Deleted ${file.fileName}`,
        filePath: file.relativePath,
      });

      return { success: true };
    }
  );

  // ─── PATCH /files/:id/move ────────────────────────────────
  fastify.patch(
    "/files/:id/move",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const { targetFolderId } = request.body as { targetFolderId: string };

      if (!ObjectId.isValid(id) || !ObjectId.isValid(targetFolderId)) {
        return reply.status(400).send({ success: false, error: "Invalid IDs" });
      }

      const file = await filesCollection().findOne({ _id: new ObjectId(id) });
      if (!file) {
        return reply.status(404).send({ success: false, error: "File not found" });
      }

      // Check access on source and destination
      const hasSourceAccess = await checkFolderAccess(request.user.userId, request.user.role, file.folderId.toHexString(), "editor");
      const hasDestAccess = await checkFolderAccess(request.user.userId, request.user.role, targetFolderId, "editor");

      if (!hasSourceAccess || !hasDestAccess) {
        return reply.status(403).send({ success: false, error: "Access denied" });
      }

      const targetFolder = await foldersCollection().findOne({ _id: new ObjectId(targetFolderId) });
      if (!targetFolder) {
        return reply.status(404).send({ success: false, error: "Target folder not found" });
      }

      await filesCollection().updateOne(
        { _id: new ObjectId(id) },
        { 
          $set: { 
            folderId: new ObjectId(targetFolderId),
            updatedAt: new Date()
          } 
        }
      );

      await logActivity({
        userId: request.user.userId,
        userEmail: request.user.email,
        userName: request.user.displayName,
        folderId: file.folderId.toHexString(),
        action: "file.move",
        details: `Moved ${file.fileName} to ${targetFolder.name}`,
        filePath: file.relativePath,
      });

      return { success: true };
    }
  );

  // ─── POST /files/:id/copy ─────────────────────────────────
  fastify.post(
    "/files/:id/copy",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const { targetFolderId } = request.body as { targetFolderId: string };

      if (!ObjectId.isValid(id) || !ObjectId.isValid(targetFolderId)) {
        return reply.status(400).send({ success: false, error: "Invalid IDs" });
      }

      const file = await filesCollection().findOne({ _id: new ObjectId(id) });
      if (!file) {
        return reply.status(404).send({ success: false, error: "File not found" });
      }

      const hasDestAccess = await checkFolderAccess(request.user.userId, request.user.role, targetFolderId, "editor");
      if (!hasDestAccess) {
        return reply.status(403).send({ success: false, error: "Access denied" });
      }

      const targetFolder = await foldersCollection().findOne({ _id: new ObjectId(targetFolderId) });
      if (!targetFolder) {
        return reply.status(404).send({ success: false, error: "Target folder not found" });
      }

      const now = new Date();
      const copyId = new ObjectId();
      
      const { _id, ...rest } = file;
      await filesCollection().insertOne({
        ...rest,
        _id: copyId,
        folderId: new ObjectId(targetFolderId),
        fileName: `${file.fileName} (Copy)`,
        createdAt: now,
        updatedAt: now,
        uploadedBy: new ObjectId(request.user.userId),
      });

      await logActivity({
        userId: request.user.userId,
        userEmail: request.user.email,
        userName: request.user.displayName,
        folderId: targetFolderId,
        action: "file.copy",
        details: `Copied ${file.fileName} to ${targetFolder.name}`,
        filePath: file.relativePath,
      });

      return { success: true };
    }
  );
}
