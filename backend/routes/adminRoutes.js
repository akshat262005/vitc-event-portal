const express = require('express');
const path = require('path');
const fs = require('fs');
const archiver = require('archiver');
const xlsx = require('xlsx');
const { db } = require('../db');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Enforce admin permission for all endpoints in this router
router.use(verifyToken, requireRole('Admin'));

// GET /api/admin/stats - Statistics and graphs data
router.get('/stats', async (req, res) => {
  try {
    const clubs = await db.clubs.find({});
    const chairpersons = await db.users.find({ role: 'Chairperson' });
    const reports = await db.reports.find({});
    const ods = await db.ods.find({});

    const totalClubs = clubs.length;
    const totalChairpersons = chairpersons.length;
    const totalReports = reports.length;
    const totalODLists = ods.length;

    // Events This Month (YYYY-MM-DD format check)
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = String(today.getMonth() + 1).padStart(2, '0');
    const monthPrefix = `${currentYear}-${currentMonth}`; // e.g. "2026-07"

    const eventsThisMonth = reports.filter(r => r.eventDate && r.eventDate.startsWith(monthPrefix)).length;

    // Graph Data 1: Monthly Events (group by YYYY-MM)
    const monthlyGroups = {};
    reports.forEach(r => {
      if (r.eventDate && r.eventDate.length >= 7) {
        const month = r.eventDate.substring(0, 7); // "YYYY-MM"
        monthlyGroups[month] = (monthlyGroups[month] || 0) + 1;
      }
    });
    // Format monthly data for charts (last 6 months sorting or general sorting)
    const monthlyEvents = Object.keys(monthlyGroups)
      .sort()
      .map(month => ({
        name: month, // label
        count: monthlyGroups[month]
      }));

    // Graph Data 2: Category-wise events
    const categoryGroups = {};
    reports.forEach(r => {
      const cat = r.category || 'Others';
      categoryGroups[cat] = (categoryGroups[cat] || 0) + 1;
    });
    const categoryEvents = Object.keys(categoryGroups).map(cat => ({
      name: cat,
      count: categoryGroups[cat]
    }));

    // Graph Data 3: Club-wise events
    const clubGroups = {};
    reports.forEach(r => {
      const clubName = r.clubName || 'Unknown Club';
      clubGroups[clubName] = (clubGroups[clubName] || 0) + 1;
    });
    const clubEvents = Object.keys(clubGroups).map(club => ({
      name: club,
      count: clubGroups[club]
    }));

    res.json({
      cards: {
        totalClubs,
        totalChairpersons,
        totalReports,
        totalODLists,
        eventsThisMonth
      },
      charts: {
        monthlyEvents,
        categoryEvents,
        clubEvents
      }
    });
  } catch (error) {
    console.error('Fetch stats error:', error);
    res.status(500).json({ message: 'Server error loading stats.' });
  }
});

// GET /api/admin/daily-view - Get reports and corresponding ODs for a specific date
router.get('/daily-view', async (req, res) => {
  const { date } = req.query; // Format: YYYY-MM-DD
  if (!date) {
    return res.status(400).json({ message: 'Date parameter (YYYY-MM-DD) is required.' });
  }

  try {
    const reports = await db.reports.find({ eventDate: date });
    const ods = await db.ods.find({ eventDate: date });

    res.json({ reports, ods });
  } catch (error) {
    console.error('Daily view fetch error:', error);
    res.status(500).json({ message: 'Server error loading daily view data.' });
  }
});

// GET /api/admin/daily-bundle - Download zipped event reports and a consolidated OD Excel for a date
router.get('/daily-bundle', async (req, res) => {
  const { date } = req.query;
  if (!date) {
    return res.status(400).json({ message: 'Date parameter is required.' });
  }

  try {
    const reports = await db.reports.find({ eventDate: date });
    const ods = await db.ods.find({ eventDate: date });

    if (reports.length === 0 && ods.length === 0) {
      return res.status(404).json({ message: 'No events or OD lists found for this date.' });
    }

    // Set up archiving stream
    const archive = archiver('zip', { zlib: { level: 9 } });
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename=VITC_Daily_Bundle_${date}.zip`);
    archive.pipe(res);

    // 1. Add Report PDF/DOCX files or collect drive links in the ZIP
    const driveLinks = [];
    reports.forEach(report => {
      if (report.reportFilePath) {
        if (report.reportFilePath.startsWith('http://') || report.reportFilePath.startsWith('https://')) {
          driveLinks.push(`Club: ${report.clubName}\nEvent: ${report.eventName}\nDuration: ${report.eventDate} to ${report.eventEndDate}\nLink: ${report.reportFilePath}\n\n`);
        } else {
          // Resolve absolute filepath
          const relativePath = report.reportFilePath.replace(/^\/uploads\//, '');
          const absolutePath = path.join(__dirname, '../uploads', relativePath);
          
          if (fs.existsSync(absolutePath)) {
            const extension = path.extname(absolutePath);
            const sanitizedClub = report.clubName.replace(/[^a-z0-9]/gi, '_');
            const sanitizedEvent = report.eventName.replace(/[^a-z0-9]/gi, '_');
            const fileNameInZip = `Reports/${sanitizedClub}_${sanitizedEvent}${extension}`;
            archive.file(absolutePath, { name: fileNameInZip });
          }
        }
      }
    });

    if (driveLinks.length > 0) {
      const linksContent = `VIT CHENNAI EVENT REPORTS - GOOGLE DRIVE/DOCUMENT LINKS\nDate: ${date}\n============================================================\n\n` + driveLinks.join('');
      archive.append(linksContent, { name: `Consolidated_Report_Drive_Links_${date}.txt` });
    }

    // 2. Generate a single Consolidated Excel workbook for all OD lists on this date
    if (ods.length > 0) {
      const wb = xlsx.utils.book_new();
      
      ods.forEach(od => {
        const sheetData = od.students.map(s => ({
          'Registration Number': s.registrationNumber,
          'Student Name': s.studentName,
          'Date': s.date,
          'Time': s.time
        }));

        const ws = xlsx.utils.json_to_sheet(sheetData);
        ws['!cols'] = [
          { wch: 22 }, // Reg
          { wch: 25 }, // Name
          { wch: 15 }, // Date
          { wch: 25 }  // Time
        ];

        const sanitizedEvent = od.eventName.substring(0, 25).replace(/[^a-z0-9]/gi, '_');
        xlsx.utils.book_append_sheet(wb, ws, sanitizedEvent || 'OD_List');
      });

      const excelBuffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
      archive.append(excelBuffer, { name: `Consolidated_ODs_${date}.xlsx` });
    }

    archive.finalize();
  } catch (error) {
    console.error('Generate daily bundle error:', error);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Server error generating daily bundle.' });
    }
  }
});

module.exports = router;
