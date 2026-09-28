import { NextResponse } from 'next/server';
import { db, connectDB } from '@/lib/db';
import { getAuthUser, jsonError } from '@/lib/auth';

export async function GET(request) {
  const auth = getAuthUser(request);
  if (auth.error) return auth.error;

  try {
    await connectDB();
    if (auth.user.role === 'Chairperson') {
      const chairperson = await db.users.findById(auth.user.id);
      if (!chairperson) return jsonError('User not found.', 404);
      
      const filter = {
        $or: [
          { clubId: chairperson.clubId },
          { isCollaboration: true, collaborationClubs: chairperson.clubName }
        ]
      };
      const filteredReports = await db.reports.find(filter);
      return NextResponse.json(filteredReports);
    } else {
      const reports = await db.reports.find({});
      return NextResponse.json(reports);
    }
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
      isSponsored, sponsorName, sponsorAmount, eventLocationType,
    } = body;

    if (!eventName || !eventDate || !eventEndDate || !eventTime || !venue || !category ||
        !numberOfParticipants || !studentCoordinator || !studentCoordinatorContact ||
        !outcome || !reportFilePath) {
      return jsonError('Please fill in all required fields.', 400);
    }

    const validLocationTypes = ['VIT Chennai', 'Outside VIT Chennai'];
    const resolvedLocationType = validLocationTypes.includes(eventLocationType) ? eventLocationType : 'VIT Chennai';

    const isCollab = isCollaboration === true || isCollaboration === 'true';
    const collabList = Array.isArray(collaborationClubs) ? collaborationClubs.filter(Boolean) : [];
    if (isCollab && collabList.length === 0) {
      return jsonError('Please select at least one collaborating club/chapter, or uncheck Collaboration Event if you did not collaborate.', 400);
    }

    if (!/^\d{10}$/.test(studentCoordinatorContact.trim())) {
      return jsonError('Student Coordinator Contact Number must be a valid 10-digit number.', 400);
    }

    // Duplicate Event Validation
    const normalizeName = (name) => name ? name.trim().toLowerCase().replace(/\s+/g, ' ') : '';
    const normalizedInputName = normalizeName(eventName);
    const existingReports = await db.reports.find({ eventDate });
    
    const duplicateReport = existingReports.find(report => {
      if (report.eventDate !== eventDate) return false;
      
      const reportNormalizedName = normalizeName(report.eventName);
      if (reportNormalizedName !== normalizedInputName) return false;
      
      const reportClubId = report.clubId?._id ? report.clubId._id.toString() : report.clubId.toString();
      const targetClubId = clubId.toString();
      
      // Case 1: Same club submits a duplicate
      if (reportClubId === targetClubId) {
        return true;
      }
      
      // Case 2: Submitting club is a collaborating club on the existing report
      if (report.isCollaboration && report.collaborationClubs && report.collaborationClubs.includes(clubName)) {
        return true;
      }
      
      return false;
    });

    if (duplicateReport) {
      const submittingClubName = duplicateReport.clubName;
      const displayMsg = submittingClubName.toLowerCase().trim() === clubName.toLowerCase().trim()
        ? `An Event Report for "${eventName}" on ${eventDate} has already been submitted by your club. Please use the "Modify Report" feature to update the existing report instead of creating a duplicate submission.`
        : `An Event Report for "${eventName}" on ${eventDate} has already been submitted by the primary club, ${submittingClubName}. Since your club is a collaborator, you can view the report on your dashboard.`;
      return jsonError(displayMsg, 400);
    }

    const newReport = await db.reports.create({
      clubId,
      clubName,
      eventName,
      eventDate,
      eventEndDate,
      eventTime,
      eventLocationType: resolvedLocationType,
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
      isCollaboration: isCollab,
      collaborationClubs: isCollab ? collabList : [],
      isSponsored: isSponsored === true || isSponsored === 'true',
      sponsorName: isSponsored ? (sponsorName || '') : '',
      sponsorAmount: isSponsored ? (sponsorAmount ? parseFloat(sponsorAmount) : 0) : 0,
      submittedBy: auth.user.id,
      reportUploadsCount: 1,
      odUploadsCount: 0,
    });

    await db.notifications.create({
      recipientRole: 'Admin',
      title: 'New Report Submitted',
      message: `Club "${clubName}" submitted a report for "${eventName}" conducted on ${eventDate}.`,
    });
    await db.notifications.create({
      recipientRole: 'Chairperson',
      recipientId: auth.user.id,
      title: 'Report Submitted Successfully',
      message: `Your report for "${eventName}" has been submitted successfully.`,
    });

    // Notify collaborating clubs' Chairpersons
    if (newReport.isCollaboration && newReport.collaborationClubs && newReport.collaborationClubs.length > 0) {
      const allUsers = await db.users.find({ role: 'Chairperson' });
      const collaboratingUsers = allUsers.filter(u => newReport.collaborationClubs.includes(u.clubName));
      for (const colUser of collaboratingUsers) {
        await db.notifications.create({
          recipientRole: 'Chairperson',
          recipientId: colUser.id || colUser._id,
          title: 'New Collaboration Event Submitted',
          message: `${clubName} has submitted the Event Report for the Collaboration Event "${eventName}". You can now track the event from your dashboard.`,
        });
      }
    }

    return NextResponse.json(
      { message: 'Report submitted successfully.', report: newReport },
      { status: 201 }
    );
  } catch (error) {
    console.error('Submit report error:', error);
    return jsonError(error.message || 'Server error submitting report.', 500);
  }
}
