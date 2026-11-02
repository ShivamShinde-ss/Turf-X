const db = require('../config/db');

class Turf {
  static getAll(filters = {}) {
    let query = 'SELECT * FROM turfs WHERE 1=1';
    const params = [];

    if (filters.zone && filters.zone !== 'All Mumbai') {
      query += ' AND zone = ?';
      params.push(filters.zone);
    }

    if (filters.search) {
      query += ' AND (name LIKE ? OR location LIKE ? OR nearestStation LIKE ?)';
      const term = `%${filters.search}%`;
      params.push(term, term, term);
    }

    if (filters.monsoonCover && filters.monsoonCover !== 'All') {
      query += ' AND monsoonCover = ?';
      params.push(filters.monsoonCover);
    }

    query += ' ORDER BY rating DESC';

    const rows = db.prepare(query).all(...params);
    return rows.map(Turf.format);
  }

  static getById(id) {
    const row = db.prepare('SELECT * FROM turfs WHERE id = ?').get(id);
    return row ? Turf.format(row) : null;
  }

  static getBySlug(slug) {
    const row = db.prepare('SELECT * FROM turfs WHERE slug = ?').get(slug);
    return row ? Turf.format(row) : null;
  }

  static create(data) {
    const stmt = db.prepare(`
      INSERT INTO turfs (
        id, name, slug, zone, location, nearestStation, sports,
        surface, monsoonCover, floodlights, rating, reviewsCount,
        pricePerHour, morningPrice, eveningPrice, nightPrice,
        image, amenities, dimensions, openHours
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      data.id,
      data.name,
      data.slug,
      data.zone,
      data.location,
      data.nearestStation,
      JSON.stringify(data.sports || []),
      data.surface,
      data.monsoonCover,
      data.floodlights,
      data.rating || 4.8,
      data.reviewsCount || 100,
      data.pricePerHour,
      data.morningPrice,
      data.eveningPrice,
      data.nightPrice,
      data.image,
      JSON.stringify(data.amenities || []),
      data.dimensions || '5v5 & 7v7 Ready',
      data.openHours || '6:00 AM - 3:00 AM'
    );

    return Turf.getById(data.id);
  }

  static count() {
    const row = db.prepare('SELECT COUNT(*) as count FROM turfs').get();
    return row ? row.count : 0;
  }

  static format(row) {
    return {
      ...row,
      sports: JSON.parse(row.sports || '[]'),
      amenities: JSON.parse(row.amenities || '[]')
    };
  }
}

module.exports = Turf;
