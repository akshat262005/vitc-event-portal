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
      if (report.clubId.toString() !== chairperson.clubId.toString()) {
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

    let reportUploadsCount = report.reportUploadsCount || 1;
    if (auth.user.role === 'Chairperson') {
      const chairperson = await db.users.findById(auth.user.id);
      if (report.clubId.toString() !== chairperson.clubId.toString()) {
        return jsonError("Access denied. You can only edit your own club's reports.", 403);
      }
      if (reportUploadsCount >= 3) {
        return jsonError('Maximum upload/edit attempts reached (3/3) for this Event Report.', 400);
      }
      reportUploadsCount += 1;
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
    });

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
      if (report.clubId.toString() !== chairperson.clubId.toString()) {
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
