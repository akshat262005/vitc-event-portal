import bcrypt from 'bcryptjs';
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
        clubId: user.clubId?._id ? user.clubId._id.toString() : user.clubId,
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
        clubId: user.clubId?._id ? user.clubId._id.toString() : user.clubId,
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
