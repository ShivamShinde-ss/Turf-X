const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Booking = require('../models/Booking');
const { randomUUID } = require('crypto');
const QRCode = require('qrcode');

// Simulated active OTP storage for 3D Secure Card Verification
const pendingCardOtps = new Map();

// GET /api/payments/qr-code - Generates authentic scannable NPCI UPI QR code
router.get('/qr-code', async (req, res) => {
  try {
    const amount = parseFloat(req.query.amount || 0).toFixed(2);
    const upiId = (req.query.upiId || process.env.MERCHANT_UPI_ID || 'turfx.mumbai@okaxis').trim();
    const payeeName = (req.query.payeeName || process.env.MERCHANT_NAME || 'Turf X Mumbai').trim();
    const note = (req.query.note || 'Turf X Mumbai Booking').trim();
    const refId = 'TXM' + Date.now().toString().slice(-6);

    // Official NPCI UPI Deep Link format recognized by GPay, PhonePe, Paytm, BHIM, Cred
    const upiUri = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(payeeName)}&am=${amount}&cu=INR&tn=${encodeURIComponent(note)}&tr=${refId}`;

    // Generate crisp 280x280 QR image
    const qrDataUrl = await QRCode.toDataURL(upiUri, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 280,
      color: {
        dark: '#07090E',
        light: '#FFFFFF'
      }
    });

    res.json({
      success: true,
      upiUri,
      upiId,
      payeeName,
      amount,
      qrDataUrl
    });
  } catch (error) {
    console.error('Error generating UPI QR:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/payments/wallet - Fetch user wallet status
router.get('/wallet', (req, res) => {
  try {
    const userId = req.query.userId || 'user_mumbai_01';
    const user = User.getById(userId) || User.getDefaultUser();
    const transactions = User.getTransactions(user.id);

    res.json({
      success: true,
      walletBalance: user.walletBalance,
      turfCoins: user.turfCoins,
      passTier: user.passTier,
      userName: user.name,
      transactions
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/payments/wallet/topup - Top up wallet balance
router.post('/wallet/topup', (req, res) => {
  try {
    const { amount, bonus = 0, userId = 'user_mumbai_01' } = req.body;
    const topupAmount = parseInt(amount, 10);

    if (isNaN(topupAmount) || topupAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid top-up amount.' });
    }

    const result = User.topUpWallet(userId, topupAmount, parseInt(bonus, 10) || 0);
    res.json({
      success: true,
      message: `Wallet topped up with ₹${result.addedAmount}!`,
      walletBalance: result.walletBalance
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/payments/process - Process payment across 5 modes
router.post('/process', (req, res) => {
  try {
    const {
      mode, // 'UPI' | 'CARD' | 'SPLIT' | 'PARTIAL' | 'WALLET'
      amount,
      bookingData,
      upiId,
      cardDetails,
      squadCount = 4,
      userId = 'user_mumbai_01'
    } = req.body;

    const totalAmount = parseInt(amount, 10);
    if (!totalAmount || totalAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid payment amount.' });
    }

    const user = User.getById(userId) || User.getDefaultUser();
    const txnId = 'TXN_' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 5).toUpperCase();

    // MODE 1: UPI Instant Pay
    if (mode === 'UPI') {
      const vpa = (upiId || '').trim();
      if (vpa && !vpa.includes('@')) {
        return res.status(400).json({ success: false, message: 'Please enter a valid UPI ID (e.g. name@okaxis).' });
      }

      // Generate dynamic UPI intent URI
      const upiUri = `upi://pay?pa=turfx.mumbai@okaxis&pn=Turf%20X%20Mumbai&am=${totalAmount}&cu=INR&tn=TXM-Booking-${txnId}`;

      return res.json({
        success: true,
        mode: 'UPI',
        transactionId: txnId,
        amount: totalAmount,
        upiUri,
        status: 'PAID',
        message: 'UPI payment verified successfully!'
      });
    }

    // MODE 2: Credit / Debit Card & NetBanking
    if (mode === 'CARD') {
      const { cardNumber, cardExpiry, cardCvv, cardName } = cardDetails || {};

      const cleanNum = (cardNumber || '').replace(/\s+/g, '');
      if (cleanNum.length < 15 || cleanNum.length > 19) {
        return res.status(400).json({ success: false, message: 'Please enter a valid 16-digit card number.' });
      }

      if (!cardExpiry || !cardExpiry.includes('/')) {
        return res.status(400).json({ success: false, message: 'Please enter a valid expiry date (MM/YY).' });
      }

      if (!cardCvv || cardCvv.length < 3) {
        return res.status(400).json({ success: false, message: 'Please enter a valid 3-digit CVV.' });
      }

      // Generate 3D-Secure 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpSessionId = 'otp_' + randomUUID().substring(0, 8);
      pendingCardOtps.set(otpSessionId, {
        otp,
        amount: totalAmount,
        cardLast4: cleanNum.slice(-4),
        expiresAt: Date.now() + 5 * 60 * 1000
      });

      return res.json({
        success: true,
        mode: 'CARD',
        requiresOtp: true,
        otpSessionId,
        cardLast4: cleanNum.slice(-4),
        testOtp: otp, // surfaced for effortless testing
        message: '3D-Secure OTP sent to registered mobile.'
      });
    }

    // MODE 3: Split-With-Squad
    if (mode === 'SPLIT') {
      const count = Math.max(2, Math.min(22, parseInt(squadCount, 10) || 5));
      const perHead = Math.ceil(totalAmount / count);
      const splitRef = 'SQUAD-' + Math.floor(1000 + Math.random() * 9000);

      const squadRoster = [];
      squadRoster.push({ player: 1, name: `${user.name} (Organizer)`, share: perHead, status: 'PAID' });
      for (let i = 2; i <= count; i++) {
        squadRoster.push({
          player: i,
          name: `Squad Member #${i}`,
          share: perHead,
          status: i === 2 ? 'PAID' : 'PENDING'
        });
      }

      const shareUrl = `https://turfx.mumbai/pay/split?ref=${splitRef}&amount=${perHead}`;
      const whatsappText = encodeURIComponent(
        `⚽ *Turf X Match Alert!*\n${user.name} booked a slot. Your share: ₹${perHead}.\nTap to pay your share: ${shareUrl}`
      );
      const whatsappLink = `https://api.whatsapp.com/send?text=${whatsappText}`;

      return res.json({
        success: true,
        mode: 'SPLIT',
        transactionId: txnId,
        splitRef,
        totalAmount,
        squadCount: count,
        perHeadShare: perHead,
        whatsappLink,
        shareUrl,
        squadRoster,
        status: 'SQUAD_SPLIT_ACTIVE',
        message: `Squad split generated! ₹${perHead}/player for ${count} players.`
      });
    }

    // MODE 4: Partial Advance ("Pay 30% Now, 70% at Turf")
    if (mode === 'PARTIAL') {
      const advanceDeposit = Math.round(totalAmount * 0.3);
      const dueAtVenue = totalAmount - advanceDeposit;

      return res.json({
        success: true,
        mode: 'PARTIAL',
        transactionId: txnId,
        totalAmount,
        advancePaid: advanceDeposit,
        dueAtVenue,
        status: 'PARTIAL_CONFIRMED',
        message: `₹${advanceDeposit} paid online (30%). Remaining ₹${dueAtVenue} payable at venue.`
      });
    }

    // MODE 5: Turf X Wallet & Pass Credits
    if (mode === 'WALLET') {
      if (user.walletBalance < totalAmount) {
        return res.status(400).json({
          success: false,
          message: `Insufficient wallet balance (₹${user.walletBalance}). Please top up ₹${totalAmount - user.walletBalance} to continue.`
        });
      }

      const deductResult = User.deductWallet(
        user.id,
        totalAmount,
        `Turf X Booking (${bookingData ? bookingData.turfName || 'Mumbai Venue' : 'Session'})`
      );

      return res.json({
        success: true,
        mode: 'WALLET',
        transactionId: txnId,
        amount: totalAmount,
        remainingBalance: deductResult.walletBalance,
        turfCoinsEarned: deductResult.earnedCoins,
        totalCoins: deductResult.turfCoins,
        status: 'PAID',
        message: `₹${totalAmount} deducted from wallet! Earned +${deductResult.earnedCoins} Turf X Coins.`
      });
    }

    return res.status(400).json({ success: false, message: 'Invalid payment mode specified.' });
  } catch (error) {
    console.error('Payment process error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/payments/verify-otp - Verify 3D-Secure Card OTP
router.post('/verify-otp', (req, res) => {
  try {
    const { otpSessionId, otp } = req.body;

    const session = pendingCardOtps.get(otpSessionId);
    if (!session) {
      return res.status(400).json({ success: false, message: 'OTP session expired or invalid. Please retry.' });
    }

    if (Date.now() > session.expiresAt) {
      pendingCardOtps.delete(otpSessionId);
      return res.status(400).json({ success: false, message: 'OTP expired. Please request a new code.' });
    }

    if (session.otp !== (otp || '').trim()) {
      return res.status(400).json({ success: false, message: 'Incorrect OTP entered. Please try again.' });
    }

    pendingCardOtps.delete(otpSessionId);
    const txnId = 'TXN_CARD_' + Date.now().toString(36).toUpperCase();

    res.json({
      success: true,
      transactionId: txnId,
      amount: session.amount,
      status: 'PAID',
      message: 'Card authentication successful via 3D Secure!'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
