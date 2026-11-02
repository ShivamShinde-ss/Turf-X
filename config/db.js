const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = process.env.DB_PATH || path.join(dataDir, 'turf_x.db');
const db = new DatabaseSync(dbPath);

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS turfs (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    zone TEXT NOT NULL,
    location TEXT NOT NULL,
    nearestStation TEXT NOT NULL,
    sports TEXT NOT NULL,
    surface TEXT NOT NULL,
    monsoonCover TEXT NOT NULL,
    floodlights TEXT NOT NULL,
    rating REAL DEFAULT 4.8,
    reviewsCount INTEGER DEFAULT 120,
    pricePerHour INTEGER NOT NULL,
    morningPrice INTEGER NOT NULL,
    eveningPrice INTEGER NOT NULL,
    nightPrice INTEGER NOT NULL,
    image TEXT NOT NULL,
    amenities TEXT NOT NULL,
    dimensions TEXT NOT NULL,
    openHours TEXT DEFAULT '6:00 AM - 3:00 AM',
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS equipment (
    id TEXT PRIMARY KEY,
    turfId TEXT NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    sport TEXT NOT NULL,
    brand TEXT NOT NULL,
    pricePerHour INTEGER NOT NULL,
    totalStock INTEGER NOT NULL,
    image TEXT NOT NULL,
    description TEXT,
    specs TEXT,
    FOREIGN KEY(turfId) REFERENCES turfs(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS slot_locks (
    id TEXT PRIMARY KEY,
    turfId TEXT NOT NULL,
    date TEXT NOT NULL,
    slotTime TEXT NOT NULL,
    userId TEXT,
    lockedAt INTEGER NOT NULL,
    expiresAt INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id TEXT PRIMARY KEY,
    bookingRef TEXT UNIQUE NOT NULL,
    userId TEXT NOT NULL,
    userName TEXT NOT NULL,
    userPhone TEXT NOT NULL,
    userEmail TEXT NOT NULL,
    type TEXT NOT NULL,
    turfId TEXT NOT NULL,
    turfName TEXT NOT NULL,
    turfLocation TEXT NOT NULL,
    date TEXT NOT NULL,
    slotTime TEXT NOT NULL,
    turfAmount INTEGER DEFAULT 0,
    equipmentAmount INTEGER DEFAULT 0,
    equipmentItems TEXT DEFAULT '[]',
    totalAmount INTEGER NOT NULL,
    advancePaid INTEGER NOT NULL,
    dueAtVenue INTEGER DEFAULT 0,
    paymentMode TEXT NOT NULL,
    paymentStatus TEXT NOT NULL,
    splitDetails TEXT DEFAULT '{}',
    qrData TEXT,
    status TEXT DEFAULT 'CONFIRMED',
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL DEFAULT 'user123',
    role TEXT NOT NULL DEFAULT 'USER',
    walletBalance INTEGER DEFAULT 3200,
    turfCoins INTEGER DEFAULT 160,
    passTier TEXT DEFAULT 'Mumbai Floodlight Pass (Tier 1)',
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS wallet_transactions (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    type TEXT NOT NULL,
    amount INTEGER NOT NULL,
    description TEXT NOT NULL,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS match_lobbies (
    id TEXT PRIMARY KEY,
    creatorName TEXT NOT NULL,
    creatorPhone TEXT NOT NULL,
    turfId TEXT NOT NULL,
    turfName TEXT NOT NULL,
    sport TEXT NOT NULL,
    date TEXT NOT NULL,
    slotTime TEXT NOT NULL,
    playersNeeded INTEGER NOT NULL,
    playersJoined INTEGER DEFAULT 1,
    skillLevel TEXT NOT NULL,
    sharePerPlayer INTEGER NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'OPEN',
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

// Safe migrations for password and role
try { db.exec("ALTER TABLE users ADD COLUMN password TEXT DEFAULT 'user123'"); } catch (e) {}
try { db.exec("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'USER'"); } catch (e) {}

// Ensure Admin and Default Player always exist in database
try {
  const adminExists = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@turfx.mumbai');
  if (!adminExists) {
    db.prepare(`
      INSERT INTO users (id, name, phone, email, password, role, walletBalance, turfCoins, passTier)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('admin_mumbai_01', 'Stadium Operations Admin', '+91 98200 00001', 'admin@turfx.mumbai', 'admin123', 'ADMIN', 50000, 1000, 'Master Admin Pass');
  }

  const userExists = db.prepare('SELECT id FROM users WHERE email = ?').get('aditya@mumbai.in');
  if (!userExists) {
    db.prepare(`
      INSERT INTO users (id, name, phone, email, password, role, walletBalance, turfCoins, passTier)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('user_aditya_02', 'Aditya Sharma', '+91 98201 44520', 'aditya@mumbai.in', 'user123', 'USER', 3200, 160, 'Mumbai Floodlight Pass (Tier 1)');
  }
} catch (e) {}

module.exports = db;
