import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
