import { getDb } from "../db";
import { ObjectId } from "mongodb";
import type { User } from "../shared";

export interface UserDoc {
  _id: ObjectId;
  email: string;
  displayName: string;
  passwordHash: string;
  role: "admin" | "editor" | "viewer";
  createdAt: Date;
  updatedAt: Date;
}

export function usersCollection() {
  return getDb().collection<UserDoc>("users");
}

export function toUserResponse(doc: UserDoc): User {
  return {
    _id: doc._id.toHexString(),
    email: doc.email,
    displayName: doc.displayName,
    role: doc.role,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}
