import { NextResponse } from 'next/server';
import { db, connectDB } from '@/lib/db';
import { getAuthUser, jsonError } from '@/lib/auth';

export async function PUT(request) {
  const auth = getAuthUser(request);
  if (auth.error) return auth.error;

  try {
    await connectDB();
    let filter = {};
    if (auth.user.role === 'Chairperson') {
      filter = { recipientRole: 'Chairperson', recipientId: auth.user.id };
    } else {
      filter = { recipientRole: 'Admin' };
    }
    await db.notifications.markAllAsRead(filter);
    return NextResponse.json({ message: 'All notifications marked as read.' });
  } catch (error) {
    console.error('Read all notifications error:', error);
    return jsonError('Server error updating notifications.', 500);
  }
}
