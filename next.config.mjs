/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // On désactive Turbopack pour éviter le conflit Webpack
  experimental: {
    turbo: {
      enabled: false
    }
  }
};
export default nextConfig;
