const express = require('express');
const router = express.Router();
const d1 = require('../db/d1Client');
const { CATEGORIES, safeJsonParse, formatDate, formatPrettyDate } = require('../utils/helpers');

// Middleware to inject common data
router.use(async (req, res, next) => {
  res.locals.categories = CATEGORIES;
  res.locals.formatDate = formatDate;
  res.locals.formatPrettyDate = formatPrettyDate;
  res.locals.safeJsonParse = safeJsonParse;
  res.locals.currentPath = req.path;

  try {
    const sRows = await d1.prepare('SELECT * FROM settings').all();
    const siteSettings = {
      telegram_url: 'https://t.me/govtexamzoneofficial',
      whatsapp_url: 'https://whatsapp.com/channel/0029VbBps5S7dmeYQLDLyB10',
      contact_email: 'support@govtexamzone.com',
      site_title: 'Govt Exam Zone',
      site_logo: '/images/gez-logo.svg',
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
      contact_email: 'support@govtexamzone.com',
      site_title: 'Govt Exam Zone',
      site_logo: '/images/gez-logo.svg',
      site_favicon: '/images/gez-logo.svg'
    };
  }
  next();
});

// Homepage
router.get('/', async (req, res, next) => {
  try {
    const marquees = await d1.prepare(
      'SELECT * FROM marquees WHERE is_active = 1 ORDER BY display_order ASC, id DESC'
    ).all();

    const badges = await d1.prepare(
      'SELECT * FROM badges WHERE is_active = 1 ORDER BY display_order ASC, id ASC LIMIT 8'
    ).all();

    // Fetch posts for each category
    const results = await d1.prepare(
      "SELECT * FROM posts WHERE category = 'result' AND status = 'active' ORDER BY id DESC LIMIT 15"
    ).all();

    const admitCards = await d1.prepare(
      "SELECT * FROM posts WHERE category = 'admit-card' AND status = 'active' ORDER BY id DESC LIMIT 15"
    ).all();

    const latestJobs = await d1.prepare(
      "SELECT * FROM posts WHERE category = 'latest-jobs' AND status = 'active' ORDER BY id DESC LIMIT 15"
    ).all();

    const answerKeys = await d1.prepare(
      "SELECT * FROM posts WHERE category = 'answer-key' AND status = 'active' ORDER BY id DESC LIMIT 8"
    ).all();

    const syllabi = await d1.prepare(
      "SELECT * FROM posts WHERE category = 'syllabus' AND status = 'active' ORDER BY id DESC LIMIT 8"
    ).all();

    const admissions = await d1.prepare(
      "SELECT * FROM posts WHERE category = 'admission' AND status = 'active' ORDER BY id DESC LIMIT 8"
    ).all();

    const verifications = await d1.prepare(
      "SELECT * FROM posts WHERE category = 'certificate-verification' AND status = 'active' ORDER BY id DESC LIMIT 8"
    ).all();

    const importants = await d1.prepare(
      "SELECT * FROM posts WHERE category = 'important' AND status = 'active' ORDER BY id DESC LIMIT 8"
    ).all();

    res.render('pages/index', {
      title: `${res.locals.settings?.site_title || 'Govt Exam Zone'} : ${res.locals.settings?.site_tagline || 'Latest Govt Jobs, Admit Card, Results 2026'} | ${res.locals.settings?.header_subtitle || 'WWW.GOVTEXAMZONE.COM'}`,
      marquees,
      badges,
      results,
      admitCards,
      latestJobs,
      answerKeys,
      syllabi,
      admissions,
      verifications,
      importants
    });
  } catch (err) {
    next(err);
  }
});

// Category Page
router.get('/category/:cat', async (req, res, next) => {
  try {
    const categorySlug = req.params.cat;
    const catInfo = CATEGORIES[categorySlug];

    if (!catInfo) {
      return res.status(404).render('pages/error', {
        title: 'Category Not Found',
        message: 'The requested category does not exist.'
      });
    }

    const page = parseInt(req.query.page || '1', 10);
    const limit = 30;
    const offset = (page - 1) * limit;

    const countRow = await d1.prepare(
      'SELECT COUNT(*) as total FROM posts WHERE category = ? AND status = "active"'
    ).bind(categorySlug).first();

    const totalPosts = countRow?.total || 0;
    const totalPages = Math.ceil(totalPosts / limit) || 1;

    const posts = await d1.prepare(
      'SELECT * FROM posts WHERE category = ? AND status = "active" ORDER BY id DESC LIMIT ? OFFSET ?'
    ).bind(categorySlug, limit, offset).all();

    res.render('pages/category', {
      title: `${catInfo.name} - Govt Exam Zone 2026 | WWW.GOVTEXAMZONE.COM`,
      metaDescription: `Find latest ${catInfo.name} 2026 notifications, online application forms, official exam dates, eligibility criteria, and results at Govt Exam Zone.`,
      categorySlug,
      catInfo,
      posts,
      currentPage: page,
      totalPages,
      totalPosts
    });
  } catch (err) {
    next(err);
  }
});

// Post Detail Page
router.get('/post/:slug', async (req, res, next) => {
  try {
    const slug = req.params.slug;
    const post = await d1.prepare(
      'SELECT * FROM posts WHERE slug = ?'
    ).bind(slug).first();

    if (!post) {
      return res.status(404).render('pages/error', {
        title: 'Post Not Found | Govt Exam Zone',
        message: 'The job or result notification you are looking for does not exist or has been removed.'
      });
    }

    // Increment views asynchronously
    d1.prepare('UPDATE posts SET views = views + 1 WHERE id = ?').bind(post.id).run().catch(console.error);

    // Fetch related posts in same category
    const relatedPosts = await d1.prepare(
      'SELECT id, title, slug, post_date FROM posts WHERE category = ? AND id != ? ORDER BY id DESC LIMIT 8'
    ).bind(post.category, post.id).all();

    // Parse JSON fields
    const importantDates = safeJsonParse(post.important_dates, []);
    const applicationFee = safeJsonParse(post.application_fee, []);
    const ageLimit = safeJsonParse(post.age_limit, {});
    const vacancyDetails = safeJsonParse(post.vacancy_details, []);
    const categoryDetails = safeJsonParse(post.category_details, []);
    const links = safeJsonParse(post.links, []);

    // Fetch author details
    const author = await d1.prepare('SELECT * FROM authors WHERE id = ?').bind(post.author_id || 1).first() || {
      name: 'Govt Exam Zone Editorial Team',
      slug: 'editorial-team',
      role: 'Senior Recruitment Analyst & Fact-Checker Lead',
      avatar_url: '/images/default-avatar.svg',
      bio: 'The official editorial and verification desk of Govt Exam Zone.'
    };

    res.render('pages/detail', {
      title: `${post.title} - Govt Exam Zone | WWW.GOVTEXAMZONE.COM`,
      metaDescription: post.short_desc 
        ? post.short_desc.replace(/\s+/g, ' ').trim() 
        : `${post.title}. Check notification details, eligibility criteria, application process, and official links at Govt Exam Zone.`,
      post,
      author,
      catInfo: CATEGORIES[post.category] || { name: 'Notification', slug: post.category },
      importantDates,
      applicationFee,
      ageLimit,
      vacancyDetails,
      categoryDetails,
      links,
      relatedPosts,
      fullUrl: `${req.protocol}://${req.get('host')}${req.originalUrl}`
    });
  } catch (err) {
    next(err);
  }
});

// Search Page
router.get('/search', async (req, res, next) => {
  try {
    const query = (req.query.q || '').trim();
    let posts = [];

    if (query) {
      const searchTerm = `%${query}%`;
      posts = await d1.prepare(`
        SELECT * FROM posts 
        WHERE (title LIKE ? OR department LIKE ? OR short_desc LIKE ?)
          AND status = 'active'
        ORDER BY id DESC LIMIT 50
      `).bind(searchTerm, searchTerm, searchTerm).all();
    }

    res.render('pages/search', {
      title: `Search: ${query || 'Government Jobs 2026'} - Govt Exam Zone`,
      metaDescription: `Search results for "${query || 'Govt Jobs'}" across latest government vacancies, admit cards, and results at Govt Exam Zone.`,
      query,
      posts
    });
  } catch (err) {
    next(err);
  }
});

// Candidate Tools: Age Calculator
router.get('/tools/age-calculator', (req, res) => {
  res.render('pages/age-calculator', {
    title: 'Government Exam Online Age Calculator 2026 : Exact Age as on Cutoff Date | Govt Exam Zone',
    metaDescription: 'Free online Government Exam Age Calculator 2026. Calculate exact age in years, months and days as on notification cutoff date for SSC CGL, UPSC, Railways, Police & Banking jobs.'
  });
});

// Candidate Tools: Photo & Signature Resizer Specs
router.get('/tools/photo-resizer', (req, res) => {
  res.render('pages/photo-resizer', {
    title: 'Photo & Signature Resizer Dimensions Guide 2026 : SSC, UPSC, Railway | Govt Exam Zone',
    metaDescription: 'Official Photo and Signature dimension specifications guide 2026 for SSC, UPSC, UP Police, Railway RRB, and Banking exam online application forms.'
  });
});

// Candidate Tools: Interactive Image Resizer & Name on Photo Maker
router.get('/tools/image-resizer', (req, res) => {
  res.render('pages/image-resizer', {
    title: 'Government Exam Photo & Signature Resizer with Name/Date on Photo Maker 2026 | Govt Exam Zone',
    metaDescription: 'Free interactive Government Exam Photo & Signature Resizer with Name and Date on photo maker tool. Crop, compress to 20KB-50KB for Sarkari Exam forms.'
  });
});

// SEO: XML Sitemap
router.get('/sitemap.xml', async (req, res) => {
  try {
    const posts = await d1.prepare(
      "SELECT slug, category, updated_at FROM posts WHERE status = 'active' ORDER BY id DESC LIMIT 1000"
    ).all();

    const baseDomain = (res.locals.settings?.site_domain || '').trim();
    const host = baseDomain 
      ? (baseDomain.startsWith('http') ? baseDomain.replace(/\/$/, '') : 'https://' + baseDomain.replace(/\/$/, '')) 
      : `${req.protocol}://${req.get('host')}`;

    const todayStr = new Date().toISOString().split('T')[0];
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
    
    // Homepage
    xml += `  <url><loc>${host}/</loc><lastmod>${todayStr}</lastmod><changefreq>always</changefreq><priority>1.0</priority></url>\n`;

    // Category pages
    Object.keys(CATEGORIES).forEach(cat => {
      xml += `  <url><loc>${host}/category/${cat}</loc><lastmod>${todayStr}</lastmod><changefreq>hourly</changefreq><priority>0.9</priority></url>\n`;
    });

    // Candidate Tools (High-Value Utilities for AdSense & Candidates)
    xml += `  <url><loc>${host}/tools/age-calculator</loc><lastmod>${todayStr}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>\n`;
    xml += `  <url><loc>${host}/tools/photo-resizer</loc><lastmod>${todayStr}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>\n`;
    xml += `  <url><loc>${host}/tools/image-resizer</loc><lastmod>${todayStr}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>\n`;

    // Static Informational Pages (Essential for Google E-E-A-T & AdSense)
    xml += `  <url><loc>${host}/about-us</loc><lastmod>${todayStr}</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>\n`;
    xml += `  <url><loc>${host}/contact-us</loc><lastmod>${todayStr}</lastmod><changefreq>monthly</changefreq><priority>0.6</priority></url>\n`;
    xml += `  <url><loc>${host}/terms-conditions</loc><lastmod>${todayStr}</lastmod><changefreq>monthly</changefreq><priority>0.5</priority></url>\n`;
    xml += `  <url><loc>${host}/disclaimer</loc><lastmod>${todayStr}</lastmod><changefreq>monthly</changefreq><priority>0.5</priority></url>\n`;
    xml += `  <url><loc>${host}/privacy-policy</loc><lastmod>${todayStr}</lastmod><changefreq>monthly</changefreq><priority>0.5</priority></url>\n`;

    // Post detail notifications
    posts.forEach(p => {
      const lastMod = p.updated_at ? new Date(p.updated_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
      xml += `  <url><loc>${host}/post/${p.slug}</loc><lastmod>${lastMod}</lastmod><changefreq>daily</changefreq><priority>0.8</priority></url>\n`;
    });

    xml += `</urlset>`;

    res.header('Content-Type', 'application/xml');
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(xml);
  } catch (err) {
    res.status(500).send('Error generating sitemap');
  }
});

// SEO: RSS Feed
router.get('/feed', async (req, res) => {
  try {
    const posts = await d1.prepare(
      "SELECT id, title, slug, short_desc, created_at FROM posts WHERE status = 'active' ORDER BY id DESC LIMIT 50"
    ).all();

    const baseDomain = (res.locals.settings?.site_domain || '').trim();
    const host = baseDomain 
      ? (baseDomain.startsWith('http') ? baseDomain.replace(/\/$/, '') : 'https://' + baseDomain.replace(/\/$/, '')) 
      : `${req.protocol}://${req.get('host')}`;

    let rss = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    rss += `<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n<channel>\n`;
    rss += `  <title>${res.locals.settings?.site_title || 'Govt Exam Zone'} Latest Notifications</title>\n`;
    rss += `  <link>${host}</link>\n`;
    rss += `  <description>${res.locals.settings?.site_tagline || 'Latest Govt Exam Zone Jobs, Online Form, Admit Cards & Results 2026'}</description>\n`;
    rss += `  <language>en-in</language>\n`;
    rss += `  <atom:link href="${host}/feed" rel="self" type="application/rss+xml" />\n`;

    posts.forEach(p => {
      rss += `  <item>\n`;
      rss += `    <title><![CDATA[${p.title}]]></title>\n`;
      rss += `    <link>${host}/post/${p.slug}</link>\n`;
      rss += `    <description><![CDATA[${p.short_desc || p.title}]]></description>\n`;
      rss += `    <pubDate>${new Date(p.created_at).toUTCString()}</pubDate>\n`;
      rss += `    <guid isPermaLink="true">${host}/post/${p.slug}</guid>\n`;
      rss += `  </item>\n`;
    });

    rss += `</channel>\n</rss>`;

    res.header('Content-Type', 'application/xml');
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(rss);
  } catch (err) {
    res.status(500).send('Error generating feed');
  }
});

// SEO: robots.txt
router.get('/robots.txt', (req, res) => {
  const baseDomain = (res.locals.settings?.site_domain || '').trim();
  const host = baseDomain 
    ? (baseDomain.startsWith('http') ? baseDomain.replace(/\/$/, '') : 'https://' + baseDomain.replace(/\/$/, '')) 
    : `${req.protocol}://${req.get('host')}`;

  res.type('text/plain');
  res.set('Cache-Control', 'public, max-age=86400');
  res.send(`User-agent: *
Allow: /
Disallow: /admin
Disallow: /admin/*
Disallow: /api
Disallow: /api/*

Crawl-delay: 1

Sitemap: ${host}/sitemap.xml
`);
});

// Editorial Board & Authors Directory (Hidden from public view as requested)
router.get(['/authors', '/editorial-team', '/author/:slug'], (req, res) => {
  res.redirect(302, '/');
});

router.get(['/author/login', '/authors/login', '/editor/login'], (req, res) => {
  res.redirect(302, '/author-portal/login');
});

// About Us & Editorial Standards (Google E-E-A-T Core Page)
router.get('/about-us', async (req, res, next) => {
  try {
    const teamMembers = await d1.prepare('SELECT * FROM authors WHERE is_active = 1 ORDER BY id ASC LIMIT 10').all();
    res.render('pages/about', {
      title: 'About Us, Mission & Editorial Standards - Govt Exam Zone | Trusted Sarkari Portal',
      metaDescription: 'Learn about Govt Exam Zone, our verified editorial research team, fact-checking policies, and mission to deliver authentic government job alerts.',
      teamMembers
    });
  } catch (err) {
    next(err);
  }
});
router.get('/about', (req, res) => res.redirect(301, '/about-us'));

// Dedicated Contact Page
router.get('/contact-us', (req, res) => {
  res.render('pages/contact', {
    title: 'Contact Us & Candidate Helpdesk - Govt Exam Zone',
    pageTitle: 'Contact Us',
    metaDescription: 'Contact Govt Exam Zone candidate support and helpdesk for queries, corrections, feedback, and official communication.'
  });
});
router.get('/contact', (req, res) => res.redirect(301, '/contact-us'));

// Dedicated Privacy Policy Page
router.get('/privacy-policy', (req, res) => {
  res.render('pages/privacy-policy', {
    title: 'Privacy Policy - Govt Exam Zone | Candidate Data Protection',
    metaDescription: 'Official Privacy Policy of Govt Exam Zone explaining data collection, cookies, Google AdSense compliance, and candidate privacy.'
  });
});

// Dedicated Terms & Conditions Page
router.get('/terms-conditions', (req, res) => {
  res.render('pages/terms', {
    title: 'Terms and Conditions of Use - Govt Exam Zone',
    metaDescription: 'Review the official Terms and Conditions governing the use of Govt Exam Zone public educational information portal and services.'
  });
});
router.get('/terms', (req, res) => res.redirect(301, '/terms-conditions'));

// Dedicated Disclaimer Policy Page
router.get('/disclaimer', (req, res) => {
  res.render('pages/disclaimer', {
    title: 'Disclaimer Policy - Govt Exam Zone Official Recruitment Notice',
    metaDescription: 'Official Disclaimer Policy of Govt Exam Zone regarding government exam updates, third-party official links, and candidate advisory.'
  });
});

module.exports = router;
