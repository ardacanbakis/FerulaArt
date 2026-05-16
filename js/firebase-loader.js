/**
 * Ferula Art — Firebase Content Loader
 * Loads gallery images and showcase items from Firestore.
 */
const FirebaseLoader = (() => {

  function isConfigured() {
    try {
      return firebase.apps.length > 0 && !firebase.app().options.apiKey.startsWith('YOUR_');
    } catch { return false; }
  }

  // ─── Gallery ──────────────────────────────────────────────────────
  async function loadGalleryImages() {
    if (!isConfigured()) return;
    try {
      const snap = await db.collection('galleryImages').orderBy('order').get();
      if (snap.empty) return;

      const grid = document.getElementById('galleryGrid');
      if (!grid) return;

      grid.innerHTML = snap.docs.map(doc => {
        const d = doc.data();
        return `
          <div class="gallery-item" data-category="${d.category}" tabindex="0" role="listitem">
            <img src="${d.url}" alt="${d.category}" loading="lazy" />
            <div class="gallery-overlay"><i class="fa-solid fa-magnifying-glass-plus"></i></div>
            <span class="gallery-cat-badge">${d.category}</span>
          </div>`;
      }).join('');

      window.initGallery?.();
    } catch (err) {
      console.warn('FirebaseLoader: gallery load failed', err);
    }
  }

  // ─── Showcase Items ───────────────────────────────────────────────
  async function loadShowcaseItems() {
    if (!isConfigured()) return;
    try {
      const snap = await db.collection('showcaseItems')
        .where('active', '==', true)
        .orderBy('order')
        .get();

      const grid = document.getElementById('showcaseGrid');
      if (!grid) return;
      if (snap.empty) {
        grid.innerHTML = '<p class="showcase-empty">Yakında yeni eserler eklenecek...</p>';
        return;
      }

      grid.innerHTML = snap.docs.map(doc => {
        const d = doc.data();
        return `
          <div class="showcase-card">
            <div class="showcase-card-img">
              <img src="${d.image || ''}" alt="${d.title}" loading="lazy"
                   onerror="this.parentElement.style.background='var(--bg-surface)';this.style.display='none'" />
            </div>
            <div class="showcase-card-body">
              <span class="showcase-card-cat">${d.category || ''}</span>
              <h3 class="showcase-card-title">${d.title || ''}</h3>
              <p class="showcase-card-desc">${d.description || ''}</p>
              <div class="showcase-card-footer">
                <span class="showcase-card-price">${d.price || ''}</span>
                ${d.link ? `<a href="${d.link}" target="_blank" rel="noopener" class="showcase-card-btn">Görüntüle →</a>` : ''}
              </div>
            </div>
          </div>`;
      }).join('');
    } catch (err) {
      console.warn('FirebaseLoader: showcase load failed', err);
    }
  }

  async function init() {
    if (!isConfigured()) return;
    await Promise.all([loadGalleryImages(), loadShowcaseItems()]);
  }

  return { init, loadGalleryImages, loadShowcaseItems };
})();

// Auto-init when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => FirebaseLoader.init());
} else {
  FirebaseLoader.init();
}
