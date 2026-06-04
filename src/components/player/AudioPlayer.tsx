'use client';

import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { usePlayerStore } from '@/store/usePlayerStore';
import { useVisualizer } from '@/hooks/useVisualizer';
import { useSession } from 'next-auth/react';
import { 
  Play, Pause, SkipForward, SkipBack, Volume2, Star, Lock, 
  Maximize2, Minimize2, Heart, Shuffle, Repeat, ChevronDown,
  RotateCcw, RotateCw, ListPlus
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getIPFSUrl } from '@/lib/ipfs/utils';
import { useUIStore } from '@/store/useUIStore';

import { useReadContract } from 'wagmi';
import NFTABI from "@/lib/blockchain/contracts/ChainStreamNFT.json";

const AudioPlayer: React.FC = () => {
  const { data: session } = useSession();
  const router = useRouter();
  const isSubscriber = session?.user?.isSubscribed;

  const { 
    currentTrack, 
    isPlaying, 
    setIsPlaying, 
    volume, 
    setVolume, 
    progress, 
    setProgress,
    duration,
    setDuration,
    nextTrack,
    prevTrack
  } = usePlayerStore();
  const { openPlaylistModal } = useUIStore();

  const [isExpanded, setIsExpanded] = useState(false);
  const [activeView, setActiveView] = useState<'cover' | 'lyrics'>('cover');
  const [localTime, setLocalTime] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [mounted, setMounted] = useState(false);
  const lyricRefs = useRef<(HTMLParagraphElement | null)[]>([]);
  const rafRef = useRef<number | null>(null);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Reset playhead when track changes
  useEffect(() => {
    setLocalTime(0);
  }, [currentTrack?.id]);

  // Memoize the parsed lyrics — recomputes only when lyrics text or audio duration changes.
  // Returning null when duration is 0 and there are no timestamps forces a retry once
  // onLoadedMetadata fires and duration becomes known.
  const parsedLyrics = useMemo(() => {
    const rawLyrics = currentTrack?.lyrics;
    if (!rawLyrics || rawLyrics.trim() === '') return null;

    const lines = rawLyrics.split('\n').map((l: string) => l.trim()).filter(Boolean);
    const parsed = lines.map((line: string) => {
      const timeMatch = line.match(/^\[(\d+):(\d+)(?:\.(\d+))?\]\s*(.*)/);
      if (timeMatch) {
        const m = parseInt(timeMatch[1], 10);
        const s = parseInt(timeMatch[2], 10);
        const msStr = timeMatch[3] || '0';
        const ms = parseInt(msStr, 10);
        const fraction = msStr.length === 2 ? ms / 100 : msStr.length === 1 ? ms / 10 : ms / 1000;
        return { time: m * 60 + s + fraction, text: timeMatch[4].trim() };
      }
      return { time: -1, text: line };
    });

    const hasTimestamps = parsed.some((item: { time: number }) => item.time >= 0);
    if (hasTimestamps) {
      return parsed
        .map((item: { time: number; text: string }) =>
          item.time >= 0 ? item : { time: 0, text: item.text }
        )
        .sort((a: { time: number }, b: { time: number }) => a.time - b.time);
    }

    // No timestamps — spread evenly. Return null if duration not yet known.
    if (!duration || duration <= 0) return null;
    const lineDuration = duration / Math.max(lines.length, 1);
    return lines.map((line: string, i: number) => ({ time: i * lineDuration, text: line }));
  }, [currentTrack?.lyrics, duration]);

  // Check NFT Ownership on MegaETH
  const { data: nftBalance } = useReadContract({
    address: NFTABI.address as `0x${string}`,
    abi: NFTABI.abi,
    functionName: 'balanceOf',
    args: [session?.user?.address as `0x${string}`, BigInt(currentTrack?.tokenId || 0)],
    query: {
      enabled: mounted && !!session?.user?.address && !!currentTrack?.tokenId
    }
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  
  const mediaRef = currentTrack?.type === 'video' ? videoRef : audioRef;
  const frequencyData = useVisualizer(mediaRef);
  const [isLiked, setIsLiked] = useState(false);

  // Track if current song is liked
  useEffect(() => {
    if (session && currentTrack) {
      setIsLiked(false); 
    }
  }, [currentTrack, session]);

  // Record Stream History
  useEffect(() => {
    if (session && currentTrack && isPlaying) {
      if (currentTrack.authorId === session.user.id) return;

      const recordStream = async () => {
        try {
          await fetch('/api/interactions/stream', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mediaId: currentTrack.id })
          });
        } catch (e) {
          console.error("Failed to record stream", e);
        }
      };
      
      const timer = setTimeout(recordStream, 3000);
      return () => clearTimeout(timer);
    }
  }, [currentTrack?.id, isPlaying, session]);

  useEffect(() => {
    const activeMedia = mediaRef.current;
    if (!activeMedia) return;

    const isOwner = Number(nftBalance || 0) > 0;
    const isAuthor = !!session?.user?.id && !!currentTrack?.authorId && session.user.id === currentTrack.authorId;
    // Gate if user is NOT a subscriber, NOT the author, and does NOT own the NFT
    const isGated = !isSubscriber && !isAuthor && !isOwner;

    if (isGated) {
      activeMedia.pause();
      return;
    }
    
    if (isPlaying) {
      console.log(`[AudioPlayer] Playing: ${currentTrack?.title} | Gated: ${isGated} | URL: ${getIPFSUrl(currentTrack?.url)}`);
      // Force load on track change to ensure src is updated
      if (activeMedia.paused) {
        activeMedia.play().catch(error => {
          console.error("Playback failed:", error);
          if (error.name !== 'AbortError') {
            setIsPlaying(false);
          }
        });
      }
    } else {
      activeMedia.pause();
    }
  }, [isPlaying, currentTrack?.id, nftBalance, session, isSubscriber, mediaRef, setIsPlaying]);

  // Handle source changes explicitly
  useEffect(() => {
    if (mediaRef.current) {
      mediaRef.current.load();
      if (isPlaying) {
        mediaRef.current.play().catch(() => {});
      }
    }
  }, [currentTrack?.url]);

  useEffect(() => {
    if (mediaRef.current) mediaRef.current.volume = volume;
  }, [volume, mediaRef]);

  const activeLyricIndexRef = useRef(-1);

  // Scroll active lyric into view — but ONLY when the lyrics pane is visible.
  useEffect(() => {
    if (activeView !== 'lyrics') return;
    const idx = activeLyricIndexRef.current;
    if (idx >= 0 && lyricRefs.current[idx]) {
      lyricRefs.current[idx]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }, [localTime, activeView]);

  // High-frequency RAF loop: reads currentTime directly from the media element
  // (~60fps) while the lyrics pane is open. This bypasses the browser's throttled
  // onTimeUpdate (which can lag 250 ms+) for buttery-smooth lyric highlighting.
  useEffect(() => {
    const shouldUseRAF = isExpanded && activeView === 'lyrics' && isPlaying;

    if (shouldUseRAF) {
      const tick = () => {
        const activeMedia = mediaRef.current;
        if (activeMedia && !isDraggingRef.current) {
          const ct = activeMedia.currentTime;
          setLocalTime(ct);
          setProgress((ct / (activeMedia.duration || 1)) * 100);
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } else {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    }

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [isExpanded, activeView, isPlaying, mediaRef, setProgress]);

  // onTimeUpdate — must be a useCallback ABOVE the guard to satisfy Rules of Hooks.
  const onTimeUpdate = useCallback(() => {
    // Skip if RAF loop is running (it provides higher-freq updates while lyrics are open)
    if (isExpanded && activeView === 'lyrics' && isPlaying) return;
    const activeMedia = mediaRef.current;
    if (activeMedia && !isDraggingRef.current) {
      setLocalTime(activeMedia.currentTime);
      setProgress((activeMedia.currentTime / (activeMedia.duration || 1)) * 100);
    }
  }, [isExpanded, activeView, isPlaying, mediaRef, setProgress]);

  // Hydration guard - must be AFTER all hooks
  if (!mounted || !currentTrack) return null;

  const isOwner = Number(nftBalance || 0) > 0;
  const isAuthor = session?.user?.id === currentTrack?.authorId && !!currentTrack?.authorId;
  // Gate if user is NOT a subscriber, NOT the author, and does NOT own the NFT
  const isGated = !isSubscriber && !isAuthor && !isOwner;

  const defaultLyrics = [
    { time: 0,  text: "Welcome to Dyllicit" },
    { time: 5,  text: "Feel the vibration of the block" },
    { time: 10, text: "Your music, your assets, your soul" },
    { time: 15, text: "Streaming on the decentralised path" },
    { time: 20, text: "No more middlemen, just the rhythm" },
    { time: 25, text: "Artists empowered, fans connected" },
    { time: 30, text: "Through the nodes and the smart contracts" },
    { time: 35, text: "We find the harmony of Web3" },
  ];

  // parsedLyrics comes from useMemo above the guard — stable reference,
  // only changes when track lyrics or audio duration changes.
  const lyrics = parsedLyrics || defaultLyrics;

  const activeLyricIndex = lyrics.findIndex((l, i) => {
    const nextTime = lyrics[i + 1]?.time || Infinity;
    const currentTime = localTime || 0;
    return currentTime >= l.time && currentTime < nextTime;
  });

  // Keep the ref in sync so the hoisted useEffect can scroll correctly
  activeLyricIndexRef.current = activeLyricIndex;

  const formatTime = (seconds: number) => {
    if (!isFinite(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!session || !currentTrack) {
      if (!session) alert("Sign in to favorite songs!");
      return;
    }
    try {
      const res = await fetch('/api/interactions/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mediaId: currentTrack.id })
      });
      if (res.ok) {
        const data = await res.json();
        setIsLiked(data.liked);
      }
    } catch (e) {
      console.error("Failed to like song", e);
    }
  };


  const onLoadedMetadata = () => {
    const activeMedia = mediaRef.current;
    if (activeMedia) setDuration(activeMedia.duration);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    const newTime = (val / 100) * duration;
    setLocalTime(newTime);
    if (mediaRef.current) {
      mediaRef.current.currentTime = newTime;
    }
  };

  const skipForward = () => {
    if (mediaRef.current) mediaRef.current.currentTime += 10;
  };

  const skipBackward = () => {
    if (mediaRef.current) mediaRef.current.currentTime -= 10;
  };

  return (
    <div className={`audio-player-wrapper ${isExpanded ? 'expanded' : 'mini animate-slide-up'}`}>
      {currentTrack.type === 'video' ? (
        <video
          ref={videoRef}
          src={getIPFSUrl(currentTrack.url)}
          onTimeUpdate={onTimeUpdate}
          onLoadedMetadata={onLoadedMetadata}
          onEnded={nextTrack}
          style={{ display: isExpanded ? 'block' : 'none', width: isExpanded ? '100%' : '0' }}
          className={isExpanded ? 'expanded-video' : ''}
        />
      ) : (
        <audio
          ref={audioRef}
          src={getIPFSUrl(currentTrack.url)}
          onTimeUpdate={onTimeUpdate}
          onLoadedMetadata={onLoadedMetadata}
          onEnded={nextTrack}
        />
      )}

      {!isExpanded && (
        <div className="player-mini-content">
          <div className="player-track-info" onClick={() => setIsExpanded(true)}>
            <img 
              src={getIPFSUrl(currentTrack.thumbnailUrl) || '/placeholder-music.jpg'} 
              alt={currentTrack.title} 
              className="player-thumb"
              onError={(e) => (e.currentTarget.src = 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=200&h=200&fit=crop')}
            />
            <div className="player-details">
              <h4>{currentTrack.title}</h4>
              <p>{currentTrack.artist}</p>
            </div>
            <Maximize2 size={16} className="ml-2 opacity-50" />
          </div>

          <div className="player-controls-main">
            <div className="control-buttons">
              <button onClick={prevTrack} className="icon-btn" disabled={isGated}><SkipBack size={20} /></button>
              <button onClick={skipBackward} className="icon-btn" disabled={isGated}><RotateCcw size={18} /></button>
              <button onClick={() => setIsPlaying(!isPlaying)} className="play-pause-btn-circle" disabled={isGated}>
                {isGated ? <Lock size={20} /> : isPlaying ? <Pause size={24} /> : <Play size={24} />}
              </button>
              <button onClick={skipForward} className="icon-btn" disabled={isGated}><RotateCw size={18} /></button>
              <button onClick={nextTrack} className="icon-btn" disabled={isGated}><SkipForward size={20} /></button>
            </div>
            <div className="progress-container">
              <span className="time-text" style={{ fontSize: '0.7rem', opacity: 0.5, minWidth: '35px' }}>{formatTime(localTime)}</span>
              <input 
                type="range"
                className="player-slider"
                min="0"
                max="100"
                step="0.1"
                value={progress}
                onMouseDown={() => { setIsDragging(true); isDraggingRef.current = true; }}
                onMouseUp={() => { setIsDragging(false); isDraggingRef.current = false; }}
                onChange={handleSeek}
                style={{
                  background: `linear-gradient(to right, var(--primary) 0%, var(--primary) ${progress}%, rgba(255, 255, 255, 0.1) ${progress}%, rgba(255, 255, 255, 0.1) 100%)`
                }}
              />
              <span className="time-text" style={{ fontSize: '0.7rem', opacity: 0.5, minWidth: '35px' }}>{formatTime(duration)}</span>
            </div>
          </div>

          <div className="player-actions-right">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginRight: '1rem' }}>
              <Volume2 size={18} />
              <input 
                type="range" min="0" max="1" step="0.01" 
                value={volume} 
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="player-slider"
                style={{ 
                  width: '80px',
                  background: `linear-gradient(to right, var(--primary) 0%, var(--primary) ${volume * 100}%, rgba(255, 255, 255, 0.1) ${volume * 100}%, rgba(255, 255, 255, 0.1) 100%)`
                }}
              />
            </div>
            <Heart 
              size={20} 
              className={`cursor-pointer transition-colors ${isLiked ? 'text-red-500 fill-red-500' : 'hover:text-red-500'}`} 
              onClick={handleLike}
            />
            {session && (
              <ListPlus 
                size={20} 
                className="cursor-pointer opacity-60 hover:opacity-100 transition-opacity" 
                onClick={() => openPlaylistModal({ id: currentTrack.id, title: currentTrack.title })}
              />
            )}
            <button onClick={() => setIsExpanded(true)} className="icon-btn">
               <Maximize2 size={20} />
            </button>
          </div>
        </div>
      )}

      {isExpanded && (
        <div className="expanded-player-view animate-fade-in">
          <div className="expanded-player-bg">
            <img 
              src={getIPFSUrl(currentTrack.thumbnailUrl) || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&h=800&fit=crop'} 
              className="bg-image" 
              alt="Background" 
            />
          </div>

          <header className="expanded-header" style={{ padding: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button onClick={() => setIsExpanded(false)} className="icon-btn" style={{ background: 'rgba(255,255,255,0.1)', padding: '0.5rem' }}>
              <ChevronDown size={32} />
            </button>
            
            <div className="player-view-switcher">
              <button 
                className={`switcher-btn ${activeView === 'cover' ? 'active' : ''}`}
                onClick={() => setActiveView('cover')}
              >
                Canvas
              </button>
              <button 
                className={`switcher-btn ${activeView === 'lyrics' ? 'active' : ''}`}
                onClick={() => setActiveView('lyrics')}
              >
                Lyrics
              </button>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              {session && (
                <button 
                  className="icon-btn" 
                  onClick={() => openPlaylistModal({ id: currentTrack.id, title: currentTrack.title })}
                >
                  <ListPlus size={24} />
                </button>
              )}
              <button className="icon-btn"><Star size={24} /></button>
            </div>
          </header>

          <main className="expanded-content">
            {activeView === 'cover' ? (
              <div className="expanded-artwork-side">
                {currentTrack.type === 'video' ? (
                  <div className="video-container" style={{ width: '100%', borderRadius: '24px', overflow: 'hidden', background: '#000', boxShadow: '0 20px 60px rgba(0,0,0,0.8)' }}>
                    <video
                      ref={videoRef}
                      src={getIPFSUrl(currentTrack.url)}
                      onTimeUpdate={onTimeUpdate}
                      onLoadedMetadata={onLoadedMetadata}
                      onEnded={nextTrack}
                      controls
                      style={{ width: '100%', aspectRatio: '16/9' }}
                    />
                  </div>
                ) : (
                  <div className="artwork-glow-wrap">
                    <div className="artwork-ambient-glow" style={{ backgroundImage: `url(${getIPFSUrl(currentTrack.thumbnailUrl)})` }}></div>
                    <img 
                      src={getIPFSUrl(currentTrack.thumbnailUrl) || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&h=800&fit=crop'} 
                      className="big-artwork centered" 
                      alt={currentTrack.title} 
                    />
                  </div>
                )}
                <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                  <h2 style={{ fontSize: 'min(2.2rem, 4vh)', fontWeight: 800, margin: '0 0 0.25rem 0' }}>{currentTrack.title}</h2>
                  <p style={{ fontSize: 'min(1.1rem, 2.5vh)', opacity: 0.7 }}>{currentTrack.artist}</p>
                </div>
              </div>
            ) : (
              <div className="expanded-lyrics-container">
                <div className="mini-track-header">
                  <img 
                    src={getIPFSUrl(currentTrack.thumbnailUrl) || '/placeholder-music.jpg'} 
                    alt={currentTrack.title} 
                    className="mini-header-thumb"
                    onError={(e) => (e.currentTarget.src = 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=200&h=200&fit=crop')}
                  />
                  <div>
                    <h3>{currentTrack.title}</h3>
                    <p>{currentTrack.artist}</p>
                  </div>
                </div>
                
                <div className="expanded-lyrics-side full-width">
                  {lyrics.map((line, i) => (
                    <p 
                      key={i} 
                      ref={el => { lyricRefs.current[i] = el; }}
                      className={`lyric-line ${activeLyricIndex === i ? 'active' : ''}`}
                      onClick={() => {
                        if (line.time >= 0 && mediaRef.current) {
                          mediaRef.current.currentTime = line.time;
                          setLocalTime(line.time);
                        }
                      }}
                      style={{ cursor: line.time >= 0 ? 'pointer' : 'default' }}
                    >
                      {line.text}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </main>

          <footer className="expanded-controls-bar" style={{ padding: '0 4rem 2rem 4rem', maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
            <div className="progress-container" style={{ maxWidth: 'none', marginBottom: '1.25rem' }}>
              <span style={{ minWidth: '50px', fontSize: '0.8rem', opacity: 0.5 }}>{formatTime(localTime)}</span>
              <input 
                type="range"
                className="player-slider"
                min="0"
                max="100"
                step="0.1"
                value={progress}
                onMouseDown={() => { setIsDragging(true); isDraggingRef.current = true; }}
                onMouseUp={() => { setIsDragging(false); isDraggingRef.current = false; }}
                onChange={handleSeek}
                style={{ 
                  height: '6px',
                  background: `linear-gradient(to right, var(--primary) 0%, var(--primary) ${progress}%, rgba(255, 255, 255, 0.1) ${progress}%, rgba(255, 255, 255, 0.1) 100%)`
                }}
              />
              <span style={{ minWidth: '50px', textAlign: 'right', fontSize: '0.8rem', opacity: 0.5 }}>{formatTime(duration)}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '2rem' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flex: 1 }}>
                 <button className="icon-btn" title="Shuffle"><Shuffle size={18} /></button>
                 <button className="icon-btn" onClick={prevTrack} title="Previous"><SkipBack size={22} /></button>
                 <button className="icon-btn" onClick={skipBackward} title="Rewind 10s"><RotateCcw size={18} /></button>
              </div>

              <button 
                onClick={() => setIsPlaying(!isPlaying)} 
                className="play-pause-btn-circle"
                style={{ width: '64px', height: '64px', flexShrink: 0 }}
              >
                {isGated ? <Lock size={24} /> : isPlaying ? <Pause size={28} /> : <Play size={28} />}
              </button>

              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flex: 1, justifyContent: 'flex-end' }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginRight: '1rem', background: 'rgba(255,255,255,0.03)', padding: '0.5rem 1rem', borderRadius: '2rem' }}>
                    <Volume2 size={16} className="opacity-60" />
                    <input 
                      type="range" min="0" max="1" step="0.01" 
                      value={volume} 
                      onChange={(e) => setVolume(parseFloat(e.target.value))}
                      className="player-slider"
                      style={{ 
                        width: '70px',
                        background: `linear-gradient(to right, var(--primary) 0%, var(--primary) ${volume * 100}%, rgba(255, 255, 255, 0.1) ${volume * 100}%, rgba(255, 255, 255, 0.1) 100%)`
                      }}
                    />
                 </div>
                 <button className="icon-btn" onClick={skipForward} title="Forward 10s"><RotateCw size={18} /></button>
                 <button className="icon-btn" onClick={nextTrack} title="Next"><SkipForward size={22} /></button>
                 <button className="icon-btn" title="Repeat"><Repeat size={18} /></button>
              </div>
            </div>
          </footer>
        </div>
      )}

      {isGated && !isExpanded && (
        <div className="premium-overlay" style={{ position: 'absolute', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)' }}>
           <div style={{ textAlign: 'center', padding: '1rem' }}>
             <Star size={24} color="var(--accent)" fill="var(--accent)" style={{ marginBottom: '0.5rem' }} />
             <p style={{ fontSize: '0.8rem', margin: 0 }}>Subscribers Only</p>
             <button className="btn btn-primary btn-sm" style={{ marginTop: '0.5rem' }} onClick={() => { setIsExpanded(false); router.push('/subscription'); }}>Subscribe to Unlock</button>
           </div>
        </div>
      )}
    </div>
  );
};

export default AudioPlayer;
