import { NextResponse } from 'next/server';
import { db, connectDB } from '@/lib/db';
import { getAuthUser, requireRole, jsonError } from '@/lib/auth';

export async function GET(request) {
  const auth = getAuthUser(request);
  if (auth.error) return auth.error;

  try {
    await connectDB();
    const clubs = await db.clubs.find();
    return NextResponse.json(clubs);
  } catch (error) {
    console.error('Fetch clubs error:', error);
    return jsonError('Server error fetching clubs.', 500);
  }
}

export async function POST(request) {
  const auth = getAuthUser(request);
  if (auth.error) return auth.error;
  const roleErr = requireRole(auth.user, 'Admin');
  if (roleErr) return roleErr;

  try {
    await connectDB();
    const body = await request.json();
    const { name, description } = body;
    if (!name) return jsonError('Club name is required.', 400);

    const newClub = await db.clubs.create({ name, description });
    await db.notifications.create({
      recipientRole: 'Admin',
      title: 'New Club Created',
      message: `Club "${name}" has been successfully added to the portal.`,
    });

    return NextResponse.json(newClub, { status: 201 });
  } catch (error) {
    console.error('Create club error:', error);
    return jsonError(error.message || 'Error creating club.', 400);
  }
}
