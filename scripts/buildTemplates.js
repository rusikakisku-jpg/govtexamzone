const fs = require('fs');
const path = require('path');

function getFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getFiles(fullPath));
    } else if (file.endsWith('.ejs')) {
      results.push(fullPath);
    }
  });
  return results;
}

const viewsDir = path.resolve('views');
const allEjs = getFiles(viewsDir);
const templates = {};

allEjs.forEach(absPath => {
  const relPath = path.relative(viewsDir, absPath).replace(/\\/g, '/');
  const content = fs.readFileSync(absPath, 'utf-8');
  templates[relPath] = content;
  templates['views/' + relPath] = content;
});

const outPath = path.resolve('src/views/templateEngine.js');
const fileContent = `// Auto-generated in-memory template bundle for Cloudflare Workers & Node.js
const ejs = require('ejs');
const path = require('path');
const fs = require('fs');

const templates = ${JSON.stringify(templates, null, 2)};

function resolveTemplate(includePath, fromFile) {
  let rel = includePath;
  if (!rel.endsWith('.ejs')) rel += '.ejs';
  const baseDir = fromFile ? path.dirname(fromFile) : 'views';
  const target = path.normalize(path.join(baseDir, rel)).replace(/\\\\/g, '/');

  for (const k in templates) {
    if (k === target || k.endsWith(target) || target.endsWith(k)) {
      return { filename: k, template: templates[k] };
    }
  }
  return null;
}

function templateEngine(filePath, options, callback) {
  try {
    const norm = filePath.replace(/\\\\/g, '/');
    let matchedKey = Object.keys(templates).find(k => norm.endsWith(k));
    let tpl = matchedKey ? templates[matchedKey] : null;

    if (!tpl) {
      try {
        if (typeof fs.readFileSync === 'function') {
          tpl = fs.readFileSync(filePath, 'utf-8');
          matchedKey = filePath;
        }
      } catch (e) {}
    }

    if (!tpl) {
      return callback(new Error('Template not found: ' + filePath));
    }

    const renderOpts = Object.assign({}, options, {
      filename: matchedKey || filePath,
      includer: (incPath, currentFilename) => {
        return resolveTemplate(incPath, currentFilename || matchedKey);
      }
    });

    const rendered = ejs.render(tpl, options, renderOpts);
    callback(null, rendered);
  } catch (err) {
    callback(err);
  }
}

module.exports = {
  templateEngine,
  templates,
  resolveTemplate
};
`;

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, fileContent, 'utf-8');
console.log('Successfully bundled', Object.keys(templates).length / 2, 'templates into', outPath);
