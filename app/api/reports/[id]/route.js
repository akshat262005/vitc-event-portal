import { NextResponse } from 'next/server';
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
      const reportClubId = report.clubId?._id ? report.clubId._id.toString() : report.clubId.toString();
      const isOwner = reportClubId === chairperson.clubId.toString();
      const isCollaborator = report.isCollaboration && report.collaborationClubs && report.collaborationClubs.includes(chairperson.clubName);
      if (!isOwner && !isCollaborator) {
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

    if (body.studentCoordinatorContact && !/^\d{10}$/.test(body.studentCoordinatorContact.trim())) {
      return jsonError('Student Coordinator Contact Number must be a valid 10-digit number.', 400);
    }

    let reportUploadsCount = report.reportUploadsCount || 1;
    if (auth.user.role === 'Chairperson') {
      const chairperson = await db.users.findById(auth.user.id);
      const reportClubId = report.clubId?._id ? report.clubId._id.toString() : report.clubId.toString();
      const chairpersonClubId = chairperson.clubId?._id ? chairperson.clubId._id.toString() : chairperson.clubId.toString();
      if (reportClubId !== chairpersonClubId) {
        return jsonError("Access denied. You can only edit your own club's reports.", 403);
      }
      if (reportUploadsCount >= 3) {
        return jsonError('Maximum upload/edit attempts reached (3/3) for this Event Report.', 400);
      }
      reportUploadsCount += 1;
    }

    // Duplicate Event Validation on Update
    const targetEventName = body.eventName || report.eventName;
    const targetEventDate = body.eventDate || report.eventDate;
    const targetClubId = report.clubId?._id ? report.clubId._id.toString() : report.clubId.toString();
    const targetClubName = report.clubName;
    
    const normalizeName = (name) => name ? name.trim().toLowerCase().replace(/\s+/g, ' ') : '';
    const normalizedInputName = normalizeName(targetEventName);
    const existingReports = await db.reports.find({});
    
    const duplicateReport = existingReports.find(r => {
      const rId = r.id || r._id?.toString();
      if (rId.toString() === id.toString()) return false;
      
      if (r.eventDate !== targetEventDate) return false;
      
      const reportNormalizedName = normalizeName(r.eventName);
      if (reportNormalizedName !== normalizedInputName) return false;
      
      const reportClubId = r.clubId?._id ? r.clubId._id.toString() : r.clubId.toString();
      
      // Case 1: Same club duplicate
      if (reportClubId === targetClubId) {
        return true;
      }
      
      // Case 2: Submitting club is a collaborating club on the existing report
      if (r.isCollaboration && r.collaborationClubs && r.collaborationClubs.includes(targetClubName)) {
        return true;
      }
      
      return false;
    });

    if (duplicateReport) {
      const submittingClubName = duplicateReport.clubName;
      const displayMsg = submittingClubName.toLowerCase().trim() === targetClubName.toLowerCase().trim()
        ? `⚠️ An Event Report for "${targetEventName}" on ${targetEventDate} has already been submitted by your club. Please use the "Modify Report" feature to update the existing report instead of creating a duplicate submission.`
        : `⚠️ An Event Report for "${targetEventName}" on ${targetEventDate} has already been submitted by the primary club, ${submittingClubName}. Since your club is a collaborator, you can view the report on your dashboard.`;
      return jsonError(displayMsg, 400);
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
      isSponsored: body.isSponsored === true || body.isSponsored === 'true',
      sponsorName: body.isSponsored ? (body.sponsorName || '') : '',
      sponsorAmount: body.isSponsored ? (body.sponsorAmount ? parseFloat(body.sponsorAmount) : 0) : 0,
    });

    // Notify primary chairperson and collaborating chairpersons if Admin updates the event
    if (auth.user.role === 'Admin') {
      const primaryChairpersons = await db.users.find({ role: 'Chairperson', clubId: report.clubId });
      for (const cp of primaryChairpersons) {
        await db.notifications.create({
          recipientRole: 'Chairperson',
          recipientId: cp.id || cp._id,
          title: 'Event Report Verification Status Updated',
          message: `Admin has updated the status for your report "${report.eventName}" to: ${body.status || report.status}.`,
        });
      }

      if (report.isCollaboration && report.collaborationClubs && report.collaborationClubs.length > 0) {
        const allUsers = await db.users.find({ role: 'Chairperson' });
        const collaboratingUsers = allUsers.filter(u => report.collaborationClubs.includes(u.clubName));
        for (const cp of collaboratingUsers) {
          await db.notifications.create({
            recipientRole: 'Chairperson',
            recipientId: cp.id || cp._id,
            title: 'Collaboration Event Status Updated',
            message: `Admin has updated the status for the Collaboration Event "${report.eventName}".`,
          });
        }
      }
    }

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
      const reportClubId = report.clubId?._id ? report.clubId._id.toString() : report.clubId.toString();
      const chairpersonClubId = chairperson.clubId?._id ? chairperson.clubId._id.toString() : chairperson.clubId.toString();
      if (reportClubId !== chairpersonClubId) {
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
