'use client';

import React, { ReactNode } from 'react';
import { createConfig, http, WagmiProvider } from 'wagmi';
import { mainnet, sepolia, hardhat, baseSepolia } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { injected } from 'wagmi/connectors';
import { defineChain } from 'viem';

const megaeth = defineChain({
  id: 6343,
  name: 'MegaETH Carrot',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://carrot.megaeth.com/rpc'] },
  },
  blockExplorers: {
    default: { name: 'MegaETH Explorer', url: 'https://carrot.megaeth.com' },
  },
  testnet: true,
});

const queryClient = new QueryClient();

export const config = createConfig({
  chains: [mainnet, sepolia, baseSepolia, megaeth, hardhat],
  connectors: [
    injected(),
  ],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
    [baseSepolia.id]: http(),
    [megaeth.id]: http(),
    [hardhat.id]: http(),
  },
});

export function Web3Provider({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
