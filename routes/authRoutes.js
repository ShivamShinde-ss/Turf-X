const express = require('express');
const router = express.Router();
const User = require('../models/User');

// POST /api/auth/signup
router.post('/signup', (req, res) => {
  try {
    const { name, email, phone, password, role = 'USER' } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required.' });
    }

    if (!email.includes('@')) {
      return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
    }

    if (password.length < 4) {
      return res.status(400).json({ success: false, message: 'Password must be at least 4 characters.' });
    }

    const regResult = User.register({ name, email, phone, password, role });
    if (!regResult.success) {
      return res.status(409).json(regResult);
    }

    res.status(201).json({
      success: true,
      message: `Account created successfully as ${role.toUpperCase()}!`,
      user: regResult.user
    });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const authResult = User.authenticate(email, password);
    if (!authResult.success) {
      return res.status(401).json(authResult);
    }

    res.json({
      success: true,
      message: `Welcome back, ${authResult.user.name}!`,
      user: authResult.user
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/auth/me
router.get('/me', (req, res) => {
  try {
    const userId = req.query.userId;
    let user;
    if (userId) {
      user = User.getById(userId);
    } else {
      user = User.getDefaultUser();
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const { password: _, ...cleanUser } = user;
    res.json({ success: true, user: cleanUser });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
