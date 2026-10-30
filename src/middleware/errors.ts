import type { ErrorRequestHandler, RequestHandler } from "express";
import { config } from "../config";
import { HttpError } from "../lib/http";

export const notFound: RequestHandler = (_req, res) => {
  res.status(404).json({ statusCode: 404, message: "Not found" });
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (res.headersSent) return;
  if (err instanceof HttpError) {
    res.status(err.statusCode).json({ statusCode: err.statusCode, message: err.message });
    return;
  }
  // body-parser errors (malformed JSON, payload too large) carry their own status
  const status = typeof err?.status === "number" && err.status >= 400 && err.status < 500 ? err.status : 500;
  if (status === 500) console.error(err);
  res.status(status).json({
    statusCode: status,
    message: status === 500 && config.production ? "Internal server error" : (err?.message ?? "Error"),
  });
};
