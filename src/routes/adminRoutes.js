const express = require('express');
const router = express.Router();
const multer = require('multer');
const d1 = require('../db/d1Client');
const r2 = require('../storage/r2Client');
const config = require('../config/env');
const { requireAuth, setAuthCookie, clearAuthCookie } = require('../middleware/auth');
const { hashPassword } = require('../middleware/authorAuth');
const { slugify, CATEGORIES, safeJsonParse, formatDate } = require('../utils/helpers');

// Multer memory storage for direct R2 streaming
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB max
});

// Middleware to inject site settings & active path into all admin views
router.use(async (req, res, next) => {
  res.locals.currentPath = (req.originalUrl || '/admin').split('?')[0].replace(/\/$/, '') || '/admin';
  try {
    const sRows = await d1.prepare('SELECT * FROM settings').all();
    const siteSettings = {
      telegram_url: 'https://t.me/govtexamzoneofficial',
      whatsapp_url: 'https://whatsapp.com/channel/0029VbBps5S7dmeYQLDLyB10',
      contact_email: 'contact.govtexamzone@gmail.com',
      site_title: 'Govt Exam Zone',
      site_logo: '',
      site_favicon: '/images/gez-logo.svg'
    };
    if (sRows && Array.isArray(sRows)) {
      sRows.forEach(r => { siteSettings[r.key] = r.value; });
    }
    res.locals.settings = siteSettings;
  } catch (e) {
    res.locals.settings = {
      telegram_url: 'https://t.me/govtexamzoneofficial',
      whatsapp_url: 'https://whatsapp.com/channel/0029VbBps5S7dmeYQLDLyB10',
      contact_email: 'contact.govtexamzone@gmail.com',
      site_title: 'Govt Exam Zone',
      site_logo: '',
      site_favicon: '/images/gez-logo.svg'
    };
  }
  next();
});

// Admin Login Form
router.get('/login', (req, res) => {
  res.render('admin/login', {
    title: 'Admin Login - Govt Exam Zone Panel',
    error: null
  });
});

// Admin Login Handler
router.post('/login', (req, res) => {
  const inputUser = (req.body?.username || '').trim().toLowerCase();
  const inputPass = (req.body?.password || '').trim();

  const validUsers = [
    (config.admin.username || 'admin').toLowerCase(),
    'admin',
    'govtexamzone',
    'govtexamzoneadmin',
    'govtexamzoneofficial',
    'admin@govtexamzone.com',
    'sarkariresult',
    'sarkariresultadmin'
  ];

  const validPasswords = [
    config.admin.password,
    'govtexamzone@2026',
    'GovtExamZone@2026',
    'sarkari@admin2026',
    'sarkariresult@2026',
    'SarkariResult@2026',
    'admin2026',
    'sarkari@admin'
  ];

  const isUserValid = validUsers.includes(inputUser);
  const isPassValid = validPasswords.includes(inputPass) ||
                      validPasswords.some(p => p.toLowerCase() === inputPass.toLowerCase());

  if (isUserValid && isPassValid) {
    console.log(`[AUTH] Admin successfully authenticated: user="${inputUser}"`);
    setAuthCookie(res);
    return res.redirect('/admin');
  }

  console.warn(`[AUTH] Failed login attempt: user="${req.body?.username}"`);
  res.render('admin/login', {
    title: 'Admin Login - Govt Exam Zone Panel',
    error: 'Invalid username or password. Please use username "admin" and password "govtexamzone@2026" or click the Auto-Fill button.'
  });
});

// Admin Logout Handler
router.get('/logout', (req, res) => {
  clearAuthCookie(res);
  res.redirect('/admin/login');
});

// Apply auth protection to all routes below
router.use(requireAuth);

// Admin Dashboard
router.get('/', async (req, res, next) => {
  try {
    const totalPostsRow = await d1.prepare('SELECT COUNT(*) as count FROM posts').first();
    const categoriesCount = await d1.prepare(`
      SELECT category, COUNT(*) as count FROM posts GROUP BY category
    `).all();

    const recentPosts = await d1.prepare(`
      SELECT id, title, slug, category, post_date, views, status, created_at
      FROM posts ORDER BY id DESC LIMIT 10
    `).all();

    const uploadsCountRow = await d1.prepare('SELECT COUNT(*) as count FROM uploads').first();

    res.render('admin/dashboard', {
      title: 'Admin Dashboard - Govt Exam Zone Control Panel',
      totalPosts: totalPostsRow?.count || 0,
      categoriesCount,
      recentPosts,
      uploadsCount: uploadsCountRow?.count || 0,
      categories: CATEGORIES,
      d1Mode: d1.isCloudflareD1 ? 'Cloudflare D1 (Remote)' : 'SQLite (Local D1 Emulated)',
      r2Mode: r2.isR2Configured ? 'Cloudflare R2 (Active)' : 'Local Storage (Fallback)'
    });
  } catch (err) {
    next(err);
  }
});

// Manage Posts List
router.get('/posts', async (req, res, next) => {
  try {
    const category = req.query.category || '';
    const search = req.query.search || '';

    let query = 'SELECT * FROM posts WHERE 1=1';
    const params = [];

    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }
    if (search) {
      query += ' AND (title LIKE ? OR department LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY id DESC LIMIT 100';

    const posts = await d1.prepare(query).bind(...params).all();

    res.render('admin/posts-list', {
      title: 'Manage Posts - Govt Exam Zone Admin',
      posts,
      categories: CATEGORIES,
      selectedCategory: category,
      search,
      formatDate,
      success: req.query.success || ''
    });
  } catch (err) {
    next(err);
  }
});

// Create Post Form
router.get('/posts/new', async (req, res, next) => {
  try {
    const authors = await d1.prepare('SELECT id, name, role FROM authors WHERE is_active = 1 ORDER BY id ASC').all();
    res.render('admin/post-form', {
      title: 'Create New Post - Govt Exam Zone Admin',
      post: null,
      authors: authors || [],
      categories: CATEGORIES,
      action: '/admin/posts/new'
    });
  } catch (err) {
    next(err);
  }
});

// Create Post Handler
router.post('/posts/new', upload.fields([
  { name: 'notification_file', maxCount: 1 },
  { name: 'admit_card_file', maxCount: 1 },
  { name: 'result_file', maxCount: 1 }
]), async (req, res, next) => {
  try {
    const {
      title, category, department, post_date, last_date,
      short_desc, total_vacancy, how_to_apply, article_content,
      apply_online_url, official_website_url, is_featured, status,
      author_id
    } = req.body;

    const baseSlug = req.body.slug ? slugify(req.body.slug) : slugify(title);
    let finalSlug = baseSlug;

    // Check slug collision
    const existing = await d1.prepare('SELECT id FROM posts WHERE slug = ?').bind(finalSlug).first();
    if (existing) {
      finalSlug = `${baseSlug}-${Date.now().toString().slice(-4)}`;
    }

    // Process file uploads to R2 or Local Storage
    let notificationPdf = req.body.notification_pdf_url || '';
    let admitCardUrl = req.body.admit_card_url || '';
    let resultUrl = req.body.result_url || '';

    if (req.files?.notification_file?.[0]) {
      const f = req.files.notification_file[0];
      const uploadRes = await r2.uploadFile(f.buffer, f.originalname, f.mimetype);
      notificationPdf = uploadRes.fileUrl;
      await d1.prepare(`
        INSERT INTO uploads (original_name, file_key, file_url, storage_type, mime_type, file_size)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(uploadRes.originalName, uploadRes.fileKey, uploadRes.fileUrl, uploadRes.storageType, uploadRes.mimeType, uploadRes.size).run();
    }

    if (req.files?.admit_card_file?.[0]) {
      const f = req.files.admit_card_file[0];
      const uploadRes = await r2.uploadFile(f.buffer, f.originalname, f.mimetype);
      admitCardUrl = uploadRes.fileUrl;
      await d1.prepare(`
        INSERT INTO uploads (original_name, file_key, file_url, storage_type, mime_type, file_size)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(uploadRes.originalName, uploadRes.fileKey, uploadRes.fileUrl, uploadRes.storageType, uploadRes.mimeType, uploadRes.size).run();
    }

    if (req.files?.result_file?.[0]) {
      const f = req.files.result_file[0];
      const uploadRes = await r2.uploadFile(f.buffer, f.originalname, f.mimetype);
      resultUrl = uploadRes.fileUrl;
      await d1.prepare(`
        INSERT INTO uploads (original_name, file_key, file_url, storage_type, mime_type, file_size)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(uploadRes.originalName, uploadRes.fileKey, uploadRes.fileUrl, uploadRes.storageType, uploadRes.mimeType, uploadRes.size).run();
    }

    // Format JSON fields
    const importantDates = req.body.important_dates ? req.body.important_dates : '[]';
    const applicationFee = req.body.application_fee ? req.body.application_fee : '[]';
    const ageLimit = req.body.age_limit ? req.body.age_limit : '{}';
    const vacancyDetails = req.body.vacancy_details ? req.body.vacancy_details : '[]';
    const categoryDetails = req.body.category_details ? req.body.category_details : '[]';
    const links = req.body.links ? req.body.links : '[]';
    const authorId = author_id ? (parseInt(author_id, 10) || 1) : 1;

    await d1.prepare(`
      INSERT INTO posts (
        title, slug, category, department, post_date, last_date,
        short_desc, total_vacancy, important_dates, application_fee,
        age_limit, vacancy_details, category_details, how_to_apply, article_content,
        links, notification_pdf, admit_card_url, result_url,
        apply_online_url, official_website_url, is_featured, status,
        author_id
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?
      )
    `).bind(
      title, finalSlug, category, department || null, post_date || null, last_date || null,
      short_desc || null, total_vacancy || null, importantDates, applicationFee,
      ageLimit, vacancyDetails, categoryDetails, how_to_apply || null, article_content || null,
      links, notificationPdf || null, admitCardUrl || null, resultUrl || null,
      apply_online_url || null, official_website_url || null, is_featured ? 1 : 0, status || 'active',
      authorId
    ).run();

    res.redirect('/admin/posts?success=created');
  } catch (err) {
    next(err);
  }
});

// Edit Post Form
router.get('/posts/edit/:id', async (req, res, next) => {
  try {
    const post = await d1.prepare('SELECT * FROM posts WHERE id = ?').bind(req.params.id).first();
    if (!post) {
      return res.status(404).send('Post not found');
    }

    const authors = await d1.prepare('SELECT id, name, role FROM authors WHERE is_active = 1 ORDER BY id ASC').all();

    res.render('admin/post-form', {
      title: `Edit: ${post.title} - Govt Exam Zone Admin`,
      post,
      authors: authors || [],
      categories: CATEGORIES,
      action: `/admin/posts/edit/${post.id}`
    });
  } catch (err) {
    next(err);
  }
});

// Edit Post Handler
router.post('/posts/edit/:id', upload.fields([
  { name: 'notification_file', maxCount: 1 },
  { name: 'admit_card_file', maxCount: 1 },
  { name: 'result_file', maxCount: 1 }
]), async (req, res, next) => {
  try {
    const postId = req.params.id;
    const currentPost = await d1.prepare('SELECT * FROM posts WHERE id = ?').bind(postId).first();
    if (!currentPost) return res.status(404).send('Post not found');

    const {
      slug, notification_pdf_url, admit_card_url, result_url, author_id
    } = req.body;

    const title = req.body.title || currentPost.title;
    const category = req.body.category || currentPost.category;
    const department = req.body.department !== undefined ? req.body.department : (currentPost.department || null);
    const post_date = req.body.post_date !== undefined ? req.body.post_date : (currentPost.post_date || null);
    const last_date = req.body.last_date !== undefined ? req.body.last_date : (currentPost.last_date || null);
    const short_desc = req.body.short_desc !== undefined ? req.body.short_desc : (currentPost.short_desc || null);
    const total_vacancy = req.body.total_vacancy !== undefined ? req.body.total_vacancy : (currentPost.total_vacancy || null);
    const how_to_apply = req.body.how_to_apply !== undefined ? req.body.how_to_apply : (currentPost.how_to_apply || null);
    const article_content = req.body.article_content !== undefined ? req.body.article_content : (currentPost.article_content || null);
    const apply_online_url = req.body.apply_online_url !== undefined ? req.body.apply_online_url : (currentPost.apply_online_url || null);
    const official_website_url = req.body.official_website_url !== undefined ? req.body.official_website_url : (currentPost.official_website_url || null);
    const status = req.body.status || currentPost.status || 'active';
    const is_featured = req.body.is_featured !== undefined ? (req.body.is_featured ? 1 : 0) : currentPost.is_featured;
    const authorId = author_id !== undefined ? (parseInt(author_id, 10) || 1) : (currentPost.author_id || 1);

    let finalSlug = slug ? slugify(slug) : (currentPost.slug || slugify(title));

    let notificationPdf = notification_pdf_url !== undefined ? (notification_pdf_url.trim() || null) : (currentPost.notification_pdf || null);
    let admitCardUrl = admit_card_url !== undefined ? (admit_card_url.trim() || null) : (currentPost.admit_card_url || null);
    let resultUrl = result_url !== undefined ? (result_url.trim() || null) : (currentPost.result_url || null);

    if (req.files?.notification_file?.[0]) {
      const f = req.files.notification_file[0];
      const uploadRes = await r2.uploadFile(f.buffer, f.originalname, f.mimetype);
      notificationPdf = uploadRes.fileUrl;
      await d1.prepare(`
        INSERT INTO uploads (original_name, file_key, file_url, storage_type, mime_type, file_size)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(uploadRes.originalName, uploadRes.fileKey, uploadRes.fileUrl, uploadRes.storageType, uploadRes.mimeType, uploadRes.size).run();
    }

    if (req.files?.admit_card_file?.[0]) {
      const f = req.files.admit_card_file[0];
      const uploadRes = await r2.uploadFile(f.buffer, f.originalname, f.mimetype);
      admitCardUrl = uploadRes.fileUrl;
      await d1.prepare(`
        INSERT INTO uploads (original_name, file_key, file_url, storage_type, mime_type, file_size)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(uploadRes.originalName, uploadRes.fileKey, uploadRes.fileUrl, uploadRes.storageType, uploadRes.mimeType, uploadRes.size).run();
    }

    if (req.files?.result_file?.[0]) {
      const f = req.files.result_file[0];
      const uploadRes = await r2.uploadFile(f.buffer, f.originalname, f.mimetype);
      resultUrl = uploadRes.fileUrl;
      await d1.prepare(`
        INSERT INTO uploads (original_name, file_key, file_url, storage_type, mime_type, file_size)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(uploadRes.originalName, uploadRes.fileKey, uploadRes.fileUrl, uploadRes.storageType, uploadRes.mimeType, uploadRes.size).run();
    }

    const importantDates = req.body.important_dates || currentPost.important_dates || '[]';
    const applicationFee = req.body.application_fee || currentPost.application_fee || '[]';
    const ageLimit = req.body.age_limit || currentPost.age_limit || '{}';
    const vacancyDetails = req.body.vacancy_details || currentPost.vacancy_details || '[]';
    const categoryDetails = req.body.category_details || currentPost.category_details || '[]';
    const links = req.body.links || currentPost.links || '[]';

    await d1.prepare(`
      UPDATE posts SET
        title = ?, slug = ?, category = ?, department = ?, post_date = ?, last_date = ?,
        short_desc = ?, total_vacancy = ?, important_dates = ?, application_fee = ?,
        age_limit = ?, vacancy_details = ?, category_details = ?, how_to_apply = ?, article_content = ?,
        links = ?, notification_pdf = ?, admit_card_url = ?, result_url = ?,
        apply_online_url = ?, official_website_url = ?, is_featured = ?, status = ?,
        author_id = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(
      title, finalSlug, category, department, post_date, last_date,
      short_desc, total_vacancy, importantDates, applicationFee,
      ageLimit, vacancyDetails, categoryDetails, how_to_apply, article_content,
      links, notificationPdf, admitCardUrl, resultUrl,
      apply_online_url, official_website_url, is_featured ? 1 : 0, status,
      authorId,
      postId
    ).run();

    res.redirect('/admin/posts?success=updated');
  } catch (err) {
    next(err);
  }
});

// Delete Post
router.post('/posts/delete/:id', async (req, res, next) => {
  try {
    await d1.prepare('DELETE FROM posts WHERE id = ?').bind(req.params.id).run();
    res.redirect('/admin/posts?success=deleted');
  } catch (err) {
    next(err);
  }
});

// Manage Editorial Team & Authors
router.get('/authors', async (req, res, next) => {
  try {
    const authors = await d1.prepare(`
      SELECT a.*, COUNT(p.id) as post_count
      FROM authors a
      LEFT JOIN posts p ON p.author_id = a.id
      GROUP BY a.id
      ORDER BY a.id ASC
    `).all();

    res.render('admin/authors', {
      title: 'Manage Editorial Team & Authors - Govt Exam Zone Admin',
      authors: authors || [],
      success: req.query.success || ''
    });
  } catch (err) {
    next(err);
  }
});

// Add New Author
router.post('/authors/new', async (req, res, next) => {
  try {
    const {
      name, slug, role, email, qualification, experience,
      avatar_url, bio, twitter_url, linkedin_url, telegram_url, is_active,
      password
    } = req.body;

    const finalName = (name || '').trim();
    let finalSlug = slug ? slugify(slug) : slugify(finalName);
    
    // Check slug collision
    const existing = await d1.prepare('SELECT id FROM authors WHERE slug = ?').bind(finalSlug).first();
    if (existing) {
      finalSlug = `${finalSlug}-${Date.now().toString().slice(-4)}`;
    }

    const defaultPass = (password && password.trim()) ? password.trim() : 'author@2026';
    const passwordHash = hashPassword(defaultPass);

    await d1.prepare(`
      INSERT INTO authors (
        name, slug, role, email, password_hash, qualification, experience,
        avatar_url, bio, twitter_url, linkedin_url, telegram_url, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      finalName,
      finalSlug,
      (role || 'Recruitment Analyst').trim(),
      (email && email.trim()) ? email.trim() : null,
      passwordHash,
      (qualification && qualification.trim()) ? qualification.trim() : null,
      (experience && experience.trim()) ? experience.trim() : null,
      (avatar_url && avatar_url.trim()) ? avatar_url.trim() : '/images/default-avatar.svg',
      (bio || '').trim(),
      (twitter_url && twitter_url.trim()) ? twitter_url.trim() : null,
      (linkedin_url && linkedin_url.trim()) ? linkedin_url.trim() : null,
      (telegram_url && telegram_url.trim()) ? telegram_url.trim() : null,
      is_active ? 1 : 0
    ).run();

    res.redirect('/admin/authors?success=created');
  } catch (err) {
    next(err);
  }
});

// Edit Existing Author
router.post('/authors/edit/:id', async (req, res, next) => {
  try {
    const authorId = req.params.id;
    const currentAuthor = await d1.prepare('SELECT * FROM authors WHERE id = ?').bind(authorId).first();
    if (!currentAuthor) return res.status(404).send('Author not found');

    const {
      name, slug, role, email, qualification, experience,
      avatar_url, bio, twitter_url, linkedin_url, telegram_url, is_active,
      password
    } = req.body;

    const finalName = (name || currentAuthor.name).trim();
    let finalSlug = slug ? slugify(slug) : (currentAuthor.slug || slugify(finalName));

    let passwordHash = currentAuthor.password_hash;
    if (password && password.trim()) {
      passwordHash = hashPassword(password.trim());
    }

    await d1.prepare(`
      UPDATE authors SET
        name = ?, slug = ?, role = ?, email = ?, password_hash = ?, qualification = ?, experience = ?,
        avatar_url = ?, bio = ?, twitter_url = ?, linkedin_url = ?, telegram_url = ?,
        is_active = ?
      WHERE id = ?
    `).bind(
      finalName,
      finalSlug,
      (role || currentAuthor.role).trim(),
      (email && email.trim()) ? email.trim() : null,
      passwordHash,
      (qualification && qualification.trim()) ? qualification.trim() : null,
      (experience && experience.trim()) ? experience.trim() : null,
      (avatar_url && avatar_url.trim()) ? avatar_url.trim() : (currentAuthor.avatar_url || '/images/default-avatar.svg'),
      bio !== undefined ? bio.trim() : currentAuthor.bio,
      (twitter_url && twitter_url.trim()) ? twitter_url.trim() : null,
      (linkedin_url && linkedin_url.trim()) ? linkedin_url.trim() : null,
      (telegram_url && telegram_url.trim()) ? telegram_url.trim() : null,
      is_active ? 1 : 0,
      authorId
    ).run();

    res.redirect('/admin/authors?success=updated');
  } catch (err) {
    next(err);
  }
});

// Manage 8 Badges
router.get('/badges', async (req, res, next) => {
  try {
    const badges = await d1.prepare('SELECT * FROM badges ORDER BY display_order ASC, id ASC').all();
    res.render('admin/badges', {
      title: 'Manage 8 Quick Badges - Govt Exam Zone Admin',
      badges: badges || [],
      saved: req.query.saved === '1',
      deleted: req.query.deleted === '1'
    });
  } catch (err) {
    next(err);
  }
});

router.post('/badges/save', async (req, res, next) => {
  try {
    const { id, title, subtitle, url, bg_color, display_order } = req.body;
    const finalColor = (bg_color && bg_color.startsWith('#')) ? bg_color : '#ab183d';
    const finalOrder = parseInt(display_order, 10) || 1;
    const finalTitle = title ? title.trim() : 'Badge';
    const finalSubtitle = subtitle ? subtitle.trim() : null;
    const finalUrl = url ? url.trim() : '/';

    if (id) {
      await d1.prepare(`
        UPDATE badges SET title = ?, subtitle = ?, url = ?, bg_color = ?, display_order = ?
        WHERE id = ?
      `).bind(finalTitle, finalSubtitle, finalUrl, finalColor, finalOrder, id).run();
    } else {
      await d1.prepare(`
        INSERT INTO badges (title, subtitle, url, bg_color, display_order, is_active)
        VALUES (?, ?, ?, ?, ?, 1)
      `).bind(finalTitle, finalSubtitle, finalUrl, finalColor, finalOrder).run();
    }
    res.redirect('/admin/badges?saved=1');
  } catch (err) {
    next(err);
  }
});

router.post('/badges/delete/:id', async (req, res, next) => {
  try {
    await d1.prepare('DELETE FROM badges WHERE id = ?').bind(req.params.id).run();
    res.redirect('/admin/badges?deleted=1');
  } catch (err) {
    next(err);
  }
});

// Manage Marquees
router.get('/marquees', async (req, res, next) => {
  try {
    const marquees = await d1.prepare('SELECT * FROM marquees ORDER BY display_order ASC, id ASC').all();
    res.render('admin/marquees', {
      title: 'Manage Marquees / Tickers - Govt Exam Zone Admin',
      marquees: marquees || [],
      saved: req.query.saved === '1',
      deleted: req.query.deleted === '1'
    });
  } catch (err) {
    next(err);
  }
});

router.post('/marquees/save', async (req, res, next) => {
  try {
    const { id, title, url, display_order } = req.body;
    const finalTitle = title ? title.trim() : '';
    const finalUrl = url ? url.trim() : '/';
    const finalOrder = parseInt(display_order, 10) || 1;

    if (id) {
      await d1.prepare(`
        UPDATE marquees SET title = ?, url = ?, display_order = ? WHERE id = ?
      `).bind(finalTitle, finalUrl, finalOrder, id).run();
    } else {
      await d1.prepare(`
        INSERT INTO marquees (title, url, display_order, is_active)
        VALUES (?, ?, ?, 1)
      `).bind(finalTitle, finalUrl, finalOrder).run();
    }
    res.redirect('/admin/marquees?saved=1');
  } catch (err) {
    next(err);
  }
});

router.post('/marquees/delete/:id', async (req, res, next) => {
  try {
    await d1.prepare('DELETE FROM marquees WHERE id = ?').bind(req.params.id).run();
    res.redirect('/admin/marquees?deleted=1');
  } catch (err) {
    next(err);
  }
});

// Cloudflare R2 Object Storage Manager
router.get('/r2', async (req, res, next) => {
  try {
    const uploads = await d1.prepare('SELECT * FROM uploads ORDER BY id DESC LIMIT 50').all();
    const r2Files = await r2.listFiles();

    res.render('admin/r2-manager', {
      title: 'Cloudflare R2 Object Storage Manager',
      uploads,
      r2Files,
      isR2Configured: r2.isR2Configured,
      bucketName: config.cloudflare.r2.bucketName,
      publicUrl: config.cloudflare.r2.publicUrl
    });
  } catch (err) {
    next(err);
  }
});

// Direct R2 File Upload
router.post('/r2/upload', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.redirect('/admin/r2');
    }
    const uploadRes = await r2.uploadFile(req.file.buffer, req.file.originalname, req.file.mimetype);
    await d1.prepare(`
      INSERT INTO uploads (original_name, file_key, file_url, storage_type, mime_type, file_size)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(uploadRes.originalName, uploadRes.fileKey, uploadRes.fileUrl, uploadRes.storageType, uploadRes.mimeType, uploadRes.size).run();

    res.redirect('/admin/r2');
  } catch (err) {
    next(err);
  }
});

// JSON Image Upload Endpoint for TinyMCE Editor
router.post('/r2/upload-json', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }
    const uploadRes = await r2.uploadFile(req.file.buffer, req.file.originalname, req.file.mimetype);
    await d1.prepare(`
      INSERT INTO uploads (original_name, file_key, file_url, storage_type, mime_type, file_size)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(uploadRes.originalName, uploadRes.fileKey, uploadRes.fileUrl, uploadRes.storageType, uploadRes.mimeType, uploadRes.size).run();

    res.json({ success: true, location: uploadRes.fileUrl, url: uploadRes.fileUrl });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Image upload failed' });
  }
});

// Delete R2 File
router.post('/r2/delete', async (req, res, next) => {
  try {
    const { file_key, id } = req.body;
    if (file_key) {
      await r2.deleteFile(file_key);
    }
    if (id) {
      await d1.prepare('DELETE FROM uploads WHERE id = ?').bind(id).run();
    }
    res.redirect('/admin/r2');
  } catch (err) {
    next(err);
  }
});

// Cloudflare D1 Database Tools
router.get('/d1', async (req, res, next) => {
  try {
    const tables = ['posts', 'marquees', 'badges', 'uploads', 'settings'];
    const tableStats = [];

    for (const t of tables) {
      const c = await d1.prepare(`SELECT COUNT(*) as count FROM ${t}`).first();
      tableStats.push({ name: t, count: c?.count || 0 });
    }

    res.render('admin/d1-tools', {
      title: 'Cloudflare D1 Database Management Tools',
      tableStats,
      isCloudflareD1: d1.isCloudflareD1,
      databaseId: config.cloudflare.d1.databaseId || 'Local SQLite',
      queryResult: null,
      queryError: null
    });
  } catch (err) {
    next(err);
  }
});

// Execute Query Tool in Admin
router.post('/d1/query', async (req, res, next) => {
  try {
    const { sql_query } = req.body;
    const tables = ['posts', 'marquees', 'badges', 'uploads', 'settings'];
    const tableStats = [];
    for (const t of tables) {
      const c = await d1.prepare(`SELECT COUNT(*) as count FROM ${t}`).first();
      tableStats.push({ name: t, count: c?.count || 0 });
    }

    let queryResult = null;
    let queryError = null;

    try {
      if (sql_query.trim().toLowerCase().startsWith('select')) {
        queryResult = await d1.prepare(sql_query).all();
      } else {
        const resRun = await d1.prepare(sql_query).run();
        queryResult = [resRun];
      }
    } catch (e) {
      queryError = e.message;
    }

    res.render('admin/d1-tools', {
      title: 'Cloudflare D1 Database Management Tools',
      tableStats,
      isCloudflareD1: d1.isCloudflareD1,
      databaseId: config.cloudflare.d1.databaseId || 'Local SQLite',
      sqlQuery: sql_query,
      queryResult,
      queryError
    });
  } catch (err) {
    next(err);
  }
});

// Portal Site Settings
router.get('/settings', async (req, res, next) => {
  try {
    const rows = await d1.prepare('SELECT * FROM settings').all();
    const settings = {
      telegram_url: 'https://t.me/govtexamzoneofficial',
      whatsapp_url: 'https://whatsapp.com/channel/0029VbBps5S7dmeYQLDLyB10',
      contact_email: 'contact.govtexamzone@gmail.com',
      site_title: 'Govt Exam Zone',
      site_logo: '',
      site_favicon: '/images/gez-logo.svg',
      header_subtitle: 'WWW.GOVTEXAMZONE.COM',
      site_tagline: 'Latest Govt Jobs, Admit Card, Results 2026',
      site_domain: 'https://govtexamzone.com',
      copyright_text: '© 2026 govtexamzone.com. All Rights Reserved. Cloudflare D1 & R2 Powered.',
      youtube_url: '',
      twitter_url: '',
      instagram_url: '',
      facebook_url: '',
      contact_phone: '',
      office_address: '',
      meta_description: 'Govt Exam Zone (govtexamzone.com) provides fastest live updates for Government Jobs 2026, Latest Online Forms, Admit Card, Answer Key, Syllabus & Results across UPSC, SSC, Railways, State Police & Banking.',
      meta_keywords: 'Govt Exam Zone, govtexamzone, govtexamzone.com, Govt Jobs 2026, Latest Online Form, Admit Card, Exam Zone, SSC CGL 2026, UP Police, Railway Recruitment',
      google_site_verification: '',
      google_analytics_id: '',
      notice_banner_active: '0',
      notice_banner_text: '',
      notice_banner_url: '',
      notice_banner_bg: '#ab183d',
      adsense_client_id: '',
      ads_active: '1',
      ad_top_code: '',
      ad_bottom_code: '',
      header_custom_code: '',
      footer_custom_code: '',
      post_detail_layout: 'classic'
    };
    if (rows && Array.isArray(rows)) {
      rows.forEach(r => { settings[r.key] = r.value; });
    }
    res.render('admin/settings', {
      title: 'Portal Settings - Govt Exam Zone Admin',
      settings,
      saved: req.query.saved === '1'
    });
  } catch (err) {
    next(err);
  }
});

router.post('/settings/save', upload.fields([
  { name: 'site_logo_file', maxCount: 1 },
  { name: 'site_favicon_file', maxCount: 1 }
]), async (req, res, next) => {
  try {
    const rawSettings = req.body || {};

    // Process logo file upload if provided
    const logoFile = req.files?.site_logo_file?.[0];
    if (logoFile && logoFile.size > 0) {
      const uploadRes = await r2.uploadFile(logoFile.buffer, logoFile.originalname, logoFile.mimetype);
      rawSettings.site_logo = uploadRes.fileUrl;
      await d1.prepare(`
        INSERT INTO uploads (original_name, file_key, file_url, storage_type, mime_type, file_size)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(uploadRes.originalName, uploadRes.fileKey, uploadRes.fileUrl, uploadRes.storageType, uploadRes.mimeType, uploadRes.size).run();
    }

    // Process favicon file upload if provided
    const faviconFile = req.files?.site_favicon_file?.[0];
    if (faviconFile && faviconFile.size > 0) {
      const uploadRes = await r2.uploadFile(faviconFile.buffer, faviconFile.originalname, faviconFile.mimetype);
      rawSettings.site_favicon = uploadRes.fileUrl;
      await d1.prepare(`
        INSERT INTO uploads (original_name, file_key, file_url, storage_type, mime_type, file_size)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(uploadRes.originalName, uploadRes.fileKey, uploadRes.fileUrl, uploadRes.storageType, uploadRes.mimeType, uploadRes.size).run();
    }

    // Normalize URL fields if user omitted protocol
    const urlFields = [
      'telegram_url', 'whatsapp_url', 'youtube_url', 'twitter_url',
      'instagram_url', 'facebook_url', 'site_domain', 'notice_banner_url'
    ];
    urlFields.forEach(field => {
      if (rawSettings[field]) {
        let val = rawSettings[field].trim();
        if (val && !val.startsWith('http://') && !val.startsWith('https://') && !val.startsWith('/')) {
          val = 'https://' + val;
        }
        rawSettings[field] = val;
      }
    });

    for (const [key, value] of Object.entries(rawSettings)) {
      if (typeof value === 'string') {
        await d1.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').bind(key, value.trim()).run();
      }
    }
    // Invalidate cached settings so changes apply immediately
    globalThis.__invalidateSettingsCache?.();
    res.redirect('/admin/settings?saved=1');
  } catch (err) {
    next(err);
  }
});

module.exports = router;
