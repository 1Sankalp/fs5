/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // Add proper trailing slash configuration
  trailingSlash: false,
  // Ensure we have proper redirects from homepage to login
  async redirects() {
    return [
      {
        source: '/',
        destination: '/auth/login',
        permanent: true,
      },
    ];
  },
}

module.exports = nextConfig 