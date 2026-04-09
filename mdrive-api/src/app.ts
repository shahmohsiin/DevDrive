import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import authPlugin from "./plugins/auth";
import authRoutes from "./routes/auth";
import folderRoutes from "./routes/folders";
import fileRoutes from "./routes/files";
import activityRoutes from "./routes/activity";
import chatRoutes from "./routes/chat";
import notesRoutes from "./routes/notes";
import { connectDb } from "./db";
import dns from 'dns';
dns.setServers(['8.8.8.8', '1.1.1.1']);


export async function buildApp() {
  const app = Fastify({
    logger: process.env.NODE_ENV === "development" 
      ? { transport: { target: "pino-pretty", options: { colorize: true } } }
      : true,
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

  // ─── Routes ────────────────────────────────────────────────
  await app.register(authRoutes);
  await app.register(folderRoutes);
  await app.register(fileRoutes);
  await app.register(activityRoutes);
  await app.register(chatRoutes);
  await app.register(notesRoutes);

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
