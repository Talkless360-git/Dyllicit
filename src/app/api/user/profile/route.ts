import { NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const { payoutAddress, name, bio, twitter, instagram } = await req.json();

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        payoutAddress,
        name,
        bio,
        twitter,
        instagram,
        role: session.user.role === 'ADMIN' ? 'ADMIN' : 'ARTIST' // Only elevate to artist if not already admin
      },
    });

    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error('Profile Update Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
