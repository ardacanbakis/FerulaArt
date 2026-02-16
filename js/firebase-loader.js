/**
 * Ferula Art — Firebase Content Loader
 * Loads hero carousel and gallery images dynamically from Firestore (URLs only, no Storage).
 * Falls back to static placeholder images if Firebase is not configured or fails.
 */
const FirebaseLoader = (() => {

  function isConfigured() {
    try {
      return firebase.apps.length > 0 &&
        !firebase.app().options.apiKey.startsWith('YOUR_');
    } catch {
      return false;
    }
  }

  // --- Hero Carousel ---
  async function loadHeroImages() {
    if (!isConfigured()) return;

    try {
      const snapshot = await db.collection('heroImages').orderBy('order').get();
      if (snapshot.empty) return; // Keep static placeholders

      const images = snapshot.docs.map(doc => doc.data());
      const track = document.querySelector('.carousel-track');
      const dotsContainer = document.querySelector('.carousel-dots');

      if (!track || !dotsContainer) return;

      // Build new slides
      track.innerHTML = images.map((img, i) => `
        <div class="carousel-slide${i === 0 ? ' active' : ''}">
          <div class="slide-bg" style="background-image: url('${img.url}')"></div>
          <div class="slide-content">
            <h1 class="hero-title">Ferula Art</h1>
            <p class="hero-subtitle" data-i18n="hero.subtitle">El Yapımı Sanat & DIY</p>
            <div class="hero-cta">
              <a href="#gallery" class="btn btn-primary" data-i18n="hero.cta">Galeriyi Keşfet</a>
              <a href="#contact" class="btn btn-outline" data-i18n="hero.cta2">Bize Ulaşın</a>
            </div>
          </div>
        </div>
      `).join('');

      // Build new dots
      dotsContainer.innerHTML = images.map((_, i) => `
        <button class="dot${i === 0 ? ' active' : ''}" data-slide="${i}"></button>
      `).join('');

      // Re-apply current language translations to new elements
      I18n.setLanguage(I18n.getCurrentLang());

      // Reinitialize the carousel with new slides
      window.dispatchEvent(new CustomEvent('heroImagesLoaded'));

    } catch (err) {
      console.warn('FirebaseLoader: Could not load hero images, using static fallback.', err);
    }
  }

  // --- Gallery ---
  async function loadGalleryImages() {
    if (!isConfigured()) return;

    try {
      const snapshot = await db.collection('galleryImages').orderBy('order').get();
      if (snapshot.empty) return; // Keep static placeholders

      const images = snapshot.docs.map(doc => doc.data());
      const grid = document.getElementById('galleryGrid');

      if (!grid) return;

      grid.innerHTML = images.map(img => `
        <div class="gallery-item reveal visible" data-category="${img.category}">
          <div class="gallery-img">
            <img src="${img.url}" alt="${img.category}" loading="lazy">
            <div class="gallery-overlay">
              <span class="gallery-zoom">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>
              </span>
            </div>
          </div>
        </div>
      `).join('');

      // Reinitialize gallery interactions
      window.dispatchEvent(new CustomEvent('galleryImagesLoaded'));

    } catch (err) {
      console.warn('FirebaseLoader: Could not load gallery images, using static fallback.', err);
    }
  }

  async function init() {
    if (!isConfigured()) {
      console.info('FirebaseLoader: Firebase not configured, using static images.');
      return;
    }
    // Load both in parallel
    await Promise.all([loadHeroImages(), loadGalleryImages()]);
  }

  return { init, loadHeroImages, loadGalleryImages };
})();
