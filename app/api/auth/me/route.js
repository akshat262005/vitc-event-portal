import { NextResponse } from 'next/server';
import { db, connectDB } from '@/lib/db';
import { getAuthUser, jsonError } from '@/lib/auth';

export async function GET(request) {
  const auth = getAuthUser(request);
  if (auth.error) return auth.error;

  try {
    await connectDB();
    const user = await db.users.findById(auth.user.id);
    if (!user) return jsonError('User not found.', 404);

    return NextResponse.json({
      user: {
        id: user.id || user._id,
        name: user.name,
        email: user.email,
        registrationNumber: user.registrationNumber,
        clubId: user.clubId?._id ? user.clubId._id.toString() : user.clubId,
        clubName: user.clubName,
        designation: user.designation,
        username: user.username,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Fetch me error:', error);
    return jsonError('Server error fetching profile.', 500);
  }
}
