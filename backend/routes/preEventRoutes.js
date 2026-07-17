const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { verifyToken } = require('../middleware/auth');

// helper middleware to verify role checking
const verifyAdmin = (req, res, next) => {
  if (req.user.role !== 'Admin') {
    return res.status(403).json({ message: 'Access denied. Admin only.' });
  }
  next();
};

// POST /api/pre-events - Submit a new Pre-Event Operation Request
router.post('/', verifyToken, async (req, res) => {
  if (req.user.role !== 'Chairperson') {
    return res.status(403).json({ message: 'Access denied. Chairpersons only.' });
  }

  const {
    eventName,
    eventDate,
    odRequiredDate,
    eventCategory,
    eventCategoryOthersSpecify,
    facultyCoordinator,
    studentCoordinator,
    studentCoordinatorContact,
    purpose
  } = req.body;

  // Basic validation
  if (!eventName || !eventDate || !odRequiredDate || !eventCategory || !facultyCoordinator || !studentCoordinator || !studentCoordinatorContact || !purpose) {
    return res.status(400).json({ message: 'All fields are required.' });
  }

  // Purpose cannot be blank
  if (!purpose.trim()) {
    return res.status(400).json({ message: 'Purpose is mandatory.' });
  }

  // Validate mobile number: exactly 10 digits
  const phoneRegex = /^\d{10}$/;
  if (!phoneRegex.test(studentCoordinatorContact.trim())) {
    return res.status(400).json({ message: 'Student Coordinator Contact Number must be a valid 10-digit number.' });
  }

  // Validate dates: odRequiredDate cannot be after eventDate
  const evDate = new Date(eventDate);
  const odReqDate = new Date(odRequiredDate);
  if (odReqDate > evDate) {
    return res.status(400).json({ message: 'OD Required Date cannot be after the Actual Event Date.' });
  }

  try {
    // Get Chairperson's club details
    const chairperson = await db.users.findById(req.user.id);
    if (!chairperson || !chairperson.clubId) {
      return res.status(400).json({ message: 'Chairperson does not have an assigned club.' });
    }

    const club = await db.clubs.findById(chairperson.clubId.toString());
    const clubName = club ? club.name : (chairperson.clubName || 'Unknown Club');

    // Create operation request
    const newOperation = await db.preEventOperations.create({
      clubId: chairperson.clubId,
      clubName,
      eventName,
      eventDate,
      odRequiredDate,
      eventCategory,
      eventCategoryOthersSpecify: eventCategory === 'Others' ? eventCategoryOthersSpecify : '',
      facultyCoordinator,
      studentCoordinator,
      studentCoordinatorContact: studentCoordinatorContact.trim(),
      purpose,
      status: 'Pending',
      hasOD: false,
      odUploadsCount: 0,
      submittedBy: req.user.id
    });

    // Create Admin notification
    await db.notifications.create({
      recipientRole: 'Admin',
      title: 'New Pre-Event Operation Request',
      message: `Club "${clubName}" submitted a pre-event operation request for "${eventName}".`
    });

    res.status(201).json({
      message: 'Pre-Event Operation request submitted successfully!',
      operation: newOperation
    });
  } catch (error) {
    console.error('Submit pre-event operation error:', error);
    res.status(500).json({ message: error.message || 'Server error submitting pre-event operation.' });
  }
});

// GET /api/pre-events - Get list of Pre-Event requests (filtered by user role)
router.get('/', verifyToken, async (req, res) => {
  try {
    const isChairperson = req.user.role === 'Chairperson';
    let filter = {};

    if (isChairperson) {
      const chairperson = await db.users.findById(req.user.id);
      filter.clubId = chairperson.clubId;
    }

    const list = await db.preEventOperations.find(filter);
    res.json(list);
  } catch (error) {
    console.error('Fetch pre-event operations error:', error);
    res.status(500).json({ message: 'Server error fetching pre-event operations list.' });
  }
});

// GET /api/pre-events/:id - Get details of a single request
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const op = await db.preEventOperations.findById(req.params.id);
    if (!op) {
      return res.status(404).json({ message: 'Pre-Event Operation request not found.' });
    }

    // Role check: Chairperson can only view their own club's request
    if (req.user.role === 'Chairperson') {
      const chairperson = await db.users.findById(req.user.id);
      if (op.clubId.toString() !== chairperson.clubId.toString()) {
        return res.status(403).json({ message: 'Access denied. You cannot view requests for other clubs.' });
      }
    }

    res.json(op);
  } catch (error) {
    console.error('Fetch pre-event operation details error:', error);
    res.status(500).json({ message: 'Server error fetching details.' });
  }
});

// PUT /api/pre-events/:id/status - Update request status (Admin only)
router.put('/:id/status', verifyToken, verifyAdmin, async (req, res) => {
  const { status } = req.body;

  if (!['Pending', 'Approved', 'Rejected'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status. Must be Pending, Approved, or Rejected.' });
  }

  try {
    const op = await db.preEventOperations.findById(req.params.id);
    if (!op) {
      return res.status(404).json({ message: 'Pre-Event Operation request not found.' });
    }

    const updatedOp = await db.preEventOperations.findByIdAndUpdate(req.params.id, {
      status
    });

    // Create Chairperson notification
    await db.notifications.create({
      recipientRole: 'Chairperson',
      recipientId: op.submittedBy,
      title: 'Pre-Event Operation Status Updated',
      message: `Admin updated status of pre-event request for "${op.eventName}" to: ${status}.`
    });

    res.json({
      message: `Pre-Event request status updated to ${status} successfully.`,
      operation: updatedOp
    });
  } catch (error) {
    console.error('Update pre-event operation status error:', error);
    res.status(500).json({ message: 'Server error updating status.' });
  }
});

module.exports = router;
