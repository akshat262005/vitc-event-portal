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
      const odClubId = od.clubId?._id ? od.clubId._id.toString() : od.clubId.toString();
      let allowed = odClubId === chairperson.clubId.toString();
      if (!allowed && od.requestType !== 'pre_event') {
        const report = await db.reports.findById(od.eventId);
        if (report && report.isCollaboration && report.collaborationClubs && report.collaborationClubs.includes(chairperson.clubName)) {
          allowed = true;
        }
      }
      if (!allowed) {
        return jsonError("Access denied. You cannot view other clubs' OD lists.", 403);
      }
    }

    const sortedStudents = od.students ? sortODStudents(od.students) : [];
    const responseData = typeof od.toObject === 'function' ? od.toObject() : { ...od };
    responseData.students = sortedStudents;
    return NextResponse.json(responseData);
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
      const odClubId = od.clubId?._id ? od.clubId._id.toString() : od.clubId.toString();
      if (odClubId !== chairperson.clubId.toString()) {
        return jsonError("Access denied. You can only edit your own club's OD lists.", 403);
      }
    }

    const { students } = body;
    if (!students || !Array.isArray(students) || students.length === 0) {
      return jsonError('Student list is required.', 400);
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

    const isLockedVerified = od.verificationStatus === 'fully_updated' || od.verificationStatus === 'missed_od_added';
    let newVerificationStatus = od.verificationStatus;
    let newTotal = mappedStudents.length;
    let newRemaining = od.remainingStudents;

    if (isLockedVerified) {
      // Ensure all original students are still present
      const originalStudents = od.students || [];
      const mappedKeys = new Set(mappedStudents.map(s => `${s.registrationNumber}_${s.date}_${s.time}`));
      
      const missingOriginal = originalStudents.find(
        os => !mappedKeys.has(`${os.registrationNumber.toUpperCase()}_${os.date}_${os.time}`)
      );

      if (missingOriginal) {
        return jsonError(
          `This OD list has been verified by Admin. Existing student (${missingOriginal.registrationNumber}) cannot be modified or deleted. You may only add more students.`,
          400
        );
      }

      // Check if new students were appended
      if (mappedStudents.length > originalStudents.length) {
        newVerificationStatus = 'missed_od_added';
        newTotal = mappedStudents.length;
        const completed = od.completedStudents || 0;
        newRemaining = Math.max(0, newTotal - completed);

        // Notify Admins
        try {
          const admins = await db.users.find({ role: 'Admin' });
          for (const adm of admins) {
            await db.notifications.create({
              recipientRole: 'Admin',
              recipientId: adm.id || adm._id,
              title: 'Missed OD Added to Verified Event',
              message: `Club ${od.clubName} added ${mappedStudents.length - originalStudents.length} missed OD student(s) to verified event "${od.eventName}". Status updated to Missed OD Added.`,
            });
          }
        } catch (notifErr) {
          console.error('Error creating admin notification for missed OD:', notifErr);
        }
      }
    } else {
      newTotal = mappedStudents.length;
      const completed = od.completedStudents || 0;
      newRemaining = Math.max(0, newTotal - completed);
    }

    const updatedOD = await db.ods.findByIdAndUpdate(id, {
      students: mappedStudents,
      totalStudents: newTotal,
      remainingStudents: newRemaining,
      verificationStatus: newVerificationStatus,
    });

    return NextResponse.json({
      message: newVerificationStatus === 'missed_od_added'
        ? 'Missed OD students added successfully. Status updated to Missed OD Added.'
        : 'OD list updated successfully.',
      odList: updatedOD,
    });
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
      const odClubId = od.clubId?._id ? od.clubId._id.toString() : od.clubId.toString();
      if (odClubId !== chairperson.clubId.toString()) {
        return jsonError("Access denied. You can only delete your own club's OD lists.", 403);
      }
    }

    if (od.verificationStatus === 'fully_updated' || od.verificationStatus === 'missed_od_added') {
      return jsonError('This OD list has been verified by Admin and cannot be deleted.', 400);
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
