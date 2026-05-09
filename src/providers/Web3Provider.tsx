'use client';

import React, { ReactNode, useEffect, useState } from 'react';
import { createConfig, http, WagmiProvider } from 'wagmi';
import { mainnet, sepolia, hardhat, baseSepolia } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { injected } from 'wagmi/connectors';
import { defineChain } from 'viem';

// AGGRESSIVE ERROR SWALLOWING
if (typeof window !== 'undefined') {
  const originalError = window.console.error;
  window.console.error = (...args) => {
    const msg = args.join(' ');
    if (msg.includes('MetaMask') || msg.includes('inpage.js') || msg.includes('connector')) {
      return; // SILENCE
    }
    originalError.apply(window.console, args);
  };

  window.addEventListener('error', (event) => {
    if (event.message?.includes('MetaMask') || event.filename?.includes('inpage.js')) {
      event.stopImmediatePropagation();
      event.preventDefault();
    }
  }, true);

  window.addEventListener('unhandledrejection', (event) => {
    const msg = event.reason?.message || '';
    if (msg.includes('MetaMask') || msg.includes('inpage.js')) {
      event.stopImmediatePropagation();
      event.preventDefault();
    }
  }, true);
}

const megaeth = defineChain({
  id: 6343,
  name: 'MegaETH Carrot',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { 
      http: [
        process.env.NEXT_PUBLIC_RPC_URL || 'https://carrot.megaeth.com/rpc',
        'https://megaeth-carrot.gateway.tatum.io/'
      ] 
    },
  },
  testnet: true,
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

export const config = createConfig({
  chains: [megaeth, mainnet, sepolia, baseSepolia, hardhat],
  connectors: [
    injected({ 
      shimDisconnect: true,
    }),
  ],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
    [baseSepolia.id]: http(),
    [megaeth.id]: http('https://carrot.megaeth.com/rpc'),
    [hardhat.id]: http(),
  },
  ssr: true,
});

export function Web3Provider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <WagmiProvider config={config} reconnectOnMount={false}>
      <QueryClientProvider client={queryClient}>
        {mounted ? children : null}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
