import { NextResponse } from 'next/server';
import { db, connectDB } from '@/lib/db';
import { getAuthUser, jsonError } from '@/lib/auth';

export async function GET(request) {
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
    const notifications = await db.notifications.find(filter);
    return NextResponse.json(notifications);
  } catch (error) {
    console.error('Fetch notifications error:', error);
    return jsonError('Server error fetching notifications.', 500);
  }
}
