import { httpServerHandler } from "cloudflare:node";
import { env } from "cloudflare:workers";

// Expose Cloudflare environment bindings to global scope for D1 and R2
globalThis.__CF_ENV__ = env;
if (env) {
  if (env.DB) globalThis.DB = env.DB;
  if (env.STORAGE_BUCKET) globalThis.STORAGE_BUCKET = env.STORAGE_BUCKET;
}

// Dynamically import Express server so global bindings are active
await import("./server.js");

// Export Cloudflare Worker HTTP bridge on port 3000
export default httpServerHandler({ port: 3000 });
