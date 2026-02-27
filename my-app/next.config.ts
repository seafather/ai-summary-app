import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prevent webpack from bundling pdf-parse and pdfjs-dist into server chunks.
  // Without this, pdfjs-dist tries to resolve a pdf.worker chunk that doesn't
  // exist in the Next.js dev/build output, causing the fake-worker error.
  serverExternalPackages: ['pdf-parse', 'pdfjs-dist'],
};

export default nextConfig;
