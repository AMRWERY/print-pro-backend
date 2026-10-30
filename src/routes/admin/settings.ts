import { Router } from "express";
import { readSettings, rotateSecret, validateSettings, writeSettings } from "~/data/admin-settings";
import { handler, httpError } from "../../lib/http";

export const settingsRouter = Router();

settingsRouter.get(
  "/",
  handler(() => readSettings()),
);

// Replaces all settings at once; the whole object is checked first, so a bad value saves nothing.
settingsRouter.put(
  "/",
  handler((req) => {
    const next = validateSettings(req.body);
    if (!next) throw httpError(400, "Invalid settings");
    return writeSettings(next);
  }),
);

// Issues a new webhook signing secret. Only its last four characters are ever returned.
settingsRouter.post(
  "/rotate-secret",
  handler(() => rotateSecret()),
);
