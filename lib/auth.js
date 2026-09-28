import jwt from 'jsonwebtoken';
import { NextResponse } from 'next/server';

export const JWT_SECRET = process.env.JWT_SECRET || 'vit_secret_key_2026';

/**
 * Extract and verify JWT from Authorization: Bearer <token>
 * @returns {{ user: object } | { error: NextResponse }}
 */
export function getAuthUser(request) {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return {
      error: NextResponse.json(
        { message: 'Access denied. No token provided.' },
        { status: 401 }
      ),
    };
  }

  try {
    const user = jwt.verify(token, JWT_SECRET);
    return { user };
  } catch {
    return {
      error: NextResponse.json(
        { message: 'Invalid or expired token.' },
        { status: 403 }
      ),
    };
  }
}

export function requireRole(user, role) {
  if (!user) {
    return NextResponse.json(
      { message: 'Unauthorized. User not authenticated.' },
      { status: 401 }
    );
  }
  if (user.role !== role) {
    return NextResponse.json(
      { message: `Access forbidden. Requires ${role} role.` },
      { status: 403 }
    );
  }
  return null;
}

export function jsonOk(data, status = 200) {
  return NextResponse.json(data, { status });
}

export function jsonError(message, status = 500) {
  return NextResponse.json({ message }, { status });
}
