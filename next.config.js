/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // WebSocket HMR configuration สำหรับ custom port
  experimental: {
    webVitalsAttribution: ['CLS', 'LCP']
  },
  webpack: (config, { isServer, dev }) => {
    // Add Buffer polyfill for client-side builds
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        buffer: require.resolve("buffer"),
        crypto: false,
        fs: false,
        path: false,
      };

      // Provide Buffer as a global using webpack.ProvidePlugin
      const webpack = require("webpack");
      config.plugins.push(
        new webpack.ProvidePlugin({
          Buffer: ["buffer", "Buffer"],
        }),
      );
    }

    // เพิ่ม HMR configuration สำหรับ development
    if (dev && !isServer) {
      config.devtool = 'eval-source-map';
      
      // Configure WebSocket for HMR
      if (config.devServer) {
        config.devServer = {
          ...config.devServer,
          webSocketServer: 'ws',
          port: 4100,
        };
      }
    }

    return config;
  },
};

module.exports = nextConfig;
