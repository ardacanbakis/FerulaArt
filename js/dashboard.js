/**
 * Ferula Art — CMS Dashboard
 * Full CRUD: showcase, gallery, hero, categories, messages
 * Firebase Storage upload + SortableJS drag-to-reorder
 */
(() => {

  // ─── Auth guard ───────────────────────────────────────────────────
  auth.onAuthStateChanged(user => {
    if (!user) { window.location.href = 'admin.html'; return; }
    document.getElementById('userAvatar').textContent = (user.email || 'A')[0].toUpperCase();
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

  function confirmDialog(title, msg) {
    return new Promise(res => {
      const ov = document.getElementById('confirmOverlay');
      document.getElementById('confirmTitle').textContent = title;
      document.getElementById('confirmMsg').textContent   = msg;
      ov.style.display = 'flex';
      let ok = document.getElementById('confirmOk');
      let cancel = document.getElementById('confirmCancel');
      const newOk = ok.cloneNode(true); ok.replaceWith(newOk); ok = newOk;
      const newCancel = cancel.cloneNode(true); cancel.replaceWith(newCancel); cancel = newCancel;
      const cleanup = v => { ov.style.display = 'none'; res(v); };
      document.getElementById('confirmOk').addEventListener('click',     () => cleanup(true));
      document.getElementById('confirmCancel').addEventListener('click', () => cleanup(false));
    });
  }

  function truncUrl(u) {
    try { return new URL(u).pathname.split('/').pop().slice(0, 30) || u.slice(0, 30); }
    catch { return u.slice(0, 30); }
  }

  function validUrl(u) {
    try { const p = new URL(u); return p.protocol === 'https:' || p.protocol === 'http:'; }
    catch { return false; }
  }

  function timeAgo(ts) {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    const diff = Math.floor((Date.now() - d) / 1000);
    if (diff < 60)   return 'az önce';
    if (diff < 3600) return `${Math.floor(diff/60)} dk önce`;
    if (diff < 86400) return `${Math.floor(diff/3600)} sa önce`;
    return d.toLocaleDateString('tr-TR');
  }

  function previewUrl(inputId, thumbId) {
    let t;
    document.getElementById(inputId)?.addEventListener('input', function () {
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
    messages:   'Mesajlar',
  };

  function switchSection(name) {
    document.querySelectorAll('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.section === name));
    document.querySelectorAll('.dash-section').forEach(s => s.classList.toggle('active', s.id === `sec-${name}`));
    document.getElementById('topbarTitle').textContent = sectionTitles[name] || name;
    if (window.innerWidth < 900) closeMobileSidebar();
    if (name === 'messages') loadMessages();
  }

  document.querySelectorAll('.nav-item[data-section]').forEach(btn => {
    btn.addEventListener('click', () => switchSection(btn.dataset.section));
  });
  document.querySelectorAll('.link-btn[data-section]').forEach(btn => {
    btn.addEventListener('click', () => switchSection(btn.dataset.section));
  });

  const sidebar = document.getElementById('sidebar');
  document.getElementById('sidebarCollapse')?.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
  });
  document.getElementById('topbarMenu')?.addEventListener('click', () => {
    sidebar.classList.add('mobile-open');
  });
  function closeMobileSidebar() { sidebar.classList.remove('mobile-open'); }

  document.getElementById('logoutBtn')?.addEventListener('click', () => {
    auth.signOut().then(() => window.location.href = 'admin.html');
  });

  // ─── Bootstrap ────────────────────────────────────────────────────
  async function bootstrap() {
    previewUrl('scImage',  'scPreview');
    previewUrl('galUrl',   'galPreview');
    previewUrl('heroUrl',  'heroPreviewThumb');

    initUploadZone('scUploadZone',   'scImage');
    initUploadZone('galUploadZone',  'galUrl');
    initUploadZone('heroUploadZone', 'heroUrl');

    initExtraImages();
    initShowcaseForm();
    initGalleryForm();
    initHeroForm();
    initCategoryForm();
    initGalleryFilter();
    initEditModal();
    initMsgFilter();

    await Promise.all([
      loadStats(),
      loadRecentShowcase(),
      loadShowcaseItems(),
      loadGalleryImages(),
      loadHeroImages(),
      loadCategories(),
      loadUnreadCount(),
    ]);
  }

  // ─── Firebase Storage upload ──────────────────────────────────────
  function initUploadZone(zoneId, targetInputId) {
    const zone  = document.getElementById(zoneId);
    if (!zone) return;
    const input   = zone.querySelector('.upload-zone-input');
    const progress = zone.querySelector('.upload-progress');
    const bar      = zone.querySelector('.upload-bar');
    const collection = zone.dataset.collection || 'uploads';

    const doUpload = file => {
      if (!file || !file.type.startsWith('image/')) {
        toast('Lütfen geçerli bir görsel seçin', 'error'); return;
      }
      const maxMB = collection === 'hero' ? 8 : 5;
      if (file.size > maxMB * 1024 * 1024) {
        toast(`Dosya ${maxMB} MB'dan büyük olamaz`, 'error'); return;
      }
      const ext  = file.name.split('.').pop();
      const path = `${collection}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const ref  = storage.ref(path);
      const task = ref.put(file);

      progress.style.display = 'block';
      zone.classList.remove('upload-done');
      zone.querySelector('input[type="file"]').disabled = true;

      task.on('state_changed',
        snap => {
          const pct = (snap.bytesTransferred / snap.totalBytes) * 100;
          bar.style.width = pct + '%';
        },
        err => {
          progress.style.display = 'none';
          zone.querySelector('input[type="file"]').disabled = false;
          toast('Yükleme başarısız: ' + err.message, 'error');
        },
        async () => {
          const url = await ref.getDownloadURL();
          const targetInput = document.getElementById(targetInputId);
          if (targetInput) {
            targetInput.value = url;
            targetInput.dispatchEvent(new Event('input'));
          }
          bar.style.width = '100%';
          setTimeout(() => { progress.style.display = 'none'; bar.style.width = '0%'; }, 800);
          zone.classList.add('upload-done');
          zone.querySelector('input[type="file"]').disabled = false;
          toast('Görsel yüklendi!', 'success');
        }
      );
    };

    input?.addEventListener('change', e => { if (e.target.files[0]) doUpload(e.target.files[0]); });

    zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
    zone.addEventListener('drop', e => {
      e.preventDefault();
      zone.classList.remove('drag-over');
      if (e.dataTransfer.files[0]) doUpload(e.dataTransfer.files[0]);
    });
  }

  // ─── Extra images (showcase multi-image) ─────────────────────────
  function initExtraImages() {
    document.getElementById('scAddExtraImg')?.addEventListener('click', () => {
      const wrap = document.getElementById('scExtraImages');
      if (!wrap) return;
      if (wrap.children.length >= 4) { toast('Maksimum 4 ek görsel ekleyebilirsiniz', 'info'); return; }
      const row = document.createElement('div');
      row.className = 'extra-img-row';
      row.innerHTML = `<input type="url" placeholder="https://..." />
        <button type="button" class="remove-extra" title="Kaldır">✕</button>`;
      row.querySelector('.remove-extra').addEventListener('click', () => row.remove());
      wrap.appendChild(row);
    });
  }

  function getExtraImageUrls() {
    const wrap = document.getElementById('scExtraImages');
    if (!wrap) return [];
    return Array.from(wrap.querySelectorAll('input')).map(i => i.value.trim()).filter(Boolean);
  }

  // ─── Stats ────────────────────────────────────────────────────────
  async function loadStats() {
    const [sc, ga, he, ca, ms] = await Promise.all([
      db.collection('showcaseItems').get(),
      db.collection('galleryImages').get(),
      db.collection('heroImages').get(),
      db.collection('categories').get(),
      db.collection('messages').get(),
    ]);
    document.getElementById('statShowcase').textContent = sc.size;
    document.getElementById('statGallery').textContent  = ga.size;
    document.getElementById('statHero').textContent     = he.size;
    document.getElementById('statCats').textContent     = ca.size;
    document.getElementById('statMessages').textContent = ms.size;
  }

  async function loadUnreadCount() {
    try {
      const snap = await db.collection('messages').where('status', '==', 'unread').get();
      const badge = document.getElementById('unreadBadge');
      if (!badge) return;
      if (snap.size > 0) {
        badge.textContent  = snap.size;
        badge.style.display = 'flex';
      } else {
        badge.style.display = 'none';
      }
    } catch (e) { /* messages may not exist yet */ }
  }

  async function loadRecentShowcase() {
    const snap = await db.collection('showcaseItems').orderBy('createdAt', 'desc').limit(4).get();
    const el   = document.getElementById('recentShowcase');
    if (!el) return;
    if (snap.empty) { el.innerHTML = '<p style="color:var(--t3);font-size:.85rem">Henüz eser yok.</p>'; return; }
    el.innerHTML = snap.docs.map(d => {
      const x = d.data();
      const imgs = Array.isArray(x.images) && x.images.length ? x.images : (x.image ? [x.image] : []);
      return `<div class="recent-item">
        <img class="recent-thumb" src="${imgs[0] || ''}" alt="${x.title}"
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
      document.getElementById('scTitle').focus();
    });
    document.getElementById('showcaseFormCancel')?.addEventListener('click', () => {
      document.getElementById('showcaseForm').style.display = 'none';
      clearShowcaseForm();
    });
    document.getElementById('showcaseFormSave')?.addEventListener('click', saveShowcaseItem);
  }

  function clearShowcaseForm() {
    ['scTitle', 'scDesc', 'scPrice', 'scLink', 'scImage'].forEach(id => {
      const el = document.getElementById(id); if (el) el.value = '';
    });
    document.getElementById('scActive').checked = true;
    document.getElementById('scPreview').innerHTML = '';
    const wrap = document.getElementById('scExtraImages');
    if (wrap) wrap.innerHTML = '';
    const zone = document.getElementById('scUploadZone');
    if (zone) zone.classList.remove('upload-done');
  }

  async function saveShowcaseItem() {
    const title = document.getElementById('scTitle').value.trim();
    const primaryImg = document.getElementById('scImage').value.trim();
    if (!title) { toast('Başlık gerekli', 'error'); return; }
    if (!primaryImg || !validUrl(primaryImg)) { toast('Ana görsel için geçerli bir URL veya yükleme yapın', 'error'); return; }

    const btn = document.getElementById('showcaseFormSave');
    btn.disabled = true; btn.textContent = 'Kaydediliyor...';

    try {
      const snap = await db.collection('showcaseItems').orderBy('order', 'desc').limit(1).get();
      const nextOrder = snap.empty ? 0 : snap.docs[0].data().order + 1;
      const extraImgs = getExtraImageUrls();
      const images    = [primaryImg, ...extraImgs].filter(Boolean);

      await db.collection('showcaseItems').add({
        title,
        description: document.getElementById('scDesc').value.trim(),
        price:       document.getElementById('scPrice').value.trim(),
        link:        document.getElementById('scLink').value.trim(),
        image:       primaryImg,
        images,
        category:    document.getElementById('scCategory').value,
        active:      document.getElementById('scActive').checked,
        order:       nextOrder,
        createdAt:   firebase.firestore.FieldValue.serverTimestamp(),
      });
      toast('Eser eklendi!', 'success');
      document.getElementById('showcaseForm').style.display = 'none';
      clearShowcaseForm();
      await Promise.all([loadShowcaseItems(), loadRecentShowcase(), loadStats()]);
    } catch (e) {
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
        const d    = doc.data();
        const imgs = Array.isArray(d.images) && d.images.length ? d.images : (d.image ? [d.image] : []);
        const thumb = imgs[0] || '';
        return `
          <div class="item-card${!d.active ? ' item-card-inactive' : ''}" data-id="${doc.id}">
            <div class="item-card-img">
              <span class="drag-handle" title="Sürükle"><i class="fa-solid fa-grip-vertical"></i></span>
              <img src="${thumb}" alt="${d.title}"
                   onerror="this.parentElement.style.background='var(--bg-s)';this.remove()" loading="lazy" />
            </div>
            <div class="item-card-body">
              <span class="item-card-cat">${d.category || ''}</span>
              <p class="item-card-title">${d.title || ''}</p>
              ${d.price ? `<p class="item-card-price">${d.price}</p>` : ''}
              ${!d.active ? '<p style="font-size:.72rem;color:var(--t3);margin-bottom:4px">● Pasif</p>' : ''}
              ${imgs.length > 1 ? `<p style="font-size:.72rem;color:var(--t3);margin-bottom:4px">${imgs.length} görsel</p>` : ''}
              <div class="item-actions">
                <button class="item-edit-btn" onclick="Dash.editShowcase('${doc.id}')">
                  <i class="fa-solid fa-pen"></i> Düzenle
                </button>
                <button class="ic-btn" onclick="Dash.toggleShowcase('${doc.id}', ${!!d.active})">
                  ${d.active ? 'Pasife Al' : 'Aktife Al'}
                </button>
                <button class="item-del-btn" onclick="Dash.deleteShowcase('${doc.id}')">
                  <i class="fa-solid fa-trash"></i>
                </button>
              </div>
            </div>
          </div>`;
      }).join('');
      initSortable('showcaseGrid', 'showcaseItems');
    } catch (e) { console.error(e); }
  }

  async function deleteShowcase(id) {
    if (!await confirmDialog('Eseri Sil', 'Bu eser kalıcı olarak silinecek.')) return;
    try {
      await db.collection('showcaseItems').doc(id).delete();
      toast('Eser silindi', 'success');
      await Promise.all([loadShowcaseItems(), loadStats()]);
    } catch (e) { toast('Silinemedi', 'error'); }
  }

  async function toggleShowcase(id, currentActive) {
    try {
      await db.collection('showcaseItems').doc(id).update({ active: !currentActive });
      toast(currentActive ? 'Pasife alındı' : 'Aktive edildi', 'info');
      loadShowcaseItems();
    } catch (e) { toast('Güncelleme başarısız', 'error'); }
  }

  // ─── Edit modal ───────────────────────────────────────────────────
  function initEditModal() {
    const overlay = document.getElementById('editOverlay');
    const closeBtn = document.getElementById('editClose');
    const cancelBtn = document.getElementById('editCancel');
    const saveBtn   = document.getElementById('editSave');

    const close = () => { overlay.style.display = 'none'; };
    closeBtn?.addEventListener('click', close);
    cancelBtn?.addEventListener('click', close);
    overlay?.addEventListener('click', e => { if (e.target === overlay) close(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && overlay.style.display !== 'none') close(); });

    saveBtn?.addEventListener('click', async () => {
      const id    = document.getElementById('editDocId').value;
      const title = document.getElementById('editTitle').value.trim();
      if (!title) { toast('Başlık gerekli', 'error'); return; }

      const rawImgs = document.getElementById('editImages').value
        .split('\n').map(s => s.trim()).filter(Boolean);
      const images = rawImgs.filter(u => validUrl(u));

      saveBtn.disabled = true; saveBtn.textContent = 'Güncelleniyor...';
      try {
        await db.collection('showcaseItems').doc(id).update({
          title,
          description: document.getElementById('editDesc').value.trim(),
          price:       document.getElementById('editPrice').value.trim(),
          link:        document.getElementById('editLink').value.trim(),
          category:    document.getElementById('editCategory').value,
          active:      document.getElementById('editActive').checked,
          image:       images[0] || '',
          images,
          updatedAt:   firebase.firestore.FieldValue.serverTimestamp(),
        });
        toast('Eser güncellendi!', 'success');
        close();
        await Promise.all([loadShowcaseItems(), loadRecentShowcase()]);
      } catch (e) { toast('Güncelleme başarısız', 'error'); }
      saveBtn.disabled = false; saveBtn.textContent = 'Güncelle';
    });
  }

  async function editShowcase(id) {
    try {
      const snap = await db.collection('showcaseItems').doc(id).get();
      if (!snap.exists) { toast('Eser bulunamadı', 'error'); return; }
      const d = snap.data();
      const imgs = Array.isArray(d.images) && d.images.length ? d.images : (d.image ? [d.image] : []);

      document.getElementById('editDocId').value   = id;
      document.getElementById('editTitle').value   = d.title || '';
      document.getElementById('editDesc').value    = d.description || '';
      document.getElementById('editPrice').value   = d.price || '';
      document.getElementById('editLink').value    = d.link || '';
      document.getElementById('editCategory').value = d.category || 'decor';
      document.getElementById('editActive').checked = !!d.active;
      document.getElementById('editImages').value  = imgs.join('\n');

      document.getElementById('editOverlay').style.display = 'flex';
      document.getElementById('editTitle').focus();
    } catch (e) { toast('Yüklenemedi', 'error'); }
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
    document.querySelectorAll('.fdash-btn[data-f]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.fdash-btn[data-f]').forEach(b => b.classList.remove('active'));
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
    if (!url || !validUrl(url)) { toast('Geçerli URL girin veya görsel yükleyin', 'error'); return; }

    const btn = document.getElementById('galAddBtn');
    btn.disabled = true; btn.textContent = 'Ekleniyor...';
    try {
      const snap = await db.collection('galleryImages').orderBy('order', 'desc').limit(1).get();
      const nextOrder = snap.empty ? 0 : snap.docs[0].data().order + 1;
      await db.collection('galleryImages').add({
        url, category: cat, order: nextOrder,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      document.getElementById('galUrl').value = '';
      document.getElementById('galPreview').innerHTML = '';
      document.getElementById('galUploadZone')?.classList.remove('upload-done');
      toast('Görsel eklendi!', 'success');
      await Promise.all([loadGalleryImages(), loadStats()]);
    } catch (e) { toast('Eklenemedi', 'error'); }
    btn.disabled = false; btn.textContent = 'Ekle';
  }

  async function loadGalleryImages() {
    const grid = document.getElementById('galGrid');
    if (!grid) return;
    try {
      const snap = await db.collection('galleryImages').orderBy('order').get();
      if (snap.empty) {
        grid.innerHTML = '<div class="empty-state"><i class="fa-solid fa-images"></i>Galeri boş.</div>'; return;
      }
      grid.innerHTML = snap.docs.map(doc => {
        const d = doc.data();
        return `
          <div class="img-card" data-id="${doc.id}" data-cat="${d.category}">
            <div class="img-card-img">
              <span class="drag-handle" title="Sürükle"><i class="fa-solid fa-grip-vertical"></i></span>
              <img src="${d.url}" alt="${d.category}" loading="lazy" />
            </div>
            <div class="img-card-body">
              <span class="img-card-cat">${d.category}</span>
              <p class="img-card-url">${truncUrl(d.url)}</p>
              <div class="img-card-actions">
                <button class="ic-btn del" onclick="Dash.deleteGallery('${doc.id}')">Sil</button>
              </div>
            </div>
          </div>`;
      }).join('');
      initSortable('galGrid', 'galleryImages');
    } catch (e) { console.error(e); }
  }

  async function deleteGallery(id) {
    if (!await confirmDialog('Görseli Sil', 'Bu görsel galeriden kaldırılacak.')) return;
    try {
      await db.collection('galleryImages').doc(id).delete();
      toast('Silindi', 'success');
      await Promise.all([loadGalleryImages(), loadStats()]);
    } catch (e) { toast('Silinemedi', 'error'); }
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
    if (!url || !validUrl(url)) { toast('Geçerli URL girin veya görsel yükleyin', 'error'); return; }

    const btn = document.getElementById('heroAddBtn');
    btn.disabled = true; btn.textContent = 'Ekleniyor...';
    try {
      const snap = await db.collection('heroImages').orderBy('order', 'desc').limit(1).get();
      const nextOrder = snap.empty ? 0 : snap.docs[0].data().order + 1;
      await db.collection('heroImages').add({
        url, order: nextOrder,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      document.getElementById('heroUrl').value = '';
      document.getElementById('heroPreviewThumb').innerHTML = '';
      document.getElementById('heroUploadZone')?.classList.remove('upload-done');
      toast('Hero görseli eklendi!', 'success');
      await Promise.all([loadHeroImages(), loadStats()]);
    } catch (e) { toast('Eklenemedi', 'error'); }
    btn.disabled = false; btn.textContent = 'Ekle';
  }

  async function loadHeroImages() {
    const grid = document.getElementById('heroGrid');
    if (!grid) return;
    try {
      const snap = await db.collection('heroImages').orderBy('order').get();
      if (snap.empty) {
        grid.innerHTML = '<div class="empty-state"><i class="fa-solid fa-sliders"></i>Hero görseli yok.</div>'; return;
      }
      grid.innerHTML = snap.docs.map((doc, i) => {
        const d = doc.data();
        return `
          <div class="img-card" data-id="${doc.id}">
            <div class="img-card-img" style="aspect-ratio:16/9">
              <span class="drag-handle" title="Sürükle"><i class="fa-solid fa-grip-vertical"></i></span>
              <img src="${d.url}" alt="Hero ${i + 1}" loading="lazy" />
            </div>
            <div class="img-card-body">
              <span class="img-card-cat">#${i + 1}</span>
              <p class="img-card-url">${truncUrl(d.url)}</p>
              <div class="img-card-actions">
                <button class="ic-btn del" onclick="Dash.deleteHero('${doc.id}')">Sil</button>
              </div>
            </div>
          </div>`;
      }).join('');
      initSortable('heroGrid', 'heroImages');
    } catch (e) { console.error(e); }
  }

  async function deleteHero(id) {
    if (!await confirmDialog('Hero Görseli Sil', "Bu görsel hero carousel'dan kaldırılacak.")) return;
    try {
      await db.collection('heroImages').doc(id).delete();
      toast('Silindi', 'success');
      await Promise.all([loadHeroImages(), loadStats()]);
    } catch (e) { toast('Silinemedi', 'error'); }
  }

  // ═══════════════════════════════════════
  //  SORTABLEJS DRAG-TO-REORDER
  // ═══════════════════════════════════════
  function initSortable(gridId, collection) {
    const grid = document.getElementById(gridId);
    if (!grid || !window.Sortable) return;

    const existing = grid._sortable;
    if (existing) { existing.destroy(); }

    grid._sortable = new Sortable(grid, {
      animation: 180,
      handle: '.drag-handle',
      ghostClass: 'sortable-ghost',
      chosenClass: 'sortable-chosen',
      onEnd: async () => {
        const cards = grid.querySelectorAll('[data-id]');
        const batch = db.batch();
        cards.forEach((card, idx) => {
          const ref = db.collection(collection).doc(card.dataset.id);
          batch.update(ref, { order: idx });
        });
        try {
          await batch.commit();
          toast('Sıralama güncellendi', 'success');
        } catch (e) {
          toast('Sıralama kaydedilemedi', 'error');
        }
      },
    });
  }

  // ═══════════════════════════════════════
  //  CATEGORIES
  // ═══════════════════════════════════════
  function initCategoryForm() {
    document.getElementById('catAddOpen')?.addEventListener('click', () => {
      document.getElementById('catForm').style.display = 'block';
      document.getElementById('catNameTr').focus();
    });
    document.getElementById('catFormCancel')?.addEventListener('click', () => {
      document.getElementById('catForm').style.display = 'none';
      clearCatForm();
    });
    document.getElementById('catFormSave')?.addEventListener('click', saveCategory);
    document.getElementById('catNameTr')?.addEventListener('input', function () {
      const slug = document.getElementById('catSlug');
      if (slug && !slug.value) {
        slug.value = this.value.toLowerCase()
          .replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s')
          .replace(/ı/g,'i').replace(/ö/g,'o').replace(/ç/g,'c')
          .replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'');
      }
    });
  }

  function clearCatForm() {
    ['catNameTr', 'catNameEn', 'catSlug', 'catIcon'].forEach(id => {
      const el = document.getElementById(id); if (el) el.value = '';
    });
    document.getElementById('catColor').value  = '#c4a1d0';
    document.getElementById('catActive').checked = true;
  }

  async function saveCategory() {
    const nameTr = document.getElementById('catNameTr').value.trim();
    const nameEn = document.getElementById('catNameEn').value.trim();
    const slug   = document.getElementById('catSlug').value.trim().toLowerCase().replace(/\s+/g, '-');
    if (!nameTr || !slug) { toast('Türkçe ad ve slug gerekli', 'error'); return; }

    const btn = document.getElementById('catFormSave');
    btn.disabled = true; btn.textContent = 'Kaydediliyor...';
    try {
      const snap = await db.collection('categories').orderBy('order', 'desc').limit(1).get();
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
    } catch (e) { toast('Kayıt başarısız', 'error'); }
    btn.disabled = false; btn.textContent = 'Kaydet';
  }

  async function loadCategories() {
    const list = document.getElementById('catsList');
    if (!list) return;
    try {
      const snap = await db.collection('categories').orderBy('order').get();
      if (snap.empty) {
        list.innerHTML = '<div class="empty-state"><i class="fa-solid fa-tags"></i>Henüz kategori yok.</div>'; return;
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
    } catch (e) { console.error(e); }
  }

  async function deleteCategory(id) {
    if (!await confirmDialog('Kategoriyi Sil', 'Bu kategori kalıcı olarak silinecek.')) return;
    try {
      await db.collection('categories').doc(id).delete();
      toast('Kategori silindi', 'success');
      await Promise.all([loadCategories(), loadStats()]);
    } catch (e) { toast('Silinemedi', 'error'); }
  }

  // ═══════════════════════════════════════
  //  MESSAGES INBOX
  // ═══════════════════════════════════════
  let msgFilter = 'all';

  function initMsgFilter() {
    document.querySelectorAll('.fdash-btn[data-mf]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.fdash-btn[data-mf]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        msgFilter = btn.dataset.mf;
        loadMessages();
      });
    });
  }

  async function loadMessages() {
    const list = document.getElementById('messagesList');
    if (!list) return;
    list.innerHTML = '<div class="empty-state" style="padding:24px"><i class="fa-solid fa-spinner fa-spin"></i>Yükleniyor...</div>';
    try {
      let query = db.collection('messages').orderBy('createdAt', 'desc');
      if (msgFilter === 'unread') query = query.where('status', '==', 'unread');
      const snap = await query.get();
      if (snap.empty) {
        list.innerHTML = '<div class="empty-state"><i class="fa-solid fa-envelope-open"></i>Mesaj bulunamadı.</div>'; return;
      }
      list.innerHTML = snap.docs.map(doc => {
        const d = doc.data();
        const isUnread = d.status === 'unread';
        const initials = (d.name || 'M')[0].toUpperCase();
        return `
          <div class="msg-card${isUnread ? ' unread' : ''}" data-id="${doc.id}">
            <div class="msg-card-header">
              <div class="msg-avatar">${initials}</div>
              <div class="msg-meta">
                <p class="msg-name">${d.name || 'İsimsiz'}</p>
                <p class="msg-email">${d.email || ''}</p>
              </div>
              ${d.lang ? `<span class="msg-lang-badge">${d.lang}</span>` : ''}
              <span class="msg-time">${timeAgo(d.createdAt)}</span>
              ${isUnread ? '<div class="msg-unread-dot" title="Okunmamış"></div>' : ''}
            </div>
            <div class="msg-body">${d.message || ''}</div>
            <div class="msg-actions">
              ${isUnread
                ? `<button class="msg-read-btn" onclick="Dash.markAsRead('${doc.id}')"><i class="fa-solid fa-check"></i> Okundu İşaretle</button>`
                : ''}
              <button class="msg-del-btn" onclick="Dash.deleteMessage('${doc.id}')"><i class="fa-solid fa-trash"></i> Sil</button>
            </div>
          </div>`;
      }).join('');
    } catch (e) {
      list.innerHTML = '<div class="empty-state"><i class="fa-solid fa-triangle-exclamation"></i>Mesajlar yüklenemedi.</div>';
      console.error(e);
    }
  }

  async function markAsRead(id) {
    try {
      await db.collection('messages').doc(id).update({ status: 'read' });
      toast('Okundu olarak işaretlendi', 'info');
      await Promise.all([loadMessages(), loadUnreadCount(), loadStats()]);
    } catch (e) { toast('Güncellenemedi', 'error'); }
  }

  async function deleteMessage(id) {
    if (!await confirmDialog('Mesajı Sil', 'Bu mesaj kalıcı olarak silinecek.')) return;
    try {
      await db.collection('messages').doc(id).delete();
      toast('Mesaj silindi', 'success');
      await Promise.all([loadMessages(), loadUnreadCount(), loadStats()]);
    } catch (e) { toast('Silinemedi', 'error'); }
  }

  // ─── Global exposure for onclick handlers ─────────────────────────
  window.Dash = {
    deleteShowcase, toggleShowcase, editShowcase,
    deleteGallery,
    deleteHero,
    deleteCategory,
    markAsRead, deleteMessage,
  };

})();
