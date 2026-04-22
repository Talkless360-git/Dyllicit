"use client";

import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import styles from "@/app/page.module.css";

export default function SignUpPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/explore");
    }
  }, [status, router]);

  const handleSignUp = async (role: "LISTENER" | "ARTIST") => {
    setLoading(true);
    // Explicitly set a cookie that the OAuth callback will check
    document.cookie = `chainstream_pending_role=${role}; path=/; max-age=3600`;
    
    // Redirect to google auth
    await signIn("google");
  };

  if (status === "loading" || status === "authenticated") {
    return <div style={{ display: "flex", justifyContent: "center", paddingTop: "10rem" }}><Loader2 className="animate-spin" color="white" /></div>;
  }

  return (
    <div className={styles.main} style={{ minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center" }}>
      <div style={{ background: "rgba(25,25,35,0.8)", padding: "3rem", borderRadius: "1rem", textAlign: "center", maxWidth: "500px", width: "100%" }}>
        <h2>Create an Account</h2>
        <p style={{ color: "#aaa", margin: "1rem 0 2rem" }}>
          Select your desired role on the platform. It determines what features you can access.
        </p>
        
        <div style={{ display: "flex", gap: "1rem", flexDirection: "column" }}>
          <button 
            disabled={loading}
            onClick={() => handleSignUp("LISTENER")}
            style={{ padding: "1rem 2rem", background: "rgba(255,255,255,0.1)", borderRadius: "0.5rem", border: "1px solid rgba(255,255,255,0.2)", cursor: "pointer", color: "white", fontSize: "1rem" }}>
             Join as a Listener 🎧
          </button>
          
          <button 
            disabled={loading}
            onClick={() => handleSignUp("ARTIST")}
            style={{ padding: "1rem 2rem", background: "linear-gradient(90deg, #ff007a, #7928ca)", borderRadius: "0.5rem", border: "none", cursor: "pointer", color: "white", fontSize: "1rem" }}>
             Join as an Artist 🎤
          </button>
        </div>
        
        {loading && <div style={{ marginTop: "2rem", display: "flex", justifyContent: "center" }}><Loader2 className="animate-spin" color="white" /></div>}
        
        <div style={{ marginTop: "2rem", color: "#888", fontSize: "0.9rem" }}>
          Already have an account? <span onClick={() => signIn('google')} style={{ color: "var(--primary)", cursor: "pointer" }}>Sign in here</span>
        </div>
      </div>
    </div>
  );
}
