function slugify(text) {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
    .replace(/\-\-+/g, '-')         // Replace multiple - with single -
    .replace(/^-+/, '')             // Trim - from start of text
    .replace(/-+$/, '');            // Trim - from end of text
}

function formatDate(dateInput) {
  if (!dateInput) return '';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return dateInput;

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
}

function formatPrettyDate(dateInput) {
  if (!dateInput) return '';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return dateInput;

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();

  return `${day} ${month} ${year}`;
}

function safeJsonParse(str, fallback = []) {
  if (!str) return fallback;
  if (typeof str === 'object') return str;
  try {
    return JSON.parse(str);
  } catch (e) {
    return fallback;
  }
}

const CATEGORIES = {
  'result': { name: 'Results', slug: 'result', color: '#ab183d' },
  'admit-card': { name: 'Admit Card', slug: 'admit-card', color: '#ab183d' },
  'latest-jobs': { name: 'Latest Jobs', slug: 'latest-jobs', color: '#ab183d' },
  'answer-key': { name: 'Answer Key', slug: 'answer-key', color: '#ab183d' },
  'syllabus': { name: 'Syllabus', slug: 'syllabus', color: '#ab183d' },
  'admission': { name: 'Admission', slug: 'admission', color: '#ab183d' },
  'certificate-verification': { name: 'Certificate Verification', slug: 'certificate-verification', color: '#ab183d' },
  'important': { name: 'Important', slug: 'important', color: '#ab183d' }
};

module.exports = {
  slugify,
  formatDate,
  formatPrettyDate,
  safeJsonParse,
  CATEGORIES
};
