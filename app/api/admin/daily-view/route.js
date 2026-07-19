import { NextResponse } from 'next/server';
import { db, connectDB } from '@/lib/db';
import { getAuthUser, requireRole, jsonError } from '@/lib/auth';

export async function GET(request) {
  const auth = getAuthUser(request);
  if (auth.error) return auth.error;
  const roleErr = requireRole(auth.user, 'Admin');
  if (roleErr) return roleErr;

  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  if (!date) return jsonError('Date parameter (YYYY-MM-DD) is required.', 400);

  try {
    await connectDB();
    const reports = await db.reports.find({ eventDate: date });
    const ods = await db.ods.find({ eventDate: date });
    return NextResponse.json({ reports, ods });
  } catch (error) {
    console.error('Daily view fetch error:', error);
    return jsonError('Server error loading daily view data.', 500);
  }
}
