// Admin helper functions

function copyToClipboard(text) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => {
      alert('Copied to clipboard: ' + text);
    }).catch(err => {
      prompt('Copy link:', text);
    });
  } else {
    prompt('Copy link:', text);
  }
}

// Mobile Sidebar Drawer Toggle & Live Clock
document.addEventListener('DOMContentLoaded', function() {
  const sidebar = document.getElementById('adminSidebar');
  const backdrop = document.getElementById('sidebarBackdrop');
  const toggleBtn = document.getElementById('sidebarToggleBtn');
  const bottomMenuBtn = document.getElementById('bottomMenuTrigger');
  const closeBtn = document.getElementById('sidebarCloseBtn');

  function openSidebar() {
    if (sidebar && backdrop) {
      sidebar.classList.add('open');
      backdrop.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeSidebar() {
    if (sidebar && backdrop) {
      sidebar.classList.remove('open');
      backdrop.classList.remove('active');
      document.body.style.overflow = '';
    }
  }

  if (toggleBtn) toggleBtn.addEventListener('click', openSidebar);
  if (bottomMenuBtn) {
    bottomMenuBtn.addEventListener('click', function() {
      if (sidebar && sidebar.classList.contains('open')) {
        closeSidebar();
      } else {
        openSidebar();
      }
    });
  }
  if (closeBtn) closeBtn.addEventListener('click', closeSidebar);
  if (backdrop) backdrop.addEventListener('click', closeSidebar);
  if (sidebar) {
    sidebar.querySelectorAll('a.nav-item').forEach(function(link) {
      link.addEventListener('click', function() {
        if (window.innerWidth <= 992) closeSidebar();
      });
    });
  }

  // Live Clock
  function updateClock() {
    const clockEl = document.getElementById('clockTime');
    if (!clockEl) return;
    const now = new Date();
    clockEl.textContent = now.toLocaleTimeString('en-IN', { hour12: true });
  }
  setInterval(updateClock, 1000);
  updateClock();
});

// Interactive Table Row Builders for Post Form
document.addEventListener('DOMContentLoaded', function() {
  const postForm = document.querySelector('form[action*="/admin/posts/"], form[action*="/author-portal/posts/"]');
  if (!postForm) return;

  // 1. Important Dates Builder
  const datesContainer = document.getElementById('dates-rows-container');
  const addDateBtn = document.getElementById('btn-add-date');
  const datesJsonInput = document.getElementById('important_dates');

  if (datesContainer && datesJsonInput) {
    try {
      const initialDates = JSON.parse(datesJsonInput.value || '[]');
      if (Array.isArray(initialDates) && initialDates.length > 0) {
        initialDates.forEach(d => addDateRow(d.event, d.date));
      } else {
        addDateRow('Application Begin', '');
        addDateRow('Last Date for Apply Online', '');
        addDateRow('Pay Exam Fee Last Date', '');
        addDateRow('Exam Date', 'As per Schedule');
        addDateRow('Admit Card Available', 'Before Exam');
      }
    } catch (e) {
      addDateRow('Application Begin', '');
      addDateRow('Last Date for Apply Online', '');
      addDateRow('Pay Exam Fee Last Date', '');
      addDateRow('Exam Date', 'As per Schedule');
      addDateRow('Admit Card Available', 'Before Exam');
    }

    if (addDateBtn) {
      addDateBtn.addEventListener('click', () => addDateRow('', ''));
    }
  }

  function addDateRow(eventVal = '', dateVal = '') {
    const row = document.createElement('div');
    row.className = 'dynamic-row dynamic-row-dates';
    row.style.cssText = 'display: flex; gap: 8px; margin-bottom: 8px; align-items: center; min-width: 320px;';
    row.innerHTML = `
      <input type="text" placeholder="Event (e.g. Application Begin)" value="${eventVal || ''}" class="form-control date-event" style="flex: 1;">
      <input type="text" placeholder="Date (e.g. 25/10/2026)" value="${dateVal || ''}" class="form-control date-value" style="flex: 1;">
      <button type="button" class="btn btn-danger btn-sm" style="padding: 6px 10px;" onclick="this.parentElement.remove()" title="Remove row">✕</button>
    `;
    datesContainer.appendChild(row);
  }

  // 2. Application Fee Builder
  const feeContainer = document.getElementById('fee-rows-container');
  const addFeeBtn = document.getElementById('btn-add-fee');
  const feeJsonInput = document.getElementById('application_fee');

  if (feeContainer && feeJsonInput) {
    try {
      const initialFees = JSON.parse(feeJsonInput.value || '[]');
      if (Array.isArray(initialFees) && initialFees.length > 0) {
        initialFees.forEach(f => addFeeRow(f.category, f.fee));
      } else {
        addFeeRow('General / OBC / EWS', '');
        addFeeRow('SC / ST / PH', '');
        addFeeRow('Payment Mode', 'Online Debit Card, Credit Card, Net Banking or UPI');
      }
    } catch (e) {
      addFeeRow('General / OBC / EWS', '');
      addFeeRow('SC / ST / PH', '');
      addFeeRow('Payment Mode', 'Online Debit Card, Credit Card, Net Banking or UPI');
    }

    if (addFeeBtn) {
      addFeeBtn.addEventListener('click', () => addFeeRow('', ''));
    }
  }

  function addFeeRow(catVal = '', feeVal = '') {
    const row = document.createElement('div');
    row.className = 'dynamic-row dynamic-row-fees';
    row.style.cssText = 'display: flex; gap: 8px; margin-bottom: 8px; align-items: center; min-width: 320px;';
    row.innerHTML = `
      <input type="text" placeholder="Category (e.g. General / OBC)" value="${catVal || ''}" class="form-control fee-category" style="flex: 1;">
      <input type="text" placeholder="Fee Amount (e.g. ₹ 100/-)" value="${feeVal || ''}" class="form-control fee-amount" style="flex: 1;">
      <button type="button" class="btn btn-danger btn-sm" style="padding: 6px 10px;" onclick="this.parentElement.remove()" title="Remove row">✕</button>
    `;
    feeContainer.appendChild(row);
  }

  // 3. Vacancy Details Builder
  const vacContainer = document.getElementById('vac-rows-container');
  const addVacBtn = document.getElementById('btn-add-vac');
  const vacJsonInput = document.getElementById('vacancy_details');

  if (vacContainer && vacJsonInput) {
    try {
      const initialVac = JSON.parse(vacJsonInput.value || '[]');
      if (Array.isArray(initialVac) && initialVac.length > 0) {
        initialVac.forEach(v => addVacRow(v.post_name, v.total_post, v.eligibility));
      } else {
        addVacRow('', '', '');
      }
    } catch (e) {
      addVacRow('', '', '');
    }

    if (addVacBtn) {
      addVacBtn.addEventListener('click', () => addVacRow('', '', ''));
    }
  }

  function addVacRow(nameVal = '', totalVal = '', eligVal = '') {
    const row = document.createElement('div');
    row.className = 'dynamic-row dynamic-row-vac';
    row.style.cssText = 'display: grid; grid-template-columns: 2fr 1fr 3fr auto; gap: 8px; margin-bottom: 8px; align-items: center; min-width: 520px;';
    row.innerHTML = `
      <input type="text" placeholder="Post Name" value="${nameVal || ''}" class="form-control vac-name">
      <input type="text" placeholder="Total Posts" value="${totalVal || ''}" class="form-control vac-total">
      <input type="text" placeholder="Eligibility Criteria" value="${eligVal || ''}" class="form-control vac-elig">
      <button type="button" class="btn btn-danger btn-sm" style="padding: 6px 10px;" onclick="this.parentElement.remove()" title="Remove row">✕</button>
    `;
    vacContainer.appendChild(row);
  }

  // 4. Category-Wise Vacancy Details Builder
  const catContainer = document.getElementById('cat-rows-container');
  const addCatBtn = document.getElementById('btn-add-cat');
  const catJsonInput = document.getElementById('category_details');

  if (catContainer && catJsonInput) {
    try {
      const initialCat = JSON.parse(catJsonInput.value || '[]');
      if (Array.isArray(initialCat) && initialCat.length > 0) {
        initialCat.forEach(c => addCatRow(c.post_name, c.ur, c.ews, c.obc, c.sc, c.st, c.total));
      } else {
        addCatRow('', '', '', '', '', '', '');
      }
    } catch (e) {
      addCatRow('', '', '', '', '', '', '');
    }

    if (addCatBtn) {
      addCatBtn.addEventListener('click', () => addCatRow('', '', '', '', '', '', ''));
    }
  }

  function addCatRow(nameVal = '', urVal = '', ewsVal = '', obcVal = '', scVal = '', stVal = '', totalVal = '') {
    const row = document.createElement('div');
    row.className = 'dynamic-row dynamic-row-cat';
    row.style.cssText = 'display: grid; grid-template-columns: 2fr 1fr 1fr 1fr 1fr 1fr 1fr auto; gap: 6px; margin-bottom: 8px; align-items: center; min-width: 580px;';
    row.innerHTML = `
      <input type="text" placeholder="Post / Group Name" value="${nameVal || ''}" class="form-control cat-name">
      <input type="text" placeholder="UR" value="${urVal || ''}" class="form-control cat-ur">
      <input type="text" placeholder="EWS" value="${ewsVal || ''}" class="form-control cat-ews">
      <input type="text" placeholder="OBC" value="${obcVal || ''}" class="form-control cat-obc">
      <input type="text" placeholder="SC" value="${scVal || ''}" class="form-control cat-sc">
      <input type="text" placeholder="ST" value="${stVal || ''}" class="form-control cat-st">
      <input type="text" placeholder="Total" value="${totalVal || ''}" class="form-control cat-total">
      <button type="button" class="btn btn-danger btn-sm" style="padding: 6px 10px;" onclick="this.parentElement.remove()" title="Remove row">✕</button>
    `;
    catContainer.appendChild(row);
  }

  // 5. Age Limit Fields Loader
  const ageJsonInput = document.getElementById('age_limit');
  if (ageJsonInput) {
    try {
      const ageVal = ageJsonInput.value ? JSON.parse(ageJsonInput.value) : {};
      if (document.getElementById('age_as_on')) document.getElementById('age_as_on').value = ageVal.as_on || '';
      if (document.getElementById('age_min')) document.getElementById('age_min').value = ageVal.min_age || '';
      if (document.getElementById('age_max')) document.getElementById('age_max').value = ageVal.max_age || '';
      if (document.getElementById('age_relaxation')) document.getElementById('age_relaxation').value = ageVal.relaxation || '';
    } catch (e) {
      console.error('Error parsing age_limit:', e);
    }
  }

  // 6. Useful Important Links Builder
  const linksContainer = document.getElementById('links-rows-container');
  const addLinkBtn = document.getElementById('btn-add-link');
  const linksJsonInput = document.getElementById('links');

  if (linksContainer && linksJsonInput) {
    try {
      const initialLinks = JSON.parse(linksJsonInput.value || '[]');
      if (Array.isArray(initialLinks) && initialLinks.length > 0) {
        initialLinks.forEach(l => addLinkRow(l.label, l.url, l.btn_text));
      } else {
        addLinkRow('Apply Online', '', 'Click Here');
        addLinkRow('Download Notification', '', 'Click Here');
        addLinkRow('Official Website', '', 'Click Here');
      }
    } catch (e) {
      addLinkRow('Apply Online', '', 'Click Here');
      addLinkRow('Download Notification', '', 'Click Here');
      addLinkRow('Official Website', '', 'Click Here');
    }

    if (addLinkBtn) {
      addLinkBtn.addEventListener('click', () => addLinkRow('', '', 'Click Here'));
    }
  }

  function addLinkRow(labelVal = '', urlVal = '', btnVal = 'Click Here') {
    const row = document.createElement('div');
    row.className = 'dynamic-row dynamic-row-links';
    row.style.cssText = 'display: grid; grid-template-columns: 2fr 3fr 1fr auto; gap: 8px; margin-bottom: 8px; align-items: center; min-width: 480px;';
    row.innerHTML = `
      <input type="text" placeholder="Link Title (e.g. Apply Online)" value="${labelVal || ''}" class="form-control link-label">
      <input type="text" placeholder="URL (e.g. https://... or /uploads/...)" value="${urlVal || ''}" class="form-control link-url">
      <input type="text" placeholder="Button Text" value="${btnVal || 'Click Here'}" class="form-control link-btn">
      <button type="button" class="btn btn-danger btn-sm" style="padding: 6px 10px;" onclick="this.parentElement.remove()" title="Remove row">✕</button>
    `;
    linksContainer.appendChild(row);
  }

  // On form submission, synchronize all visual builders into JSON inputs
  function syncAllBuilders() {
    // Sync dates
    if (datesContainer && datesJsonInput) {
      const dateRows = datesContainer.querySelectorAll('.dynamic-row');
      const datesArr = [];
      dateRows.forEach(r => {
        const ev = r.querySelector('.date-event')?.value.trim();
        const dt = r.querySelector('.date-value')?.value.trim();
        if (ev || dt) datesArr.push({ event: ev, date: dt });
      });
      datesJsonInput.value = JSON.stringify(datesArr);
    }

    // Sync fees
    if (feeContainer && feeJsonInput) {
      const feeRows = feeContainer.querySelectorAll('.dynamic-row');
      const feeArr = [];
      feeRows.forEach(r => {
        const cat = r.querySelector('.fee-category')?.value.trim();
        const amt = r.querySelector('.fee-amount')?.value.trim();
        if (cat || amt) feeArr.push({ category: cat, fee: amt });
      });
      feeJsonInput.value = JSON.stringify(feeArr);
    }

    // Sync vacancies
    if (vacContainer && vacJsonInput) {
      const vacRows = vacContainer.querySelectorAll('.dynamic-row');
      const vacArr = [];
      vacRows.forEach(r => {
        const nm = r.querySelector('.vac-name')?.value.trim();
        const tot = r.querySelector('.vac-total')?.value.trim();
        const el = r.querySelector('.vac-elig')?.value.trim();
        if (nm || tot || el) vacArr.push({ post_name: nm, total_post: tot, eligibility: el });
      });
      vacJsonInput.value = JSON.stringify(vacArr);
    }

    // Sync category details
    if (catContainer && catJsonInput) {
      const catRows = catContainer.querySelectorAll('.dynamic-row');
      const catArr = [];
      catRows.forEach(r => {
        const nm = r.querySelector('.cat-name')?.value.trim();
        const ur = r.querySelector('.cat-ur')?.value.trim();
        const ews = r.querySelector('.cat-ews')?.value.trim();
        const obc = r.querySelector('.cat-obc')?.value.trim();
        const sc = r.querySelector('.cat-sc')?.value.trim();
        const st = r.querySelector('.cat-st')?.value.trim();
        const tot = r.querySelector('.cat-total')?.value.trim();
        if (nm || ur || ews || obc || sc || st || tot) {
          catArr.push({ post_name: nm, ur, ews, obc, sc, st, total: tot });
        }
      });
      catJsonInput.value = JSON.stringify(catArr);
    }

    // Sync age limit
    if (ageJsonInput) {
      const asOn = document.getElementById('age_as_on')?.value.trim() || '';
      const minAge = document.getElementById('age_min')?.value.trim() || '';
      const maxAge = document.getElementById('age_max')?.value.trim() || '';
      const relax = document.getElementById('age_relaxation')?.value.trim() || '';
      if (asOn || minAge || maxAge || relax) {
        ageJsonInput.value = JSON.stringify({
          as_on: asOn,
          min_age: minAge,
          max_age: maxAge,
          relaxation: relax
        });
      } else {
        ageJsonInput.value = '{}';
      }
    }

    // Sync links
    if (linksContainer && linksJsonInput) {
      const linkRows = linksContainer.querySelectorAll('.dynamic-row');
      const linkArr = [];
      linkRows.forEach(r => {
        const lb = r.querySelector('.link-label')?.value.trim();
        const ur = r.querySelector('.link-url')?.value.trim();
        const bt = r.querySelector('.link-btn')?.value.trim() || 'Click Here';
        if (lb || ur) {
          linkArr.push({ label: lb, url: ur, btn_text: bt });
        }
      });
      linksJsonInput.value = JSON.stringify(linkArr);
    }

    // Sync TinyMCE content to underlying textarea before submit
    if (typeof tinymce !== 'undefined' && !window.__isArticleRawHtmlMode) {
      const ed = tinymce.get('article_content');
      if (ed) {
        try {
          document.getElementById('article_content').value = ed.getContent();
        } catch (e) {}
      }
    }
  }

  postForm.addEventListener('submit', syncAllBuilders);
  const submitBtn = postForm.querySelector('button[type="submit"]');
  if (submitBtn) {
    submitBtn.addEventListener('click', syncAllBuilders);
  }
});

// TinyMCE 6 WYSIWYG Rich Text Editor Initialization for #article_content
document.addEventListener('DOMContentLoaded', function() {
  const articleEl = document.getElementById('article_content');
  if (!articleEl) return;

  window.__isArticleRawHtmlMode = false;
  let isTinyMceReady = false;
  let tinyMceRetries = 0;
  const uploadEndpoint = articleEl.getAttribute('data-upload-url') || '/admin/r2/upload-json';

  function initArticleTinyMce() {
    if (typeof tinymce === 'undefined') {
      if (tinyMceRetries < 20) {
        tinyMceRetries++;
        setTimeout(initArticleTinyMce, 400);
      }
      return;
    }

    try {
      if (tinymce.get('article_content')) {
        tinymce.get('article_content').remove();
      }
      tinymce.init({
        selector: '#article_content',
        height: (window.innerWidth <= 768 ? 320 : 450),
        menubar: false,
        toolbar_mode: 'sliding',
        plugins: 'advlist autolink lists link image charmap preview anchor searchreplace visualblocks code fullscreen insertdatetime media table help wordcount',
        toolbar: 'undo redo | blocks | bold italic underline strikethrough | forecolor backcolor | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | table link image code | removeformat preview fullscreen',
        content_style: 'body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 15px; color: #334155; line-height: 1.7; padding: 14px; } h2, h3 { color: #0f172a; margin-top: 18px; margin-bottom: 8px; } table { width: 100%; border-collapse: collapse; margin: 14px 0; } th, td { border: 1px solid #93c5fd; padding: 8px 12px; } th { background: #f0f7ff; color: #1e40af; } blockquote { border-left: 4px solid #0066ff; padding-left: 14px; color: #334155; background: #f8fafc; padding: 10px 14px; } a { color: #0066ff; }',
        automatic_uploads: true,
        images_upload_handler: function(blobInfo) {
          return new Promise(function(resolve, reject) {
            const formData = new FormData();
            formData.append('file', blobInfo.blob(), blobInfo.filename());

            fetch(uploadEndpoint, {
              method: 'POST',
              body: formData
            })
            .then(function(res) { return res.json(); })
            .then(function(data) {
              if (data && data.url) {
                resolve(data.url);
              } else if (data && data.location) {
                resolve(data.location);
              } else {
                reject((data && data.error) || 'Image upload failed');
              }
            })
            .catch(function(err) {
              reject('Upload error: ' + err.message);
            });
          });
        },
        setup: function(editor) {
          editor.on('init', function() {
            isTinyMceReady = true;
            if (articleEl.value) {
              try { editor.setContent(articleEl.value); } catch (e) {}
            }
          });
          editor.on('change keyup input', function() {
            articleEl.value = editor.getContent();
          });
        }
      });
    } catch (e) {
      console.warn('TinyMCE init skipped:', e);
    }
  }

  initArticleTinyMce();

  const toggleBtn = document.getElementById('toggleArticleModeBtn');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', function() {
      if (!isTinyMceReady || typeof tinymce === 'undefined') return;
      const ed = tinymce.get('article_content');
      if (!ed) return;

      if (!window.__isArticleRawHtmlMode) {
        const html = ed.getContent();
        ed.hide();
        articleEl.style.display = 'block';
        articleEl.value = html;
        toggleBtn.innerHTML = '🎨 Visual Editor';
        window.__isArticleRawHtmlMode = true;
      } else {
        const html = articleEl.value;
        ed.show();
        ed.setContent(html);
        toggleBtn.innerHTML = '💻 HTML Code';
        window.__isArticleRawHtmlMode = false;
      }
    });
  }
});
