/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // Add proper trailing slash configuration
  trailingSlash: false,
  redirects: async () => {
    return [
      {
        source: '/',
        destination: '/auth/login',
        permanent: false,
      },
    ];
  },
  // Make sure these paths are handled properly
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/',
          destination: '/auth/login',
        },
      ],
    };
  },
  // Adding the output option
  output: 'standalone',
}

module.exports = nextConfig 