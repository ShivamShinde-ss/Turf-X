const db = require('../config/db');
const Turf = require('../models/Turf');
const Equipment = require('../models/Equipment');
const Booking = require('../models/Booking');
const User = require('../models/User');

function seedDatabase() {
  console.log('⚡ Seeding Turf X (Mumbai Edition) Database...');

  // Clear existing data
  db.exec(`
    DELETE FROM slot_locks;
    DELETE FROM bookings;
    DELETE FROM equipment;
    DELETE FROM turfs;
    DELETE FROM wallet_transactions;
    DELETE FROM users;
  `);

  // 1. Seed Mumbai Turfs (8 Iconic Venues across all zones)
  const turfs = [
    {
      id: 'turf_bandra_standrews',
      name: 'St. Andrews AstroTurf Arena',
      slug: 'st-andrews-turf-bandra',
      zone: 'Bandra & Khar',
      location: 'St. Dominic Road, Near Bandra Talao, Bandra West, Mumbai 400050',
      nearestStation: '350m from Bandra Station (W)',
      sports: ['Football', 'Box Cricket'],
      surface: 'FIFA Pro Certified AstroTurf (45mm Monofilament)',
      monsoonCover: 'Roof Covered',
      floodlights: '400W Philips LED Sports Matrix • Active',
      rating: 4.9,
      reviewsCount: 428,
      pricePerHour: 1800,
      morningPrice: 1200,
      eveningPrice: 2200,
      nightPrice: 1800,
      image: 'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?auto=format&fit=crop&w=1200&q=80',
      amenities: ['Dugout AC Lounge', 'Pro Locker Rooms', 'Valet Parking', 'Video Replay Cam', 'Hydro Station'],
      dimensions: '5v5 & 7v7 Ready (110ft x 70ft)',
      openHours: '6:00 AM - 3:00 AM'
    },
    {
      id: 'turf_juhu_box',
      name: 'Juhu Box Cricket & Multi-Sport Arena',
      slug: 'juhu-box-cricket-arena',
      zone: 'Andheri & Juhu',
      location: 'VM Road, Near J.W. Marriott, Juhu, Mumbai 400049',
      nearestStation: '800m from D.N. Nagar Metro / Vile Parle Station',
      sports: ['Box Cricket', 'Football'],
      surface: 'Heavy-Duty Shock-Absorbing Cricket Matting',
      monsoonCover: 'Roof Covered',
      floodlights: 'High-Glare Shielded LED 360° Grid',
      rating: 4.8,
      reviewsCount: 312,
      pricePerHour: 1600,
      morningPrice: 1100,
      eveningPrice: 2000,
      nightPrice: 1600,
      image: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=1200&q=80',
      amenities: ['Electronic Scoreboard', 'Automatic Bowling Cage', 'Speed Gun', 'Refreshment Dugout', 'High Netting'],
      dimensions: 'Box Cricket Pro (90ft x 55ft)',
      openHours: '6:00 AM - 3:00 AM'
    },
    {
      id: 'turf_lowerparel_turfside',
      name: 'Turfside Arena (Lower Parel)',
      slug: 'turfside-arena-lower-parel',
      zone: 'South Mumbai (Colaba-Worli)',
      location: 'Mathuradas Mill Compound, Senapati Bapat Marg, Lower Parel, Mumbai 400013',
      nearestStation: '250m from Lower Parel Station / Monorail',
      sports: ['Football', 'Box Cricket'],
      surface: 'Hybrid Cushion AstroTurf',
      monsoonCover: 'Roof Covered',
      floodlights: '500W Dynamic Stadium LEDs',
      rating: 4.9,
      reviewsCount: 540,
      pricePerHour: 2000,
      morningPrice: 1400,
      eveningPrice: 2600,
      nightPrice: 2200,
      image: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1200&q=80',
      amenities: ['Rooftop Cafe', 'Shower Facilities', 'Sound System', 'Valet Parking', 'First Aid Desk'],
      dimensions: '5v5 Futsal (100ft x 65ft)',
      openHours: '6:00 AM - 3:00 AM'
    },
    {
      id: 'turf_colaba_cooperage',
      name: 'Cooperage Football Turf Park',
      slug: 'cooperage-turf-park-colaba',
      zone: 'South Mumbai (Colaba-Worli)',
      location: 'Maharshi Karve Road, Churchgate / Colaba, Mumbai 400021',
      nearestStation: '5 mins from Churchgate Station (W)',
      sports: ['Football'],
      surface: 'FIFA Quality Pro Turf',
      monsoonCover: 'Open-Air',
      floodlights: 'Broadcast-Grade High Mast Stadium Lights',
      rating: 4.9,
      reviewsCount: 684,
      pricePerHour: 2200,
      morningPrice: 1500,
      eveningPrice: 2800,
      nightPrice: 2400,
      image: 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&w=1200&q=80',
      amenities: ['Grandstand Seating', 'Changing Suites', 'Physio Room', 'Pro Dugouts', 'Cafeteria'],
      dimensions: 'Full 7v7 (130ft x 85ft)',
      openHours: '6:00 AM - 3:00 AM'
    },
    {
      id: 'turf_goregaon_kickoff',
      name: 'Kick Off Astro Park (Goregaon West)',
      slug: 'kick-off-astro-park-goregaon',
      zone: 'Goregaon-Borivali',
      location: 'Link Road, Near Inorbit Mall, Goregaon West, Mumbai 400104',
      nearestStation: '450m from Goregaon Metro / Link Road',
      sports: ['Football', 'Box Cricket'],
      surface: 'Triple-Density Rubber Infill Turf',
      monsoonCover: 'Open-Air',
      floodlights: '350W Crystal White LEDs',
      rating: 4.7,
      reviewsCount: 298,
      pricePerHour: 1500,
      morningPrice: 1000,
      eveningPrice: 1800,
      nightPrice: 1500,
      image: 'https://images.unsplash.com/photo-1551958219-acbc608c6377?auto=format&fit=crop&w=1200&q=80',
      amenities: ['High-Tension Netting', 'Perimeter Benches', 'Energy Drink Kiosk', 'Parking Bay'],
      dimensions: '5v5 & Cricket (100ft x 60ft)',
      openHours: '6:00 AM - 3:00 AM'
    },
    {
      id: 'turf_powai_smash',
      name: 'Smash Pickleball & Futsal Club (Powai)',
      slug: 'smash-pickleball-futsal-powai',
      zone: 'Central Suburbs & Powai',
      location: 'Hiranandani Business Park, Near Galleria, Powai, Mumbai 400076',
      nearestStation: '8 mins from Kanjurmarg Station / Saki Naka Metro',
      sports: ['Pickleball', 'Football', 'Badminton'],
      surface: 'USAPA Spec Cushion Acrylic & Futsal Turf',
      monsoonCover: 'Roof Covered',
      floodlights: 'Anti-Glare Shadowless LED Canopies',
      rating: 4.9,
      reviewsCount: 345,
      pricePerHour: 1400,
      morningPrice: 900,
      eveningPrice: 1600,
      nightPrice: 1300,
      image: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=1200&q=80',
      amenities: ['Spectator Lounge', 'Equipment Pro Shop', 'Chilled Locker Rooms', 'Smoothie Bar'],
      dimensions: 'Dual Pickleball Courts + 5v5 Turf',
      openHours: '6:00 AM - 3:00 AM'
    },
    {
      id: 'turf_chembur_arena',
      name: 'The Arena Multi-Sport Hub (Chembur)',
      slug: 'the-arena-chembur',
      zone: 'Central Suburbs & Powai',
      location: 'Diamond Garden, Chembur East, Mumbai 400071',
      nearestStation: '300m from Chembur Monorail / Station',
      sports: ['Box Cricket', 'Football', 'Pickleball'],
      surface: 'Multi-Sport High-Grip Turf',
      monsoonCover: 'Roof Covered',
      floodlights: '360W High-Lumen Night Illuminators',
      rating: 4.8,
      reviewsCount: 218,
      pricePerHour: 1550,
      morningPrice: 1050,
      eveningPrice: 1900,
      nightPrice: 1550,
      image: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=1200&q=80',
      amenities: ['Cricket Net Practice', 'Team Changing Rooms', 'Dugout Soundbox', 'Covered Parking'],
      dimensions: 'Cricket & 5v5 Futsal (95ft x 60ft)',
      openHours: '6:00 AM - 3:00 AM'
    },
    {
      id: 'turf_vashi_urban',
      name: 'Navi Mumbai Urban Astro Arena (Vashi)',
      slug: 'navi-mumbai-urban-astro-vashi',
      zone: 'Thane & Navi Mumbai',
      location: 'Sector 19A, Near Palm Beach Galleria, Vashi, Navi Mumbai 400705',
      nearestStation: '600m from Sanpada / Vashi Railway Station',
      sports: ['Football', 'Box Cricket', 'Pickleball'],
      surface: 'Dual-Tone FIFA AstroTurf 50mm',
      monsoonCover: 'Open-Air',
      floodlights: '450W Wide-Beam Arena Floodlights',
      rating: 4.8,
      reviewsCount: 194,
      pricePerHour: 1450,
      morningPrice: 950,
      eveningPrice: 1750,
      nightPrice: 1400,
      image: 'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?auto=format&fit=crop&w=1200&q=80',
      amenities: ['Wide Dugout', 'Ample 4-Wheeler Parking', 'Filtered Water Fountains', 'Shower Cubicles'],
      dimensions: '7v7 Football / Box Cricket (115ft x 75ft)',
      openHours: '6:00 AM - 3:00 AM'
    }
  ];

  for (const t of turfs) {
    Turf.create(t);
  }
  console.log(`✅ Loaded ${turfs.length} Mumbai Turfs.`);

  // 2. Seed Turf-Specific Equipment Inventory (40 items strictly mapped to turfs)
  const equipmentItems = [
    // St. Andrews Turf (Bandra)
    {
      id: 'eq_sta_01',
      turfId: 'turf_bandra_standrews',
      name: 'Nike Flight Match Ball (FIFA Quality Pro)',
      category: 'Balls',
      sport: 'Football',
      brand: 'Nike',
      pricePerHour: 150,
      totalStock: 12,
      image: 'https://images.unsplash.com/photo-1614632537423-1e6c2e7e0aab?auto=format&fit=crop&w=400&q=80',
      description: 'Official match ball with Aerowsculpt grooves for true flight on turf.',
      specs: 'Size 5, Thermal Bonded, FIFA Quality Pro'
    },
    {
      id: 'eq_sta_02',
      turfId: 'turf_bandra_standrews',
      name: 'Adidas Predator Elite Boots (UK 8-10)',
      category: 'Footwear',
      sport: 'Football',
      brand: 'Adidas',
      pricePerHour: 250,
      totalStock: 8,
      image: 'https://images.unsplash.com/photo-1511556532299-8f662fc26c06?auto=format&fit=crop&w=400&q=80',
      description: 'AstroTurf specific rubber studs for maximum grip and ball control.',
      specs: 'AstroTurf TF Soles, High-Grip Strikeskin'
    },
    {
      id: 'eq_sta_03',
      turfId: 'turf_bandra_standrews',
      name: 'Pro Goalkeeper Gloves (Latex Grip 4mm)',
      category: 'Protective',
      sport: 'Football',
      brand: 'Reusch',
      pricePerHour: 100,
      totalStock: 6,
      image: 'https://images.unsplash.com/photo-1587329310686-91414b8e3cb7?auto=format&fit=crop&w=400&q=80',
      description: 'Shock-absorbing finger spines with German contact latex palm.',
      specs: 'Finger Protection Spines, Full Wrap Wristband'
    },
    {
      id: 'eq_sta_04',
      turfId: 'turf_bandra_standrews',
      name: 'Neon Squad Bibs Set of 10 (Lime & Orange)',
      category: 'Training',
      sport: 'Football',
      brand: 'Kipsta',
      pricePerHour: 200,
      totalStock: 10,
      image: 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?auto=format&fit=crop&w=400&q=80',
      description: 'Breathable lightweight squad differentiation mesh bibs.',
      specs: 'Set of 10 (5 Lime / 5 Volt Orange)'
    },
    {
      id: 'eq_sta_05',
      turfId: 'turf_bandra_standrews',
      name: 'Agility Training Kit (Speed Ladder + Cones)',
      category: 'Training',
      sport: 'Football',
      brand: 'SKLZ',
      pricePerHour: 80,
      totalStock: 5,
      image: 'https://images.unsplash.com/photo-1526676037777-05a232554f77?auto=format&fit=crop&w=400&q=80',
      description: 'Complete footwork drill set with 6m ladder and 20 saucer cones.',
      specs: '6m Quick-Flat Ladder + 20 Markers'
    },

    // Juhu Box Cricket Arena
    {
      id: 'eq_juhu_01',
      turfId: 'turf_juhu_box',
      name: 'English Willow Short Handle Match Bat',
      category: 'Bats',
      sport: 'Box Cricket',
      brand: 'SS Ton',
      pricePerHour: 150,
      totalStock: 10,
      image: 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&w=400&q=80',
      description: 'Grade 1 English Willow crafted with huge edges for explosive hitting.',
      specs: 'Weight: 1180g, 40mm Edges, Pre-Knocked'
    },
    {
      id: 'eq_juhu_02',
      turfId: 'turf_juhu_box',
      name: 'Heavy Tennis Cricket Balls (Box of 6)',
      category: 'Balls',
      sport: 'Box Cricket',
      brand: 'Guru Super',
      pricePerHour: 120,
      totalStock: 15,
      image: 'https://images.unsplash.com/photo-1587280501635-68a0e82cd5ff?auto=format&fit=crop&w=400&q=80',
      description: 'Tournament grade 130g red heavy tennis balls for turf cricket.',
      specs: '130g High Bounce, Red Felt Cover'
    },
    {
      id: 'eq_juhu_03',
      turfId: 'turf_juhu_box',
      name: 'Automatic Bowling Machine with Remote',
      category: 'Training',
      sport: 'Box Cricket',
      brand: 'Leverage iWin',
      pricePerHour: 500,
      totalStock: 2,
      image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=400&q=80',
      description: 'Speeds 60-130 km/h with swing, spin, and yorker variations.',
      specs: 'Digital Speed Controller, 28-ball feeder'
    },
    {
      id: 'eq_juhu_04',
      turfId: 'turf_juhu_box',
      name: 'Wicket Keeper Pads & Webbed Gloves',
      category: 'Protective',
      sport: 'Box Cricket',
      brand: 'SG Club',
      pricePerHour: 150,
      totalStock: 4,
      image: 'https://images.unsplash.com/photo-1593341646782-e0b495cff86d?auto=format&fit=crop&w=400&q=80',
      description: 'Lightweight foam padded shin guards with rubber-grip gloves.',
      specs: 'Ultra-light High Density Foam'
    },
    {
      id: 'eq_juhu_05',
      turfId: 'turf_juhu_box',
      name: 'Spring-Loaded Plastic Stumps & Heavy Base',
      category: 'Training',
      sport: 'Box Cricket',
      brand: 'Kookaburra',
      pricePerHour: 60,
      totalStock: 8,
      image: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=400&q=80',
      description: 'Durable unbreakable spring return stumps with weighted cast base.',
      specs: 'Cast Iron Base, 3 Spring Stumps'
    },

    // Turfside Lower Parel
    {
      id: 'eq_lp_01',
      turfId: 'turf_lowerparel_turfside',
      name: 'Puma Orbita Serie A Official Ball',
      category: 'Balls',
      sport: 'Football',
      brand: 'Puma',
      pricePerHour: 160,
      totalStock: 10,
      image: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=400&q=80',
      description: 'High-frequency molded ball with 12 equal panels for touch control.',
      specs: 'Size 5, High Frequency Polyurethane'
    },
    {
      id: 'eq_lp_02',
      turfId: 'turf_lowerparel_turfside',
      name: 'Carbon Shield Shin Guards (Pair)',
      category: 'Protective',
      sport: 'Football',
      brand: 'G-Form Pro',
      pricePerHour: 70,
      totalStock: 12,
      image: 'https://images.unsplash.com/photo-1587329310686-91414b8e3cb7?auto=format&fit=crop&w=400&q=80',
      description: 'Smartflex technology pads that harden on impact to protect shins.',
      specs: 'CE Certified, Compression Sleeve'
    },
    {
      id: 'eq_lp_03',
      turfId: 'turf_lowerparel_turfside',
      name: 'Tactical Magnetic Coaching Board + Whistle',
      category: 'Training',
      sport: 'Football',
      brand: 'Fox 40',
      pricePerHour: 50,
      totalStock: 4,
      image: 'https://images.unsplash.com/photo-1526676037777-05a232554f77?auto=format&fit=crop&w=400&q=80',
      description: 'Full pitch & half pitch magnetic board with 24 markers & Fox 40 whistle.',
      specs: 'Double-sided dry erase + 24 magnets'
    },
    {
      id: 'eq_lp_04',
      turfId: 'turf_lowerparel_turfside',
      name: 'Futsal Low-Bounce Pro Gripper Ball',
      category: 'Balls',
      sport: 'Football',
      brand: 'Select Futsal Super',
      pricePerHour: 140,
      totalStock: 8,
      image: 'https://images.unsplash.com/photo-1614632537423-1e6c2e7e0aab?auto=format&fit=crop&w=400&q=80',
      description: 'Reduced bounce core ball engineered specifically for turf surfaces.',
      specs: 'Size 4 Futsal, Butyl Bladder with Fibers'
    },
    {
      id: 'eq_lp_05',
      turfId: 'turf_lowerparel_turfside',
      name: 'AstroTurf Futsal Grippers (UK 7-11)',
      category: 'Footwear',
      sport: 'Football',
      brand: 'Nike Phantom',
      pricePerHour: 220,
      totalStock: 9,
      image: 'https://images.unsplash.com/photo-1511556532299-8f662fc26c06?auto=format&fit=crop&w=400&q=80',
      description: 'Textured synthetic upper with non-marking turf rubber lugs.',
      specs: 'TF Multi-Stud Rubber'
    },

    // Cooperage Football Turf Park (Colaba)
    {
      id: 'eq_coop_01',
      turfId: 'turf_colaba_cooperage',
      name: 'Nike Strike Official Match Football',
      category: 'Balls',
      sport: 'Football',
      brand: 'Nike',
      pricePerHour: 180,
      totalStock: 14,
      image: 'https://images.unsplash.com/photo-1614632537423-1e6c2e7e0aab?auto=format&fit=crop&w=400&q=80',
      description: 'Professional 12-panel design with textured casing for great feel.',
      specs: 'Size 5 Match Standard'
    },
    {
      id: 'eq_coop_02',
      turfId: 'turf_colaba_cooperage',
      name: 'Nike Phantom GX Elite AG Cleats',
      category: 'Footwear',
      sport: 'Football',
      brand: 'Nike',
      pricePerHour: 280,
      totalStock: 8,
      image: 'https://images.unsplash.com/photo-1511556532299-8f662fc26c06?auto=format&fit=crop&w=400&q=80',
      description: 'Gripknit material covers hitting zone; AG plate for artificial grass.',
      specs: 'Artificial Grass Soles (Sizes 8, 9, 10)'
    },
    {
      id: 'eq_coop_03',
      turfId: 'turf_colaba_cooperage',
      name: 'Uhlsport Goalkeeper Master Gloves',
      category: 'Protective',
      sport: 'Football',
      brand: 'Uhlsport',
      pricePerHour: 150,
      totalStock: 5,
      image: 'https://images.unsplash.com/photo-1587329310686-91414b8e3cb7?auto=format&fit=crop&w=400&q=80',
      description: 'Supergrip+ foam for supreme holding power in wet/dry Mumbai conditions.',
      specs: 'German Supergrip+ 4mm Latex'
    },
    {
      id: 'eq_coop_04',
      turfId: 'turf_colaba_cooperage',
      name: 'GPS Team Tracking Performance Vest',
      category: 'Training',
      sport: 'Football',
      brand: 'STATSports',
      pricePerHour: 300,
      totalStock: 6,
      image: 'https://images.unsplash.com/photo-1526676037777-05a232554f77?auto=format&fit=crop&w=400&q=80',
      description: 'Tracks top speed, distance covered, sprint count, and heart rate live.',
      specs: 'FIFA Approved GPS Pod + Neoprene Vest'
    },
    {
      id: 'eq_coop_05',
      turfId: 'turf_colaba_cooperage',
      name: 'Reversible Squad Bibs Set of 12',
      category: 'Training',
      sport: 'Football',
      brand: 'Puma',
      pricePerHour: 220,
      totalStock: 8,
      image: 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?auto=format&fit=crop&w=400&q=80',
      description: 'Two-tone reversible volt yellow and navy squad training pinnies.',
      specs: 'Set of 12 (Reversible Volt/Navy)'
    },

    // Kick Off Astro Park (Goregaon West)
    {
      id: 'eq_gore_01',
      turfId: 'turf_goregaon_kickoff',
      name: 'Kipsta FIFA Basic Match Football',
      category: 'Balls',
      sport: 'Football',
      brand: 'Kipsta',
      pricePerHour: 130,
      totalStock: 12,
      image: 'https://images.unsplash.com/photo-1614632537423-1e6c2e7e0aab?auto=format&fit=crop&w=400&q=80',
      description: 'Durable 32-panel stitched ball engineered for synthetic turf longevity.',
      specs: 'Size 5, Butyl bladder'
    },
    {
      id: 'eq_gore_02',
      turfId: 'turf_goregaon_kickoff',
      name: 'Heavy Box Cricket Tennis Balls (6 Pack)',
      category: 'Balls',
      sport: 'Box Cricket',
      brand: 'Vicky Super Hard',
      pricePerHour: 110,
      totalStock: 14,
      image: 'https://images.unsplash.com/photo-1587280501635-68a0e82cd5ff?auto=format&fit=crop&w=400&q=80',
      description: 'Long-lasting high bounce heavy red tennis balls.',
      specs: '125g Competition Spec'
    },
    {
      id: 'eq_gore_03',
      turfId: 'turf_goregaon_kickoff',
      name: 'Kashmiri Willow Heavy Edge Bat',
      category: 'Bats',
      sport: 'Box Cricket',
      brand: 'BBD Sports',
      pricePerHour: 120,
      totalStock: 8,
      image: 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&w=400&q=80',
      description: 'Dense blade specially carved for smashing tennis cricket boundaries.',
      specs: 'Full Cane Handle, 1150g'
    },
    {
      id: 'eq_gore_04',
      turfId: 'turf_goregaon_kickoff',
      name: 'Anti-Slip Gripper Sports Socks (2 Pairs)',
      category: 'Footwear',
      sport: 'Football',
      brand: 'TruSox',
      pricePerHour: 90,
      totalStock: 16,
      image: 'https://images.unsplash.com/photo-1511556532299-8f662fc26c06?auto=format&fit=crop&w=400&q=80',
      description: 'Silicone anti-slip pads prevent in-shoe sliding and blisters.',
      specs: 'Cushioned Sole, Anti-Slip Grid'
    },
    {
      id: 'eq_gore_05',
      turfId: 'turf_goregaon_kickoff',
      name: 'Quick-Cooling Ice Spray & Physio First Aid Kit',
      category: 'Protective',
      sport: 'All Sports',
      brand: 'Volini Pro',
      pricePerHour: 50,
      totalStock: 6,
      image: 'https://images.unsplash.com/photo-1587329310686-91414b8e3cb7?auto=format&fit=crop&w=400&q=80',
      description: 'Instant cold compress spray, crepe bandages, and antiseptic swabs.',
      specs: 'Instant Freeze Spray + Crepe Bandages'
    },

    // Smash Pickleball Club (Powai)
    {
      id: 'eq_powai_01',
      turfId: 'turf_powai_smash',
      name: 'Pro Raw Carbon Fiber Pickleball Paddle',
      category: 'Paddles',
      sport: 'Pickleball',
      brand: 'CRBN 1X',
      pricePerHour: 120,
      totalStock: 16,
      image: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=400&q=80',
      description: 'Toray T700 raw carbon fiber textured face for massive spin and sweet spot.',
      specs: 'USAPA Approved, 16mm Poly Core'
    },
    {
      id: 'eq_powai_02',
      turfId: 'turf_powai_smash',
      name: 'Dura Fast 40+ Outdoor Pickleballs (Tube of 4)',
      category: 'Balls',
      sport: 'Pickleball',
      brand: 'Dura Fast',
      pricePerHour: 100,
      totalStock: 20,
      image: 'https://images.unsplash.com/photo-1587280501635-68a0e82cd5ff?auto=format&fit=crop&w=400&q=80',
      description: 'Official US Open championship outdoor pickleball balls.',
      specs: '40 precision drilled holes, Neon Yellow'
    },
    {
      id: 'eq_powai_03',
      turfId: 'turf_powai_smash',
      name: 'Anti-Fog Impact Protective Court Eyewear',
      category: 'Protective',
      sport: 'Pickleball',
      brand: 'Gearbox Vision',
      pricePerHour: 60,
      totalStock: 10,
      image: 'https://images.unsplash.com/photo-1587329310686-91414b8e3cb7?auto=format&fit=crop&w=400&q=80',
      description: 'Polycarbonate shatterproof safety lenses with anti-scratch coating.',
      specs: 'ANSI Z87.1 Safety Certified'
    },
    {
      id: 'eq_powai_04',
      turfId: 'turf_powai_smash',
      name: 'Yonex Astrox 99 Pro Badminton Racquet',
      category: 'Paddles',
      sport: 'Badminton',
      brand: 'Yonex',
      pricePerHour: 140,
      totalStock: 8,
      image: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=400&q=80',
      description: 'Rotational generator system for aggressive steep smashes.',
      specs: 'Strung at 26 lbs with BG65'
    },
    {
      id: 'eq_powai_05',
      turfId: 'turf_powai_smash',
      name: 'Yonex Mavis 350 Nylon Shuttles (Tube of 6)',
      category: 'Balls',
      sport: 'Badminton',
      brand: 'Yonex',
      pricePerHour: 90,
      totalStock: 15,
      image: 'https://images.unsplash.com/photo-1587280501635-68a0e82cd5ff?auto=format&fit=crop&w=400&q=80',
      description: 'Precision manufactured nylon shuttles with genuine cork base.',
      specs: 'Yellow Wing / Blue Band (Medium Speed)'
    },

    // The Arena (Chembur)
    {
      id: 'eq_chem_01',
      turfId: 'turf_chembur_arena',
      name: 'SG Pro Cricket Kit Bag (Full Squad Set)',
      category: 'Training',
      sport: 'Box Cricket',
      brand: 'SG Cricket',
      pricePerHour: 350,
      totalStock: 4,
      image: 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&w=400&q=80',
      description: 'Includes 2 English Willow bats, 2 pairs batting pads, gloves, & stumps.',
      specs: 'Heavy Cordura Duffle Bag with Pro Gear'
    },
    {
      id: 'eq_chem_02',
      turfId: 'turf_chembur_arena',
      name: 'Kookaburra Red Turf Seam Cricket Balls',
      category: 'Balls',
      sport: 'Box Cricket',
      brand: 'Kookaburra',
      pricePerHour: 140,
      totalStock: 12,
      image: 'https://images.unsplash.com/photo-1587280501635-68a0e82cd5ff?auto=format&fit=crop&w=400&q=80',
      description: 'Molded raised polyurethane seam for realistic bowling swing and spin.',
      specs: 'Specially designed for artificial grass wickets'
    },
    {
      id: 'eq_chem_03',
      turfId: 'turf_chembur_arena',
      name: 'Kipsta 5v5 Futsal Match Ball',
      category: 'Balls',
      sport: 'Football',
      brand: 'Kipsta',
      pricePerHour: 130,
      totalStock: 8,
      image: 'https://images.unsplash.com/photo-1614632537423-1e6c2e7e0aab?auto=format&fit=crop&w=400&q=80',
      description: 'Controlled bounce ball for rapid small-sided games in Chembur.',
      specs: 'Size 4 Hybrid Stitched'
    },
    {
      id: 'eq_chem_04',
      turfId: 'turf_chembur_arena',
      name: 'Franklin Sports Pro Carbon Pickleball Paddle',
      category: 'Paddles',
      sport: 'Pickleball',
      brand: 'Franklin',
      pricePerHour: 110,
      totalStock: 10,
      image: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=400&q=80',
      description: 'Textured surface technology paddle for balanced power and control.',
      specs: 'MaxGrit Textured Polypropylene Core'
    },
    {
      id: 'eq_chem_05',
      turfId: 'turf_chembur_arena',
      name: 'High-Visibility Squad Bibs (Neon Pink & Cyan)',
      category: 'Training',
      sport: 'All Sports',
      brand: 'Vector X',
      pricePerHour: 100,
      totalStock: 7,
      image: 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?auto=format&fit=crop&w=400&q=80',
      description: 'Pack of 10 fluorescent training bibs for high-speed night matches.',
      specs: 'Set of 10 Mesh Jerseys'
    },

    // Navi Mumbai Urban Astro Arena (Vashi)
    {
      id: 'eq_vashi_01',
      turfId: 'turf_vashi_urban',
      name: 'Nike AstroTurf Cleats (Multi-Ground Soles)',
      category: 'Footwear',
      sport: 'Football',
      brand: 'Nike Mercurial',
      pricePerHour: 200,
      totalStock: 10,
      image: 'https://images.unsplash.com/photo-1511556532299-8f662fc26c06?auto=format&fit=crop&w=400&q=80',
      description: 'Engineered for artificial turf traction without knee strain.',
      specs: 'Sizes UK 8, 9, 10 Available'
    },
    {
      id: 'eq_vashi_02',
      turfId: 'turf_vashi_urban',
      name: 'Adidas League Football (Size 5)',
      category: 'Balls',
      sport: 'Football',
      brand: 'Adidas UCL',
      pricePerHour: 140,
      totalStock: 11,
      image: 'https://images.unsplash.com/photo-1614632537423-1e6c2e7e0aab?auto=format&fit=crop&w=400&q=80',
      description: 'Seamless surface with TSBE technology for clean first-touch control.',
      specs: 'FIFA Quality Certification'
    },
    {
      id: 'eq_vashi_03',
      turfId: 'turf_vashi_urban',
      name: 'Hard Tennis Cricket Tournament Bats',
      category: 'Bats',
      sport: 'Box Cricket',
      brand: 'Spartan Turbo',
      pricePerHour: 130,
      totalStock: 7,
      image: 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&w=400&q=80',
      description: 'Double blade scoop design delivering exceptional stroke power.',
      specs: 'Scooped Blade, Cane Handle'
    },
    {
      id: 'eq_vashi_04',
      turfId: 'turf_vashi_urban',
      name: 'Goalkeeper Protective Padded Pants & Shirt',
      category: 'Protective',
      sport: 'Football',
      brand: 'Storelli BodyShield',
      pricePerHour: 110,
      totalStock: 5,
      image: 'https://images.unsplash.com/photo-1587329310686-91414b8e3cb7?auto=format&fit=crop&w=400&q=80',
      description: 'Poron XRD protection on hips and elbows against hard turf burns.',
      specs: 'Turf-Burn Anti-Abrasion Panels'
    },
    {
      id: 'eq_vashi_05',
      turfId: 'turf_vashi_urban',
      name: 'Team Sports Insulated Ice Cooler (15L)',
      category: 'Training',
      sport: 'All Sports',
      brand: 'Coleman Sport',
      pricePerHour: 80,
      totalStock: 6,
      image: 'https://images.unsplash.com/photo-1526676037777-05a232554f77?auto=format&fit=crop&w=400&q=80',
      description: 'Keeps team electrolytes and water bottles ice-cold for 12 hours.',
      specs: '15L Insulated Jug with Dispenser Tap'
    }
  ];

  for (const item of equipmentItems) {
    Equipment.create(item);
  }
  console.log(`✅ Loaded ${equipmentItems.length} Turf-Specific Equipment Items.`);

  // 3. Seed Default User with ₹3,200 wallet balance and pass credits
  const defaultUser = User.getDefaultUser();
  console.log(`✅ Initialized User: ${defaultUser.name} with ₹${defaultUser.walletBalance} Wallet Balance.`);

  // 4. Seed an initial booking for demonstration
  const today = new Date().toISOString().split('T')[0];
  const sampleBooking = Booking.createBooking({
    userId: defaultUser.id,
    userName: defaultUser.name,
    userPhone: defaultUser.phone,
    userEmail: defaultUser.email,
    type: 'TURF_AND_GEAR',
    turfId: 'turf_bandra_standrews',
    turfName: 'St. Andrews AstroTurf Arena',
    turfLocation: 'Bandra West, Mumbai',
    date: today,
    slotTime: '21:00 - 22:00',
    turfAmount: 2200,
    equipmentAmount: 350,
    equipmentItems: [
      { id: 'eq_sta_01', name: 'Nike Flight Match Ball (FIFA Quality Pro)', pricePerHour: 150, quantity: 1 },
      { id: 'eq_sta_04', name: 'Neon Squad Bibs Set of 10 (Lime & Orange)', pricePerHour: 200, quantity: 1 }
    ],
    totalAmount: 2550,
    advancePaid: 2550,
    dueAtVenue: 0,
    paymentMode: 'WALLET',
    paymentStatus: 'COMPLETED'
  });

  console.log(`✅ Initialized Sample Confirmed Booking: ${sampleBooking.bookingRef}`);
  console.log('🎉 Database seeding complete!');
}

if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;
