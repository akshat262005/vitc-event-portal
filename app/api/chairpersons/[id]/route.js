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
    const { name, email, registrationNumber, clubId, designation, username } = body;

    if (!name || !email || !registrationNumber || !clubId || !designation || !username) {
      return jsonError('All fields are required.', 400);
    }

    const club = await db.clubs.findById(clubId);
    if (!club) return jsonError('Selected club does not exist.', 400);

    const updatedUser = await db.users.findByIdAndUpdate(id, {
      name,
      email,
      registrationNumber,
      clubId,
      clubName: club.name,
      designation,
      username,
    });

    if (!updatedUser) return jsonError('Chairperson not found.', 404);
    delete updatedUser.passwordHash;
    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Update chairperson error:', error);
    return jsonError(error.message || 'Error updating chairperson.', 400);
  }
}

export async function DELETE(request, { params }) {
  const auth = getAuthUser(request);
  if (auth.error) return auth.error;
  const roleErr = requireRole(auth.user, 'Admin');
  if (roleErr) return roleErr;

  try {
    await connectDB();
    const { id } = await params;
    const deletedUser = await db.users.findByIdAndDelete(id);
    if (!deletedUser) return jsonError('Chairperson not found.', 404);
    return NextResponse.json({ message: 'Chairperson deleted successfully.' });
  } catch (error) {
    console.error('Delete chairperson error:', error);
    return jsonError('Server error deleting chairperson.', 500);
  }
}
