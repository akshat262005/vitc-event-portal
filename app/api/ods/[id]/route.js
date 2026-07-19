import { NextResponse } from 'next/server';
import { db, connectDB } from '@/lib/db';
import { getAuthUser, jsonError } from '@/lib/auth';

export async function GET(request, { params }) {
  const auth = getAuthUser(request);
  if (auth.error) return auth.error;

  try {
    await connectDB();
    const { id } = await params;
    const od = await db.ods.findById(id);
    if (!od) return jsonError('OD list not found.', 404);

    if (auth.user.role === 'Chairperson') {
      const chairperson = await db.users.findById(auth.user.id);
      if (od.clubId.toString() !== chairperson.clubId.toString()) {
        return jsonError("Access denied. You cannot view other clubs' OD lists.", 403);
      }
    }

    return NextResponse.json(od);
  } catch (error) {
    console.error('Fetch OD list detail error:', error);
    return jsonError('Server error fetching OD list details.', 500);
  }
}

export async function PUT(request, { params }) {
  const auth = getAuthUser(request);
  if (auth.error) return auth.error;

  try {
    await connectDB();
    const { id } = await params;
    const body = await request.json();
    const od = await db.ods.findById(id);
    if (!od) return jsonError('OD list not found.', 404);

    if (auth.user.role === 'Chairperson') {
      const chairperson = await db.users.findById(auth.user.id);
      if (od.clubId.toString() !== chairperson.clubId.toString()) {
        return jsonError("Access denied. You can only edit your own club's OD lists.", 403);
      }
    }

    const { students } = body;
    if (!students || !Array.isArray(students) || students.length === 0) {
      return jsonError('Student list is required.', 400);
    }

    const updatedOD = await db.ods.findByIdAndUpdate(id, {
      students: students.map((s) => ({
        registrationNumber: s.registrationNumber.trim().toUpperCase(),
        studentName: s.studentName.trim(),
        date: s.date.trim(),
        time: s.time.trim(),
      })),
    });

    return NextResponse.json({ message: 'OD list updated successfully.', odList: updatedOD });
  } catch (error) {
    console.error('Update OD list error:', error);
    return jsonError('Server error updating OD list.', 500);
  }
}

export async function DELETE(request, { params }) {
  const auth = getAuthUser(request);
  if (auth.error) return auth.error;

  try {
    await connectDB();
    const { id } = await params;
    const od = await db.ods.findById(id);
    if (!od) return jsonError('OD list not found.', 404);

    if (auth.user.role === 'Chairperson') {
      const chairperson = await db.users.findById(auth.user.id);
      if (od.clubId.toString() !== chairperson.clubId.toString()) {
        return jsonError("Access denied. You can only delete your own club's OD lists.", 403);
      }
    }

    if (od.requestType === 'pre_event') {
      await db.preEventOperations.findByIdAndUpdate(od.eventId, { hasOD: false });
    } else {
      await db.reports.findByIdAndUpdate(od.eventId, { hasOD: false });
    }

    await db.ods.findByIdAndDelete(id);
    return NextResponse.json({ message: 'OD list deleted successfully.' });
  } catch (error) {
    console.error('Delete OD list error:', error);
    return jsonError('Server error deleting OD list.', 500);
  }
}
