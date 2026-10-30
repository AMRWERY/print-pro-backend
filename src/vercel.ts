import type { IncomingMessage, ServerResponse } from "node:http";

type Handler = (req: IncomingMessage, res: ServerResponse) => void;
let app: Promise<Handler> | undefined;

// Vercel calls this as the request handler. The app is created on the first request, so a configuration mistake
// (a missing JWT_SECRET, say) is reported in the response instead of an opaque "function invocation failed".
// The messages name the setting that is wrong, never its value.
const load = (): Promise<Handler> => (app ??= import("./app").then((m) => m.createApp() as unknown as Handler));

export default async (req: IncomingMessage, res: ServerResponse) => {
  try {
    (await load())(req, res);
  } catch (e) {
    app = undefined; // try again on the next request
    console.error("[startup]", e);
    const message = e instanceof Error ? e.message : "The API could not start.";
    res.statusCode = 500;
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ statusCode: 500, message: `API configuration error: ${message}` }));
  }
};
