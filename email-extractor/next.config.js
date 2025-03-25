/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // Add proper trailing slash configuration
  trailingSlash: false,
  // Ensure we have proper redirects from homepage to dashboard
  async redirects() {
    return [
      {
        source: '/',
        destination: '/dashboard',
        permanent: true,
      },
    ];
  },
}

module.exports = nextConfig 