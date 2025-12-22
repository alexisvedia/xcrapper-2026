import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // External packages that should not be bundled (Next.js 15+)
  serverExternalPackages: ['rettiwt-api', 'jsdom', 'parse5', 'parse5-htmlparser2-tree-adapter'],

  // Experimental config for older compatibility
  experimental: {
    // This helps with ESM modules in serverless
    serverComponentsExternalPackages: ['rettiwt-api', 'jsdom', 'parse5', 'parse5-htmlparser2-tree-adapter'],
  },

  // Webpack configuration for ESM/CommonJS compatibility
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || [];
      // Force these packages to be treated as external (not bundled)
      config.externals.push({
        'rettiwt-api': 'commonjs rettiwt-api',
        'jsdom': 'commonjs jsdom',
        'parse5': 'commonjs parse5',
        'parse5-htmlparser2-tree-adapter': 'commonjs parse5-htmlparser2-tree-adapter',
      });
    }
    return config;
  },
};

export default nextConfig;
