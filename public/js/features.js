/**
 * TURF X — Unique Sports-Tech Platform Features:
 * 1. Match Pass PDF & Digital Boarding Pass Download
 * 2. Mumbai Squad Matchmaker (Find Teammates & Fill Missing Players)
 * 3. 3D Stadium Tactical Pitch View (5v5 / 7v7 / Box Cricket lineup visualizer)
 * 4. Live Monsoon Weather Radar & Real-Time Pitch Advisory
 */

const UniqueFeatures = (function() {
  const state = {
    lobbies: [],
    selectedTacticalFormation: '5v5'
  };

  async function init() {
    await loadLobbies();
  }

  // ================= 1. MATCH PASS DIGITAL TICKET DOWNLOAD =================
  async function downloadMatchPass(bookingRef) {
    let ref = bookingRef;
    let turf = 'St. Andrews AstroTurf Arena';
    let time = 'Tonight • 20:00 - 21:00';
    let mode = 'UPI Verified';
    let paid = '₹2,200';
    let due = '₹0';
    let gear = 'Nike Flight Match Ball, Neon Squad Bibs';

    // If ref provided, fetch real booking from backend
    if (ref) {
      try {
        const res = await fetch(`/api/bookings/${ref}`);
        const data = await res.json();
        if (data.success && data.data) {
          const b = data.data;
          ref = b.bookingRef;
          turf = b.turfName;
          time = `${b.date} • ${b.slotTime}`;
          mode = `${b.paymentMode} (${b.paymentStatus})`;
          paid = `₹${b.advancePaid}`;
          due = `₹${b.dueAtVenue || 0}`;
          gear = (b.equipmentItems || []).map(i => `${i.name} (x${i.quantity})`).join(', ') || 'Turf Slot Only';
        }
      } catch (e) {}
    } else {
      ref = document.getElementById('receiptRef')?.textContent || 'TXM-7781';
      turf = document.getElementById('receiptTurfName')?.textContent || turf;
      time = document.getElementById('receiptDateTime')?.textContent || time;
      mode = document.getElementById('receiptPaymentMode')?.textContent || mode;
      paid = document.getElementById('receiptAdvancePaid')?.textContent || paid;
      due = document.getElementById('receiptDueVenue')?.textContent || due;
      gear = document.getElementById('receiptEquipmentSummary')?.textContent || gear;
    }

    // Generate sleek branded SVG stadium boarding pass
    const passSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="600" height="820" viewBox="0 0 600 820" style="background:#07090E; font-family:'Segoe UI', Roboto, sans-serif;">
        <defs>
          <linearGradient id="neonGlow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#CCFF00" />
            <stop offset="100%" stop-color="#10B981" />
          </linearGradient>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.03)" stroke-width="1"/>
          </pattern>
        </defs>

        <!-- Background -->
        <rect width="600" height="820" fill="#07090E"/>
        <rect width="600" height="820" fill="url(#grid)"/>

        <!-- Outer Border -->
        <rect x="20" y="20" width="560" height="780" rx="16" fill="#0E131F" stroke="rgba(204,255,0,0.35)" stroke-width="2"/>

        <!-- Header -->
        <rect x="20" y="20" width="560" height="110" rx="16" fill="#141B2D"/>
        <text x="50" y="65" font-size="28" font-weight="900" fill="#FFFFFF" letter-spacing="-1">TURF X</text>
        <text x="160" y="65" font-size="12" font-weight="800" fill="#000" background="#CCFF00">
          <tspan fill="#CCFF00">⚡ MUMBAI EDITION</tspan>
        </text>
        <text x="50" y="95" font-size="13" fill="#94A3B8">OFFICIAL STADIUM DIGITAL MATCH PASS</text>
        <text x="530" y="75" font-size="24" font-weight="800" fill="#CCFF00" text-anchor="end">${ref}</text>

        <!-- Perforated Line -->
        <line x1="20" y1="130" x2="580" y2="130" stroke="rgba(255,255,255,0.15)" stroke-width="2" stroke-dasharray="8 6"/>

        <!-- Main Details -->
        <text x="50" y="175" font-size="12" font-weight="700" fill="#94A3B8">VENUE</text>
        <text x="50" y="205" font-size="20" font-weight="800" fill="#FFFFFF">${escapeXml(turf)}</text>

        <text x="50" y="255" font-size="12" font-weight="700" fill="#94A3B8">MATCH DATE &amp; TIME</text>
        <text x="50" y="285" font-size="18" font-weight="700" fill="#CCFF00">${escapeXml(time)}</text>

        <!-- 2 Column Details -->
        <text x="50" y="340" font-size="12" font-weight="700" fill="#94A3B8">ONLINE PAID</text>
        <text x="50" y="365" font-size="16" font-weight="800" fill="#10B981">${escapeXml(paid)} (Confirmed)</text>

        <text x="320" y="340" font-size="12" font-weight="700" fill="#94A3B8">BALANCE DUE AT VENUE</text>
        <text x="320" y="365" font-size="16" font-weight="800" fill="#F8FAFC">${escapeXml(due)}</text>

        <text x="50" y="420" font-size="12" font-weight="700" fill="#94A3B8">RESERVED EQUIPMENT</text>
        <text x="50" y="445" font-size="14" font-weight="600" fill="#E2E8F0">${escapeXml(gear)}</text>

        <text x="50" y="500" font-size="12" font-weight="700" fill="#94A3B8">PAYMENT METHOD</text>
        <text x="50" y="525" font-size="14" font-weight="600" fill="#E2E8F0">${escapeXml(mode)}</text>

        <!-- Stadium Entry Instructions -->
        <rect x="50" y="560" width="500" height="95" rx="10" fill="rgba(16,185,129,0.08)" stroke="rgba(16,185,129,0.3)" stroke-width="1"/>
        <text x="70" y="590" font-size="13" font-weight="700" fill="#10B981">STADIUM ENTRY &amp; MONSOON PROTOCOL</text>
        <text x="70" y="615" font-size="12" fill="#94A3B8">• Show this digital boarding pass at the turf reception desk before kickoff.</text>
        <text x="70" y="635" font-size="12" fill="#94A3B8">• AstroTurf rubber-studded footwear or flat turf shoes strictly recommended.</text>

        <!-- Simulated Barcode / QR Box -->
        <rect x="50" y="680" width="500" height="85" rx="8" fill="#FFFFFF"/>
        <text x="300" y="720" font-size="20" font-weight="900" fill="#07090E" text-anchor="middle" letter-spacing="8">||||| | |||| |||||| | ||||| | ||</text>
        <text x="300" y="745" font-size="11" font-weight="800" fill="#475569" text-anchor="middle">VERIFIED TURF X MUMBAI DIGITAL ENCRYPTION • ${ref}</text>
      </svg>
    `;

    // Download SVG / Image to user machine
    const blob = new Blob([passSvg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `TurfX_MatchPass_${ref}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    window.showToast?.(`📥 Match Pass downloaded: ${ref}`, 'success');
  }

  function escapeXml(unsafe) {
    return (unsafe || '').replace(/[<>&'"]/g, function (c) {
      switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case '\'': return '&apos;';
        case '"': return '&quot;';
      }
    });
  }

  // ================= 2. SQUAD MATCHMAKER (MUMBAI LOBBIES) =================
  async function loadLobbies() {
    try {
      const res = await fetch('/api/features/lobbies');
      const data = await res.json();
      if (data.success) {
        state.lobbies = data.data || [];
        renderLobbies();
      }
    } catch (e) {
      console.warn('Lobbies fetch note:', e);
    }
  }

  function renderLobbies() {
    const container = document.getElementById('matchLobbiesGrid');
    if (!container) return;

    if (state.lobbies.length === 0) {
      container.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:2rem; color:var(--text-muted);">No open player lobbies right now. Create the first one below!</div>`;
      return;
    }

    container.innerHTML = state.lobbies.map(l => `
      <div class="glass-panel" style="padding:1.25rem; border-radius:var(--radius-md); border-left:4px solid var(--accent-volt); display:flex; flex-direction:column; justify-content:space-between; gap:1rem;">
        <div>
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:0.4rem;">
            <span style="font-size:0.75rem; font-weight:800; background:rgba(204,255,0,0.15); color:var(--accent-volt); padding:2px 8px; border-radius:4px;">
              ${l.sport}
            </span>
            <span style="font-size:0.75rem; color:var(--accent-emerald); font-weight:700;">
              ⚡ ${l.playersNeeded} Spot(s) Open
            </span>
          </div>

          <h4 style="font-size:1.1rem; margin-bottom:4px;">${l.turfName}</h4>
          <div style="font-size:0.78rem; color:var(--text-secondary); margin-bottom:8px;">
            🗓 ${l.date} • ⏰ ${l.slotTime}
          </div>

          <p style="font-size:0.8rem; color:var(--text-muted); line-height:1.45; background:rgba(255,255,255,0.02); padding:0.6rem; border-radius:6px; margin-bottom:0.6rem;">
            "${l.description}"
          </p>

          <div style="font-size:0.74rem; color:var(--text-muted); display:flex; gap:0.75rem;">
            <span>Level: <strong style="color:var(--text-primary);">${l.skillLevel}</strong></span>
            <span>Host: <strong style="color:var(--text-primary);">${l.creatorName}</strong></span>
          </div>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; border-top:var(--border-glass); padding-top:0.75rem;">
          <div>
            <div style="font-size:0.68rem; color:var(--text-muted); text-transform:uppercase;">Share per player</div>
            <div class="mono" style="font-size:1.15rem; font-weight:800; color:var(--accent-volt);">₹${l.sharePerPlayer}</div>
          </div>
          <button class="btn-primary" style="padding:0.5rem 0.95rem; font-size:0.8rem;" onclick="UniqueFeatures.joinLobby('${l.id}')">
            Join Match ➔
          </button>
        </div>
      </div>
    `).join('');
  }

  async function joinLobby(id) {
    try {
      const res = await fetch(`/api/features/lobbies/${id}/join`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        window.showToast?.(data.message, 'success');
        await loadLobbies();
      } else {
        window.showToast?.(data.message, 'warning');
      }
    } catch (e) {
      window.showToast?.('Could not join lobby', 'danger');
    }
  }

  function openCreateLobbyModal() {
    const modal = document.getElementById('createLobbyModalBackdrop');
    if (modal) modal.classList.add('active');
  }

  function closeCreateLobbyModal() {
    const modal = document.getElementById('createLobbyModalBackdrop');
    if (modal) modal.classList.remove('active');
  }

  async function submitCreateLobby() {
    const creatorName = document.getElementById('lobbyCreatorName')?.value?.trim();
    const creatorPhone = document.getElementById('lobbyCreatorPhone')?.value?.trim();
    const turfName = document.getElementById('lobbyTurfSelect')?.selectedOptions[0]?.text || 'Mumbai Turf Arena';
    const turfId = document.getElementById('lobbyTurfSelect')?.value;
    const sport = document.getElementById('lobbySportSelect')?.value || 'Football';
    const date = document.getElementById('lobbyDateSelect')?.value || 'Tonight';
    const slotTime = document.getElementById('lobbySlotSelect')?.value || '21:00 - 22:00';
    const playersNeeded = document.getElementById('lobbyPlayersNeeded')?.value || 2;
    const skillLevel = document.getElementById('lobbySkillLevel')?.value || 'All Welcome';
    const sharePerPlayer = document.getElementById('lobbyShareCost')?.value || 200;
    const description = document.getElementById('lobbyDescription')?.value?.trim() || 'Join our squad match!';

    if (!creatorName) {
      window.showToast?.('Please enter your name', 'warning');
      return;
    }

    try {
      const res = await fetch('/api/features/lobbies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorName, creatorPhone, turfName, turfId, sport,
          date, slotTime, playersNeeded, skillLevel, sharePerPlayer, description
        })
      });
      const data = await res.json();
      if (data.success) {
        window.showToast?.('Match lobby posted! Other players can now join.', 'success');
        closeCreateLobbyModal();
        await loadLobbies();
      }
    } catch (e) {
      window.showToast?.('Error creating lobby', 'danger');
    }
  }

  // ================= 3. 3D TACTICAL PITCH BOARD =================
  function openTacticalBoard(turfName = 'St. Andrews AstroTurf') {
    const modal = document.getElementById('tacticalBoardModalBackdrop');
    if (!modal) return;
    modal.classList.add('active');

    document.getElementById('tacticalTurfLabel').textContent = turfName;
    renderTacticalPitch('5v5');
  }

  function closeTacticalBoard() {
    const modal = document.getElementById('tacticalBoardModalBackdrop');
    if (modal) modal.classList.remove('active');
  }

  function renderTacticalPitch(formation) {
    state.selectedTacticalFormation = formation;

    document.querySelectorAll('.tactical-pill').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.formation === formation);
    });

    const canvas = document.getElementById('tacticalPitchCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const w = canvas.width = 640;
    const h = canvas.height = 400;

    // Turf Green Grass Background
    ctx.fillStyle = '#0B331E';
    ctx.fillRect(0, 0, w, h);

    // Mowed lawn subtle alternating stripes
    ctx.fillStyle = 'rgba(16, 185, 129, 0.06)';
    for (let x = 0; x < w; x += 80) {
      ctx.fillRect(x, 0, 40, h);
    }

    // Outer line & penalty marks
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 2.5;

    // Pitch perimeter
    ctx.strokeRect(20, 20, w - 40, h - 40);

    // Halfway line & center circle
    ctx.beginPath();
    ctx.moveTo(w / 2, 20);
    ctx.lineTo(w / 2, h - 20);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 50, 0, Math.PI * 2);
    ctx.stroke();

    // Goal boxes (Left & Right)
    ctx.strokeRect(20, (h - 160) / 2, 70, 160);
    ctx.strokeRect(w - 90, (h - 160) / 2, 70, 160);

    // Render Players according to formation
    if (formation === '5v5') {
      // Team Neon (Left)
      drawPlayerNode(ctx, 50, h / 2, 'GK', '#CCFF00', '#000');
      drawPlayerNode(ctx, 150, h / 3, 'DEF', '#CCFF00', '#000');
      drawPlayerNode(ctx, 150, (h * 2) / 3, 'DEF', '#CCFF00', '#000');
      drawPlayerNode(ctx, 230, h / 2, 'MID', '#CCFF00', '#000');
      drawPlayerNode(ctx, 290, h / 2, 'ST', '#CCFF00', '#000');

      // Team Orange (Right)
      drawPlayerNode(ctx, w - 50, h / 2, 'GK', '#F97316', '#000');
      drawPlayerNode(ctx, w - 150, h / 3, 'DEF', '#F97316', '#000');
      drawPlayerNode(ctx, w - 150, (h * 2) / 3, 'DEF', '#F97316', '#000');
      drawPlayerNode(ctx, w - 230, h / 2, 'MID', '#F97316', '#000');
      drawPlayerNode(ctx, w - 290, h / 2, 'ST', '#F97316', '#000');
    } else if (formation === '7v7') {
      // 7v7 Lineup (1-2-3-1)
      drawPlayerNode(ctx, 50, h / 2, 'GK', '#CCFF00', '#000');
      drawPlayerNode(ctx, 130, h / 3, 'LB', '#CCFF00', '#000');
      drawPlayerNode(ctx, 130, (h * 2) / 3, 'RB', '#CCFF00', '#000');
      drawPlayerNode(ctx, 210, h / 4, 'LM', '#CCFF00', '#000');
      drawPlayerNode(ctx, 210, h / 2, 'CM', '#CCFF00', '#000');
      drawPlayerNode(ctx, 210, (h * 3) / 4, 'RM', '#CCFF00', '#000');
      drawPlayerNode(ctx, 290, h / 2, 'ST', '#CCFF00', '#000');

      // Opponent 7v7
      drawPlayerNode(ctx, w - 50, h / 2, 'GK', '#38BDF8', '#000');
      drawPlayerNode(ctx, w - 130, h / 3, 'LB', '#38BDF8', '#000');
      drawPlayerNode(ctx, w - 130, (h * 2) / 3, 'RB', '#38BDF8', '#000');
      drawPlayerNode(ctx, w - 210, h / 4, 'LM', '#38BDF8', '#000');
      drawPlayerNode(ctx, w - 210, h / 2, 'CM', '#38BDF8', '#000');
      drawPlayerNode(ctx, w - 210, (h * 3) / 4, 'RM', '#38BDF8', '#000');
      drawPlayerNode(ctx, w - 290, h / 2, 'ST', '#38BDF8', '#000');
    } else if (formation === 'CRICKET') {
      // Box Cricket pitch layout
      ctx.fillStyle = '#C89D66'; // Cricket pitch strip
      ctx.fillRect((w - 200) / 2, (h - 60) / 2, 200, 60);
      ctx.strokeStyle = '#FFFFFF';
      ctx.strokeRect((w - 200) / 2, (h - 60) / 2, 200, 60);

      drawPlayerNode(ctx, (w - 200) / 2 - 25, h / 2, 'WKT', '#F59E0B', '#000');
      drawPlayerNode(ctx, (w - 200) / 2 + 30, h / 2, 'BAT', '#CCFF00', '#000');
      drawPlayerNode(ctx, (w + 200) / 2 - 30, h / 2, 'NON', '#CCFF00', '#000');
      drawPlayerNode(ctx, (w + 200) / 2 + 35, h / 2, 'BOWL', '#EF4444', '#000');

      drawPlayerNode(ctx, 160, 60, 'SLIP', '#F59E0B', '#000');
      drawPlayerNode(ctx, 120, h - 60, 'LEG', '#F59E0B', '#000');
      drawPlayerNode(ctx, w - 140, 60, 'OFF', '#F59E0B', '#000');
      drawPlayerNode(ctx, w - 120, h - 60, 'MID-W', '#F59E0B', '#000');
    }
  }

  function drawPlayerNode(ctx, x, y, label, bg, textCol) {
    ctx.shadowColor = bg;
    ctx.shadowBlur = 10;
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.arc(x, y, 16, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = textCol;
    ctx.font = 'bold 10px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x, y);
  }

  // ================= 4. MUMBAI WEATHER & MONSOON RADAR MODAL =================
  function openWeatherRadar() {
    const modal = document.getElementById('monsoonRadarModalBackdrop');
    if (modal) modal.classList.add('active');
  }

  function closeWeatherRadar() {
    const modal = document.getElementById('monsoonRadarModalBackdrop');
    if (modal) modal.classList.remove('active');
  }

  return {
    state,
    init,
    downloadMatchPass,
    loadLobbies,
    joinLobby,
    openCreateLobbyModal,
    closeCreateLobbyModal,
    submitCreateLobby,
    openTacticalBoard,
    closeTacticalBoard,
    renderTacticalPitch,
    openWeatherRadar,
    closeWeatherRadar
  };
})();

// Attach to window and bootstrap
window.UniqueFeatures = UniqueFeatures;
document.addEventListener('DOMContentLoaded', UniqueFeatures.init);
