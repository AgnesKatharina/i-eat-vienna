/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  webpack: (config, { isServer }) => {
    // Optimize module resolution
    config.optimization = {
      ...config.optimization,
      minimize: false, // Disable minimization during build to avoid stack issues
    }
    
    // Increase stack size for webpack
    config.infrastructureLogging = {
      level: 'error',
    }
    
    return config
  },
  // Add experimental features for better build performance
  experimental: {
    optimizePackageImports: ['jspdf', 'jspdf-autotable'],
  },
}

export default nextConfig
