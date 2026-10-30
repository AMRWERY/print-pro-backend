import type { NextFunction, Request, RequestHandler, Response } from "express";

export class HttpError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
  }
}

/** Mirrors the mock server's `createError`, so route code reads the same. */
export const httpError = (statusCode: number, message: string) => new HttpError(statusCode, message);

/** Lets async handlers throw: Express 5 forwards rejected promises, this just types the handler. */
export const handler =
  (fn: (req: Request, res: Response, next: NextFunction) => unknown | Promise<unknown>): RequestHandler =>
  async (req, res, next) => {
    try {
      const out = await fn(req, res, next);
      if (res.headersSent) return;
      if (out === undefined) res.status(res.statusCode === 200 ? 204 : res.statusCode).end();
      else res.json(out);
    } catch (e) {
      next(e);
    }
  };

export const param = (req: Request, name: string): string => {
  const v = req.params[name];
  return typeof v === "string" ? v : "";
};
