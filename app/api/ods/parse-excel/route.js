import { NextResponse } from 'next/server';
import * as xlsx from 'xlsx';
import { getAuthUser, jsonError } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { sortODStudents } from '@/lib/od-utils';

const validateODTimeFormatAndBounds = (timeStr) => {
  const trimmedStr = timeStr.trim();
  const odTimeRegex = /^(0?[1-9]|1[0-2]):([0-5][0-9])\s*(AM|PM)\s*-\s*(0?[1-9]|1[0-2]):([0-5][0-9])\s*(AM|PM)$/i;
  const match = trimmedStr.match(odTimeRegex);
  if (!match) {
    return {
      isValid: false,
      message: 'Time must be in "hh:mm AM/PM - hh:mm AM/PM" format (e.g., "09:00 AM - 12:00 PM").'
    };
  }

  const startHour = parseInt(match[1], 10);
  const startMin = parseInt(match[2], 10);
  const startAMPM = match[3].toUpperCase();

  const endHour = parseInt(match[4], 10);
  const endMin = parseInt(match[5], 10);
  const endAMPM = match[6].toUpperCase();

  const convertToMinutes = (hour, min, ampm) => {
    let h = hour;
    if (ampm === 'PM' && h < 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;
    return h * 60 + min;
  };

  const startMinutes = convertToMinutes(startHour, startMin, startAMPM);
  const endMinutes = convertToMinutes(endHour, endMin, endAMPM);

  const minBound = 8 * 60; // 8:00 AM
  const maxBound = 19 * 60 + 30; // 7:30 PM

  if (startMinutes < minBound || startMinutes > maxBound) {
    return {
      isValid: false,
      message: `Start time (${trimmedStr.split('-')[0].trim()}) must be between 08:00 AM and 07:30 PM.`
    };
  }

  if (endMinutes < minBound || endMinutes > maxBound) {
    return {
      isValid: false,
      message: `End time (${trimmedStr.split('-')[1].trim()}) must be between 08:00 AM and 07:30 PM.`
    };
  }

  if (startMinutes >= endMinutes) {
    return {
      isValid: false,
      message: 'Start time must be before end time.'
    };
  }

  return { isValid: true };
};

const validateODDateFormat = (dateStr) => {
  const trimmedStr = dateStr.trim();
  const odDateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!odDateRegex.test(trimmedStr)) {
    return {
      isValid: false,
      message: 'Date must be in "YYYY-MM-DD" format (e.g., "2026-08-28").'
    };
  }

  const [year, month, day] = trimmedStr.split('-').map(Number);
  const dateObj = new Date(year, month - 1, day);
  if (
    dateObj.getFullYear() !== year ||
    dateObj.getMonth() !== month - 1 ||
    dateObj.getDate() !== day
  ) {
    return {
      isValid: false,
      message: 'Date is invalid (e.g., month > 12 or day > 31).'
    };
  }

  return { isValid: true };
};


/**
 * Parses Excel from multipart FormData in-memory (no disk write).
 * TODO: If large files must be persisted, use Vercel Blob instead of fs.writeFileSync.
 */
export async function POST(request) {
  const auth = getAuthUser(request);
  if (auth.error) return auth.error;

  try {
    await connectDB();
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || typeof file === 'string') {
      return jsonError('Excel file is required.', 400);
    }

    const originalName = file.name || '';
    const ext = originalName.toLowerCase().slice(originalName.lastIndexOf('.'));
    if (ext !== '.xlsx' && ext !== '.xls') {
      return jsonError('Only Excel files (.xlsx, .xls) are allowed.', 400);
    }

    // In-memory parse — no fs.writeFileSync (not durable on Vercel)
    console.log('[parse-excel] Parsing Excel in memory (no local FS upload). Cloud storage (Vercel Blob) required for persistent uploads.');
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rawData = xlsx.utils.sheet_to_json(worksheet);

    if (rawData.length === 0) {
      return jsonError('The Excel file is empty.', 400);
    }

    const students = [];
    const duplicatesInFile = new Set();
    const seenRegNumbers = new Set();

    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i];
      const normalizedRow = {};
      Object.keys(row).forEach((k) => {
        normalizedRow[k.trim().toLowerCase()] = row[k];
      });

      const regNo = (
        normalizedRow['registration number'] ||
        normalizedRow['reg no'] ||
        normalizedRow['regno'] ||
        normalizedRow['registration_number'] ||
        ''
      )
        .toString()
        .trim()
        .toUpperCase();
      const name = (
        normalizedRow['student name'] ||
        normalizedRow['name'] ||
        normalizedRow['student_name'] ||
        ''
      )
        .toString()
        .trim();
      const date = (
        normalizedRow['date'] ||
        normalizedRow['event date'] ||
        normalizedRow['start date'] ||
        ''
      )
        .toString()
        .trim();
      const time = (
        normalizedRow['time'] ||
        normalizedRow['event time'] ||
        normalizedRow['time slot'] ||
        ''
      )
        .toString()
        .trim();

      if (!regNo || !name || !date || !time) {
        return jsonError(
          `Validation error at row ${i + 2}: All fields (Registration Number, Student Name, Date, Time) are required and must be valid.`,
          400
        );
      }

      const dateValidation = validateODDateFormat(date);
      if (!dateValidation.isValid) {
        return jsonError(
          `Validation error at row ${i + 2}: ${dateValidation.message}`,
          400
        );
      }

      const timeValidation = validateODTimeFormatAndBounds(time);
      if (!timeValidation.isValid) {
        return jsonError(
          `Validation error at row ${i + 2}: ${timeValidation.message}`,
          400
        );
      }

      const rowKey = `${regNo}_${date}_${time}`;
      if (seenRegNumbers.has(rowKey)) duplicatesInFile.add(`${regNo} on ${date} at ${time}`);
      seenRegNumbers.add(rowKey);

      students.push({
        registrationNumber: regNo,
        studentName: name,
        date,
        time,
      });
    }

    if (duplicatesInFile.size > 0) {
      return NextResponse.json(
        {
          message: `Duplicate student entries for the same date and time slot found in the Excel file: ${Array.from(duplicatesInFile).join(', ')}`,
          duplicates: Array.from(duplicatesInFile),
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ students: sortODStudents(students) });
  } catch (error) {
    console.error('Parse Excel error:', error);
    return jsonError(error.message || 'Server error parsing Excel file.', 500);
  }
}
