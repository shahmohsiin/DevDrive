import type { FastifyInstance } from "fastify";
import { ObjectId } from "mongodb";
import { activityCollection, toActivityResponse } from "../models/activity";

export default async function activityRoutes(fastify: FastifyInstance) {
  // ─── GET /activity/:folderId ──────────────────────────────
  fastify.get(
    "/activity/:folderId",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { folderId } = request.params as { folderId: string };
      const { page = "1", pageSize = "50" } = request.query as {
        page?: string;
        pageSize?: string;
      };

      const pageNum = Math.max(1, parseInt(page, 10));
      const size = Math.min(100, Math.max(1, parseInt(pageSize, 10)));
      const skip = (pageNum - 1) * size;

      const isAdmin = request.user.role === "admin";
      const filter = isAdmin
        ? { folderId: new ObjectId(folderId) }
        : { 
            folderId: new ObjectId(folderId), 
            userId: new ObjectId(request.user.userId) 
          };

      const [items, total] = await Promise.all([
        activityCollection()
          .find(filter)
          .sort({ timestamp: -1 })
          .skip(skip)
          .limit(size)
          .toArray(),
        activityCollection().countDocuments(filter),
      ]);

      return {
        success: true,
        data: {
          items: items.map(toActivityResponse),
          total,
          page: pageNum,
          pageSize: size,
          hasMore: skip + items.length < total,
        },
      };
    }
  );

  // ─── GET /activity (admin: all activity) ──────────────────
  fastify.get(
    "/activity",
    { preHandler: [fastify.authenticate] },
    async (request) => {
      const { page = "1", pageSize = "50" } = request.query as {
        page?: string;
        pageSize?: string;
      };

      const isAdmin = request.user.role === "admin";
      const pageNum = Math.max(1, parseInt(page, 10));
      const size = Math.min(100, Math.max(1, parseInt(pageSize, 10)));
      const skip = (pageNum - 1) * size;

      const filter = isAdmin
        ? {}
        : { userId: new ObjectId(request.user.userId) };

      const [items, total] = await Promise.all([
        activityCollection()
          .find(filter)
          .sort({ timestamp: -1 })
          .skip(skip)
          .limit(size)
          .toArray(),
        activityCollection().countDocuments(filter),
      ]);

      return {
        success: true,
        data: {
          items: items.map(toActivityResponse),
          total,
          page: pageNum,
          pageSize: size,
          hasMore: skip + items.length < total,
        },
      };
    }
  );
}
