"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import Button from "@/components/ui/Button";

export default function FollowButton({ artistId, initialFollowers }: { artistId: string, initialFollowers: number }) {
  const { data: session } = useSession();
  const [following, setFollowing] = useState(false); // Can be initialized from an API endpoint if needed
  
  const toggleFollow = async () => {
    if (!session) return alert("Please sign in to follow this artist.");
    
    const res = await fetch("/api/artist/follow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ artistId })
    });
    const data = await res.json();
    if (data.success) {
      setFollowing(data.following);
    }
  };

  return (
    <Button variant={following ? "secondary" : "primary"} size="sm" onClick={toggleFollow}>
      {following ? "Following" : "Follow"}
    </Button>
  );
}
