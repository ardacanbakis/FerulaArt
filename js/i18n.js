/**
 * Ferula Art — i18n Module (revamped)
 */
const I18n = (() => {
  let currentLang  = localStorage.getItem('ferulaart-lang') || 'tr';
  let translations = {};

  async function loadLanguage(lang) {
    if (translations[lang]) return translations[lang];
    try {
      const r = await fetch(`lang/${lang}.json`);
      if (!r.ok) throw new Error();
      translations[lang] = await r.json();
      return translations[lang];
    } catch {
      console.error(`i18n: failed to load ${lang}.json`);
      return null;
    }
  }

  function get(data, path) {
    return path.split('.').reduce((o, k) => o?.[k], data);
  }

  async function setLanguage(lang) {
    const data = await loadLanguage(lang);
    if (!data) return;

    currentLang = lang;
    localStorage.setItem('ferulaart-lang', lang);
    document.documentElement.lang = lang;

    document.querySelectorAll('[data-i18n]').forEach(el => {
      const v = get(data, el.getAttribute('data-i18n'));
      if (v !== undefined) el.textContent = v;
    });

    if (data.testimonialItems) {
      window.buildTestimonials?.(data.testimonialItems);
    }

    document.dispatchEvent(new CustomEvent('langChanged', { detail: { lang } }));
  }

  function getCurrentLang() { return currentLang; }

  // Auto-init
  document.addEventListener('DOMContentLoaded', () => setLanguage(currentLang));

  // Expose for main.js
  window.i18n = { get currentLang() { return currentLang; }, setLang: setLanguage };

  return { setLanguage, getCurrentLang, loadLanguage };
})();
