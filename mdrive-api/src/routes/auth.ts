import type { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import { usersCollection, toUserResponse } from "../models/user";
import { logActivity } from "../models/activity";
import { requireAdmin } from "../plugins/rbac";
import { ACCESS_TOKEN_EXPIRY, REFRESH_TOKEN_EXPIRY } from "../shared";

export default async function authRoutes(fastify: FastifyInstance) {
  // ─── POST /auth/login ─────────────────────────────────────
  fastify.post("/auth/login", async (request, reply) => {
    const { email, password } = request.body as {
      email: string;
      password: string;
    };

    if (!email || !password) {
      return reply
        .status(400)
        .send({ success: false, error: "Email and password are required" });
    }

    const user = await usersCollection().findOne({
      email: email.toLowerCase().trim(),
    });

    if (!user) {
      return reply
        .status(401)
        .send({ success: false, error: "Invalid email or password" });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return reply
        .status(401)
        .send({ success: false, error: "Invalid email or password" });
    }

    const payload = {
      userId: user._id.toHexString(),
      email: user.email,
      displayName: user.displayName,
      role: user.role,
    };

    const accessToken = fastify.jwt.sign(payload, {
      expiresIn: ACCESS_TOKEN_EXPIRY,
    });
    const refreshToken = fastify.jwt.sign(payload, {
      expiresIn: REFRESH_TOKEN_EXPIRY,
    });

    return {
      success: true,
      data: {
        user: toUserResponse(user),
        tokens: { accessToken, refreshToken },
      },
    };
  });

  // ─── POST /auth/refresh ───────────────────────────────────
  fastify.post("/auth/refresh", async (request, reply) => {
    const { refreshToken } = request.body as { refreshToken: string };

    if (!refreshToken) {
      return reply
        .status(400)
        .send({ success: false, error: "Refresh token is required" });
    }

    try {
      const decoded = fastify.jwt.verify<{
        userId: string;
        email: string;
        role: string;
      }>(refreshToken);

      // Verify user still exists
      const user = await usersCollection().findOne({
        _id: new ObjectId(decoded.userId),
      });

      if (!user) {
        return reply
          .status(401)
          .send({ success: false, error: "User not found" });
      }

      const payload = {
        userId: user._id.toHexString(),
        email: user.email,
        displayName: user.displayName,
        role: user.role,
      };

      const newAccessToken = fastify.jwt.sign(payload, {
        expiresIn: ACCESS_TOKEN_EXPIRY,
      });
      const newRefreshToken = fastify.jwt.sign(payload, {
        expiresIn: REFRESH_TOKEN_EXPIRY,
      });

      return {
        success: true,
        data: {
          user: toUserResponse(user),
          tokens: {
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
          },
        },
      };
    } catch {
      return reply
        .status(401)
        .send({ success: false, error: "Invalid refresh token" });
    }
  });

  // ─── GET /auth/me ─────────────────────────────────────────
  fastify.get(
    "/auth/me",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const user = await usersCollection().findOne({
        _id: new ObjectId(request.user.userId),
      });

      if (!user) {
        return reply
          .status(404)
          .send({ success: false, error: "User not found" });
      }

      return { success: true, data: toUserResponse(user) };
    }
  );

  // ─── POST /auth/register (admin-only, or first user becomes admin) ──
  fastify.post("/auth/register", async (request, reply) => {
    const { email, password, displayName, role } = request.body as {
      email: string;
      password: string;
      displayName: string;
      role?: "admin" | "editor" | "viewer";
    };

    if (!email || !password || !displayName) {
      return reply.status(400).send({
        success: false,
        error: "Email, password, and displayName are required",
      });
    }

    if (password.length < 6) {
      return reply.status(400).send({
        success: false,
        error: "Password must be at least 6 characters",
      });
    }

    const userCount = await usersCollection().countDocuments();
    const isFirstUser = userCount === 0;

    // If not the first user, require admin authentication
    if (!isFirstUser) {
      try {
        await request.jwtVerify();
        if (request.user.role !== "admin") {
          return reply.status(403).send({
            success: false,
            error: "Only admins can create new accounts",
          });
        }
      } catch {
        return reply.status(401).send({
          success: false,
          error: "Authentication required. Only admins can create accounts.",
        });
      }
    }

    // Check for existing user
    const existing = await usersCollection().findOne({
      email: email.toLowerCase().trim(),
    });

    if (existing) {
      return reply
        .status(409)
        .send({ success: false, error: "Email already registered" });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const now = new Date();
    const assignedRole = isFirstUser ? "admin" : role || "viewer";

    const result = await usersCollection().insertOne({
      _id: new ObjectId(),
      email: email.toLowerCase().trim(),
      displayName,
      passwordHash,
      role: assignedRole,
      createdAt: now,
      updatedAt: now,
    });

    const newUser = await usersCollection().findOne({ _id: result.insertedId });
    if (!newUser) {
      return reply
        .status(500)
        .send({ success: false, error: "Failed to create user" });
    }

    // Log activity
    const actorId = isFirstUser
      ? newUser._id.toHexString()
      : request.user.userId;
    const actorEmail = isFirstUser ? newUser.email : request.user.email;

    await logActivity({
      userId: actorId,
      userEmail: actorEmail,
      userName: isFirstUser ? newUser.displayName : request.user.displayName,
      action: "user.create",
      details: `Created user ${newUser.email} with role ${newUser.role}${isFirstUser ? " (first user, auto-admin)" : ""}`,
    });

    // For first user, also return tokens so they can start using the app
    if (isFirstUser) {
      const payload = {
        userId: newUser._id.toHexString(),
        email: newUser.email,
        displayName: newUser.displayName,
        role: newUser.role,
      };
      const accessToken = fastify.jwt.sign(payload, {
        expiresIn: ACCESS_TOKEN_EXPIRY,
      });
      const refreshToken = fastify.jwt.sign(payload, {
        expiresIn: REFRESH_TOKEN_EXPIRY,
      });

      return {
        success: true,
        data: {
          user: toUserResponse(newUser),
          tokens: { accessToken, refreshToken },
        },
      };
    }

    return { success: true, data: toUserResponse(newUser) };
  });

  // ─── GET /auth/users (admin-only: list all users) ─────────
  fastify.get(
    "/auth/users",
    { preHandler: [fastify.authenticate, requireAdmin] },
    async () => {
      const users = await usersCollection()
        .find({}, { projection: { passwordHash: 0 } })
        .sort({ createdAt: -1 })
        .toArray();

      return {
        success: true,
        data: users.map(toUserResponse),
      };
    }
  );

  // ─── DELETE /auth/users/:id (admin-only) ──────────────────
  fastify.delete(
    "/auth/users/:id",
    { preHandler: [fastify.authenticate, requireAdmin] },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      if (id === request.user.userId) {
        return reply
          .status(400)
          .send({ success: false, error: "Cannot delete yourself" });
      }

      const result = await usersCollection().deleteOne({
        _id: new ObjectId(id),
      });

      if (result.deletedCount === 0) {
        return reply
          .status(404)
          .send({ success: false, error: "User not found" });
      }

      await logActivity({
        userId: request.user.userId,
        userEmail: request.user.email,
        action: "user.create",
        details: `Deleted user ${id}`,
      });

      return { success: true };
    }
  );

  // ─── PATCH /auth/password ─────────────────────────────────
  fastify.patch(
    "/auth/password",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { oldPassword, newPassword } = request.body as {
        oldPassword?: string;
        newPassword: string;
      };

      if (!newPassword || newPassword.length < 6) {
        return reply.status(400).send({
          success: false,
          error: "New password must be at least 6 characters",
        });
      }

      const user = await usersCollection().findOne({
        _id: new ObjectId(request.user.userId),
      });

      if (!user) {
        return reply.status(404).send({ success: false, error: "User not found" });
      }

      // Verify old password
      if (oldPassword) {
        const valid = await bcrypt.compare(oldPassword, user.passwordHash);
        if (!valid) {
          return reply
            .status(401)
            .send({ success: false, error: "Invalid current password" });
        }
      }

      const passwordHash = await bcrypt.hash(newPassword, 12);
      await usersCollection().updateOne(
        { _id: user._id },
        { $set: { passwordHash, updatedAt: new Date() } }
      );

      await logActivity({
        userId: request.user.userId,
        userEmail: request.user.email,
        userName: request.user.displayName,
        action: "user.security",
        details: `Updated password for ${user.email}`,
      });

      return { success: true };
    }
  );
}
