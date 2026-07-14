const express = require('express');
const { db } = require('../db');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// GET /api/notifications - Get all notifications for the authenticated user
router.get('/', verifyToken, async (req, res) => {
  try {
    const isChairperson = req.user.role === 'Chairperson';
    let filter = {};

    if (isChairperson) {
      filter.recipientRole = 'Chairperson';
      filter.recipientId = req.user.id;
    } else {
      filter.recipientRole = 'Admin';
    }

    const notifications = await db.notifications.find(filter);
    res.json(notifications);
  } catch (error) {
    console.error('Fetch notifications error:', error);
    res.status(500).json({ message: 'Server error fetching notifications.' });
  }
});

// PUT /api/notifications/read-all - Mark all notifications as read for the user
router.put('/read-all', verifyToken, async (req, res) => {
  try {
    const isChairperson = req.user.role === 'Chairperson';
    let filter = {};

    if (isChairperson) {
      filter.recipientRole = 'Chairperson';
      filter.recipientId = req.user.id;
    } else {
      filter.recipientRole = 'Admin';
    }

    await db.notifications.markAllAsRead(filter);
    res.json({ message: 'All notifications marked as read.' });
  } catch (error) {
    console.error('Read all notifications error:', error);
    res.status(500).json({ message: 'Server error updating notifications.' });
  }
});

module.exports = router;
