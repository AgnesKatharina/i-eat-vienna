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
    outputFileTracingExcludes: {
      '*': [
        'node_modules/jspdf/**/*',
        'node_modules/jspdf-autotable/**/*',
        'node_modules/canvas/**/*',
        'node_modules/@types/jspdf/**/*',
        'node_modules/dompurify/**/*',
        'node_modules/html2canvas/**/*',
      ],
    },
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
