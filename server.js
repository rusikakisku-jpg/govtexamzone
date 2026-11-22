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

const app = express();

// Trust proxy (required for Pinggy tunnels, Cloudflare, Nginx and secure cookies)
app.set('trust proxy', 1);

// View Engine Setup
app.set('view engine', 'ejs');
app.set('views', path.resolve('views'));

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Static Files
app.use(express.static(path.resolve('public')));
app.use('/uploads', express.static(path.resolve('uploads')));

// Routes
app.use('/admin', adminRoutes);
app.use('/author-portal', authorRoutes);
app.use('/editor-portal', authorRoutes);
app.get('/editor', (req, res) => res.redirect('/author-portal/login'));
app.get('/author', (req, res) => res.redirect('/author-portal/login'));
app.use('/api', apiRoutes);
app.use('/', webRoutes);

// 404 Not Found Handler
app.use((req, res) => {
  res.status(404).render('pages/error', {
    title: '404 - Page Not Found | SarkariResult.com',
    message: 'The page you are looking for does not exist on SarkariResult.com.'
  });
});

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).render('pages/error', {
    title: '500 - Server Error | SarkariResult.com',
    message: 'An internal error occurred. Please try again later.'
  });
});

// Server Initialization
async function startServer() {
  try {
    console.log('🚀 Initializing Sarkari Result Portal...');
    await d1.init();
    await seedDatabase();

    const PORT = config.server.port;
    app.listen(PORT, () => {
      console.log(`=======================================================`);
      console.log(`✅ Sarkari Result Server running on http://localhost:${PORT}`);
      console.log(`🔒 Admin Panel available at http://localhost:${PORT}/admin`);
      console.log(`   Default credentials: user=${config.admin.username}, pass=${config.admin.password}`);
      console.log(`💾 Cloudflare D1 Database: ${d1.isCloudflareD1 ? 'Connected (Remote)' : 'Active (Local SQLite emulation)'}`);
      console.log(`☁️ Cloudflare R2 Storage: ${config.cloudflare.r2.isConfigured ? 'Active (Remote Bucket)' : 'Fallback (Local /uploads)'}`);
      console.log(`=======================================================`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();

module.exports = app;
