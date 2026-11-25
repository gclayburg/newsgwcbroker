import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // Pages read content/news at build time, but this route reads it per request
  // (on Vercel), so the edition files must ship with its function.
  outputFileTracingIncludes: {
    "/api/notify-subscribers": ["./content/news/*.json"],
    "/analytics": ["./content/news/*.json"],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
