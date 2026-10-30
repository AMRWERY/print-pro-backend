import { createApp } from "./app";

// Vercel calls this Express app as the request handler. The database loads on the first request of each instance.
export default createApp();
