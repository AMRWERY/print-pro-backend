import type { RequestHandler, Response } from "express";
import { markDirty, syncAll } from "../db/persist";

/** After any request that changed data and succeeded, write the changes to the database before replying. */
export const persistAfterWrite: RequestHandler = (req, res, next) => {
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") return next();
  const end = res.end.bind(res) as (...args: unknown[]) => Response;
  res.end = ((...args: unknown[]) => {
    if (res.statusCode >= 400) return end(...args);
    // A client never sees a write that isn't durable. If saving fails, say so, and reload from the database next time.
    syncAll()
      .then(() => end(...args))
      .catch((e: unknown) => {
        console.error("[persist] could not save", e);
        markDirty();
        res.statusCode = 500;
        res.removeHeader("content-length");
        res.setHeader("content-type", "application/json; charset=utf-8");
        end(JSON.stringify({ statusCode: 500, message: "Could not save your change. Try again." }));
      });
    return res;
  }) as typeof res.end;
  next();
};
