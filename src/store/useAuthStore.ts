import { create } from 'zustand';

interface User {
  id: string;
  address: string;
  name?: string;
  image?: string;
  role: string;
}

interface AuthState {
  user: User | null;
  isConnected: boolean;
  isConnecting: boolean;
  setUser: (user: User | null) => void;
  setConnected: (status: boolean) => void;
  setConnecting: (status: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isConnected: false,
  isConnecting: false,
  setUser: (user) => set({ user, isConnected: !!user }),
  setConnected: (status) => set({ isConnected: status }),
  setConnecting: (status) => set({ isConnecting: status }),
  logout: () => {
    // Clear cookie (logic will be in the component call usually, but we update state here)
    set({ user: null, isConnected: false });
  },
}));
