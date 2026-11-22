const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const config = require('./src/config/env');
const d1 = require('./src/db/d1Client');
const seedDatabase = require('./src/db/seed');

const webRoutes = require('./src/routes/webRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const authorRoutes = require('./src/routes/authorRoutes');
const apiRoutes = require('./src/routes/apiRoutes');
const { templateEngine } = require('./src/views/templateEngine');

const app = express();

// Trust proxy (required for Pinggy tunnels, Cloudflare, Nginx and secure cookies)
app.set('trust proxy', 1);

// View Engine Setup
app.engine('ejs', templateEngine);
app.set('view engine', 'ejs');
app.set('views', path.resolve('views'));

// Edge-compatible View lookup: bypass filesystem stat checks for precompiled in-memory templates
const View = app.get('view');
if (View && View.prototype) {
  View.prototype.lookup = function(name) {
    return name.endsWith('.ejs') ? name : name + '.ejs';
  };
}

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Static Files
app.use(express.static(path.resolve('public')));
app.use('/uploads', express.static(path.resolve('uploads')));

// Routes
app.get('/api/seed-db', async (req, res) => {
  try {
    await d1.init();
    await seedDatabase();
    res.json({ success: true, message: 'Database initialized and seeded successfully!' });
  } catch (err) {
    console.error('Seed DB Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});
app.use('/admin', adminRoutes);
app.use('/author-portal', authorRoutes);
app.use('/editor-portal', authorRoutes);
app.get('/editor', (req, res) => res.redirect('/author-portal/login'));
app.get('/author', (req, res) => res.redirect('/author-portal/login'));
app.use('/api', apiRoutes);
app.use('/', webRoutes);

// 404 Not Found Handler
app.use((req, res) => {
  res.status(404);
  res.render('pages/error', {
    title: '404 - Page Not Found | SarkariResult.com',
    message: 'The page you are looking for does not exist on SarkariResult.com.'
  }, (renderErr, html) => {
    if (renderErr) {
      return res.type('text/html').send('<h1>404 - Page Not Found</h1>');
    }
    res.type('text/html').send(html);
  });
});

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500);
  res.render('pages/error', {
    title: '500 - Server Error | Govt Exam Zone',
    message: err.message || 'An internal error occurred. Please try again later.'
  }, (renderErr, html) => {
    if (renderErr) {
      return res.type('text/html').send(`<!DOCTYPE html><html><body><h1>Server Error</h1><p>${err.message || 'Internal Server Error'}</p></body></html>`);
    }
    res.type('text/html').send(html);
  });
});

// Synchronous Server Listen: Only run when running directly under Node.js (e.g. npm start / pm2)
const PORT = config.server.port || 3000;
if (typeof WebSocketPair === 'undefined' && !globalThis.__CF_ENV__ && !globalThis.__CF_PAGES__) {
  app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`✅ Sarkari Result Server running on http://localhost:${PORT}`);
    console.log(`🔒 Admin Panel available at http://localhost:${PORT}/admin`);
    console.log(`   Default credentials: user=${config.admin.username}, pass=${config.admin.password}`);
    console.log(`💾 Cloudflare D1 Database: ${d1.isCloudflareD1 ? 'Connected (Remote)' : 'Active (Local SQLite emulation)'}`);
    console.log(`☁️ Cloudflare R2 Storage: ${config.cloudflare.r2.isConfigured ? 'Active (Remote Bucket)' : 'Fallback (Local /uploads)'}`);
    console.log(`=======================================================`);
  });
}

// Run async database initialization in background without blocking port listener
(async function initDatabase() {
  try {
    console.log('🚀 Initializing Sarkari Result Portal DB...');
    await d1.init();
    console.log('✅ Database schema verified and active.');
    // Only auto-seed local SQLite; native Cloudflare D1 will be seeded without blocking
    if (!d1.isNativeD1) {
      await seedDatabase();
    }
  } catch (err) {
    console.warn('⚠️ Database init notice:', err.message);
  }
})();

module.exports = app;
