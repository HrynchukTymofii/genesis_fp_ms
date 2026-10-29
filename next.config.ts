import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    // Shared (live) editing turns on when the Liveblocks key is present at build time.
    NEXT_PUBLIC_COLLAB: process.env.LIVEBLOCKS_SECRET_KEY ? "1" : "",
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  experimental: {
    serverActions: {
      // file attachments go through a server action (10 MB limit + overhead)
      bodySizeLimit: "11mb",
    },
  },
};

export default nextConfig;
