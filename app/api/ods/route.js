import { NextResponse } from 'next/server';
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
        `Duplicate student registration numbers submitted: ${Array.from(new Set(duplicates)).join(', ')}`,
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
