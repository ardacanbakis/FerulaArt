/**
 * Ferula Art — CMS Dashboard (dashboard.js)
 * Full CRUD: showcase items, gallery, hero carousel, categories
 */
(() => {

  // ─── Auth guard ───────────────────────────────────────────────────
  auth.onAuthStateChanged(user => {
    if (!user) { window.location.href = 'admin.html'; return; }
    const initials = (user.email || 'A')[0].toUpperCase();
    document.getElementById('userAvatar').textContent = initials;
    document.getElementById('userEmail').textContent  = user.email;
    bootstrap();
  });

  // ─── Utilities ────────────────────────────────────────────────────
  function toast(msg, type = 'info') {
    const wrap = document.getElementById('toastWrap');
    const el   = document.createElement('div');
    el.className = `toast ${type}`;
    el.textContent = msg;
    wrap.appendChild(el);
    setTimeout(() => {
      el.style.transition = 'opacity 0.3s, transform 0.3s';
      el.style.opacity = '0'; el.style.transform = 'translateY(8px)';
      setTimeout(() => el.remove(), 300);
    }, 3200);
  }

  function confirm(title, msg) {
    return new Promise(res => {
      const ov = document.getElementById('confirmOverlay');
      document.getElementById('confirmTitle').textContent = title;
      document.getElementById('confirmMsg').textContent   = msg;
      ov.style.display = 'flex';
      const ok     = document.getElementById('confirmOk');
      const cancel = document.getElementById('confirmCancel');
      const cleanup = (v) => { ov.style.display = 'none'; ok.replaceWith(ok.cloneNode(true)); cancel.replaceWith(cancel.cloneNode(true)); res(v); };
      document.getElementById('confirmOk').addEventListener('click',     () => cleanup(true));
      document.getElementById('confirmCancel').addEventListener('click', () => cleanup(false));
    });
  }

  function truncUrl(u) {
    try { return new URL(u).pathname.split('/').pop().slice(0,28) || u.slice(0,28); }
    catch { return u.slice(0,28); }
  }

  function validUrl(u) {
    try { const p = new URL(u); return p.protocol === 'https:' || p.protocol === 'http:'; }
    catch { return false; }
  }

  function previewUrl(inputId, thumbId) {
    let t;
    document.getElementById(inputId)?.addEventListener('input', function() {
      clearTimeout(t);
      t = setTimeout(() => {
        const thumb = document.getElementById(thumbId);
        const url   = this.value.trim();
        if (thumb && validUrl(url)) {
          thumb.innerHTML = `<img src="${url}" onerror="this.parentElement.innerHTML=''" />`;
        } else if (thumb) {
          thumb.innerHTML = '';
        }
      }, 600);
    });
  }

  // ─── Navigation ───────────────────────────────────────────────────
  const sectionTitles = {
    overview:   'Genel Bakış',
    showcase:   'Öne Çıkan Eserler',
    gallery:    'Galeri',
    hero:       'Hero Carousel',
    categories: 'Kategoriler',
  };

  function switchSection(name) {
    document.querySelectorAll('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.section === name));
    document.querySelectorAll('.dash-section').forEach(s => s.classList.toggle('active', s.id === `sec-${name}`));
    document.getElementById('topbarTitle').textContent = sectionTitles[name] || name;
    if (window.innerWidth < 900) closeMobileSidebar();
  }

  document.querySelectorAll('.nav-item[data-section]').forEach(btn => {
    btn.addEventListener('click', () => switchSection(btn.dataset.section));
  });
  document.querySelectorAll('.link-btn[data-section]').forEach(btn => {
    btn.addEventListener('click', () => switchSection(btn.dataset.section));
  });

  // ─── Sidebar collapse ─────────────────────────────────────────────
  const sidebar = document.getElementById('sidebar');
  document.getElementById('sidebarCollapse')?.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
  });

  // Mobile sidebar
  document.getElementById('topbarMenu')?.addEventListener('click', () => {
    sidebar.classList.add('mobile-open');
  });
  function closeMobileSidebar() { sidebar.classList.remove('mobile-open'); }

  // ─── Logout ───────────────────────────────────────────────────────
  document.getElementById('logoutBtn')?.addEventListener('click', () => {
    auth.signOut().then(() => window.location.href = 'admin.html');
  });

  // ─── Bootstrap: load all data ────────────────────────────────────
  async function bootstrap() {
    previewUrl('scImage',   'scPreview');
    previewUrl('galUrl',    'galPreview');
    previewUrl('heroUrl',   'heroPreviewThumb');

    await Promise.all([
      loadStats(),
      loadRecentShowcase(),
      loadShowcaseItems(),
      loadGalleryImages(),
      loadHeroImages(),
      loadCategories(),
    ]);
    initShowcaseForm();
    initGalleryForm();
    initHeroForm();
    initCategoryForm();
    initGalleryFilter();
  }

  // ─── Stats overview ───────────────────────────────────────────────
  async function loadStats() {
    const [sc, ga, he, ca] = await Promise.all([
      db.collection('showcaseItems').get(),
      db.collection('galleryImages').get(),
      db.collection('heroImages').get(),
      db.collection('categories').get(),
    ]);
    document.getElementById('statShowcase').textContent = sc.size;
    document.getElementById('statGallery').textContent  = ga.size;
    document.getElementById('statHero').textContent     = he.size;
    document.getElementById('statCats').textContent     = ca.size;
  }

  async function loadRecentShowcase() {
    const snap = await db.collection('showcaseItems').orderBy('createdAt','desc').limit(4).get();
    const el   = document.getElementById('recentShowcase');
    if (!el) return;
    if (snap.empty) { el.innerHTML = '<p style="color:var(--t3);font-size:.85rem">Henüz eser yok.</p>'; return; }
    el.innerHTML = snap.docs.map(d => {
      const x = d.data();
      return `<div class="recent-item">
        <img class="recent-thumb" src="${x.image||''}" alt="${x.title}"
             onerror="this.style.background='var(--bg-s)';this.style.opacity='0'" />
        <div class="recent-info">
          <p class="recent-title">${x.title || '—'}</p>
          <p class="recent-cat">${x.category || ''} ${x.price ? '· ' + x.price : ''}</p>
        </div>
      </div>`;
    }).join('');
  }

  // ═══════════════════════════════════════
  //  SHOWCASE ITEMS
  // ═══════════════════════════════════════
  function initShowcaseForm() {
    document.getElementById('showcaseAddOpen')?.addEventListener('click', () => {
      document.getElementById('showcaseForm').style.display = 'block';
    });
    document.getElementById('showcaseFormCancel')?.addEventListener('click', () => {
      document.getElementById('showcaseForm').style.display = 'none';
      clearShowcaseForm();
    });
    document.getElementById('showcaseFormSave')?.addEventListener('click', saveShowcaseItem);
  }

  function clearShowcaseForm() {
    ['scTitle','scDesc','scPrice','scLink','scImage'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    document.getElementById('scActive').checked = true;
    document.getElementById('scPreview').innerHTML = '';
  }

  async function saveShowcaseItem() {
    const title = document.getElementById('scTitle').value.trim();
    const image = document.getElementById('scImage').value.trim();
    if (!title) { toast('Başlık gerekli', 'error'); return; }
    if (!image || !validUrl(image)) { toast('Geçerli bir görsel URL girin', 'error'); return; }

    const btn = document.getElementById('showcaseFormSave');
    btn.disabled = true; btn.textContent = 'Kaydediliyor...';

    try {
      const snap = await db.collection('showcaseItems').orderBy('order','desc').limit(1).get();
      const nextOrder = snap.empty ? 0 : snap.docs[0].data().order + 1;

      await db.collection('showcaseItems').add({
        title,
        description: document.getElementById('scDesc').value.trim(),
        price:       document.getElementById('scPrice').value.trim(),
        link:        document.getElementById('scLink').value.trim(),
        image,
        category:    document.getElementById('scCategory').value,
        active:      document.getElementById('scActive').checked,
        order:       nextOrder,
        createdAt:   firebase.firestore.FieldValue.serverTimestamp(),
      });
      toast('Eser eklendi!', 'success');
      document.getElementById('showcaseForm').style.display = 'none';
      clearShowcaseForm();
      await Promise.all([loadShowcaseItems(), loadRecentShowcase(), loadStats()]);
    } catch(e) {
      console.error(e); toast('Kayıt başarısız', 'error');
    }
    btn.disabled = false; btn.textContent = 'Kaydet';
  }

  async function loadShowcaseItems() {
    const grid = document.getElementById('showcaseGrid');
    if (!grid) return;
    try {
      const snap = await db.collection('showcaseItems').orderBy('order').get();
      if (snap.empty) {
        grid.innerHTML = '<div class="empty-state"><i class="fa-solid fa-star"></i>Henüz eser yok. Yeni ekle butonuna tıklayın.</div>';
        return;
      }
      grid.innerHTML = snap.docs.map(doc => {
        const d = doc.data();
        return `
          <div class="item-card${!d.active ? ' item-card-inactive' : ''}">
            <div class="item-card-img">
              <img src="${d.image||''}" alt="${d.title}"
                   onerror="this.parentElement.style.background='var(--bg-s)';this.remove()" loading="lazy" />
            </div>
            <div class="item-card-body">
              <span class="item-card-cat">${d.category || ''}</span>
              <p class="item-card-title">${d.title || ''}</p>
              ${d.price ? `<p class="item-card-price">${d.price}</p>` : ''}
              ${!d.active ? '<p style="font-size:.72rem;color:var(--t3)">● Pasif</p>' : ''}
              <div class="item-actions">
                <button class="item-del-btn" onclick="Dash.deleteShowcase('${doc.id}')">
                  <i class="fa-solid fa-trash"></i> Sil
                </button>
                <button class="ic-btn" onclick="Dash.toggleShowcase('${doc.id}', ${d.active})">
                  ${d.active ? 'Pasife Al' : 'Aktife Al'}
                </button>
              </div>
            </div>
          </div>`;
      }).join('');
    } catch(e) { console.error(e); }
  }

  async function deleteShowcase(id) {
    if (!await confirm('Eseri Sil', 'Bu eser kalıcı olarak silinecek.')) return;
    try {
      await db.collection('showcaseItems').doc(id).delete();
      toast('Eser silindi', 'success');
      await Promise.all([loadShowcaseItems(), loadStats()]);
    } catch(e) { toast('Silinemedi', 'error'); }
  }

  async function toggleShowcase(id, currentActive) {
    try {
      await db.collection('showcaseItems').doc(id).update({ active: !currentActive });
      toast(currentActive ? 'Pasife alındı' : 'Aktive edildi', 'info');
      loadShowcaseItems();
    } catch(e) { toast('Güncelleme başarısız', 'error'); }
  }

  // ═══════════════════════════════════════
  //  GALLERY
  // ═══════════════════════════════════════
  function initGalleryForm() {
    document.getElementById('galAddBtn')?.addEventListener('click', addGalleryImage);
    document.getElementById('galUrl')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); addGalleryImage(); }
    });
  }

  function initGalleryFilter() {
    document.querySelectorAll('.fdash-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.fdash-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const f = btn.dataset.f;
        document.querySelectorAll('#galGrid .img-card').forEach(c => {
          c.style.display = (f === 'all' || c.dataset.cat === f) ? '' : 'none';
        });
      });
    });
  }

  async function addGalleryImage() {
    const url = document.getElementById('galUrl').value.trim();
    const cat = document.getElementById('galCategory').value;
    if (!url || !validUrl(url)) { toast('Geçerli URL girin', 'error'); return; }

    const btn = document.getElementById('galAddBtn');
    btn.disabled = true; btn.textContent = 'Ekleniyor...';
    try {
      const snap = await db.collection('galleryImages').orderBy('order','desc').limit(1).get();
      const nextOrder = snap.empty ? 0 : snap.docs[0].data().order + 1;
      await db.collection('galleryImages').add({
        url, category: cat, order: nextOrder,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      document.getElementById('galUrl').value = '';
      document.getElementById('galPreview').innerHTML = '';
      toast('Görsel eklendi!', 'success');
      await Promise.all([loadGalleryImages(), loadStats()]);
    } catch(e) { toast('Eklenemedi', 'error'); }
    btn.disabled = false; btn.textContent = 'Ekle';
  }

  async function loadGalleryImages() {
    const grid = document.getElementById('galGrid');
    if (!grid) return;
    try {
      const snap = await db.collection('galleryImages').orderBy('order').get();
      if (snap.empty) {
        grid.innerHTML = '<div class="empty-state"><i class="fa-solid fa-images"></i>Galeri boş.</div>';
        return;
      }
      grid.innerHTML = snap.docs.map((doc, i, arr) => {
        const d = doc.data();
        return `
          <div class="img-card" data-cat="${d.category}">
            <div class="img-card-img">
              <img src="${d.url}" alt="${d.category}" loading="lazy" />
            </div>
            <div class="img-card-body">
              <span class="img-card-cat">${d.category}</span>
              <p class="img-card-url">${truncUrl(d.url)}</p>
              <div class="img-card-actions">
                ${i > 0 ?
                  `<button class="ic-btn up" onclick="Dash.moveGallery('${doc.id}','up')">↑</button>` : ''}
                ${i < arr.length-1 ?
                  `<button class="ic-btn dn" onclick="Dash.moveGallery('${doc.id}','down')">↓</button>` : ''}
                <button class="ic-btn del" onclick="Dash.deleteGallery('${doc.id}')">Sil</button>
              </div>
            </div>
          </div>`;
      }).join('');
    } catch(e) { console.error(e); }
  }

  async function deleteGallery(id) {
    if (!await confirm('Görseli Sil', 'Bu görsel galeriden kaldırılacak.')) return;
    try {
      await db.collection('galleryImages').doc(id).delete();
      toast('Silindi', 'success');
      await Promise.all([loadGalleryImages(), loadStats()]);
    } catch(e) { toast('Silinemedi', 'error'); }
  }

  async function moveGallery(id, dir) {
    try {
      const snap = await db.collection('galleryImages').orderBy('order').get();
      const docs = snap.docs;
      const idx  = docs.findIndex(d => d.id === id);
      const swap = dir === 'up' ? idx - 1 : idx + 1;
      if (idx < 0 || swap < 0 || swap >= docs.length) return;
      const batch = db.batch();
      batch.update(docs[idx].ref,  { order: docs[swap].data().order });
      batch.update(docs[swap].ref, { order: docs[idx].data().order });
      await batch.commit();
      loadGalleryImages();
    } catch(e) { toast('Sıralama başarısız', 'error'); }
  }

  // ═══════════════════════════════════════
  //  HERO CAROUSEL
  // ═══════════════════════════════════════
  function initHeroForm() {
    document.getElementById('heroAddBtn')?.addEventListener('click', addHeroImage);
    document.getElementById('heroUrl')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); addHeroImage(); }
    });
  }

  async function addHeroImage() {
    const url = document.getElementById('heroUrl').value.trim();
    if (!url || !validUrl(url)) { toast('Geçerli URL girin', 'error'); return; }

    const btn = document.getElementById('heroAddBtn');
    btn.disabled = true; btn.textContent = 'Ekleniyor...';
    try {
      const snap = await db.collection('heroImages').orderBy('order','desc').limit(1).get();
      const nextOrder = snap.empty ? 0 : snap.docs[0].data().order + 1;
      await db.collection('heroImages').add({
        url, order: nextOrder,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      document.getElementById('heroUrl').value = '';
      document.getElementById('heroPreviewThumb').innerHTML = '';
      toast('Hero görseli eklendi!', 'success');
      await Promise.all([loadHeroImages(), loadStats()]);
    } catch(e) { toast('Eklenemedi', 'error'); }
    btn.disabled = false; btn.textContent = 'Ekle';
  }

  async function loadHeroImages() {
    const grid = document.getElementById('heroGrid');
    if (!grid) return;
    try {
      const snap = await db.collection('heroImages').orderBy('order').get();
      if (snap.empty) {
        grid.innerHTML = '<div class="empty-state"><i class="fa-solid fa-sliders"></i>Hero görseli yok.</div>';
        return;
      }
      grid.innerHTML = snap.docs.map((doc, i, arr) => {
        const d = doc.data();
        return `
          <div class="img-card">
            <div class="img-card-img" style="aspect-ratio:16/9">
              <img src="${d.url}" alt="Hero ${i+1}" loading="lazy" />
            </div>
            <div class="img-card-body">
              <span class="img-card-cat">#${i+1}</span>
              <p class="img-card-url">${truncUrl(d.url)}</p>
              <div class="img-card-actions">
                ${i > 0 ?
                  `<button class="ic-btn up" onclick="Dash.moveHero('${doc.id}','up')">↑</button>` : ''}
                ${i < arr.length-1 ?
                  `<button class="ic-btn dn" onclick="Dash.moveHero('${doc.id}','down')">↓</button>` : ''}
                <button class="ic-btn del" onclick="Dash.deleteHero('${doc.id}')">Sil</button>
              </div>
            </div>
          </div>`;
      }).join('');
    } catch(e) { console.error(e); }
  }

  async function deleteHero(id) {
    if (!await confirm('Hero Görseli Sil', 'Bu görsel hero carousel\'dan kaldırılacak.')) return;
    try {
      await db.collection('heroImages').doc(id).delete();
      toast('Silindi', 'success');
      await Promise.all([loadHeroImages(), loadStats()]);
    } catch(e) { toast('Silinemedi', 'error'); }
  }

  async function moveHero(id, dir) {
    try {
      const snap = await db.collection('heroImages').orderBy('order').get();
      const docs = snap.docs;
      const idx  = docs.findIndex(d => d.id === id);
      const swap = dir === 'up' ? idx - 1 : idx + 1;
      if (idx < 0 || swap < 0 || swap >= docs.length) return;
      const batch = db.batch();
      batch.update(docs[idx].ref,  { order: docs[swap].data().order });
      batch.update(docs[swap].ref, { order: docs[idx].data().order });
      await batch.commit();
      loadHeroImages();
    } catch(e) { toast('Sıralama başarısız', 'error'); }
  }

  // ═══════════════════════════════════════
  //  CATEGORIES
  // ═══════════════════════════════════════
  function initCategoryForm() {
    document.getElementById('catAddOpen')?.addEventListener('click', () => {
      document.getElementById('catForm').style.display = 'block';
    });
    document.getElementById('catFormCancel')?.addEventListener('click', () => {
      document.getElementById('catForm').style.display = 'none';
      clearCatForm();
    });
    document.getElementById('catFormSave')?.addEventListener('click', saveCategory);
  }

  function clearCatForm() {
    ['catNameTr','catNameEn','catSlug','catIcon'].forEach(id => {
      const el = document.getElementById(id); if (el) el.value = '';
    });
    document.getElementById('catColor').value = '#c4a1d0';
    document.getElementById('catActive').checked = true;
  }

  async function saveCategory() {
    const nameTr = document.getElementById('catNameTr').value.trim();
    const nameEn = document.getElementById('catNameEn').value.trim();
    const slug   = document.getElementById('catSlug').value.trim().toLowerCase().replace(/\s+/g,'-');
    if (!nameTr || !slug) { toast('Türkçe ad ve slug gerekli', 'error'); return; }

    const btn = document.getElementById('catFormSave');
    btn.disabled = true; btn.textContent = 'Kaydediliyor...';
    try {
      const snap = await db.collection('categories').orderBy('order','desc').limit(1).get();
      const nextOrder = snap.empty ? 0 : snap.docs[0].data().order + 1;
      await db.collection('categories').add({
        nameTr, nameEn: nameEn || nameTr, slug,
        icon:    document.getElementById('catIcon').value.trim() || '📦',
        color:   document.getElementById('catColor').value,
        active:  document.getElementById('catActive').checked,
        order:   nextOrder,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      toast('Kategori eklendi!', 'success');
      document.getElementById('catForm').style.display = 'none';
      clearCatForm();
      await Promise.all([loadCategories(), loadStats()]);
    } catch(e) { toast('Kayıt başarısız', 'error'); }
    btn.disabled = false; btn.textContent = 'Kaydet';
  }

  async function loadCategories() {
    const list = document.getElementById('catsList');
    if (!list) return;
    try {
      const snap = await db.collection('categories').orderBy('order').get();
      if (snap.empty) {
        list.innerHTML = '<div class="empty-state"><i class="fa-solid fa-tags"></i>Henüz kategori yok.</div>';
        return;
      }
      list.innerHTML = snap.docs.map(doc => {
        const d = doc.data();
        return `
          <div class="cat-row${!d.active ? ' cat-inactive' : ''}">
            <div class="cat-swatch" style="background:${d.color || '#c4a1d0'}"></div>
            <span class="cat-emoji">${d.icon || '📦'}</span>
            <div class="cat-info">
              <p class="cat-name">${d.nameTr}${d.nameEn && d.nameEn !== d.nameTr ? ` / ${d.nameEn}` : ''}</p>
              <p class="cat-slug">${d.slug}${!d.active ? ' · pasif' : ''}</p>
            </div>
            <button class="cat-del-btn" onclick="Dash.deleteCategory('${doc.id}')">Sil</button>
          </div>`;
      }).join('');
    } catch(e) { console.error(e); }
  }

  async function deleteCategory(id) {
    if (!await confirm('Kategoriyi Sil', 'Bu kategori kalıcı olarak silinecek.')) return;
    try {
      await db.collection('categories').doc(id).delete();
      toast('Kategori silindi', 'success');
      await Promise.all([loadCategories(), loadStats()]);
    } catch(e) { toast('Silinemedi', 'error'); }
  }

  // ─── Global exposure for onclick handlers ─────────────────────────
  window.Dash = {
    deleteShowcase, toggleShowcase,
    deleteGallery, moveGallery,
    deleteHero, moveHero,
    deleteCategory,
  };

})();
