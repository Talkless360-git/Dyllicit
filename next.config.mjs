/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['viem', 'wagmi'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'gateway.pinata.cloud' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
};

export default nextConfig;
