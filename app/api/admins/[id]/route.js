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
    const { name, email, username, status } = body;

    // Check self-action protection
    if (id === auth.user.id) {
      if (status === 'Inactive') {
        return jsonError('You cannot deactivate your own admin account.', 400);
      }
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (username !== undefined) updateData.username = username;
    if (status !== undefined) updateData.status = status;
    updateData.updatedAt = new Date();

    const isProfileEdit = name !== undefined || email !== undefined || username !== undefined;
    if (isProfileEdit) {
      if (!name || !email || !username) {
        return jsonError('All profile fields (name, email, username) are required.', 400);
      }
      
      // Check for duplicate username
      if (username !== undefined) {
        const dupUser = await db.users.findOne({ username, _id: { $ne: id } });
        if (dupUser) return jsonError('Username is already taken.', 400);
      }

      // Check for duplicate email
      if (email !== undefined) {
        const dupEmail = await db.users.findOne({ email, _id: { $ne: id } });
        if (dupEmail) return jsonError('Email address is already in use.', 400);
      }
    }

    const updatedUser = await db.users.findByIdAndUpdate(id, updateData);
    if (!updatedUser) return jsonError('Admin account not found.', 404);

    const result = { ...updatedUser };
    delete result.passwordHash;
    return NextResponse.json(result);
  } catch (error) {
    console.error('Update admin error:', error);
    return jsonError(error.message || 'Error updating admin account.', 400);
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

    // Check self-action protection
    if (id === auth.user.id) {
      return jsonError('You cannot delete your own admin account.', 400);
    }

    const deletedUser = await db.users.findByIdAndDelete(id);
    if (!deletedUser) return jsonError('Admin account not found.', 404);

    return NextResponse.json({ message: 'Admin account deleted successfully.' });
  } catch (error) {
    console.error('Delete admin error:', error);
    return jsonError('Server error deleting admin account.', 500);
  }
}
