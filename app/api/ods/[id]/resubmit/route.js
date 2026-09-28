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

    const cleanedStudents = sortODStudents(students.map((s) => ({
      registrationNumber: s.registrationNumber.trim().toUpperCase(),
      studentName: s.studentName.trim(),
      date: s.date.trim(),
      time: s.time.trim(),
    })));

    const seenKeys = new Set();
    const duplicates = [];
    cleanedStudents.forEach((student) => {
      const reg = student.registrationNumber;
      const dateVal = student.date;
      const timeVal = student.time;
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
      message: `Club "${odList.clubName}" resubmitted corrected OD list (version ${nextVersion}) for "${odList.eventName}" (${cleanedStudents.length} students).`,
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
