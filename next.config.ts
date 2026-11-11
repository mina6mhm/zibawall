//next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ioredis روی سرور (Node) استفاده می‌شود؛ bundle نشود تا اتصال/سوکت‌ها درست کار کنند
  serverExternalPackages: ['ioredis'],
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
};

export default nextConfig;