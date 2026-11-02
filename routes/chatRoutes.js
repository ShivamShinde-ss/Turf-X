const express = require('express');
const router = express.Router();
const Turf = require('../models/Turf');
const Equipment = require('../models/Equipment');

// Curated Mumbai Turf sports knowledge base & quick questions
const KNOWLEDGE_BASE = [
  {
    category: 'Bookings & Slots',
    questions: [
      {
        id: 'q_slots_timing',
        question: 'What are the turf slot timings available in Mumbai?',
        answer: 'Turf X offers slots from **6:00 AM in the morning up to 3:00 AM (Late-Night Owl)** across all Mumbai venues. Slots are priced dynamically across 3 tiers: 🌅 Morning Off-Peak, ⚡ Evening Floodlight Peak, and 🌙 Late-Night Owl.'
      },
      {
        id: 'q_slot_locking',
        question: 'How does the 7-minute concurrency slot locking work?',
        answer: 'When you select any time slot on our platform, our backend temporarily locks that slot for **7 minutes (420 seconds)** exclusively for you. A live countdown timer starts in the booking drawer. This prevents double-booking so you can choose gear and pay comfortably!'
      },
      {
        id: 'q_monsoon',
        question: 'Which turfs in Mumbai have Roof Monsoon Covers?',
        answer: 'During Mumbai rains or daytime sun, you can book our roof-covered arenas:\n• **St. Andrews AstroTurf Arena** (Bandra West)\n• **Juhu Box Cricket & Multi-Sport Arena** (Juhu)\n• **Turfside Arena** (Lower Parel)\n• **Smash Pickleball Club** (Powai)\n• **The Arena** (Chembur)'
      }
    ]
  },
  {
    category: 'Equipment Rental',
    questions: [
      {
        id: 'q_gear_renting',
        question: 'Can I rent sports equipment without booking the full turf?',
        answer: 'Yes! Switch to the **"⚽ Rent Gear Only"** mode in the top navbar or click **"🎒 Rent Gear"** on any turf card. You can pick your venue, match date, and hourly slot to reserve pro gear (bats, balls, boots, keeper gloves) independently.'
      },
      {
        id: 'q_turf_specific_gear',
        question: 'Does every Mumbai turf have its own equipment stock?',
        answer: 'Yes, each turf has an isolated inventory tailored to its sports!\n• **Bandra St. Andrews:** Nike Flight Match Balls, Adidas Predator Boots (UK 8-10), Pro GK Gloves, Neon Bibs.\n• **Juhu Box Cricket:** SS English Willow Bats, Heavy Tennis Balls, Automatic Bowling Machine.\n• **Powai Smash Club:** CRBN Carbon Pickleball Paddles, Dura Fast 40+ balls, Court Eyewear.\n• **Colaba Cooperage:** FIFA Pro Match Balls, STATSports GPS Tracking Vests.'
      }
    ]
  },
  {
    category: 'Payments & Splits',
    questions: [
      {
        id: 'q_payment_modes',
        question: 'What payment modes are supported on Turf X?',
        answer: 'We support **5 distinct payment modes**:\n1. ⚡ **UPI Instant Pay:** Real scannable dynamic QR (GPay, PhonePe, Paytm, BHIM, Cred).\n2. 💳 **Cards & NetBanking:** 3D Secure OTP verification.\n3. 👥 **Split-With-Squad:** Interactive slider (2-22 players) with auto-generated WhatsApp payment links.\n4. 🏷️ **Pay 30% Advance:** Pay 30% online now, remaining 70% at the turf counter.\n5. 💰 **Turf X Wallet:** 1-Click pay with 5% bonus Turf Coins cashback.'
      },
      {
        id: 'q_split_squad',
        question: 'How do I split the turf bill with my teammates on WhatsApp?',
        answer: 'In the checkout payment modal, click the **"👥 Split Squad"** tab. Use the slider to select your squad size (e.g. 5 to 14 players). It calculates the exact per-head share and generates a pre-formatted WhatsApp link with payment instructions that you can send to your team group!'
      }
    ]
  },
  {
    category: 'Venues & Locations',
    questions: [
      {
        id: 'q_stations_reach',
        question: 'Which turfs are closest to Mumbai local train / metro stations?',
        answer: 'All our venues are located near transit hubs:\n• **Lower Parel Turfside:** 250m from Lower Parel Station / Monorail\n• **Bandra St. Andrews:** 350m from Bandra Station (W)\n• **Goregaon Kick Off:** 450m from Goregaon Metro / Link Road\n• **Churchgate/Colaba Cooperage:** 5 mins from Churchgate Station (W)\n• **Chembur The Arena:** 300m from Chembur Station / Monorail\n• **Vashi Urban Astro:** 600m from Sanpada / Vashi Station'
      },
      {
        id: 'q_sports_types',
        question: 'What sports can I play across Mumbai turfs?',
        answer: 'We host venues equipped for **Football (5v5 & 7v7 Futsal)**, **Box Cricket (Shock-absorbing matting & bowling cages)**, **USAPA Pickleball (Cushioned acrylic)**, and **Badminton**.'
      }
    ]
  }
];

// GET /api/chat/faq - Get curated questions & answers
router.get('/faq', (req, res) => {
  res.json({
    success: true,
    data: KNOWLEDGE_BASE
  });
});

// POST /api/chat/ask - Interactive assistant query processor
router.post('/ask', (req, res) => {
  try {
    const userQuery = (req.body.query || '').trim().toLowerCase();

    if (!userQuery) {
      return res.status(400).json({ success: false, message: 'Please provide a message or question.' });
    }

    // Check specific question ID first
    if (req.body.questionId) {
      for (const cat of KNOWLEDGE_BASE) {
        const found = cat.questions.find(q => q.id === req.body.questionId);
        if (found) {
          return res.json({
            success: true,
            reply: found.answer,
            matchedCategory: cat.category,
            suggestions: getFollowUpSuggestions(found.id)
          });
        }
      }
    }

    // Dynamic keyword matching
    let reply = '';
    let suggestions = [];

    if (userQuery.includes('turf') || userQuery.includes('ground') || userQuery.includes('venue') || userQuery.includes('where') || userQuery.includes('location')) {
      const allTurfs = Turf.getAll();
      reply = `We have **${allTurfs.length} premier arenas across Mumbai** covering Bandra, Juhu, Lower Parel, Colaba, Goregaon, Powai, Chembur, and Vashi. You can filter them by your preferred Mumbai region directly from the top pills on the homepage!`;
      suggestions = ['Which turfs have Roof Monsoon Covers?', 'Which turfs are closest to train stations?'];
    } else if (userQuery.includes('equipment') || userQuery.includes('gear') || userQuery.includes('bat') || userQuery.includes('ball') || userQuery.includes('boot') || userQuery.includes('rent')) {
      reply = `Yes! Every Mumbai venue has its own dedicated **in-venue gear locker** with match footballs, English willow bats, Astro boots, and gloves. You can rent equipment bundled with your slot or separately via the **"Rent Gear Only"** mode.`;
      suggestions = ['Can I rent equipment without booking the full turf?', 'Does every Mumbai turf have its own equipment stock?'];
    } else if (userQuery.includes('slot') || userQuery.includes('time') || userQuery.includes('timing') || userQuery.includes('hour') || userQuery.includes('night')) {
      reply = `Our slots run **daily from 6:00 AM to 3:00 AM late-night**. When you pick a slot, our system activates a **7-minute concurrency lock** with a live countdown so nobody else can take it while you finalize payment!`;
      suggestions = ['What are the turf slot timings available in Mumbai?', 'How does the 7-minute concurrency slot locking work?'];
    } else if (userQuery.includes('pay') || userQuery.includes('upi') || userQuery.includes('qr') || userQuery.includes('split') || userQuery.includes('cost') || userQuery.includes('price')) {
      reply = `We support **5 payment methods**: Real UPI Instant QR (GPay/PhonePe), Credit/Debit Cards with 3D Secure OTP, Split-With-Squad via WhatsApp, 30% Partial Deposit, and Turf X Wallet credits with 5% cashback.`;
      suggestions = ['What payment modes are supported on Turf X?', 'How do I split the turf bill with my teammates on WhatsApp?'];
    } else if (userQuery.includes('rain') || userQuery.includes('monsoon') || userQuery.includes('cover') || userQuery.includes('weather')) {
      reply = `Mumbai monsoons won't stop the match! We have **5 fully Roof-Covered arenas** (St. Andrews Bandra, Juhu Box, Lower Parel Turfside, Powai Smash, and Chembur The Arena).`;
      suggestions = ['Which turfs in Mumbai have Roof Monsoon Covers?'];
    } else if (userQuery.includes('admin') || userQuery.includes('owner') || userQuery.includes('manager')) {
      reply = `Stadium managers and admins can login via **Admin Portal** (` + '`admin@turfx.mumbai` / `admin123`' + `) to monitor live revenue, update gear stock, edit hourly pricing, and manage match bookings.`;
      suggestions = ['What payment modes are supported on Turf X?'];
    } else {
      reply = `Hello! I'm **Turf X AI Assistant**, your concierge for Mumbai sports turfs & equipment rentals. Ask me about venue locations, 6 AM - 3 AM slots, turf equipment stock, 7-minute slot locks, or split payments!`;
      suggestions = [
        'What are the turf slot timings available in Mumbai?',
        'Can I rent sports equipment without booking the full turf?',
        'What payment modes are supported on Turf X?'
      ];
    }

    res.json({
      success: true,
      reply,
      suggestions
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

function getFollowUpSuggestions(currentId) {
  const allSuggested = [
    'What are the turf slot timings available in Mumbai?',
    'Which turfs in Mumbai have Roof Monsoon Covers?',
    'Can I rent sports equipment without booking the full turf?',
    'How do I split the turf bill with my teammates on WhatsApp?',
    'Which turfs are closest to Mumbai local train / metro stations?'
  ];
  return allSuggested.slice(0, 3);
}

module.exports = router;
