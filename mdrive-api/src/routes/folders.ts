import type { FastifyInstance } from "fastify";
import { ObjectId } from "mongodb";
import { nanoid } from "nanoid";
import { foldersCollection, toFolderResponse } from "../models/folder";
import { logActivity } from "../models/activity";
import { requireAdmin, requireEditor } from "../plugins/rbac";

export default async function folderRoutes(fastify: FastifyInstance) {
  // ─── POST /folders (admin/editor creates a folder) ────────
  fastify.post(
    "/folders",
    { preHandler: [fastify.authenticate, requireEditor] },
    async (request, reply) => {
      const { name, description, parentId } = request.body as {
        name: string;
        description?: string;
        parentId?: string;
      };

      if (!name || name.trim().length === 0) {
        return reply
          .status(400)
          .send({ success: false, error: "Folder name is required" });
      }

      const now = new Date();
      let b2Prefix = `folders/${nanoid(12)}/`;

      // If there's a parent, we might want to inherit its prefix or permissions
      // For now, we'll keep unique prefixes but link the parentId
      const parentObjectId = parentId ? new ObjectId(parentId) : null;
      
      if (parentObjectId) {
        const parent = await foldersCollection().findOne({ _id: parentObjectId });
        if (!parent) {
          return reply.status(404).send({ success: false, error: "Parent folder not found" });
        }
      }

      const result = await foldersCollection().insertOne({
        _id: new ObjectId(),
        name: name.trim(),
        description: description?.trim() || "",
        ownerId: new ObjectId(request.user.userId),
        parentId: parentObjectId,
        b2Prefix,
        permissions: [],
        createdAt: now,
        updatedAt: now,
      });

      const folder = await foldersCollection().findOne({
        _id: result.insertedId,
      });

      if (!folder) {
        return reply
          .status(500)
          .send({ success: false, error: "Failed to create folder" });
      }

      await logActivity({
        userId: request.user.userId,
        userEmail: request.user.email,
        userName: request.user.displayName,
        folderId: folder._id.toHexString(),
        action: "folder.create",
        details: `Created folder "${folder.name}"`,
      });

      return { success: true, data: toFolderResponse(folder) };
    }
  );

  // ─── GET /folders (list folders user has access to) ───────
  fastify.get(
    "/folders",
    { preHandler: [fastify.authenticate] },
    async (request) => {
      const userId = new ObjectId(request.user.userId);
      const isAdmin = request.user.role === "admin";
      const { parentId } = request.query as { parentId?: string };

      const parentFilter = parentId ? new ObjectId(parentId) : null;

      // Admin sees all folders at this level; others see only explicitly assigned folders at this level
      // Note: In a full implementation, we'd check recursive permissions.
      const filter: any = { parentId: parentFilter };
      
      if (!isAdmin) {
        filter["permissions.userId"] = userId;
      }

      const folders = await foldersCollection()
        .find(filter)
        .sort({ updatedAt: -1 })
        .toArray();

      return {
        success: true,
        data: folders.map(toFolderResponse),
      };
    }
  );

  // ─── GET /folders/:id ─────────────────────────────────────
  fastify.get(
    "/folders/:id",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      const folder = await foldersCollection().findOne({
        _id: new ObjectId(id),
      });

      if (!folder) {
        return reply
          .status(404)
          .send({ success: false, error: "Folder not found" });
      }

      // Check access
      const userId = request.user.userId;
      const isAdmin = request.user.role === "admin";
      const hasPermission = folder.permissions.some(
        (p) => p.userId.toHexString() === userId
      );

      if (!isAdmin && !hasPermission) {
        return reply
          .status(403)
          .send({ success: false, error: "Access denied" });
      }

      return { success: true, data: toFolderResponse(folder) };
    }
  );

  // ─── PUT /folders/:id ─────────────────────────────────────
  fastify.put(
    "/folders/:id",
    { preHandler: [fastify.authenticate, requireEditor] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const { name, description } = request.body as {
        name?: string;
        description?: string;
      };

      const update: Record<string, unknown> = { updatedAt: new Date() };
      if (name) update.name = name.trim();
      if (description !== undefined) update.description = description.trim();

      const result = await foldersCollection().findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: update },
        { returnDocument: "after" }
      );

      if (!result) {
        return reply
          .status(404)
          .send({ success: false, error: "Folder not found" });
      }

      await logActivity({
        userId: request.user.userId,
        userEmail: request.user.email,
        userName: request.user.displayName,
        folderId: id,
        action: "folder.update",
        details: `Updated folder "${result.name}"`,
      });

      return { success: true, data: toFolderResponse(result) };
    }
  );

  // ─── PUT /folders/:id/permissions (admin-only) ────────────
  fastify.put(
    "/folders/:id/permissions",
    { preHandler: [fastify.authenticate, requireAdmin] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const { permissions } = request.body as {
        permissions: Array<{ userId: string; access: "editor" | "viewer" }>;
      };

      if (!Array.isArray(permissions)) {
        return reply
          .status(400)
          .send({ success: false, error: "permissions must be an array" });
      }

      const mappedPermissions = permissions.map((p) => ({
        userId: new ObjectId(p.userId),
        access: p.access,
      }));

      const result = await foldersCollection().findOneAndUpdate(
        { _id: new ObjectId(id) },
        {
          $set: {
            permissions: mappedPermissions,
            updatedAt: new Date(),
          },
        },
        { returnDocument: "after" }
      );

      if (!result) {
        return reply
          .status(404)
          .send({ success: false, error: "Folder not found" });
      }

      await logActivity({
        userId: request.user.userId,
        userEmail: request.user.email,
        userName: request.user.displayName,
        folderId: id,
        action: "permission.update",
        details: `Updated permissions for folder "${result.name}" (${permissions.length} entries)`,
      });

      return { success: true, data: toFolderResponse(result) };
    }
  );

  // ─── DELETE /folders/:id (admin-only) ─────────────────────
  fastify.delete(
    "/folders/:id",
    { preHandler: [fastify.authenticate, requireAdmin] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const rootId = new ObjectId(id);

      const folder = await foldersCollection().findOne({ _id: rootId });
      if (!folder) {
        return reply.status(404).send({ success: false, error: "Folder not found" });
      }

      // Recursive function to find all subfolder IDs
      const findAllDescendants = async (parentId: ObjectId): Promise<ObjectId[]> => {
        const children = await foldersCollection().find({ parentId }).toArray();
        let ids = children.map(c => c._id);
        for (const child of children) {
          const descendantIds = await findAllDescendants(child._id);
          ids = [...ids, ...descendantIds];
        }
        return ids;
      };

      const allFolderIds = [rootId, ...(await findAllDescendants(rootId))];

      // Delete all folders in the collection
      await foldersCollection().deleteMany({ _id: { $in: allFolderIds } });

      // Note: Ideally, we should also delete files associated with these folders
      // but the current filesCollection logic is separate. 
      // For this implementation, we ensure the folder structure is cleaned up.

      await logActivity({
        userId: request.user.userId,
        userEmail: request.user.email,
        userName: request.user.displayName,
        folderId: id,
        action: "folder.delete",
        details: `Deleted folder "${folder.name}" and all its descendants (${allFolderIds.length} total folders removed)`,
      });

      return { success: true };
    }
  );

  // ─── PATCH /folders/:id/move ──────────────────────────────
  fastify.patch(
    "/folders/:id/move",
    { preHandler: [fastify.authenticate, requireEditor] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const { targetParentId } = request.body as { targetParentId: string | null };

      if (!ObjectId.isValid(id)) {
        return reply.status(400).send({ success: false, error: "Invalid folder ID" });
      }

      const folder = await foldersCollection().findOne({ _id: new ObjectId(id) });
      if (!folder) {
        return reply.status(404).send({ success: false, error: "Folder not found" });
      }

      // Prevent moving to self or descendants
      if (targetParentId) {
        if (targetParentId === id) {
          return reply.status(400).send({ success: false, error: "Cannot move a folder into itself" });
        }
        
        // Circular check: Is targetParentId a descendant of id?
        const checkCircular = async (pid: string): Promise<boolean> => {
          const p = await foldersCollection().findOne({ _id: new ObjectId(pid) });
          if (!p || !p.parentId) return false;
          if (p.parentId.toHexString() === id) return true;
          return await checkCircular(p.parentId.toHexString());
        };

        if (await checkCircular(targetParentId)) {
          return reply.status(400).send({ success: false, error: "Cannot move a folder into its own descendant" });
        }
      }

      const targetParentObjectId = targetParentId ? new ObjectId(targetParentId) : null;

      await foldersCollection().updateOne(
        { _id: new ObjectId(id) },
        { 
          $set: { 
            parentId: targetParentObjectId,
            updatedAt: new Date()
          } 
        }
      );

      await logActivity({
        userId: request.user.userId,
        userEmail: request.user.email,
        userName: request.user.displayName,
        folderId: id,
        action: "folder.move",
        details: `Moved folder "${folder.name}" to ${targetParentId ? "new parent" : "root"}`,
      });

      return { success: true };
    }
  );
}
