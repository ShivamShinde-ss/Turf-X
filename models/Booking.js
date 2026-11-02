const db = require('../config/db');
const { randomUUID } = require('crypto');

class Booking {
  // Concurrency Slot Locking (Locks for 7 minutes = 420,000 ms)
  static lockSlot(turfId, date, slotTime, userId = 'user_mumbai_01') {
    const now = Date.now();
    const lockDuration = 7 * 60 * 1000; // 7 minutes
    const expiresAt = now + lockDuration;

    // First, clear expired locks across the system
    Booking.cleanExpiredLocks();

    // Check if slot already booked by confirmed booking
    const existingBooking = db.prepare(`
      SELECT id FROM bookings 
      WHERE turfId = ? AND date = ? AND slotTime = ? AND status = 'CONFIRMED'
    `).get(turfId, date, slotTime);

    if (existingBooking) {
      return { success: false, reason: 'SLOT_ALREADY_BOOKED', message: 'This slot is already booked.' };
    }

    // Check if slot is actively locked by someone else
    const activeLock = db.prepare(`
      SELECT * FROM slot_locks 
      WHERE turfId = ? AND date = ? AND slotTime = ? AND expiresAt > ?
    `).get(turfId, date, slotTime, now);

    if (activeLock) {
      if (activeLock.userId === userId) {
        // User already holds lock; refresh it
        db.prepare('UPDATE slot_locks SET expiresAt = ? WHERE id = ?').run(expiresAt, activeLock.id);
        return {
          success: true,
          lockId: activeLock.id,
          expiresAt,
          remainingSeconds: Math.floor((expiresAt - now) / 1000)
        };
      } else {
        const remainingSeconds = Math.max(1, Math.floor((activeLock.expiresAt - now) / 1000));
        return {
          success: false,
          reason: 'SLOT_LOCKED_BY_ANOTHER',
          message: `Slot is temporarily locked by another player. Try again in ${remainingSeconds}s.`,
          remainingSeconds
        };
      }
    }

    // Create new lock
    const lockId = 'lock_' + randomUUID().substring(0, 8);
    db.prepare(`
      INSERT INTO slot_locks (id, turfId, date, slotTime, userId, lockedAt, expiresAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(lockId, turfId, date, slotTime, userId, now, expiresAt);

    return {
      success: true,
      lockId,
      expiresAt,
      remainingSeconds: 420
    };
  }

  static unlockSlot(lockId) {
    db.prepare('DELETE FROM slot_locks WHERE id = ?').run(lockId);
  }

  static cleanExpiredLocks() {
    const now = Date.now();
    db.prepare('DELETE FROM slot_locks WHERE expiresAt <= ?').run(now);
  }

  // Get availability for all slots of a turf on a given date
  static getSlotAvailability(turfId, date, userId = 'user_mumbai_01') {
    Booking.cleanExpiredLocks();
    const now = Date.now();

    // Standard hours: 6:00 AM to 3:00 AM (Next Day)
    const slotDefinitions = [
      { time: '06:00 - 07:00', tier: 'MORNING', label: 'Morning Off-Peak' },
      { time: '07:00 - 08:00', tier: 'MORNING', label: 'Morning Off-Peak' },
      { time: '08:00 - 09:00', tier: 'MORNING', label: 'Morning Off-Peak' },
      { time: '09:00 - 10:00', tier: 'MORNING', label: 'Morning Off-Peak' },
      { time: '10:00 - 11:00', tier: 'MORNING', label: 'Morning Off-Peak' },
      { time: '11:00 - 12:00', tier: 'MORNING', label: 'Morning Off-Peak' },
      { time: '12:00 - 13:00', tier: 'MORNING', label: 'Morning Off-Peak' },
      { time: '13:00 - 14:00', tier: 'MORNING', label: 'Morning Off-Peak' },
      { time: '14:00 - 15:00', tier: 'MORNING', label: 'Morning Off-Peak' },
      { time: '15:00 - 16:00', tier: 'MORNING', label: 'Morning Off-Peak' },
      { time: '16:00 - 17:00', tier: 'EVENING', label: 'Floodlight Peak' },
      { time: '17:00 - 18:00', tier: 'EVENING', label: 'Floodlight Peak' },
      { time: '18:00 - 19:00', tier: 'EVENING', label: 'Floodlight Peak' },
      { time: '19:00 - 20:00', tier: 'EVENING', label: 'Floodlight Peak' },
      { time: '20:00 - 21:00', tier: 'EVENING', label: 'Floodlight Peak' },
      { time: '21:00 - 22:00', tier: 'EVENING', label: 'Floodlight Peak' },
      { time: '22:00 - 23:00', tier: 'EVENING', label: 'Floodlight Peak' },
      { time: '23:00 - 00:00', tier: 'NIGHT', label: 'Late-Night Owl' },
      { time: '00:00 - 01:00', tier: 'NIGHT', label: 'Late-Night Owl' },
      { time: '01:00 - 02:00', tier: 'NIGHT', label: 'Late-Night Owl' },
      { time: '02:00 - 03:00', tier: 'NIGHT', label: 'Late-Night Owl' }
    ];

    const confirmedBookings = db.prepare(`
      SELECT slotTime FROM bookings 
      WHERE turfId = ? AND date = ? AND status = 'CONFIRMED'
    `).all(turfId, date).map(r => r.slotTime);

    const activeLocks = db.prepare(`
      SELECT slotTime, userId, expiresAt FROM slot_locks 
      WHERE turfId = ? AND date = ? AND expiresAt > ?
    `).all(turfId, date, now);

    const lockMap = {};
    for (const lock of activeLocks) {
      lockMap[lock.slotTime] = lock;
    }

    return slotDefinitions.map(slot => {
      let status = 'AVAILABLE';
      let lockedBySelf = false;
      let remainingSeconds = 0;

      if (confirmedBookings.includes(slot.time)) {
        status = 'BOOKED';
      } else if (lockMap[slot.time]) {
        if (lockMap[slot.time].userId === userId) {
          status = 'LOCKED_BY_YOU';
          lockedBySelf = true;
          remainingSeconds = Math.max(1, Math.floor((lockMap[slot.time].expiresAt - now) / 1000));
        } else {
          status = 'LOCKED';
          remainingSeconds = Math.max(1, Math.floor((lockMap[slot.time].expiresAt - now) / 1000));
        }
      }

      return {
        slotTime: slot.time,
        tier: slot.tier,
        tierLabel: slot.label,
        status,
        lockedBySelf,
        remainingSeconds
      };
    });
  }

  static createBooking(data) {
    const bookingId = 'TXB-' + Math.random().toString(36).substring(2, 9).toUpperCase();
    const bookingRef = 'TXM-' + Math.floor(1000 + Math.random() * 9000);

    const stmt = db.prepare(`
      INSERT INTO bookings (
        id, bookingRef, userId, userName, userPhone, userEmail,
        type, turfId, turfName, turfLocation, date, slotTime,
        turfAmount, equipmentAmount, equipmentItems, totalAmount,
        advancePaid, dueAtVenue, paymentMode, paymentStatus,
        splitDetails, qrData, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      bookingId,
      bookingRef,
      data.userId || 'user_mumbai_01',
      data.userName || 'Aditya Sharma',
      data.userPhone || '+91 98201 44520',
      data.userEmail || 'aditya.sharma@mumbai.in',
      data.type, // 'TURF_AND_GEAR' or 'GEAR_ONLY'
      data.turfId,
      data.turfName,
      data.turfLocation,
      data.date,
      data.slotTime,
      data.turfAmount || 0,
      data.equipmentAmount || 0,
      JSON.stringify(data.equipmentItems || []),
      data.totalAmount,
      data.advancePaid,
      data.dueAtVenue || 0,
      data.paymentMode,
      data.paymentStatus || 'COMPLETED',
      JSON.stringify(data.splitDetails || {}),
      data.qrData || null,
      'CONFIRMED'
    );

    // Release any lock on this slot
    if (data.turfId && data.date && data.slotTime) {
      db.prepare(`
        DELETE FROM slot_locks 
        WHERE turfId = ? AND date = ? AND slotTime = ?
      `).run(data.turfId, data.date, data.slotTime);
    }

    return Booking.getById(bookingId);
  }

  static getById(id) {
    const row = db.prepare('SELECT * FROM bookings WHERE id = ?').get(id);
    return row ? Booking.format(row) : null;
  }

  static getByRef(ref) {
    const row = db.prepare('SELECT * FROM bookings WHERE bookingRef = ?').get(ref);
    return row ? Booking.format(row) : null;
  }

  static getByUserId(userId = 'user_mumbai_01') {
    const rows = db.prepare('SELECT * FROM bookings WHERE userId = ? ORDER BY createdAt DESC').all(userId);
    return rows.map(Booking.format);
  }

  static format(row) {
    return {
      ...row,
      equipmentItems: JSON.parse(row.equipmentItems || '[]'),
      splitDetails: JSON.parse(row.splitDetails || '{}')
    };
  }
}

module.exports = Booking;
