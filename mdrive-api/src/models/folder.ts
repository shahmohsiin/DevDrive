import { getDb } from "../db.js";
import { ObjectId } from "mongodb";
import type { Folder, FolderPermission } from "@mdrive/shared";

export interface FolderDoc {
  _id: ObjectId;
  name: string;
  description: string;
  ownerId: ObjectId;
  parentId: ObjectId | null;
  b2Prefix: string;
  permissions: Array<{
    userId: ObjectId;
    access: "editor" | "viewer";
  }>;
  createdAt: Date;
  updatedAt: Date;
}

export function foldersCollection() {
  return getDb().collection<FolderDoc>("folders");
}

export function toFolderResponse(doc: FolderDoc): Folder {
  return {
    _id: doc._id.toHexString(),
    name: doc.name,
    description: doc.description,
    ownerId: doc.ownerId.toHexString(),
    parentId: doc.parentId?.toHexString(),
    b2Prefix: doc.b2Prefix,
    permissions: doc.permissions.map((p) => ({
      userId: p.userId.toHexString(),
      access: p.access,
    })),
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}
