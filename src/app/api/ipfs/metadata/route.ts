import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { uploadJSONToIPFS } from '@/lib/ipfs/pinata';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const metadata = await req.json();
    
    if (!metadata) {
      return NextResponse.json({ error: 'No metadata provided' }, { status: 400 });
    }

    // Proxy the JSON upload to Pinata
    const result = await uploadJSONToIPFS(metadata, `metadata-${Date.now()}.json`);

    return NextResponse.json({ 
      success: true, 
      hash: result.hash,
      url: result.url
    });
  } catch (error: any) {
    console.error('IPFS Metadata Proxy Error:', error);
    return NextResponse.json({ 
      error: 'Failed to upload metadata to IPFS', 
      details: error.message 
    }, { status: 500 });
  }
}
