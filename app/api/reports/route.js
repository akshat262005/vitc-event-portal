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
    const reports = await db.reports.find(filter);
    return NextResponse.json(reports);
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
    } = body;

    if (!eventName || !eventDate || !eventEndDate || !eventTime || !venue || !category ||
        !numberOfParticipants || !studentCoordinator || !studentCoordinatorContact ||
        !outcome || !reportFilePath) {
      return jsonError('Please fill in all required fields.', 400);
    }

    const newReport = await db.reports.create({
      clubId,
      clubName,
      eventName,
      eventDate,
      eventEndDate,
      eventTime,
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
      isCollaboration: isCollaboration === true || isCollaboration === 'true',
      collaborationClubs: Array.isArray(collaborationClubs) ? collaborationClubs : [],
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

    return NextResponse.json(
      { message: 'Report submitted successfully.', report: newReport },
      { status: 201 }
    );
  } catch (error) {
    console.error('Submit report error:', error);
    return jsonError(error.message || 'Server error submitting report.', 500);
  }
}
