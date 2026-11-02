const express = require('express');
const router = express.Router();
const db = require('../config/db');
const Turf = require('../models/Turf');
const Equipment = require('../models/Equipment');
const Booking = require('../models/Booking');
const User = require('../models/User');

// GET /api/admin/stats - Revenue & operations overview
router.get('/stats', (req, res) => {
  try {
    const totalBookings = db.prepare('SELECT COUNT(*) as count FROM bookings').get().count;
    const revenueRow = db.prepare('SELECT SUM(totalAmount) as total, SUM(advancePaid) as online, SUM(dueAtVenue) as due FROM bookings WHERE status != "CANCELLED"').get();
    const turfsCount = db.prepare('SELECT COUNT(*) as count FROM turfs').get().count;
    const equipmentCount = db.prepare('SELECT COUNT(*) as count FROM equipment').get().count;
    const usersCount = db.prepare('SELECT COUNT(*) as count FROM users WHERE role = "USER"').get().count;

    res.json({
      success: true,
      stats: {
        totalRevenue: revenueRow.total || 0,
        onlinePaid: revenueRow.online || 0,
        venueDue: revenueRow.due || 0,
        totalBookings,
        turfsCount,
        equipmentCount,
        usersCount
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/admin/bookings - All bookings across Mumbai
router.get('/bookings', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM bookings ORDER BY createdAt DESC').all();
    const formatted = rows.map(Booking.format);
    res.json({ success: true, count: formatted.length, data: formatted });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/admin/equipment/:id - Update equipment stock & hourly rate
router.put('/equipment/:id', (req, res) => {
  try {
    const { totalStock, pricePerHour } = req.body;
    const id = req.params.id;

    const item = Equipment.getById(id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Equipment not found' });
    }

    const newStock = totalStock !== undefined ? parseInt(totalStock, 10) : item.totalStock;
    const newPrice = pricePerHour !== undefined ? parseInt(pricePerHour, 10) : item.pricePerHour;

    db.prepare('UPDATE equipment SET totalStock = ?, pricePerHour = ? WHERE id = ?')
      .run(newStock, newPrice, id);

    res.json({
      success: true,
      message: `Updated "${item.name}": Stock = ${newStock}, Price = ₹${newPrice}/hr.`,
      data: Equipment.getById(id)
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/admin/bookings/:id - Cancel a booking
router.delete('/bookings/:id', (req, res) => {
  try {
    const id = req.params.id;
    const booking = Booking.getById(id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    db.prepare('UPDATE bookings SET status = "CANCELLED" WHERE id = ?').run(id);

    res.json({
      success: true,
      message: `Booking ${booking.bookingRef} has been cancelled.`
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/admin/turfs/:id/image - Update turf picture
router.put('/turfs/:id/image', (req, res) => {
  try {
    const { image } = req.body;
    const id = req.params.id;

    if (!image) {
      return res.status(400).json({ success: false, message: 'Image URL or base64 data required' });
    }

    const turf = Turf.getById(id);
    if (!turf) {
      return res.status(404).json({ success: false, message: 'Turf not found' });
    }

    db.prepare('UPDATE turfs SET image = ? WHERE id = ?').run(image, id);

    res.json({
      success: true,
      message: `Image updated for ${turf.name}!`,
      data: Turf.getById(id)
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/admin/users
router.get('/users', (req, res) => {
  try {
    const users = User.getAllUsers();
    res.json({ success: true, count: users.length, data: users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
