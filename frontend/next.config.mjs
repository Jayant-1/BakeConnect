/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  async rewrites() {
    const backendTarget =
      process.env.NODE_ENV === 'development'
        ? (process.env.BACKEND_INTERNAL_URL || 'http://localhost:8080')
        : (process.env.BACKEND_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080');

    return [
      {
        source: '/api/v1/:path*',
        destination: `${backendTarget}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
