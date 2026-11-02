/**
 * TURF X — Turf-Specific Separate Equipment Booking Engine (Module B)
 * Handles strict per-turf inventory isolation, bundled gear selection,
 * standalone equipment rentals, and live stock validation.
 */

const EquipmentEngine = (function() {
  // Modular State for Equipment
  const state = {
    currentTurfId: null,
    currentDate: null,
    currentSlotTime: null,
    equipmentList: [],
    selectedGearMap: {}, // itemId -> { id, name, brand, pricePerHour, quantity, total }
    activeCategory: 'All',
    standaloneTurfId: null
  };

  /**
   * Fetch equipment strictly for a selected turf venue
   */
  async function fetchTurfEquipment(turfId, date, slotTime, category = 'All') {
    state.currentTurfId = turfId;
    state.currentDate = date;
    state.currentSlotTime = slotTime;
    state.activeCategory = category;

    try {
      let url = `/api/turfs/${encodeURIComponent(turfId)}/equipment?category=${encodeURIComponent(category)}`;
      if (date && slotTime) {
        url += `&date=${encodeURIComponent(date)}&slotTime=${encodeURIComponent(slotTime)}`;
      }

      const res = await fetch(url);
      const data = await res.json();

      if (data.success) {
        state.equipmentList = data.data;
        return state.equipmentList;
      } else {
        throw new Error(data.message || 'Failed to fetch equipment.');
      }
    } catch (err) {
      console.error('Equipment fetch error:', err);
      return [];
    }
  }

  /**
   * Render equipment list in the Slide-Over Drawer
   */
  function renderDrawerEquipment(containerId = 'drawerEquipmentList') {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!state.equipmentList || state.equipmentList.length === 0) {
      container.innerHTML = `
        <div style="padding: 1rem; text-align: center; color: var(--text-muted); font-size: 0.82rem;">
          No equipment catalog found for this venue.
        </div>
      `;
      return;
    }

    container.innerHTML = state.equipmentList.map(item => {
      const selected = state.selectedGearMap[item.id] || { quantity: 0 };
      const currentQty = selected.quantity;
      const isOut = item.availableStock <= 0;
      const isLow = item.availableStock > 0 && item.availableStock <= 3;

      let stockBadge = `<span class="eq-stock-badge">✓ In Stock (${item.availableStock} available)</span>`;
      if (isOut) {
        stockBadge = `<span class="eq-stock-badge out">⚠ Out of Stock for this slot</span>`;
      } else if (isLow) {
        stockBadge = `<span class="eq-stock-badge low">⚡ Only ${item.availableStock} left for this hour</span>`;
      }

      return `
        <div class="equipment-card" data-eq-id="${item.id}">
          <div class="eq-left-info">
            <img src="${item.image}" alt="${item.name}" class="eq-thumb" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=400&q=80'">
            <div class="eq-meta">
              <h4>${item.name}</h4>
              <div class="eq-specs">${item.brand} • ${item.specs || item.category}</div>
              ${stockBadge}
            </div>
          </div>
          <div class="eq-right-controls">
            <div class="eq-price">
              ₹${item.pricePerHour}<span style="font-size:0.7rem; color:var(--text-muted)">/hr</span>
            </div>
            <div class="qty-stepper">
              <button class="qty-btn" onclick="EquipmentEngine.updateQuantity('${item.id}', -1)" ${currentQty === 0 ? 'disabled style="opacity:0.3"' : ''}>−</button>
              <span class="qty-value">${currentQty}</span>
              <button class="qty-btn" onclick="EquipmentEngine.updateQuantity('${item.id}', 1)" ${isOut || currentQty >= item.availableStock ? 'disabled style="opacity:0.3"' : ''}>+</button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  /**
   * Update quantity of an equipment item
   */
  function updateQuantity(itemId, delta) {
    const item = state.equipmentList.find(i => i.id === itemId);
    if (!item) return;

    const current = state.selectedGearMap[itemId] || {
      id: item.id,
      name: item.name,
      brand: item.brand,
      pricePerHour: item.pricePerHour,
      quantity: 0,
      total: 0
    };

    const newQty = Math.max(0, current.quantity + delta);

    // Stock guard
    if (newQty > item.availableStock) {
      if (window.showToast) {
        window.showToast(`Only ${item.availableStock} units of "${item.name}" available!`, 'warning');
      }
      return;
    }

    if (newQty === 0) {
      delete state.selectedGearMap[itemId];
    } else {
      current.quantity = newQty;
      current.total = newQty * item.pricePerHour;
      state.selectedGearMap[itemId] = current;
    }

    // Re-render
    renderDrawerEquipment();
    if (typeof window.updatePriceBreakdown === 'function') {
      window.updatePriceBreakdown();
    }
  }

  /**
   * Reset selected gear
   */
  function clearSelectedGear() {
    state.selectedGearMap = {};
  }

  /**
   * Get array of selected equipment items
   */
  function getSelectedItems() {
    return Object.values(state.selectedGearMap);
  }

  /**
   * Calculate total equipment cost
   */
  function getTotalEquipmentCost() {
    return Object.values(state.selectedGearMap).reduce((sum, item) => sum + item.total, 0);
  }

  /**
   * Standalone Equipment Rental: Initialize Venue & Slot Selector
   */
  async function initStandaloneVenueView(containerId = 'standaloneContainer') {
    const container = document.getElementById(containerId);
    if (!container) return;

    try {
      const res = await fetch('/api/turfs');
      const data = await res.json();
      const turfs = data.data || [];

      if (!state.standaloneTurfId && turfs.length > 0) {
        state.standaloneTurfId = turfs[0].id;
      }

      const today = new Date().toISOString().split('T')[0];
      state.currentDate = state.currentDate || today;
      state.currentSlotTime = state.currentSlotTime || '19:00 - 20:00';

      container.innerHTML = `
        <div class="glass-panel" style="padding: 1.5rem; border-radius: var(--radius-lg); margin-bottom: 2rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; flex-wrap: wrap; gap: 1rem;">
            <div>
              <span class="floodlight-badge" style="margin-bottom: 0.4rem; display: inline-flex;">⚡ SEPARATE GEAR RENTAL</span>
              <h2 style="font-size: 1.5rem;">Rent Pro Equipment at Any Mumbai Turf</h2>
              <p style="color: var(--text-muted); font-size: 0.85rem;">Reserve match balls, pro boots, cricket kits, or paddles independently for your match hour.</p>
            </div>
            <div style="display: flex; gap: 0.75rem; align-items: center;">
              <div>
                <label style="display:block; font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700; margin-bottom: 3px;">Select Mumbai Venue</label>
                <select id="standaloneTurfSelect" class="text-input" style="padding: 0.5rem 0.85rem; border-radius: var(--radius-sm); font-size: 0.84rem; min-width: 260px;">
                  ${turfs.map(t => `<option value="${t.id}" ${t.id === state.standaloneTurfId ? 'selected' : ''}>${t.name} (${t.zone})</option>`).join('')}
                </select>
              </div>
              <div>
                <label style="display:block; font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700; margin-bottom: 3px;">Match Date</label>
                <input type="date" id="standaloneDateInput" value="${state.currentDate}" class="text-input" style="padding: 0.5rem 0.85rem; border-radius: var(--radius-sm); font-size: 0.84rem;">
              </div>
              <div>
                <label style="display:block; font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700; margin-bottom: 3px;">Hour Slot</label>
                <select id="standaloneSlotSelect" class="text-input" style="padding: 0.5rem 0.85rem; border-radius: var(--radius-sm); font-size: 0.84rem;">
                  <option value="07:00 - 08:00">07:00 - 08:00 (Morning)</option>
                  <option value="17:00 - 18:00">17:00 - 18:00 (Evening)</option>
                  <option value="19:00 - 20:00" selected>19:00 - 20:00 (Peak Floodlight)</option>
                  <option value="21:00 - 22:00">21:00 - 22:00 (Peak Floodlight)</option>
                  <option value="23:00 - 00:00">23:00 - 00:00 (Night Owl)</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Standalone Items Grid -->
          <div id="standaloneEquipmentGrid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1rem; margin-top: 1rem;">
            <!-- Rendered dynamically -->
          </div>

          <!-- Standalone Checkout Floating Action -->
          <div id="standaloneCheckoutBar" style="margin-top: 1.5rem; padding-top: 1.25rem; border-top: var(--border-glass); display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Selected Gear Subtotal</div>
              <div id="standaloneSubtotalText" style="font-family: var(--font-mono); font-size: 1.5rem; font-weight: 800; color: var(--accent-volt);">₹0</div>
            </div>
            <button class="btn-primary" id="btnStandaloneCheckout" onclick="EquipmentEngine.proceedStandaloneBooking()">
              Proceed to Rent Gear ➔
            </button>
          </div>
        </div>
      `;

      // Attach event listeners
      document.getElementById('standaloneTurfSelect').addEventListener('change', (e) => {
        state.standaloneTurfId = e.target.value;
        loadStandaloneStock();
      });

      document.getElementById('standaloneDateInput').addEventListener('change', (e) => {
        state.currentDate = e.target.value;
        loadStandaloneStock();
      });

      document.getElementById('standaloneSlotSelect').addEventListener('change', (e) => {
        state.currentSlotTime = e.target.value;
        loadStandaloneStock();
      });

      loadStandaloneStock();
    } catch (err) {
      console.error('Error rendering standalone venue view:', err);
    }
  }

  async function loadStandaloneStock() {
    clearSelectedGear();
    const items = await fetchTurfEquipment(state.standaloneTurfId, state.currentDate, state.currentSlotTime);
    renderStandaloneGrid(items);
    updateStandaloneSummary();
  }

  function renderStandaloneGrid(items) {
    const grid = document.getElementById('standaloneEquipmentGrid');
    if (!grid) return;

    if (!items || items.length === 0) {
      grid.innerHTML = `<div style="grid-column: 1/-1; padding: 2rem; text-align: center; color: var(--text-muted);">No equipment cataloged for this venue.</div>`;
      return;
    }

    grid.innerHTML = items.map(item => {
      const selected = state.selectedGearMap[item.id] || { quantity: 0 };
      const currentQty = selected.quantity;
      const isOut = item.availableStock <= 0;

      return `
        <div class="equipment-card" style="background: rgba(10, 14, 23, 0.7);">
          <div class="eq-left-info">
            <img src="${item.image}" alt="${item.name}" class="eq-thumb" loading="lazy">
            <div class="eq-meta">
              <h4>${item.name}</h4>
              <div class="eq-specs">${item.brand} • ${item.specs || item.category}</div>
              <span class="eq-stock-badge ${isOut ? 'out' : ''}">
                ${isOut ? 'Out of stock' : `${item.availableStock} in stock for slot`}
              </span>
            </div>
          </div>
          <div class="eq-right-controls">
            <div class="eq-price">₹${item.pricePerHour}<span style="font-size:0.7rem; color:var(--text-muted)">/hr</span></div>
            <div class="qty-stepper">
              <button class="qty-btn" onclick="EquipmentEngine.updateStandaloneQty('${item.id}', -1)">−</button>
              <span class="qty-value" id="standalone-qty-${item.id}">${currentQty}</span>
              <button class="qty-btn" onclick="EquipmentEngine.updateStandaloneQty('${item.id}', 1)" ${isOut ? 'disabled style="opacity:0.3"' : ''}>+</button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  function updateStandaloneQty(itemId, delta) {
    const item = state.equipmentList.find(i => i.id === itemId);
    if (!item) return;

    const current = state.selectedGearMap[itemId] || {
      id: item.id,
      name: item.name,
      brand: item.brand,
      pricePerHour: item.pricePerHour,
      quantity: 0,
      total: 0
    };

    const newQty = Math.max(0, current.quantity + delta);
    if (newQty > item.availableStock) {
      if (window.showToast) {
        window.showToast(`Max ${item.availableStock} units available!`, 'warning');
      }
      return;
    }

    if (newQty === 0) {
      delete state.selectedGearMap[itemId];
    } else {
      current.quantity = newQty;
      current.total = newQty * item.pricePerHour;
      state.selectedGearMap[itemId] = current;
    }

    const qtyEl = document.getElementById(`standalone-qty-${itemId}`);
    if (qtyEl) qtyEl.textContent = newQty;

    updateStandaloneSummary();
  }

  function updateStandaloneSummary() {
    const subtotal = getTotalEquipmentCost();
    const subtotalEl = document.getElementById('standaloneSubtotalText');
    if (subtotalEl) {
      subtotalEl.textContent = `₹${subtotal}`;
    }

    const btn = document.getElementById('btnStandaloneCheckout');
    if (btn) {
      btn.disabled = subtotal <= 0;
      btn.style.opacity = subtotal <= 0 ? '0.5' : '1';
    }
  }

  function proceedStandaloneBooking() {
    const items = getSelectedItems();
    if (items.length === 0) {
      if (window.showToast) window.showToast('Please select at least 1 equipment item to rent.', 'warning');
      return;
    }

    const total = getTotalEquipmentCost();
    if (window.PaymentsEngine) {
      window.PaymentsEngine.openModal({
        type: 'GEAR_ONLY',
        turfId: state.standaloneTurfId,
        turfName: document.getElementById('standaloneTurfSelect')?.selectedOptions[0]?.text || 'Mumbai Turf',
        date: state.currentDate,
        slotTime: state.currentSlotTime,
        turfAmount: 0,
        equipmentAmount: total,
        totalAmount: total,
        equipmentItems: items
      });
    }
  }

  return {
    state,
    fetchTurfEquipment,
    renderDrawerEquipment,
    updateQuantity,
    clearSelectedGear,
    getSelectedItems,
    getTotalEquipmentCost,
    initStandaloneVenueView,
    updateStandaloneQty,
    proceedStandaloneBooking
  };
})();

// Attach to window
window.EquipmentEngine = EquipmentEngine;
