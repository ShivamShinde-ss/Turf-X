/**
 * TURF X — 5-Tier Multi-Mode Payment System (Module C)
 * Integrates:
 * 1. UPI Instant Pay (Dynamic QR + UPI VPA Verifier + Live Polling)
 * 2. Credit/Debit Cards & NetBanking (Interactive 3D Card + 3D Secure OTP Overlay)
 * 3. Split-With-Squad (Multi-Player Real-time Slider & WhatsApp Link Generation)
 * 4. Partial Advance (Pay 30% Online, 70% Cash/UPI at Venue)
 * 5. Turf X Wallet & Pass Credits (1-Click Deduction & +5% Turf Coins Cashback)
 */

const PaymentsEngine = (function() {
  const state = {
    activeMode: 'UPI', // 'UPI' | 'CARD' | 'SPLIT' | 'PARTIAL' | 'WALLET'
    bookingPayload: null,
    totalAmount: 0,
    walletBalance: 3200,
    turfCoins: 160,
    squadCount: 5,
    otpSessionId: null,
    testOtp: null,
    pollingInterval: null
  };

  /**
   * Open the 5-Tier Payment Modal
   */
  async function openModal(payload) {
    state.bookingPayload = payload;
    state.totalAmount = payload.totalAmount || 0;

    // Refresh wallet info from API
    await fetchWalletData();

    const modal = document.getElementById('paymentModalBackdrop');
    if (!modal) return;

    modal.classList.add('active');

    // Update Header
    document.getElementById('modalTotalAmount').textContent = `₹${state.totalAmount}`;
    document.getElementById('modalBookingSubtitle').textContent = 
      `${payload.turfName} • ${payload.date} (${payload.slotTime})`;

    // Reset modes & switch to UPI default
    selectPaymentMode('UPI');
    generateDynamicQr();
    updateSplitCalculator();
    updatePartialDisplay();
    updateWalletDisplay();
  }

  function closeModal() {
    const modal = document.getElementById('paymentModalBackdrop');
    if (modal) modal.classList.remove('active');

    // Hide OTP overlay if active
    const otpOverlay = document.getElementById('otpOverlay');
    if (otpOverlay) otpOverlay.classList.remove('active');

    if (state.pollingInterval) {
      clearInterval(state.pollingInterval);
      state.pollingInterval = null;
    }
  }

  async function fetchWalletData() {
    try {
      const res = await fetch('/api/payments/wallet');
      const data = await res.json();
      if (data.success) {
        state.walletBalance = data.walletBalance;
        state.turfCoins = data.turfCoins;
        updateNavWalletBadge(state.walletBalance);
      }
    } catch (err) {
      console.warn('Wallet fetch error:', err);
    }
  }

  function updateNavWalletBadge(balance) {
    const badge = document.getElementById('navWalletBalance');
    if (badge) badge.textContent = `₹${balance}`;
  }

  /**
   * Switch between the 5 Payment Tabs
   */
  function selectPaymentMode(mode) {
    state.activeMode = mode;

    // Update Tab Buttons
    document.querySelectorAll('.pay-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });

    // Update Panes
    document.querySelectorAll('.tab-pane').forEach(pane => {
      pane.classList.toggle('active', pane.dataset.pane === mode);
    });

    // Update CTA button label
    const ctaBtn = document.getElementById('btnSubmitPayment');
    if (!ctaBtn) return;

    if (mode === 'UPI') {
      ctaBtn.textContent = `Pay ₹${state.totalAmount} via UPI Instant`;
    } else if (mode === 'CARD') {
      ctaBtn.textContent = `Authenticate & Pay ₹${state.totalAmount}`;
    } else if (mode === 'SPLIT') {
      const perHead = Math.ceil(state.totalAmount / state.squadCount);
      ctaBtn.textContent = `Pay My Share (₹${perHead}) & Split Link`;
    } else if (mode === 'PARTIAL') {
      const advance = Math.round(state.totalAmount * 0.3);
      ctaBtn.textContent = `Pay 30% Advance (₹${advance}) Now`;
    } else if (mode === 'WALLET') {
      ctaBtn.textContent = `1-Click Pay ₹${state.totalAmount} from Wallet`;
    }
  }

  /**
   * 1. UPI: Render Authentic Scannable NPCI UPI QR Code
   */
  async function generateDynamicQr(customUpiId) {
    const upiInput = document.getElementById('inputMerchantUpiId');
    const upiId = customUpiId || upiInput?.value || 'turfx.mumbai@okaxis';
    const amount = state.totalAmount;

    try {
      const res = await fetch(`/api/payments/qr-code?amount=${amount}&upiId=${encodeURIComponent(upiId)}&note=Turf X Mumbai Booking`);
      const data = await res.json();

      if (data.success && data.qrDataUrl) {
        const qrImg = document.getElementById('upiQrRealImage');
        if (qrImg) {
          qrImg.src = data.qrDataUrl;
          qrImg.style.display = 'block';
        }
        const canvas = document.getElementById('upiQrCanvas');
        if (canvas) canvas.style.display = 'none';

        // Update display labels
        const amtEl = document.getElementById('upiQrAmountText');
        if (amtEl) amtEl.textContent = `₹${data.amount} • Verified Merchant`;

        const badge = document.getElementById('upiIdDisplayBadge');
        if (badge) badge.textContent = data.upiId;

        // Set direct intent link for mobile
        const appLink = document.getElementById('btnOpenUpiApp');
        if (appLink) {
          appLink.href = data.upiUri;
        }
      }
    } catch (err) {
      console.error('Error loading real UPI QR:', err);
    }
  }

  function updateCustomUpiId() {
    const val = document.getElementById('inputMerchantUpiId')?.value?.trim();
    if (!val || !val.includes('@')) {
      if (window.showToast) window.showToast('Please enter a valid UPI ID (e.g. name@okaxis)', 'warning');
      return;
    }
    generateDynamicQr(val);
    if (window.showToast) window.showToast(`Updated Payee UPI to: ${val}`, 'success');
  }

  function copyUpiId() {
    const val = document.getElementById('inputMerchantUpiId')?.value?.trim() || 'turfx.mumbai@okaxis';
    navigator.clipboard.writeText(val).then(() => {
      if (window.showToast) window.showToast(`Copied UPI ID: ${val}`, 'success');
    }).catch(() => {
      if (window.showToast) window.showToast(`UPI ID: ${val}`, 'success');
    });
  }

  /**
   * 2. Card: Auto-format inputs & Interactive 3D Card Display
   */
  function handleCardInput(field, value) {
    if (field === 'number') {
      const clean = value.replace(/\D/g, '').substring(0, 16);
      const formatted = clean.match(/.{1,4}/g)?.join(' ') || clean;
      document.getElementById('cardInputNumber').value = formatted;
      document.getElementById('cardDisplayNumber').textContent = formatted || '•••• •••• •••• ••••';

      // Detect Brand
      const brandEl = document.getElementById('cardDisplayBrand');
      if (clean.startsWith('4')) brandEl.textContent = 'VISA';
      else if (clean.startsWith('5')) brandEl.textContent = 'MASTERCARD';
      else if (clean.startsWith('6')) brandEl.textContent = 'RUPAY';
      else brandEl.textContent = 'CARD';
    } else if (field === 'expiry') {
      const clean = value.replace(/\D/g, '').substring(0, 4);
      let formatted = clean;
      if (clean.length >= 2) formatted = clean.substring(0, 2) + '/' + clean.substring(2);
      document.getElementById('cardInputExpiry').value = formatted;
      document.getElementById('cardDisplayExpiry').textContent = formatted || 'MM/YY';
    } else if (field === 'name') {
      document.getElementById('cardDisplayName').textContent = (value || 'YOUR NAME').toUpperCase();
    }
  }

  /**
   * 3. Split-With-Squad Calculator
   */
  function updateSplitCalculator(count) {
    if (count !== undefined) {
      state.squadCount = parseInt(count, 10);
    }
    const slider = document.getElementById('squadSizeSlider');
    if (slider) slider.value = state.squadCount;

    const countDisplay = document.getElementById('squadCountDisplay');
    if (countDisplay) countDisplay.textContent = `${state.squadCount} Players`;

    const perHead = Math.ceil(state.totalAmount / state.squadCount);
    const perHeadEl = document.getElementById('squadPerHeadDisplay');
    if (perHeadEl) perHeadEl.textContent = `₹${perHead}`;

    const totalEl = document.getElementById('squadTotalDisplay');
    if (totalEl) totalEl.textContent = `₹${state.totalAmount}`;

    // Update CTA button if SPLIT active
    if (state.activeMode === 'SPLIT') {
      const ctaBtn = document.getElementById('btnSubmitPayment');
      if (ctaBtn) ctaBtn.textContent = `Pay My Share (₹${perHead}) & Get Squad Link`;
    }
  }

  /**
   * 4. Partial Advance Calculation
   */
  function updatePartialDisplay() {
    const advance = Math.round(state.totalAmount * 0.3);
    const remaining = state.totalAmount - advance;

    const nowEl = document.getElementById('partialPayNowAmount');
    if (nowEl) nowEl.textContent = `₹${advance}`;

    const laterEl = document.getElementById('partialPayLaterAmount');
    if (laterEl) laterEl.textContent = `₹${remaining}`;
  }

  /**
   * 5. Turf X Wallet Display
   */
  function updateWalletDisplay() {
    const balEl = document.getElementById('modalWalletBalanceText');
    if (balEl) balEl.textContent = `₹${state.walletBalance}`;

    const coinsEl = document.getElementById('modalWalletCoinsText');
    if (coinsEl) coinsEl.textContent = `${state.turfCoins} Coins`;

    const warningEl = document.getElementById('walletInsufficientNotice');
    if (warningEl) {
      const isShort = state.walletBalance < state.totalAmount;
      warningEl.style.display = isShort ? 'block' : 'none';
      if (isShort) {
        warningEl.innerHTML = `⚠️ Insufficient balance for this booking (Short by ₹${state.totalAmount - state.walletBalance}). Please top up below.`;
      }
    }
  }

  async function topUpWallet(amount, bonus = 0) {
    try {
      const res = await fetch('/api/payments/wallet/topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, bonus })
      });
      const data = await res.json();
      if (data.success) {
        state.walletBalance = data.walletBalance;
        updateWalletDisplay();
        updateNavWalletBadge(state.walletBalance);
        if (window.showToast) window.showToast(data.message, 'success');
      }
    } catch (err) {
      console.error('Wallet topup error:', err);
    }
  }

  /**
   * Master Payment Submission Handler
   */
  async function submitPayment() {
    const btn = document.getElementById('btnSubmitPayment');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Processing Transaction...';
    }

    try {
      const payload = {
        mode: state.activeMode,
        amount: state.totalAmount,
        bookingData: state.bookingPayload,
        squadCount: state.squadCount
      };

      if (state.activeMode === 'UPI') {
        payload.upiId = document.getElementById('inputUpiId')?.value || 'user@okaxis';
      } else if (state.activeMode === 'CARD') {
        payload.cardDetails = {
          cardNumber: document.getElementById('cardInputNumber')?.value,
          cardExpiry: document.getElementById('cardInputExpiry')?.value,
          cardCvv: document.getElementById('cardInputCvv')?.value,
          cardName: document.getElementById('cardInputName')?.value
        };
      }

      const res = await fetch('/api/payments/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.message || 'Payment processing failed.');
      }

      // Handle CARD 3D-Secure OTP Overlay
      if (state.activeMode === 'CARD' && data.requiresOtp) {
        state.otpSessionId = data.otpSessionId;
        state.testOtp = data.testOtp;

        showOtpOverlay(data.testOtp, data.cardLast4);
        if (btn) {
          btn.disabled = false;
          btn.textContent = `Authenticate & Pay ₹${state.totalAmount}`;
        }
        return;
      }

      // Finalize Booking on the Backend
      await finalizeBooking(data);

    } catch (err) {
      if (window.showToast) window.showToast(err.message, 'danger');
      if (btn) {
        btn.disabled = false;
        selectPaymentMode(state.activeMode); // restores button text
      }
    }
  }

  /**
   * Show 3D Secure OTP Overlay
   */
  function showOtpOverlay(testOtp, cardLast4) {
    const overlay = document.getElementById('otpOverlay');
    if (!overlay) return;

    overlay.classList.add('active');
    document.getElementById('otpCardInfo').textContent = `Authentication for card ending in •••• ${cardLast4}`;
    document.getElementById('otpAutoHint').textContent = `Test OTP: ${testOtp} (Auto-filled for demonstration)`;

    const input = document.getElementById('otpInputSingle');
    if (input) {
      input.value = testOtp;
      input.focus();
    }
  }

  async function verifyCardOtp() {
    const otp = document.getElementById('otpInputSingle')?.value;
    if (!otp) {
      if (window.showToast) window.showToast('Please enter the 6-digit OTP', 'warning');
      return;
    }

    try {
      const res = await fetch('/api/payments/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          otpSessionId: state.otpSessionId,
          otp
        })
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      document.getElementById('otpOverlay').classList.remove('active');
      await finalizeBooking({
        ...data,
        mode: 'CARD',
        status: 'PAID'
      });
    } catch (err) {
      if (window.showToast) window.showToast(err.message, 'danger');
    }
  }

  /**
   * Finalize Booking Record in Database
   */
  async function finalizeBooking(paymentResult) {
    try {
      const isGearOnly = state.bookingPayload.type === 'GEAR_ONLY';
      const endpoint = isGearOnly ? '/api/bookings/gear-only' : '/api/bookings/turf';

      const bookingBody = {
        ...state.bookingPayload,
        paymentMode: state.activeMode,
        paymentResult,
        splitSquadCount: state.squadCount
      };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingBody)
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      // Close drawers and modal
      closeModal();
      if (window.closeDrawer) window.closeDrawer();

      // Show Success Receipt Modal
      showReceiptModal(data.data, paymentResult);

      // Refresh slot availability & wallet
      if (typeof window.refreshCurrentTurfSlots === 'function') {
        window.refreshCurrentTurfSlots();
      }
      fetchWalletData();

    } catch (err) {
      console.error('Finalize booking error:', err);
      if (window.showToast) window.showToast(err.message, 'danger');
    }
  }

  /**
   * Display Final Stadium Confirmed Receipt
   */
  function showReceiptModal(booking, paymentResult) {
    const modal = document.getElementById('receiptModalBackdrop');
    if (!modal) return;

    modal.classList.add('active');

    document.getElementById('receiptRef').textContent = booking.bookingRef;
    document.getElementById('receiptTurfName').textContent = booking.turfName;
    document.getElementById('receiptDateTime').textContent = `${booking.date} • ${booking.slotTime}`;
    document.getElementById('receiptPaymentMode').textContent = `${booking.paymentMode} (${paymentResult.status || 'CONFIRMED'})`;
    document.getElementById('receiptAdvancePaid').textContent = `₹${booking.advancePaid}`;
    document.getElementById('receiptDueVenue').textContent = `₹${booking.dueAtVenue || 0}`;

    // Equipment items summary
    const eqList = booking.equipmentItems || [];
    const eqText = eqList.length > 0 
      ? eqList.map(i => `${i.name} (x${i.quantity})`).join(', ')
      : 'None (Turf Slot Only)';
    document.getElementById('receiptEquipmentSummary').textContent = eqText;

    // Split squad info
    const splitBox = document.getElementById('receiptSquadSplitDetails');
    if (splitBox) {
      if (paymentResult.mode === 'SPLIT' && paymentResult.whatsappLink) {
        splitBox.style.display = 'block';
        document.getElementById('receiptSplitLink').href = paymentResult.whatsappLink;
        document.getElementById('receiptSplitText').textContent = 
          `Share with squad: ₹${paymentResult.perHeadShare}/player (${paymentResult.squadCount} players)`;
      } else {
        splitBox.style.display = 'none';
      }
    }
  }

  function closeReceiptModal() {
    const modal = document.getElementById('receiptModalBackdrop');
    if (modal) modal.classList.remove('active');
  }

  return {
    state,
    openModal,
    closeModal,
    selectPaymentMode,
    handleCardInput,
    updateSplitCalculator,
    topUpWallet,
    submitPayment,
    verifyCardOtp,
    closeReceiptModal,
    updateCustomUpiId,
    copyUpiId,
    generateDynamicQr
  };
})();

// Attach to window
window.PaymentsEngine = PaymentsEngine;
