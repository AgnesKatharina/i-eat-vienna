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
  output: 'standalone',
  outputFileTracing: false,
  
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        canvas: false,
      }
    }
    
    if (isServer) {
      config.externals = [...(config.externals || []), 'jspdf', 'jspdf-autotable']
    }
    
    return config
  },
  experimental: {
    serverComponentsExternalPackages: ['jspdf', 'jspdf-autotable'],
  },
}

export default nextConfig
