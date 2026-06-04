import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

/**
 * POST /api/upload/signed-url
 *
 * Generates a Pinata V3 signed upload URL for browser-based uploads,
 * which bypasses CORS issues and the 4.5MB Vercel serverless request body limit.
 */
export async function POST(req: Request) {
  try {
    // 1. Session Check
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse Body
    const { filename, contentType } = await req.json();
    if (!filename || !contentType) {
      return NextResponse.json({ error: 'filename and contentType are required' }, { status: 400 });
    }

    // 3. Check for Pinata Keys
    const jwt = process.env.PINATA_JWT;
    if (!jwt) {
      console.error("Upload failed: Pinata JWT configuration missing on server.");
      return NextResponse.json({ 
        error: 'IPFS Configuration Missing', 
        details: 'Server is not configured with Pinata JWT.' 
      }, { status: 501 });
    }

    // 4. Request signed URL from Pinata V3 API
    const signPayload = {
      date: Math.floor(Date.now() / 1000),
      expires: 900, // URL valid for 15 minutes
      filename: filename,
      allow_mime_types: [contentType]
    };

    console.log(`Generating Pinata signed upload URL for ${filename} (${contentType})`);
    const pinataRes = await fetch('https://uploads.pinata.cloud/v3/files/sign', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${jwt}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(signPayload)
    });

    if (!pinataRes.ok) {
      const errBody = await pinataRes.text();
      console.error(`Pinata signing API error (${pinataRes.status}):`, errBody);
      return NextResponse.json({ 
        error: 'Failed to generate Pinata signed URL', 
        details: errBody 
      }, { status: pinataRes.status });
    }

    const { data: signedUrl } = await pinataRes.json();

    // 5. Get and format Gateway Base URL
    const gateway = process.env.NEXT_PUBLIC_PINATA_GATEWAY;
    let gatewayBase = 'https://gateway.pinata.cloud/ipfs';
    if (gateway) {
      let formatted = gateway.startsWith('http') ? gateway : `https://${gateway}`;
      if (formatted.endsWith('/')) formatted = formatted.slice(0, -1);
      if (!formatted.includes('/ipfs')) formatted = `${formatted}/ipfs`;
      gatewayBase = formatted;
    }

    return NextResponse.json({ url: signedUrl, gateway: gatewayBase });
  } catch (error: any) {
    console.error('IPFS Signed URL Generation Error:', error);
    return NextResponse.json({ 
      error: 'Failed to generate signed URL', 
      details: error.message 
    }, { status: 500 });
  }
}
