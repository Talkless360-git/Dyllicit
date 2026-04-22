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
    
    // 2. Fetch Stats
    const totalUsers = await prisma.user.count();
    const totalMedia = await prisma.media.count();
    const totalStreams = await prisma.stream.count();
    const totalTransactions = await prisma.transaction.count();
    
    // Aggregate streams by day (last 7 days)
    const streamsByDay = await prisma.stream.groupBy({
      by: ['timestamp'],
      _count: {
        id: true,
      },
      orderBy: {
        timestamp: 'desc',
      },
      take: 50, // Simplified for now
    });

    // Get recent transactions
    const recentTransactions = await prisma.transaction.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { user: true }
    });

    // Get top performing media
    const topMedia = await prisma.media.findMany({
      take: 5,
      include: { 
        _count: { select: { streams: true } }
      },
      orderBy: {
        streams: { _count: 'desc' }
      }
    });

    return NextResponse.json({
      success: true,
      stats: {
        totalUsers,
        totalMedia,
        totalStreams,
        totalTransactions,
        recentTransactions,
        topMedia
      }
    });
  } catch (error) {
    console.error('Admin Stats Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
