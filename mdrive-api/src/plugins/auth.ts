import fp from "fastify-plugin";
import fjwt from "@fastify/jwt";
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { config } from "../config.js";

// Extend Fastify types
declare module "fastify" {
  interface FastifyInstance {
    authenticate: (
      request: FastifyRequest,
      reply: FastifyReply
    ) => Promise<void>;
  }
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { userId: string; email: string; displayName: string; role: string };
    user: { userId: string; email: string; displayName: string; role: string };
  }
}

export default fp(async function authPlugin(fastify: FastifyInstance) {
  await fastify.register(fjwt, {
    secret: config.jwt.secret,
  });

  fastify.decorate(
    "authenticate",
    async function (request: FastifyRequest, reply: FastifyReply) {
      try {
        await request.jwtVerify();
      } catch (err) {
        reply.status(401).send({ success: false, error: "Unauthorized" });
      }
    }
  );
});
