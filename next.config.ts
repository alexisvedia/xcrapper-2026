import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // External packages that should not be bundled
  serverExternalPackages: ['rettiwt-api', 'jsdom', 'parse5'],
};

export default nextConfig;
