import { NextResponse } from 'next/server';
import { isMongo, connectDB } from '@/lib/db';
import { seedDatabase } from '@/lib/seed';

export async function GET() {
  try {
    await connectDB();
    // Lightweight idempotent seed on first health check (dev / first deploy)
    await seedDatabase();
    return NextResponse.json({
      status: 'ok',
      database: isMongo ? 'MongoDB' : 'Local JSON',
    });
  } catch (error) {
    return NextResponse.json(
      { status: 'error', message: error.message },
      { status: 500 }
    );
  }
}
