import { FastifyInstance } from "fastify";
import { ObjectId } from "mongodb";
import { messagesCollection } from "../models/message.js";
import { foldersCollection } from "../models/folder.js";

export default async function chatRoutes(app: FastifyInstance) {
  // Get chat messages for a folder
  app.get(
    "/folders/:id/chat", 
    { preHandler: [app.authenticate] },
    async (request, reply) => {
    const { id: folderIdStr } = request.params as { id: string };
    const userId = request.user.userId;

    let folderId: ObjectId;
    try {
      folderId = new ObjectId(folderIdStr);
    } catch {
      return reply.status(400).send({ success: false, error: "Invalid folder ID" });
    }

    // Verify access
    const folder = await foldersCollection().findOne({ _id: folderId });
    if (!folder) {
      return reply.status(404).send({ success: false, error: "Folder not found" });
    }

    const isAdmin = request.user.role === "admin";
    const hasAccess = isAdmin || folder.ownerId.toString() === userId || 
                      folder.permissions.some(p => p.userId.toString() === userId);

    if (!hasAccess) {
      return reply.status(403).send({ success: false, error: "Access denied" });
    }

    const messages = await messagesCollection()
      .find({ folderId })
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();

    return { 
      success: true, 
      data: messages.reverse() 
    };
  });

  // Post a message to a folder chat
  app.post(
    "/folders/:id/chat", 
    { preHandler: [app.authenticate] },
    async (request, reply) => {
    const { id: folderIdStr } = request.params as { id: string };
    const { content, attachments } = request.body as { content: string; attachments?: any[] };
    const userId = request.user.userId;

    if (!content || content.trim().length === 0) {
      if (!attachments || attachments.length === 0) {
        return reply.status(400).send({ success: false, error: "Message content or attachments required" });
      }
    }

    let folderId: ObjectId;
    try {
      folderId = new ObjectId(folderIdStr);
    } catch {
      return reply.status(400).send({ success: false, error: "Invalid folder ID" });
    }

    // Verify access
    const folder = await foldersCollection().findOne({ _id: folderId });
    if (!folder) {
      return reply.status(404).send({ success: false, error: "Folder not found" });
    }

    const isAdmin = request.user.role === "admin";
    const hasAccess = isAdmin || folder.ownerId.toString() === userId || 
                      folder.permissions.some(p => p.userId.toString() === userId);

    if (!hasAccess) {
      return reply.status(403).send({ success: false, error: "Access denied" });
    }

    const newMessage = {
      folderId,
      senderId: new ObjectId(userId),
      senderName: request.user.displayName || request.user.email.split("@")[0],
      senderEmail: request.user.email,
      content: content ? content.trim() : "",
      attachments: attachments || [],
      createdAt: new Date()
    };

    const result = await messagesCollection().insertOne(newMessage);
    
    return { 
      success: true, 
      data: { ...newMessage, _id: result.insertedId } 
    };
  });
}
