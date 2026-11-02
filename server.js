require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const turfRoutes = require('./routes/turfRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const chatRoutes = require('./routes/chatRoutes');
const featureRoutes = require('./routes/featureRoutes');
const Turf = require('./models/Turf');
const User = require('./models/User');
const seedDatabase = require('./seed/mumbaiSeed');

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend from public folder
app.use(express.static(path.join(__dirname, 'public')));

// Auto-seed if database is empty on start
try {
  const turfCount = Turf.count();
  if (turfCount === 0) {
    console.log('⚡ No turfs found in database. Running automated Mumbai seed script...');
    seedDatabase();
  } else {
    console.log(`🏟️  Database ready with ${turfCount} Mumbai Turfs.`);
  }
} catch (err) {
  console.error('Error checking turf count, running seed:', err.message);
  seedDatabase();
}

// RESTful API Routes
app.use('/api/turfs', turfRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/features', featureRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    app: 'Turf X (Mumbai Edition)',
    timestamp: new Date().toISOString(),
    city: 'Mumbai, Maharashtra',
    zonesCovered: 7,
    weather: {
      temperature: '29°C',
      condition: 'Clear Night Stadium Lights',
      humidity: '82%',
      monsoonStatus: 'Cover Advised'
    }
  });
});

// Single-Page Application Fallback
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Express server on primary and secondary ports (3000 and 4000) so both URLs work
const PRIMARY_PORT = process.env.PORT || 3000;
const SECONDARY_PORT = PRIMARY_PORT == 3000 ? 4000 : 3000;

const server = app.listen(PRIMARY_PORT, '0.0.0.0', () => {
  console.log(`\n======================================================`);
  console.log(`⚡ TURF X — MUMBAI EDITION (STADIUM LIGHTS AT NIGHT)`);
  console.log(`🏟️  Server running at: http://localhost:${PRIMARY_PORT}`);
  console.log(`🌆  Also listening on: http://localhost:${SECONDARY_PORT}`);
  console.log(`======================================================\n`);
});

try {
  const http = require('http');
  const secondaryServer = http.createServer(app);
  secondaryServer.listen(SECONDARY_PORT, '0.0.0.0').on('error', (err) => {
    // Port might already be in use, ignore
  });
} catch (e) {}

module.exports = app;
