import type { RequestHandler } from "express";
import { boot } from "../boot";
import { refresh } from "../db/persist";
import { httpError } from "../lib/http";

const MAX_HOLD_MS = 30_000;
let tail: Promise<void> = Promise.resolve();

/**
 * One request at a time per instance, and each starts from fresh data. Domain logic mutates shared in-memory
 * state synchronously, so running requests one after another keeps it consistent; `refresh()` first pulls in
 * anything another instance wrote. (Other instances run their own queue; the database version keeps them in step.)
 */
export const gate: RequestHandler = (req, res, next) => {
  let release!: () => void;
  const done = new Promise<void>((resolve) => (release = resolve));
  const previous = tail;
  tail = previous.then(() => done);

  res.once("close", release); // finished, or the client went away
  void previous.then(async () => {
    if (req.socket.destroyed) return release(); // gave up while waiting
    const timer = setTimeout(release, MAX_HOLD_MS); // never let one stuck request block the rest
    res.once("close", () => clearTimeout(timer));
    try {
      await boot();
      await refresh();
      next();
    } catch (e) {
      console.error("[gate]", e);
      next(httpError(503, "The database is unavailable. Try again shortly."));
    }
  });
};
