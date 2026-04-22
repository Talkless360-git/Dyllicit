import { create } from 'zustand';

interface Track {
  id: string;
  title: string;
  artist: string;
  authorId?: string;
  url: string;
  thumbnailUrl?: string;
  type: 'audio' | 'video';
  isGated: boolean;
}

interface PlayerState {
  currentTrack: Track | null;
  isPlaying: boolean;
  volume: number;
  progress: number; // 0 to 100
  duration: number; // in seconds
  queue: Track[];
  
  setCurrentTrack: (track: Track | null) => void;
  setIsPlaying: (playing: boolean) => void;
  setVolume: (volume: number) => void;
  setProgress: (progress: number) => void;
  setDuration: (duration: number) => void;
  addToQueue: (track: Track) => void;
  setQueue: (tracks: Track[]) => void;
  removeFromQueue: (trackId: string) => void;
  nextTrack: () => void;
  prevTrack: () => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentTrack: null,
  isPlaying: false,
  volume: 0.8,
  progress: 0,
  duration: 0,
  queue: [],

  setCurrentTrack: (track) => set({ currentTrack: track, isPlaying: !!track, progress: 0 }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setVolume: (volume) => set({ volume }),
  setProgress: (progress) => set({ progress }),
  setDuration: (duration) => set({ duration }),
  
  addToQueue: (track) => set((state) => ({ queue: [...state.queue, track] })),
  setQueue: (tracks) => set({ queue: tracks }),
  
  removeFromQueue: (trackId) => set((state) => ({ 
    queue: state.queue.filter(t => t.id !== trackId) 
  })),

  nextTrack: () => {
    const { queue, currentTrack } = get();
    if (queue.length === 0) return;
    const currentIndex = currentTrack ? queue.findIndex(t => t.id === currentTrack.id) : -1;
    
    let nextIndex;
    if (currentIndex === -1) {
      nextIndex = 0;
    } else {
      nextIndex = (currentIndex + 1) % queue.length;
    }
    
    set({ currentTrack: queue[nextIndex], progress: 0, isPlaying: true });
  },

  prevTrack: () => {
    const { queue, currentTrack } = get();
    if (queue.length === 0) return;
    const currentIndex = currentTrack ? queue.findIndex(t => t.id === currentTrack.id) : -1;
    
    let prevIndex;
    if (currentIndex === -1) {
      prevIndex = queue.length - 1;
    } else {
      prevIndex = (currentIndex - 1 + queue.length) % queue.length;
    }
    
    set({ currentTrack: queue[prevIndex], progress: 0, isPlaying: true });
  },
}));
