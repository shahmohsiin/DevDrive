import type { FastifyInstance } from "fastify";
import { settingsCollection } from "../models/settings.js";
import { requireAdmin } from "../plugins/rbac.js";
import { logActivity } from "../models/activity.js";

export default async function settingsRoutes(fastify: FastifyInstance) {
  // ─── GET /settings (public) ────────────────────────────────
  fastify.get("/settings", async () => {
    const settings = await settingsCollection().findOne({ _id: "global" });
    return {
      success: true,
      data: {
        tagline: settings?.tagline || "For Developers"
      }
    };
  });

  // ─── PATCH /settings (admin only) ──────────────────────────
  fastify.patch(
    "/settings",
    { preHandler: [fastify.authenticate, requireAdmin] },
    async (request, reply) => {
      const { tagline } = request.body as { tagline: string };

      if (!tagline || tagline.trim().length === 0) {
        return reply
          .status(400)
          .send({ success: false, error: "Tagline is required" });
      }

      const result = await settingsCollection().updateOne(
        { _id: "global" },
        { 
          $set: { 
            tagline: tagline.trim(), 
            updatedAt: new Date() 
          } 
        },
        { upsert: true }
      );

      await logActivity({
        userId: request.user.userId,
        userEmail: request.user.email,
        userName: request.user.displayName,
        action: "system.update",
        details: `Updated brand tagline to: ${tagline}`,
      });

      return { success: true, data: { tagline: tagline.trim() } };
    }
  );
}
