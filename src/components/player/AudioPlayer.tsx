'use client';

import React, { useRef, useEffect, useState } from 'react';
import { usePlayerStore } from '@/store/usePlayerStore';
import { useVisualizer } from '@/hooks/useVisualizer';
import { useSession } from 'next-auth/react';
import { 
  Play, Pause, SkipForward, SkipBack, Volume2, Star, Lock, 
  Maximize2, Minimize2, Heart, Shuffle, Repeat, ChevronDown,
  RotateCcw, RotateCw
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getIPFSUrl } from '@/lib/ipfs/utils';

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

  const [isExpanded, setIsExpanded] = useState(false);
  const [localTime, setLocalTime] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  
  const isAuthor = !!session?.user?.id && !!currentTrack?.authorId && session.user.id === currentTrack.authorId;
  const isGated = !isSubscriber && !isAuthor;
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  
  const mediaRef = currentTrack?.type === 'video' ? videoRef : audioRef;
  const frequencyData = useVisualizer(mediaRef);

  const lyrics = [
    { time: 0, text: "Welcome to Dyllicit" },
    { time: 5, text: "Feel the vibration of the block" },
    { time: 10, text: "Your music, your assets, your soul" },
    { time: 15, text: "Streaming on the decentralized path" },
    { time: 20, text: "No more middlemen, just the rhythm" },
    { time: 25, text: "Artists empowered, fans connected" },
    { time: 30, text: "Through the nodes and the smart contracts" },
    { time: 35, text: "We find the harmony of Web3" },
  ];

  const activeLyricIndex = lyrics.findIndex((l, i) => {
    const nextTime = lyrics[i + 1]?.time || Infinity;
    const currentTime = localTime || 0;
    return currentTime >= l.time && currentTime < nextTime;
  });

  const [isLiked, setIsLiked] = useState(false);

  const formatTime = (seconds: number) => {
    if (!isFinite(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Track if current song is liked
  useEffect(() => {
    if (session && currentTrack) {
      // In a real app, we'd fetch the liked status. 
      // For now, we'll keep it local or assume false.
      setIsLiked(false); 
    }
  }, [currentTrack, session]);

  // Record Stream History
  useEffect(() => {
    if (session && currentTrack && isPlaying) {
      // Skip recording for artists playing their own songs (no royalties for self-plays)
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
      
      // Debounce stream recording (only record if played for at least 3 seconds)
      const timer = setTimeout(recordStream, 3000);
      return () => clearTimeout(timer);
    }
  }, [currentTrack?.id, isPlaying, session]);

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!session) {
      alert("Sign in to favorite songs!");
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

  useEffect(() => {
    const activeMedia = mediaRef.current;
    if (!activeMedia || isGated) return;
    
    if (isPlaying) {
      activeMedia.play().catch(() => setIsPlaying(false));
    } else {
      activeMedia.pause();
    }
  }, [isPlaying, currentTrack, isGated, mediaRef, setIsPlaying]);

  useEffect(() => {
    if (mediaRef.current) mediaRef.current.volume = volume;
  }, [volume, mediaRef]);

  const onTimeUpdate = () => {
    const activeMedia = mediaRef.current;
    if (activeMedia && !isDragging) {
      setLocalTime(activeMedia.currentTime);
      setProgress((activeMedia.currentTime / activeMedia.duration) * 100);
    }
  };

  const onLoadedMetadata = () => {
    const activeMedia = mediaRef.current;
    if (activeMedia) setDuration(activeMedia.duration);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setLocalTime((val / 100) * duration);
    if (mediaRef.current) {
       mediaRef.current.currentTime = (val / 100) * duration;
    }
  };

  const skipForward = () => {
    if (mediaRef.current) mediaRef.current.currentTime += 10;
  };

  const skipBackward = () => {
    if (mediaRef.current) mediaRef.current.currentTime -= 10;
  };

  if (!currentTrack) return null;

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
                onMouseDown={() => setIsDragging(true)}
                onMouseUp={() => setIsDragging(false)}
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

          <header className="expanded-header" style={{ padding: '2rem', display: 'flex', justifyContent: 'space-between' }}>
            <button onClick={() => setIsExpanded(false)} className="icon-btn" style={{ background: 'rgba(255,255,255,0.1)', padding: '0.5rem' }}>
              <ChevronDown size={32} />
            </button>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '0.75rem', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '2px' }}>Playing From</p>
              <h5 style={{ margin: 0 }}>Dyllicit Discover</h5>
            </div>
            <button className="icon-btn"><Star size={24} /></button>
          </header>

          <main className="expanded-content">
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
                <img 
                  src={getIPFSUrl(currentTrack.thumbnailUrl) || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&h=800&fit=crop'} 
                  className="big-artwork" 
                  alt={currentTrack.title} 
                  style={{ maxHeight: '35vh', width: 'auto' }}
                />
              )}
              <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                <h2 style={{ fontSize: 'min(2.2rem, 4vh)', fontWeight: 800, margin: '0 0 0.25rem 0' }}>{currentTrack.title}</h2>
                <p style={{ fontSize: 'min(1.1rem, 2.5vh)', opacity: 0.7 }}>{currentTrack.artist}</p>
              </div>
            </div>

            <div className="expanded-lyrics-side">
              {lyrics.map((line, i) => (
                <p 
                  key={i} 
                  className={`lyric-line ${activeLyricIndex === i ? 'active' : ''}`}
                  style={{ fontSize: 'min(1.4rem, 3.5vh)', marginBottom: 'min(1.5rem, 2.5vh)' }}
                >
                  {line.text}
                </p>
              ))}
            </div>
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
                onMouseDown={() => setIsDragging(true)}
                onMouseUp={() => setIsDragging(false)}
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
             <p style={{ fontSize: '0.8rem', margin: 0 }}>Gated Content</p>
             <button className="btn btn-primary btn-sm" style={{ marginTop: '0.5rem' }} onClick={() => { setIsExpanded(false); router.push('/subscription'); }}>Unlock</button>
           </div>
        </div>
      )}
    </div>
  );
};

export default AudioPlayer;
