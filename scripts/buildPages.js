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
        js: `
import * as nodeBuffer from 'node:buffer';
import * as nodeCrypto from 'node:crypto';
import * as nodeEvents from 'node:events';
import * as nodeFs from 'node:fs';
import * as nodeHttp from 'node:http';
import * as nodeHttps from 'node:https';
import * as nodeNet from 'node:net';
import * as nodeOs from 'node:os';
import * as nodePath from 'node:path';
import * as nodeProcess from 'node:process';
import * as nodeStream from 'node:stream';
import * as nodeStringDecoder from 'node:string_decoder';
import * as nodeUrl from 'node:url';
import * as nodeUtil from 'node:util';
import * as nodeZlib from 'node:zlib';
import * as nodeAsyncHooks from 'node:async_hooks';

const toCJS = (m) => {
  if (!m || typeof m !== 'object') return m;
  const obj = Object.assign({}, m);
  if (m.default && typeof m.default === 'object') {
    Object.assign(obj, m.default);
  }
  return obj;
};

const cjsBuffer = toCJS(nodeBuffer);
const cjsCrypto = toCJS(nodeCrypto);
const cjsEvents = toCJS(nodeEvents);
const cjsFs = toCJS(nodeFs);
const cjsHttp = toCJS(nodeHttp);
const cjsHttps = toCJS(nodeHttps);
const cjsNet = toCJS(nodeNet);
const cjsOs = toCJS(nodeOs);
const cjsPath = toCJS(nodePath);
const cjsProcess = toCJS(nodeProcess);
const cjsStream = toCJS(nodeStream);
const cjsStringDecoder = toCJS(nodeStringDecoder);
const cjsUrl = toCJS(nodeUrl);
const cjsUtil = toCJS(nodeUtil);
const cjsZlib = toCJS(nodeZlib);
const cjsAsyncHooks = toCJS(nodeAsyncHooks);

const nodeModules = {
  'buffer': cjsBuffer, 'node:buffer': cjsBuffer,
  'crypto': cjsCrypto, 'node:crypto': cjsCrypto,
  'events': cjsEvents, 'node:events': cjsEvents,
  'fs': cjsFs, 'node:fs': cjsFs,
  'http': cjsHttp, 'node:http': cjsHttp,
  'https': cjsHttps, 'node:https': cjsHttps,
  'net': cjsNet, 'node:net': cjsNet,
  'os': cjsOs, 'node:os': cjsOs,
  'path': cjsPath, 'node:path': cjsPath,
  'process': cjsProcess, 'node:process': cjsProcess,
  'stream': cjsStream, 'node:stream': cjsStream,
  'string_decoder': cjsStringDecoder, 'node:string_decoder': cjsStringDecoder,
  'url': cjsUrl, 'node:url': cjsUrl,
  'util': cjsUtil, 'node:util': cjsUtil,
  'zlib': cjsZlib, 'node:zlib': cjsZlib,
  'async_hooks': cjsAsyncHooks, 'node:async_hooks': cjsAsyncHooks,
  'tty': { isatty: () => false, ReadStream: class ReadStream {}, WriteStream: class WriteStream {} },
  'node:tty': { isatty: () => false, ReadStream: class ReadStream {}, WriteStream: class WriteStream {} },
  'supports-color': { stdout: false, stderr: false }
};

const require = (mod) => nodeModules[mod] || {};
`
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
