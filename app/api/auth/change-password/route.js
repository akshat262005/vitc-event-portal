import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { db, connectDB } from '@/lib/db';
import { getAuthUser, jsonError } from '@/lib/auth';

export async function POST(request) {
  const auth = getAuthUser(request);
  if (auth.error) return auth.error;

  try {
    await connectDB();
    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return jsonError('All fields are required.', 400);
    }

    const user = await db.users.findOne({ username: auth.user.username });
    if (!user) return jsonError('User not found.', 404);

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) return jsonError('Incorrect current password.', 400);

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);
    await db.users.findByIdAndUpdate(user.id || user._id, { passwordHash });

    return NextResponse.json({ message: 'Password updated successfully.' });
  } catch (error) {
    console.error('Change password error:', error);
    return jsonError('Server error changing password.', 500);
  }
}
