const nextConfig = {
  output: "standalone",
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.INTERNAL_API_URL || "http://localhost:8000"}/api/:path*`,
      },
    ]
  },
}

module.exports = nextConfig
