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
    let finalVerificationStatus = verificationStatus;

    if (verificationStatus === 'fully_updated' || verificationStatus === 'partially_updated') {
      if (!remarks.trim()) {
        return jsonError('Remarks are required for verification.', 400);
      }

      // Robust extraction supporting 23MIA2099UPDATED, 23BCE1001, etc.
      const cleanRemarks = String(remarks).toUpperCase();
      const studentsList = odList.students || [];
      const regNoRegex = /\b(\d{2}[a-zA-Z]{2,5}\d{4})(?!\d)/gi;
      const parsedRegs = new Set();
      let match;
      while ((match = regNoRegex.exec(cleanRemarks)) !== null) {
        if (match[1]) parsedRegs.add(match[1].toUpperCase());
      }

      const matchedStudents = studentsList.filter(s => {
        const r = (s.registrationNumber || '').trim().toUpperCase();
        return parsedRegs.has(r) || cleanRemarks.includes(r);
      });
      const matchedCount = matchedStudents.length;

      if (verificationStatus === 'fully_updated') {
        // Enforce check: All registration numbers must be present
        if (total > 0 && matchedCount < total) {
          finalVerificationStatus = 'partially_updated';
          completed = matchedCount;
          remaining = total - matchedCount;
        } else {
          finalVerificationStatus = 'fully_updated';
          completed = total;
          remaining = 0;
        }
      } else if (verificationStatus === 'partially_updated') {
        if (matchedCount > 0) {
          completed = matchedCount;
          remaining = total - matchedCount;
        } else {
          completed = completedStudents !== undefined ? parseInt(completedStudents, 10) : 0;
          remaining = total - completed;
        }
        if (total > 0 && matchedCount >= total) {
          finalVerificationStatus = 'fully_updated';
          completed = total;
          remaining = 0;
        }
      }
    } else {
      completed = 0;
      remaining = total;
      remarks = '';
      finalVerificationStatus = 'pending';
    }

    const updatedOD = await db.ods.findByIdAndUpdate(id, {
      verificationStatus: finalVerificationStatus,
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
        message: `Admin updated verification status for "${odList.eventName}" to: ${finalVerificationStatus.replace('_', ' ').toUpperCase()}`,
      });
    }

    // Notify collaborating clubs' Chairpersons
    if (odList.requestType !== 'pre_event' && odList.eventId) {
      const report = await db.reports.findById(odList.eventId);
      if (report && report.isCollaboration && report.collaborationClubs && report.collaborationClubs.length > 0) {
        const allUsers = await db.users.find({ role: 'Chairperson' });
        const collaboratingUsers = allUsers.filter(u => report.collaborationClubs.includes(u.clubName));
        for (const cp of collaboratingUsers) {
          await db.notifications.create({
            recipientRole: 'Chairperson',
            recipientId: cp.id || cp._id,
            title: 'Collaboration OD Status Updated',
            message: `Admin has updated the OD Verification Status for "${odList.eventName}".`,
          });
        }
      }
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
