/**
 * One-shot generator: Next.js App Router API routes + client component patches.
 * Run: node scripts/migrate-routes.js
 */
const fs = require('fs');
const path = require('path');

function write(filePath, content) {
  const abs = path.join(process.cwd(), filePath);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content);
  console.log('wrote', filePath);
}

// ---------- API ROUTES ----------

write('app/api/health/route.js', `import { NextResponse } from 'next/server';
import { isMongo, connectDB } from '@/lib/db';
import { seedDatabase } from '@/lib/seed';

export async function GET() {
  try {
    await connectDB();
    // Lightweight idempotent seed on first health check (dev / first deploy)
    await seedDatabase();
    return NextResponse.json({
      status: 'ok',
      database: isMongo ? 'MongoDB' : 'Local JSON',
    });
  } catch (error) {
    return NextResponse.json(
      { status: 'error', message: error.message },
      { status: 500 }
    );
  }
}
`);

write('app/api/auth/login/route.js', `import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { NextResponse } from 'next/server';
import { db, connectDB } from '@/lib/db';
import { JWT_SECRET, jsonError } from '@/lib/auth';

export async function POST(request) {
  try {
    await connectDB();
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return jsonError('Username and password are required.', 400);
    }

    const user = await db.users.findOne({ username });
    if (!user) return jsonError('Invalid credentials.', 401);

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) return jsonError('Invalid credentials.', 401);

    const token = jwt.sign(
      {
        id: user.id || user._id,
        username: user.username,
        role: user.role,
        clubId: user.clubId,
      },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    return NextResponse.json({
      token,
      user: {
        id: user.id || user._id,
        name: user.name,
        email: user.email,
        registrationNumber: user.registrationNumber,
        clubId: user.clubId,
        clubName: user.clubName,
        designation: user.designation,
        username: user.username,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return jsonError('Server error during login.', 500);
  }
}
`);

write('app/api/auth/me/route.js', `import { NextResponse } from 'next/server';
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
        clubId: user.clubId,
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
`);

write('app/api/auth/change-password/route.js', `import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { db, connectDB } from '@/lib/db';
import { getAuthUser, jsonError } from '@/lib/auth';

export async function POST(request) {
  const auth = getAuthUser(request);
  if (auth.error) return auth.error;

  try {
    await connectDB();
    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return jsonError('All fields are required.', 400);
    }

    const user = await db.users.findOne({ username: auth.user.username });
    if (!user) return jsonError('User not found.', 404);

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) return jsonError('Incorrect current password.', 400);

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);
    await db.users.findByIdAndUpdate(user.id || user._id, { passwordHash });

    return NextResponse.json({ message: 'Password updated successfully.' });
  } catch (error) {
    console.error('Change password error:', error);
    return jsonError('Server error changing password.', 500);
  }
}
`);

write('app/api/clubs/route.js', `import { NextResponse } from 'next/server';
import { db, connectDB } from '@/lib/db';
import { getAuthUser, requireRole, jsonError } from '@/lib/auth';

export async function GET(request) {
  const auth = getAuthUser(request);
  if (auth.error) return auth.error;

  try {
    await connectDB();
    const clubs = await db.clubs.find();
    return NextResponse.json(clubs);
  } catch (error) {
    console.error('Fetch clubs error:', error);
    return jsonError('Server error fetching clubs.', 500);
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
    const { name, description } = body;
    if (!name) return jsonError('Club name is required.', 400);

    const newClub = await db.clubs.create({ name, description });
    await db.notifications.create({
      recipientRole: 'Admin',
      title: 'New Club Created',
      message: \`Club "\${name}" has been successfully added to the portal.\`,
    });

    return NextResponse.json(newClub, { status: 201 });
  } catch (error) {
    console.error('Create club error:', error);
    return jsonError(error.message || 'Error creating club.', 400);
  }
}
`);

write('app/api/clubs/[id]/route.js', `import { NextResponse } from 'next/server';
import { db, connectDB } from '@/lib/db';
import { getAuthUser, requireRole, jsonError } from '@/lib/auth';

export async function PUT(request, { params }) {
  const auth = getAuthUser(request);
  if (auth.error) return auth.error;
  const roleErr = requireRole(auth.user, 'Admin');
  if (roleErr) return roleErr;

  try {
    await connectDB();
    const { id } = await params;
    const body = await request.json();
    const { name, description } = body;
    if (!name) return jsonError('Club name is required.', 400);

    const updatedClub = await db.clubs.findByIdAndUpdate(id, { name, description });
    if (!updatedClub) return jsonError('Club not found.', 404);
    return NextResponse.json(updatedClub);
  } catch (error) {
    console.error('Update club error:', error);
    return jsonError(error.message || 'Error updating club.', 400);
  }
}

export async function DELETE(request, { params }) {
  const auth = getAuthUser(request);
  if (auth.error) return auth.error;
  const roleErr = requireRole(auth.user, 'Admin');
  if (roleErr) return roleErr;

  try {
    await connectDB();
    const { id } = await params;
    const deletedClub = await db.clubs.findByIdAndDelete(id);
    if (!deletedClub) return jsonError('Club not found.', 404);
    return NextResponse.json({ message: 'Club deleted successfully.', club: deletedClub });
  } catch (error) {
    console.error('Delete club error:', error);
    return jsonError('Server error deleting club.', 500);
  }
}
`);

write('app/api/chairpersons/route.js', `import bcrypt from 'bcryptjs';
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
    const chairpersons = await db.users.find({ role: 'Chairperson' });
    return NextResponse.json(chairpersons);
  } catch (error) {
    console.error('Fetch chairpersons error:', error);
    return jsonError('Server error fetching chairpersons.', 500);
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
    const { name, email, registrationNumber, clubId, designation, username, password } = body;

    if (!name || !email || !registrationNumber || !clubId || !designation || !username || !password) {
      return jsonError('All fields are required.', 400);
    }

    const club = await db.clubs.findById(clubId);
    if (!club) return jsonError('Selected club does not exist.', 400);

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newChairperson = await db.users.create({
      name,
      email,
      registrationNumber,
      clubId,
      clubName: club.name,
      designation,
      username,
      passwordHash,
      role: 'Chairperson',
    });

    delete newChairperson.passwordHash;
    return NextResponse.json(newChairperson, { status: 201 });
  } catch (error) {
    console.error('Create chairperson error:', error);
    return jsonError(error.message || 'Error creating chairperson.', 400);
  }
}
`);

write('app/api/chairpersons/[id]/route.js', `import { NextResponse } from 'next/server';
import { db, connectDB } from '@/lib/db';
import { getAuthUser, requireRole, jsonError } from '@/lib/auth';

export async function PUT(request, { params }) {
  const auth = getAuthUser(request);
  if (auth.error) return auth.error;
  const roleErr = requireRole(auth.user, 'Admin');
  if (roleErr) return roleErr;

  try {
    await connectDB();
    const { id } = await params;
    const body = await request.json();
    const { name, email, registrationNumber, clubId, designation, username } = body;

    if (!name || !email || !registrationNumber || !clubId || !designation || !username) {
      return jsonError('All fields are required.', 400);
    }

    const club = await db.clubs.findById(clubId);
    if (!club) return jsonError('Selected club does not exist.', 400);

    const updatedUser = await db.users.findByIdAndUpdate(id, {
      name,
      email,
      registrationNumber,
      clubId,
      clubName: club.name,
      designation,
      username,
    });

    if (!updatedUser) return jsonError('Chairperson not found.', 404);
    delete updatedUser.passwordHash;
    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Update chairperson error:', error);
    return jsonError(error.message || 'Error updating chairperson.', 400);
  }
}

export async function DELETE(request, { params }) {
  const auth = getAuthUser(request);
  if (auth.error) return auth.error;
  const roleErr = requireRole(auth.user, 'Admin');
  if (roleErr) return roleErr;

  try {
    await connectDB();
    const { id } = await params;
    const deletedUser = await db.users.findByIdAndDelete(id);
    if (!deletedUser) return jsonError('Chairperson not found.', 404);
    return NextResponse.json({ message: 'Chairperson deleted successfully.' });
  } catch (error) {
    console.error('Delete chairperson error:', error);
    return jsonError('Server error deleting chairperson.', 500);
  }
}
`);

write('app/api/chairpersons/[id]/reset-password/route.js', `import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { db, connectDB } from '@/lib/db';
import { getAuthUser, requireRole, jsonError } from '@/lib/auth';

export async function POST(request, { params }) {
  const auth = getAuthUser(request);
  if (auth.error) return auth.error;
  const roleErr = requireRole(auth.user, 'Admin');
  if (roleErr) return roleErr;

  try {
    await connectDB();
    const { id } = await params;
    const body = await request.json();
    const { newPassword } = body;
    if (!newPassword) return jsonError('New password is required.', 400);

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);
    const updatedUser = await db.users.findByIdAndUpdate(id, { passwordHash });
    if (!updatedUser) return jsonError('Chairperson not found.', 404);

    return NextResponse.json({ message: 'Password reset successful.' });
  } catch (error) {
    console.error('Reset password error:', error);
    return jsonError('Server error resetting password.', 500);
  }
}
`);

console.log('Phase 1 API routes done');
