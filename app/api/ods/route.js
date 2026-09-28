import { NextResponse } from 'next/server';
import { db, connectDB } from '@/lib/db';
import { getAuthUser, jsonError } from '@/lib/auth';
import { sortODStudents } from '@/lib/od-utils';

const validateODTimeFormatAndBounds = (timeStr) => {
  const trimmedStr = timeStr.trim();
  const odTimeRegex = /^(0?[1-9]|1[0-2]):([0-5][0-9])\s*(AM|PM)\s*-\s*(0?[1-9]|1[0-2]):([0-5][0-9])\s*(AM|PM)$/i;
  const match = trimmedStr.match(odTimeRegex);
  if (!match) {
    return {
      isValid: false,
      message: 'Time must be in "hh:mm AM/PM - hh:mm AM/PM" format (e.g., "09:00 AM - 12:00 PM").'
    };
  }

  const startHour = parseInt(match[1], 10);
  const startMin = parseInt(match[2], 10);
  const startAMPM = match[3].toUpperCase();

  const endHour = parseInt(match[4], 10);
  const endMin = parseInt(match[5], 10);
  const endAMPM = match[6].toUpperCase();

  const convertToMinutes = (hour, min, ampm) => {
    let h = hour;
    if (ampm === 'PM' && h < 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;
    return h * 60 + min;
  };

  const startMinutes = convertToMinutes(startHour, startMin, startAMPM);
  const endMinutes = convertToMinutes(endHour, endMin, endAMPM);

  const minBound = 8 * 60; // 8:00 AM
  const maxBound = 19 * 60 + 30; // 7:30 PM

  if (startMinutes < minBound || startMinutes > maxBound) {
    return {
      isValid: false,
      message: `Start time (${trimmedStr.split('-')[0].trim()}) must be between 08:00 AM and 07:30 PM.`
    };
  }

  if (endMinutes < minBound || endMinutes > maxBound) {
    return {
      isValid: false,
      message: `End time (${trimmedStr.split('-')[1].trim()}) must be between 08:00 AM and 07:30 PM.`
    };
  }

  if (startMinutes >= endMinutes) {
    return {
      isValid: false,
      message: 'Start time must be before end time.'
    };
  }

  return { isValid: true };
};

const validateODDateFormat = (dateStr) => {
  const trimmedStr = dateStr.trim();
  const odDateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!odDateRegex.test(trimmedStr)) {
    return {
      isValid: false,
      message: 'Date must be in "YYYY-MM-DD" format (e.g., "2026-08-28").'
    };
  }

  const [year, month, day] = trimmedStr.split('-').map(Number);
  const dateObj = new Date(year, month - 1, day);
  if (
    dateObj.getFullYear() !== year ||
    dateObj.getMonth() !== month - 1 ||
    dateObj.getDate() !== day
  ) {
    return {
      isValid: false,
      message: 'Date is invalid (e.g., month > 12 or day > 31).'
    };
  }

  return { isValid: true };
};


export async function GET(request) {
  const auth = getAuthUser(request);
  if (auth.error) return auth.error;

  try {
    await connectDB();

    const normalizeOD = (od) => {
      const total = od.totalStudents !== undefined ? od.totalStudents : (od.students?.length || 0);
      const completed = od.completedStudents || 0;
      const remaining = od.remainingStudents !== undefined ? od.remainingStudents : Math.max(0, total - completed);
      const sortedStudents = od.students ? sortODStudents(od.students) : [];
      if (total > 0 && (completed >= total || remaining === 0)) {
        return { ...od, students: sortedStudents, verificationStatus: 'fully_updated', remainingStudents: 0 };
      }
      return { ...od, students: sortedStudents };
    };

    if (auth.user.role === 'Chairperson') {
      const chairperson = await db.users.findById(auth.user.id);
      if (!chairperson) return jsonError('User not found.', 404);

      const collabReports = await db.reports.find(
        { isCollaboration: true, collaborationClubs: chairperson.clubName },
        { _id: 1, id: 1 }
      );
      const collabEventIds = collabReports.map(r => r.id || r._id).filter(Boolean);
      const collabEventIdStrings = collabEventIds.map(id => id.toString());
      const allCollabIds = [...new Set([...collabEventIds, ...collabEventIdStrings])];

      const ods = await db.ods.find({
        $or: [
          { clubId: chairperson.clubId },
          { eventId: { $in: allCollabIds } }
        ]
      });
      return NextResponse.json(ods.map(normalizeOD));
    } else {
      const ods = await db.ods.find({});
      return NextResponse.json(ods.map(normalizeOD));
    }
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
        const reportClubId = eventReport.clubId?._id ? eventReport.clubId._id.toString() : eventReport.clubId.toString();
        const chairpersonClubId = chairperson.clubId?._id ? chairperson.clubId._id.toString() : chairperson.clubId.toString();
        if (reportClubId !== chairpersonClubId) {
          return jsonError('Access denied. You cannot upload OD lists for other clubs.', 403);
        }
      }
      clubId = eventReport.clubId;
      clubName = eventReport.clubName;
      eventName = eventReport.eventName;
      eventDate = eventReport.eventDate;
    }

    const seenKeys = new Set();
    const duplicates = [];
    students.forEach((student) => {
      const reg = student.registrationNumber.trim().toUpperCase();
      const dateVal = String(student.date).trim();
      const timeVal = String(student.time).trim();
      const key = `${reg}_${dateVal}_${timeVal}`;
      if (seenKeys.has(key)) {
        duplicates.push(`${reg} on ${dateVal} at ${timeVal}`);
      }
      seenKeys.add(key);
    });
    if (duplicates.length > 0) {
      return jsonError(
        `Duplicate student entries for the same date and time slot found: ${Array.from(new Set(duplicates)).join(', ')}`,
        400
      );
    }

    for (const s of students) {
      const dateVal = validateODDateFormat(s.date);
      if (!dateVal.isValid) {
        return jsonError(`Invalid date for student ${s.registrationNumber || ''}: ${dateVal.message}`, 400);
      }
      const timeVal = validateODTimeFormatAndBounds(s.time);
      if (!timeVal.isValid) {
        return jsonError(`Invalid time slot for student ${s.registrationNumber || ''}: ${timeVal.message}`, 400);
      }
    }

    const mappedStudents = sortODStudents(students.map((s) => ({
      registrationNumber: s.registrationNumber.trim().toUpperCase(),
      studentName: s.studentName.trim(),
      date: s.date.trim(),
      time: s.time.trim(),
    })));

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
      message: `Club "${clubName}" uploaded OD list for "${eventName}" (${students.length} students).`,
    });
    await db.notifications.create({
      recipientRole: 'Chairperson',
      recipientId: auth.user.id,
      title: 'OD Uploaded Successfully',
      message: `OD list for "${eventName}" uploaded successfully.`,
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
