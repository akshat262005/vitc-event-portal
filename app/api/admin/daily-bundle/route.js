import { NextResponse } from 'next/server';
import archiver from 'archiver';
import * as xlsx from 'xlsx';
import { db, connectDB } from '@/lib/db';
import { getAuthUser, requireRole, jsonError } from '@/lib/auth';
import { buildConsolidatedODWorkbook } from '@/lib/od-utils';

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
  const singleDate = searchParams.get('date');
  const startDate = searchParams.get('startDate') || singleDate;
  const endDate = searchParams.get('endDate') || singleDate || startDate;

  if (!startDate || !endDate) {
    return jsonError('Date parameter (date or startDate and endDate) is required.', 400);
  }

  const isRange = startDate !== endDate;
  const dateLabel = isRange ? `${startDate}_to_${endDate}` : startDate;

  try {
    await connectDB();

    let reportFilter;
    let odFilter;

    if (!isRange) {
      reportFilter = {
        $or: [
          { eventDate: startDate },
          {
            eventDate: { $lte: startDate },
            eventEndDate: { $gte: startDate }
          }
        ]
      };
      odFilter = { eventDate: startDate };
    } else {
      reportFilter = {
        $or: [
          { eventDate: { $gte: startDate, $lte: endDate } },
          {
            eventDate: { $lte: endDate },
            eventEndDate: { $gte: startDate }
          }
        ]
      };
      odFilter = {
        eventDate: { $gte: startDate, $lte: endDate }
      };
    }

    const [reports, ods] = await Promise.all([
      db.reports.find(reportFilter),
      db.ods.find(odFilter)
    ]);

    if (reports.length === 0 && ods.length === 0) {
      return jsonError(`No events or OD lists found for ${isRange ? `the date range ${startDate} to ${endDate}` : `date ${startDate}`}.`, 404);
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
            `Club: ${report.clubName}\nEvent: ${report.eventName}\nDuration: ${report.eventDate} to ${report.eventEndDate || report.eventDate}\nCategory: ${report.category || 'N/A'}\nLink: ${report.reportFilePath}\n\n`
          );
        } else {
          console.log(
            '[daily-bundle] Skipping local file path (use Vercel Blob):',
            report.reportFilePath
          );
        }
      }
    });

    if (driveLinks.length > 0) {
      const linksContent =
        `VIT CHENNAI EVENT REPORTS - GOOGLE DRIVE/DOCUMENT LINKS\n` +
        `${isRange ? `Date Range: ${startDate} to ${endDate}` : `Date: ${startDate}`}\n` +
        `Total Reports Included: ${driveLinks.length}\n` +
        `============================================================\n\n` +
        driveLinks.join('');
      archive.append(linksContent, { name: `Consolidated_Report_Drive_Links_${dateLabel}.txt` });
    }

    if (ods.length > 0) {
      const wb = buildConsolidatedODWorkbook(ods, xlsx);
      const excelBuffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
      archive.append(excelBuffer, { name: `Consolidated_OD_Slots_${dateLabel}.xlsx` });
    }

    await archive.finalize();
    await done;

    const buffer = Buffer.concat(chunks);
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename=VITC_Unified_Bundle_${dateLabel}.zip`,
      },
    });
  } catch (error) {
    console.error('Generate daily bundle error:', error);
    return jsonError('Server error generating daily bundle.', 500);
  }
}
