import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config";
import { get } from "../db";
import { httpError } from "../lib/http";

export type Role = "admin" | "customer";
export interface AuthUser {
  id: string;
  email: string;
  role: Role;
}

declare module "express-serve-static-core" {
  interface Request {
    user?: AuthUser;
  }
}

export const signToken = (u: AuthUser) =>
  jwt.sign({ email: u.email, role: u.role }, config.jwtSecret, {
    subject: u.id,
    expiresIn: config.jwtTtl as jwt.SignOptions["expiresIn"],
    algorithm: "HS256",
  });


/** Attaches `req.user` when a valid Bearer token is present. The user is re-read, so deleted accounts lose access at once. */
export const authenticate: RequestHandler = async (req, _res, next) => {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    try {
      const payload = jwt.verify(header.slice(7), config.jwtSecret, { algorithms: ["HS256"] });
      const id = typeof payload === "object" ? payload.sub : undefined;
      const row = id ? await get<AuthUser>("SELECT id, email, role FROM users WHERE id = ?", [id]) : undefined;
      if (row) req.user = row;
    } catch {
      // invalid or expired token: treated as signed out
    }
  }
  next();
};

export const requireAuth: RequestHandler = (req, _res, next) =>
  req.user ? next() : next(httpError(401, "Sign in required"));

export const requireRole =
  (role: Role): RequestHandler =>
  (req, _res, next) => {
    if (!req.user) return next(httpError(401, "Sign in required"));
    if (req.user.role !== role) return next(httpError(403, "Not allowed"));
    next();
  };
