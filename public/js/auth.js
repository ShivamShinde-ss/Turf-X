/**
 * TURF X — Authentication & Admin Management Engine
 * Handles Player Signup/Login, Admin Portal, and Role-Based UI
 */

const AuthEngine = (function() {
  const state = {
    currentUser: null, // { id, name, email, phone, role, walletBalance, turfCoins }
    activeAuthTab: 'LOGIN_USER' // 'LOGIN_USER' | 'SIGNUP_USER' | 'LOGIN_ADMIN'
  };

  function init() {
    // Check localStorage for saved session
    const saved = localStorage.getItem('turfx_user');
    if (saved) {
      try {
        state.currentUser = JSON.parse(saved);
      } catch (e) {
        state.currentUser = null;
      }
    }

    // If no user saved, load default Aditya Sharma
    if (!state.currentUser) {
      loadDefaultUser();
    } else {
      updateNavAuthUI();
    }
  }

  async function loadDefaultUser() {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (data.success) {
        state.currentUser = data.user;
        localStorage.setItem('turfx_user', JSON.stringify(data.user));
        updateNavAuthUI();
      }
    } catch (e) {
      console.warn('Could not load default user:', e);
    }
  }

  function updateNavAuthUI() {
    const userBtn = document.getElementById('navUserAuthBtn');
    const adminBtn = document.getElementById('navAdminDashboardBtn');
    const walletPill = document.getElementById('navWalletPill');

    if (!userBtn) return;

    if (!state.currentUser) {
      userBtn.innerHTML = `<span>🔑 Login / Sign Up</span>`;
      userBtn.onclick = () => openAuthModal('LOGIN_USER');
      if (adminBtn) adminBtn.style.display = 'none';
      if (walletPill) walletPill.style.display = 'none';
      return;
    }

    if (state.currentUser.role === 'ADMIN') {
      userBtn.innerHTML = `<span>🛡️ ${state.currentUser.name}</span> <span style="font-size:0.65rem; background:var(--accent-volt); color:#000; padding:1px 5px; border-radius:3px; font-weight:800;">ADMIN</span>`;
      userBtn.onclick = () => openAdminDashboard();
      if (adminBtn) adminBtn.style.display = 'inline-flex';
      if (walletPill) walletPill.style.display = 'none';
    } else {
      userBtn.innerHTML = `<span>👤 ${state.currentUser.name}</span>`;
      userBtn.onclick = () => window.App?.openUserDrawer();
      if (adminBtn) adminBtn.style.display = 'none';
      if (walletPill) {
        walletPill.style.display = 'inline-flex';
        const badge = document.getElementById('navWalletBalance');
        if (badge) badge.textContent = `₹${state.currentUser.walletBalance}`;
      }
    }
  }

  function openAuthModal(tab = 'LOGIN_USER') {
    state.activeAuthTab = tab;
    const modal = document.getElementById('authModalBackdrop');
    if (!modal) return;
    modal.classList.add('active');
    switchAuthTab(tab);
  }

  function closeAuthModal() {
    const modal = document.getElementById('authModalBackdrop');
    if (modal) modal.classList.remove('active');
  }

  function switchAuthTab(tab) {
    state.activeAuthTab = tab;

    document.querySelectorAll('.auth-tab-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.tab === tab);
    });

    document.querySelectorAll('.auth-pane').forEach(p => {
      p.classList.toggle('active', p.dataset.pane === tab);
    });
  }

  // 1-Click quick test fill
  function fillDemo(type) {
    if (type === 'USER') {
      switchAuthTab('LOGIN_USER');
      document.getElementById('loginUserEmail').value = 'aditya@mumbai.in';
      document.getElementById('loginUserPassword').value = 'user123';
    } else if (type === 'ADMIN') {
      switchAuthTab('LOGIN_ADMIN');
      document.getElementById('loginAdminEmail').value = 'admin@turfx.mumbai';
      document.getElementById('loginAdminPassword').value = 'admin123';
    }
  }

  async function handleLogin(role = 'USER') {
    const emailEl = role === 'ADMIN' ? document.getElementById('loginAdminEmail') : document.getElementById('loginUserEmail');
    const passEl = role === 'ADMIN' ? document.getElementById('loginAdminPassword') : document.getElementById('loginUserPassword');

    const email = emailEl?.value?.trim();
    const password = passEl?.value?.trim();

    if (!email || !password) {
      window.showToast('Please enter email and password.', 'warning');
      return;
    }

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      if (!data.success) {
        window.showToast(data.message, 'danger');
        return;
      }

      state.currentUser = data.user;
      localStorage.setItem('turfx_user', JSON.stringify(data.user));
      updateNavAuthUI();
      closeAuthModal();

      window.showToast(`Logged in successfully as ${data.user.name} (${data.user.role})!`, 'success');

      if (data.user.role === 'ADMIN') {
        openAdminDashboard();
      }
    } catch (err) {
      window.showToast('Login request failed.', 'danger');
    }
  }

  async function handleSignup() {
    const name = document.getElementById('signupName')?.value?.trim();
    const email = document.getElementById('signupEmail')?.value?.trim();
    const phone = document.getElementById('signupPhone')?.value?.trim();
    const password = document.getElementById('signupPassword')?.value?.trim();
    const role = document.getElementById('signupRole')?.value || 'USER';

    if (!name || !email || !password) {
      window.showToast('Name, Email and Password are required.', 'warning');
      return;
    }

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, password, role })
      });

      const data = await res.json();
      if (!data.success) {
        window.showToast(data.message, 'danger');
        return;
      }

      state.currentUser = data.user;
      localStorage.setItem('turfx_user', JSON.stringify(data.user));
      updateNavAuthUI();
      closeAuthModal();

      window.showToast(`Account created! Welcome to Turf X, ${data.user.name}!`, 'success');
    } catch (err) {
      window.showToast('Signup request failed.', 'danger');
    }
  }

  function handleLogout() {
    state.currentUser = null;
    localStorage.removeItem('turfx_user');
    updateNavAuthUI();
    closeAdminDashboard();
    window.showToast('You have been logged out.', 'info');
  }

  // ================= ADMIN DASHBOARD =================
  async function openAdminDashboard() {
    const modal = document.getElementById('adminDashboardBackdrop');
    if (!modal) return;
    modal.classList.add('active');

    await loadAdminStats();
    await loadAdminBookings();
    await loadAdminEquipment();
  }

  function closeAdminDashboard() {
    const modal = document.getElementById('adminDashboardBackdrop');
    if (modal) modal.classList.remove('active');
  }

  async function loadAdminStats() {
    try {
      const res = await fetch('/api/admin/stats');
      const data = await res.json();
      if (data.success) {
        const s = data.stats;
        document.getElementById('adminStatRevenue').textContent = `₹${s.totalRevenue.toLocaleString()}`;
        document.getElementById('adminStatBookings').textContent = s.totalBookings;
        document.getElementById('adminStatTurfs').textContent = s.turfsCount;
        document.getElementById('adminStatEquipment').textContent = s.equipmentCount;
      }
    } catch (e) {
      console.warn('Admin stats error:', e);
    }
  }

  async function loadAdminBookings() {
    try {
      const res = await fetch('/api/admin/bookings');
      const data = await res.json();
      const list = document.getElementById('adminBookingsList');
      if (!list) return;

      const bookings = data.data || [];
      if (bookings.length === 0) {
        list.innerHTML = `<div style="text-align:center; padding:1.5rem; color:var(--text-muted);">No bookings found.</div>`;
        return;
      }

      list.innerHTML = `
        <table style="width:100%; border-collapse:collapse; font-size:0.78rem; text-align:left;">
          <tr style="border-bottom:1px solid rgba(255,255,255,0.1); color:var(--text-muted);">
            <th style="padding:8px;">Ref #</th>
            <th style="padding:8px;">Player</th>
            <th style="padding:8px;">Turf Venue</th>
            <th style="padding:8px;">Date / Slot</th>
            <th style="padding:8px;">Total</th>
            <th style="padding:8px;">Mode</th>
            <th style="padding:8px;">Status</th>
            <th style="padding:8px; text-align:right;">Action</th>
          </tr>
          ${bookings.map(b => `
            <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
              <td style="padding:8px;" class="mono" style="color:var(--accent-volt); font-weight:700;">${b.bookingRef}</td>
              <td style="padding:8px; font-weight:600;">${b.userName}<br><span style="color:var(--text-muted); font-size:0.7rem;">${b.userPhone}</span></td>
              <td style="padding:8px;">${b.turfName}</td>
              <td style="padding:8px;">${b.date}<br><span class="mono" style="color:var(--text-muted); font-size:0.7rem;">${b.slotTime}</span></td>
              <td style="padding:8px;" class="mono" style="font-weight:700;">₹${b.totalAmount}</td>
              <td style="padding:8px;">${b.paymentMode}</td>
              <td style="padding:8px;">
                <span style="font-size:0.7rem; font-weight:700; padding:2px 6px; border-radius:3px; background:${b.status === 'CONFIRMED' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}; color:${b.status === 'CONFIRMED' ? 'var(--accent-emerald)' : 'var(--danger)'};">
                  ${b.status}
                </span>
              </td>
              <td style="padding:8px; text-align:right;">
                ${b.status === 'CONFIRMED' ? `<button class="btn-secondary" style="padding:3px 8px; font-size:0.7rem; color:var(--danger); border-color:var(--danger);" onclick="AuthEngine.cancelBooking('${b.id}')">Cancel</button>` : '—'}
              </td>
            </tr>
          `).join('')}
        </table>
      `;
    } catch (e) {
      console.warn('Admin bookings error:', e);
    }
  }

  async function cancelBooking(id) {
    if (!confirm('Are you sure you want to cancel this booking?')) return;
    try {
      const res = await fetch(`/api/admin/bookings/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        window.showToast(data.message, 'success');
        loadAdminBookings();
        loadAdminStats();
      }
    } catch (e) {
      window.showToast('Error cancelling booking', 'danger');
    }
  }

  async function loadAdminEquipment() {
    try {
      const res = await fetch('/api/turfs');
      const data = await res.json();
      const turfs = data.data || [];

      const select = document.getElementById('adminEquipTurfSelect');
      if (select) {
        select.innerHTML = turfs.map(t => `<option value="${t.id}">${t.name} (${t.zone})</option>`).join('');
        select.onchange = (e) => loadEquipmentListForAdmin(e.target.value);
        if (turfs.length > 0) {
          loadEquipmentListForAdmin(turfs[0].id);
        }
      }

      // Populate photo uploader dropdown
      const photoSelect = document.getElementById('adminPhotoTurfSelect');
      if (photoSelect) {
        photoSelect.innerHTML = turfs.map(t => `<option value="${t.id}" ${t.id === 'turf_colaba_cooperage' ? 'selected' : ''}>${t.name} (${t.zone})</option>`).join('');
        loadCurrentTurfPhoto('turf_colaba_cooperage');
      }
    } catch (e) {}
  }

  function loadCurrentTurfPhoto(turfId) {
    fetch(`/api/turfs/${turfId}`)
      .then(r => r.json())
      .then(d => {
        if (d.success && d.data) {
          const preview = document.getElementById('adminPhotoPreview');
          const urlInput = document.getElementById('adminPhotoUrlInput');
          if (preview) preview.src = d.data.image;
          if (urlInput) urlInput.value = d.data.image;
        }
      });
  }

  function handlePhotoFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
      const base64 = e.target.result;
      const preview = document.getElementById('adminPhotoPreview');
      const urlInput = document.getElementById('adminPhotoUrlInput');
      if (preview) preview.src = base64;
      if (urlInput) urlInput.value = base64;
    };
    reader.readAsDataURL(file);
  }

  async function saveTurfPhoto() {
    const turfId = document.getElementById('adminPhotoTurfSelect')?.value || 'turf_colaba_cooperage';
    const image = document.getElementById('adminPhotoUrlInput')?.value?.trim();

    if (!image) {
      window.showToast?.('Please select an image file or provide an image URL', 'warning');
      return;
    }

    try {
      const res = await fetch(`/api/admin/turfs/${turfId}/image`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image })
      });
      const data = await res.json();
      if (data.success) {
        window.showToast?.(data.message, 'success');
        // Refresh homepage turf cards
        if (window.App && typeof window.App.init === 'function') {
          window.App.init();
        }
      } else {
        window.showToast?.(data.message, 'danger');
      }
    } catch (e) {
      window.showToast?.('Error updating turf image', 'danger');
    }
  }

  async function loadEquipmentListForAdmin(turfId) {
    const container = document.getElementById('adminEquipmentTable');
    if (!container) return;

    try {
      const res = await fetch(`/api/turfs/${turfId}/equipment`);
      const data = await res.json();
      const items = data.data || [];

      container.innerHTML = `
        <table style="width:100%; border-collapse:collapse; font-size:0.78rem; text-align:left;">
          <tr style="border-bottom:1px solid rgba(255,255,255,0.1); color:var(--text-muted);">
            <th style="padding:6px;">Item Name</th>
            <th style="padding:6px;">Brand</th>
            <th style="padding:6px;">Price/hr (₹)</th>
            <th style="padding:6px;">Stock Units</th>
            <th style="padding:6px; text-align:right;">Action</th>
          </tr>
          ${items.map(i => `
            <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
              <td style="padding:6px; font-weight:600;">${i.name}</td>
              <td style="padding:6px; color:var(--text-muted);">${i.brand}</td>
              <td style="padding:6px;">
                <input type="number" id="eq-price-${i.id}" value="${i.pricePerHour}" class="text-input mono" style="width:80px; padding:3px 6px; font-size:0.75rem;">
              </td>
              <td style="padding:6px;">
                <input type="number" id="eq-stock-${i.id}" value="${i.totalStock}" class="text-input mono" style="width:70px; padding:3px 6px; font-size:0.75rem;">
              </td>
              <td style="padding:6px; text-align:right;">
                <button class="btn-primary" style="padding:3px 9px; font-size:0.72rem;" onclick="AuthEngine.saveEquipment('${i.id}')">
                  Save
                </button>
              </td>
            </tr>
          `).join('')}
        </table>
      `;
    } catch (e) {}
  }

  async function saveEquipment(id) {
    const price = document.getElementById(`eq-price-${id}`)?.value;
    const stock = document.getElementById(`eq-stock-${id}`)?.value;

    try {
      const res = await fetch(`/api/admin/equipment/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pricePerHour: price, totalStock: stock })
      });
      const data = await res.json();
      if (data.success) {
        window.showToast(data.message, 'success');
      }
    } catch (e) {
      window.showToast('Failed to update equipment', 'danger');
    }
  }

  return {
    state,
    init,
    openAuthModal,
    closeAuthModal,
    switchAuthTab,
    fillDemo,
    handleLogin,
    handleSignup,
    handleLogout,
    openAdminDashboard,
    closeAdminDashboard,
    cancelBooking,
    saveEquipment,
    loadCurrentTurfPhoto,
    handlePhotoFileSelect,
    saveTurfPhoto
  };
})();

// Attach to window and bootstrap
window.AuthEngine = AuthEngine;
document.addEventListener('DOMContentLoaded', AuthEngine.init);
