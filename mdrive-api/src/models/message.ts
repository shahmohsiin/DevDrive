import { ObjectId } from "mongodb";
import { getDb } from "../db";

export interface ChatAttachment {
  fileId: string;
  fileName: string;
  size: number;
  mimeType: string;
}

export interface FolderMessageDoc {
  _id?: ObjectId;
  folderId: ObjectId;
  senderId: ObjectId;
  senderName: string;
  senderEmail: string;
  content: string;
  attachments?: ChatAttachment[];
  createdAt: Date;
}

export function messagesCollection() {
  return getDb().collection<FolderMessageDoc>("messages");
}
