import { NextResponse } from 'next/server';
import { db, connectDB } from '@/lib/db';
import { getAuthUser, jsonError } from '@/lib/auth';
import { buildODRegistryMap } from '@/lib/od-utils';

export async function GET(request) {
  const auth = getAuthUser(request);
  if (auth.error) return auth.error;
  if (auth.user.role !== 'Admin') {
    return jsonError('Access denied. Admin only.', 403);
  }

  try {
    await connectDB();

    const [ods, clubs, reports] = await Promise.all([
      db.ods.find({}, {
        _id: 1,
        id: 1,
        eventId: 1,
        clubId: 1,
        clubName: 1,
        eventName: 1,
        eventDate: 1,
        verificationStatus: 1,
        totalStudents: 1,
        completedStudents: 1,
        remainingStudents: 1,
        adminRemarks: 1,
        students: 1,
        uploadedAt: 1
      }),
      db.clubs.find({}),
      db.reports.find({}, {
        _id: 1,
        id: 1,
        category: 1,
        categoryOthersSpecify: 1
      })
    ]);

    const registryMap = buildODRegistryMap(ods, reports);
    const records = Array.from(registryMap.values());

    return NextResponse.json({
      success: true,
      count: records.length,
      records,
      clubs
    });
  } catch (error) {
    console.error('Fetch OD registry error:', error);
    return jsonError('Server error fetching OD registry.', 500);
  }
}
