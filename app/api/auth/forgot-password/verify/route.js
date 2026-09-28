import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { db, connectDB } from '@/lib/db';
import { jsonError } from '@/lib/auth';

export async function POST(request) {
  try {
    await connectDB();
    const { email, otp } = await request.json();

    if (!email || !email.trim()) {
      return jsonError('Email address is required.', 400);
    }
    if (!otp || !otp.trim()) {
      return jsonError('OTP code is required.', 400);
    }

    const trimmedEmail = email.trim().toLowerCase();

    // Look up the user by email case-insensitively
    const allUsers = await db.users.find({});
    const user = allUsers.find(u => u.email && u.email.trim().toLowerCase() === trimmedEmail);

    if (!user) {
      return jsonError('No account is associated with this email address. Please contact the Administrator.', 404);
    }

    if (!user.otpHash || !user.otpExpiresAt) {
      return jsonError('No active OTP request found for this account.', 400);
    }

    // Verify OTP expiration
    const expiry = new Date(user.otpExpiresAt);
    if (expiry < new Date()) {
      return jsonError('Your OTP has expired. Please request a new OTP.', 400);
    }

    // Compare hash of input OTP with stored hash
    const inputHash = crypto.createHash('sha256').update(otp.trim()).digest('hex');
    if (inputHash !== user.otpHash) {
      return jsonError('Invalid OTP. Please try again.', 400);
    }

    return NextResponse.json({ message: 'OTP verified successfully.' });

  } catch (error) {
    console.error('Verify OTP error:', error);
    return jsonError('Server error verifying OTP. Please try again.', 500);
  }
}
