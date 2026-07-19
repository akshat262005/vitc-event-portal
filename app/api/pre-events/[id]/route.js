import { NextResponse } from 'next/server';
import { db, connectDB } from '@/lib/db';
import { getAuthUser, jsonError } from '@/lib/auth';

export async function GET(request, { params }) {
  const auth = getAuthUser(request);
  if (auth.error) return auth.error;

  try {
    await connectDB();
    const { id } = await params;
    const op = await db.preEventOperations.findById(id);
    if (!op) return jsonError('Pre-Event Operation request not found.', 404);

    if (auth.user.role === 'Chairperson') {
      const chairperson = await db.users.findById(auth.user.id);
      if (op.clubId.toString() !== chairperson.clubId.toString()) {
        return jsonError('Access denied. You cannot view requests for other clubs.', 403);
      }
    }

    return NextResponse.json(op);
  } catch (error) {
    console.error('Fetch pre-event operation details error:', error);
    return jsonError('Server error fetching details.', 500);
  }
}
