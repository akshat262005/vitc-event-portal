import { NextResponse } from 'next/server';
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
        `Duplicate student registration numbers submitted: ${Array.from(new Set(duplicates)).join(', ')}`,
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
