/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['viem', 'wagmi'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'gateway.pinata.cloud' },
      { protocol: 'https', hostname: 'ipfs.io' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://rpc.carrot.megaeth.systems https://carrot.megaeth.com https://ipfs.io http://localhost:3000 http://127.0.0.1:8545; img-src 'self' data: https://gateway.pinata.cloud https://ipfs.io https://images.unsplash.com; media-src 'self' https://gateway.pinata.cloud https://ipfs.io;",
          },
        ],
      },
    ];
  },
  webpack: (config, { webpack }) => {
    config.externals.push('pino-pretty', 'lokijs', 'encoding');
    config.resolve.fallback = { fs: false, net: false, tls: false };
    
    // Completely ignore the MetaMask SDK and its React Native dependencies
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /@metamask\/sdk/,
      })
    );
    
    return config;
  },
};

export default nextConfig;
