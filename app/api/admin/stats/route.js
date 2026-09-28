import { NextResponse } from 'next/server';
import { db, connectDB } from '@/lib/db';
import { getAuthUser, requireRole, jsonError } from '@/lib/auth';

export async function GET(request) {
  const auth = getAuthUser(request);
  if (auth.error) return auth.error;
  const roleErr = requireRole(auth.user, 'Admin');
  if (roleErr) return roleErr;

  try {
    await connectDB();
    const clubs = await db.clubs.find({});
    const chairpersons = await db.users.find({ role: 'Chairperson' });
    const reports = await db.reports.find({});
    const ods = await db.ods.find({});

    const today = new Date();
    const monthPrefix = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const eventsThisMonth = reports.filter((r) => r.eventDate && r.eventDate.startsWith(monthPrefix)).length;

    const monthlyGroups = {};
    reports.forEach((r) => {
      if (r.eventDate && r.eventDate.length >= 7) {
        const month = r.eventDate.substring(0, 7);
        monthlyGroups[month] = (monthlyGroups[month] || 0) + 1;
      }
    });
    const monthlyEvents = Object.keys(monthlyGroups).sort().map((month) => ({
      name: month,
      count: monthlyGroups[month],
    }));

    const categoryGroups = {};
    reports.forEach((r) => {
      const cat = r.category || 'Others';
      categoryGroups[cat] = (categoryGroups[cat] || 0) + 1;
    });
    const categoryEvents = Object.keys(categoryGroups).map((cat) => ({
      name: cat,
      count: categoryGroups[cat],
    }));

    const clubGroups = {};
    reports.forEach((r) => {
      const clubName = r.clubName || 'Unknown Club';
      clubGroups[clubName] = (clubGroups[clubName] || 0) + 1;
    });
    const clubEvents = Object.keys(clubGroups).map((club) => ({
      name: club,
      count: clubGroups[club],
    }));

    let totalCompletedStudents = 0;
    let totalRemainingStudents = 0;
    ods.forEach((o) => {
      totalCompletedStudents += o.completedStudents || 0;
      totalRemainingStudents +=
        o.remainingStudents !== undefined ? o.remainingStudents : o.students ? o.students.length : 0;
    });

    return NextResponse.json({
      cards: {
        totalClubs: clubs.length,
        totalChairpersons: chairpersons.length,
        totalReports: reports.length,
        totalODLists: ods.length,
        eventsThisMonth,
        pendingVerification: ods.filter((o) => o.verificationStatus === 'pending' || !o.verificationStatus).length,
        fullyUpdated: ods.filter((o) => o.verificationStatus === 'fully_updated').length,
        partiallyUpdated: ods.filter((o) => o.verificationStatus === 'partially_updated').length,
        totalCompletedStudents,
        totalRemainingStudents,
      },
      charts: { monthlyEvents, categoryEvents, clubEvents },
    });
  } catch (error) {
    console.error('Fetch stats error:', error);
    return jsonError('Server error loading stats.', 500);
  }
}
