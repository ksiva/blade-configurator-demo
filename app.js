// Resonant Blade Configurator - Application Controller (Resonance Identity)
import { createViewer } from './viewer.js';
import { config, rules, getDefaultState, calculateTotals } from './config.js';

(async function () {
  'use strict';

  // Application State
  let state = getDefaultState();
  let viewer = null;
  let currentStep = 0;
  let layersActive = false;
  let spinActive = false;
  let selectedSnapshotSize = 2048;
  let selectedSnapshotTransparent = true;
  let splitComparisonActive = false;

  // DOM Elements
  const canvas = document.getElementById('c');
  const labelLayer = document.getElementById('labels');
  const stageLoader = document.getElementById('stageLoader');
  const loaderBar = document.getElementById('loaderBar');
  const loaderText = document.getElementById('loaderText');
  const stageError = document.getElementById('stageError');

  const stageViewport = document.getElementById('stageViewport');
  const splitPhotoPane = document.getElementById('splitPhotoPane');
  const comparisonPhoto = document.getElementById('comparisonPhoto');
  const btnComparePhoto = document.getElementById('btnComparePhoto');
  const btnCloseComparison = document.getElementById('btnCloseComparison');
  const canvasBadge = document.getElementById('canvasBadge');

  const resonancePulse = document.getElementById('resonancePulse');

  // Ring Rail & Panes
  const railItems = document.querySelectorAll('.rail-item');
  const stepPanes = document.querySelectorAll('.step-pane');
  const btnCardBack = document.getElementById('btnCardBack');
  const btnCardNext = document.getElementById('btnCardNext');

  // Option Controls
  const cardHandle1 = document.getElementById('cardHandle1');
  const cardHandle2 = document.getElementById('cardHandle2');
  const radioHandle1 = cardHandle1.querySelector('input');
  const radioHandle2 = cardHandle2.querySelector('input');

  const optStructureSolid = document.getElementById('optStructureSolid');
  const optStructurePartial = document.getElementById('optStructurePartial');
  const optStructureMax = document.getElementById('optStructureMax');
  const radioStructureSolid = optStructureSolid.querySelector('input');
  const radioStructurePartial = optStructurePartial.querySelector('input');
  const radioStructureMax = optStructureMax.querySelector('input');
  const maxHollowReason = document.getElementById('maxHollowReason');
  const ruleAlert = document.getElementById('ruleAlert');
  const ruleAlertText = document.getElementById('ruleAlertText');
  const btnSeeInLayers = document.getElementById('btnSeeInLayers');

  const optFinishOiled = document.getElementById('optFinishOiled');
  const optFinishUntreated = document.getElementById('optFinishUntreated');
  const radioFinishOiled = optFinishOiled.querySelector('input');
  const radioFinishUntreated = optFinishUntreated.querySelector('input');

  const toggleFlag = document.getElementById('toggleFlag');
  const flagPicker = document.getElementById('flagPicker');
  const flagButtons = flagPicker.querySelectorAll('.flag-btn');

  const togglePlate = document.getElementById('togglePlate');
  const inputEngraving = document.getElementById('inputEngraving');
  const engravingCount = document.getElementById('engravingCount');

  // Stage Price and Weight Display
  const displayPrice = document.getElementById('displayPrice');
  const displayWeight = document.getElementById('displayWeight');

  // Build Sheet Elements
  const buildSheetList = document.getElementById('buildSheetList');
  const sheetPrice = document.getElementById('sheetPrice');
  const sheetWeight = document.getElementById('sheetWeight');
  const btnAddToCart = document.getElementById('btnAddToCart');
  const btnCopyLink = document.getElementById('btnCopyLink');
  const copyLinkText = document.getElementById('copyLinkText');
  const copyLinkIcon = document.getElementById('copyLinkIcon');
  const btnSaveImage = document.getElementById('btnSaveImage');
  const segBtns = document.querySelectorAll('.seg-btn');

  // Toolbar & Views
  const viewButtons = document.querySelectorAll('.view-btn');
  const btnLayers = document.getElementById('btnLayers');
  const btnSpin = document.getElementById('btnSpin');

  // Add to Cart Modal
  const cartModal = document.getElementById('cartModal');
  const btnCloseModal = document.getElementById('btnCloseModal');
  const btnDismissModal = document.getElementById('btnDismissModal');
  const modalTableBody = document.getElementById('modalTableBody');

  // ==========================================================================
  // Resonance Pulse
  // ==========================================================================
  function triggerResonancePulse() {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }
    // Remove existing pulse ring if still animating
    const existing = resonancePulse.querySelector('.pulse-ring');
    if (existing) existing.remove();

    const ring = document.createElement('div');
    ring.className = 'pulse-ring';
    resonancePulse.appendChild(ring);
    setTimeout(() => {
      ring.remove();
    }, 950);
  }

  // ==========================================================================
  // Hash Serialization & Parsing
  // ==========================================================================
  function parseHash(hashStr) {
    const defaults = getDefaultState();
    if (!hashStr || hashStr === '#') return defaults;

    const raw = hashStr.startsWith('#') ? hashStr.slice(1) : hashStr;
    const params = new URLSearchParams(raw);
    const parsed = { ...defaults };

    const h = params.get('h');
    if (h === '1' || h === '2') {
      parsed.handle = parseInt(h, 10);
    }

    const structure = params.get('structure');
    if (structure && ['solid', 'partial', 'max'].includes(structure)) {
      parsed.structure = structure;
    }

    const finish = params.get('finish');
    if (finish && ['oiled', 'untreated'].includes(finish)) {
      parsed.finish = finish;
    }

    const flag = params.get('flag');
    if (flag === null) {
      parsed.flag = parsed.handle === 2 ? null : 'br'; // Handle 1 as photographed carries the Brazil badge
    } else if (config.flags.some(f => f.id === flag)) {
      parsed.flag = flag;
    } else {
      parsed.flag = null;
    }

    const plate = params.get('plate');
    if (plate !== null) {
      parsed.plate = (plate === '1' || plate === 'true');
    } else if (parsed.handle === 2) {
      parsed.plate = false; // Handle 2's photo has no plate
    }

    const engrave = params.get('engrave');
    if (engrave) {
      parsed.engraving = engrave.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
    }

    return parsed;
  }

  function serializeHash(currentState) {
    const params = new URLSearchParams();
    params.set('h', currentState.handle);
    params.set('structure', currentState.structure);
    params.set('finish', currentState.finish);
    params.set('flag', currentState.flag || 'none');
    params.set('plate', currentState.plate ? '1' : '0');
    if (currentState.engraving && currentState.engraving.trim()) {
      params.set('engrave', currentState.engraving.trim());
    }
    return '#' + params.toString();
  }

  function syncUrlHash(replace = true) {
    const hash = serializeHash(state);
    if (window.location.hash !== hash) {
      if (replace && window.history && window.history.replaceState) {
        window.history.replaceState(null, '', hash);
      } else {
        window.location.hash = hash;
      }
    }
  }

  // ==========================================================================
  // Step Navigation in Enamel Card & Rail
  // ==========================================================================
  function goToStep(stepIndex) {
    currentStep = Math.max(0, Math.min(stepIndex, config.steps.length - 1));

    // Update rail markers
    railItems.forEach((btn, idx) => {
      if (idx === currentStep) {
        btn.classList.add('active');
        btn.setAttribute('aria-current', 'step');
      } else {
        btn.classList.remove('active');
        btn.removeAttribute('aria-current');
      }
    });

    // Update visible step pane
    stepPanes.forEach((pane, idx) => {
      if (idx === currentStep) {
        pane.classList.add('active');
      } else {
        pane.classList.remove('active');
      }
    });

    // Update Card Navigation Buttons
    if (currentStep === 0) {
      btnCardBack.style.display = 'none';
      btnCardNext.style.display = 'inline-flex';
      btnCardNext.textContent = `Next: ${config.steps[1].name} \u2192`;
    } else if (currentStep < config.steps.length - 1) {
      btnCardBack.style.display = 'inline-flex';
      btnCardBack.textContent = `\u2190 ${config.steps[currentStep - 1].name}`;
      btnCardNext.style.display = 'inline-flex';
      btnCardNext.textContent = `Next: ${config.steps[currentStep + 1].name} \u2192`;
    } else {
      // Step 5: Your blade (Build sheet)
      btnCardBack.style.display = 'inline-flex';
      btnCardBack.textContent = `\u2190 ${config.steps[currentStep - 1].name}`;
      btnCardNext.style.display = 'none';
    }

    if (currentStep === 5) {
      renderBuildSheet();
    }
  }

  // Rail clicks
  railItems.forEach((item, idx) => {
    item.addEventListener('click', () => goToStep(idx));
  });

  btnCardBack.addEventListener('click', () => {
    if (currentStep > 0) goToStep(currentStep - 1);
  });

  btnCardNext.addEventListener('click', () => {
    if (currentStep < config.steps.length - 1) goToStep(currentStep + 1);
  });

  // Keyboard navigation for rail
  window.addEventListener('keydown', e => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
      return;
    }
    if (e.key === 'ArrowRight' && currentStep < config.steps.length - 1) {
      goToStep(currentStep + 1);
    } else if (e.key === 'ArrowLeft' && currentStep > 0) {
      goToStep(currentStep - 1);
    }
  });

  // ==========================================================================
  // Camera & Views
  // ==========================================================================
  function setActiveViewButton(viewName) {
    viewButtons.forEach(btn => {
      if (btn.dataset.view === viewName && !btn.classList.contains('toggle-btn')) {
        btn.classList.add('active');
      } else if (!btn.classList.contains('toggle-btn')) {
        btn.classList.remove('active');
      }
    });
  }

  function switchCameraView(viewName) {
    if (layersActive) {
      layersActive = false;
      btnLayers.classList.remove('active');
      if (viewer && viewer.explode) viewer.explode(false);
    }
    if (viewer && viewer.view) {
      viewer.view(viewName);
    }
    setActiveViewButton(viewName);
  }

  function toggleLayersView() {
    layersActive = !layersActive;
    if (layersActive) {
      btnLayers.classList.add('active');
      if (viewer && viewer.explode) viewer.explode(true, config.layers);
      viewButtons.forEach(b => {
        if (!b.classList.contains('toggle-btn')) b.classList.remove('active');
      });
    } else {
      btnLayers.classList.remove('active');
      if (viewer && viewer.explode) viewer.explode(false);
      switchCameraView('three');
    }
  }

  function toggleSpinView() {
    spinActive = !spinActive;
    if (spinActive) {
      btnSpin.classList.add('active');
      if (viewer && viewer.spin) viewer.spin(true);
    } else {
      btnSpin.classList.remove('active');
      if (viewer && viewer.spin) viewer.spin(false);
    }
  }

  // Keep the blade, rings and spotlight centred in the space the rail and card leave free
  function fitStage() {
    const stage = document.querySelector('.stage-container');
    const box = stage.getBoundingClientRect();
    let inset = { t: 0, r: 0, b: 0, l: 0 };
    if (window.matchMedia('(min-width: 901px)').matches) {
      if (!splitComparisonActive) {
        const card = document.getElementById('enamelCard').getBoundingClientRect();
        const rail = document.querySelector('.ring-rail').getBoundingClientRect();
        inset = { t: 16, r: Math.max(0, box.right - card.left) + 16, b: 66, l: Math.max(0, rail.right - box.left) + 8 };
      }
    } else {
      inset = { t: 6, r: 0, b: 50, l: 0 };
    }
    stage.style.setProperty('--cx', `${inset.l + (box.width - inset.l - inset.r) / 2}px`);
    stage.style.setProperty('--cy', `${inset.t + (box.height - inset.t - inset.b) / 2}px`);
    if (viewer && viewer.setInsets) viewer.setInsets(inset);
  }
  window.addEventListener('resize', fitStage);

  // Compare with Your Photo
  function openPhotoComparison() {
    splitComparisonActive = true;
    document.body.classList.add('comparing');
    stageViewport.classList.add('split-active');
    fitStage();
    canvasBadge.style.display = 'block';
    comparisonPhoto.src = state.handle === 2 ? 'assets/photo-handle2.jpg' : 'assets/photo-handle1.jpg';
    if (viewer && viewer.view) viewer.view('photo');
    // Viewer resize observer will adjust canvas automatically
  }

  function closePhotoComparison() {
    splitComparisonActive = false;
    document.body.classList.remove('comparing');
    stageViewport.classList.remove('split-active');
    fitStage();
    canvasBadge.style.display = 'none';
    if (viewer && viewer.view) viewer.view('three');
    setActiveViewButton('three');
  }

  btnComparePhoto.addEventListener('click', openPhotoComparison);
  btnCloseComparison.addEventListener('click', closePhotoComparison);

  // ==========================================================================
  // UI & State Synchronization
  // ==========================================================================
  function updateRuleCompatibility(warningMessage = null) {
    const isMaxBlocked = rules.isStructureDisabled('max', state);

    if (isMaxBlocked) {
      optStructureMax.classList.add('disabled');
      radioStructureMax.disabled = true;
      maxHollowReason.textContent = isMaxBlocked;
      maxHollowReason.style.display = 'block';
    } else {
      optStructureMax.classList.remove('disabled');
      radioStructureMax.disabled = false;
      maxHollowReason.style.display = 'none';
    }

    if (warningMessage) {
      ruleAlertText.textContent = warningMessage;
      ruleAlert.classList.add('visible');
    } else {
      ruleAlert.classList.remove('visible');
    }
  }

  function renderBuildSheet() {
    const totals = calculateTotals(state);
    buildSheetList.innerHTML = '';

    totals.items.forEach(item => {
      const row = document.createElement('div');
      row.className = 'build-sheet-row';

      const left = document.createElement('div');
      const name = document.createElement('div');
      name.className = 'sheet-row-name';
      name.textContent = item.label;
      left.appendChild(name);

      if (item.desc) {
        const desc = document.createElement('div');
        desc.className = 'sheet-row-desc';
        desc.textContent = item.desc;
        left.appendChild(desc);
      }

      const price = document.createElement('div');
      price.className = 'sheet-row-price tabular';
      price.textContent = `\u20ac${item.price}`;

      row.appendChild(left);
      row.appendChild(price);
      buildSheetList.appendChild(row);
    });

    sheetPrice.textContent = `\u20ac${totals.price}`;
    sheetWeight.textContent = `${totals.weight} g ${config.weightTolerance}`;
  }

  function renderTotals() {
    const totals = calculateTotals(state);

    displayPrice.textContent = totals.price;
    displayWeight.textContent = `Estimated weight ${totals.weight} g`;

    if (currentStep === 5) {
      renderBuildSheet();
    }
  }

  function syncControlsWithState(warningMessage = null) {
    // 1. Handle Selection
    if (state.handle === 1) {
      cardHandle1.classList.add('selected');
      cardHandle2.classList.remove('selected');
      radioHandle1.checked = true;
      comparisonPhoto.src = 'assets/photo-handle1.jpg';
    } else {
      cardHandle1.classList.remove('selected');
      cardHandle2.classList.add('selected');
      radioHandle2.checked = true;
      comparisonPhoto.src = 'assets/photo-handle2.jpg';
    }

    // 2. Rule compatibility checks
    updateRuleCompatibility(warningMessage);

    // 3. Structure Selection
    [optStructureSolid, optStructurePartial, optStructureMax].forEach(el => el.classList.remove('selected'));
    if (state.structure === 'solid') {
      optStructureSolid.classList.add('selected');
      radioStructureSolid.checked = true;
    } else if (state.structure === 'partial') {
      optStructurePartial.classList.add('selected');
      radioStructurePartial.checked = true;
    } else if (state.structure === 'max') {
      optStructureMax.classList.add('selected');
      radioStructureMax.checked = true;
    }

    // 4. Finish Selection
    if (state.finish === 'oiled') {
      optFinishOiled.classList.add('selected');
      optFinishUntreated.classList.remove('selected');
      radioFinishOiled.checked = true;
    } else {
      optFinishOiled.classList.remove('selected');
      optFinishUntreated.classList.add('selected');
      radioFinishUntreated.checked = true;
    }

    // 5. Personalisation: Flag
    if (state.flag) {
      toggleFlag.checked = true;
      flagPicker.style.display = 'flex';
      flagButtons.forEach(btn => {
        if (btn.dataset.flag === state.flag) {
          btn.classList.add('selected');
        } else {
          btn.classList.remove('selected');
        }
      });
    } else {
      toggleFlag.checked = false;
      flagPicker.style.display = 'none';
      flagButtons.forEach(btn => btn.classList.remove('selected'));
    }

    // 6. Personalisation: Plate
    togglePlate.checked = Boolean(state.plate);

    // 7. Personalisation: Engraving
    inputEngraving.value = state.engraving || '';
    engravingCount.textContent = `${(state.engraving || '').length}/12`;

    // 8. 3D Viewer Update
    if (viewer && viewer.set) {
      viewer.set({
        handle: state.handle,
        finish: state.finish,
        flag: state.flag,
        plate: state.plate,
        engraving: state.engraving,
        structure: state.structure
      });
    }

    // 9. Live price & weight
    renderTotals();
    syncUrlHash();
  }

  // ==========================================================================
  // Event Bindings
  // ==========================================================================

  // Toolbar View Buttons
  viewButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view;
      if (view === 'layers') {
        toggleLayersView();
      } else if (view === 'spin') {
        toggleSpinView();
      } else {
        switchCameraView(view);
      }
    });
  });

  btnSeeInLayers.addEventListener('click', () => {
    if (!layersActive) toggleLayersView();
  });

  // Handle choice
  let flagChosen = false;
  function setHandle(hNum) {
    if (state.handle === hNum) return;

    state.handle = hNum;
    state.plate = hNum === 1; // the plate and badge follow the handle's own photo
    if (!flagChosen) state.flag = hNum === 1 ? 'br' : null;

    triggerResonancePulse();

    const normalized = rules.normalize(state);
    state = normalized.state;

    syncControlsWithState(normalized.warning);
  }

  cardHandle1.addEventListener('click', () => setHandle(1));
  cardHandle2.addEventListener('click', () => setHandle(2));

  // Structure choice
  function setStructure(structId) {
    if (state.handle === 2 && structId === 'max') return;
    if (state.structure === structId) return;

    state.structure = structId;
    triggerResonancePulse();
    syncControlsWithState(null);
  }

  optStructureSolid.addEventListener('click', () => setStructure('solid'));
  optStructurePartial.addEventListener('click', () => setStructure('partial'));
  optStructureMax.addEventListener('click', () => setStructure('max'));

  // Finish choice
  function setFinish(finishId) {
    if (state.finish === finishId) return;
    state.finish = finishId;
    triggerResonancePulse();
    syncControlsWithState(null);
  }

  optFinishOiled.addEventListener('click', () => setFinish('oiled'));
  optFinishUntreated.addEventListener('click', () => setFinish('untreated'));

  // Flag toggle
  toggleFlag.addEventListener('change', () => {
    if (toggleFlag.checked) {
      flagChosen = true;
      state.flag = state.flag || config.defaultFlag || 'ch';
      switchCameraView('back');
    } else {
      flagChosen = true;
      state.flag = null;
    }
    triggerResonancePulse();
    syncControlsWithState(null);
  });

  // Flag buttons
  flagButtons.forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      flagChosen = true;
      state.flag = btn.dataset.flag;
      triggerResonancePulse();
      switchCameraView('back');
      syncControlsWithState(null);
    });
  });

  // Plate toggle
  togglePlate.addEventListener('change', () => {
    state.plate = togglePlate.checked;
    triggerResonancePulse();
    switchCameraView('handle');
    syncControlsWithState(null);
  });

  // Engraving
  inputEngraving.addEventListener('input', () => {
    const filtered = inputEngraving.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
    inputEngraving.value = filtered;
    state.engraving = filtered;
    triggerResonancePulse();
    syncControlsWithState(null);
  });

  inputEngraving.addEventListener('focus', () => {
    switchCameraView('front');
  });

  // Copy link
  btnCopyLink.addEventListener('click', async () => {
    const fullUrl = window.location.origin + window.location.pathname + serializeHash(state);
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(fullUrl);
      } else {
        const temp = document.createElement('textarea');
        temp.value = fullUrl;
        document.body.appendChild(temp);
        temp.select();
        document.execCommand('copy');
        document.body.removeChild(temp);
      }
      btnCopyLink.classList.add('copied');
      copyLinkIcon.textContent = '\u2713';
      copyLinkText.textContent = 'Copied!';
      setTimeout(() => {
        btnCopyLink.classList.remove('copied');
        copyLinkIcon.textContent = '\u00a7';
        copyLinkText.textContent = 'Copy configuration link';
      }, 2000);
    } catch (err) {
      copyLinkText.textContent = 'Link in URL bar';
    }
  });

  // Snapshot options
  segBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const parent = btn.parentElement;
      parent.querySelectorAll('.seg-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');

      if (btn.dataset.size) {
        selectedSnapshotSize = parseInt(btn.dataset.size, 10);
      }
      if (btn.dataset.bg) {
        selectedSnapshotTransparent = (btn.dataset.bg === 'transparent');
      }
    });
  });

  // Save image snapshot
  btnSaveImage.addEventListener('click', async () => {
    if (!viewer || !viewer.snapshot) return;

    const originalText = btnSaveImage.querySelector('span').textContent;
    btnSaveImage.querySelector('span').textContent = 'Rendering PNG...';
    btnSaveImage.disabled = true;

    try {
      const blob = await viewer.snapshot({
        size: selectedSnapshotSize,
        transparent: selectedSnapshotTransparent
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `resonant-palis-flared-${selectedSnapshotSize}px.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (err) {
      console.error('Snapshot generation error:', err);
    } finally {
      btnSaveImage.querySelector('span').textContent = originalText;
      btnSaveImage.disabled = false;
    }
  });

  // Add to cart modal
  btnAddToCart.addEventListener('click', () => {
    const totals = calculateTotals(state);

    modalTableBody.innerHTML = '';
    totals.items.forEach(item => {
      const tr = document.createElement('tr');
      const tdLabel = document.createElement('td');
      tdLabel.textContent = item.label;
      const tdDesc = document.createElement('td');
      tdDesc.textContent = item.desc || '\u2014';
      const tdPrice = document.createElement('td');
      tdPrice.className = 'amount tabular';
      tdPrice.textContent = `\u20ac${item.price}`;
      const tdWeight = document.createElement('td');
      tdWeight.className = 'amount tabular';
      tdWeight.textContent = `+${item.weight} g`;

      tr.appendChild(tdLabel);
      tr.appendChild(tdDesc);
      tr.appendChild(tdPrice);
      tr.appendChild(tdWeight);
      modalTableBody.appendChild(tr);
    });

    const trTotal = document.createElement('tr');
    trTotal.style.fontWeight = '500';
    trTotal.innerHTML = `
      <td colspan="2">Total Order Specification (Sample)</td>
      <td class="amount tabular" style="color: var(--accent-orange); font-size: 14px;">\u20ac${totals.price}</td>
      <td class="amount tabular">${totals.weight} g ${config.weightTolerance}</td>
    `;
    modalTableBody.appendChild(trTotal);

    cartModal.classList.add('open');
  });

  function closeCartModal() {
    cartModal.classList.remove('open');
  }

  btnCloseModal.addEventListener('click', closeCartModal);
  btnDismissModal.addEventListener('click', closeCartModal);
  cartModal.addEventListener('click', e => {
    if (e.target === cartModal) closeCartModal();
  });

  window.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeCartModal();
  });

  // Hashchange listener
  window.addEventListener('hashchange', () => {
    const newState = parseHash(window.location.hash);
    const normalized = rules.normalize(newState);
    state = normalized.state;
    syncControlsWithState(normalized.warning);
  });

  // ==========================================================================
  // Initialization & 3D Viewer Startup
  // ==========================================================================
  try {
    const parsed = parseHash(window.location.hash);
    const normalized = rules.normalize(parsed);
    state = normalized.state;

    // Render initial step and options
    goToStep(0);
    syncControlsWithState(normalized.warning);

    // Mount 3D Viewer
    viewer = await createViewer({
      canvas,
      labelLayer,
      onProgress: ratio => {
        const pct = Math.min(100, Math.round(ratio * 100));
        loaderBar.style.width = `${pct}%`;
        loaderText.textContent = `Loading ${pct}%`;
      }
    });

    viewer.set({
      handle: state.handle,
      finish: state.finish,
      flag: state.flag,
      plate: state.plate,
      engraving: state.engraving,
      structure: state.structure
    });

    fitStage();
    stageLoader.classList.add('loaded');
  } catch (err) {
    console.error('Failed to initialize 3D viewer:', err);
    stageLoader.classList.add('loaded');
    stageError.classList.add('visible');
  }
})();
