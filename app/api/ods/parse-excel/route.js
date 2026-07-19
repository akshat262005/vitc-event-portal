import { NextResponse } from 'next/server';
import * as xlsx from 'xlsx';
import { getAuthUser, jsonError } from '@/lib/auth';
import { connectDB } from '@/lib/db';

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

      if (seenRegNumbers.has(regNo)) duplicatesInFile.add(regNo);
      seenRegNumbers.add(regNo);

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
          message: `Duplicate registration numbers found in the Excel file: ${Array.from(duplicatesInFile).join(', ')}`,
          duplicates: Array.from(duplicatesInFile),
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ students });
  } catch (error) {
    console.error('Parse Excel error:', error);
    return jsonError(error.message || 'Server error parsing Excel file.', 500);
  }
}
