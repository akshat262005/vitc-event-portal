const fs = require('fs');
const path = require('path');

function write(filePath, content) {
  const abs = path.join(process.cwd(), filePath);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content);
  console.log('wrote', filePath);
}

write('app/api/reports/route.js', `import { NextResponse } from 'next/server';
import { db, connectDB } from '@/lib/db';
import { getAuthUser, jsonError } from '@/lib/auth';

export async function GET(request) {
  const auth = getAuthUser(request);
  if (auth.error) return auth.error;

  try {
    await connectDB();
    let filter = {};
    if (auth.user.role === 'Chairperson') {
      const chairperson = await db.users.findById(auth.user.id);
      filter.clubId = chairperson.clubId;
    }
    const reports = await db.reports.find(filter);
    return NextResponse.json(reports);
  } catch (error) {
    console.error('Fetch reports error:', error);
    return jsonError('Server error fetching reports.', 500);
  }
}

export async function POST(request) {
  const auth = getAuthUser(request);
  if (auth.error) return auth.error;

  try {
    await connectDB();
    const body = await request.json();
    const isChairperson = auth.user.role === 'Chairperson';
    let clubId = body.clubId;
    let clubName = body.clubName;

    if (isChairperson) {
      const chairperson = await db.users.findById(auth.user.id);
      if (!chairperson || !chairperson.clubId) {
        return jsonError('Chairperson is not assigned to any club.', 400);
      }
      clubId = chairperson.clubId;
      clubName = chairperson.clubName;
    }

    if (!clubId || !clubName) {
      return jsonError('Club selection is required.', 400);
    }

    const {
      eventName, eventDate, eventEndDate, eventTime, venue, category,
      categoryOthersSpecify, numberOfParticipants, studentCoordinator,
      studentCoordinatorReg, studentCoordinatorContact, outcome, reportFilePath,
      facultyCoordinator, description, budgetUsed, isCollaboration, collaborationClubs,
    } = body;

    if (!eventName || !eventDate || !eventEndDate || !eventTime || !venue || !category ||
        !numberOfParticipants || !studentCoordinator || !studentCoordinatorContact ||
        !outcome || !reportFilePath) {
      return jsonError('Please fill in all required fields.', 400);
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
      reportFilePath,
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
      submittedBy: auth.user.id,
      reportUploadsCount: 1,
      odUploadsCount: 0,
    });

    await db.notifications.create({
      recipientRole: 'Admin',
      title: 'New Report Submitted',
      message: \`Club "\${clubName}" submitted a report for "\${eventName}" conducted on \${eventDate}.\`,
    });
    await db.notifications.create({
      recipientRole: 'Chairperson',
      recipientId: auth.user.id,
      title: 'Report Submitted Successfully',
      message: \`Your report for "\${eventName}" has been submitted successfully.\`,
    });

    return NextResponse.json(
      { message: 'Report submitted successfully.', report: newReport },
      { status: 201 }
    );
  } catch (error) {
    console.error('Submit report error:', error);
    return jsonError(error.message || 'Server error submitting report.', 500);
  }
}
`);

write('app/api/reports/[id]/route.js', `import { NextResponse } from 'next/server';
import { db, connectDB } from '@/lib/db';
import { getAuthUser, jsonError } from '@/lib/auth';

export async function GET(request, { params }) {
  const auth = getAuthUser(request);
  if (auth.error) return auth.error;

  try {
    await connectDB();
    const { id } = await params;
    const report = await db.reports.findById(id);
    if (!report) return jsonError('Report not found.', 404);

    if (auth.user.role === 'Chairperson') {
      const chairperson = await db.users.findById(auth.user.id);
      if (report.clubId.toString() !== chairperson.clubId.toString()) {
        return jsonError("Access denied. You cannot view other clubs' reports.", 403);
      }
    }

    return NextResponse.json(report);
  } catch (error) {
    console.error('Fetch report detail error:', error);
    return jsonError('Server error fetching report details.', 500);
  }
}

export async function PUT(request, { params }) {
  const auth = getAuthUser(request);
  if (auth.error) return auth.error;

  try {
    await connectDB();
    const { id } = await params;
    const body = await request.json();
    const report = await db.reports.findById(id);
    if (!report) return jsonError('Report not found.', 404);

    let reportUploadsCount = report.reportUploadsCount || 1;
    if (auth.user.role === 'Chairperson') {
      const chairperson = await db.users.findById(auth.user.id);
      if (report.clubId.toString() !== chairperson.clubId.toString()) {
        return jsonError("Access denied. You can only edit your own club's reports.", 403);
      }
      if (reportUploadsCount >= 3) {
        return jsonError('Maximum upload/edit attempts reached (3/3) for this Event Report.', 400);
      }
      reportUploadsCount += 1;
    }

    const updatedReport = await db.reports.findByIdAndUpdate(id, {
      ...body,
      reportUploadsCount,
      numberOfParticipants: body.numberOfParticipants
        ? parseInt(body.numberOfParticipants, 10)
        : report.numberOfParticipants,
      budgetUsed: body.budgetUsed ? parseFloat(body.budgetUsed) : report.budgetUsed,
      isCollaboration: body.isCollaboration === true || body.isCollaboration === 'true',
      collaborationClubs: Array.isArray(body.collaborationClubs) ? body.collaborationClubs : [],
    });

    return NextResponse.json({ message: 'Report updated successfully.', report: updatedReport });
  } catch (error) {
    console.error('Update report error:', error);
    return jsonError('Server error updating report.', 500);
  }
}

export async function DELETE(request, { params }) {
  const auth = getAuthUser(request);
  if (auth.error) return auth.error;

  try {
    await connectDB();
    const { id } = await params;
    const report = await db.reports.findById(id);
    if (!report) return jsonError('Report not found.', 404);

    if (auth.user.role === 'Chairperson') {
      const chairperson = await db.users.findById(auth.user.id);
      if (report.clubId.toString() !== chairperson.clubId.toString()) {
        return jsonError("Access denied. You can only delete your own club's reports.", 403);
      }
    }

    const eventId = report.id || report._id;
    const linkedOd = await db.ods.findOne({ eventId: eventId?.toString?.() || eventId });
    if (linkedOd) {
      await db.ods.findByIdAndDelete(linkedOd.id || linkedOd._id);
    }

    await db.reports.findByIdAndDelete(id);
    return NextResponse.json({ message: 'Report and linked OD list deleted successfully.' });
  } catch (error) {
    console.error('Delete report error:', error);
    return jsonError('Server error deleting report.', 500);
  }
}
`);

write('app/api/notifications/route.js', `import { NextResponse } from 'next/server';
import { db, connectDB } from '@/lib/db';
import { getAuthUser, jsonError } from '@/lib/auth';

export async function GET(request) {
  const auth = getAuthUser(request);
  if (auth.error) return auth.error;

  try {
    await connectDB();
    let filter = {};
    if (auth.user.role === 'Chairperson') {
      filter = { recipientRole: 'Chairperson', recipientId: auth.user.id };
    } else {
      filter = { recipientRole: 'Admin' };
    }
    const notifications = await db.notifications.find(filter);
    return NextResponse.json(notifications);
  } catch (error) {
    console.error('Fetch notifications error:', error);
    return jsonError('Server error fetching notifications.', 500);
  }
}
`);

write('app/api/notifications/read-all/route.js', `import { NextResponse } from 'next/server';
import { db, connectDB } from '@/lib/db';
import { getAuthUser, jsonError } from '@/lib/auth';

export async function PUT(request) {
  const auth = getAuthUser(request);
  if (auth.error) return auth.error;

  try {
    await connectDB();
    let filter = {};
    if (auth.user.role === 'Chairperson') {
      filter = { recipientRole: 'Chairperson', recipientId: auth.user.id };
    } else {
      filter = { recipientRole: 'Admin' };
    }
    await db.notifications.markAllAsRead(filter);
    return NextResponse.json({ message: 'All notifications marked as read.' });
  } catch (error) {
    console.error('Read all notifications error:', error);
    return jsonError('Server error updating notifications.', 500);
  }
}
`);

write('app/api/pre-events/route.js', `import { NextResponse } from 'next/server';
import { db, connectDB } from '@/lib/db';
import { getAuthUser, jsonError } from '@/lib/auth';

export async function GET(request) {
  const auth = getAuthUser(request);
  if (auth.error) return auth.error;

  try {
    await connectDB();
    let filter = {};
    if (auth.user.role === 'Chairperson') {
      const chairperson = await db.users.findById(auth.user.id);
      filter.clubId = chairperson.clubId;
    }
    const list = await db.preEventOperations.find(filter);
    return NextResponse.json(list);
  } catch (error) {
    console.error('Fetch pre-event operations error:', error);
    return jsonError('Server error fetching pre-event operations list.', 500);
  }
}

export async function POST(request) {
  const auth = getAuthUser(request);
  if (auth.error) return auth.error;
  if (auth.user.role !== 'Chairperson') {
    return jsonError('Access denied. Chairpersons only.', 403);
  }

  try {
    await connectDB();
    const body = await request.json();
    const {
      eventName, eventDate, odRequiredDate, eventCategory, eventCategoryOthersSpecify,
      facultyCoordinator, studentCoordinator, studentCoordinatorContact, purpose,
    } = body;

    if (!eventName || !eventDate || !odRequiredDate || !eventCategory || !facultyCoordinator ||
        !studentCoordinator || !studentCoordinatorContact || !purpose) {
      return jsonError('All fields are required.', 400);
    }
    if (!purpose.trim()) return jsonError('Purpose is mandatory.', 400);
    if (!/^\\d{10}$/.test(studentCoordinatorContact.trim())) {
      return jsonError('Student Coordinator Contact Number must be a valid 10-digit number.', 400);
    }
    if (new Date(odRequiredDate) > new Date(eventDate)) {
      return jsonError('OD Required Date cannot be after the Actual Event Date.', 400);
    }

    const chairperson = await db.users.findById(auth.user.id);
    if (!chairperson || !chairperson.clubId) {
      return jsonError('Chairperson does not have an assigned club.', 400);
    }

    const club = await db.clubs.findById(chairperson.clubId.toString());
    const clubName = club ? club.name : chairperson.clubName || 'Unknown Club';

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
      submittedBy: auth.user.id,
    });

    await db.notifications.create({
      recipientRole: 'Admin',
      title: 'New Pre-Event Operation Request',
      message: \`Club "\${clubName}" submitted a pre-event operation request for "\${eventName}".\`,
    });

    return NextResponse.json(
      { message: 'Pre-Event Operation request submitted successfully!', operation: newOperation },
      { status: 201 }
    );
  } catch (error) {
    console.error('Submit pre-event operation error:', error);
    return jsonError(error.message || 'Server error submitting pre-event operation.', 500);
  }
}
`);

write('app/api/pre-events/[id]/route.js', `import { NextResponse } from 'next/server';
import { db, connectDB } from '@/lib/db';
import { getAuthUser, jsonError } from '@/lib/auth';

export async function GET(request, { params }) {
  const auth = getAuthUser(request);
  if (auth.error) return auth.error;

  try {
    await connectDB();
    const { id } = await params;
    const op = await db.preEventOperations.findById(id);
    if (!op) return jsonError('Pre-Event Operation request not found.', 404);

    if (auth.user.role === 'Chairperson') {
      const chairperson = await db.users.findById(auth.user.id);
      if (op.clubId.toString() !== chairperson.clubId.toString()) {
        return jsonError('Access denied. You cannot view requests for other clubs.', 403);
      }
    }

    return NextResponse.json(op);
  } catch (error) {
    console.error('Fetch pre-event operation details error:', error);
    return jsonError('Server error fetching details.', 500);
  }
}
`);

write('app/api/pre-events/[id]/status/route.js', `import { NextResponse } from 'next/server';
import { db, connectDB } from '@/lib/db';
import { getAuthUser, requireRole, jsonError } from '@/lib/auth';

export async function PUT(request, { params }) {
  const auth = getAuthUser(request);
  if (auth.error) return auth.error;
  const roleErr = requireRole(auth.user, 'Admin');
  if (roleErr) return roleErr;

  try {
    await connectDB();
    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    if (!['Pending', 'Approved', 'Rejected'].includes(status)) {
      return jsonError('Invalid status. Must be Pending, Approved, or Rejected.', 400);
    }

    const op = await db.preEventOperations.findById(id);
    if (!op) return jsonError('Pre-Event Operation request not found.', 404);

    const updatedOp = await db.preEventOperations.findByIdAndUpdate(id, { status });

    await db.notifications.create({
      recipientRole: 'Chairperson',
      recipientId: op.submittedBy,
      title: 'Pre-Event Operation Status Updated',
      message: \`Admin updated status of pre-event request for "\${op.eventName}" to: \${status}.\`,
    });

    return NextResponse.json({
      message: \`Pre-Event request status updated to \${status} successfully.\`,
      operation: updatedOp,
    });
  } catch (error) {
    console.error('Update pre-event operation status error:', error);
    return jsonError('Server error updating status.', 500);
  }
}
`);

write('app/api/admin/stats/route.js', `import { NextResponse } from 'next/server';
import { db, connectDB } from '@/lib/db';
import { getAuthUser, requireRole, jsonError } from '@/lib/auth';

export async function GET(request) {
  const auth = getAuthUser(request);
  if (auth.error) return auth.error;
  const roleErr = requireRole(auth.user, 'Admin');
  if (roleErr) return roleErr;

  try {
    await connectDB();
    const clubs = await db.clubs.find({});
    const chairpersons = await db.users.find({ role: 'Chairperson' });
    const reports = await db.reports.find({});
    const ods = await db.ods.find({});

    const today = new Date();
    const monthPrefix = \`\${today.getFullYear()}-\${String(today.getMonth() + 1).padStart(2, '0')}\`;
    const eventsThisMonth = reports.filter((r) => r.eventDate && r.eventDate.startsWith(monthPrefix)).length;

    const monthlyGroups = {};
    reports.forEach((r) => {
      if (r.eventDate && r.eventDate.length >= 7) {
        const month = r.eventDate.substring(0, 7);
        monthlyGroups[month] = (monthlyGroups[month] || 0) + 1;
      }
    });
    const monthlyEvents = Object.keys(monthlyGroups).sort().map((month) => ({
      name: month,
      count: monthlyGroups[month],
    }));

    const categoryGroups = {};
    reports.forEach((r) => {
      const cat = r.category || 'Others';
      categoryGroups[cat] = (categoryGroups[cat] || 0) + 1;
    });
    const categoryEvents = Object.keys(categoryGroups).map((cat) => ({
      name: cat,
      count: categoryGroups[cat],
    }));

    const clubGroups = {};
    reports.forEach((r) => {
      const clubName = r.clubName || 'Unknown Club';
      clubGroups[clubName] = (clubGroups[clubName] || 0) + 1;
    });
    const clubEvents = Object.keys(clubGroups).map((club) => ({
      name: club,
      count: clubGroups[club],
    }));

    let totalCompletedStudents = 0;
    let totalRemainingStudents = 0;
    ods.forEach((o) => {
      totalCompletedStudents += o.completedStudents || 0;
      totalRemainingStudents +=
        o.remainingStudents !== undefined ? o.remainingStudents : o.students ? o.students.length : 0;
    });

    return NextResponse.json({
      cards: {
        totalClubs: clubs.length,
        totalChairpersons: chairpersons.length,
        totalReports: reports.length,
        totalODLists: ods.length,
        eventsThisMonth,
        pendingVerification: ods.filter((o) => o.verificationStatus === 'pending' || !o.verificationStatus).length,
        fullyUpdated: ods.filter((o) => o.verificationStatus === 'fully_updated').length,
        partiallyUpdated: ods.filter((o) => o.verificationStatus === 'partially_updated').length,
        totalCompletedStudents,
        totalRemainingStudents,
      },
      charts: { monthlyEvents, categoryEvents, clubEvents },
    });
  } catch (error) {
    console.error('Fetch stats error:', error);
    return jsonError('Server error loading stats.', 500);
  }
}
`);

write('app/api/admin/daily-view/route.js', `import { NextResponse } from 'next/server';
import { db, connectDB } from '@/lib/db';
import { getAuthUser, requireRole, jsonError } from '@/lib/auth';

export async function GET(request) {
  const auth = getAuthUser(request);
  if (auth.error) return auth.error;
  const roleErr = requireRole(auth.user, 'Admin');
  if (roleErr) return roleErr;

  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  if (!date) return jsonError('Date parameter (YYYY-MM-DD) is required.', 400);

  try {
    await connectDB();
    const reports = await db.reports.find({ eventDate: date });
    const ods = await db.ods.find({ eventDate: date });
    return NextResponse.json({ reports, ods });
  } catch (error) {
    console.error('Daily view fetch error:', error);
    return jsonError('Server error loading daily view data.', 500);
  }
}
`);

write('app/api/admin/daily-bundle/route.js', `import { NextResponse } from 'next/server';
import archiver from 'archiver';
import xlsx from 'xlsx';
import { db, connectDB } from '@/lib/db';
import { getAuthUser, requireRole, jsonError } from '@/lib/auth';

/**
 * Builds ZIP in-memory (no disk writes) for Vercel serverless.
 * Local report file paths are skipped — Drive links are included as text.
 * TODO: Move binary report storage to Vercel Blob / S3 when file uploads return.
 */
export async function GET(request) {
  const auth = getAuthUser(request);
  if (auth.error) return auth.error;
  const roleErr = requireRole(auth.user, 'Admin');
  if (roleErr) return roleErr;

  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  if (!date) return jsonError('Date parameter is required.', 400);

  try {
    await connectDB();
    const reports = await db.reports.find({ eventDate: date });
    const ods = await db.ods.find({ eventDate: date });

    if (reports.length === 0 && ods.length === 0) {
      return jsonError('No events or OD lists found for this date.', 404);
    }

    const chunks = [];
    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.on('data', (chunk) => chunks.push(chunk));

    const done = new Promise((resolve, reject) => {
      archive.on('end', resolve);
      archive.on('error', reject);
    });

    const driveLinks = [];
    reports.forEach((report) => {
      if (report.reportFilePath) {
        if (
          report.reportFilePath.startsWith('http://') ||
          report.reportFilePath.startsWith('https://')
        ) {
          driveLinks.push(
            \`Club: \${report.clubName}\\nEvent: \${report.eventName}\\nDuration: \${report.eventDate} to \${report.eventEndDate}\\nLink: \${report.reportFilePath}\\n\\n\`
          );
        } else {
          // Local FS uploads are not available on Vercel serverless
          console.log(
            '[daily-bundle] Skipping local file path (use Vercel Blob):',
            report.reportFilePath
          );
        }
      }
    });

    if (driveLinks.length > 0) {
      const linksContent =
        \`VIT CHENNAI EVENT REPORTS - GOOGLE DRIVE/DOCUMENT LINKS\\nDate: \${date}\\n============================================================\\n\\n\` +
        driveLinks.join('');
      archive.append(linksContent, { name: \`Consolidated_Report_Drive_Links_\${date}.txt\` });
    }

    if (ods.length > 0) {
      const wb = xlsx.utils.book_new();
      ods.forEach((od) => {
        const sheetData = od.students.map((s) => ({
          'Registration Number': s.registrationNumber,
          'Student Name': s.studentName,
          Date: s.date,
          Time: s.time,
        }));
        const ws = xlsx.utils.json_to_sheet(sheetData);
        ws['!cols'] = [{ wch: 22 }, { wch: 25 }, { wch: 15 }, { wch: 25 }];
        const sanitizedEvent = od.eventName.substring(0, 25).replace(/[^a-z0-9]/gi, '_');
        xlsx.utils.book_append_sheet(wb, ws, sanitizedEvent || 'OD_List');
      });
      const excelBuffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
      archive.append(excelBuffer, { name: \`Consolidated_ODs_\${date}.xlsx\` });
    }

    await archive.finalize();
    await done;

    const buffer = Buffer.concat(chunks);
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': \`attachment; filename=VITC_Daily_Bundle_\${date}.zip\`,
      },
    });
  } catch (error) {
    console.error('Generate daily bundle error:', error);
    return jsonError('Server error generating daily bundle.', 500);
  }
}
`);

console.log('Phase 2 API routes done');
