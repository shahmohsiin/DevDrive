import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import authPlugin from "./plugins/auth.js";
import authRoutes from "./routes/auth.js";
import folderRoutes from "./routes/folders.js";
import fileRoutes from "./routes/files.js";
import activityRoutes from "./routes/activity.js";
import chatRoutes from "./routes/chat.js";
import notesRoutes from "./routes/notes.js";
import settingsRoutes from "./routes/settings.js";
import { seedSettings } from "./models/settings.js";
import { connectDb } from "./db.js";
import dns from 'dns';
dns.setServers(['8.8.8.8', '1.1.1.1']);


export async function buildApp() {
  const app = Fastify({
    logger: true, // Use standard minimal JSON logging which Vercel dashboard handles perfectly
  });

  // ─── Plugins ───────────────────────────────────────────────
  await app.register(cors, {
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  });

  await app.register(rateLimit, {
    max: 100,
    timeWindow: "1 minute",
    keyGenerator: (request) => {
      return request.ip;
    },
  });

  await app.register(authPlugin);

  // ─── Database ──────────────────────────────────────────────
  await connectDb();
  await seedSettings();

  // ─── Routes ────────────────────────────────────────────────
  await app.register(authRoutes);
  await app.register(folderRoutes);
  await app.register(fileRoutes);
  await app.register(activityRoutes);
  await app.register(chatRoutes);
  await app.register(notesRoutes);
  await app.register(settingsRoutes);

  // ─── Health Check ──────────────────────────────────────────
  app.get("/health", async () => {
    return { status: "ok", timestamp: new Date().toISOString() };
  });

  // ─── Global Error Handler ─────────────────────────────────
  app.setErrorHandler((error: any, _request: any, reply: any) => {
    app.log.error(error);
    const statusCode = error.statusCode ?? 500;
    reply.status(statusCode).send({
      success: false,
      error:
        statusCode >= 500 ? "Internal server error" : error.message,
    });
  });

  return app;
}
