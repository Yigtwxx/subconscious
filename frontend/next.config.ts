import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://127.0.0.1:3000/api/:path*'
      },
      {
        source: '/ws',
        destination: 'http://127.0.0.1:3000/ws'
      }
    ];
  }
};

export default nextConfig;
