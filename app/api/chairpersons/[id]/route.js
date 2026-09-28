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
    const { name, email, registrationNumber, clubId, designation, username, status } = body;

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (registrationNumber !== undefined) updateData.registrationNumber = registrationNumber;
    if (clubId !== undefined) {
      updateData.clubId = clubId;
      const club = await db.clubs.findById(clubId);
      if (club) {
        updateData.clubName = club.name;
      }
    }
    if (designation !== undefined) updateData.designation = designation;
    if (username !== undefined) updateData.username = username;
    if (status !== undefined) updateData.status = status;
    updateData.updatedAt = new Date();

    const isProfileEdit = name !== undefined || email !== undefined || registrationNumber !== undefined || clubId !== undefined || designation !== undefined || username !== undefined;
    if (isProfileEdit) {
      if (!name || !email || !registrationNumber || !clubId || !designation || !username) {
        return jsonError('All profile fields are required.', 400);
      }
      const club = await db.clubs.findById(clubId);
      if (!club) return jsonError('Selected club does not exist.', 400);
    }

    const updatedUser = await db.users.findByIdAndUpdate(id, updateData);

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
