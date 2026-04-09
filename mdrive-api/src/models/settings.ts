import { getDb } from "../db.js";

export interface SettingsDoc {
  _id: "global";
  tagline: string;
  updatedAt: Date;
}

export function settingsCollection() {
  return getDb().collection<SettingsDoc>("settings");
}

/**
 * Ensures that the global settings exist in the database.
 */
export async function seedSettings() {
  const settings = await settingsCollection().findOne({ _id: "global" });
  if (!settings) {
    await settingsCollection().insertOne({
      _id: "global",
      tagline: "For Developers",
      updatedAt: new Date(),
    });
    console.log("✓ Global settings seeded with default tagline");
  }
}
