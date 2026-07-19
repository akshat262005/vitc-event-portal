const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { db } = require('../db');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// Ensure uploads folder exists
const UPLOADS_DIR = path.join(__dirname, '../uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

// File validation
const fileFilter = (req, file, cb) => {
  if (file.fieldname === 'report') {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.pdf' || ext === '.docx' || ext === '.doc') {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF and DOCX formats are allowed for reports.'), false);
    }
  } else if (file.fieldname === 'photos') {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images are allowed for photos.'), false);
    }
  } else {
    cb(null, true);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 20 * 1024 * 1024 // 20 MB limit
  }
}).fields([
  { name: 'report', maxCount: 1 },
  { name: 'photos', maxCount: 10 }
]);

// Helper for error handling in uploads
const uploadMiddleware = (req, res, next) => {
  upload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'File size exceeds the 20MB limit.' });
      }
      return res.status(400).json({ message: `Upload error: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ message: err.message });
    }
    next();
  });
};

// POST /api/reports - Chairperson submits an Event Report
router.post('/', verifyToken, async (req, res) => {
  try {
    // If chairperson, verify they belong to a club
    const isChairperson = req.user.role === 'Chairperson';
    let clubId = req.body.clubId;
    let clubName = req.body.clubName;

    if (isChairperson) {
      // Chairperson must submit for their own assigned club
      const chairperson = await db.users.findById(req.user.id);
      if (!chairperson || !chairperson.clubId) {
        return res.status(400).json({ message: 'Chairperson is not assigned to any club.' });
      }
      clubId = chairperson.clubId;
      clubName = chairperson.clubName;
    }

    if (!clubId || !clubName) {
      return res.status(400).json({ message: 'Club selection is required.' });
    }

    const {
      eventName,
      eventDate,
      eventEndDate,
      eventTime,
      venue,
      category,
      categoryOthersSpecify,
      numberOfParticipants,
      studentCoordinator,
      studentCoordinatorReg,
      studentCoordinatorContact,
      outcome,
      reportFilePath, // Stores the drive/docx link from user
      facultyCoordinator,
      description,
      budgetUsed,
      isCollaboration,
      collaborationClubs
    } = req.body;

    if (!eventName || !eventDate || !eventEndDate || !eventTime || !venue || !category || !numberOfParticipants || !studentCoordinator || !studentCoordinatorContact || !outcome || !reportFilePath) {
      return res.status(400).json({ message: 'Please fill in all required fields.' });
    }

    const newReport = await db.reports.create({
      clubId,
      clubName,
      eventName,
      eventDate,
      eventEndDate,
      eventTime,
      venue,
      category,
      categoryOthersSpecify: category === 'Others' ? categoryOthersSpecify : '',
      reportFilePath, // Drive/document link
      numberOfParticipants: parseInt(numberOfParticipants, 10),
      facultyCoordinator: facultyCoordinator || '',
      studentCoordinator,
      studentCoordinatorReg: studentCoordinatorReg || 'N/A',
      studentCoordinatorContact,
      description: description || '',
      outcome,
      budgetUsed: budgetUsed ? parseFloat(budgetUsed) : 0,
      photos: [],
      status: 'Submitted Successfully',
      hasOD: false,
      isCollaboration: isCollaboration === true || isCollaboration === 'true',
      collaborationClubs: Array.isArray(collaborationClubs) ? collaborationClubs : [],
      submittedBy: req.user.id,
      reportUploadsCount: 1,
      odUploadsCount: 0
    });

    // Create notifications
    // 1. Admin notification
    await db.notifications.create({
      recipientRole: 'Admin',
      title: 'New Report Submitted',
      message: `Club "${clubName}" submitted a report for "${eventName}" conducted on ${eventDate}.`
    });

    // 2. Chairperson notification (in-app confirmation)
    await db.notifications.create({
      recipientRole: 'Chairperson',
      recipientId: req.user.id,
      title: 'Report Submitted Successfully',
      message: `Your report for "${eventName}" has been submitted successfully.`
    });

    res.status(201).json({
      message: 'Report submitted successfully.',
      report: newReport
    });
  } catch (error) {
    console.error('Submit report error:', error);
    res.status(500).json({ message: error.message || 'Server error submitting report.' });
  }
});

// GET /api/reports - Fetch reports (filtered for chairperson, full search/filter for admin)
router.get('/', verifyToken, async (req, res) => {
  try {
    const isChairperson = req.user.role === 'Chairperson';
    let filter = {};

    if (isChairperson) {
      const chairperson = await db.users.findById(req.user.id);
      filter.clubId = chairperson.clubId;
    }

    const reports = await db.reports.find(filter);
    res.json(reports);
  } catch (error) {
    console.error('Fetch reports error:', error);
    res.status(500).json({ message: 'Server error fetching reports.' });
  }
});

// GET /api/reports/:id - Fetch single report details
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const report = await db.reports.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ message: 'Report not found.' });
    }

    // Role check: Chairpersons can only access their own club's reports
    if (req.user.role === 'Chairperson') {
      const chairperson = await db.users.findById(req.user.id);
      if (report.clubId.toString() !== chairperson.clubId.toString()) {
        return res.status(403).json({ message: 'Access denied. You cannot view other clubs\' reports.' });
      }
    }

    res.json(report);
  } catch (error) {
    console.error('Fetch report detail error:', error);
    res.status(500).json({ message: 'Server error fetching report details.' });
  }
});

// PUT /api/reports/:id - Edit an Event Report
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const report = await db.reports.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ message: 'Report not found.' });
    }

    // Permissions check
    let reportUploadsCount = report.reportUploadsCount || 1;
    if (req.user.role === 'Chairperson') {
      const chairperson = await db.users.findById(req.user.id);
      if (report.clubId.toString() !== chairperson.clubId.toString()) {
        return res.status(403).json({ message: 'Access denied. You can only edit your own club\'s reports.' });
      }

      // Check upload limit
      if (reportUploadsCount >= 3) {
        return res.status(400).json({ message: 'Maximum upload/edit attempts reached (3/3) for this Event Report.' });
      }
      reportUploadsCount += 1;
    }

    const updatedReport = await db.reports.findByIdAndUpdate(req.params.id, {
      ...req.body,
      reportUploadsCount,
      numberOfParticipants: req.body.numberOfParticipants ? parseInt(req.body.numberOfParticipants, 10) : report.numberOfParticipants,
      budgetUsed: req.body.budgetUsed ? parseFloat(req.body.budgetUsed) : report.budgetUsed,
      isCollaboration: req.body.isCollaboration === true || req.body.isCollaboration === 'true',
      collaborationClubs: Array.isArray(req.body.collaborationClubs) ? req.body.collaborationClubs : []
    }, { new: true });

    res.json({ message: 'Report updated successfully.', report: updatedReport });
  } catch (error) {
    console.error('Update report error:', error);
    res.status(500).json({ message: 'Server error updating report.' });
  }
});

// DELETE /api/reports/:id - Delete an Event Report and its linked OD List
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const report = await db.reports.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ message: 'Report not found.' });
    }

    // Permissions check
    if (req.user.role === 'Chairperson') {
      const chairperson = await db.users.findById(req.user.id);
      if (report.clubId.toString() !== chairperson.clubId.toString()) {
        return res.status(403).json({ message: 'Access denied. You can only delete your own club\'s reports.' });
      }
    }

    // Delete linked OD list
    await db.ods.findOneAndDelete({ eventId: report.id || report._id });

    // Delete report
    await db.reports.findByIdAndDelete(req.params.id);

    res.json({ message: 'Report and linked OD list deleted successfully.' });
  } catch (error) {
    console.error('Delete report error:', error);
    res.status(500).json({ message: 'Server error deleting report.' });
  }
});

module.exports = router;
