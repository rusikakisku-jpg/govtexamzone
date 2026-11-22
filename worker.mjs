import { httpServerHandler } from "cloudflare:node";
import { env } from "cloudflare:workers";

// Expose Cloudflare environment bindings to global scope for D1 and R2
globalThis.__CF_ENV__ = env;
if (env) {
  if (env.DB) globalThis.DB = env.DB;
  if (env.STORAGE_BUCKET) globalThis.STORAGE_BUCKET = env.STORAGE_BUCKET;
}

// Dynamically import Express server so global bindings and port 3000 listener are active
await import("./server.js");

const handler = httpServerHandler({ port: 3000 });

export default {
  async fetch(request, env, ctx) {
    try {
      globalThis.__CF_ENV__ = env;
      if (env) {
        if (env.DB) globalThis.DB = env.DB;
        if (env.STORAGE_BUCKET) globalThis.STORAGE_BUCKET = env.STORAGE_BUCKET;
      }

      // Check if this request can be served as a static asset via env.ASSETS (Pages / Workers Assets)
      const url = new URL(request.url);
      const isAsset = /\.[a-zA-Z0-9]+$/.test(url.pathname) ||
                      url.pathname.startsWith('/css/') ||
                      url.pathname.startsWith('/js/') ||
                      url.pathname.startsWith('/images/') ||
                      url.pathname === '/robots.txt' ||
                      url.pathname === '/sitemap.xml' ||
                      url.pathname === '/manifest.json' ||
                      url.pathname === '/favicon.ico';

      if (isAsset && env && env.ASSETS) {
        try {
          const assetRes = await env.ASSETS.fetch(request);
          if (assetRes && assetRes.status !== 404) {
            return assetRes;
          }
        } catch (assetErr) {
          // Fall through to express handler
        }
      }

      return await handler.fetch(request, env, ctx);
    } catch (err) {
      console.error("Worker fetch exception:", err);
      return new Response(
        "Govt Exam Zone - Worker Exception:\n" + (err.stack || err.message || String(err)),
        {
          status: 500,
          headers: { "content-type": "text/plain; charset=utf-8" }
        }
      );
    }
  }
};
