import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // External packages that should not be bundled
  serverExternalPackages: ['rettiwt-api', 'jsdom', 'parse5'],

  // Webpack configuration for ESM/CommonJS compatibility
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        'rettiwt-api': 'commonjs rettiwt-api',
      });
    }
    return config;
  },
};

export default nextConfig;
