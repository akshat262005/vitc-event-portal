import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { db, connectDB } from '@/lib/db';
import { getAuthUser, requireRole, jsonError } from '@/lib/auth';

export async function POST(request, { params }) {
  const auth = getAuthUser(request);
  if (auth.error) return auth.error;
  const roleErr = requireRole(auth.user, 'Admin');
  if (roleErr) return roleErr;

  try {
    await connectDB();
    const { id } = await params;
    const body = await request.json();
    const { newPassword } = body;
    if (!newPassword) return jsonError('New password is required.', 400);

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);
    const updatedUser = await db.users.findByIdAndUpdate(id, { passwordHash });
    if (!updatedUser) return jsonError('Chairperson not found.', 404);

    return NextResponse.json({ message: 'Password reset successful.' });
  } catch (error) {
    console.error('Reset password error:', error);
    return jsonError('Server error resetting password.', 500);
  }
}
