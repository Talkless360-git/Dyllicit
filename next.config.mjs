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
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.stripe.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "connect-src 'self' https://rpc.carrot.megaeth.systems https://carrot.megaeth.com https://ipfs.io https://api.pinata.cloud https://uploads.pinata.cloud https://api.stripe.com https://checkout.stripe.com http://localhost:3000 http://127.0.0.1:8545 wss://rpc.carrot.megaeth.systems wss://carrot.megaeth.com",
              "img-src 'self' data: https://gateway.pinata.cloud https://ipfs.io https://images.unsplash.com https://*.stripe.com",
              "media-src 'self' https://gateway.pinata.cloud https://ipfs.io",
              "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
            ].join('; ') + ';',
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
