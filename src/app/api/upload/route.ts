import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { uploadToIPFS } from '@/lib/ipfs/pinata';

/**
 * Upload Route (Strict IPFS Mode)
 * 
 * Proxies file uploads to Pinata IPFS. 
 * Local storage fallback is disabled as per user configuration.
 */
export async function POST(req: Request) {
  try {
    // 1. Session Check
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse FormData
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const tokenId = formData.get('tokenId') as string;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // 3. Check for Pinata Keys
    const hasPinata = !!(process.env.PINATA_JWT || (process.env.PINATA_API_KEY && process.env.PINATA_API_SECRET));
    
    if (!hasPinata) {
      console.error("Upload failed: Pinata configuration missing on server.");
      return NextResponse.json({ 
        error: 'IPFS Configuration Missing', 
        details: 'Server is not configured with Pinata API keys. Local fallback is disabled.' 
      }, { status: 501 }); // 501 Not Implemented (as per strict mode)
    }

    // 4. Proxy to Pinata
    console.log(`Proxying file upload to IPFS for TokenID: ${tokenId || 'unknown'}`);
    const result = await uploadToIPFS(file, file.name);

    return NextResponse.json({ 
      success: true, 
      hash: result.hash,
      url: result.url 
    });
  } catch (error: any) {
    console.error('IPFS Proxy Upload Error:', error);
    return NextResponse.json({ 
      error: 'Failed to upload to IPFS', 
      details: error.message 
    }, { status: 500 });
  }
}
