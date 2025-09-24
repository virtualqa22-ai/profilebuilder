/** @type {import('next').NextConfig} */
const path = require('path');
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
  },
  webpack(config) {
    config.resolve.alias['@'] = path.resolve(__dirname, '..');
    return config;
  },
};

module.exports = withBundleAnalyzer(nextConfig);
