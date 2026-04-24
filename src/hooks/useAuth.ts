'use client';

import { useState } from 'react';
import { useAccount, useSignMessage, useDisconnect, useChainId } from 'wagmi';
import { SiweMessage } from 'siwe';
import { signIn } from 'next-auth/react';
import { useAuthStore } from '@/store/useAuthStore';

export function useAuth() {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const { setUser, setConnecting, logout: clearStore } = useAuthStore();
  const [error, setError] = useState<string | null>(null);

  const login = async () => {
    try {
      if (!address || !isConnected) {
        throw new Error('Wallet not connected');
      }

      setConnecting(true);
      setError(null);

      // 1. Get nonce from API
      const nonceRes = await fetch('/api/auth/nonce');
      const { nonce } = await nonceRes.json();

      // 2. Create SIWE message
      const message = new SiweMessage({
        domain: window.location.host,
        address: address,
        statement: 'Sign in to Dyllicit',
        uri: window.location.origin,
        version: '1',
        chainId: chainId,
        nonce: nonce,
      });

      const messageToSign = message.prepareMessage();

      // 3. Sign message
      const signature = await signMessageAsync({
        message: messageToSign,
      });

      // 4. Verify signature with NextAuth SIWE Provider
      const result = await signIn('siwe', {
        message: JSON.stringify(message),
        signature: signature,
        redirect: false,
        callbackUrl: '/explore'
      });

      if (result?.error) {
        throw new Error(result.error);
      }
      
      // Note: useSession will automatically update the UI state.
      // We still update the global store for legacy components if needed.
    } catch (err: any) {
      console.error('Login failed', err);
      setError(err.message);
    } finally {
      setConnecting(false);
    }
  };

  const logout = () => {
    disconnect();
    clearStore();
    // Also call a backend logout route if you want to clear the JWT cookie explicitly
  };

  return { login, logout, error };
}
