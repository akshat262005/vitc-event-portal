import { NextResponse } from 'next/server';
import crypto from 'crypto';
import bcryptjs from 'bcryptjs';
import { db, connectDB } from '@/lib/db';
import { jsonError } from '@/lib/auth';

export async function POST(request) {
  try {
    await connectDB();
    const { email, otp, newPassword } = await request.json();

    if (!email || !email.trim()) {
      return jsonError('Email address is required.', 400);
    }
    if (!otp || !otp.trim()) {
      return jsonError('OTP code is required.', 400);
    }
    if (!newPassword) {
      return jsonError('New password is required.', 400);
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

    // Compare OTP hash
    const inputHash = crypto.createHash('sha256').update(otp.trim()).digest('hex');
    if (inputHash !== user.otpHash) {
      return jsonError('Invalid OTP. Please try again.', 400);
    }

    // Validate password complexity
    const hasMinLength = newPassword.length >= 8;
    const hasUppercase = /[A-Z]/.test(newPassword);
    const hasLowercase = /[a-z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    const hasSpecialChar = /[^A-Za-z0-9]/.test(newPassword);

    if (!hasMinLength || !hasUppercase || !hasLowercase || !hasNumber || !hasSpecialChar) {
      return jsonError(
        'Password does not meet complexity requirements. It must contain at least 8 characters, one uppercase letter, one lowercase letter, one number, and one special character.',
        400
      );
    }

    // Hash the new password using bcryptjs
    const passwordHash = await bcryptjs.hash(newPassword, 10);

    // Save updated password and clear OTP fields to prevent replay
    await db.users.findByIdAndUpdate(user.id || user._id, {
      passwordHash,
      otpHash: null,
      otpExpiresAt: null,
      updatedAt: new Date()
    });

    // Log the password reset event
    await db.resetLogs.create({
      userId: user.id || user._id,
      userEmail: user.email,
    });

    return NextResponse.json({ message: 'Password changed successfully.' });

  } catch (error) {
    console.error('Reset password error:', error);
    return jsonError('Server error resetting password. Please try again.', 500);
  }
}
