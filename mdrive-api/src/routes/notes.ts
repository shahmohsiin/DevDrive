import { FastifyInstance } from "fastify";
import { ObjectId } from "mongodb";
import { notesCollection } from "../models/note";
import { foldersCollection } from "../models/folder";

export default async function notesRoutes(app: FastifyInstance) {
  // Get all notes for a folder/context
  app.get(
    "/folders/:id/notes", 
    { preHandler: [app.authenticate] },
    async (request, reply) => {
    const { id: folderIdStr } = request.params as { id: string };
    const userId = request.user.userId;

    let folderId: ObjectId;
    let isRoot = folderIdStr === "root";

    if (isRoot) {
      folderId = new ObjectId(userId);
    } else {
      try {
        folderId = new ObjectId(folderIdStr);
      } catch {
        return reply.status(400).send({ success: false, error: "Invalid folder ID" });
      }
    }

    if (!isRoot) {
      const folder = await foldersCollection().findOne({ _id: folderId });
      if (!folder) return reply.status(404).send({ success: false, error: "Folder not found" });
      
      const isAdmin = request.user.role === "admin";
      const hasAccess = isAdmin || folder.ownerId.toString() === userId || 
                        folder.permissions.some(p => p.userId.toString() === userId);
      if (!hasAccess) return reply.status(403).send({ success: false, error: "Access denied" });
    }

    const notes = await notesCollection()
      .find({ folderId })
      .sort({ createdAt: -1 })
      .toArray();

    return { success: true, data: notes };
  });

  // Create a new note
  app.post(
    "/folders/:id/notes", 
    { preHandler: [app.authenticate] },
    async (request, reply) => {
    const { id: folderIdStr } = request.params as { id: string };
    const { content } = request.body as { content: string };
    const userId = request.user.userId;

    if (!content || content.trim().length === 0) {
      return reply.status(400).send({ success: false, error: "Content is required" });
    }

    let folderId: ObjectId;
    let isRoot = folderIdStr === "root";

    if (isRoot) {
      folderId = new ObjectId(userId);
    } else {
      try {
        folderId = new ObjectId(folderIdStr);
      } catch {
        return reply.status(400).send({ success: false, error: "Invalid folder ID" });
      }
    }

    if (!isRoot) {
      const folder = await foldersCollection().findOne({ _id: folderId });
      if (!folder) return reply.status(404).send({ success: false, error: "Folder not found" });
    }

    const newNote = {
      folderId,
      userId: new ObjectId(userId),
      content: content.trim(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await notesCollection().insertOne(newNote);
    return { success: true, data: { ...newNote, _id: result.insertedId } };
  });

  // Edit a specific note
  app.patch(
    "/notes/:id",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const { content } = request.body as { content: string };
      const userId = request.user.userId;

      if (!content || content.trim().length === 0) {
        return reply.status(400).send({ success: false, error: "Content is required" });
      }

      const note = await notesCollection().findOne({ _id: new ObjectId(id) });
      if (!note) return reply.status(404).send({ success: false, error: "Note not found" });

      // Only owner can edit (or admin)
      if (note.userId.toString() !== userId && request.user.role !== "admin") {
        return reply.status(403).send({ success: false, error: "Access denied" });
      }

      const result = await notesCollection().findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: { content: content.trim(), updatedAt: new Date() } },
        { returnDocument: "after" }
      );

      return { success: true, data: result };
    }
  );

  // Delete a specific note
  app.delete(
    "/notes/:id",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const userId = request.user.userId;

      const note = await notesCollection().findOne({ _id: new ObjectId(id) });
      if (!note) return reply.status(404).send({ success: false, error: "Note not found" });

      if (note.userId.toString() !== userId && request.user.role !== "admin") {
        return reply.status(403).send({ success: false, error: "Access denied" });
      }

      await notesCollection().deleteOne({ _id: new ObjectId(id) });
      return { success: true };
    }
  );
}
