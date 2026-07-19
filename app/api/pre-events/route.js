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
      const chairperson = await db.users.findById(auth.user.id);
      filter.clubId = chairperson.clubId;
    }
    const list = await db.preEventOperations.find(filter);
    return NextResponse.json(list);
  } catch (error) {
    console.error('Fetch pre-event operations error:', error);
    return jsonError('Server error fetching pre-event operations list.', 500);
  }
}

export async function POST(request) {
  const auth = getAuthUser(request);
  if (auth.error) return auth.error;
  if (auth.user.role !== 'Chairperson') {
    return jsonError('Access denied. Chairpersons only.', 403);
  }

  try {
    await connectDB();
    const body = await request.json();
    const {
      eventName, eventDate, odRequiredDate, eventCategory, eventCategoryOthersSpecify,
      facultyCoordinator, studentCoordinator, studentCoordinatorContact, purpose,
    } = body;

    if (!eventName || !eventDate || !odRequiredDate || !eventCategory || !facultyCoordinator ||
        !studentCoordinator || !studentCoordinatorContact || !purpose) {
      return jsonError('All fields are required.', 400);
    }
    if (!purpose.trim()) return jsonError('Purpose is mandatory.', 400);
    if (!/^\d{10}$/.test(studentCoordinatorContact.trim())) {
      return jsonError('Student Coordinator Contact Number must be a valid 10-digit number.', 400);
    }
    if (new Date(odRequiredDate) > new Date(eventDate)) {
      return jsonError('OD Required Date cannot be after the Actual Event Date.', 400);
    }

    const chairperson = await db.users.findById(auth.user.id);
    if (!chairperson || !chairperson.clubId) {
      return jsonError('Chairperson does not have an assigned club.', 400);
    }

    const club = await db.clubs.findById(chairperson.clubId.toString());
    const clubName = club ? club.name : chairperson.clubName || 'Unknown Club';

    const newOperation = await db.preEventOperations.create({
      clubId: chairperson.clubId,
      clubName,
      eventName,
      eventDate,
      odRequiredDate,
      eventCategory,
      eventCategoryOthersSpecify: eventCategory === 'Others' ? eventCategoryOthersSpecify : '',
      facultyCoordinator,
      studentCoordinator,
      studentCoordinatorContact: studentCoordinatorContact.trim(),
      purpose,
      status: 'Pending',
      hasOD: false,
      odUploadsCount: 0,
      submittedBy: auth.user.id,
    });

    await db.notifications.create({
      recipientRole: 'Admin',
      title: 'New Pre-Event Operation Request',
      message: `Club "${clubName}" submitted a pre-event operation request for "${eventName}".`,
    });

    return NextResponse.json(
      { message: 'Pre-Event Operation request submitted successfully!', operation: newOperation },
      { status: 201 }
    );
  } catch (error) {
    console.error('Submit pre-event operation error:', error);
    return jsonError(error.message || 'Server error submitting pre-event operation.', 500);
  }
}
