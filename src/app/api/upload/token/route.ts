import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

/**
 * GET /api/upload/token
 *
 * Returns the Pinata JWT so authenticated clients can upload files
 * DIRECTLY to Pinata, bypassing the Vercel serverless 4.5MB body limit.
 *
 * Security: only authenticated users receive the token.
 * The JWT is already stored in PINATA_JWT env var on Vercel.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const jwt = process.env.PINATA_JWT;
  if (!jwt) {
    return NextResponse.json({ error: 'Pinata not configured' }, { status: 501 });
  }

  const gateway = process.env.NEXT_PUBLIC_PINATA_GATEWAY || 'https://gateway.pinata.cloud/ipfs';
  const formattedGateway = gateway.endsWith('/') ? gateway.slice(0, -1) : gateway;
  const gatewayBase = formattedGateway.includes('/ipfs')
    ? formattedGateway
    : `${formattedGateway}/ipfs`;

  return NextResponse.json({ token: jwt, gateway: gatewayBase });
}
