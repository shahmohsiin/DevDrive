import { getDb } from "../db.js";
import { ObjectId } from "mongodb";
import type { FileMeta, FileRevision } from "@mdrive/shared";

export interface FileRevisionDoc {
  version: number;
  b2Key: string;
  sha256: string;
  size: number;
  uploadedBy: ObjectId;
  uploadedAt: Date;
}

export interface FileMetaDoc {
  _id: ObjectId;
  folderId: ObjectId;
  relativePath: string;
  fileName: string;
  mimeType: string;
  currentVersion: number;
  sha256: string;
  size: number;
  b2Key: string;
  revisions: FileRevisionDoc[];
  deleted: boolean;
  uploadedBy: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export function filesCollection() {
  return getDb().collection<FileMetaDoc>("files");
}

function toRevisionResponse(doc: FileRevisionDoc): FileRevision {
  return {
    version: doc.version,
    b2Key: doc.b2Key,
    sha256: doc.sha256,
    size: doc.size,
    uploadedBy: doc.uploadedBy.toHexString(),
    uploadedAt: doc.uploadedAt.toISOString(),
  };
}

export function toFileMetaResponse(doc: FileMetaDoc): FileMeta {
  return {
    _id: doc._id.toHexString(),
    folderId: doc.folderId.toHexString(),
    relativePath: doc.relativePath,
    fileName: doc.fileName,
    mimeType: doc.mimeType,
    currentVersion: doc.currentVersion,
    sha256: doc.sha256,
    size: doc.size,
    b2Key: doc.b2Key,
    revisions: doc.revisions.map(toRevisionResponse),
    deleted: doc.deleted,
    uploadedBy: doc.uploadedBy.toHexString(),
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}
