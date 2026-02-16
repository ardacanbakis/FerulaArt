/**
 * Ferula Art — Internationalization (i18n) Module
 * Supports Turkish (primary) and English, extensible for more languages.
 */
const I18n = (() => {
  let currentLang = localStorage.getItem('ferulaart-lang') || 'tr';
  let translations = {};

  async function loadLanguage(lang) {
    if (translations[lang]) return translations[lang];
    try {
      const response = await fetch(`lang/${lang}.json`);
      if (!response.ok) throw new Error(`Failed to load ${lang}.json`);
      translations[lang] = await response.json();
      return translations[lang];
    } catch (err) {
      console.error(`i18n: Could not load language "${lang}"`, err);
      return null;
    }
  }

  function getNestedValue(obj, path) {
    return path.split('.').reduce((acc, key) => acc && acc[key], obj);
  }

  async function setLanguage(lang) {
    const data = await loadLanguage(lang);
    if (!data) return;

    currentLang = lang;
    localStorage.setItem('ferulaart-lang', lang);
    document.documentElement.lang = lang;

    // Update all elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const value = getNestedValue(data, key);
      if (value) el.textContent = value;
    });

    // Update language switcher buttons
    document.querySelectorAll('.lang-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.lang === lang);
    });

    // Update testimonials
    if (data.testimonialItems) {
      renderTestimonials(data.testimonialItems);
    }

    // Update WhatsApp link based on language
    updateWhatsAppLink(lang);

    // Update footer credit line
    updateFooter(data, lang);

    // Dispatch event for other modules
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));
  }

  function updateWhatsAppLink(lang) {
    const btn = document.getElementById('whatsappBtn');
    if (!btn) return;
    const phoneNumber = '905469660256'; // Replace with actual number
    const messages = {
      tr: 'Merhaba, Ferula Art hakkında bilgi almak istiyorum.',
      en: 'Hello, I would like to learn more about Ferula Art.'
    };
    const msg = encodeURIComponent(messages[lang] || messages.tr);
    btn.href = `https://wa.me/${phoneNumber}?text=${msg}`;
  }

  function updateFooter(data) {
    const footerEl = document.querySelector('[data-i18n-html="footer.credit"]');
    if (!footerEl || !data.footer || !data.footer.credit) return;
    const year = new Date().getFullYear();
    const heart = '<i class="fa-regular fa-heart fa-beat" style="color: #ff0000;"></i>';
    const link = '<a href="https://ardacanbakis.com/" target="_blank" rel="noopener noreferrer">Arda Canbak\u0131\u015f</a>';
    footerEl.innerHTML = data.footer.credit
      .replace('{heart}', heart)
      .replace('{link}', link)
      .replace('{year}', year);
  }

  function renderTestimonials(items) {
    const grid = document.getElementById('testimonialsGrid');
    if (!grid) return;

    grid.innerHTML = items.map(item => `
      <div class="testimonial-card">
        <div class="testimonial-stars">
          ${'<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>'.repeat(5)}
        </div>
        <p class="testimonial-text">"${item.text}"</p>
        <div class="testimonial-author">
          <div class="testimonial-avatar">${item.author.charAt(0)}</div>
          <div class="testimonial-info">
            <strong>${item.author}</strong>
            <span>${item.role}</span>
          </div>
        </div>
      </div>
    `).join('');
  }

  function getCurrentLang() {
    return currentLang;
  }

  return { setLanguage, getCurrentLang, loadLanguage };
})();
