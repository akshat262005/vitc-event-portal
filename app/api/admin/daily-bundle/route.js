import { NextResponse } from 'next/server';
import archiver from 'archiver';
import * as xlsx from 'xlsx';
import { db, connectDB } from '@/lib/db';
import { getAuthUser, requireRole, jsonError } from '@/lib/auth';

/**
 * Builds ZIP in-memory (no disk writes) for Vercel serverless.
 * Local report file paths are skipped — Drive links are included as text.
 * TODO: Move binary report storage to Vercel Blob / S3 when file uploads return.
 */
export async function GET(request) {
  const auth = getAuthUser(request);
  if (auth.error) return auth.error;
  const roleErr = requireRole(auth.user, 'Admin');
  if (roleErr) return roleErr;

  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  if (!date) return jsonError('Date parameter is required.', 400);

  try {
    await connectDB();
    const reports = await db.reports.find({ eventDate: date });
    const ods = await db.ods.find({ eventDate: date });

    if (reports.length === 0 && ods.length === 0) {
      return jsonError('No events or OD lists found for this date.', 404);
    }

    const chunks = [];
    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.on('data', (chunk) => chunks.push(chunk));

    const done = new Promise((resolve, reject) => {
      archive.on('end', resolve);
      archive.on('error', reject);
    });

    const driveLinks = [];
    reports.forEach((report) => {
      if (report.reportFilePath) {
        if (
          report.reportFilePath.startsWith('http://') ||
          report.reportFilePath.startsWith('https://')
        ) {
          driveLinks.push(
            `Club: ${report.clubName}\nEvent: ${report.eventName}\nDuration: ${report.eventDate} to ${report.eventEndDate}\nLink: ${report.reportFilePath}\n\n`
          );
        } else {
          // Local FS uploads are not available on Vercel serverless
          console.log(
            '[daily-bundle] Skipping local file path (use Vercel Blob):',
            report.reportFilePath
          );
        }
      }
    });

    if (driveLinks.length > 0) {
      const linksContent =
        `VIT CHENNAI EVENT REPORTS - GOOGLE DRIVE/DOCUMENT LINKS\nDate: ${date}\n============================================================\n\n` +
        driveLinks.join('');
      archive.append(linksContent, { name: `Consolidated_Report_Drive_Links_${date}.txt` });
    }

    if (ods.length > 0) {
      const wb = xlsx.utils.book_new();
      ods.forEach((od) => {
        const sheetData = od.students.map((s) => ({
          'Registration Number': s.registrationNumber,
          'Student Name': s.studentName,
          Date: s.date,
          Time: s.time,
        }));
        const ws = xlsx.utils.json_to_sheet(sheetData);
        ws['!cols'] = [{ wch: 22 }, { wch: 25 }, { wch: 15 }, { wch: 25 }];
        const sanitizedEvent = od.eventName.substring(0, 25).replace(/[^a-z0-9]/gi, '_');
        xlsx.utils.book_append_sheet(wb, ws, sanitizedEvent || 'OD_List');
      });
      const excelBuffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
      archive.append(excelBuffer, { name: `Consolidated_ODs_${date}.xlsx` });
    }

    await archive.finalize();
    await done;

    const buffer = Buffer.concat(chunks);
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename=VITC_Daily_Bundle_${date}.zip`,
      },
    });
  } catch (error) {
    console.error('Generate daily bundle error:', error);
    return jsonError('Server error generating daily bundle.', 500);
  }
}
