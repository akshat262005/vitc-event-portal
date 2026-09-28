import bcrypt from 'bcryptjs';
import * as xlsx from 'xlsx';
import { NextResponse } from 'next/server';
import { db, connectDB } from '@/lib/db';
import { getAuthUser, requireRole, jsonError } from '@/lib/auth';

// Helper to check valid email
const isValidEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

// Helper to check for "NA" / "NIL"
const isNAValue = (val) => {
  if (!val) return true;
  const s = String(val).trim().toLowerCase();
  return s === '' || s === 'na' || s === 'n/a' || s === 'nil' || s === 'none' || s === 'null' || s === '.';
};

// Generate random password
const generatePassword = () => {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let pwd = '';
  for (let i = 0; i < 8; i++) {
    pwd += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pwd;
};

export async function POST(request) {
  const auth = getAuthUser(request);
  if (auth.error) return auth.error;
  const roleErr = requireRole(auth.user, 'Admin');
  if (roleErr) return roleErr;

  try {
    await connectDB();
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return jsonError('No file uploaded.', 400);
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Read workbook
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawRows = xlsx.utils.sheet_to_json(sheet);

    if (rawRows.length === 0) {
      return jsonError('The uploaded Excel file is empty.', 400);
    }

    // Dynamic header mapping helper
    const findHeader = (row, keywords) => {
      const keys = Object.keys(row);
      return keys.find(key => {
        const lowerKey = key.toLowerCase();
        return keywords.some(kw => lowerKey.includes(kw.toLowerCase()));
      });
    };

    const firstRow = rawRows[0];
    const clubKey = findHeader(firstRow, ['club', 'chapter', 'representing', 'represent']);
    const nameKey = findHeader(firstRow, ['chairperson', 'name']);
    const regKey = findHeader(firstRow, ['registration', 'reg']);
    const emailKey = findHeader(firstRow, ['email', 'mail']);

    if (!clubKey || !nameKey || !emailKey) {
      return jsonError('Could not map required columns (Club Name, Chairperson Name, and Email) from the Excel sheet. Please ensure headers are correct.', 400);
    }

    // Load all clubs for lookup
    const allClubs = await db.clubs.find();
    const findClubByName = (name) => {
      if (!name) return null;
      const cleanName = String(name).trim().toLowerCase();
      return allClubs.find(c => c.name.trim().toLowerCase() === cleanName);
    };

    const summary = {
      total: rawRows.length,
      imported: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
    };

    const results = [];

    for (const row of rawRows) {
      const rawClub = row[clubKey];
      const rawName = row[nameKey];
      const rawReg = regKey ? row[regKey] : null;
      const rawEmail = row[emailKey];

      // Skip completely blank rows or rows with empty details
      if (!rawClub && !rawName && !rawEmail) {
        summary.skipped++;
        continue;
      }

      // Check for NA/NIL indicating no chairperson assigned
      if (isNAValue(rawName) || isNAValue(rawEmail)) {
        summary.skipped++;
        continue;
      }

      const clubName = String(rawClub).trim();
      const chairpersonName = String(rawName).trim();
      const email = String(rawEmail).trim().toLowerCase();
      
      // Clean registration number
      const cleanRegNum = isNAValue(rawReg) ? null : String(rawReg).trim().toUpperCase();

      if (!isValidEmail(email)) {
        summary.failed++;
        continue;
      }

      // Find club
      const club = findClubByName(clubName);

      try {
        let existingUser = await db.users.findOne({ email });

        if (existingUser) {
          // Update details
          await db.users.findByIdAndUpdate(existingUser.id || existingUser._id, {
            name: chairpersonName,
            registrationNumber: cleanRegNum || undefined,
            clubId: club ? (club.id || club._id) : existingUser.clubId,
            clubName: club ? club.name : existingUser.clubName,
            designation: 'Club POC',
            status: 'Active',
            importedFromExcel: true,
            updatedAt: new Date()
          });

          summary.updated++;
          results.push({
            name: chairpersonName,
            clubName: club ? club.name : clubName,
            registrationNumber: cleanRegNum || '—',
            email,
            username: existingUser.username,
            password: '[Existing Password]',
            status: 'Active'
          });
        } else {
          // Generate unique username
          let baseUsername = '';
          if (cleanRegNum) {
            baseUsername = cleanRegNum.toLowerCase();
          } else {
            baseUsername = email.split('@')[0].replace(/[^a-z0-9]/g, '');
          }

          let generatedUsername = baseUsername;
          let idx = 1;
          while (await db.users.findOne({ username: generatedUsername })) {
            generatedUsername = `${baseUsername}_${idx}`;
            idx++;
          }

          // Generate password
          const plainPassword = generatePassword();
          const salt = await bcrypt.genSalt(10);
          const passwordHash = await bcrypt.hash(plainPassword, salt);

          await db.users.create({
            name: chairpersonName,
            email,
            registrationNumber: cleanRegNum || undefined,
            clubId: club ? (club.id || club._id) : undefined,
            clubName: club ? club.name : undefined,
            designation: 'Club POC',
            username: generatedUsername,
            passwordHash,
            role: 'Chairperson',
            status: 'Active',
            importedFromExcel: true,
            createdAt: new Date(),
            updatedAt: new Date()
          });

          summary.imported++;
          results.push({
            name: chairpersonName,
            clubName: club ? club.name : clubName,
            registrationNumber: cleanRegNum || '—',
            email,
            username: generatedUsername,
            password: plainPassword,
            status: 'Active'
          });
        }
      } catch (error) {
        console.error('Import error for row:', row, error);
        summary.failed++;
      }
    }

    return NextResponse.json({
      summary,
      chairpersons: results
    });

  } catch (error) {
    console.error('Import error:', error);
    return jsonError('Server error processing Excel import.', 500);
  }
}
