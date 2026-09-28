import { NextResponse } from 'next/server';
import { db, connectDB } from '@/lib/db';
import { getAuthUser, requireRole, jsonError } from '@/lib/auth';

export async function PUT(request, { params }) {
  const auth = getAuthUser(request);
  if (auth.error) return auth.error;
  const roleErr = requireRole(auth.user, 'Admin');
  if (roleErr) return roleErr;

  try {
    await connectDB();
    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    if (!['Pending', 'Approved', 'Rejected'].includes(status)) {
      return jsonError('Invalid status. Must be Pending, Approved, or Rejected.', 400);
    }

    const op = await db.preEventOperations.findById(id);
    if (!op) return jsonError('Pre-Event Operation request not found.', 404);

    const updatedOp = await db.preEventOperations.findByIdAndUpdate(id, { status });

    await db.notifications.create({
      recipientRole: 'Chairperson',
      recipientId: op.submittedBy,
      title: 'Pre-Event Operation Status Updated',
      message: `Admin updated status of pre-event request for "${op.eventName}" to: ${status}.`,
    });

    return NextResponse.json({
      message: `Pre-Event request status updated to ${status} successfully.`,
      operation: updatedOp,
    });
  } catch (error) {
    console.error('Update pre-event operation status error:', error);
    return jsonError('Server error updating status.', 500);
  }
}
