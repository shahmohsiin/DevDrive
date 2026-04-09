import { MongoClient, Db } from "mongodb";
import { config } from "./config.js";

let client: MongoClient | null = null;
let db: Db | null = null;

export async function connectDb(): Promise<Db> {
  if (db) return db;

  client = new MongoClient(config.mongodb.uri, {
    maxPoolSize: 10,
    minPoolSize: 2,
    maxIdleTimeMS: 30_000,
  });

  await client.connect();
  db = client.db();

  console.log("✓ Connected to MongoDB");
  return db;
}

export function getDb(): Db {
  if (!db) throw new Error("Database not connected. Call connectDb() first.");
  return db;
}

export async function closeDb(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
  }
}
