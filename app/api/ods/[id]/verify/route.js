import { NextResponse } from 'next/server';
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
        return jsonError(`Completed students must be a number between 0 and ${total}.`, 400);
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
        message: `Admin updated verification status for "${odList.eventName}" to: ${verificationStatus.replace('_', ' ').toUpperCase()}`,
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
