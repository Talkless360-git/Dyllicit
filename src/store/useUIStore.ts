import { create } from 'zustand';

interface UIState {
  playlistModalOpen: boolean;
  trackToAddToPlaylist: { id: string; title: string } | null;
  openPlaylistModal: (track: { id: string; title: string }) => void;
  closePlaylistModal: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  playlistModalOpen: false,
  trackToAddToPlaylist: null,
  openPlaylistModal: (track) => set({ playlistModalOpen: true, trackToAddToPlaylist: track }),
  closePlaylistModal: () => set({ playlistModalOpen: false, trackToAddToPlaylist: null }),
}));
