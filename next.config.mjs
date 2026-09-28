/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Optimize heavy client package imports to speed up dev compilation and reduce bundle size
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts', 'xlsx'],
  },
  // Serverless-friendly: do not bundle native optional deps incorrectly
  serverExternalPackages: ['mongoose', 'bcryptjs', 'archiver'],
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
