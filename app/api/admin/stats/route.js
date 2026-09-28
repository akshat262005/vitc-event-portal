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

    const today = new Date();
    const monthPrefix = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

    // Execute all queries concurrently in parallel with lean projection
    const [
      totalClubs,
      totalChairpersons,
      reports,
      ods
    ] = await Promise.all([
      db.clubs.count ? db.clubs.count({}) : db.clubs.find({}).then(c => c.length),
      db.users.count ? db.users.count({ role: 'Chairperson' }) : db.users.find({ role: 'Chairperson' }).then(u => u.length),
      db.reports.find({}, { eventDate: 1, category: 1, clubName: 1 }),
      db.ods.find({}, { verificationStatus: 1, completedStudents: 1, remainingStudents: 1, totalStudents: 1, students: 1 })
    ]);

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
    const categoryEvents = Object.keys(categoryGroups)
      .map((cat) => ({
        name: cat,
        count: categoryGroups[cat],
      }))
      .sort((a, b) => b.count - a.count);

    const clubGroups = {};
    reports.forEach((r) => {
      const clubName = r.clubName || 'Unknown Club';
      clubGroups[clubName] = (clubGroups[clubName] || 0) + 1;
    });
    const clubEvents = Object.keys(clubGroups)
      .map((club) => ({
        name: club,
        count: clubGroups[club],
      }))
      .sort((a, b) => b.count - a.count);

    let totalCompletedStudents = 0;
    let totalRemainingStudents = 0;
    let pendingVerification = 0;
    let fullyUpdated = 0;
    let partiallyUpdated = 0;

    ods.forEach((o) => {
      totalCompletedStudents += o.completedStudents || 0;
      totalRemainingStudents +=
        o.remainingStudents !== undefined
          ? o.remainingStudents
          : o.students
          ? o.students.length
          : Math.max(0, (o.totalStudents || 0) - (o.completedStudents || 0));

      const status = o.verificationStatus || 'pending';
      if (status === 'fully_updated') fullyUpdated++;
      else if (status === 'partially_updated') partiallyUpdated++;
      else pendingVerification++;
    });

    return NextResponse.json({
      cards: {
        totalClubs,
        totalChairpersons,
        totalReports: reports.length,
        totalODLists: ods.length,
        eventsThisMonth,
        pendingVerification,
        fullyUpdated,
        partiallyUpdated,
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
