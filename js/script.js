// Simple filterable gallery script for the portfolio

document.addEventListener('DOMContentLoaded', () => {
  let btns = Array.from(document.querySelectorAll('.filter-btn'));
  const grid = document.getElementById('portfolioGrid');
  let cards = []; // will be populated after projects are fetched and rendered

  // Filter buttons are initialized after projects are rendered (renderFilters)

  function filterPortfolio(filter) {
    grid.classList.add('revealed');
    // show all
    if (filter === '*' || !filter) {
      cards.forEach((c, i) => showCard(c, i));
      setTimeout(() => grid.classList.remove('revealed'), 340);
      checkNoResults();
      return;
    }

    cards.forEach((c, i) => {
      const cat = c.getAttribute('data-category');
      if (!cat) return;
      if (cat.toLowerCase() === filter.toLowerCase()) {
        showCard(c, i);
      } else {
        hideCard(c);
      }
    });
    setTimeout(() => grid.classList.remove('revealed'), 400);
    checkNoResults();
  }

  function checkNoResults(){
    const noEl = document.getElementById('noResults');
    const visible = cards.filter(c => c.style.display !== 'none');
    if (noEl){
      noEl.style.display = visible.length === 0 ? 'block' : 'none';
    }
  }

  function showCard(card, idx=0){
    // If already visible, just ensure classes
    if (card.style.display === 'flex' && !card.classList.contains('is-hidden')){
      card.classList.add('showing');
      return;
    }
    card.style.display = 'flex';
    // small delay so transitions can run
    window.requestAnimationFrame(() => {
      setTimeout(() => {
        // If there is an existing hide listener we should remove it
        if (card._hideListener) {
          card.removeEventListener('transitionend', card._hideListener);
          delete card._hideListener;
        }
        card.classList.remove('is-hidden');
        card.classList.add('showing');
      }, idx * 60);
    });
  }

  function hideCard(card){
    // already hidden
    if (card.classList.contains('is-hidden')) return;
    card.classList.remove('showing');
    card.classList.add('is-hidden');
    // after animation ends, set display none
    const onEnd = (e) => {
      if (e.propertyName !== 'opacity') return;
      card.style.display = 'none';
      card.removeEventListener('transitionend', onEnd);
    };
    // store listener reference so it can be removed if we show again quickly
    card._hideListener = onEnd;
    card.addEventListener('transitionend', onEnd);
  }

  // Keyboard actions for filter buttons are attached during renderFilters

  // Initial reveal is performed after rendering cards (initCards)

  // Set current year
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* Modal / Lightbox: open on card click and populate details */
  const modal = document.getElementById('projectModal');
  // Declare modal-related variables here so they are available to functions outside the if block
  let modalTitle, modalDesc, modalTech, modalImage, modalLive, modalFull, modalCloseBtns, modalBackdrop, modalZoom, modalMedia;
  // infinite scroll removed; keep modal scrolling native
  let currentImages = [];
  let currentIdx = 0;
  let lastFocused = null;
  // Zoom / pan state for modal
  let isZoomed = false;
  let zoomScale = 1.8; // default zoom factor
  let panX = 0, panY = 0;
  let startX = 0, startY = 0, startPanX = 0, startPanY = 0;
  let activePointerId = null;
  // modal may not exist on all pages — guard modal code with `if (modal)`.

  // About section bubble behavior: allow keyboard & click toggle
  const bubbles = Array.from(document.querySelectorAll('.about-bubbles .bubble'));
  if (bubbles.length){
    bubbles.forEach(b => {
      b.addEventListener('click', (e) => {
        const isActive = b.classList.toggle('active');
        b.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      });
      b.addEventListener('keyup', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          b.click();
        }
      });
    });
  }
  if (modal) {
    modalTitle = modal.querySelector('.modal-title');
    modalDesc = modal.querySelector('.modal-desc');
    modalTech = modal.querySelector('.modal-tech');
    modalImage = modal.querySelector('.modal-image');
    modalLive = modal.querySelector('.modal-live');
    modalFull = modal.querySelector('.modal-full');
    modalCloseBtns = modal.querySelectorAll('[data-modal-close]');
    modalZoom = modal.querySelector('.modal-zoom');
    modalMedia = modal.querySelector('.modal-media');
    modalBackdrop = modal.querySelector('.modal-backdrop');
  }

  // Create a small, persistent ARIA live region for assistive technologies to announce changes
  const _srAnnouncer = (function(){
    let node = document.getElementById('srAnnounce');
    if (!node){ node = document.createElement('div'); node.id = 'srAnnounce'; node.className = 'sr-only'; node.setAttribute('aria-live','polite'); node.setAttribute('aria-atomic','true'); document.body.appendChild(node); }
    let clearTimer = null;
    return function announce(msg){ try { node.textContent = msg; if (clearTimer) clearTimeout(clearTimer); clearTimer = setTimeout(() => { node.textContent = ''; }, 800); } catch (err) {} };
  })();

  // Load projects JSON and render cards dynamically
  const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  async function loadProjects(){
    try {
      const resp = await fetch('data/projects.json');
      if (!resp.ok) throw new Error('Failed to fetch project data');
      const data = await resp.json();
      renderProjects(data);
      // (rebuild filters if categories changed)
      renderFilters(Array.from(new Set(data.map(p => p.category).filter(Boolean))));
      initCards();
    } catch (err) {
      console.error('Error loading projects:', err);
      grid.innerHTML = '<div class="muted">Unable to load projects. Please run a local server or check data/projects.json.</div>';
      grid.removeAttribute('data-loading');
    }
  }

  function renderProjects(projects){
    grid.innerHTML = '';
    projects.forEach(proj => {
      const card = document.createElement('article');
      card.className = 'card';
      card.setAttribute('role','listitem');
      card.setAttribute('data-category', proj.category || 'uncategorized');
      card.setAttribute('data-title', proj.title || 'Project');
      card.setAttribute('data-desc', proj.desc || '');
      card.setAttribute('data-tech', (proj.tech||[]).join(', '));
      card.setAttribute('data-screenshots', (proj.screenshots||[]).join(';'));
      if (proj.id) card.id = proj.id;

      const imgWrap = document.createElement('div');
      imgWrap.className = 'card-image';

        const thumbImg = document.createElement('img');
        thumbImg.className = 'card-thumb';
        thumbImg.alt = proj.title ? `${proj.title} screenshot` : 'Project screenshot';
        thumbImg.loading = 'lazy';
        thumbImg.src = proj.image || ((proj.screenshots && proj.screenshots[0]) || '');
        // Detect tall/portrait thumbnail and mark class so we can show more vertical space
        thumbImg.onload = () => {
          try {
            if (thumbImg.naturalHeight && thumbImg.naturalWidth && (thumbImg.naturalHeight / thumbImg.naturalWidth) > 1.6){
              imgWrap.classList.add('portrait');
            }
          } catch (err) {}
        };
        imgWrap.appendChild(thumbImg);
        // Create a toolbar inside the image for actions (Live / Case Study)
        const toolbar = document.createElement('div'); toolbar.className = 'card-toolbar';
        // create icons as inline SVG for compactness
        const svgLink = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M14 3h7v7h-2V6.414l-9.293 9.293-1.414-1.414L17.586 5H14V3zM5 5h6v2H6v11h11v-5h2v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"></path></svg>';
        const svgCase = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm8-3H4a1 1 0 0 0-1 1v3h18V5a1 1 0 0 0-1-1zM3 10v7a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-7H3z"/></svg>';
        const svgInfo = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" width="16" height="16" aria-hidden="true"><path fill="currentColor" fill-rule="evenodd" d="M18 10A8 8 0 1 1 2 10a8 8 0 0 1 16 0zm-8-4a1 1 0 1 0 0 2 1 1 0 0 0 0-2zm1 6a1 1 0 0 0-2 0v2a1 1 0 0 0 2 0v-2z" clip-rule="evenodd"/></svg>';
        const tbLive = document.createElement('a'); tbLive.className = 'cta-live tb-live'; tbLive.href = proj.live || '#'; tbLive.target = '_blank'; tbLive.rel = 'noopener noreferrer'; tbLive.innerHTML = svgLink + '<span class="sr-only">View Live</span>';
        const tbCase = document.createElement('button'); tbCase.className = 'cta-case tb-case'; tbCase.type = 'button'; tbCase.innerHTML = svgCase + '<span class="sr-only">Case Study</span>';
        toolbar.appendChild(tbLive); toolbar.appendChild(tbCase);
        imgWrap.appendChild(toolbar);
        // Smooth auto-scroll on hover or keyboard focus (hide scrollbars visually)
        // We'll implement a small requestAnimationFrame-based smooth scroll helper
        // Use CSS transform variable to animate vertical translation for a smoother GPU-backed scroll
        const setThumbTranslate = (imgEl, valuePx) => {
          try { imgEl.style.setProperty('--thumb-translate-y', valuePx ? `-${valuePx}px` : '0px'); } catch (err) {}
        };
        // pointerenter/pointerleave are preferred over mouse events; also handle focusin/out for keyboard
        // Use pointerenter/pointerleave on the whole card so overlay buttons don't cancel the transform
        card.addEventListener('pointerenter', () => {
          try {
            const delta = Math.max(0, thumbImg.clientHeight - imgWrap.clientHeight);
            if (delta > 0 && !prefersReducedMotion) setThumbTranslate(thumbImg, delta);
          } catch (err) {}
        });
        card.addEventListener('pointerleave', () => { if (!prefersReducedMotion) setThumbTranslate(thumbImg, 0); });
        // keyboard focus in/out
        // focusin/out on the card or its controls should trigger the same effect for keyboard users
        imgWrap.addEventListener('focusin', () => { try { const delta = Math.max(0, thumbImg.clientHeight - imgWrap.clientHeight); if (delta > 0 && !prefersReducedMotion) setThumbTranslate(thumbImg, delta); } catch (err) {} });
        imgWrap.addEventListener('focusout', () => { if (!prefersReducedMotion) setThumbTranslate(thumbImg, 0); });
        card.addEventListener('focusin', () => { try { const delta = Math.max(0, thumbImg.clientHeight - imgWrap.clientHeight); if (delta > 0 && !prefersReducedMotion) setThumbTranslate(thumbImg, delta); } catch (err) {} });
        card.addEventListener('focusout', () => { if (!prefersReducedMotion) setThumbTranslate(thumbImg, 0); });
        // Hover scroll is handled through CSS to enable visible scrollbars and natural pointer/trackpad scrolling.
        // If you prefer auto-scroll to bottom on hover, we can re-enable JS behavior; for now rely on CSS-only.
      card.appendChild(imgWrap);

      // Actions moved to the card body for persistent visibility
      const liveLink = document.createElement('a'); liveLink.className = 'cta-live'; liveLink.href = proj.live || '#'; liveLink.target = '_blank'; liveLink.rel = 'noopener noreferrer'; liveLink.textContent = 'View Live ↗';
      const caseBtn = document.createElement('button'); caseBtn.className = 'cta-case'; caseBtn.type = 'button'; caseBtn.textContent = 'Case Study';

      const body = document.createElement('div'); body.className = 'card-body';
      const h3 = document.createElement('h3'); h3.className = 'card-title';
      const fullTitle = proj.title || '';
      const maxTitleChars = 80;
      if (fullTitle.length > maxTitleChars){ h3.textContent = fullTitle.slice(0, maxTitleChars - 3).trim() + '...'; h3.setAttribute('title', fullTitle); }
      else { h3.textContent = fullTitle; }
      const p = document.createElement('p'); p.className = 'card-meta';
      const fullDesc = proj.desc || '';
      const maxChars = 80;
      if (fullDesc.length > maxChars) {
        p.textContent = fullDesc.slice(0, maxChars - 3).trim() + '...';
        p.setAttribute('title', fullDesc);
      } else {
        p.textContent = fullDesc;
      }
      body.appendChild(h3); body.appendChild(p); card.appendChild(body);

      const badgesWrap = document.createElement('div'); badgesWrap.className = 'card-badges'; badgesWrap.setAttribute('aria-hidden','true');
      (proj.badges||[]).forEach(b => {
        const span = document.createElement('span'); span.className = `badge badge-${b}`; span.title = b.charAt(0).toUpperCase() + b.slice(1); span.setAttribute('aria-hidden','true'); span.textContent = b[0].toUpperCase();
        badgesWrap.appendChild(span);
      });
      card.appendChild(badgesWrap);

      const tags = document.createElement('div'); tags.className = 'card-tags'; tags.textContent = proj.category || '';
      card.appendChild(tags);

      // card-actions container in the card-body
      const actions = document.createElement('div'); actions.className = 'card-actions';
      actions.appendChild(liveLink); actions.appendChild(caseBtn);
      // append actions to the body (consistent placement) - keep as a fallback visible area
      body.appendChild(actions);
      grid.appendChild(card);
    });
    // Remove loading flag
    grid.removeAttribute('data-loading');
  }

  function renderFilters(categories){
    const controls = document.querySelector('.filter-controls');
    if (!controls) return;
    // begin by keeping the 'All' button and removing others (we'll rebuild)
    const allBtn = controls.querySelector('[data-filter="*"]');
    controls.innerHTML = '';
    if (allBtn) controls.appendChild(allBtn);
    else {
      const b = document.createElement('button'); b.className = 'filter-btn active'; b.setAttribute('data-filter', '*'); b.setAttribute('aria-pressed', 'true'); b.textContent = 'All'; controls.appendChild(b);
    }
    categories.forEach(cat => {
      const btn = document.createElement('button'); btn.className = 'filter-btn'; btn.setAttribute('data-filter', cat); btn.setAttribute('aria-pressed', 'false'); btn.textContent = cat.charAt(0).toUpperCase() + cat.slice(1);
      controls.appendChild(btn);
    });
    // refresh the button list and re-attach handlers
    btns = Array.from(document.querySelectorAll('.filter-btn'));
    btns.forEach(b => {
      b.addEventListener('click', () => {
        btns.forEach(x => { x.classList.remove('active'); x.setAttribute('aria-pressed','false'); });
        b.classList.add('active'); b.setAttribute('aria-pressed','true');
        filterPortfolio(b.getAttribute('data-filter'));
      });
      b.addEventListener('keyup', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); b.click(); } });
    });
  }

  function initCards(){
    cards = Array.from(grid.children);
    // initial reveal
    grid.classList.add('revealed');
    cards.forEach(c => { c.style.display = 'flex'; c.classList.add('is-hidden'); });
    cards.forEach((c, i) => setTimeout(() => showCard(c, i), i * 80));
    setTimeout(() => grid.classList.remove('revealed'), Math.min(600, cards.length * 80 + 150));

    // bind card behaviors (modal, live link) — similar to earlier code
    cards.forEach(card => {
      const caseBtn = card.querySelector('.cta-case');
      if (caseBtn) {
        if (modal) {
          caseBtn.addEventListener('click', (e) => { e.preventDefault(); openModalForCard(card, card.querySelector('.cta-live')?.href || '#'); });
          caseBtn.addEventListener('keyup', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); openModalForCard(card, card.querySelector('.cta-live')?.href || '#'); } });
        } else {
          // No modal on the page — make the case button open the live link by default
          caseBtn.addEventListener('click', (e) => { e.preventDefault(); window.open(card.querySelector('.cta-live')?.href || '#', '_blank'); });
        }
      }
      const liveLink = card.querySelector('.cta-live');
      if (liveLink){ liveLink.addEventListener('click', () => {}); }

      // Toolbar buttons: click behavior (case, info)
      const tbCaseBtn = card.querySelector('.tb-case');
      const tbLiveLink = card.querySelector('.tb-live');
      if (tbCaseBtn){ tbCaseBtn.addEventListener('click', (e) => { e.preventDefault(); openModalForCard(card, tbLiveLink?.href || '#'); }); }
      if (tbLiveLink){ tbLiveLink.addEventListener('click', (e) => { /* keep href behavior */ }); }
      // removed tb-info: no info button needed — panel remains accessible via other interactions if desired
    });

    // Ensure filtering reacts to new list and apply default filter
    checkNoResults();
    filterPortfolio('*');
  }

  // Create or toggle an accessible card panel containing details (full title, description, tech)
  function toggleCardPanel(card){
    if (!card) return;
    let panel = card.querySelector('.card-panel');
    if (!panel){
      panel = document.createElement('div'); panel.className = 'card-panel'; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-hidden', 'true');
      const closeBtn = document.createElement('button'); closeBtn.className = 'panel-close'; closeBtn.setAttribute('aria-label', 'Close details'); closeBtn.textContent = '✕';
      const panelBody = document.createElement('div'); panelBody.className = 'panel-body';
      const title = document.createElement('h4'); title.className = 'panel-title'; title.textContent = card.getAttribute('data-title') || card.querySelector('.card-title')?.textContent || '';
      const desc = document.createElement('p'); desc.className = 'panel-desc'; desc.textContent = card.getAttribute('data-desc') || card.querySelector('.card-meta')?.textContent || '';
      const tech = document.createElement('ul'); tech.className = 'panel-tech'; const techStr = card.getAttribute('data-tech') || '';
      (techStr.split(',').map(s => s.trim()).filter(Boolean)).forEach(t => { const li = document.createElement('li'); li.textContent = t; tech.appendChild(li); });
      panelBody.appendChild(title); panelBody.appendChild(desc); panelBody.appendChild(tech);
      panel.appendChild(closeBtn); panel.appendChild(panelBody);
      card.appendChild(panel);
      // focus handling
      closeBtn.addEventListener('click', () => { closeCardPanel(card); const focusTarget = card.querySelector('.tb-case') || card.querySelector('.cta-case'); if (focusTarget) focusTarget.focus(); });
      panel.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeCardPanel(card); const focusTarget = card.querySelector('.tb-case') || card.querySelector('.cta-case'); if (focusTarget) focusTarget.focus(); } });
      // focus trap helper
      panel._focusHandler = (e) => {
        if (e.key !== 'Tab') return;
        const focusable = Array.from(panel.querySelectorAll('a,button,input,textarea,select,[tabindex]:not([tabindex="-1"])')).filter(a => !a.hasAttribute('disabled'));
        if (!focusable.length) return;
        const first = focusable[0]; const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      };
      panel.addEventListener('keydown', panel._focusHandler);
    }
    // toggle
    const isOpen = panel.classList.contains('open');
    // no tb-info trigger present; do not set aria-expanded here
    if (isOpen){ closeCardPanel(card); } else { openCardPanel(card); }
  }
  function openCardPanel(card){
    const panel = card.querySelector('.card-panel'); if (!panel) return; panel.classList.add('open'); panel.setAttribute('aria-hidden','false');
    const closeBtn = panel.querySelector('.panel-close'); closeBtn.focus();
    // mark as a modal dialog for screen readers
    panel.setAttribute('aria-modal', 'true');
    // announce
    _srAnnouncer(`Details opened for ${card.getAttribute('data-title') || card.querySelector('.card-title')?.textContent || 'project'}`);
    // register document click handler to close when clicking outside
    const docClick = (e) => {
      if (!panel) return;
      const inPanel = e.target.closest('.card-panel');
      const inToolbar = e.target.closest('.card-toolbar');
      if (!inPanel && !inToolbar) { closeCardPanel(card); }
    };
    panel._docClick = docClick; document.addEventListener('click', docClick);
  }
  function closeCardPanel(card){
    const panel = card.querySelector('.card-panel'); if (!panel) return; panel.classList.remove('open'); panel.setAttribute('aria-hidden','true');
    // return focus to panel trigger if present
    const btn = card.querySelector('.tb-case') || card.querySelector('.cta-case'); if (btn) { btn.focus(); }
    // cleanup event listeners
    try { document.removeEventListener('click', panel._docClick); } catch (err) {}
    if (panel._focusHandler) panel.removeEventListener('keydown', panel._focusHandler);
    // remove aria modal attribute
    panel.removeAttribute('aria-modal');
    // announce close
    _srAnnouncer(`Details closed`);
  }

  // Start load
  loadProjects();

  // NOTE: per dynamic rendering, card event binding is handled in initCards()

  function openModalForCard(card, href){
    const title = card.getAttribute('data-title') || card.querySelector('.card-title')?.textContent || '';
    const desc = card.getAttribute('data-desc') || card.querySelector('.card-meta')?.textContent || '';
    const tech = (card.getAttribute('data-tech') || card.querySelector('.card-tags')?.textContent || '').split(',').map(s => s.trim()).filter(Boolean);
    const imgs = (card.getAttribute('data-screenshots') || '').split(';').map(s => s.trim()).filter(Boolean);
    const thumbEl = card.querySelector('.card-image img');
    currentImages = imgs.length ? imgs : [thumbEl ? thumbEl.src : ''];
    currentIdx = 0;
    lastFocused = document.activeElement;

    modalTitle.textContent = title;
    modalDesc.textContent = desc;
    modalTech.innerHTML = '';
    tech.forEach(t => {
      const li = document.createElement('li');
      li.textContent = t;
      modalTech.appendChild(li);
    });
    modalImage.src = currentImages[currentIdx];
    modalImage.alt = `${title} screenshot ${currentIdx+1} of ${currentImages.length}`;
    // Update 'open full image' link (if the button was added to the modal)
    if (modalFull){
      modalFull.href = currentImages[currentIdx] || modalLive.href || '#';
      modalFull.style.display = currentImages && currentImages[currentIdx] ? 'inline-block' : 'none';
    }
    // Add portrait-detection so tall images can be styled differently
    if (modalImage){
      modalImage.classList.remove('portrait');
      modalImage.onload = () => {
        try{
          if (modalImage.naturalHeight && modalImage.naturalWidth && (modalImage.naturalHeight / modalImage.naturalWidth) > 1.6){
            modalImage.classList.add('portrait');
          }
          // previously: infinite scroll was set up for very tall images. We now rely on native scrolling and/or zoom.
        }catch(err){/* ignore */}
      };
    }
    modalLive.href = href;
    // not using prev/next navigation; only update 'open full image' link

    // Reset zoom and pan (so modal opens in 'fit' mode)
    if (isZoomed) toggleZoom(false);
    // Show modal
    modal.setAttribute('aria-hidden', 'false');
    modal.classList.add('open');
    document.body.classList.add('modal-open');
    // focus management
    const closeBtn = modal.querySelector('.modal-close');
    closeBtn.focus();
    _srAnnouncer(`Opened modal for ${title}`);
  }

  function closeModal(){
    modal.setAttribute('aria-hidden', 'true');
    modal.classList.remove('open');
    document.body.classList.remove('modal-open');
    if (isZoomed) toggleZoom(false);
    if (lastFocused) lastFocused.focus();
    _srAnnouncer('Modal closed');
  }

  if (modal){
    if (modalCloseBtns && modalCloseBtns.length) modalCloseBtns.forEach(btn => btn.addEventListener('click', () => closeModal()));
    if (modalBackdrop) modalBackdrop.addEventListener('click', () => closeModal());

    modal.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeModal();
      // zoom toggle with + key?  Shift+Z or double click preferred. No arrow navigation.
    });

    // Wire up zoom button
    if (modalZoom) modalZoom.addEventListener('click', (e) => { e.preventDefault(); toggleZoom(); });
    if (modalImage) bindModalImageEvents();
      // no infinite-scroll wrapper needed
  }

  // Zoom & pan helpers
  function applyTransform(){
    if (!modalImage) return;
    modalImage.style.transform = `translate(${panX}px, ${panY}px) scale(${zoomScale})`;
  }

  // Modal image event helpers — declared in DOMContentLoaded scope and used for zoom/pan interactions
  function onModalDblClick(e){ toggleZoom(); }
  function onModalWheel(e){
    if (!isZoomed) return; if (!e.ctrlKey && !e.metaKey) return; e.preventDefault();
    const delta = -e.deltaY * 0.001; zoomScale = Math.max(1, Math.min(4, zoomScale + delta)); clampPan(); applyTransform();
  }
  // Cancel any active panning (used when switching to pinch gestures)
  function cancelActivePan(){
    if (!modalImage) return;
    if (!activePointerId) return;
    try{ modalImage.releasePointerCapture(activePointerId); } catch (err){}
    modalImage.classList.remove('grabbing');
    modalImage.removeEventListener('pointermove', onPointerMove);
    modalImage.removeEventListener('pointerup', onPointerUp);
    modalImage.removeEventListener('pointercancel', onPointerUp);
    activePointerId = null;
  }

  // unified pointer handlers that dispatch to pan or pinch handlers depending on pointer count
  function handlePointerDown(e){
    onPointerDownPinch(e); // always track pointer
    // if this pointer results in a multi-touch action, cancel any active pan
    const count = Object.keys(pointers).length;
    if (count >= 2){ cancelActivePan(); return; }
    // single pointer -> start panning only if zoomed
    if (isZoomed && count === 1) onPointerDown(e);
  }
  function handlePointerMove(e){
    onPointerMovePinch(e);
    if (!activePointerId) return; // no active single-pointer pan
    if (e.pointerId !== activePointerId) return;
    onPointerMove(e);
  }
  function handlePointerUp(e){
    onPointerUpPinch(e);
    if (activePointerId && e.pointerId === activePointerId) onPointerUp(e);
  }

  function bindModalImageEvents(){
    if (!modalImage) return;
    try{ modalImage.addEventListener('dblclick', onModalDblClick); } catch (err){}
    try{ modalImage.addEventListener('pointerdown', handlePointerDown); } catch (err){}
    try{ modalImage.addEventListener('pointermove', handlePointerMove); } catch (err){}
    try{ modalImage.addEventListener('pointerup', handlePointerUp); } catch (err){}
    try{ modalImage.addEventListener('pointercancel', handlePointerUp); } catch (err){}
    try{ modalImage.addEventListener('wheel', onModalWheel, { passive: false }); } catch (err){}
  }
  function unbindModalImageEvents(){
    if (!modalImage) return;
    try{ modalImage.removeEventListener('dblclick', onModalDblClick); } catch (err){}
    try{ modalImage.removeEventListener('pointerdown', handlePointerDown); } catch (err){}
    try{ modalImage.removeEventListener('pointermove', handlePointerMove); } catch (err){}
    try{ modalImage.removeEventListener('pointerup', handlePointerUp); } catch (err){}
    try{ modalImage.removeEventListener('pointercancel', handlePointerUp); } catch (err){}
    try{ modalImage.removeEventListener('wheel', onModalWheel, { passive: false }); } catch (err){}
  }

  function clampPan(){
    if (!modalImage || !modalMedia) return;
    const containerRect = modalMedia.getBoundingClientRect();
    const imgRect = modalImage.getBoundingClientRect();
    const baseWidth = modalImage.clientWidth || imgRect.width;
    const baseHeight = modalImage.clientHeight || imgRect.height;
    const scaledWidth = baseWidth * zoomScale;
    const scaledHeight = baseHeight * zoomScale;
    const maxPanX = Math.max(0, (scaledWidth - containerRect.width) / 2);
    const maxPanY = Math.max(0, (scaledHeight - containerRect.height) / 2);
    panX = Math.min(maxPanX, Math.max(-maxPanX, panX));
    panY = Math.min(maxPanY, Math.max(-maxPanY, panY));
  }

  function toggleZoom(on){
    isZoomed = typeof on === 'boolean' ? on : !isZoomed;
    if (!modalImage || !modalMedia) return;
    if (isZoomed){
      // when enabling zoom, we keep native scrolling disabled in zoom mode to prevent scroll/pan conflicts
      modalMedia.classList.add('zoomed');
      modalImage.classList.add('zoomed');
      // Reset pan
      panX = 0; panY = 0; startPanX = 0; startPanY = 0;
      applyTransform();
      if (modalZoom) modalZoom.setAttribute('aria-pressed','true');
      _srAnnouncer('Zoom enabled');
    } else {
      modalMedia.classList.remove('zoomed');
      modalImage.classList.remove('zoomed');
      panX = 0; panY = 0;
      modalImage.style.transform = '';
      if (modalZoom) modalZoom.setAttribute('aria-pressed','false');
      _srAnnouncer('Zoom disabled');
      // after disabling zoom, we will use native scrolling again if the image exceeds the container height
    }
  }

  // NOTE: Infinite scroll removed; native scrolling is used instead

  function onPointerDown(e){
    if (!isZoomed) return;
    if (activePointerId) return; // already tracking
    activePointerId = e.pointerId;
    startX = e.clientX; startY = e.clientY; startPanX = panX; startPanY = panY;
    modalImage.setPointerCapture(activePointerId);
    modalImage.classList.add('grabbing');
    modalImage.addEventListener('pointermove', onPointerMove);
    modalImage.addEventListener('pointerup', onPointerUp);
    modalImage.addEventListener('pointercancel', onPointerUp);
    e.preventDefault();
  }

  function onPointerMove(e){
    if (e.pointerId !== activePointerId) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    panX = startPanX + dx;
    panY = startPanY + dy;
    clampPan();
    applyTransform();
    e.preventDefault();
  }

  function onPointerUp(e){
    if (e.pointerId !== activePointerId) return;
    try { modalImage.releasePointerCapture(activePointerId); } catch (err) {}
    activePointerId = null;
    modalImage.classList.remove('grabbing');
    modalImage.removeEventListener('pointermove', onPointerMove);
    modalImage.removeEventListener('pointerup', onPointerUp);
    modalImage.removeEventListener('pointercancel', onPointerUp);
  }

  let pointers = {};
  let initialPinchDistance = null;
  let initialZoomScale = 1;
  function onPointerDownPinch(e){
    pointers[e.pointerId] = e;
    if (Object.keys(pointers).length === 2){
      // two pointers -> pinch begin
      const ids = Object.keys(pointers);
      const p1 = pointers[ids[0]], p2 = pointers[ids[1]];
      initialPinchDistance = Math.hypot(p1.clientX - p2.clientX, p1.clientY - p2.clientY);
      initialZoomScale = zoomScale;
    }
  }
  function onPointerMovePinch(e){
    if (!pointers[e.pointerId]) return;
    pointers[e.pointerId] = e;
    if (Object.keys(pointers).length === 2 && initialPinchDistance){
      const ids = Object.keys(pointers);
      const p1 = pointers[ids[0]], p2 = pointers[ids[1]];
      const dist = Math.hypot(p1.clientX - p2.clientX, p1.clientY - p2.clientY);
      const ratio = dist / initialPinchDistance;
      zoomScale = Math.max(1, Math.min(4, initialZoomScale * ratio));
      clampPan(); applyTransform();
    }
  }
  function onPointerUpPinch(e){
    delete pointers[e.pointerId];
    if (Object.keys(pointers).length < 2){
      initialPinchDistance = null;
    }
  }

  // wheel to adjust zoom scale handled via `bindModalImageEvents` to allow rebinding when swapping images.

  // No prev/next functions — modal displays a single full screenshot; we use zoom & pan for portrait images.

    // Contact form handling using Formspree with progressive enhancement (fetch + fallback)
    const contactForm = document.getElementById('contactForm');
    if (contactForm){
      const statusEl = document.getElementById('formStatus');
      const submitBtn = contactForm.querySelector('button[type="submit"]');
      const spinner = submitBtn?.querySelector('.spinner');

      contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        // reset status
        if (statusEl){ statusEl.style.display = 'block'; statusEl.className = 'form-status info'; statusEl.textContent = 'Sending...'; }

        // Built-in validation: checks required and type constraints
        if (!contactForm.checkValidity()){
          if (statusEl){ statusEl.className = 'form-status error'; statusEl.textContent = 'Please fill out the form correctly before sending.'; }
          // show browser's native validation UI where available
          contactForm.reportValidity?.();
          return;
        }

        // Honeypot anti-spam — check multiple common honeypot names
        const gotcha = contactForm.querySelector('input[name="_gotcha"]')?.value || '';
        const websiteField = contactForm.querySelector('input[name="website"]')?.value || '';
        if (gotcha || websiteField){
          // pretend success to trick bots; do not send
          if (statusEl){ statusEl.className = 'form-status success'; statusEl.textContent = 'Thanks!'; }
          contactForm.reset();
          return;
        }

        // disable submit and show spinner
        if (submitBtn){ submitBtn.disabled = true; submitBtn.setAttribute('aria-busy', 'true'); }
        if (spinner){ spinner.style.display = 'inline-block'; }

        // Build form data
        const formData = new FormData(contactForm);

        try {
          const resp = await fetch(contactForm.action || 'https://formspree.io/f/xnnezeqz', {
            method: 'POST',
            body: formData,
            headers: {
              'Accept': 'application/json'
            }
          });

          if (resp.ok){
            if (statusEl){ statusEl.className = 'form-status success'; statusEl.textContent = 'Thanks! Your message was sent — I’ll reply within 1–2 business days.'; statusEl.scrollIntoView?.({behavior: 'smooth', block: 'center'}); }
            contactForm.reset();
            // return focus to the button briefly to support keyboard users
            submitBtn?.focus();
          } else {
            // Attempt to read JSON error details
            let errMsg = 'There was a problem sending your message. Please try again later.';
            try { const data = await resp.json(); if (data && data.error) errMsg = data.error; } catch (err) {}
            if (statusEl){ statusEl.className = 'form-status error'; statusEl.textContent = errMsg; }
            // if the server denies, offer a mailto fallback to the user
            
          }
        } catch (err) {
          // Network or unexpected issue — provide a mailto fallback prompt to user
          const name = contactForm.querySelector('#name')?.value.trim() || '';
          const email = contactForm.querySelector('#email')?.value.trim() || '';
          const subject = contactForm.querySelector('#subject')?.value.trim() || '';
          const message = contactForm.querySelector('#message')?.value.trim() || '';
          const fallbackMailto = `mailto:hello@example.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\n${message}`)}`;
          if (confirm('Unable to send message directly — would you like to open your email client to send this message?')){
            window.location.href = fallbackMailto;
            if (statusEl){ statusEl.className = 'form-status info'; statusEl.textContent = 'Your email client will open — please send the message there.'; }
          } else {
            if (statusEl){ statusEl.className = 'form-status error'; statusEl.textContent = 'Message not sent. Please try again later or email hello@example.com directly.'; }
          }
        } finally {
          if (submitBtn){ submitBtn.disabled = false; submitBtn.setAttribute('aria-busy', 'false'); }
          if (spinner){ spinner.style.display = 'none'; }
        }
      });
    }

    /* Contrast Audit (dev tool) — placed outside the submit handler */
    function parseCSSColor(value){
      if (!value) return null;
      value = value.trim();
      // If it's a CSS variable like var(--accent) or a custom property name, resolve it
      if (value.startsWith('var(') || value.startsWith('--')){
        const varName = value.startsWith('var(') ? value.replace(/^var\(|\)$/g, '').trim() : value; 
        value = getComputedStyle(document.documentElement).getPropertyValue(varName) || value;
      }
      // hex form
      if (value[0] === '#'){
        const hex = value.replace('#','');
        const clean = hex.length === 3 ? hex.split('').map(c => c + c).join('') : hex;
        const bigint = parseInt(clean, 16);
        const r = (bigint >> 16) & 255;
        const g = (bigint >> 8) & 255;
        const b = bigint & 255;
        return [r,g,b];
      }
      // rgb / rgba
      const rgbMatch = value.match(/rgba?\((\d+)\s*,?\s*(\d+)\s*,?\s*(\d+)/i);
      if (rgbMatch) return [parseInt(rgbMatch[1],10), parseInt(rgbMatch[2],10), parseInt(rgbMatch[3],10)];
      // fallback: compute using a temp element
      try {
        const node = document.createElement('div'); node.style.color = value; document.body.appendChild(node);
        const computed = getComputedStyle(node).color; document.body.removeChild(node);
        const m = computed.match(/rgba?\((\d+)\s*,?\s*(\d+)\s*,?\s*(\d+)/i);
        if (m) return [parseInt(m[1],10), parseInt(m[2],10), parseInt(m[3],10)];
      } catch (err) {}
      return null;
    }

    function luminance(r,g,b){
      const a = [r,g,b].map(v => {
        v = v / 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
    }

    function contrastRatio(rgb1, rgb2){
      if (!rgb1 || !rgb2) return 1;
      const L1 = luminance(rgb1[0], rgb1[1], rgb1[2]);
      const L2 = luminance(rgb2[0], rgb2[1], rgb2[2]);
      const lighter = Math.max(L1,L2); const darker = Math.min(L1,L2);
      return +(((lighter + 0.05) / (darker + 0.05)).toFixed(2));
    }

    function getCSSVar(varName){
      try { return getComputedStyle(document.documentElement).getPropertyValue(varName).trim(); } catch (err){ return ''; }
    }

    function buildContrastReport(){
      const checks = [
        { selector: '.btn', bg: '--accent', hover: '--accent-hover', name: 'Primary button' },
        { selector: '.filter-btn.active', bg: '--accent-2', hover: '--accent-2-hover', name: 'Filter active' },
        { selector: '.fab-cta', bg: '--accent-3', hover: '--accent-3-hover', name: 'Floating CTA' },
        { selector: '.bubble', bg: '--accent', hover: '--accent-hover', name: 'Bubble' },
        { selector: '.bubble[data-variant="coral"]', bg: '--accent-2', hover: '--accent-2-hover', name: 'Bubble coral' },
        { selector: '.bubble[data-variant="violet"]', bg: '--accent-3', hover: '--accent-3-hover', name: 'Bubble violet' },
        { selector: '.bubble[data-variant="green"]', bg: '--brand-success', hover: '--brand-success', name: 'Bubble green' },
        { selector: '.bubble[data-variant="gold"]', bg: '--accent-4', hover: '--accent-4-hover', name: 'Bubble gold' },
        { selector: '.logo-mark', bg: '--accent', hover: '--accent-hover', name: 'Logo mark' }
      ];

      const overlay = document.createElement('div');
      overlay.id = 'contrastAuditOverlay'; overlay.className = 'contrast-overlay';
      overlay.innerHTML = '<h4>Contrast Audit</h4>';

      checks.forEach((c) => {
        const el = document.querySelector(c.selector);
        if (!el) return;
        const fg = getComputedStyle(el).color;
        const fgRgb = parseCSSColor(fg) || [255,255,255];
        const bgVal = getCSSVar(c.bg) || getComputedStyle(el).backgroundColor;
        const bgRgb = parseCSSColor(bgVal) || [255,255,255];
        const hoverVal = getCSSVar(c.hover) || bgVal;
        const hoverRgb = parseCSSColor(hoverVal) || bgRgb;
        const normalRatio = contrastRatio(fgRgb, bgRgb);
        const hoverRatio = contrastRatio(fgRgb, hoverRgb);
        const passNormal = normalRatio >= 4.5;
        const passHover = hoverRatio >= 4.5;

        const item = document.createElement('div');
        item.className = 'item';
        const status = passNormal && passHover ? '<span class="pass">AA</span>' : '<span class="fail">FAIL</span>';
        item.innerHTML = `<div><strong>${c.name}</strong><div style="font-size:0.85rem;color:var(--muted)">Normal: <span class="ratio">${normalRatio}</span> • Hover: <span class="ratio">${hoverRatio}</span></div></div><div>${status}</div>`;
        overlay.appendChild(item);
      });

      const controls = document.createElement('div'); controls.className = 'controls';
      const closeBtn = document.createElement('button'); closeBtn.className = 'btn outline'; closeBtn.textContent = 'Close';
      closeBtn.addEventListener('click', () => overlay.remove());
      controls.appendChild(closeBtn); overlay.appendChild(controls);
      document.body.appendChild(overlay);
    }

    const contrastToggle = document.getElementById('contrastCheckToggle');
    if (contrastToggle){
      contrastToggle.addEventListener('click', () => {
        const existing = document.getElementById('contrastAuditOverlay');
        if (existing){ existing.remove(); contrastToggle.setAttribute('aria-pressed','false'); return; }
        buildContrastReport();
        contrastToggle.setAttribute('aria-pressed','true');
      });
    }

});
