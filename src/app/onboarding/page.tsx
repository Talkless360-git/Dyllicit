"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "@/app/page.module.css";
import { Loader2 } from "lucide-react";

export default function OnboardingPage() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSelectRole = async (role: "LISTENER" | "ARTIST") => {
    setLoading(true);
    try {
      const res = await fetch("/api/user/role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (res.ok) {
        await update({ role }); // Update NextAuth session
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
    <div className={styles.main} style={{ minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center" }}>
      <div style={{ background: "rgba(25,25,35,0.8)", padding: "3rem", borderRadius: "1rem", textAlign: "center", maxWidth: "500px" }}>
        <h2>Welcome to ChainStream</h2>
        <p style={{ color: "#aaa", margin: "1rem 0 2rem" }}>
          How do you plan to use the platform? You can always change this later.
        </p>
        
        <div style={{ display: "flex", gap: "1rem", flexDirection: "column" }}>
          <button 
            disabled={loading}
            onClick={() => handleSelectRole("LISTENER")}
            style={{ padding: "1rem 2rem", background: "rgba(255,255,255,0.1)", borderRadius: "0.5rem", border: "1px solid rgba(255,255,255,0.2)", cursor: "pointer", color: "white", fontSize: "1rem" }}>
            I'm a Listener 🎧
          </button>
          
          <button 
            disabled={loading}
            onClick={() => handleSelectRole("ARTIST")}
            style={{ padding: "1rem 2rem", background: "linear-gradient(90deg, #ff007a, #7928ca)", borderRadius: "0.5rem", border: "none", cursor: "pointer", color: "white", fontSize: "1rem" }}>
            I'm an Artist 🎤
          </button>
        </div>
        
        {loading && <div style={{ marginTop: "2rem", display: "flex", justifyContent: "center" }}><Loader2 className="animate-spin" /></div>}
      </div>
    </div>
  );
}
