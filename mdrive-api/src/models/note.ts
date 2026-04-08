import { ObjectId } from "mongodb";
import { getDb } from "../db.js";

export interface NoteDoc {
  _id?: ObjectId;
  folderId: ObjectId;
  userId: ObjectId;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export function notesCollection() {
  return getDb().collection<NoteDoc>("notes");
}
