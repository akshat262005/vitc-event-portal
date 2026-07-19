/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Serverless-friendly: do not bundle native optional deps incorrectly
  serverExternalPackages: ['mongoose', 'bcryptjs', 'archiver'],
};

export default nextConfig;
