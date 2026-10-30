import type { RequestHandler, Response } from "express";
import { syncAll } from "../db/persist";

/** After any request that changed data and succeeded, write the changes to SQLite. */
export const persistAfterWrite: RequestHandler = (req, res, next) => {
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") return next();
  const end = res.end.bind(res) as (...args: unknown[]) => Response;
  // Persist before the response leaves, so a client never sees a write that isn't durable.
  res.end = ((...args: unknown[]) => {
    if (res.statusCode < 400) syncAll();
    return end(...args);
  }) as typeof res.end;
  next();
};
