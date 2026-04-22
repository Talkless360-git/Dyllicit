import { NextResponse } from 'next/server';
import { generateNonce } from 'siwe';

export async function GET() {
  const nonce = generateNonce();
  
  // In a real app, you'd store this nonce in a session or cookie to verify later
  const response = NextResponse.json({ nonce });
  
  // Set a session cookie with the nonce (simplified for this demo)
  response.cookies.set('siwe-nonce', nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 5, // 5 minutes
  });
  
  return response;
}
