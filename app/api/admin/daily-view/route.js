import { NextResponse } from 'next/server';
import { db, connectDB } from '@/lib/db';
import { getAuthUser, requireRole, jsonError } from '@/lib/auth';

export async function GET(request) {
  const auth = getAuthUser(request);
  if (auth.error) return auth.error;
  const roleErr = requireRole(auth.user, 'Admin');
  if (roleErr) return roleErr;

  const { searchParams } = new URL(request.url);
  const singleDate = searchParams.get('date');
  const startDate = searchParams.get('startDate') || singleDate;
  const endDate = searchParams.get('endDate') || singleDate || startDate;

  if (!startDate || !endDate) {
    return jsonError('Date parameter (date or startDate and endDate) is required.', 400);
  }

  try {
    await connectDB();

    // Query for reports: single day match or range overlap (supporting multi-day events)
    let reportFilter;
    let odFilter;

    if (startDate === endDate) {
      reportFilter = {
        $or: [
          { eventDate: startDate },
          {
            eventDate: { $lte: startDate },
            eventEndDate: { $gte: startDate }
          }
        ]
      };
      odFilter = { eventDate: startDate };
    } else {
      reportFilter = {
        $or: [
          { eventDate: { $gte: startDate, $lte: endDate } },
          {
            eventDate: { $lte: endDate },
            eventEndDate: { $gte: startDate }
          }
        ]
      };
      odFilter = {
        eventDate: { $gte: startDate, $lte: endDate }
      };
    }

    const [reports, ods] = await Promise.all([
      db.reports.find(reportFilter),
      db.ods.find(odFilter)
    ]);

    return NextResponse.json({
      startDate,
      endDate,
      isRange: startDate !== endDate,
      reports,
      ods
    });
  } catch (error) {
    console.error('Daily/Range view fetch error:', error);
    return jsonError('Server error loading unified view data.', 500);
  }
}
