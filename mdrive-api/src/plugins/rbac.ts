import type { FastifyRequest, FastifyReply } from "fastify";
import type { Role } from "@mdrive/shared";

/**
 * Creates a preHandler that checks if the authenticated user has one of the allowed roles.
 * Must be used after the `authenticate` preHandler.
 */
export function requireRole(...allowedRoles: Role[]) {
  return async function (request: FastifyRequest, reply: FastifyReply) {
    const user = request.user;
    if (!user || !allowedRoles.includes(user.role as Role)) {
      reply.status(403).send({
        success: false,
        error: "Forbidden: insufficient permissions",
      });
    }
  };
}

/**
 * Admin-only access guard
 */
export const requireAdmin = requireRole("admin");

/**
 * Admin or editor access guard
 */
export const requireEditor = requireRole("admin", "editor");
