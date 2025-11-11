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
  experimental: {
    outputFileTracingIgnores: [
      '**/node_modules/jspdf/**',
      '**/node_modules/jspdf-autotable/**',
      '**/node_modules/canvas/**',
      '**/node_modules/@types/jspdf/**',
    ],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        canvas: false,
      }
    }
    return config
  },
}

export default nextConfig
