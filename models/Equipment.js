const db = require('../config/db');

class Equipment {
  static getByTurfId(turfId, filters = {}) {
    let query = 'SELECT * FROM equipment WHERE turfId = ?';
    const params = [turfId];

    if (filters.category && filters.category !== 'All') {
      query += ' AND category = ?';
      params.push(filters.category);
    }

    if (filters.sport && filters.sport !== 'All') {
      query += ' AND (sport = ? OR sport = "All Sports")';
      params.push(filters.sport);
    }

    query += ' ORDER BY pricePerHour ASC';

    return db.prepare(query).all(...params);
  }

  static getById(id) {
    return db.prepare('SELECT * FROM equipment WHERE id = ?').get(id);
  }

  static create(data) {
    const stmt = db.prepare(`
      INSERT INTO equipment (
        id, turfId, name, category, sport, brand, pricePerHour,
        totalStock, image, description, specs
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      data.id,
      data.turfId,
      data.name,
      data.category,
      data.sport,
      data.brand,
      data.pricePerHour,
      data.totalStock,
      data.image,
      data.description || '',
      data.specs || ''
    );

    return Equipment.getById(data.id);
  }

  static count() {
    const row = db.prepare('SELECT COUNT(*) as count FROM equipment').get();
    return row ? row.count : 0;
  }

  // Live stock validation: totalStock - alreadyBookedForSlot
  static getAvailableStockForSlot(equipmentId, date, slotTime) {
    const item = Equipment.getById(equipmentId);
    if (!item) return 0;

    // Find all confirmed bookings for this date and slotTime
    const bookings = db.prepare(`
      SELECT equipmentItems FROM bookings 
      WHERE date = ? AND slotTime = ? AND status = 'CONFIRMED'
    `).all(date, slotTime);

    let bookedQuantity = 0;
    for (const b of bookings) {
      try {
        const items = JSON.parse(b.equipmentItems || '[]');
        const found = items.find(i => i.id === equipmentId);
        if (found) {
          bookedQuantity += (found.quantity || 1);
        }
      } catch (e) {
        // ignore parse error
      }
    }

    const remaining = Math.max(0, item.totalStock - bookedQuantity);
    return remaining;
  }
}

module.exports = Equipment;
