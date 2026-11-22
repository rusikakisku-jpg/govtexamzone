const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

// 1. Build in-memory EJS templates first
console.log('⚡ Step 1: Pre-compiling EJS templates...');
require('./buildTemplates');

// 2. Prepare dist directory
console.log('📁 Step 2: Preparing dist directory for Cloudflare Pages...');
const distDir = path.resolve('dist');
const publicDir = path.resolve('public');

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Helper to copy directory recursively
function copyDirSync(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Copy public assets to dist
copyDirSync(publicDir, distDir);
console.log('✅ Static assets copied from public/ to dist/');

// 3. Create _routes.json for Cloudflare Pages optimization
const routesConfig = {
  version: 1,
  include: ["/*"],
  exclude: [
    "/css/*",
    "/js/*",
    "/images/*",
    "/uploads/*",
    "/manifest.json",
    "/robots.txt",
    "/sitemap.xml",
    "/favicon.ico"
  ]
};

fs.writeFileSync(
  path.join(distDir, '_routes.json'),
  JSON.stringify(routesConfig, null, 2),
  'utf8'
);
fs.writeFileSync(
  path.join(publicDir, '_routes.json'),
  JSON.stringify(routesConfig, null, 2),
  'utf8'
);
console.log('✅ Created _routes.json in dist/ and public/');

// 4. Bundle worker.mjs into dist/_worker.js using esbuild
console.log('📦 Step 3: Bundling worker for Cloudflare Pages Advanced Mode (_worker.js)...');
(async function bundleWorker() {
  try {
    const outPath = path.join(distDir, '_worker.js');
    await esbuild.build({
      entryPoints: [path.resolve('worker.mjs')],
      bundle: true,
      platform: 'node',
      target: 'es2022',
      format: 'esm',
      outfile: outPath,
      external: [
        'cloudflare:node',
        'cloudflare:workers'
      ],
      banner: {
        js: "import { createRequire } from 'node:module'; const require = createRequire('file:///worker.js');"
      },
      alias: {
        'tty': path.resolve('src/shims/tty.js'),
        'node:tty': path.resolve('src/shims/tty.js'),
        'supports-color': path.resolve('src/shims/supports-color.js'),
        'async_hooks': 'node:async_hooks',
        'crypto': 'node:crypto',
        'path': 'node:path',
        'fs': 'node:fs',
        'buffer': 'node:buffer',
        'stream': 'node:stream',
        'util': 'node:util',
        'events': 'node:events',
        'os': 'node:os',
        'url': 'node:url',
        'http': 'node:http',
        'https': 'node:https',
        'net': 'node:net',
        'zlib': 'node:zlib',
        'string_decoder': 'node:string_decoder',
        'querystring': 'node:querystring',
        'child_process': 'node:child_process',
        'http2': 'node:http2',
        'process': 'node:process'
      },
      legalComments: 'none'
    });

    const stat = fs.statSync(outPath);
    console.log(`✅ Successfully bundled ${outPath} (${(stat.size / 1024 / 1024).toFixed(2)} MB)`);

    // Also mirror _worker.js to public/ and root for maximum Pages preset compatibility
    fs.copyFileSync(outPath, path.join(publicDir, '_worker.js'));
    fs.copyFileSync(outPath, path.resolve('_worker.js'));
    console.log('✅ Mirrored _worker.js to public/ and root ./');
    console.log('🎉 Cloudflare Pages build completed successfully!');
  } catch (err) {
    console.error('❌ Cloudflare Pages worker bundling failed:', err);
    process.exit(1);
  }
})();
