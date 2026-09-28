import { NextResponse } from 'next/server';
import { db, connectDB } from '@/lib/db';
import { getAuthUser, jsonError } from '@/lib/auth';

export async function GET(request) {
  const auth = getAuthUser(request);
  if (auth.error) return auth.error;

  try {
    await connectDB();
    let filter = { hasOD: false };
    if (auth.user.role === 'Chairperson') {
      const chairperson = await db.users.findById(auth.user.id);
      filter.clubId = chairperson.clubId;
    }
    const reports = await db.reports.find(filter);
    return NextResponse.json(reports);
  } catch (error) {
    console.error('Fetch unlocked events error:', error);
    return jsonError('Server error fetching unlocked events.', 500);
  }
}
