import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { db, connectDB } from '@/lib/db';
import { getAuthUser, requireRole, jsonError } from '@/lib/auth';

export async function GET(request) {
  const auth = getAuthUser(request);
  if (auth.error) return auth.error;
  const roleErr = requireRole(auth.user, 'Admin');
  if (roleErr) return roleErr;

  try {
    await connectDB();
    const chairpersons = await db.users.find({ role: 'Chairperson' });
    return NextResponse.json(chairpersons);
  } catch (error) {
    console.error('Fetch chairpersons error:', error);
    return jsonError('Server error fetching chairpersons.', 500);
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
    const { name, email, registrationNumber, clubId, designation, username, password } = body;

    if (!name || !email || !registrationNumber || !clubId || !designation || !username || !password) {
      return jsonError('All fields are required.', 400);
    }

    const club = await db.clubs.findById(clubId);
    if (!club) return jsonError('Selected club does not exist.', 400);

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newChairperson = await db.users.create({
      name,
      email,
      registrationNumber,
      clubId,
      clubName: club.name,
      designation,
      username,
      passwordHash,
      role: 'Chairperson',
    });

    delete newChairperson.passwordHash;
    return NextResponse.json(newChairperson, { status: 201 });
  } catch (error) {
    console.error('Create chairperson error:', error);
    return jsonError(error.message || 'Error creating chairperson.', 400);
  }
}
