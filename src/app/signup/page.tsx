"use client";

import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Loader2, Headphones, Mic2, ArrowRight } from "lucide-react";
import Button from "@/components/ui/Button";

export default function SignUpPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [hoveredRole, setHoveredRole] = useState<string | null>(null);

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/explore");
    }
  }, [status, router]);

  const handleSignUp = async (role: "LISTENER" | "ARTIST") => {
    setLoading(true);
    document.cookie = `dyllicit_pending_role=${role}; path=/; max-age=3600`;
    await signIn("google");
  };

  if (status === "loading" || status === "authenticated") {
    return <div className="loading-screen"><Loader2 className="animate-spin" /></div>;
  }

  return (
    <div className="signup-container">
      <div className="signup-card glass animate-fade-in">
        <div className="signup-header">
          <h1 className="gradient-text">Choose Your Path</h1>
          <p>Whether you're here to listen or to create, your journey starts with a choice.</p>
        </div>

        <div className="role-grid">
          <div 
            className={`role-option glass ${hoveredRole === 'LISTENER' ? 'hovered' : ''}`}
            onMouseEnter={() => setHoveredRole('LISTENER')}
            onMouseLeave={() => setHoveredRole(null)}
            onClick={() => handleSignUp("LISTENER")}
          >
            <div className="role-icon listener">
              <Headphones size={32} />
            </div>
            <h3>Join as a Listener</h3>
            <p>Subscribe to support artists, unlock gated content, and stream high-quality music.</p>
            <div className="role-action">
              <span>Continue</span>
              <ArrowRight size={16} />
            </div>
          </div>

          <div 
            className={`role-option glass ${hoveredRole === 'ARTIST' ? 'hovered' : ''} primary`}
            onMouseEnter={() => setHoveredRole('ARTIST')}
            onMouseLeave={() => setHoveredRole(null)}
            onClick={() => handleSignUp("ARTIST")}
          >
            <div className="role-icon artist">
              <Mic2 size={32} />
            </div>
            <h3>Join as an Artist</h3>
            <p>Upload your tracks, mint them as NFTs, and earn royalties directly from your fans.</p>
            <div className="role-action">
              <span>Continue</span>
              <ArrowRight size={16} />
            </div>
          </div>
        </div>

        <div className="signup-footer">
          <p>Already have an account? <button onClick={() => signIn('google')}>Sign in</button></p>
        </div>
      </div>

      <style jsx>{`
        .signup-container {
          min-height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 2rem;
          background: radial-gradient(circle at top right, rgba(59, 130, 246, 0.1), transparent),
                      radial-gradient(circle at bottom left, rgba(139, 92, 246, 0.1), transparent);
        }
        .signup-card {
          width: 100%;
          max-width: 900px;
          padding: 4rem;
          border-radius: 2.5rem;
          text-align: center;
        }
        .signup-header {
          margin-bottom: 4rem;
        }
        .signup-header h1 {
          font-size: 3rem;
          margin-bottom: 1rem;
        }
        .signup-header p {
          opacity: 0.6;
          font-size: 1.1rem;
          max-width: 500px;
          margin: 0 auto;
        }
        .role-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2rem;
          margin-bottom: 3rem;
        }
        .role-option {
          padding: 3rem 2rem;
          border-radius: 2rem;
          cursor: pointer;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          position: relative;
          overflow: hidden;
        }
        .role-option:hover {
          transform: translateY(-10px);
          background: rgba(255, 255, 255, 0.06);
          border-color: rgba(255, 255, 255, 0.2);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
        }
        .role-option.primary:hover {
          border-color: var(--primary);
        }
        .role-icon {
          width: 80px;
          height: 80px;
          border-radius: 1.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 2rem;
          background: rgba(255, 255, 255, 0.05);
          color: white;
          transition: var(--transition);
        }
        .role-option:hover .role-icon {
          transform: scale(1.1) rotate(5deg);
        }
        .role-option.primary .role-icon {
          background: rgba(59, 130, 246, 0.1);
          color: var(--primary);
        }
        .role-option h3 {
          font-size: 1.5rem;
          margin-bottom: 1rem;
        }
        .role-option p {
          font-size: 0.95rem;
          opacity: 0.6;
          line-height: 1.6;
          margin-bottom: 2rem;
        }
        .role-action {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 700;
          color: var(--primary);
          opacity: 0;
          transform: translateY(10px);
          transition: all 0.3s ease;
        }
        .role-option:hover .role-action {
          opacity: 1;
          transform: translateY(0);
        }
        .signup-footer {
          margin-top: 2rem;
          opacity: 0.6;
        }
        .signup-footer button {
          background: none;
          border: none;
          color: var(--primary);
          font-weight: 700;
          cursor: pointer;
          padding: 0;
          margin-left: 0.5rem;
        }
        .signup-footer button:hover {
          text-decoration: underline;
        }
        .loading-screen {
          height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        @media (max-width: 768px) {
          .signup-card {
            padding: 2rem;
          }
          .role-grid {
            grid-template-columns: 1fr;
          }
          .signup-header h1 {
            font-size: 2rem;
          }
        }
      `}</style>
    </div>
  );
}
