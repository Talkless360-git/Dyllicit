'use client';

import React, { useEffect } from 'react';
import MintForm from '@/components/nft/MintForm';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function MintPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated' || (session?.user && session.user.role !== 'ARTIST' && session.user.role !== 'ADMIN')) {
      router.push('/explore');
    }
  }, [session, status, router]);

  if (status === 'loading' || !session || (session.user.role !== 'ARTIST' && session.user.role !== 'ADMIN')) {
    return null;
  }
  return (
    <div className="mint-studio-container animate-fade-in">
      <div className="gradient-header">
        <h1>Creator Studio</h1>
        <p>Tokenize your music and videos into the future of media.</p>
      </div>

      <main className="mint-main">
        <MintForm />
      </main>

      <style jsx>{`
        .mint-studio-container {
          min-height: 100vh;
          padding: 8rem 2rem 10rem;
          background: linear-gradient(to bottom, #0a0a0a 0%, #050505 100%);
        }
        .gradient-header {
          text-align: center;
          margin-bottom: 5rem;
        }
        .gradient-header h1 {
          font-size: 4rem;
          background: linear-gradient(135deg, white 0%, var(--primary) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin-bottom: 1rem;
        }
        .gradient-header p {
          font-size: 1.25rem;
          opacity: 0.6;
        }
        .mint-main {
          display: flex;
          justify-content: center;
        }
      `}</style>
    </div>
  );
}
