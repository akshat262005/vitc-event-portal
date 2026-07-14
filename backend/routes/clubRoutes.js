const express = require('express');
const { db } = require('../db');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/clubs - List all clubs (Accessible by both Admin and Chairperson)
router.get('/', verifyToken, async (req, res) => {
  try {
    const clubs = await db.clubs.find();
    res.json(clubs);
  } catch (error) {
    console.error('Fetch clubs error:', error);
    res.status(500).json({ message: 'Server error fetching clubs.' });
  }
});

// POST /api/clubs - Add new club (Admin only)
router.post('/', verifyToken, requireRole('Admin'), async (req, res) => {
  const { name, description } = req.body;

  if (!name) {
    return res.status(400).json({ message: 'Club name is required.' });
  }

  try {
    const newClub = await db.clubs.create({ name, description });
    
    // Create an admin notification
    await db.notifications.create({
      recipientRole: 'Admin',
      title: 'New Club Created',
      message: `Club "${name}" has been successfully added to the portal.`
    });

    res.status(201).json(newClub);
  } catch (error) {
    console.error('Create club error:', error);
    res.status(400).json({ message: error.message || 'Error creating club.' });
  }
});

// PUT /api/clubs/:id - Edit club (Admin only)
router.put('/:id', verifyToken, requireRole('Admin'), async (req, res) => {
  const { name, description } = req.body;
  const clubId = req.params.id;

  if (!name) {
    return res.status(400).json({ message: 'Club name is required.' });
  }

  try {
    const updatedClub = await db.clubs.findByIdAndUpdate(clubId, { name, description });
    if (!updatedClub) {
      return res.status(404).json({ message: 'Club not found.' });
    }
    res.json(updatedClub);
  } catch (error) {
    console.error('Update club error:', error);
    res.status(400).json({ message: error.message || 'Error updating club.' });
  }
});

// DELETE /api/clubs/:id - Delete club (Admin only)
router.delete('/:id', verifyToken, requireRole('Admin'), async (req, res) => {
  const clubId = req.params.id;

  try {
    const deletedClub = await db.clubs.findByIdAndDelete(clubId);
    if (!deletedClub) {
      return res.status(404).json({ message: 'Club not found.' });
    }
    res.json({ message: 'Club deleted successfully.', club: deletedClub });
  } catch (error) {
    console.error('Delete club error:', error);
    res.status(500).json({ message: 'Server error deleting club.' });
  }
});

module.exports = router;
