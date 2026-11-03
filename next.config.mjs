export default {
  distDir: process.env.NEXT_DIST_DIR || ".next-ui",
  poweredByHeader: false,
  experimental: { cpus: 1 },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "same-origin" },
        ],
      },
    ];
  },
};
