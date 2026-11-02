const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { randomUUID } = require('crypto');

// Seed default Mumbai player lobbies if table is empty
function seedLobbiesIfEmpty() {
  try {
    const count = db.prepare('SELECT COUNT(*) as count FROM match_lobbies').get().count;
    if (count === 0) {
      const defaultLobbies = [
        {
          id: 'lobby_bandra_futsal',
          creatorName: 'Aman Merchant',
          creatorPhone: '+91 98201 55670',
          turfId: 'turf_bandra_standrews',
          turfName: 'St. Andrews AstroTurf (Bandra West)',
          sport: 'Football',
          date: 'Tonight',
          slotTime: '21:00 - 22:00',
          playersNeeded: 2,
          playersJoined: 8,
          skillLevel: 'Intermediate / Fast',
          sharePerPlayer: 220,
          description: '5v5 intense match! Need 1 GK and 1 solid midfielder. Bibs and match ball arranged.'
        },
        {
          id: 'lobby_juhu_cricket',
          creatorName: 'Karan Shah',
          creatorPhone: '+91 98332 44109',
          turfId: 'turf_juhu_box',
          turfName: 'Juhu Box Cricket Arena',
          sport: 'Box Cricket',
          date: 'Tomorrow Night',
          slotTime: '20:00 - 21:00',
          playersNeeded: 3,
          playersJoined: 9,
          skillLevel: 'All Welcome / Weekend Smash',
          sharePerPlayer: 180,
          description: 'Box cricket 6 overs match. 3 spots open for batsmen/all-rounders.'
        },
        {
          id: 'lobby_powai_pickle',
          creatorName: 'Sneha Deshmukh',
          creatorPhone: '+91 98190 77312',
          turfId: 'turf_powai_smash',
          turfName: 'Smash Club (Powai)',
          sport: 'Pickleball',
          date: 'Tomorrow Evening',
          slotTime: '18:00 - 19:00',
          playersNeeded: 1,
          playersJoined: 3,
          skillLevel: 'Beginner / Intermediate',
          sharePerPlayer: 160,
          description: 'Doubles pickleball match! We have spare CRBN carbon paddles. Need 1 player to complete team.'
        }
      ];

      const stmt = db.prepare(`
        INSERT INTO match_lobbies (
          id, creatorName, creatorPhone, turfId, turfName, sport,
          date, slotTime, playersNeeded, playersJoined, skillLevel,
          sharePerPlayer, description, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'OPEN')
      `);

      for (const l of defaultLobbies) {
        stmt.run(
          l.id, l.creatorName, l.creatorPhone, l.turfId, l.turfName,
          l.sport, l.date, l.slotTime, l.playersNeeded, l.playersJoined,
          l.skillLevel, l.sharePerPlayer, l.description
        );
      }
    }
  } catch (e) {
    console.warn('Lobby seed note:', e.message);
  }
}

seedLobbiesIfEmpty();

// GET /api/features/lobbies - Get active matchmaking lobbies
router.get('/lobbies', (req, res) => {
  try {
    seedLobbiesIfEmpty();
    const rows = db.prepare('SELECT * FROM match_lobbies WHERE status = "OPEN" ORDER BY createdAt DESC').all();
    res.json({ success: true, count: rows.length, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/features/lobbies - Create a squad matchmaking lobby
router.post('/lobbies', (req, res) => {
  try {
    const {
      creatorName,
      creatorPhone,
      turfId,
      turfName,
      sport,
      date,
      slotTime,
      playersNeeded,
      skillLevel,
      sharePerPlayer,
      description
    } = req.body;

    if (!creatorName || !turfName || !sport || !playersNeeded) {
      return res.status(400).json({ success: false, message: 'Please fill all required lobby fields.' });
    }

    const id = 'lobby_' + randomUUID().substring(0, 8);
    db.prepare(`
      INSERT INTO match_lobbies (
        id, creatorName, creatorPhone, turfId, turfName, sport,
        date, slotTime, playersNeeded, playersJoined, skillLevel,
        sharePerPlayer, description, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, 'OPEN')
    `).run(
      id,
      creatorName,
      creatorPhone || '+91 98000 00000',
      turfId || 'custom_venue',
      turfName,
      sport,
      date || 'Tonight',
      slotTime || '20:00 - 21:00',
      parseInt(playersNeeded, 10),
      skillLevel || 'All Welcome',
      parseInt(sharePerPlayer, 10) || 200,
      description || 'Looking for passionate players to join our game!'
    );

    const created = db.prepare('SELECT * FROM match_lobbies WHERE id = ?').get(id);
    res.status(201).json({ success: true, message: 'Match Lobby Created!', data: created });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/features/lobbies/:id/join - Join a match lobby
router.post('/lobbies/:id/join', (req, res) => {
  try {
    const lobby = db.prepare('SELECT * FROM match_lobbies WHERE id = ?').get(req.params.id);
    if (!lobby) {
      return res.status(404).json({ success: false, message: 'Lobby not found.' });
    }

    if (lobby.playersNeeded <= 1) {
      db.prepare('UPDATE match_lobbies SET playersJoined = playersJoined + 1, playersNeeded = 0, status = "FULL" WHERE id = ?').run(lobby.id);
    } else {
      db.prepare('UPDATE match_lobbies SET playersJoined = playersJoined + 1, playersNeeded = playersNeeded - 1 WHERE id = ?').run(lobby.id);
    }

    const updated = db.prepare('SELECT * FROM match_lobbies WHERE id = ?').get(lobby.id);
    res.json({
      success: true,
      message: `You joined ${lobby.creatorName}'s match at ${lobby.turfName}! WhatsApp group contact shared.`,
      data: updated
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
