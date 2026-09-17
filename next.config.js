/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  async redirects() {
    return [
      // Claims was removed from the CRM on 2026-09-17: clients are directed
      // to their carrier for claims. The table stays; only the UI is gone.
      { source: '/claims', destination: '/dashboard', permanent: false },
      { source: '/claims/:path*', destination: '/dashboard', permanent: false },
    ];
  },
};

module.exports = nextConfig;
