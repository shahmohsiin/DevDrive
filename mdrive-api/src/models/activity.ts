import { getDb } from "../db.js";
import { ObjectId } from "mongodb";
import type { ActivityLog, ActivityAction } from "@mdrive/shared";

export interface ActivityDoc {
  _id: ObjectId;
  userId: ObjectId;
  userEmail: string;
  userName?: string;
  folderId?: ObjectId;
  action: ActivityAction;
  details: string;
  filePath?: string;
  timestamp: Date;
}

export function activityCollection() {
  return getDb().collection<ActivityDoc>("activity");
}

export function toActivityResponse(doc: ActivityDoc): ActivityLog {
  return {
    _id: doc._id.toHexString(),
    userId: doc.userId.toHexString(),
    userEmail: doc.userEmail,
    userName: doc.userName,
    folderId: doc.folderId?.toHexString(),
    action: doc.action,
    details: doc.details,
    filePath: doc.filePath,
    timestamp: doc.timestamp.toISOString(),
  };
}

/**
 * Helper to log an activity — fire and forget
 */
export async function logActivity(params: {
  userId: string;
  userEmail: string;
  userName?: string;
  folderId?: string;
  action: ActivityAction;
  details: string;
  filePath?: string;
}): Promise<void> {
  try {
    await activityCollection().insertOne({
      _id: new ObjectId(),
      userId: new ObjectId(params.userId),
      userEmail: params.userEmail,
      userName: params.userName,
      folderId: params.folderId
        ? new ObjectId(params.folderId)
        : undefined,
      action: params.action,
      details: params.details,
      filePath: params.filePath,
      timestamp: new Date(),
    });
  } catch (err) {
    console.error("Failed to log activity:", err);
  }
}
