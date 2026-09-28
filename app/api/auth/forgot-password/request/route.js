import { NextResponse } from 'next/server';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import { db, connectDB } from '@/lib/db';
import { jsonError } from '@/lib/auth';

function logToFile(message) {
  try {
    const logDir = path.join(process.cwd(), 'scratch');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    const logPath = path.join(logDir, 'api_logs.txt');
    const timestamp = new Date().toISOString();
    fs.appendFileSync(logPath, `[${timestamp}] ${message}\n`);
  } catch (e) {
    console.error('Failed to write log to file:', e.message);
  }
}

// Helper to load environment variables dynamically in case Next.js hasn't loaded them on hot-reload
function getEnvValue(key) {
  if (process.env[key]) return process.env[key];
  try {
    const envPath = path.join(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      const lines = content.split('\n');
      for (const line of lines) {
        const parts = line.split('=');
        if (parts[0] && parts[0].trim() === key) {
          return parts.slice(1).join('=').trim();
        }
      }
    }
  } catch (e) {
    logToFile(`getEnvValue: failed to read ${key} from .env file`);
  }
  return undefined;
}

export async function POST(request) {
  try {
    await connectDB();
    const { email } = await request.json();
    logToFile(`Request OTP initiated for: ${email}`);

    if (!email || !email.trim()) {
      logToFile('Request OTP failed: Email address is required.');
      return jsonError('Email address is required.', 400);
    }

    const trimmedEmail = email.trim().toLowerCase();

    // Look up the user by email case-insensitively
    const allUsers = await db.users.find({});
    const user = allUsers.find(u => u.email && u.email.trim().toLowerCase() === trimmedEmail);

    if (!user) {
      logToFile(`Request OTP failed: No account associated with email ${trimmedEmail}`);
      return jsonError('No account is associated with this email address. Please contact the Administrator.', 404);
    }

    // Generate cryptographically secure 6-digit OTP
    const otpCode = crypto.randomInt(100000, 999999).toString();
    const otpHash = crypto.createHash('sha256').update(otpCode).digest('hex');
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes validity

    // Save to user profile (this automatically invalidates previous OTPs)
    await db.users.findByIdAndUpdate(user.id || user._id, {
      otpHash,
      otpExpiresAt
    });
    logToFile(`Generated OTP code ${otpCode} (hash: ${otpHash}) for user ${user.username}`);

    const smtpHost = getEnvValue('SMTP_HOST') || 'smtp.gmail.com';
    const smtpPort = parseInt(getEnvValue('SMTP_PORT') || '587', 10);
    const smtpEmail = getEnvValue('SMTP_EMAIL');
    const smtpPassword = getEnvValue('SMTP_PASSWORD');

    logToFile(`SMTP Config: Host=${smtpHost}, Port=${smtpPort}, Email=${smtpEmail}, HasPassword=${!!smtpPassword}`);

    if (!smtpEmail || !smtpPassword) {
      logToFile('Request OTP failed: SMTP credentials are not configured.');
      throw new Error('SMTP credentials are not configured in the environment.');
    }

    // Configure Nodemailer transporter using dynamic environment values
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpEmail,
        pass: smtpPassword,
      },
    });

    const mailOptions = {
      from: `"VIT Chennai Club & Chapter Portal" <${smtpEmail}>`,
      to: user.email,
      subject: 'Password Reset OTP – VIT Chennai Club & Chapter Portal',
      text: `Hello,

We received a request to reset your password.

Your One-Time Password (OTP) is:

${otpCode}

This OTP is valid for 10 minutes.

If you did not request a password reset, you can safely ignore this email.

Regards,

VIT Chennai Club & Chapter Event Portal`,
    };

    logToFile(`Attempting to send email to ${user.email}...`);
    const info = await transporter.sendMail(mailOptions);
    logToFile(`Email sent successfully! MessageId: ${info.messageId}, Response: ${info.response}`);

    return NextResponse.json({ message: 'OTP sent successfully.' });

  } catch (error) {
    logToFile(`Request OTP error caught: ${error.stack || error.message}`);
    return jsonError('Failed to send OTP. Please try again later.', 500);
  }
}
