import bcrypt from 'bcryptjs';
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
    const admins = await db.users.find({ role: 'Admin' });
    const formattedAdmins = admins.map(admin => {
      const copy = { ...admin };
      delete copy.passwordHash;
      return copy;
    });
    return NextResponse.json(formattedAdmins);
  } catch (error) {
    console.error('Fetch admins error:', error);
    return jsonError('Server error fetching admins.', 500);
  }
}

export async function POST(request) {
  const auth = getAuthUser(request);
  if (auth.error) return auth.error;
  const roleErr = requireRole(auth.user, 'Admin');
  if (roleErr) return roleErr;

  try {
    await connectDB();
    const body = await request.json();
    const { name, email, username, password } = body;

    if (!name || !email || !username || !password) {
      return jsonError('All fields are required.', 400);
    }

    // Check if username already exists
    const existingUserByUsername = await db.users.findOne({ username });
    if (existingUserByUsername) {
      return jsonError('Username is already taken.', 400);
    }

    // Check if email already exists
    const existingUserByEmail = await db.users.findOne({ email });
    if (existingUserByEmail) {
      return jsonError('Email address is already in use.', 400);
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newAdmin = await db.users.create({
      name,
      email,
      username,
      passwordHash,
      role: 'Admin',
      status: 'Active',
    });

    const result = { ...newAdmin };
    delete result.passwordHash;
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Create admin error:', error);
    return jsonError(error.message || 'Error creating admin account.', 400);
  }
}
