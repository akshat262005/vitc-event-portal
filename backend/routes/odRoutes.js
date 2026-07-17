const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const xlsx = require('xlsx');
const { db } = require('../db');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

const UPLOADS_DIR = path.join(__dirname, '../uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    cb(null, `excel-${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.xlsx' || ext === '.xls') {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files (.xlsx, .xls) are allowed.'), false);
    }
  }
});

// GET /api/ods/unlocked-events - Get all submitted reports without an OD list
router.get('/unlocked-events', verifyToken, async (req, res) => {
  try {
    const isChairperson = req.user.role === 'Chairperson';
    let filter = { hasOD: false };

    if (isChairperson) {
      const chairperson = await db.users.findById(req.user.id);
      filter.clubId = chairperson.clubId;
    }

    const reports = await db.reports.find(filter);
    res.json(reports);
  } catch (error) {
    console.error('Fetch unlocked events error:', error);
    res.status(500).json({ message: 'Server error fetching unlocked events.' });
  }
});

// GET /api/ods/unlocked-pre-events - Get all submitted pre-event operations without an OD list
router.get('/unlocked-pre-events', verifyToken, async (req, res) => {
  try {
    const isChairperson = req.user.role === 'Chairperson';
    let filter = { hasOD: false };

    if (isChairperson) {
      const chairperson = await db.users.findById(req.user.id);
      filter.clubId = chairperson.clubId;
    }

    const preEvents = await db.preEventOperations.find(filter);
    res.json(preEvents);
  } catch (error) {
    console.error('Fetch unlocked pre-events error:', error);
    res.status(500).json({ message: 'Server error fetching unlocked pre-events.' });
  }
});

// GET /api/ods/template - Download sample Excel template
router.get('/template', (req, res) => {
  try {
    const wb = xlsx.utils.book_new();
    const headers = ['Registration Number', 'Student Name', 'Date', 'Time'];
    const sampleRows = [
      ['21BCE0001', 'Akash Sharma', '2026-07-14', '09:00 AM - 12:00 PM'],
      ['21BCE0002', 'Priya Nair', '2026-07-14', '09:00 AM - 12:00 PM'],
      ['22BEC0015', 'Rahul Varma', '2026-07-14', '02:00 PM - 05:00 PM'],
      ['23BME0104', 'Sneha Sen', '2026-07-14', '09:00 AM - 05:00 PM']
    ];
    const wsData = [headers, ...sampleRows];
    const ws = xlsx.utils.aoa_to_sheet(wsData);

    // Set column widths for better design
    ws['!cols'] = [
      { wch: 22 }, // Reg Number
      { wch: 25 }, // Name
      { wch: 15 }, // Date
      { wch: 25 }  // Time
    ];

    xlsx.utils.book_append_sheet(wb, ws, 'OD_Template');
    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=VITC_OD_Template.xlsx');
    res.send(buffer);
  } catch (error) {
    console.error('Generate template error:', error);
    res.status(500).json({ message: 'Failed to generate Excel template.' });
  }
});

// POST /api/ods/parse-excel - Upload and parse student list from Excel
router.post('/parse-excel', verifyToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Excel file is required.' });
    }

    const filePath = req.file.path;
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rawData = xlsx.utils.sheet_to_json(worksheet);

    // Clean up uploaded file
    fs.unlink(filePath, (err) => {
      if (err) console.error('Error deleting temp excel:', err);
    });

    if (rawData.length === 0) {
      return res.status(400).json({ message: 'The Excel file is empty.' });
    }

    // Map sheet headers to student fields (flexible headers)
    const students = [];
    const duplicatesInFile = new Set();
    const seenRegNumbers = new Set();

    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i];
      // Normalize keys (case insensitive, trim spaces)
      const normalizedRow = {};
      Object.keys(row).forEach(k => {
        normalizedRow[k.trim().toLowerCase()] = row[k];
      });

      const regNo = (normalizedRow['registration number'] || normalizedRow['reg no'] || normalizedRow['regno'] || normalizedRow['registration_number'] || '').toString().trim().toUpperCase();
      const name = (normalizedRow['student name'] || normalizedRow['name'] || normalizedRow['student_name'] || '').toString().trim();
      const date = (normalizedRow['date'] || normalizedRow['event date'] || normalizedRow['start date'] || '').toString().trim();
      const time = (normalizedRow['time'] || normalizedRow['event time'] || normalizedRow['time slot'] || '').toString().trim();

      if (!regNo || !name || !date || !time) {
        return res.status(400).json({
          message: `Validation error at row ${i + 2}: All fields (Registration Number, Student Name, Date, Time) are required and must be valid.`
        });
      }

      if (seenRegNumbers.has(regNo)) {
        duplicatesInFile.add(regNo);
      }
      seenRegNumbers.add(regNo);

      students.push({
        registrationNumber: regNo,
        studentName: name,
        date,
        time
      });
    }

    if (duplicatesInFile.size > 0) {
      return res.status(400).json({
        message: `Duplicate registration numbers found in the Excel file: ${Array.from(duplicatesInFile).join(', ')}`,
        duplicates: Array.from(duplicatesInFile)
      });
    }

    res.json({ students });
  } catch (error) {
    console.error('Parse Excel error:', error);
    res.status(500).json({ message: error.message || 'Server error parsing Excel file.' });
  }
});

// POST /api/ods - Submit final OD List for an event
router.post('/', verifyToken, async (req, res) => {
  const { eventId, students, requestType = 'post_event' } = req.body;
  const timeSlot = req.body.timeSlot || 'Individual Slot';

  if (!eventId || !students || !Array.isArray(students) || students.length === 0) {
    return res.status(400).json({ message: 'Event selection and Student list are required.' });
  }

  try {
    let clubId, clubName, eventName, eventDate, currentOdCount;

    if (requestType === 'pre_event') {
      const preEvent = await db.preEventOperations.findById(eventId);
      if (!preEvent) {
        return res.status(404).json({ message: 'Corresponding pre-event operation not found.' });
      }

      if (preEvent.hasOD) {
        return res.status(400).json({ message: 'OD list has already been uploaded for this pre-event operation.' });
      }

      currentOdCount = preEvent.odUploadsCount || 0;
      if (currentOdCount >= 3) {
        return res.status(400).json({ message: 'Maximum upload/edit attempts reached (3/3) for the student OD list of this pre-event operation.' });
      }

      if (req.user.role === 'Chairperson') {
        const chairperson = await db.users.findById(req.user.id);
        if (preEvent.clubId.toString() !== chairperson.clubId.toString()) {
          return res.status(403).json({ message: 'Access denied. You cannot upload OD lists for other clubs.' });
        }
      }

      clubId = preEvent.clubId;
      clubName = preEvent.clubName;
      eventName = preEvent.eventName;
      eventDate = preEvent.odRequiredDate || preEvent.eventDate;
    } else {
      const eventReport = await db.reports.findById(eventId);
      if (!eventReport) {
        return res.status(404).json({ message: 'Corresponding event report not found.' });
      }

      if (eventReport.hasOD) {
        return res.status(400).json({ message: 'OD list has already been uploaded for this event.' });
      }

      currentOdCount = eventReport.odUploadsCount || 0;
      if (currentOdCount >= 3) {
        return res.status(400).json({ message: 'Maximum upload/edit attempts reached (3/3) for the student OD list of this event.' });
      }

      if (req.user.role === 'Chairperson') {
        const chairperson = await db.users.findById(req.user.id);
        if (eventReport.clubId.toString() !== chairperson.clubId.toString()) {
          return res.status(403).json({ message: 'Access denied. You cannot upload OD lists for other clubs.' });
        }
      }

      clubId = eventReport.clubId;
      clubName = eventReport.clubName;
      eventName = eventReport.eventName;
      eventDate = eventReport.eventDate;
    }

    // 2. Validate duplicate registration numbers in incoming payload
    const seenRegs = new Set();
    const duplicates = [];
    students.forEach(student => {
      const reg = student.registrationNumber.trim().toUpperCase();
      if (seenRegs.has(reg)) {
        duplicates.push(reg);
      }
      seenRegs.add(reg);
    });

    if (duplicates.length > 0) {
      return res.status(400).json({
        message: `Duplicate student registration numbers submitted: ${Array.from(new Set(duplicates)).join(', ')}`
      });
    }

    // 3. Create OD List
    const mappedStudents = students.map(s => ({
      registrationNumber: s.registrationNumber.trim().toUpperCase(),
      studentName: s.studentName.trim(),
      date: s.date.trim(),
      time: s.time.trim()
    }));

    const newODList = await db.ods.create({
      eventId,
      requestType,
      clubId,
      clubName,
      eventName,
      eventDate,
      timeSlot: 'N/A', // Deprecated
      students: mappedStudents,
      verificationStatus: 'pending',
      totalStudents: mappedStudents.length,
      completedStudents: 0,
      remainingStudents: mappedStudents.length,
      adminRemarks: '',
      resubmissionCount: 0,
      currentVersion: 1,
      versions: [{
        version: 1,
        students: mappedStudents,
        uploadedAt: new Date()
      }]
    });

    // 4. Update parent record's hasOD status and increment uploads count
    if (requestType === 'pre_event') {
      await db.preEventOperations.findByIdAndUpdate(eventId, {
        hasOD: true,
        odUploadsCount: currentOdCount + 1
      });
    } else {
      await db.reports.findByIdAndUpdate(eventId, { 
        hasOD: true,
        odUploadsCount: currentOdCount + 1
      });
    }

    // 5. Generate notifications
    // Admin notification
    await db.notifications.create({
      recipientRole: 'Admin',
      title: 'New OD Uploaded',
      message: `Club "${clubName}" uploaded OD list for "${eventName}" (${students.length} students).`
    });

    // Chairperson notification
    await db.notifications.create({
      recipientRole: 'Chairperson',
      recipientId: req.user.id,
      title: 'OD Uploaded Successfully',
      message: `OD list for "${eventName}" uploaded successfully.`
    });

    res.status(201).json({
      message: 'OD List submitted successfully.',
      odList: newODList
    });
  } catch (error) {
    console.error('Submit OD list error:', error);
    res.status(500).json({ message: error.message || 'Server error submitting OD list.' });
  }
});

// GET /api/ods - Get all OD lists (filtered for Chairperson, complete for Admin)
router.get('/', verifyToken, async (req, res) => {
  try {
    const isChairperson = req.user.role === 'Chairperson';
    let filter = {};

    if (isChairperson) {
      const chairperson = await db.users.findById(req.user.id);
      filter.clubId = chairperson.clubId;
    }

    const ods = await db.ods.find(filter);
    res.json(ods);
  } catch (error) {
    console.error('Fetch OD lists error:', error);
    res.status(500).json({ message: 'Server error fetching OD lists.' });
  }
});

// GET /api/ods/:id - Fetch single OD list details
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const od = await db.ods.findById(req.params.id);
    if (!od) {
      return res.status(404).json({ message: 'OD list not found.' });
    }

    if (req.user.role === 'Chairperson') {
      const chairperson = await db.users.findById(req.user.id);
      if (od.clubId.toString() !== chairperson.clubId.toString()) {
        return res.status(403).json({ message: 'Access denied. You cannot view other clubs\' OD lists.' });
      }
    }

    res.json(od);
  } catch (error) {
    console.error('Fetch OD list detail error:', error);
    res.status(500).json({ message: 'Server error fetching OD list details.' });
  }
});

// PUT /api/ods/:id/verify - Verify an OD list (Admin only)
router.put('/:id/verify', verifyToken, async (req, res) => {
  if (req.user.role !== 'Admin') {
    return res.status(403).json({ message: 'Access denied. Admin only.' });
  }

  const { verificationStatus, completedStudents, adminRemarks } = req.body;
  
  if (!['pending', 'fully_updated', 'partially_updated'].includes(verificationStatus)) {
    return res.status(400).json({ message: 'Invalid verification status.' });
  }

  try {
    const odList = await db.ods.findById(req.params.id);
    if (!odList) {
      return res.status(404).json({ message: 'OD list not found.' });
    }

    let completed = 0;
    const total = odList.totalStudents !== undefined ? odList.totalStudents : (odList.students ? odList.students.length : 0);
    let remaining = total;
    let remarks = adminRemarks || '';

    if (verificationStatus === 'fully_updated' || verificationStatus === 'partially_updated') {
      completed = completedStudents !== undefined ? parseInt(completedStudents, 10) : total;
      if (isNaN(completed) || completed < 0 || completed > total) {
        return res.status(400).json({ message: `Completed students must be a number between 0 and ${total}.` });
      }
      remaining = total - completed;
      if (!remarks.trim()) {
        return res.status(400).json({ message: 'Remarks are required for verification.' });
      }
    } else {
      // Revert to pending
      completed = 0;
      remaining = total;
      remarks = '';
    }

    const updatedOD = await db.ods.findByIdAndUpdate(req.params.id, {
      verificationStatus,
      totalStudents: total,
      completedStudents: completed,
      remainingStudents: remaining,
      adminRemarks: remarks,
      verifiedBy: req.user.id,
      verifiedAt: new Date()
    }, { new: true });

    // Create notifications for Chairperson of the club
    const chairpersons = await db.users.find({ role: 'Chairperson', clubId: odList.clubId });
    for (const cp of chairpersons) {
      await db.notifications.create({
        recipientRole: 'Chairperson',
        recipientId: cp.id || cp._id,
        title: 'OD List Verification Status Updated',
        message: `Admin updated verification status for "${odList.eventName}" to: ${verificationStatus.replace('_', ' ').toUpperCase()}`
      });
    }

    res.json({ message: 'Verification status saved successfully.', odList: updatedOD });
  } catch (error) {
    console.error('Verify OD list error:', error);
    res.status(500).json({ message: 'Server error verifying OD list.' });
  }
});

// PUT /api/ods/:id/resubmit - Resubmit corrected student list (Chairperson only)
router.put('/:id/resubmit', verifyToken, async (req, res) => {
  if (req.user.role !== 'Chairperson') {
    return res.status(403).json({ message: 'Access denied. Chairpersons only.' });
  }

  const { students } = req.body;
  if (!students || !Array.isArray(students) || students.length === 0) {
    return res.status(400).json({ message: 'Corrected student list is required.' });
  }

  try {
    const odList = await db.ods.findById(req.params.id);
    if (!odList) {
      return res.status(404).json({ message: 'OD list not found.' });
    }

    const chairperson = await db.users.findById(req.user.id);
    if (odList.clubId.toString() !== chairperson.clubId.toString()) {
      return res.status(403).json({ message: 'Access denied. You can only resubmit OD lists for your own club.' });
    }

    // Only allow resubmission if status is partially_updated
    if (odList.verificationStatus !== 'partially_updated') {
      return res.status(400).json({ message: 'Resubmission is only allowed for OD lists marked as Partially Updated.' });
    }

    // Check upload limit using the linked report/pre-event request
    if (odList.requestType === 'pre_event') {
      const preEvent = await db.preEventOperations.findById(odList.eventId);
      if (preEvent) {
        const currentOdCount = preEvent.odUploadsCount || 1;
        if (currentOdCount >= 3) {
          return res.status(400).json({ message: 'Maximum upload/edit attempts reached (3/3) for the student OD list of this pre-event operation.' });
        }
        await db.preEventOperations.findByIdAndUpdate(odList.eventId, { 
          odUploadsCount: currentOdCount + 1 
        });
      }
    } else {
      const eventReport = await db.reports.findById(odList.eventId);
      if (eventReport) {
        const currentOdCount = eventReport.odUploadsCount || 1;
        if (currentOdCount >= 3) {
          return res.status(400).json({ message: 'Maximum upload/edit attempts reached (3/3) for the student OD list of this event.' });
        }
        await db.reports.findByIdAndUpdate(odList.eventId, { 
          odUploadsCount: currentOdCount + 1 
        });
      }
    }

    const cleanedStudents = students.map(s => ({
      registrationNumber: s.registrationNumber.trim().toUpperCase(),
      studentName: s.studentName.trim(),
      date: s.date.trim(),
      time: s.time.trim()
    }));

    // Validate duplicate registration numbers in incoming payload
    const seenRegs = new Set();
    const duplicates = [];
    cleanedStudents.forEach(student => {
      const reg = student.registrationNumber;
      if (seenRegs.has(reg)) {
        duplicates.push(reg);
      }
      seenRegs.add(reg);
    });

    if (duplicates.length > 0) {
      return res.status(400).json({
        message: `Duplicate student registration numbers submitted: ${Array.from(new Set(duplicates)).join(', ')}`
      });
    }

    const nextVersion = (odList.currentVersion || 1) + 1;
    const nextResubCount = (odList.resubmissionCount || 0) + 1;

    // Push new version
    const updatedVersions = odList.versions ? [...odList.versions] : [];
    updatedVersions.push({
      version: nextVersion,
      students: cleanedStudents,
      uploadedAt: new Date()
    });

    const updatedOD = await db.ods.findByIdAndUpdate(req.params.id, {
      students: cleanedStudents,
      verificationStatus: 'pending', // Revert to pending
      totalStudents: cleanedStudents.length,
      completedStudents: 0,
      remainingStudents: cleanedStudents.length,
      resubmissionCount: nextResubCount,
      currentVersion: nextVersion,
      versions: updatedVersions
    }, { new: true });

    // Create notifications for Admin
    await db.notifications.create({
      recipientRole: 'Admin',
      title: 'OD List Resubmitted',
      message: `Club "${odList.clubName}" resubmitted corrected OD list (version ${nextVersion}) for "${odList.eventName}" (${cleanedStudents.length} students).`
    });

    res.json({ message: 'Corrected OD list resubmitted successfully.', odList: updatedOD });
  } catch (error) {
    console.error('Resubmit OD list error:', error);
    res.status(500).json({ message: 'Server error resubmitting corrected OD list.' });
  }
});

// PUT /api/ods/:id - Edit an OD list
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const od = await db.ods.findById(req.params.id);
    if (!od) {
      return res.status(404).json({ message: 'OD list not found.' });
    }

    // Check role/permissions
    if (req.user.role === 'Chairperson') {
      const chairperson = await db.users.findById(req.user.id);
      if (od.clubId.toString() !== chairperson.clubId.toString()) {
        return res.status(403).json({ message: 'Access denied. You can only edit your own club\'s OD lists.' });
      }
    }

    const { students } = req.body;
    if (!students || !Array.isArray(students) || students.length === 0) {
      return res.status(400).json({ message: 'Student list is required.' });
    }

    const updatedOD = await db.ods.findByIdAndUpdate(req.params.id, {
      students: students.map(s => ({
        registrationNumber: s.registrationNumber.trim().toUpperCase(),
        studentName: s.studentName.trim(),
        date: s.date.trim(),
        time: s.time.trim()
      }))
    }, { new: true });

    res.json({ message: 'OD list updated successfully.', odList: updatedOD });
  } catch (error) {
    console.error('Update OD list error:', error);
    res.status(500).json({ message: 'Server error updating OD list.' });
  }
});

// DELETE /api/ods/:id - Delete an OD list
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const od = await db.ods.findById(req.params.id);
    if (!od) {
      return res.status(404).json({ message: 'OD list not found.' });
    }

    // Check role/permissions
    if (req.user.role === 'Chairperson') {
      const chairperson = await db.users.findById(req.user.id);
      if (od.clubId.toString() !== chairperson.clubId.toString()) {
        return res.status(403).json({ message: 'Access denied. You can only delete your own club\'s OD lists.' });
      }
    }

    // Reset hasOD on corresponding report/pre-event operation
    if (od.requestType === 'pre_event') {
      await db.preEventOperations.findByIdAndUpdate(od.eventId, { hasOD: false });
    } else {
      await db.reports.findByIdAndUpdate(od.eventId, { hasOD: false });
    }

    // Delete OD list
    await db.ods.findByIdAndDelete(req.params.id);

    res.json({ message: 'OD list deleted successfully.' });
  } catch (error) {
    console.error('Delete OD list error:', error);
    res.status(500).json({ message: 'Server error deleting OD list.' });
  }
});

module.exports = router;
