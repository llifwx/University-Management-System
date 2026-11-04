import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Only the Docker image runs the standalone server; `next start` does not support it.
  output: process.env.STANDALONE_BUILD === "true" ? "standalone" : undefined,
  // The monorepo root also holds a lockfile-free backend; pin tracing to this package.
  outputFileTracingRoot: __dirname,
  turbopack: {
    root: __dirname,
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "same-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
