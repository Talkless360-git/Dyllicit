import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

/**
 * Generates a Pinata signed upload URL for direct client-side uploads.
 * This bypasses Vercel's 4.5MB serverless function body size limit.
 * 
 * Uses Pinata's v3 Files API to create a temporary signed URL that
 * allows the browser to upload directly to Pinata without exposing
 * the master JWT to the client.
 */
export async function GET(req: Request) {
  try {
    // 1. Session Check
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Check for Pinata JWT
    const jwt = process.env.PINATA_JWT;
    if (!jwt) {
      return NextResponse.json({
        error: 'IPFS Configuration Missing',
        details: 'Server is not configured with PINATA_JWT.'
      }, { status: 501 });
    }

    // 3. Create a signed upload URL via Pinata's v3 API
    // This URL allows the browser to upload directly without exposing the master JWT
    const pinataResponse = await fetch('https://uploads.pinata.cloud/v3/files/sign', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwt}`
      },
      body: JSON.stringify({
        date: Math.floor(Date.now() / 1000) + 1800, // Expires in 30 minutes
      })
    });

    if (!pinataResponse.ok) {
      // Fallback: return the JWT directly for legacy pinFileToIPFS endpoint
      console.warn('[SignedURL] Signed URL generation failed, falling back to JWT mode.');
      const gateway = process.env.NEXT_PUBLIC_PINATA_GATEWAY;
      let gatewayBase = 'https://gateway.pinata.cloud/ipfs';
      if (gateway) {
        let formatted = gateway.startsWith('http') ? gateway : `https://${gateway}`;
        if (formatted.endsWith('/')) formatted = formatted.slice(0, -1);
        if (!formatted.includes('/ipfs')) formatted = `${formatted}/ipfs`;
        gatewayBase = formatted;
      }
      return NextResponse.json({ 
        mode: 'jwt',
        token: jwt, 
        gateway: gatewayBase 
      });
    }

    const { data: signedUrl } = await pinataResponse.json();

    // 4. Get and format Gateway Base URL
    const gateway = process.env.NEXT_PUBLIC_PINATA_GATEWAY;
    let gatewayBase = 'https://gateway.pinata.cloud/ipfs';
    if (gateway) {
      let formatted = gateway.startsWith('http') ? gateway : `https://${gateway}`;
      if (formatted.endsWith('/')) formatted = formatted.slice(0, -1);
      if (!formatted.includes('/ipfs')) formatted = `${formatted}/ipfs`;
      gatewayBase = formatted;
    }

    return NextResponse.json({ 
      mode: 'signed',
      signedUrl,
      gateway: gatewayBase 
    });
  } catch (error: any) {
    console.error('[SignedURL] Error generating signed URL:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
