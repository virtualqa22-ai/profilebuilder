/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
  },
  webpack(config) {
    config.resolve.alias['@'] = path.resolve(__dirname, 'frontend');
    return config;
  },
};

module.exports = nextConfig;
