/**
 * Ferula Art — Admin Panel JavaScript
 * Handles authentication and image URL management via Firestore (no Storage).
 * Images are hosted externally (Imgur, GitHub, Cloudinary, etc.)
 */
(() => {
  // --- DOM Elements ---
  const loginScreen = document.getElementById('loginScreen');
  const adminPanel = document.getElementById('adminPanel');
  const loginForm = document.getElementById('loginForm');
  const loginError = document.getElementById('loginError');
  const loginBtn = document.getElementById('loginBtn');
  const logoutBtn = document.getElementById('logoutBtn');

  // Hero
  const heroUrlInput = document.getElementById('heroUrlInput');
  const heroAddBtn = document.getElementById('heroAddBtn');
  const heroImageGrid = document.getElementById('heroImageGrid');
  const heroPreview = document.getElementById('heroPreview');

  // Gallery
  const galleryUrlInput = document.getElementById('galleryUrlInput');
  const galleryAddBtn = document.getElementById('galleryAddBtn');
  const galleryImageGrid = document.getElementById('galleryImageGrid');
  const galleryCategory = document.getElementById('galleryCategory');
  const galleryPreview = document.getElementById('galleryPreview');

  const toastContainer = document.getElementById('toastContainer');

  // --- Toast Notifications ---
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(12px)';
      toast.style.transition = 'all 0.3s';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // --- Confirm Dialog ---
  function showConfirm(title, message) {
    return new Promise(resolve => {
      const overlay = document.createElement('div');
      overlay.className = 'confirm-overlay';
      overlay.innerHTML = `
        <div class="confirm-dialog">
          <h3>${title}</h3>
          <p>${message}</p>
          <div class="confirm-actions">
            <button class="btn-confirm cancel">Cancel</button>
            <button class="btn-confirm delete">Delete</button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);

      overlay.querySelector('.cancel').addEventListener('click', () => {
        overlay.remove();
        resolve(false);
      });
      overlay.querySelector('.delete').addEventListener('click', () => {
        overlay.remove();
        resolve(true);
      });
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          overlay.remove();
          resolve(false);
        }
      });
    });
  }

  // --- URL Preview ---
  function setupPreview(input, previewEl) {
    let debounce;
    input.addEventListener('input', () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        const url = input.value.trim();
        if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
          previewEl.innerHTML = `<img src="${url}" alt="Preview" onerror="this.parentElement.innerHTML='<p class=\\'preview-error\\'>Could not load image</p>'">`;
        } else {
          previewEl.innerHTML = '';
        }
      }, 500);
    });
  }

  setupPreview(heroUrlInput, heroPreview);
  setupPreview(galleryUrlInput, galleryPreview);

  // --- Authentication ---
  auth.onAuthStateChanged(user => {
    if (user) {
      loginScreen.style.display = 'none';
      adminPanel.style.display = 'block';
      loadHeroImages();
      loadGalleryImages();
    } else {
      loginScreen.style.display = 'flex';
      adminPanel.style.display = 'none';
    }
  });

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.textContent = '';
    loginBtn.disabled = true;
    loginBtn.innerHTML = '<span class="spinner"></span>';

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
      await auth.signInWithEmailAndPassword(email, password);
    } catch (err) {
      loginError.textContent = getAuthErrorMessage(err.code);
      loginBtn.disabled = false;
      loginBtn.textContent = 'Sign In';
    }
  });

  logoutBtn.addEventListener('click', () => {
    auth.signOut();
  });

  function getAuthErrorMessage(code) {
    const messages = {
      'auth/user-not-found': 'No account found with this email.',
      'auth/wrong-password': 'Incorrect password.',
      'auth/invalid-email': 'Invalid email address.',
      'auth/too-many-requests': 'Too many attempts. Try again later.',
      'auth/invalid-credential': 'Invalid email or password.'
    };
    return messages[code] || 'Sign in failed. Please try again.';
  }

  // --- Validate URL ---
  function isValidImageUrl(url) {
    try {
      const u = new URL(url);
      return u.protocol === 'http:' || u.protocol === 'https:';
    } catch {
      return false;
    }
  }

  // --- Hero Images ---
  heroAddBtn.addEventListener('click', () => addHeroImage());
  heroUrlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); addHeroImage(); }
  });

  async function addHeroImage() {
    const url = heroUrlInput.value.trim();

    if (!url) {
      showToast('Please enter an image URL', 'error');
      return;
    }
    if (!isValidImageUrl(url)) {
      showToast('Please enter a valid URL (https://...)', 'error');
      return;
    }

    heroAddBtn.disabled = true;
    heroAddBtn.innerHTML = '<span class="spinner"></span>';

    try {
      // Get next order
      const snapshot = await db.collection('heroImages').orderBy('order', 'desc').limit(1).get();
      const nextOrder = snapshot.empty ? 0 : snapshot.docs[0].data().order + 1;

      await db.collection('heroImages').add({
        url,
        order: nextOrder,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      heroUrlInput.value = '';
      heroPreview.innerHTML = '';
      showToast('Hero image added!', 'success');
      loadHeroImages();
    } catch (err) {
      console.error('Add hero error:', err);
      showToast('Failed to add image', 'error');
    }

    heroAddBtn.disabled = false;
    heroAddBtn.textContent = 'Add';
  }

  async function loadHeroImages() {
    try {
      const snapshot = await db.collection('heroImages').orderBy('order').get();

      if (snapshot.empty) {
        heroImageGrid.innerHTML = `
          <div class="empty-state" style="grid-column: 1 / -1;">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
            <p>No hero images yet. Add your first image URL above.</p>
          </div>
        `;
        return;
      }

      heroImageGrid.innerHTML = snapshot.docs.map((doc, i) => {
        const data = doc.data();
        return `
          <div class="image-card image-card-hero" data-id="${doc.id}">
            <span class="order-badge">#${i + 1}</span>
            <img src="${data.url}" alt="Hero ${i + 1}" loading="lazy">
            <div class="image-card-info">
              <span class="image-card-name" title="${data.url}">${truncateUrl(data.url)}</span>
              <div class="image-card-actions">
                ${i > 0 ? `<button class="btn-icon" onclick="Admin.moveHero('${doc.id}', 'up')" title="Move up">&#8593;</button>` : ''}
                ${i < snapshot.docs.length - 1 ? `<button class="btn-icon" onclick="Admin.moveHero('${doc.id}', 'down')" title="Move down">&#8595;</button>` : ''}
                <button class="btn-icon danger" onclick="Admin.deleteHero('${doc.id}')" title="Delete">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
              </div>
            </div>
          </div>
        `;
      }).join('');
    } catch (err) {
      console.error('Error loading hero images:', err);
      showToast('Failed to load hero images', 'error');
    }
  }

  async function deleteHero(docId) {
    const confirmed = await showConfirm('Delete Image', 'Are you sure you want to delete this hero image?');
    if (!confirmed) return;

    try {
      await db.collection('heroImages').doc(docId).delete();
      showToast('Hero image deleted', 'success');
      loadHeroImages();
    } catch (err) {
      console.error('Delete error:', err);
      showToast('Failed to delete image', 'error');
    }
  }

  async function moveHero(docId, direction) {
    try {
      const snapshot = await db.collection('heroImages').orderBy('order').get();
      const docs = snapshot.docs;
      const currentIndex = docs.findIndex(d => d.id === docId);

      if (currentIndex === -1) return;

      const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      if (swapIndex < 0 || swapIndex >= docs.length) return;

      const currentOrder = docs[currentIndex].data().order;
      const swapOrder = docs[swapIndex].data().order;

      const batch = db.batch();
      batch.update(db.collection('heroImages').doc(docs[currentIndex].id), { order: swapOrder });
      batch.update(db.collection('heroImages').doc(docs[swapIndex].id), { order: currentOrder });
      await batch.commit();

      loadHeroImages();
    } catch (err) {
      console.error('Reorder error:', err);
      showToast('Failed to reorder', 'error');
    }
  }

  // --- Gallery Images ---
  galleryAddBtn.addEventListener('click', () => addGalleryImage());
  galleryUrlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); addGalleryImage(); }
  });

  async function addGalleryImage() {
    const url = galleryUrlInput.value.trim();
    const category = galleryCategory.value;

    if (!url) {
      showToast('Please enter an image URL', 'error');
      return;
    }
    if (!isValidImageUrl(url)) {
      showToast('Please enter a valid URL (https://...)', 'error');
      return;
    }

    galleryAddBtn.disabled = true;
    galleryAddBtn.innerHTML = '<span class="spinner"></span>';

    try {
      const snapshot = await db.collection('galleryImages').orderBy('order', 'desc').limit(1).get();
      const nextOrder = snapshot.empty ? 0 : snapshot.docs[0].data().order + 1;

      await db.collection('galleryImages').add({
        url,
        category,
        order: nextOrder,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      galleryUrlInput.value = '';
      galleryPreview.innerHTML = '';
      showToast('Gallery image added!', 'success');
      loadGalleryImages();
    } catch (err) {
      console.error('Add gallery error:', err);
      showToast('Failed to add image', 'error');
    }

    galleryAddBtn.disabled = false;
    galleryAddBtn.textContent = 'Add';
  }

  async function loadGalleryImages() {
    try {
      const snapshot = await db.collection('galleryImages').orderBy('order').get();

      if (snapshot.empty) {
        galleryImageGrid.innerHTML = `
          <div class="empty-state" style="grid-column: 1 / -1;">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
            <p>No gallery images yet. Add your first image URL above.</p>
          </div>
        `;
        return;
      }

      galleryImageGrid.innerHTML = snapshot.docs.map((doc, i) => {
        const data = doc.data();
        return `
          <div class="image-card" data-id="${doc.id}">
            <span class="order-badge">#${i + 1}</span>
            <span class="category-badge">${data.category}</span>
            <img src="${data.url}" alt="${data.category} ${i + 1}" loading="lazy">
            <div class="image-card-info">
              <span class="image-card-name" title="${data.url}">${truncateUrl(data.url)}</span>
              <div class="image-card-actions">
                <button class="btn-icon danger" onclick="Admin.deleteGallery('${doc.id}')" title="Delete">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
              </div>
            </div>
          </div>
        `;
      }).join('');
    } catch (err) {
      console.error('Error loading gallery images:', err);
      showToast('Failed to load gallery images', 'error');
    }
  }

  async function deleteGallery(docId) {
    const confirmed = await showConfirm('Delete Image', 'Are you sure you want to delete this gallery image?');
    if (!confirmed) return;

    try {
      await db.collection('galleryImages').doc(docId).delete();
      showToast('Gallery image deleted', 'success');
      loadGalleryImages();
    } catch (err) {
      console.error('Delete error:', err);
      showToast('Failed to delete image', 'error');
    }
  }

  // --- Helpers ---
  function truncateUrl(url) {
    try {
      const u = new URL(url);
      const path = u.pathname.split('/').pop() || u.hostname;
      return path.length > 25 ? path.substring(0, 25) + '...' : path;
    } catch {
      return url.substring(0, 30) + '...';
    }
  }

  // --- Expose functions globally for onclick handlers ---
  window.Admin = {
    deleteHero,
    moveHero,
    deleteGallery
  };

})();
