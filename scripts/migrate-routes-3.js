const fs = require('fs');
const path = require('path');

function write(filePath, content) {
  const abs = path.join(process.cwd(), filePath);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content);
  console.log('wrote', filePath);
}

write('app/api/ods/unlocked-events/route.js', `import { NextResponse } from 'next/server';
import { db, connectDB } from '@/lib/db';
import { getAuthUser, jsonError } from '@/lib/auth';

export async function GET(request) {
  const auth = getAuthUser(request);
  if (auth.error) return auth.error;

  try {
    await connectDB();
    let filter = { hasOD: false };
    if (auth.user.role === 'Chairperson') {
      const chairperson = await db.users.findById(auth.user.id);
      filter.clubId = chairperson.clubId;
    }
    const reports = await db.reports.find(filter);
    return NextResponse.json(reports);
  } catch (error) {
    console.error('Fetch unlocked events error:', error);
    return jsonError('Server error fetching unlocked events.', 500);
  }
}
`);

write('app/api/ods/unlocked-pre-events/route.js', `import { NextResponse } from 'next/server';
import { db, connectDB } from '@/lib/db';
import { getAuthUser, jsonError } from '@/lib/auth';

export async function GET(request) {
  const auth = getAuthUser(request);
  if (auth.error) return auth.error;

  try {
    await connectDB();
    let filter = { hasOD: false };
    if (auth.user.role === 'Chairperson') {
      const chairperson = await db.users.findById(auth.user.id);
      filter.clubId = chairperson.clubId;
    }
    const preEvents = await db.preEventOperations.find(filter);
    return NextResponse.json(preEvents);
  } catch (error) {
    console.error('Fetch unlocked pre-events error:', error);
    return jsonError('Server error fetching unlocked pre-events.', 500);
  }
}
`);

write('app/api/ods/template/route.js', `import { NextResponse } from 'next/server';
import xlsx from 'xlsx';
import { jsonError } from '@/lib/auth';

export async function GET() {
  try {
    const wb = xlsx.utils.book_new();
    const headers = ['Registration Number', 'Student Name', 'Date', 'Time'];
    const sampleRows = [
      ['21BCE0001', 'Akash Sharma', '2026-07-14', '09:00 AM - 12:00 PM'],
      ['21BCE0002', 'Priya Nair', '2026-07-14', '09:00 AM - 12:00 PM'],
      ['22BEC0015', 'Rahul Varma', '2026-07-14', '02:00 PM - 05:00 PM'],
      ['23BME0104', 'Sneha Sen', '2026-07-14', '09:00 AM - 05:00 PM'],
    ];
    const ws = xlsx.utils.aoa_to_sheet([headers, ...sampleRows]);
    ws['!cols'] = [{ wch: 22 }, { wch: 25 }, { wch: 15 }, { wch: 25 }];
    xlsx.utils.book_append_sheet(wb, ws, 'OD_Template');
    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename=VITC_OD_Template.xlsx',
      },
    });
  } catch (error) {
    console.error('Generate template error:', error);
    return jsonError('Failed to generate Excel template.', 500);
  }
}
`);

write('app/api/ods/parse-excel/route.js', `import { NextResponse } from 'next/server';
import xlsx from 'xlsx';
import { getAuthUser, jsonError } from '@/lib/auth';
import { connectDB } from '@/lib/db';

/**
 * Parses Excel from multipart FormData in-memory (no disk write).
 * TODO: If large files must be persisted, use Vercel Blob instead of fs.writeFileSync.
 */
export async function POST(request) {
  const auth = getAuthUser(request);
  if (auth.error) return auth.error;

  try {
    await connectDB();
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || typeof file === 'string') {
      return jsonError('Excel file is required.', 400);
    }

    const originalName = file.name || '';
    const ext = originalName.toLowerCase().slice(originalName.lastIndexOf('.'));
    if (ext !== '.xlsx' && ext !== '.xls') {
      return jsonError('Only Excel files (.xlsx, .xls) are allowed.', 400);
    }

    // In-memory parse — no fs.writeFileSync (not durable on Vercel)
    console.log('[parse-excel] Parsing Excel in memory (no local FS upload). Cloud storage (Vercel Blob) required for persistent uploads.');
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rawData = xlsx.utils.sheet_to_json(worksheet);

    if (rawData.length === 0) {
      return jsonError('The Excel file is empty.', 400);
    }

    const students = [];
    const duplicatesInFile = new Set();
    const seenRegNumbers = new Set();

    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i];
      const normalizedRow = {};
      Object.keys(row).forEach((k) => {
        normalizedRow[k.trim().toLowerCase()] = row[k];
      });

      const regNo = (
        normalizedRow['registration number'] ||
        normalizedRow['reg no'] ||
        normalizedRow['regno'] ||
        normalizedRow['registration_number'] ||
        ''
      )
        .toString()
        .trim()
        .toUpperCase();
      const name = (
        normalizedRow['student name'] ||
        normalizedRow['name'] ||
        normalizedRow['student_name'] ||
        ''
      )
        .toString()
        .trim();
      const date = (
        normalizedRow['date'] ||
        normalizedRow['event date'] ||
        normalizedRow['start date'] ||
        ''
      )
        .toString()
        .trim();
      const time = (
        normalizedRow['time'] ||
        normalizedRow['event time'] ||
        normalizedRow['time slot'] ||
        ''
      )
        .toString()
        .trim();

      if (!regNo || !name || !date || !time) {
        return jsonError(
          \`Validation error at row \${i + 2}: All fields (Registration Number, Student Name, Date, Time) are required and must be valid.\`,
          400
        );
      }

      if (seenRegNumbers.has(regNo)) duplicatesInFile.add(regNo);
      seenRegNumbers.add(regNo);

      students.push({
        registrationNumber: regNo,
        studentName: name,
        date,
        time,
      });
    }

    if (duplicatesInFile.size > 0) {
      return NextResponse.json(
        {
          message: \`Duplicate registration numbers found in the Excel file: \${Array.from(duplicatesInFile).join(', ')}\`,
          duplicates: Array.from(duplicatesInFile),
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ students });
  } catch (error) {
    console.error('Parse Excel error:', error);
    return jsonError(error.message || 'Server error parsing Excel file.', 500);
  }
}
`);

write('app/api/ods/route.js', `import { NextResponse } from 'next/server';
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
    const ods = await db.ods.find(filter);
    return NextResponse.json(ods);
  } catch (error) {
    console.error('Fetch OD lists error:', error);
    return jsonError('Server error fetching OD lists.', 500);
  }
}

export async function POST(request) {
  const auth = getAuthUser(request);
  if (auth.error) return auth.error;

  try {
    await connectDB();
    const body = await request.json();
    const { eventId, students, requestType = 'post_event' } = body;

    if (!eventId || !students || !Array.isArray(students) || students.length === 0) {
      return jsonError('Event selection and Student list are required.', 400);
    }

    let clubId, clubName, eventName, eventDate, currentOdCount;

    if (requestType === 'pre_event') {
      const preEvent = await db.preEventOperations.findById(eventId);
      if (!preEvent) return jsonError('Corresponding pre-event operation not found.', 404);
      if (preEvent.hasOD) {
        return jsonError('OD list has already been uploaded for this pre-event operation.', 400);
      }
      currentOdCount = preEvent.odUploadsCount || 0;
      if (currentOdCount >= 3) {
        return jsonError(
          'Maximum upload/edit attempts reached (3/3) for the student OD list of this pre-event operation.',
          400
        );
      }
      if (auth.user.role === 'Chairperson') {
        const chairperson = await db.users.findById(auth.user.id);
        if (preEvent.clubId.toString() !== chairperson.clubId.toString()) {
          return jsonError('Access denied. You cannot upload OD lists for other clubs.', 403);
        }
      }
      clubId = preEvent.clubId;
      clubName = preEvent.clubName;
      eventName = preEvent.eventName;
      eventDate = preEvent.odRequiredDate || preEvent.eventDate;
    } else {
      const eventReport = await db.reports.findById(eventId);
      if (!eventReport) return jsonError('Corresponding event report not found.', 404);
      if (eventReport.hasOD) {
        return jsonError('OD list has already been uploaded for this event.', 400);
      }
      currentOdCount = eventReport.odUploadsCount || 0;
      if (currentOdCount >= 3) {
        return jsonError(
          'Maximum upload/edit attempts reached (3/3) for the student OD list of this event.',
          400
        );
      }
      if (auth.user.role === 'Chairperson') {
        const chairperson = await db.users.findById(auth.user.id);
        if (eventReport.clubId.toString() !== chairperson.clubId.toString()) {
          return jsonError('Access denied. You cannot upload OD lists for other clubs.', 403);
        }
      }
      clubId = eventReport.clubId;
      clubName = eventReport.clubName;
      eventName = eventReport.eventName;
      eventDate = eventReport.eventDate;
    }

    const seenRegs = new Set();
    const duplicates = [];
    students.forEach((student) => {
      const reg = student.registrationNumber.trim().toUpperCase();
      if (seenRegs.has(reg)) duplicates.push(reg);
      seenRegs.add(reg);
    });
    if (duplicates.length > 0) {
      return jsonError(
        \`Duplicate student registration numbers submitted: \${Array.from(new Set(duplicates)).join(', ')}\`,
        400
      );
    }

    const mappedStudents = students.map((s) => ({
      registrationNumber: s.registrationNumber.trim().toUpperCase(),
      studentName: s.studentName.trim(),
      date: s.date.trim(),
      time: s.time.trim(),
    }));

    const newODList = await db.ods.create({
      eventId,
      requestType,
      clubId,
      clubName,
      eventName,
      eventDate,
      timeSlot: 'N/A',
      students: mappedStudents,
      verificationStatus: 'pending',
      totalStudents: mappedStudents.length,
      completedStudents: 0,
      remainingStudents: mappedStudents.length,
      adminRemarks: '',
      resubmissionCount: 0,
      currentVersion: 1,
      versions: [{ version: 1, students: mappedStudents, uploadedAt: new Date() }],
    });

    if (requestType === 'pre_event') {
      await db.preEventOperations.findByIdAndUpdate(eventId, {
        hasOD: true,
        odUploadsCount: currentOdCount + 1,
      });
    } else {
      await db.reports.findByIdAndUpdate(eventId, {
        hasOD: true,
        odUploadsCount: currentOdCount + 1,
      });
    }

    await db.notifications.create({
      recipientRole: 'Admin',
      title: 'New OD Uploaded',
      message: \`Club "\${clubName}" uploaded OD list for "\${eventName}" (\${students.length} students).\`,
    });
    await db.notifications.create({
      recipientRole: 'Chairperson',
      recipientId: auth.user.id,
      title: 'OD Uploaded Successfully',
      message: \`OD list for "\${eventName}" uploaded successfully.\`,
    });

    return NextResponse.json(
      { message: 'OD List submitted successfully.', odList: newODList },
      { status: 201 }
    );
  } catch (error) {
    console.error('Submit OD list error:', error);
    return jsonError(error.message || 'Server error submitting OD list.', 500);
  }
}
`);

write('app/api/ods/[id]/route.js', `import { NextResponse } from 'next/server';
import { db, connectDB } from '@/lib/db';
import { getAuthUser, jsonError } from '@/lib/auth';

export async function GET(request, { params }) {
  const auth = getAuthUser(request);
  if (auth.error) return auth.error;

  try {
    await connectDB();
    const { id } = await params;
    const od = await db.ods.findById(id);
    if (!od) return jsonError('OD list not found.', 404);

    if (auth.user.role === 'Chairperson') {
      const chairperson = await db.users.findById(auth.user.id);
      if (od.clubId.toString() !== chairperson.clubId.toString()) {
        return jsonError("Access denied. You cannot view other clubs' OD lists.", 403);
      }
    }

    return NextResponse.json(od);
  } catch (error) {
    console.error('Fetch OD list detail error:', error);
    return jsonError('Server error fetching OD list details.', 500);
  }
}

export async function PUT(request, { params }) {
  const auth = getAuthUser(request);
  if (auth.error) return auth.error;

  try {
    await connectDB();
    const { id } = await params;
    const body = await request.json();
    const od = await db.ods.findById(id);
    if (!od) return jsonError('OD list not found.', 404);

    if (auth.user.role === 'Chairperson') {
      const chairperson = await db.users.findById(auth.user.id);
      if (od.clubId.toString() !== chairperson.clubId.toString()) {
        return jsonError("Access denied. You can only edit your own club's OD lists.", 403);
      }
    }

    const { students } = body;
    if (!students || !Array.isArray(students) || students.length === 0) {
      return jsonError('Student list is required.', 400);
    }

    const updatedOD = await db.ods.findByIdAndUpdate(id, {
      students: students.map((s) => ({
        registrationNumber: s.registrationNumber.trim().toUpperCase(),
        studentName: s.studentName.trim(),
        date: s.date.trim(),
        time: s.time.trim(),
      })),
    });

    return NextResponse.json({ message: 'OD list updated successfully.', odList: updatedOD });
  } catch (error) {
    console.error('Update OD list error:', error);
    return jsonError('Server error updating OD list.', 500);
  }
}

export async function DELETE(request, { params }) {
  const auth = getAuthUser(request);
  if (auth.error) return auth.error;

  try {
    await connectDB();
    const { id } = await params;
    const od = await db.ods.findById(id);
    if (!od) return jsonError('OD list not found.', 404);

    if (auth.user.role === 'Chairperson') {
      const chairperson = await db.users.findById(auth.user.id);
      if (od.clubId.toString() !== chairperson.clubId.toString()) {
        return jsonError("Access denied. You can only delete your own club's OD lists.", 403);
      }
    }

    if (od.requestType === 'pre_event') {
      await db.preEventOperations.findByIdAndUpdate(od.eventId, { hasOD: false });
    } else {
      await db.reports.findByIdAndUpdate(od.eventId, { hasOD: false });
    }

    await db.ods.findByIdAndDelete(id);
    return NextResponse.json({ message: 'OD list deleted successfully.' });
  } catch (error) {
    console.error('Delete OD list error:', error);
    return jsonError('Server error deleting OD list.', 500);
  }
}
`);

write('app/api/ods/[id]/verify/route.js', `import { NextResponse } from 'next/server';
import { db, connectDB } from '@/lib/db';
import { getAuthUser, jsonError } from '@/lib/auth';

export async function PUT(request, { params }) {
  const auth = getAuthUser(request);
  if (auth.error) return auth.error;
  if (auth.user.role !== 'Admin') {
    return jsonError('Access denied. Admin only.', 403);
  }

  try {
    await connectDB();
    const { id } = await params;
    const body = await request.json();
    const { verificationStatus, completedStudents, adminRemarks } = body;

    if (!['pending', 'fully_updated', 'partially_updated'].includes(verificationStatus)) {
      return jsonError('Invalid verification status.', 400);
    }

    const odList = await db.ods.findById(id);
    if (!odList) return jsonError('OD list not found.', 404);

    let completed = 0;
    const total =
      odList.totalStudents !== undefined
        ? odList.totalStudents
        : odList.students
          ? odList.students.length
          : 0;
    let remaining = total;
    let remarks = adminRemarks || '';

    if (verificationStatus === 'fully_updated' || verificationStatus === 'partially_updated') {
      completed = completedStudents !== undefined ? parseInt(completedStudents, 10) : total;
      if (isNaN(completed) || completed < 0 || completed > total) {
        return jsonError(\`Completed students must be a number between 0 and \${total}.\`, 400);
      }
      remaining = total - completed;
      if (!remarks.trim()) {
        return jsonError('Remarks are required for verification.', 400);
      }
    } else {
      completed = 0;
      remaining = total;
      remarks = '';
    }

    const updatedOD = await db.ods.findByIdAndUpdate(id, {
      verificationStatus,
      totalStudents: total,
      completedStudents: completed,
      remainingStudents: remaining,
      adminRemarks: remarks,
      verifiedBy: auth.user.id,
      verifiedAt: new Date(),
    });

    const chairpersons = await db.users.find({ role: 'Chairperson', clubId: odList.clubId });
    for (const cp of chairpersons) {
      await db.notifications.create({
        recipientRole: 'Chairperson',
        recipientId: cp.id || cp._id,
        title: 'OD List Verification Status Updated',
        message: \`Admin updated verification status for "\${odList.eventName}" to: \${verificationStatus.replace('_', ' ').toUpperCase()}\`,
      });
    }

    return NextResponse.json({
      message: 'Verification status saved successfully.',
      odList: updatedOD,
    });
  } catch (error) {
    console.error('Verify OD list error:', error);
    return jsonError('Server error verifying OD list.', 500);
  }
}
`);

write('app/api/ods/[id]/resubmit/route.js', `import { NextResponse } from 'next/server';
import { db, connectDB } from '@/lib/db';
import { getAuthUser, jsonError } from '@/lib/auth';

export async function PUT(request, { params }) {
  const auth = getAuthUser(request);
  if (auth.error) return auth.error;
  if (auth.user.role !== 'Chairperson') {
    return jsonError('Access denied. Chairpersons only.', 403);
  }

  try {
    await connectDB();
    const { id } = await params;
    const body = await request.json();
    const { students } = body;

    if (!students || !Array.isArray(students) || students.length === 0) {
      return jsonError('Corrected student list is required.', 400);
    }

    const odList = await db.ods.findById(id);
    if (!odList) return jsonError('OD list not found.', 404);

    const chairperson = await db.users.findById(auth.user.id);
    if (odList.clubId.toString() !== chairperson.clubId.toString()) {
      return jsonError('Access denied. You can only resubmit OD lists for your own club.', 403);
    }

    if (odList.verificationStatus !== 'partially_updated') {
      return jsonError(
        'Resubmission is only allowed for OD lists marked as Partially Updated.',
        400
      );
    }

    if (odList.requestType === 'pre_event') {
      const preEvent = await db.preEventOperations.findById(odList.eventId);
      if (preEvent) {
        const currentOdCount = preEvent.odUploadsCount || 1;
        if (currentOdCount >= 3) {
          return jsonError(
            'Maximum upload/edit attempts reached (3/3) for the student OD list of this pre-event operation.',
            400
          );
        }
        await db.preEventOperations.findByIdAndUpdate(odList.eventId, {
          odUploadsCount: currentOdCount + 1,
        });
      }
    } else {
      const eventReport = await db.reports.findById(odList.eventId);
      if (eventReport) {
        const currentOdCount = eventReport.odUploadsCount || 1;
        if (currentOdCount >= 3) {
          return jsonError(
            'Maximum upload/edit attempts reached (3/3) for the student OD list of this event.',
            400
          );
        }
        await db.reports.findByIdAndUpdate(odList.eventId, {
          odUploadsCount: currentOdCount + 1,
        });
      }
    }

    const cleanedStudents = students.map((s) => ({
      registrationNumber: s.registrationNumber.trim().toUpperCase(),
      studentName: s.studentName.trim(),
      date: s.date.trim(),
      time: s.time.trim(),
    }));

    const seenRegs = new Set();
    const duplicates = [];
    cleanedStudents.forEach((student) => {
      if (seenRegs.has(student.registrationNumber)) duplicates.push(student.registrationNumber);
      seenRegs.add(student.registrationNumber);
    });
    if (duplicates.length > 0) {
      return jsonError(
        \`Duplicate student registration numbers submitted: \${Array.from(new Set(duplicates)).join(', ')}\`,
        400
      );
    }

    const nextVersion = (odList.currentVersion || 1) + 1;
    const nextResubCount = (odList.resubmissionCount || 0) + 1;
    const updatedVersions = odList.versions ? [...odList.versions] : [];
    updatedVersions.push({
      version: nextVersion,
      students: cleanedStudents,
      uploadedAt: new Date(),
    });

    const updatedOD = await db.ods.findByIdAndUpdate(id, {
      students: cleanedStudents,
      verificationStatus: 'pending',
      totalStudents: cleanedStudents.length,
      completedStudents: 0,
      remainingStudents: cleanedStudents.length,
      resubmissionCount: nextResubCount,
      currentVersion: nextVersion,
      versions: updatedVersions,
    });

    await db.notifications.create({
      recipientRole: 'Admin',
      title: 'OD List Resubmitted',
      message: \`Club "\${odList.clubName}" resubmitted corrected OD list (version \${nextVersion}) for "\${odList.eventName}" (\${cleanedStudents.length} students).\`,
    });

    return NextResponse.json({
      message: 'Corrected OD list resubmitted successfully.',
      odList: updatedOD,
    });
  } catch (error) {
    console.error('Resubmit OD list error:', error);
    return jsonError('Server error resubmitting corrected OD list.', 500);
  }
}
`);

console.log('Phase 3 OD API routes done');
