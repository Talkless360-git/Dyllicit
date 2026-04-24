"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Headphones, Mic2, ArrowRight } from "lucide-react";

export default function OnboardingPage() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [hoveredRole, setHoveredRole] = useState<string | null>(null);

  const handleSelectRole = async (role: "LISTENER" | "ARTIST") => {
    setLoading(true);
    try {
      const res = await fetch("/api/user/role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (res.ok) {
        await update({ role });
        router.push("/explore");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!session) return null;

  return (
    <div className="onboarding-container">
      <div className="onboarding-card glass animate-fade-in">
        <div className="onboarding-header">
          <h1 className="gradient-text">Welcome to Dyllicit</h1>
          <p>Complete your profile by choosing how you'll experience the future of music.</p>
        </div>

        <div className="role-grid">
          <div 
            className={`role-option glass ${hoveredRole === 'LISTENER' ? 'hovered' : ''}`}
            onMouseEnter={() => setHoveredRole('LISTENER')}
            onMouseLeave={() => setHoveredRole(null)}
            onClick={() => handleSelectRole("LISTENER")}
          >
            <div className="role-icon listener">
              <Headphones size={32} />
            </div>
            <h3>I'm a Listener</h3>
            <p>I want to discover new music, subscribe to artists, and stream content.</p>
            <div className="role-action">
              <span>Finish Setup</span>
              <ArrowRight size={16} />
            </div>
          </div>

          <div 
            className={`role-option glass ${hoveredRole === 'ARTIST' ? 'hovered' : ''} primary`}
            onMouseEnter={() => setHoveredRole('ARTIST')}
            onMouseLeave={() => setHoveredRole(null)}
            onClick={() => handleSelectRole("ARTIST")}
          >
            <div className="role-icon artist">
              <Mic2 size={32} />
            </div>
            <h3>I'm an Artist</h3>
            <p>I want to publish my music, mint NFTs, and manage my royalties.</p>
            <div className="role-action">
              <span>Finish Setup</span>
              <ArrowRight size={16} />
            </div>
          </div>
        </div>

        {loading && <div className="loading-overlay"><Loader2 className="animate-spin" /></div>}
      </div>

      <style jsx>{`
        .onboarding-container {
          min-height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 2rem;
          background: #050505;
        }
        .onboarding-card {
          width: 100%;
          max-width: 900px;
          padding: 4rem;
          border-radius: 2.5rem;
          text-align: center;
          position: relative;
        }
        .onboarding-header {
          margin-bottom: 4rem;
        }
        .onboarding-header h1 {
          font-size: 3rem;
          margin-bottom: 1rem;
        }
        .onboarding-header p {
          opacity: 0.6;
          max-width: 500px;
          margin: 0 auto;
        }
        .role-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2rem;
        }
        .role-option {
          padding: 3rem 2rem;
          border-radius: 2rem;
          cursor: pointer;
          transition: all 0.4s ease;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .role-option:hover {
          transform: translateY(-10px);
          background: rgba(255, 255, 255, 0.05);
          border-color: var(--primary);
        }
        .role-icon {
          width: 70px;
          height: 70px;
          border-radius: 1.25rem;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1.5rem;
          background: rgba(255, 255, 255, 0.05);
        }
        .role-option.primary .role-icon {
          color: var(--primary);
          background: rgba(59, 130, 246, 0.1);
        }
        .role-option h3 {
          margin-bottom: 0.75rem;
        }
        .role-option p {
          font-size: 0.9rem;
          opacity: 0.5;
          line-height: 1.5;
        }
        .role-action {
          margin-top: 2rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 700;
          color: var(--primary);
          opacity: 0;
          transition: 0.3s;
        }
        .role-option:hover .role-action {
          opacity: 1;
        }
        .loading-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0,0,0,0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 2.5rem;
          backdrop-filter: blur(4px);
        }

        @media (max-width: 768px) {
          .role-grid {
            grid-template-columns: 1fr;
          }
          .onboarding-card {
            padding: 2rem;
          }
          .onboarding-header h1 {
            font-size: 2rem;
          }
        }
      `}</style>
    </div>
  );
}
