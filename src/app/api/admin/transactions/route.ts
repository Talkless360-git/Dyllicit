import { NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { authOptions } from '@/lib/auth';
import { getServerSession } from 'next-auth/next';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 1. Fetch Subscriptions
    const subscriptions = await prisma.subscription.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            address: true,
            name: true,
            email: true
          }
        }
      }
    });

    // 2. Fetch Royalty Distributions (Artist Settlements)
    const royaltyDistributions = await prisma.artistSettlement.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        artist: {
          select: {
            address: true,
            name: true
          }
        },
        royaltySettlement: {
          select: {
            totalPool: true,
            processedAt: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      subscriptions,
      royaltyDistributions
    });
  } catch (error) {
    console.error('Admin Transactions API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
