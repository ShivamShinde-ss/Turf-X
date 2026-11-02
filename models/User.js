const db = require('../config/db');
const { randomUUID } = require('crypto');

class User {
  static getDefaultUser() {
    // Ensure default user exists
    let user = db.prepare('SELECT * FROM users WHERE role = "USER" LIMIT 1').get();
    if (!user) {
      const defaultId = 'user_mumbai_01';
      db.prepare(`
        INSERT INTO users (id, name, phone, email, password, role, walletBalance, turfCoins, passTier)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        defaultId,
        'Aditya Sharma',
        '+91 98201 44520',
        'aditya@mumbai.in',
        'user123',
        'USER',
        3200,
        160,
        'Mumbai Floodlight Pass (Tier 1)'
      );
      user = db.prepare('SELECT * FROM users WHERE id = ?').get(defaultId);
    }

    // Ensure default admin exists
    let admin = db.prepare('SELECT * FROM users WHERE role = "ADMIN" LIMIT 1').get();
    if (!admin) {
      const adminId = 'admin_mumbai_01';
      db.prepare(`
        INSERT INTO users (id, name, phone, email, password, role, walletBalance, turfCoins, passTier)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        adminId,
        'Stadium Operations Admin',
        '+91 98200 00001',
        'admin@turfx.mumbai',
        'admin123',
        'ADMIN',
        50000,
        1000,
        'Master Admin Pass'
      );
    }

    return user;
  }

  static getById(id) {
    return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  }

  static getByEmail(email) {
    return db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').get(email);
  }

  static authenticate(email, password) {
    const user = User.getByEmail(email);
    if (!user) {
      return { success: false, message: 'No account registered with this email.' };
    }

    if (user.password !== password) {
      return { success: false, message: 'Incorrect password entered.' };
    }

    // Remove password before returning
    const { password: _, ...userWithoutPassword } = user;
    return {
      success: true,
      user: userWithoutPassword
    };
  }

  static register({ name, email, phone, password, role = 'USER' }) {
    const existing = User.getByEmail(email);
    if (existing) {
      return { success: false, message: 'An account with this email already exists.' };
    }

    const userId = (role === 'ADMIN' ? 'admin_' : 'user_') + randomUUID().substring(0, 8);
    const initialBalance = role === 'ADMIN' ? 25000 : 1500;
    const initialCoins = role === 'ADMIN' ? 500 : 100;
    const passTier = role === 'ADMIN' ? 'Admin Access' : 'Mumbai Rookie Pass';

    db.prepare(`
      INSERT INTO users (id, name, phone, email, password, role, walletBalance, turfCoins, passTier)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      userId,
      name,
      phone || '+91 98000 00000',
      email,
      password,
      role.toUpperCase(),
      initialBalance,
      initialCoins,
      passTier
    );

    const newUser = User.getById(userId);
    const { password: _, ...userWithoutPassword } = newUser;
    return {
      success: true,
      user: userWithoutPassword
    };
  }

  static deductWallet(userId, amount, description) {
    const user = User.getById(userId) || User.getDefaultUser();
    if (user.walletBalance < amount) {
      return { success: false, message: 'Insufficient wallet balance' };
    }

    const newBalance = user.walletBalance - amount;
    const earnedCoins = Math.floor(amount * 0.05);
    const newCoins = (user.turfCoins || 0) + earnedCoins;

    db.prepare('UPDATE users SET walletBalance = ?, turfCoins = ? WHERE id = ?')
      .run(newBalance, newCoins, user.id);

    const txId = 'tx_' + randomUUID().substring(0, 8);
    db.prepare(`
      INSERT INTO wallet_transactions (id, userId, type, amount, description)
      VALUES (?, ?, ?, ?, ?)
    `).run(txId, user.id, 'DEBIT', amount, description);

    return {
      success: true,
      walletBalance: newBalance,
      turfCoins: newCoins,
      earnedCoins
    };
  }

  static topUpWallet(userId, amount, bonus = 0) {
    const user = User.getById(userId) || User.getDefaultUser();
    const totalCredit = amount + bonus;
    const newBalance = user.walletBalance + totalCredit;

    db.prepare('UPDATE users SET walletBalance = ? WHERE id = ?')
      .run(newBalance, user.id);

    const txId = 'tx_' + randomUUID().substring(0, 8);
    db.prepare(`
      INSERT INTO wallet_transactions (id, userId, type, amount, description)
      VALUES (?, ?, ?, ?, ?)
    `).run(txId, user.id, 'CREDIT', totalCredit, `Wallet Top-up (+₹${bonus} bonus credits)`);

    return {
      success: true,
      walletBalance: newBalance,
      addedAmount: totalCredit
    };
  }

  static getTransactions(userId) {
    return db.prepare('SELECT * FROM wallet_transactions WHERE userId = ? ORDER BY createdAt DESC').all(userId);
  }

  static getAllUsers() {
    return db.prepare('SELECT id, name, phone, email, role, walletBalance, turfCoins, passTier, createdAt FROM users ORDER BY createdAt DESC').all();
  }
}

module.exports = User;
