/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'sso.dpupr.com',
      },
    ],
  },
  // For Electron
  assetPrefix: process.env.ELECTRON === 'true' ? './' : undefined,
};

export default nextConfig;
