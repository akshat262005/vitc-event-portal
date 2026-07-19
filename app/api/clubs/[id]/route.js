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
    const { name, description } = body;
    if (!name) return jsonError('Club name is required.', 400);

    const updatedClub = await db.clubs.findByIdAndUpdate(id, { name, description });
    if (!updatedClub) return jsonError('Club not found.', 404);
    return NextResponse.json(updatedClub);
  } catch (error) {
    console.error('Update club error:', error);
    return jsonError(error.message || 'Error updating club.', 400);
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
    const deletedClub = await db.clubs.findByIdAndDelete(id);
    if (!deletedClub) return jsonError('Club not found.', 404);
    return NextResponse.json({ message: 'Club deleted successfully.', club: deletedClub });
  } catch (error) {
    console.error('Delete club error:', error);
    return jsonError('Server error deleting club.', 500);
  }
}
