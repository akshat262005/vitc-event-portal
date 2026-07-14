const express = require('express');
const bcrypt = require('bcryptjs');
const { db } = require('../db');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// All routes here are restricted to Admins
router.use(verifyToken, requireRole('Admin'));

// GET /api/chairpersons - List all chairpersons
router.get('/', async (req, res) => {
  try {
    const chairpersons = await db.users.find({ role: 'Chairperson' });
    res.json(chairpersons);
  } catch (error) {
    console.error('Fetch chairpersons error:', error);
    res.status(500).json({ message: 'Server error fetching chairpersons.' });
  }
});

// POST /api/chairpersons - Create a new Chairperson
router.post('/', async (req, res) => {
  const { name, email, registrationNumber, clubId, designation, username, password } = req.body;

  if (!name || !email || !registrationNumber || !clubId || !designation || !username || !password) {
    return res.status(400).json({ message: 'All fields are required.' });
  }

  try {
    // Verify club exists
    const club = await db.clubs.findById(clubId);
    if (!club) {
      return res.status(400).json({ message: 'Selected club does not exist.' });
    }

    // Encrypt password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newChairperson = await db.users.create({
      name,
      email,
      registrationNumber,
      clubId,
      clubName: club.name,
      designation,
      username,
      passwordHash,
      role: 'Chairperson'
    });

    // Remove password hash from response
    delete newChairperson.passwordHash;

    res.status(201).json(newChairperson);
  } catch (error) {
    console.error('Create chairperson error:', error);
    res.status(400).json({ message: error.message || 'Error creating chairperson.' });
  }
});

// PUT /api/chairpersons/:id - Update Chairperson details
router.put('/:id', async (req, res) => {
  const { name, email, registrationNumber, clubId, designation, username } = req.body;
  const chairpersonId = req.params.id;

  if (!name || !email || !registrationNumber || !clubId || !designation || !username) {
    return res.status(400).json({ message: 'All fields are required.' });
  }

  try {
    // Verify club exists
    const club = await db.clubs.findById(clubId);
    if (!club) {
      return res.status(400).json({ message: 'Selected club does not exist.' });
    }

    const updatedUser = await db.users.findByIdAndUpdate(chairpersonId, {
      name,
      email,
      registrationNumber,
      clubId,
      clubName: club.name,
      designation,
      username
    });

    if (!updatedUser) {
      return res.status(404).json({ message: 'Chairperson not found.' });
    }

    delete updatedUser.passwordHash;
    res.json(updatedUser);
  } catch (error) {
    console.error('Update chairperson error:', error);
    res.status(400).json({ message: error.message || 'Error updating chairperson.' });
  }
});

// DELETE /api/chairpersons/:id - Delete Chairperson
router.delete('/:id', async (req, res) => {
  const chairpersonId = req.params.id;

  try {
    const deletedUser = await db.users.findByIdAndDelete(chairpersonId);
    if (!deletedUser) {
      return res.status(404).json({ message: 'Chairperson not found.' });
    }
    res.json({ message: 'Chairperson deleted successfully.' });
  } catch (error) {
    console.error('Delete chairperson error:', error);
    res.status(500).json({ message: 'Server error deleting chairperson.' });
  }
});

// POST /api/chairpersons/:id/reset-password - Admin resets password
router.post('/:id/reset-password', async (req, res) => {
  const { newPassword } = req.body;
  const chairpersonId = req.params.id;

  if (!newPassword) {
    return res.status(400).json({ message: 'New password is required.' });
  }

  try {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    const updatedUser = await db.users.findByIdAndUpdate(chairpersonId, { passwordHash });
    if (!updatedUser) {
      return res.status(404).json({ message: 'Chairperson not found.' });
    }

    res.json({ message: 'Password reset successful.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Server error resetting password.' });
  }
});

module.exports = router;
