/**
 * TURF X (MUMBAI EDITION) — Main Frontend Controller
 * Pure Vanilla JavaScript (ES6+ Fetch API, DOM Manipulation, Modular State)
 */

const App = (function() {
  const state = {
    currentMode: 'TURF_AND_GEAR', // 'TURF_AND_GEAR' | 'GEAR_ONLY'
    selectedZone: 'All Mumbai',
    selectedSport: 'All Sports',
    searchQuery: '',
    selectedDate: new Date().toISOString().split('T')[0],
    turfsList: [],
    activeTurf: null,
    selectedSlot: null,
    activeLockId: null,
    lockRemainingSeconds: 0,
    lockTimerInterval: null
  };

  /**
   * Initialize App on DOM Ready
   */
  async function init() {
    setupEventListeners();
    await loadTurfs();
    updateDateSelector();
    await fetchLiveWeather();
    if (window.PaymentsEngine) {
      window.PaymentsEngine.fetchWalletData?.();
    }
  }

  /**
   * Bind DOM Events
   */
  function setupEventListeners() {
    // Mode Switcher buttons
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const mode = btn.dataset.mode;
        switchMode(mode);
      });
    });

    // Zone quick filter pills
    document.querySelectorAll('.zone-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        document.querySelectorAll('.zone-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        state.selectedZone = pill.dataset.zone;
        filterTurfs();
      });
    });

    // Sport pills
    document.querySelectorAll('.sport-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        document.querySelectorAll('.sport-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        state.selectedSport = pill.dataset.sport;
        filterTurfs();
      });
    });

    // Search Input
    const searchInput = document.getElementById('turfSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        state.searchQuery = e.target.value.trim().toLowerCase();
        filterTurfs();
      });
    }

    // Drawer backdrop dismiss
    const drawerBackdrop = document.getElementById('drawerBackdrop');
    if (drawerBackdrop) {
      drawerBackdrop.addEventListener('click', (e) => {
        if (e.target === drawerBackdrop) {
          closeDrawer();
        }
      });
    }
  }

  /**
   * Switch between Turf Discovery and Standalone Equipment Mode
   */
  function switchMode(mode) {
    state.currentMode = mode;

    document.querySelectorAll('.mode-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.mode === mode);
    });

    const turfView = document.getElementById('turfDiscoveryView');
    const gearView = document.getElementById('standaloneGearView');

    if (mode === 'TURF_AND_GEAR') {
      if (turfView) turfView.style.display = 'block';
      if (gearView) gearView.style.display = 'none';
    } else {
      if (turfView) turfView.style.display = 'none';
      if (gearView) {
        gearView.style.display = 'block';
        if (window.EquipmentEngine) {
          window.EquipmentEngine.initStandaloneVenueView('standaloneGearView');
        }
      }
    }
  }

  /**
   * Load Turfs from REST API
   */
  async function loadTurfs() {
    try {
      const res = await fetch('/api/turfs');
      const data = await res.json();
      if (data.success) {
        state.turfsList = data.data;
        renderTurfCards(state.turfsList);
      }
    } catch (err) {
      console.error('Error loading turfs:', err);
      showToast('Could not load turfs. Ensure the server is running.', 'danger');
    }
  }

  /**
   * Filter Turfs based on Zone, Sport, and Search
   */
  function filterTurfs() {
    let list = state.turfsList;

    if (state.selectedZone && state.selectedZone !== 'All Mumbai') {
      list = list.filter(t => t.zone === state.selectedZone);
    }

    if (state.selectedSport && state.selectedSport !== 'All Sports' && state.selectedSport !== 'All') {
      list = list.filter(t => t.sports.includes(state.selectedSport));
    }

    if (state.searchQuery) {
      const q = state.searchQuery;
      list = list.filter(t => 
        t.name.toLowerCase().includes(q) || 
        t.location.toLowerCase().includes(q) || 
        t.nearestStation.toLowerCase().includes(q)
      );
    }

    renderTurfCards(list);
  }

  /**
   * Render Interactive Turf Discovery Cards (Module A)
   */
  function renderTurfCards(turfs) {
    const grid = document.getElementById('turfCardsGrid');
    const countEl = document.getElementById('resultsCountText');
    if (!grid) return;

    if (countEl) {
      countEl.textContent = `${turfs.length} Venues Active in Mumbai`;
    }

    if (!turfs || turfs.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1/-1; padding: 3rem 1rem; text-align: center; color: var(--text-muted);">
          <h3>No Mumbai turfs match your filter.</h3>
          <p style="margin-top: 0.5rem; font-size: 0.9rem;">Try selecting "All Mumbai" or clearing search terms.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = turfs.map(turf => {
      const isCovered = turf.monsoonCover === 'Roof Covered';
      const monsoonBadge = isCovered
        ? `<span class="monsoon-badge monsoon-covered">☔ Roof Covered</span>`
        : `<span class="monsoon-badge monsoon-open">🌤 Open-Air Sky</span>`;

      return `
        <div class="turf-card" data-turf-id="${turf.id}">
          <div class="turf-card-image-wrap">
            <img src="${turf.image}" alt="${turf.name}" class="turf-card-img" loading="lazy">
            <div class="card-badges-top">
              <span class="floodlight-badge">⚡ ${turf.floodlights}</span>
              ${monsoonBadge}
            </div>
            <div class="rating-badge">
              ★ ${turf.rating.toFixed(1)} <span style="color:var(--text-muted); font-size:0.7rem;">(${turf.reviewsCount})</span>
            </div>
          </div>

          <div class="turf-card-body">
            <div class="turf-zone-station">
              <span>📍 ${turf.zone}</span>
              <span class="station-indicator">🚆 ${turf.nearestStation}</span>
            </div>

            <h3 class="turf-card-title">${turf.name}</h3>
            <span class="turf-surface-tag">🌱 ${turf.surface}</span>

            <div class="turf-amenities-tags">
              ${turf.amenities.slice(0, 4).map(a => `<span class="amenity-tag">${a}</span>`).join('')}
            </div>

            <!-- Turf-Specific Gear Locker Highlight -->
            <div class="turf-equipment-preview-box" style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 8px; padding: 0.6rem 0.75rem; margin-bottom: 0.85rem;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 4px;">
                <span style="font-size: 0.7rem; text-transform: uppercase; color: var(--accent-emerald); font-weight: 700;">🎒 In-Venue Gear Locker</span>
                <span style="font-size: 0.68rem; color: var(--text-muted);">${turf.totalEquipmentCount || 5} Items Stocked</span>
              </div>
              <div style="font-size: 0.73rem; color: var(--text-secondary); line-height: 1.45;">
                ${(turf.equipmentPreview || []).map(eq => `• ${eq.name} <strong class="mono" style="color:var(--accent-volt);">(₹${eq.pricePerHour}/hr)</strong>`).join('<br>') || 'Full sport kit available'}
              </div>
            </div>

            <div class="turf-card-footer" style="gap: 0.5rem; flex-wrap: wrap;">
              <div class="turf-price-group">
                <span class="price-sub">Turf From</span>
                <span class="price-main">₹${turf.morningPrice}<span class="price-unit">/hr</span></span>
              </div>
              <div style="display:flex; gap: 0.4rem; align-items:center;">
                <button class="btn-secondary" style="padding: 0.55rem 0.75rem; font-size: 0.78rem;" onclick="App.openTurfGearDirect('${turf.id}')" title="Rent Equipment Only from this Venue">
                  🎒 Rent Gear
                </button>
                <button class="btn-primary" style="padding: 0.55rem 0.95rem; font-size: 0.82rem;" onclick="App.openBookingDrawer('${turf.id}')">
                  Book Slot & Gear ➔
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  /**
   * Open Slide-Over Booking & Equipment Drawer
   */
  async function openBookingDrawer(turfId) {
    const turf = state.turfsList.find(t => t.id === turfId);
    if (!turf) return;

    state.activeTurf = turf;
    state.selectedSlot = null;

    // Reset equipment in drawer
    if (window.EquipmentEngine) {
      window.EquipmentEngine.clearSelectedGear();
    }

    // Populate Drawer Header
    document.getElementById('drawerTurfName').textContent = turf.name;
    document.getElementById('drawerTurfMeta').textContent = 
      `${turf.zone} • ${turf.nearestStation} • ${turf.surface}`;

    // Show Drawer
    const backdrop = document.getElementById('drawerBackdrop');
    if (backdrop) backdrop.classList.add('active');

    // Load Slots and Turf-Specific Equipment
    await loadSlotsForActiveTurf();
    await loadEquipmentForActiveTurf();

    updatePriceBreakdown();
  }

  function closeDrawer() {
    const backdrop = document.getElementById('drawerBackdrop');
    if (backdrop) backdrop.classList.remove('active');

    // If there is an active lock, unlock on server
    if (state.activeLockId) {
      unlockActiveSlot();
    }
    stopLockCountdown();
  }

  /**
   * Load Real-Time Slot Matrix (6 AM - 3 AM)
   */
  async function loadSlotsForActiveTurf() {
    if (!state.activeTurf) return;

    try {
      const url = `/api/turfs/${state.activeTurf.id}/slots?date=${state.selectedDate}`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.success) {
        renderSlotMatrix(data.slots);
      }
    } catch (err) {
      console.error('Error fetching slots:', err);
    }
  }

  /**
   * Render Slot Grid grouped by 3 Dynamic Tiers
   */
  function renderSlotMatrix(slots) {
    const container = document.getElementById('slotMatrixContainer');
    if (!container) return;

    const morningSlots = slots.filter(s => s.tier === 'MORNING');
    const eveningSlots = slots.filter(s => s.tier === 'EVENING');
    const nightSlots = slots.filter(s => s.tier === 'NIGHT');

    container.innerHTML = `
      <div class="time-slot-tiers">
        <!-- Morning Tier -->
        <div class="tier-group">
          <div class="tier-header tier-morning">🌅 Morning Off-Peak (6:00 AM - 4:00 PM)</div>
          <div class="slot-grid">
            ${morningSlots.map(renderSlotButton).join('')}
          </div>
        </div>

        <!-- Evening Peak Tier -->
        <div class="tier-group">
          <div class="tier-header tier-evening">⚡ Evening Floodlight Peak (4:00 PM - 11:00 PM)</div>
          <div class="slot-grid">
            ${eveningSlots.map(renderSlotButton).join('')}
          </div>
        </div>

        <!-- Late Night Owl Tier -->
        <div class="tier-group">
          <div class="tier-header tier-night">🌙 Late-Night Owl (11:00 PM - 3:00 AM)</div>
          <div class="slot-grid">
            ${nightSlots.map(renderSlotButton).join('')}
          </div>
        </div>
      </div>
    `;
  }

  function renderSlotButton(slot) {
    const isSelected = state.selectedSlot && state.selectedSlot.slotTime === slot.slotTime;
    const isBooked = slot.status === 'BOOKED';
    const isLockedOther = slot.status === 'LOCKED';

    let extraClass = '';
    let statusText = `<span class="slot-price">₹${slot.price}</span>`;

    if (isSelected) {
      extraClass = 'selected';
      statusText = `<span class="slot-status-text">Selected</span>`;
    } else if (isBooked) {
      extraClass = 'booked';
      statusText = `<span class="slot-status-text" style="color:var(--text-subtle);">Booked</span>`;
    } else if (isLockedOther) {
      extraClass = 'locked';
      statusText = `<span class="slot-status-text" style="color:var(--danger);">Locked (${slot.remainingSeconds}s)</span>`;
    }

    return `
      <button class="slot-btn ${extraClass}" 
              onclick="App.handleSlotSelect('${slot.slotTime}', ${slot.price}, '${slot.tier}')"
              ${isBooked || isLockedOther ? 'disabled' : ''}>
        <span class="slot-time">${slot.slotTime}</span>
        ${statusText}
      </button>
    `;
  }

  /**
   * Concurrency Slot Locking (Locks for 7 minutes via API)
   */
  async function handleSlotSelect(slotTime, price, tier) {
    if (!state.activeTurf) return;

    // Lock Slot on Backend
    try {
      const res = await fetch('/api/bookings/lock-slot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          turfId: state.activeTurf.id,
          date: state.selectedDate,
          slotTime
        })
      });

      const data = await res.json();

      if (!data.success) {
        showToast(data.message || 'Slot locked by another player.', 'warning');
        loadSlotsForActiveTurf(); // refresh state
        return;
      }

      // Slot lock acquired!
      state.selectedSlot = { slotTime, price, tier };
      state.activeLockId = data.lockId;
      state.lockRemainingSeconds = data.remainingSeconds || 420;

      // Start 7-minute countdown timer
      startLockCountdown();

      // Refresh slot UI & update equipment inventory stock for this slot
      await loadSlotsForActiveTurf();
      await loadEquipmentForActiveTurf();
      updatePriceBreakdown();

      showToast(`⚡ Slot ${slotTime} locked for 7 mins!`, 'success');

    } catch (err) {
      console.error('Slot lock error:', err);
      showToast('Error locking slot. Try again.', 'danger');
    }
  }

  function startLockCountdown() {
    stopLockCountdown();

    const banner = document.getElementById('lockCountdownBar');
    const timerDisplay = document.getElementById('lockTimerSeconds');
    if (banner) banner.classList.add('active');

    function update() {
      if (state.lockRemainingSeconds <= 0) {
        stopLockCountdown();
        state.selectedSlot = null;
        state.activeLockId = null;
        showToast('⚠️ Slot reservation hold expired. Please re-select a slot.', 'warning');
        loadSlotsForActiveTurf();
        updatePriceBreakdown();
        return;
      }

      const mins = Math.floor(state.lockRemainingSeconds / 60).toString().padStart(2, '0');
      const secs = (state.lockRemainingSeconds % 60).toString().padStart(2, '0');
      if (timerDisplay) timerDisplay.textContent = `${mins}:${secs}`;

      state.lockRemainingSeconds--;
    }

    update();
    state.lockTimerInterval = setInterval(update, 1000);
  }

  function stopLockCountdown() {
    if (state.lockTimerInterval) {
      clearInterval(state.lockTimerInterval);
      state.lockTimerInterval = null;
    }
    const banner = document.getElementById('lockCountdownBar');
    if (banner) banner.classList.remove('active');
  }

  async function unlockActiveSlot() {
    if (!state.activeLockId) return;
    try {
      await fetch('/api/bookings/unlock-slot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lockId: state.activeLockId })
      });
      state.activeLockId = null;
    } catch (e) {
      // ignore
    }
  }

  /**
   * Load Turf-Specific Equipment for Drawer
   */
  async function loadEquipmentForActiveTurf() {
    if (!state.activeTurf || !window.EquipmentEngine) return;

    const slotTime = state.selectedSlot ? state.selectedSlot.slotTime : null;
    await window.EquipmentEngine.fetchTurfEquipment(
      state.activeTurf.id,
      state.selectedDate,
      slotTime
    );

    window.EquipmentEngine.renderDrawerEquipment('drawerEquipmentList');
  }

  /**
   * Update Live Price Breakdown in Drawer
   */
  function updatePriceBreakdown() {
    const turfFee = state.selectedSlot ? state.selectedSlot.price : 0;
    const gearFee = window.EquipmentEngine ? window.EquipmentEngine.getTotalEquipmentCost() : 0;
    const subtotal = turfFee + gearFee;

    const turfEl = document.getElementById('breakdownTurfFee');
    const gearEl = document.getElementById('breakdownGearFee');
    const totalEl = document.getElementById('breakdownTotalFee');
    const btnCheckout = document.getElementById('btnDrawerProceed');

    if (turfEl) turfEl.textContent = `₹${turfFee}`;
    if (gearEl) gearEl.textContent = `₹${gearFee}`;
    if (totalEl) totalEl.textContent = `₹${subtotal}`;

    if (btnCheckout) {
      const hasSlot = Boolean(state.selectedSlot);
      btnCheckout.disabled = !hasSlot;
      btnCheckout.style.opacity = hasSlot ? '1' : '0.4';
      btnCheckout.textContent = hasSlot
        ? `Proceed to Payment (₹${subtotal}) ➔`
        : 'Select an Available Slot First';
    }
  }

  /**
   * Proceed to Payment Modal from Drawer
   */
  function proceedToPaymentModal() {
    if (!state.selectedSlot || !state.activeTurf) {
      showToast('Please select a time slot first.', 'warning');
      return;
    }

    const turfFee = state.selectedSlot.price;
    const gearItems = window.EquipmentEngine ? window.EquipmentEngine.getSelectedItems() : [];
    const gearFee = window.EquipmentEngine ? window.EquipmentEngine.getTotalEquipmentCost() : 0;
    const total = turfFee + gearFee;

    if (window.PaymentsEngine) {
      window.PaymentsEngine.openModal({
        type: 'TURF_AND_GEAR',
        turfId: state.activeTurf.id,
        turfName: state.activeTurf.name,
        turfLocation: state.activeTurf.location,
        date: state.selectedDate,
        slotTime: state.selectedSlot.slotTime,
        turfAmount: turfFee,
        equipmentAmount: gearFee,
        totalAmount: total,
        equipmentItems: gearItems
      });
    }
  }

  /**
   * Populate Date Picker Pills (Today, Tomorrow, +3 days)
   */
  function updateDateSelector() {
    const container = document.getElementById('drawerDatePicker');
    if (!container) return;

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const dates = [];
    const now = new Date();

    for (let i = 0; i < 5; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() + i);
      const iso = d.toISOString().split('T')[0];
      const dayName = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : days[d.getDay()];
      const label = `${d.getDate()} ${months[d.getMonth()]}`;

      dates.push({ iso, dayName, label, isFirst: i === 0 });
    }

    container.innerHTML = dates.map(item => `
      <div class="date-pill ${item.iso === state.selectedDate ? 'active' : ''}" 
           onclick="App.changeSelectedDate('${item.iso}')">
        <div class="date-pill-day">${item.dayName}</div>
        <div class="date-pill-date">${item.label}</div>
      </div>
    `).join('');
  }

  function changeSelectedDate(isoDate) {
    state.selectedDate = isoDate;
    updateDateSelector();
    loadSlotsForActiveTurf();
    loadEquipmentForActiveTurf();
  }

  /**
   * Live Mumbai Weather Ticker
   */
  async function fetchLiveWeather() {
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      if (data.weather) {
        const badge = document.getElementById('navWeatherText');
        if (badge) {
          badge.textContent = `${data.weather.temperature} | ${data.weather.condition} • ${data.weather.humidity} Humidity`;
        }
      }
    } catch (e) {
      // fallback
    }
  }

  /**
   * Open User Bookings & Wallet Drawer / Modal
   */
  async function openUserDrawer() {
    const modal = document.getElementById('userBookingsModalBackdrop');
    if (!modal) return;
    modal.classList.add('active');

    try {
      const res = await fetch('/api/bookings/my-bookings');
      const data = await res.json();
      renderUserBookings(data.data || []);
    } catch (err) {
      console.error('Error fetching my bookings:', err);
    }
  }

  function closeUserDrawer() {
    const modal = document.getElementById('userBookingsModalBackdrop');
    if (modal) modal.classList.remove('active');
  }

  function renderUserBookings(bookings) {
    const list = document.getElementById('userBookingsList');
    if (!list) return;

    if (bookings.length === 0) {
      list.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 2rem;">No past bookings found. Book your first Mumbai turf above!</div>`;
      return;
    }

    list.innerHTML = bookings.map(b => `
      <div class="glass-panel" style="padding: 1rem; border-radius: var(--radius-sm); margin-bottom: 0.75rem;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.4rem;">
          <div>
            <span class="mono" style="color: var(--accent-volt); font-weight: 700; font-size: 0.85rem;">${b.bookingRef}</span>
            <h4 style="font-size: 1rem; margin-top: 2px;">${b.turfName}</h4>
            <div style="font-size: 0.76rem; color: var(--text-muted);">${b.turfLocation}</div>
          </div>
          <span style="font-size: 0.7rem; font-weight: 700; padding: 2px 7px; border-radius: 4px; background: rgba(16,185,129,0.2); color: var(--accent-emerald);">
            ${b.paymentStatus}
          </span>
        </div>
        <div style="display: flex; justify-content: space-between; align-items:center; font-size: 0.78rem; color: var(--text-secondary); margin-top: 0.6rem; border-top: var(--border-glass); padding-top: 0.5rem; flex-wrap:wrap; gap:0.4rem;">
          <span>🗓 ${b.date} • ⏰ ${b.slotTime}</span>
          <div style="display:flex; align-items:center; gap:0.5rem;">
            <span class="mono" style="font-weight: 700; color: var(--text-primary);">₹${b.totalAmount}</span>
            <button class="btn-primary" style="padding:2px 8px; font-size:0.68rem;" onclick="UniqueFeatures.downloadMatchPass('${b.bookingRef}')">
              🎟️ Pass
            </button>
          </div>
        </div>
      </div>
    `).join('');
  }

  /**
   * Toast Notifications UI Helper
   */
  function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icon = type === 'success' ? '✓' : type === 'warning' ? '⚡' : '✕';
    toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  function openTurfGearDirect(turfId) {
    switchMode('GEAR_ONLY');
    if (window.EquipmentEngine) {
      window.EquipmentEngine.state.standaloneTurfId = turfId;
      window.EquipmentEngine.initStandaloneVenueView('standaloneGearView');
    }
    document.getElementById('standaloneGearView')?.scrollIntoView({ behavior: 'smooth' });
  }

  async function openDatabaseViewer() {
    const modal = document.getElementById('dbViewerModalBackdrop');
    if (!modal) return;
    modal.classList.add('active');

    try {
      const res = await fetch('/api/turfs/database-overview');
      const data = await res.json();
      if (data.success) {
        renderDatabaseTables(data.tables);
      }
    } catch (err) {
      console.error('Error fetching database overview:', err);
    }
  }

  function closeDatabaseViewer() {
    const modal = document.getElementById('dbViewerModalBackdrop');
    if (modal) modal.classList.remove('active');
  }

  function renderDatabaseTables(tables) {
    const container = document.getElementById('dbTablesContainer');
    if (!container) return;

    container.innerHTML = `
      <div style="display:flex; flex-direction:column; gap: 1.5rem;">
        <div>
          <h4 style="color:var(--accent-volt); margin-bottom: 6px;">🏟️ Turfs Table (${tables.turfs.count} Venues)</h4>
          <div style="overflow-x:auto; background:rgba(0,0,0,0.4); border-radius:8px; border:1px solid rgba(255,255,255,0.08);">
            <table style="width:100%; border-collapse:collapse; font-size:0.75rem; text-align:left;">
              <tr style="border-bottom:1px solid rgba(255,255,255,0.1); color:var(--text-muted);"><th style="padding:6px 10px;">ID</th><th style="padding:6px 10px;">Name</th><th style="padding:6px 10px;">Zone</th><th style="padding:6px 10px;">Surface</th><th style="padding:6px 10px;">Hourly Rate</th></tr>
              ${tables.turfs.rows.map(r => `<tr style="border-bottom:1px solid rgba(255,255,255,0.04);"><td style="padding:6px 10px;" class="mono">${r.id}</td><td style="padding:6px 10px; font-weight:700;">${r.name}</td><td style="padding:6px 10px;">${r.zone}</td><td style="padding:6px 10px;">${r.surface}</td><td style="padding:6px 10px;" class="mono">₹${r.pricePerHour}</td></tr>`).join('')}
            </table>
          </div>
        </div>

        <div>
          <h4 style="color:var(--accent-emerald); margin-bottom: 6px;">🎒 Equipment Table (${tables.equipment.count} Items across Mumbai turfs)</h4>
          <div style="overflow-x:auto; background:rgba(0,0,0,0.4); border-radius:8px; border:1px solid rgba(255,255,255,0.08); max-height:240px;">
            <table style="width:100%; border-collapse:collapse; font-size:0.75rem; text-align:left;">
              <tr style="border-bottom:1px solid rgba(255,255,255,0.1); color:var(--text-muted); position:sticky; top:0; background:#0B0E17;"><th style="padding:6px 10px;">Item</th><th style="padding:6px 10px;">Turf ID</th><th style="padding:6px 10px;">Brand</th><th style="padding:6px 10px;">Rate</th><th style="padding:6px 10px;">Stock</th></tr>
              ${tables.equipment.rows.map(e => `<tr style="border-bottom:1px solid rgba(255,255,255,0.04);"><td style="padding:6px 10px; font-weight:700;">${e.name}</td><td style="padding:6px 10px;" class="mono">${e.turfId}</td><td style="padding:6px 10px;">${e.brand}</td><td style="padding:6px 10px;" class="mono">₹${e.pricePerHour}</td><td style="padding:6px 10px;" class="mono">${e.totalStock} units</td></tr>`).join('')}
            </table>
          </div>
        </div>

        <div>
          <h4 style="color:#38BDF8; margin-bottom: 6px;">📑 Bookings Table (${tables.bookings.count} Bookings)</h4>
          <div style="overflow-x:auto; background:rgba(0,0,0,0.4); border-radius:8px; border:1px solid rgba(255,255,255,0.08);">
            <table style="width:100%; border-collapse:collapse; font-size:0.75rem; text-align:left;">
              <tr style="border-bottom:1px solid rgba(255,255,255,0.1); color:var(--text-muted);"><th style="padding:6px 10px;">Ref</th><th style="padding:6px 10px;">Venue</th><th style="padding:6px 10px;">Date/Slot</th><th style="padding:6px 10px;">Amount</th><th style="padding:6px 10px;">Mode</th></tr>
              ${tables.bookings.rows.map(b => `<tr style="border-bottom:1px solid rgba(255,255,255,0.04);"><td style="padding:6px 10px;" class="mono">${b.bookingRef}</td><td style="padding:6px 10px;">${b.turfName}</td><td style="padding:6px 10px;">${b.date} (${b.slotTime})</td><td style="padding:6px 10px;" class="mono">₹${b.totalAmount}</td><td style="padding:6px 10px;">${b.paymentMode}</td></tr>`).join('')}
            </table>
          </div>
        </div>
      </div>
    `;
  }

  // Expose global helpers
  window.showToast = showToast;
  window.updatePriceBreakdown = updatePriceBreakdown;
  window.closeDrawer = closeDrawer;
  window.refreshCurrentTurfSlots = loadSlotsForActiveTurf;

  return {
    state,
    init,
    switchMode,
    filterTurfs,
    openBookingDrawer,
    openTurfGearDirect,
    openDatabaseViewer,
    closeDatabaseViewer,
    closeDrawer,
    handleSlotSelect,
    changeSelectedDate,
    proceedToPaymentModal,
    openUserDrawer,
    closeUserDrawer,
    showToast
  };
})();

// Attach to window and bootstrap
window.App = App;
document.addEventListener('DOMContentLoaded', App.init);
