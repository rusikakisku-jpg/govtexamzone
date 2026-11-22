import { httpServerHandler } from "cloudflare:node";
import { env } from "cloudflare:workers";

// Polyfill global __dirname and __filename for Cloudflare Workers ES Module environment
const cwd = typeof process !== 'undefined' && process.cwd ? process.cwd() : '/';
if (typeof globalThis.__dirname === 'undefined') {
  globalThis.__dirname = cwd;
}
if (typeof globalThis.__filename === 'undefined') {
  globalThis.__filename = `${cwd}/worker.mjs`;
}

// Expose Cloudflare environment bindings to global scope for D1 and R2
globalThis.__CF_ENV__ = env;
if (env && env.DB) {
  globalThis.DB = env.DB;
}
if (env && env.STORAGE_BUCKET) {
  globalThis.STORAGE_BUCKET = env.STORAGE_BUCKET;
}

// Import Express server
import "./server.js";

// Export Cloudflare Worker HTTP bridge on port 3000
export default httpServerHandler({ port: 3000 });
