"use client";

import { useState, useEffect } from "react";
import Button from "@/components/ui/Button";
import { Download, CheckCircle, Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";

export default function DownloadButton({ trackUrl }: { trackUrl: string }) {
  const [downloaded, setDownloaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const { data: session } = useSession();

  useEffect(() => {
    if (!window.caches) return;
    caches.open('chainstream-offline-media-v1').then(cache => {
      cache.match(trackUrl).then(res => {
        if (res) setDownloaded(true);
      });
    });
  }, [trackUrl]);

  const handleDownload = async () => {
    if (!session) return alert("Must be signed in to download.");
    
    // Validate subscription
    setLoading(true);
    try {
      const resSub = await fetch('/api/subscription');
      const dataSub = await resSub.json();
      if (!dataSub.subscribed) {
        alert("Premium subscription required for offline downloads.");
        setLoading(false);
        return;
      }

      if (!window.caches) {
         alert("Your browser does not support offline caching.");
         return;
      }

      const cache = await caches.open('chainstream-offline-media-v1');
      await cache.add(trackUrl);
      setDownloaded(true);
    } catch (e) {
      console.error(e);
      alert("Failed to download media offline");
    } finally {
      setLoading(false);
    }
  };

  if (downloaded) {
    return <Button variant="secondary" size="sm" disabled><CheckCircle size={16} /> Saved Offline</Button>;
  }

  return (
    <Button variant="primary" size="sm" onClick={handleDownload} disabled={loading}>
      {loading ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />} 
      {loading ? " Downloading..." : " Download"}
    </Button>
  );
}
