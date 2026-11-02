const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const Turf = require('../models/Turf');
const Equipment = require('../models/Equipment');
const User = require('../models/User');

// POST /api/bookings/lock-slot - 7-minute concurrency lock
router.post('/lock-slot', (req, res) => {
  try {
    const { turfId, date, slotTime, userId = 'user_mumbai_01' } = req.body;

    if (!turfId || !date || !slotTime) {
      return res.status(400).json({
        success: false,
        message: 'turfId, date, and slotTime are required.'
      });
    }

    const lockResult = Booking.lockSlot(turfId, date, slotTime, userId);
    if (!lockResult.success) {
      return res.status(409).json(lockResult);
    }

    res.json({
      success: true,
      message: 'Slot locked successfully for 7 minutes.',
      ...lockResult
    });
  } catch (error) {
    console.error('Error locking slot:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/bookings/unlock-slot
router.post('/unlock-slot', (req, res) => {
  try {
    const { lockId } = req.body;
    if (lockId) {
      Booking.unlockSlot(lockId);
    }
    res.json({ success: true, message: 'Slot unlocked.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/bookings/turf - Bundled Turf + Equipment Booking
router.post('/turf', (req, res) => {
  try {
    const {
      turfId,
      date,
      slotTime,
      equipmentItems = [],
      paymentMode = 'UPI',
      userId = 'user_mumbai_01',
      splitSquadCount = 1
    } = req.body;

    const turf = Turf.getById(turfId);
    if (!turf) {
      return res.status(404).json({ success: false, message: 'Turf not found.' });
    }

    // Determine slot pricing
    let turfRate = turf.pricePerHour;
    const hour = parseInt(slotTime.split(':')[0], 10);
    if (hour >= 6 && hour < 16) {
      turfRate = turf.morningPrice;
    } else if (hour >= 16 && hour < 23) {
      turfRate = turf.eveningPrice;
    } else {
      turfRate = turf.nightPrice;
    }

    // Validate and calculate equipment
    let equipmentTotal = 0;
    const verifiedItems = [];

    for (const item of equipmentItems) {
      const eq = Equipment.getById(item.id);
      if (!eq) continue;

      // Validate stock
      const remainingStock = Equipment.getAvailableStockForSlot(item.id, date, slotTime);
      const requestedQty = Math.max(1, parseInt(item.quantity || 1, 10));

      if (requestedQty > remainingStock) {
        return res.status(400).json({
          success: false,
          message: `Only ${remainingStock} unit(s) of "${eq.name}" available for this slot.`
        });
      }

      const itemTotal = eq.pricePerHour * requestedQty;
      equipmentTotal += itemTotal;

      verifiedItems.push({
        id: eq.id,
        name: eq.name,
        brand: eq.brand,
        pricePerHour: eq.pricePerHour,
        quantity: requestedQty,
        total: itemTotal
      });
    }

    const totalAmount = turfRate + equipmentTotal;
    let advancePaid = totalAmount;
    let dueAtVenue = 0;

    if (paymentMode === 'PARTIAL') {
      advancePaid = Math.round(totalAmount * 0.3); // 30% advance
      dueAtVenue = totalAmount - advancePaid;      // 70% at turf
    }

    const user = User.getById(userId) || User.getDefaultUser();

    // Create booking
    const booking = Booking.createBooking({
      userId: user.id,
      userName: user.name,
      userPhone: user.phone,
      userEmail: user.email,
      type: 'TURF_AND_GEAR',
      turfId: turf.id,
      turfName: turf.name,
      turfLocation: turf.location,
      date,
      slotTime,
      turfAmount: turfRate,
      equipmentAmount: equipmentTotal,
      equipmentItems: verifiedItems,
      totalAmount,
      advancePaid,
      dueAtVenue,
      paymentMode,
      paymentStatus: 'COMPLETED',
      splitDetails: paymentMode === 'SPLIT' ? {
        squadSize: splitSquadCount,
        perPlayerShare: Math.ceil(totalAmount / splitSquadCount)
      } : {}
    });

    res.status(201).json({
      success: true,
      message: 'Turf and equipment booking confirmed!',
      data: booking
    });
  } catch (error) {
    console.error('Error creating turf booking:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/bookings/gear-only - Standalone Equipment Rental (Module B)
router.post('/gear-only', (req, res) => {
  try {
    const {
      turfId,
      date,
      slotTime,
      equipmentItems = [],
      paymentMode = 'UPI',
      userId = 'user_mumbai_01'
    } = req.body;

    const turf = Turf.getById(turfId);
    if (!turf) {
      return res.status(404).json({ success: false, message: 'Mumbai turf venue not found.' });
    }

    if (!equipmentItems || equipmentItems.length === 0) {
      return res.status(400).json({ success: false, message: 'Please select at least 1 equipment item to rent.' });
    }

    let equipmentTotal = 0;
    const verifiedItems = [];

    for (const item of equipmentItems) {
      const eq = Equipment.getById(item.id);
      if (!eq) continue;

      // Ensure equipment belongs to selected turf
      if (eq.turfId !== turfId) {
        return res.status(400).json({
          success: false,
          message: `Item "${eq.name}" is not stocked at ${turf.name}.`
        });
      }

      // Check stock availability for slot
      const remainingStock = Equipment.getAvailableStockForSlot(item.id, date, slotTime);
      const requestedQty = Math.max(1, parseInt(item.quantity || 1, 10));

      if (requestedQty > remainingStock) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for "${eq.name}". Only ${remainingStock} available.`
        });
      }

      const itemCost = eq.pricePerHour * requestedQty;
      equipmentTotal += itemCost;

      verifiedItems.push({
        id: eq.id,
        name: eq.name,
        brand: eq.brand,
        pricePerHour: eq.pricePerHour,
        quantity: requestedQty,
        total: itemCost
      });
    }

    const totalAmount = equipmentTotal;
    let advancePaid = totalAmount;
    let dueAtVenue = 0;

    if (paymentMode === 'PARTIAL') {
      advancePaid = Math.round(totalAmount * 0.3);
      dueAtVenue = totalAmount - advancePaid;
    }

    const user = User.getById(userId) || User.getDefaultUser();

    const booking = Booking.createBooking({
      userId: user.id,
      userName: user.name,
      userPhone: user.phone,
      userEmail: user.email,
      type: 'GEAR_ONLY',
      turfId: turf.id,
      turfName: turf.name,
      turfLocation: turf.location,
      date,
      slotTime,
      turfAmount: 0,
      equipmentAmount: equipmentTotal,
      equipmentItems: verifiedItems,
      totalAmount,
      advancePaid,
      dueAtVenue,
      paymentMode,
      paymentStatus: 'COMPLETED'
    });

    res.status(201).json({
      success: true,
      message: 'Separate equipment rental confirmed!',
      data: booking
    });
  } catch (error) {
    console.error('Error creating gear booking:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/bookings/my-bookings - Fetch user bookings
router.get('/my-bookings', (req, res) => {
  try {
    const userId = req.query.userId || 'user_mumbai_01';
    const bookings = Booking.getByUserId(userId);
    res.json({ success: true, count: bookings.length, data: bookings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/bookings/:id - Single booking
router.get('/:id', (req, res) => {
  try {
    const booking = Booking.getById(req.params.id) || Booking.getByRef(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }
    res.json({ success: true, data: booking });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
