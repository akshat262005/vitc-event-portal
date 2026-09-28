import { NextResponse } from 'next/server';
import * as xlsx from 'xlsx';
import { jsonError } from '@/lib/auth';

export async function GET() {
  try {
    const wb = xlsx.utils.book_new();
    const headers = ['Registration Number', 'Student Name', 'Date', 'Time'];
    const sampleRows = [
      ['21BCE0001', 'Akash Sharma', '2026-07-14', '09:00 AM - 12:00 PM'],
      ['21BCE0002', 'Priya Nair', '2026-07-14', '09:00 AM - 12:00 PM'],
      ['22BEC0015', 'Rahul Varma', '2026-07-14', '02:00 PM - 05:00 PM'],
      ['23BME0104', 'Sneha Sen', '2026-07-14', '09:00 AM - 05:00 PM'],
    ];
    const ws = xlsx.utils.aoa_to_sheet([headers, ...sampleRows]);
    ws['!cols'] = [{ wch: 22 }, { wch: 25 }, { wch: 15 }, { wch: 25 }];
    xlsx.utils.book_append_sheet(wb, ws, 'OD_Template');
    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename=VITC_OD_Template.xlsx',
      },
    });
  } catch (error) {
    console.error('Generate template error:', error);
    return jsonError('Failed to generate Excel template.', 500);
  }
}
