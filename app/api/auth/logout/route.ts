import { NextResponse } from 'next/server';
import { logout } from '@/lib/auth';

export async function POST() {
  // Clear the session cookie
  await logout();
  return NextResponse.json({ success: true });
}