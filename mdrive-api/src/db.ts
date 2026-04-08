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

  // Create indexes
  await Promise.all([
    db.collection("users").createIndex({ email: 1 }, { unique: true }),
    db.collection("folders").createIndex({ ownerId: 1 }),
    db.collection("folders").createIndex({ "permissions.userId": 1 }),
    db.collection("files").createIndex({ folderId: 1, relativePath: 1 }),
    db.collection("files").createIndex({ folderId: 1, deleted: 1 }),
    db.collection("activity").createIndex({ folderId: 1, timestamp: -1 }),
    db.collection("activity").createIndex({ userId: 1, timestamp: -1 }),
    db.collection("messages").createIndex({ folderId: 1, createdAt: -1 }),
    db.collection("notes").createIndex({ folderId: 1, createdAt: -1 }),
  ]);

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('SIGTERM signal received: closing MongoDB client');
    await closeDb();
    process.exit(0);
  });
  process.on('SIGINT', async () => {
    console.log('SIGINT signal received: closing MongoDB client');
    await closeDb();
    process.exit(0);
  });

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
