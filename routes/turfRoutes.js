const express = require('express');
const router = express.Router();
const Turf = require('../models/Turf');
const Equipment = require('../models/Equipment');
const Booking = require('../models/Booking');

// GET /api/turfs - Discover turfs with Mumbai zone & sport filtering
router.get('/', (req, res) => {
  try {
    const { zone, sport, search, monsoonCover } = req.query;
    let turfs = Turf.getAll({ zone, search, monsoonCover });

    // Filter by sport if specified
    if (sport && sport !== 'All Sports' && sport !== 'All') {
      turfs = turfs.filter(t => t.sports.includes(sport));
    }

    // Attach per-turf equipment inventory preview to each turf
    const enrichedTurfs = turfs.map(t => {
      const gear = Equipment.getByTurfId(t.id);
      return {
        ...t,
        equipmentPreview: gear.slice(0, 3),
        totalEquipmentCount: gear.length
      };
    });

    res.json({
      success: true,
      count: enrichedTurfs.length,
      data: enrichedTurfs
    });
  } catch (error) {
    console.error('Error fetching turfs:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/turfs/database-overview - In-app database inspector
router.get('/database-overview', (req, res) => {
  try {
    const db = require('../config/db');
    const turfs = db.prepare('SELECT id, name, zone, surface, pricePerHour FROM turfs').all();
    const equipment = db.prepare('SELECT id, turfId, name, brand, pricePerHour, totalStock FROM equipment').all();
    const bookings = db.prepare('SELECT id, bookingRef, turfName, date, slotTime, totalAmount, paymentMode, status FROM bookings').all();
    const users = db.prepare('SELECT id, name, phone, walletBalance, turfCoins FROM users').all();
    const locks = db.prepare('SELECT * FROM slot_locks').all();

    res.json({
      success: true,
      tables: {
        turfs: { count: turfs.length, rows: turfs },
        equipment: { count: equipment.length, rows: equipment },
        bookings: { count: bookings.length, rows: bookings },
        users: { count: users.length, rows: users },
        slot_locks: { count: locks.length, rows: locks }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/turfs/zones - Mumbai zones list
router.get('/zones', (req, res) => {
  try {
    const zones = [
      'All Mumbai',
      'South Mumbai (Colaba-Worli)',
      'Bandra & Khar',
      'Andheri & Juhu',
      'Goregaon-Borivali',
      'Central Suburbs & Powai',
      'Thane & Navi Mumbai'
    ];
    res.json({ success: true, zones });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/turfs/:id - Turf details
router.get('/:id', (req, res) => {
  try {
    const turf = Turf.getById(req.params.id) || Turf.getBySlug(req.params.id);
    if (!turf) {
      return res.status(404).json({ success: false, message: 'Turf not found' });
    }
    res.json({ success: true, data: turf });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/turfs/:id/slots - Dynamic slot availability (6 AM to 3 AM)
router.get('/:id/slots', (req, res) => {
  try {
    const turfId = req.params.id;
    const date = req.query.date || new Date().toISOString().split('T')[0];
    const userId = req.query.userId || 'user_mumbai_01';

    const turf = Turf.getById(turfId);
    if (!turf) {
      return res.status(404).json({ success: false, message: 'Turf not found' });
    }

    const slots = Booking.getSlotAvailability(turfId, date, userId);

    // Attach hourly dynamic rate based on slot tier
    const enrichedSlots = slots.map(slot => {
      let price = turf.pricePerHour;
      if (slot.tier === 'MORNING') price = turf.morningPrice;
      else if (slot.tier === 'EVENING') price = turf.eveningPrice;
      else if (slot.tier === 'NIGHT') price = turf.nightPrice;

      return {
        ...slot,
        price
      };
    });

    res.json({
      success: true,
      turfId,
      date,
      slots: enrichedSlots
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/turfs/:id/equipment - Turf-specific equipment inventory
router.get('/:id/equipment', (req, res) => {
  try {
    const turfId = req.params.id;
    const { category, sport, date, slotTime } = req.query;

    const turf = Turf.getById(turfId);
    if (!turf) {
      return res.status(404).json({ success: false, message: 'Turf not found' });
    }

    const equipmentList = Equipment.getByTurfId(turfId, { category, sport });

    // Calculate real-time available stock for the selected date & slotTime
    const enrichedEquipment = equipmentList.map(item => {
      let availableStock = item.totalStock;
      if (date && slotTime) {
        availableStock = Equipment.getAvailableStockForSlot(item.id, date, slotTime);
      }
      return {
        ...item,
        availableStock,
        isOutOfStock: availableStock <= 0
      };
    });

    res.json({
      success: true,
      turfId,
      turfName: turf.name,
      count: enrichedEquipment.length,
      data: enrichedEquipment
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
